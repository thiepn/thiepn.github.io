/**
 * Phase P41 / V1.5: Official PKM Plugin Developer SDK & Mock Test Harness
 * 
 * Provides typed interfaces, mock execution environments, and utility helpers
 * for building and testing sandboxed plugins without running the full application.
 */

import { PluginId, PluginManifest, PluginPermission } from '../types';
import { validatePluginManifest, type ValidationResult } from '../manifestValidator';
import { PERMISSION_REGISTRY, isHighRiskPermission } from '../permissions';

export interface PluginApiNotes {
  getSelectedText(): Promise<string>;
  replaceSelectedText(newText: string): Promise<{ success: boolean }>;
  getCurrentNote(): Promise<{
    id: string;
    title: string;
    content: string;
    tags: string[];
    folderId: string | null;
    updatedAt: string;
    version: string;
  } | null>;
  getAllNotes?(): Promise<Array<{ id: string; title: string; content: string; tags: string[]; updatedAt: string }>>;
  createNote?(params: { title: string; content: string; tags?: string[] }): Promise<{ success: boolean; noteId: string }>;
  mutateCurrentNote(params: {
    expectedVersion?: string;
    operations: {
      title?: string;
      content?: string;
      appendContent?: string;
      tags?: string[];
    };
  }): Promise<{ success: boolean; noteId: string; updatedAt: string }>;
  getMetadataIndex(): Promise<Array<{ id: string; title: string; tags: string[]; updatedAt: string; folderId: string | null }>>;
}

export interface PluginApiStorage {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<{ success: boolean }>;
  delete(key: string): Promise<{ success: boolean }>;
  listKeys(): Promise<string[]>;
}

export interface PluginApiLogger {
  debug(msg: string, details?: any): void;
  info(msg: string, details?: any): void;
  warn(msg: string, details?: any): void;
  error(msg: string, details?: any): void;
}

export interface PluginApiContext {
  getCurrent(): Promise<{ activeSpaceId: string; activeNoteId: string | null; focusMode: boolean }>;
}

export interface PluginApiAI {
  invoke(params: { prompt: string; context?: string }): Promise<{ success: boolean; result: string }>;
}

export interface PluginApiNetwork {
  fetch(params: { url: string; method?: string; headers?: Record<string, string>; body?: any }): Promise<{
    status: number;
    ok: boolean;
    data: string;
  }>;
}

export interface PluginApiTasks {
  getTasks(): Promise<Array<{ id: string; title: string; completed: boolean; dueDate?: string; priority?: string }>>;
  createOrUpdate(task: { id?: string; title: string; completed?: boolean; dueDate?: string }): Promise<{ id: string }>;
}

export interface PluginApi {
  notes: PluginApiNotes;
  storage: PluginApiStorage;
  log: PluginApiLogger;
  context?: PluginApiContext;
  ai?: PluginApiAI;
  network?: PluginApiNetwork;
  tasks?: PluginApiTasks;
}

/**
 * Mock Host Harness for isolated unit testing of plugins
 */
export class MockPluginHost {
  private activeNote: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    folderId: string | null;
    updatedAt: string;
  } | null = null;

  private selectedText = '';
  private storage = new Map<string, any>();
  private logs: Array<{ level: string; msg: string; details?: any }> = [];
  private grantedPermissions: Set<PluginPermission>;
  private isVaultLocked = false;
  private tasks: Array<{ id: string; title: string; completed: boolean; dueDate?: string }> = [];

  constructor(grantedPermissions: PluginPermission[] = []) {
    this.grantedPermissions = new Set(grantedPermissions);
  }

  public setVaultLocked(locked: boolean): void {
    this.isVaultLocked = locked;
  }

  public setActiveNote(note: {
    id: string;
    title: string;
    content: string;
    tags?: string[];
    folderId?: string | null;
    updatedAt?: string;
  } | null): void {
    if (!note) {
      this.activeNote = null;
      return;
    }
    this.activeNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      folderId: note.folderId ?? null,
      updatedAt: note.updatedAt || new Date().toISOString(),
    };
  }

  public setSelectedText(text: string): void {
    this.selectedText = text;
  }

  public getLogs() {
    return [...this.logs];
  }

  public getStoredValue<T = any>(key: string): T | undefined {
    return this.storage.get(key);
  }

  private checkPermission(perm: PluginPermission): void {
    if (this.isVaultLocked) {
      throw new Error('Security Error: Operation rejected because the vault is currently locked.');
    }
    if (!this.grantedPermissions.has(perm)) {
      throw new Error(`Security Error: Missing required permission "${perm}".`);
    }
  }

  /**
   * Constructs the mock API object provided to the plugin logic
   */
  public createApi(): PluginApi {
    return {
      log: {
        debug: (msg, details) => this.logs.push({ level: 'debug', msg, details }),
        info: (msg, details) => this.logs.push({ level: 'info', msg, details }),
        warn: (msg, details) => this.logs.push({ level: 'warn', msg, details }),
        error: (msg, details) => this.logs.push({ level: 'error', msg, details }),
      },
      notes: {
        getSelectedText: async () => {
          this.checkPermission('notes.read:selected');
          return this.selectedText;
        },
        replaceSelectedText: async (newText: string) => {
          this.checkPermission('notes.write:selected');
          this.selectedText = newText;
          return { success: true };
        },
        getCurrentNote: async () => {
          this.checkPermission('notes.read:current');
          if (!this.activeNote) return null;
          return {
            ...this.activeNote,
            version: this.activeNote.updatedAt,
          };
        },
        mutateCurrentNote: async (params) => {
          this.checkPermission('notes.write:current');
          if (!this.activeNote) throw new Error('No active note to mutate.');

          if (params.expectedVersion && this.activeNote.updatedAt !== params.expectedVersion) {
            throw new Error('Concurrency Conflict: Note was modified since last read.');
          }

          if (params.operations.title !== undefined) this.activeNote.title = params.operations.title;
          if (params.operations.content !== undefined) this.activeNote.content = params.operations.content;
          if (params.operations.appendContent !== undefined) {
            this.activeNote.content = `${this.activeNote.content}\n${params.operations.appendContent}`;
          }
          if (params.operations.tags !== undefined) this.activeNote.tags = params.operations.tags;

          this.activeNote.updatedAt = new Date().toISOString();
          return {
            success: true,
            noteId: this.activeNote.id,
            updatedAt: this.activeNote.updatedAt,
          };
        },
        getMetadataIndex: async () => {
          this.checkPermission('notes.read:metadata');
          if (!this.activeNote) return [];
          return [
            {
              id: this.activeNote.id,
              title: this.activeNote.title,
              tags: this.activeNote.tags,
              updatedAt: this.activeNote.updatedAt,
              folderId: this.activeNote.folderId,
            },
          ];
        },
      },
      storage: {
        get: async <T = any>(key: string) => {
          this.checkPermission('storage.private');
          return this.storage.has(key) ? (this.storage.get(key) as T) : null;
        },
        set: async <T = any>(key: string, value: T) => {
          this.checkPermission('storage.private');
          this.storage.set(key, value);
          return { success: true };
        },
        delete: async (key: string) => {
          this.checkPermission('storage.private');
          this.storage.delete(key);
          return { success: true };
        },
        listKeys: async () => {
          this.checkPermission('storage.private');
          return Array.from(this.storage.keys());
        },
      },
      context: {
        getCurrent: async () => {
          this.checkPermission('context.read.current');
          return {
            activeSpaceId: 'default',
            activeNoteId: this.activeNote ? this.activeNote.id : null,
            focusMode: false,
          };
        },
      },
      ai: {
        invoke: async (params) => {
          this.checkPermission('ai.invoke');
          return {
            success: true,
            result: `[Mock AI Response for: "${params.prompt.slice(0, 30)}"]`,
          };
        },
      },
      network: {
        fetch: async (params) => {
          this.checkPermission('network.request');
          return {
            status: 200,
            ok: true,
            data: JSON.stringify({ mock: true, url: params.url }),
          };
        },
      },
      tasks: {
        getTasks: async () => {
          this.checkPermission('tasks.read');
          return [...this.tasks];
        },
        createOrUpdate: async (task) => {
          this.checkPermission('tasks.write');
          const id = task.id || `task-${Date.now()}`;
          const existingIdx = this.tasks.findIndex((t) => t.id === id);
          if (existingIdx >= 0) {
            this.tasks[existingIdx] = { ...this.tasks[existingIdx], ...task, id };
          } else {
            this.tasks.push({ id, title: task.title, completed: !!task.completed, dueDate: task.dueDate });
          }
          return { id };
        },
      },
    };
  }
}

export { validatePluginManifest, type ValidationResult, isHighRiskPermission, PERMISSION_REGISTRY };
