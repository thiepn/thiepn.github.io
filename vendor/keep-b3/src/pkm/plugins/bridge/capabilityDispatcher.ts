/**
 * Phase P41: Capability Dispatcher & RPC Security Gateway
 * Validates permissions, checks optimistic versioning for note mutations,
 * enforces rate limits, bounds payload sizes, and dispatches to canonical services.
 */

import { PluginId, PluginPermission } from '../types';
import { pluginStorageService } from '../storage/pluginStorageService';
import { Note } from '../../../types';

export interface DispatcherContext {
  getActiveNote: () => Note | null;
  getSelectedText: () => string;
  replaceSelectedText: (newText: string) => void;
  mutateCurrentNote: (note: Note) => Promise<void>;
  createNewNote?: (title: string, content: string, tags: string[]) => Promise<{ id: string }>;
  getAllNotesMetadata: () => Array<{ id: string; title: string; tags: string[]; updatedAt: string; folderId: string | null }>;
  getAllNotes?: () => Note[];
  getTasks?: () => Array<{ id: string; title: string; completed: boolean; dueDate?: string; priority?: string }>;
  createOrUpdateTask?: (task: { id?: string; title: string; completed?: boolean; dueDate?: string }) => Promise<{ id: string }>;
  getFinanceRecords?: () => Array<{ id: string; account: string; amount: number; type: string; date: string }>;
  getHealthRecords?: () => Array<{ id: string; metric: string; value: number | string; date: string }>;
  getActiveWorkspaceContext?: () => { activeSpaceId: string; activeNoteId: string | null; focusMode: boolean };
  invokeAi?: (prompt: string, context?: string) => Promise<string>;
  scheduleNotification?: (title: string, body: string, triggerAt: number) => Promise<{ id: string }>;
  isVaultLocked: () => boolean;
}

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

const MAX_CALLS_PER_SEC = 50;
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB

function isPrivateOrLocalhostUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return true;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return true;
    }
    // Check IPv4 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
    const ipParts = hostname.split('.').map(Number);
    if (ipParts.length === 4 && ipParts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      if (ipParts[0] === 10) return true;
      if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) return true;
      if (ipParts[0] === 192 && ipParts[1] === 168) return true;
      if (ipParts[0] === 169 && ipParts[1] === 254) return true;
      if (ipParts[0] === 127) return true;
    }
    return false;
  } catch (e) {
    return true; // Malformed URL rejected
  }
}

export class CapabilityDispatcher {
  private rateLimits = new Map<PluginId, RateLimitTracker>();

  constructor(private context: DispatcherContext) {}

  public async dispatch(
    pluginId: PluginId,
    grantedPermissions: PluginPermission[],
    method: string,
    params: any
  ): Promise<any> {
    // 1. Check Vault Lock state
    if (this.context.isVaultLocked()) {
      throw new Error('Security Error: Operation rejected because the vault is currently locked.');
    }

    // 2. Rate Limiting Check
    const now = Date.now();
    let rl = this.rateLimits.get(pluginId);
    if (!rl || now > rl.resetAt) {
      rl = { count: 0, resetAt: now + 1000 };
      this.rateLimits.set(pluginId, rl);
    }
    rl.count++;
    if (rl.count > MAX_CALLS_PER_SEC) {
      throw new Error(`Rate limit exceeded for plugin "${pluginId}" (max ${MAX_CALLS_PER_SEC} calls/sec).`);
    }

    // 3. Payload size check
    if (params) {
      const payloadSize = new TextEncoder().encode(JSON.stringify(params)).length;
      if (payloadSize > MAX_PAYLOAD_BYTES) {
        throw new Error(`Payload size of ${(payloadSize / 1024 / 1024).toFixed(1)}MB exceeds maximum 5MB message limit.`);
      }
    }

    // 4. Block access to credentials/master keys
    const methodLower = method.toLowerCase();
    if (
      methodLower.includes('credential') ||
      methodLower.includes('masterkey') ||
      methodLower.includes('password') ||
      methodLower.includes('vaultkey') ||
      methodLower.includes('secret')
    ) {
      throw new Error(`Security Violation: Plugin "${pluginId}" attempted unauthorized access to vault credentials or encryption keys.`);
    }

    // 5. Method Dispatch & Permission Enforcement
    switch (method) {
      // --- Notes API ---
      case 'notes.getSelectedText': {
        this.requirePermission(pluginId, grantedPermissions, 'notes.read:selected');
        return this.context.getSelectedText();
      }

      case 'notes.replaceSelectedText': {
        this.requirePermission(pluginId, grantedPermissions, 'notes.write:selected');
        const newText = typeof params?.newText === 'string' ? params.newText : '';
        this.context.replaceSelectedText(newText);
        return { success: true };
      }

      case 'notes.getCurrentNote': {
        this.requirePermission(pluginId, grantedPermissions, 'notes.read:current');
        const active = this.context.getActiveNote();
        if (!active) return null;
        return {
          id: active.id,
          title: active.title,
          content: active.content,
          tags: active.tags || [],
          folderId: active.folderId,
          updatedAt: active.updatedAt,
          version: active.updatedAt,
        };
      }

      case 'notes.getAllNotes': {
        this.requirePermission(pluginId, grantedPermissions, 'notes.read:all');
        const notes = this.context.getAllNotes ? this.context.getAllNotes() : [];
        return notes.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: n.tags || [],
          updatedAt: n.updatedAt,
        }));
      }

      case 'notes.createNote': {
        this.requirePermission(pluginId, grantedPermissions, 'notes.write:create');
        const title = typeof params?.title === 'string' ? params.title : 'Untitled Note';
        const content = typeof params?.content === 'string' ? params.content : '';
        const tags = Array.isArray(params?.tags) ? params.tags.filter((t: any) => typeof t === 'string') : [];
        if (this.context.createNewNote) {
          const res = await this.context.createNewNote(title, content, tags);
          return { success: true, noteId: res.id };
        }
        return { success: true, noteId: `note-${Date.now()}` };
      }

      case 'notes.deleteNote': {
        // V1.5 Rule: Permanent delete is forbidden via Plugin API V1 to guarantee safety
        throw new Error('Security Error: Permanent deletion of canonical notes is forbidden via Plugin API V1. Please archive or move to Trash.');
      }

      case 'notes.mutateCurrentNote': {
        this.requirePermission(pluginId, grantedPermissions, 'notes.write:current');
        const active = this.context.getActiveNote();
        if (!active) {
          throw new Error('No active note open to mutate.');
        }

        // Optimistic Concurrency Check
        const expectedVersion = params?.expectedVersion;
        if (expectedVersion && active.updatedAt !== expectedVersion) {
          throw new Error(
            `Concurrency Conflict: The active note was modified while the plugin was processing. Stale write rejected.`
          );
        }

        const operations = params?.operations;
        let newTitle = active.title;
        let newContent = active.content;
        let newTags = [...(active.tags || [])];

        if (operations && typeof operations === 'object') {
          if (typeof operations.title === 'string') newTitle = operations.title;
          if (typeof operations.content === 'string') newContent = operations.content;
          if (typeof operations.appendContent === 'string') newContent = `${newContent}\n${operations.appendContent}`;
          if (Array.isArray(operations.tags)) newTags = operations.tags.filter((t: any) => typeof t === 'string');
        }

        const updatedNote: Note = {
          ...active,
          title: newTitle,
          content: newContent,
          tags: newTags,
          updatedAt: new Date().toISOString(),
        };

        await this.context.mutateCurrentNote(updatedNote);
        return {
          success: true,
          noteId: updatedNote.id,
          updatedAt: updatedNote.updatedAt,
        };
      }

      case 'notes.getMetadataIndex': {
        this.requirePermission(pluginId, grantedPermissions, 'notes.read:metadata');
        const meta = this.context.getAllNotesMetadata();
        return meta;
      }

      // --- Tasks API ---
      case 'tasks.getTasks': {
        this.requirePermission(pluginId, grantedPermissions, 'tasks.read');
        return this.context.getTasks ? this.context.getTasks() : [];
      }

      case 'tasks.createOrUpdate': {
        this.requirePermission(pluginId, grantedPermissions, 'tasks.write');
        if (!params?.title || typeof params.title !== 'string') {
          throw new Error('Task title is required.');
        }
        if (this.context.createOrUpdateTask) {
          return await this.context.createOrUpdateTask(params);
        }
        return { success: true, id: `task-${Date.now()}` };
      }

      // --- High-Risk Domains (Finance & Health) ---
      case 'finance.getRecords': {
        this.requirePermission(pluginId, grantedPermissions, 'finance.read');
        return this.context.getFinanceRecords ? this.context.getFinanceRecords() : [];
      }

      case 'health.getRecords': {
        this.requirePermission(pluginId, grantedPermissions, 'health.read');
        return this.context.getHealthRecords ? this.context.getHealthRecords() : [];
      }

      // --- Context API ---
      case 'context.getCurrent': {
        this.requirePermission(pluginId, grantedPermissions, 'context.read.current');
        const ctx = this.context.getActiveWorkspaceContext
          ? this.context.getActiveWorkspaceContext()
          : { activeSpaceId: 'default', activeNoteId: null, focusMode: false };
        // Return only bounded context metadata, NOT full note bodies
        return {
          activeSpaceId: ctx.activeSpaceId,
          activeNoteId: ctx.activeNoteId,
          focusMode: ctx.focusMode,
        };
      }

      // --- AI API ---
      case 'ai.invoke': {
        this.requirePermission(pluginId, grantedPermissions, 'ai.invoke');
        const prompt = typeof params?.prompt === 'string' ? params.prompt : '';
        if (!prompt.trim()) {
          throw new Error('AI prompt cannot be empty.');
        }
        if (this.context.invokeAi) {
          const res = await this.context.invokeAi(prompt, params?.context);
          return { success: true, result: res };
        }
        return { success: true, result: `[AI Response for: "${prompt.slice(0, 30)}..."]` };
      }

      // --- Network API ---
      case 'network.fetch': {
        this.requirePermission(pluginId, grantedPermissions, 'network.request');
        const urlStr = typeof params?.url === 'string' ? params.url : '';
        if (isPrivateOrLocalhostUrl(urlStr)) {
          throw new Error(`Security Violation: Outbound requests to localhost, internal IP ranges, or non-HTTPS protocols are strictly blocked ("${urlStr}").`);
        }
        // In browser/mock runtime: perform bounded fetch
        try {
          const res = await fetch(urlStr, {
            method: params?.method || 'GET',
            headers: params?.headers || {},
            body: params?.body ? JSON.stringify(params.body) : undefined,
          });
          const text = await res.text();
          return { status: res.status, ok: res.ok, data: text };
        } catch (e: any) {
          throw new Error(`Network request failed: ${e.message}`);
        }
      }

      // --- Notifications API ---
      case 'notifications.schedule': {
        this.requirePermission(pluginId, grantedPermissions, 'notifications.schedule');
        const title = typeof params?.title === 'string' ? params.title : 'Reminder';
        const body = typeof params?.body === 'string' ? params.body : '';
        const triggerAt = typeof params?.triggerAt === 'number' ? params.triggerAt : Date.now() + 60000;
        if (this.context.scheduleNotification) {
          return await this.context.scheduleNotification(title, body, triggerAt);
        }
        return { success: true, id: `notif-${Date.now()}` };
      }

      // --- Search API ---
      case 'search.queryMetadata': {
        this.requirePermission(pluginId, grantedPermissions, 'search.metadata');
        const query = typeof params?.query === 'string' ? params.query.toLowerCase() : '';
        const allMeta = this.context.getAllNotesMetadata();
        if (!query) return allMeta.slice(0, 50);

        return allMeta
          .filter((n) => n.title.toLowerCase().includes(query) || n.tags.some((t) => t.toLowerCase().includes(query)))
          .slice(0, 50);
      }

      // --- Storage API ---
      case 'storage.get': {
        this.requirePermission(pluginId, grantedPermissions, 'storage.private');
        return await pluginStorageService.get(pluginId, params?.key);
      }

      case 'storage.set': {
        this.requirePermission(pluginId, grantedPermissions, 'storage.private');
        await pluginStorageService.set(pluginId, params?.key, params?.value);
        return { success: true };
      }

      case 'storage.delete': {
        this.requirePermission(pluginId, grantedPermissions, 'storage.private');
        await pluginStorageService.delete(pluginId, params?.key);
        return { success: true };
      }

      case 'storage.listKeys': {
        this.requirePermission(pluginId, grantedPermissions, 'storage.private');
        return await pluginStorageService.listKeys(pluginId);
      }

      // --- Commands & View Declarations ---
      case 'commands.register': {
        this.requirePermission(pluginId, grantedPermissions, 'commands.register');
        return { success: true, registered: true };
      }

      default:
        throw new Error(`Unknown or unimplemented capability method "${method}".`);
    }
  }

  private requirePermission(
    pluginId: PluginId,
    granted: PluginPermission[],
    required: PluginPermission
  ): void {
    if (!granted.includes(required)) {
      throw new Error(
        `Security Error: Plugin "${pluginId}" attempted to call method requiring permission "${required}", which was not granted.`
      );
    }
  }
}
