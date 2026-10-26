/**
 * PKM Phase P34: Universal Browser Extension & Capture Bridge Service
 * Handles cross-origin/postMessage communication, cryptographic pairing,
 * idempotent capture deduplication, locked-vault staging, and Markdown generation.
 */

import { Note, Folder, AppSettings, NoteImage } from '../../types';
import { convertHTMLToMarkdown } from '../htmlToMarkdown';
import { dailyNotesService } from '../dailyNotes/dailyNotesService';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';
import {
  CAPTURE_PROTOCOL_VERSION,
  BridgeMessage,
  CapturePayload,
  CaptureSubmitResult,
  BridgeStatusPayload,
  ExtensionBridgeConfig,
  DEFAULT_EXTENSION_BRIDGE_CONFIG,
  validateCapturePayload,
  generatePairingSecret,
  normalizeSourceUrl,
} from './captureProtocol';

export interface BridgeExecutionContext {
  notes: Note[];
  folders: Folder[];
  settings: AppSettings;
  activeNote: Note | null;
  createNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  saveNote: (updatedNote: Note) => Promise<void>;
  createFolder?: (name: string, color?: string) => Promise<void>;
  openNote?: (noteId: string, title?: string) => void;
}

interface ProcessedCaptureRecord {
  noteId: string;
  noteTitle: string;
  destination: string;
  processedAt: string;
}

export class CaptureBridgeService {
  private configKey = 'keepnotes_extension_bridge_config';
  private registryKey = 'keepnotes_processed_captures_registry';
  private processedCaptures: Map<string, ProcessedCaptureRecord> = new Map();
  private stagedLockedCaptures: CapturePayload[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private currentContext: BridgeExecutionContext | null = null;
  private inMemoryConfig: ExtensionBridgeConfig | null = null;
  private listeners: Array<(event: { type: 'capture_received' | 'status_changed' | 'staged_updated'; payload?: any }) => void> = [];

  constructor() {
    this.loadProcessedRegistry();
    this.ensureInitializedConfig();
    this.setupChannels();
  }

  // --- Configuration Management ---

  public getConfig(): ExtensionBridgeConfig {
    if (this.inMemoryConfig) {
      return { ...this.inMemoryConfig };
    }

    if (typeof window === 'undefined') {
      const fallback: ExtensionBridgeConfig = {
        ...DEFAULT_EXTENSION_BRIDGE_CONFIG,
        pairingSecret: generatePairingSecret(),
        trustedOrigins: ['http://localhost:3000'],
      };
      this.inMemoryConfig = fallback;
      return { ...fallback };
    }

    try {
      const stored = localStorage.getItem(this.configKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const config: ExtensionBridgeConfig = {
          ...DEFAULT_EXTENSION_BRIDGE_CONFIG,
          ...parsed,
          trustedOrigins: Array.isArray(parsed.trustedOrigins) && parsed.trustedOrigins.length > 0
            ? parsed.trustedOrigins
            : [window.location.origin],
        };
        this.inMemoryConfig = config;
        return { ...config };
      }
    } catch (e) {
      console.warn('Failed to parse extension bridge config from localStorage', e);
    }

    const initial: ExtensionBridgeConfig = {
      ...DEFAULT_EXTENSION_BRIDGE_CONFIG,
      pairingSecret: generatePairingSecret(),
      trustedOrigins: [typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'],
    };
    this.inMemoryConfig = initial;
    return { ...initial };
  }

  public saveConfig(config: ExtensionBridgeConfig): void {
    this.inMemoryConfig = { ...config };
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.configKey, JSON.stringify(config));
      this.notifyListeners({ type: 'status_changed', payload: config });
    } catch (e) {
      console.warn('Failed to save extension bridge config to localStorage', e);
    }
  }

  public ensureInitializedConfig(): ExtensionBridgeConfig {
    let cfg = this.getConfig();
    if (!cfg.pairingSecret) {
      cfg = {
        ...cfg,
        pairingSecret: generatePairingSecret(),
        trustedOrigins: [
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        ],
      };
      this.saveConfig(cfg);
    }
    return cfg;
  }

  public regeneratePairingSecret(): string {
    const newSecret = generatePairingSecret();
    const config = this.getConfig();
    config.pairingSecret = newSecret;
    config.pairedClients = []; // Invalidate previously paired clients upon secret rotation
    this.saveConfig(config);
    return newSecret;
  }

  public addTrustedOrigin(origin: string): boolean {
    try {
      const url = new URL(origin);
      const cleanOrigin = url.origin;
      const config = this.getConfig();
      if (!config.trustedOrigins.includes(cleanOrigin)) {
        config.trustedOrigins.push(cleanOrigin);
        this.saveConfig(config);
      }
      return true;
    } catch (_e) {
      return false;
    }
  }

  public removeTrustedOrigin(origin: string): void {
    const config = this.getConfig();
    config.trustedOrigins = config.trustedOrigins.filter((o) => o !== origin);
    this.saveConfig(config);
  }

  public revokeClient(clientId: string): void {
    const config = this.getConfig();
    config.pairedClients = config.pairedClients.filter((c) => c.id !== clientId);
    this.saveConfig(config);
  }

  public registerPairedClient(client: { id: string; name: string }): void {
    const config = this.getConfig();
    const existingIndex = config.pairedClients.findIndex((c) => c.id === client.id);
    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      config.pairedClients[existingIndex].lastSeenAt = now;
      config.pairedClients[existingIndex].name = client.name;
    } else {
      config.pairedClients.push({
        id: client.id,
        name: client.name,
        pairedAt: now,
        lastSeenAt: now,
      });
    }
    this.saveConfig(config);
  }

  // --- Execution Context & Channels ---

  public setExecutionContext(context: BridgeExecutionContext): void {
    this.currentContext = context;
  }

  private setupChannels(): void {
    if (typeof window === 'undefined') return;

    // 1. BroadcastChannel for same-origin extension/tab communication
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('keepnotes_capture_bridge');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data, (reply) => {
            this.broadcastChannel?.postMessage(reply);
          }, window.location.origin);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported or restricted', e);
    }

    // 2. Window PostMessage listener for cross-window / popup / extension communication
    this.messageListener = (event: MessageEvent) => {
      // Validate origin if not wildcard or chrome-extension
      const origin = event.origin;
      const config = this.getConfig();

      const isTrusted =
        origin.startsWith('chrome-extension://') ||
        origin.startsWith('moz-extension://') ||
        config.trustedOrigins.includes(origin) ||
        origin === window.location.origin ||
        origin === 'null'; // Some extension background scripts send origin 'null'

      if (!isTrusted) {
        return; // Ignore untrusted origins silently
      }

      this.handleIncomingMessage(
        event.data,
        (reply) => {
          try {
            if (event.source && typeof (event.source as any).postMessage === 'function') {
              (event.source as any).postMessage(reply, origin === 'null' ? '*' : origin);
            }
          } catch (err) {
            console.warn('Failed to send postMessage reply to capture client', err);
          }
        },
        origin
      );
    };

    window.addEventListener('message', this.messageListener);
  }

  public destroy(): void {
    if (typeof window !== 'undefined' && this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.listeners = [];
  }

  public subscribe(listener: (event: { type: 'capture_received' | 'status_changed' | 'staged_updated'; payload?: any }) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(event: { type: 'capture_received' | 'status_changed' | 'staged_updated'; payload?: any }): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in bridge listener:', err);
      }
    }
  }

  // --- Message Handling & Protocol Routing ---

  public async handleIncomingMessage(
    rawMessage: unknown,
    reply: (response: BridgeMessage) => void,
    senderOrigin?: string
  ): Promise<void> {
    if (!rawMessage || typeof rawMessage !== 'object') return;
    const msg = rawMessage as Partial<BridgeMessage>;

    // Protocol check
    if (msg.protocol !== CAPTURE_PROTOCOL_VERSION) {
      if (msg.type?.endsWith('_REQUEST')) {
        reply({
          protocol: CAPTURE_PROTOCOL_VERSION,
          type: (msg.type.replace('_REQUEST', '_RESPONSE')) as any,
          requestId: msg.requestId || 'unknown',
          payload: {
            error: `PROTOCOL_MISMATCH: Server uses ${CAPTURE_PROTOCOL_VERSION}, client sent ${msg.protocol || 'none'}. Please update the extension.`,
            supportedVersion: CAPTURE_PROTOCOL_VERSION,
          },
          timestamp: Date.now(),
        });
      }
      return;
    }

    const config = this.getConfig();

    // 1. HANDSHAKE_REQUEST (Pairing & Trust validation)
    if (msg.type === 'HANDSHAKE_REQUEST') {
      const isSecretMatch = msg.pairingSecret === config.pairingSecret;
      if (isSecretMatch && msg.clientInstanceId) {
        this.registerPairedClient({
          id: msg.clientInstanceId,
          name: (msg.payload as any)?.clientName || 'Browser Extension',
        });
      }

      reply({
        protocol: CAPTURE_PROTOCOL_VERSION,
        type: 'HANDSHAKE_RESPONSE',
        requestId: msg.requestId || '',
        payload: {
          authenticated: isSecretMatch,
          protocolVersion: CAPTURE_PROTOCOL_VERSION,
          appTitle: 'PKM Vault',
          defaultDestination: config.defaultDestination,
          defaultMode: config.defaultMode,
          vaultLocked: vaultEncryptionService.isVaultLocked(),
          error: isSecretMatch ? undefined : 'INVALID_PAIRING_SECRET: Pairing secret does not match.',
        },
        timestamp: Date.now(),
      });
      return;
    }

    // 2. STATUS_REQUEST
    if (msg.type === 'STATUS_REQUEST') {
      const isAuth = !config.pairingSecret || msg.pairingSecret === config.pairingSecret;
      const status: BridgeStatusPayload = {
        appReady: true,
        vaultStatus: vaultEncryptionService.isVaultLocked()
          ? 'locked'
          : vaultEncryptionService.isVaultEncrypted()
          ? 'unlocked'
          : 'unencrypted',
        protocolVersion: CAPTURE_PROTOCOL_VERSION,
        defaultDestination: config.defaultDestination,
        inboxFolderName: 'Inbox',
        pairedClientsCount: config.pairedClients.length,
      };

      reply({
        protocol: CAPTURE_PROTOCOL_VERSION,
        type: 'STATUS_RESPONSE',
        requestId: msg.requestId || '',
        payload: isAuth ? status : { error: 'UNAUTHORIZED: Invalid pairing token' },
        timestamp: Date.now(),
      });
      return;
    }

    // 3. CAPTURE_SUBMIT_REQUEST
    if (msg.type === 'CAPTURE_SUBMIT_REQUEST') {
      // Authenticate
      if (config.pairingSecret && msg.pairingSecret !== config.pairingSecret) {
        reply({
          protocol: CAPTURE_PROTOCOL_VERSION,
          type: 'CAPTURE_SUBMIT_RESPONSE',
          requestId: msg.requestId || '',
          payload: {
            success: false,
            captureId: (msg.payload as any)?.id || '',
            destination: config.defaultDestination,
            isDuplicateRetry: false,
            wasStagedForUnlock: false,
            error: 'AUTHENTICATION_FAILED: Secret mismatch. Please re-pair extension.',
          },
          timestamp: Date.now(),
        });
        return;
      }

      const validation = validateCapturePayload(msg.payload);
      if (!validation.valid || !validation.payload) {
        reply({
          protocol: CAPTURE_PROTOCOL_VERSION,
          type: 'CAPTURE_SUBMIT_RESPONSE',
          requestId: msg.requestId || '',
          payload: {
            success: false,
            captureId: (msg.payload as any)?.id || 'invalid',
            destination: config.defaultDestination,
            isDuplicateRetry: false,
            wasStagedForUnlock: false,
            error: `INVALID_PAYLOAD: ${validation.error}`,
          },
          timestamp: Date.now(),
        });
        return;
      }

      if (msg.clientInstanceId) {
        this.registerPairedClient({
          id: msg.clientInstanceId,
          name: (msg.payload as any)?.clientName || 'Browser Extension',
        });
      }

      // Process capture
      const result = await this.submitCapture(validation.payload, this.currentContext);
      reply({
        protocol: CAPTURE_PROTOCOL_VERSION,
        type: 'CAPTURE_SUBMIT_RESPONSE',
        requestId: msg.requestId || '',
        payload: result,
        timestamp: Date.now(),
      });
      return;
    }

    // 4. DRAIN_PENDING_REQUEST
    if (msg.type === 'DRAIN_PENDING_REQUEST') {
      const drainedCount = await this.drainStagedCaptures(this.currentContext);
      reply({
        protocol: CAPTURE_PROTOCOL_VERSION,
        type: 'DRAIN_PENDING_RESPONSE',
        requestId: msg.requestId || '',
        payload: { success: true, count: drainedCount },
        timestamp: Date.now(),
      });
      return;
    }

    // 5. REVOKE_REQUEST
    if (msg.type === 'REVOKE_REQUEST' && msg.clientInstanceId) {
      this.revokeClient(msg.clientInstanceId);
      reply({
        protocol: CAPTURE_PROTOCOL_VERSION,
        type: 'REVOKE_RESPONSE',
        requestId: msg.requestId || '',
        payload: { success: true },
        timestamp: Date.now(),
      });
      return;
    }
  }

  // --- Canonical Capture Processing Engine ---

  public async submitCapture(
    payload: CapturePayload,
    context: BridgeExecutionContext | null
  ): Promise<CaptureSubmitResult> {
    const captureId = payload.id;

    // 1. Idempotency Check: prevent duplicate creations on retry
    if (this.processedCaptures.has(captureId)) {
      const existing = this.processedCaptures.get(captureId)!;
      return {
        success: true,
        captureId,
        noteId: existing.noteId,
        noteTitle: existing.noteTitle,
        destination: payload.destination,
        isDuplicateRetry: true,
        wasStagedForUnlock: false,
      };
    }

    // 2. Locked Vault Check: stage payload in memory safely
    if (vaultEncryptionService.isVaultLocked()) {
      if (!this.stagedLockedCaptures.some((c) => c.id === captureId)) {
        this.stagedLockedCaptures.push(payload);
        this.notifyListeners({ type: 'staged_updated', payload: this.stagedLockedCaptures.length });
      }
      return {
        success: true,
        captureId,
        destination: payload.destination,
        isDuplicateRetry: false,
        wasStagedForUnlock: true,
        noteTitle: payload.sourceTitle || 'Staged Capture',
      };
    }

    // 3. If context is missing (e.g. app hasn't initialized state yet), stage it
    if (!context) {
      if (!this.stagedLockedCaptures.some((c) => c.id === captureId)) {
        this.stagedLockedCaptures.push(payload);
        this.notifyListeners({ type: 'staged_updated', payload: this.stagedLockedCaptures.length });
      }
      return {
        success: true,
        captureId,
        destination: payload.destination,
        isDuplicateRetry: false,
        wasStagedForUnlock: true,
        noteTitle: payload.sourceTitle || 'Staged Capture',
      };
    }

    try {
      const processed = await this.executeCapture(payload, context);

      // Register capture ID for exact-once deduplication
      this.recordProcessedCapture(captureId, {
        noteId: processed.noteId,
        noteTitle: processed.noteTitle,
        destination: payload.destination,
        processedAt: new Date().toISOString(),
      });

      this.notifyListeners({ type: 'capture_received', payload: processed });

      const config = this.getConfig();
      if (config.autoOpenAfterCapture && context.openNote && processed.noteId) {
        context.openNote(processed.noteId, processed.noteTitle);
      }

      return {
        success: true,
        captureId,
        noteId: processed.noteId,
        noteTitle: processed.noteTitle,
        destination: payload.destination,
        isDuplicateRetry: false,
        wasStagedForUnlock: false,
      };
    } catch (err: any) {
      console.error('Capture execution failed:', err);
      return {
        success: false,
        captureId,
        destination: payload.destination,
        isDuplicateRetry: false,
        wasStagedForUnlock: false,
        error: err?.message || 'Storage failure during capture execution',
      };
    }
  }

  private async executeCapture(
    payload: CapturePayload,
    context: BridgeExecutionContext
  ): Promise<{ noteId: string; noteTitle: string }> {
    const { notes, folders, settings, activeNote, createNote, saveNote, createFolder } = context;

    // 1. Convert/Sanitize Content to Markdown
    let markdownBody = '';
    let extractedTitle: string | undefined = payload.sourceTitle;

    if (payload.mode === 'link') {
      markdownBody = payload.quickNoteText
        ? `${payload.quickNoteText}\n\n- Source: [${payload.sourceTitle || payload.sourceUrl}](${payload.sourceUrl})`
        : `- Source: [${payload.sourceTitle || payload.sourceUrl}](${payload.sourceUrl})`;
    } else if (payload.mode === 'selection') {
      if (payload.html) {
        const conv = convertHTMLToMarkdown(payload.html);
        markdownBody = conv.markdown;
      } else {
        markdownBody = payload.text || '';
      }
      if (payload.quickNoteText) {
        markdownBody = `${payload.quickNoteText}\n\n> ${markdownBody.split('\n').join('\n> ')}`;
      }
    } else if (payload.mode === 'article' && payload.extractedArticle?.contentHtml) {
      const conv = convertHTMLToMarkdown(payload.extractedArticle.contentHtml);
      markdownBody = conv.markdown;
      extractedTitle = payload.extractedArticle.title || extractedTitle;
    } else if (payload.html) {
      const conv = convertHTMLToMarkdown(payload.html);
      markdownBody = conv.markdown;
      extractedTitle = conv.title || extractedTitle;
    } else if (payload.text) {
      markdownBody = payload.text;
    } else if (payload.quickNoteText) {
      markdownBody = payload.quickNoteText;
    }

    // 2. Prepare Images
    const noteImages: NoteImage[] = [];
    if (Array.isArray(payload.images)) {
      for (const img of payload.images) {
        if (img.dataUrl) {
          noteImages.push({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: img.name || 'capture-image.png',
            dataUrl: img.dataUrl,
            size: img.size || img.dataUrl.length,
          });
        }
      }
    }

    // 3. Format Provenance & Frontmatter
    const finalTitle = (extractedTitle || payload.sourceTitle || payload.sourceUrl || 'Web Capture').trim();
    const sourceUrl = payload.sourceUrl ? normalizeSourceUrl(payload.sourceUrl).normalized : '';

    const frontmatterLines: string[] = ['---'];
    frontmatterLines.push(`title: "${finalTitle.replace(/"/g, '\\"')}"`);
    if (sourceUrl) {
      frontmatterLines.push(`source: "${sourceUrl}"`);
    }
    if (payload.author || payload.extractedArticle?.byline) {
      frontmatterLines.push(`author: "${(payload.author || payload.extractedArticle?.byline)?.replace(/"/g, '\\"')}"`);
    }
    frontmatterLines.push(`captured: "${payload.capturedAt || new Date().toISOString()}"`);
    if (payload.tags && payload.tags.length > 0) {
      frontmatterLines.push(`tags: [${payload.tags.join(', ')}]`);
    }
    frontmatterLines.push('---');

    const formattedContent = `${frontmatterLines.join('\n')}\n\n${markdownBody.trim()}`;

    // 4. Resolve Destination
    // A. Daily Note Append
    if (payload.destination === 'daily') {
      const dailyRes = await dailyNotesService.getOrCreateDailyNote({
        date: new Date(payload.capturedAt || Date.now()),
        notes,
        folders,
        appSettings: settings,
        createNote,
        createFolder,
      });

      let textToInsert = markdownBody;
      if (sourceUrl) {
        textToInsert += `\n- Source: [${finalTitle}](${sourceUrl})`;
      }

      const updatedContent = dailyNotesService.appendContentToNote(
        dailyRes.note.content,
        textToInsert,
        '## Web Captures',
        true
      );

      const updatedDailyNote: Note = {
        ...dailyRes.note,
        content: updatedContent,
        images: noteImages.length > 0 ? [...(dailyRes.note.images || []), ...noteImages] : dailyRes.note.images,
        updatedAt: new Date().toISOString(),
      };

      await saveNote(updatedDailyNote);
      return { noteId: updatedDailyNote.id, noteTitle: updatedDailyNote.title };
    }

    // B. Active Note Append
    if (payload.destination === 'active_note' && activeNote) {
      let textToInsert = markdownBody;
      if (sourceUrl) {
        textToInsert += `\n- Source: [${finalTitle}](${sourceUrl})`;
      }

      const updatedContent = dailyNotesService.appendContentToNote(
        activeNote.content,
        textToInsert,
        '## Web Captures',
        true
      );

      const updatedActiveNote: Note = {
        ...activeNote,
        content: updatedContent,
        images: noteImages.length > 0 ? [...(activeNote.images || []), ...noteImages] : activeNote.images,
        updatedAt: new Date().toISOString(),
      };

      await saveNote(updatedActiveNote);
      return { noteId: updatedActiveNote.id, noteTitle: updatedActiveNote.title };
    }

    // C. Standalone Note in Inbox or New Note
    let targetFolderId: string | null = null;
    if (payload.destination === 'inbox') {
      const inboxFolder = folders.find((f) => f.name.trim().toLowerCase() === 'inbox');
      if (inboxFolder) {
        targetFolderId = inboxFolder.id;
      } else if (createFolder) {
        await createFolder('Inbox');
        const refreshedInbox = folders.find((f) => f.name.trim().toLowerCase() === 'inbox');
        if (refreshedInbox) targetFolderId = refreshedInbox.id;
      }
    }

    const newNote = await createNote({
      title: finalTitle,
      content: formattedContent,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: payload.tags || ['capture'],
      folderId: targetFolderId,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: noteImages,
    });

    return { noteId: newNote.id, noteTitle: newNote.title };
  }

  // --- Staging Queue & Unlock Draining ---

  public getStagedCapturesCount(): number {
    return this.stagedLockedCaptures.length;
  }

  public getStagedCaptures(): CapturePayload[] {
    return [...this.stagedLockedCaptures];
  }

  public clearStagedCaptures(): void {
    this.stagedLockedCaptures = [];
    this.notifyListeners({ type: 'staged_updated', payload: 0 });
  }

  public async drainStagedCaptures(context: BridgeExecutionContext | null): Promise<number> {
    if (!context || vaultEncryptionService.isVaultLocked()) return 0;
    if (this.stagedLockedCaptures.length === 0) return 0;

    const queued = [...this.stagedLockedCaptures];
    this.stagedLockedCaptures = [];
    let processedCount = 0;

    for (const payload of queued) {
      try {
        await this.submitCapture(payload, context);
        processedCount++;
      } catch (err) {
        console.error('Failed to drain staged capture:', err);
      }
    }

    this.notifyListeners({ type: 'staged_updated', payload: this.stagedLockedCaptures.length });
    return processedCount;
  }

  // --- Idempotency Deduplication Registry ---

  private loadProcessedRegistry(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.registryKey);
      if (stored) {
        const list: Array<[string, ProcessedCaptureRecord]> = JSON.parse(stored);
        this.processedCaptures = new Map(list);
      }
    } catch (e) {
      console.warn('Failed to load processed captures registry from localStorage', e);
    }
  }

  private recordProcessedCapture(captureId: string, record: ProcessedCaptureRecord): void {
    this.processedCaptures.set(captureId, record);
    // Bound registry to latest 1,000 entries
    if (this.processedCaptures.size > 1000) {
      const keys = Array.from(this.processedCaptures.keys());
      for (let i = 0; i < keys.length - 1000; i++) {
        this.processedCaptures.delete(keys[i]);
      }
    }
    if (typeof window !== 'undefined') {
      try {
        const list = Array.from(this.processedCaptures.entries());
        localStorage.setItem(this.registryKey, JSON.stringify(list));
      } catch (e) {
        console.warn('Failed to persist processed captures registry', e);
      }
    }
  }
}

export const captureBridgeService = new CaptureBridgeService();
