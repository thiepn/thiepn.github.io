/**
 * P47 — Mobile Share Sheet Service
 * 
 * Manages ingestion of shared text, URLs, images, PDFs, and files from other mobile apps.
 * Features:
 * - Exact-once delivery via stable idempotency IDs
 * - Safe staging queue surviving process termination
 * - Locked vault protection (staging until vault unlock)
 * - Seamless handoff to canonical P23 Quick Capture and P26 Media/PDF pipelines
 */

import { Note, Folder, AppSettings } from '../../types';
import { MobileSharePayload, ShareStagingStatus } from './mobileTypes';
import { mobileSecurityGuard } from './mobileSecurityGuard';
import { mobileCapabilityService } from './mobileCapabilityService';
import { quickCaptureService } from '../quickCapture/quickCaptureService';
import { dailyNotesService } from '../dailyNotes/dailyNotesService';

const STAGING_STORAGE_KEY = 'pkm_mobile_share_staging_v1';
const PROCESSED_IDS_KEY = 'pkm_mobile_share_processed_ids_v1';

class MobileShareService {
  private stagingQueue: MobileSharePayload[] = [];
  private processedIds: Set<string> = new Set();
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadStagedShares();
    this.initShareIntentBridge();
  }

  private loadStagedShares(): void {
    try {
      const raw = localStorage.getItem(STAGING_STORAGE_KEY);
      if (raw) {
        this.stagingQueue = JSON.parse(raw);
      }
      const rawProcessed = localStorage.getItem(PROCESSED_IDS_KEY);
      if (rawProcessed) {
        this.processedIds = new Set(JSON.parse(rawProcessed));
      }
    } catch {
      this.stagingQueue = [];
      this.processedIds = new Set();
    }
  }

  private persistStaging(): void {
    try {
      localStorage.setItem(STAGING_STORAGE_KEY, JSON.stringify(this.stagingQueue));
      localStorage.setItem(
        PROCESSED_IDS_KEY,
        JSON.stringify(Array.from(this.processedIds).slice(-200)) // Keep last 200 processed IDs
      );
    } catch {
      // Ignore
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /**
   * Listens for custom share events emitted by native Capacitor / Android intents / iOS Extension
   */
  private initShareIntentBridge(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('pkm-mobile-share-received', (event: any) => {
      const rawPayload = event.detail;
      if (rawPayload) {
        this.stageIncomingShare(rawPayload);
      }
    });

    // Also check for pending shares in URL query or hash params on launch (Share Target fallback)
    this.checkUrlShareParams();
  }

  private checkUrlShareParams(): void {
    if (typeof window === 'undefined' || !window.location.search) return;

    try {
      const params = new URLSearchParams(window.location.search);
      const sharedTitle = params.get('title');
      const sharedText = params.get('text');
      const sharedUrl = params.get('url');

      if (sharedTitle || sharedText || sharedUrl) {
        this.stageIncomingShare({
          type: sharedUrl ? 'url' : 'text',
          title: sharedTitle || undefined,
          text: sharedText || undefined,
          url: sharedUrl || undefined,
          sourceApp: 'Web / PWA Share Target',
        });

        // Clean up URL without triggering navigation
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Stages an incoming share payload safely into the queue
   */
  public stageIncomingShare(raw: Partial<MobileSharePayload>): MobileSharePayload | null {
    const sanitized = mobileSecurityGuard.validateAndSanitizePayload(raw);
    if (!sanitized) return null;

    // Idempotency check: prevent duplicate ingestion of same share ID
    if (this.processedIds.has(sanitized.id)) {
      console.log(`[MobileShareService] Ignored already processed share ID: ${sanitized.id}`);
      return null;
    }

    // Check if item is already in staging queue
    const existingIndex = this.stagingQueue.findIndex((item) => item.id === sanitized.id);
    if (existingIndex >= 0) {
      this.stagingQueue[existingIndex] = sanitized;
    } else {
      this.stagingQueue.push(sanitized);
    }

    this.persistStaging();
    mobileCapabilityService.triggerHaptic('selection');
    return sanitized;
  }

  public getStagedShares(): MobileSharePayload[] {
    return [...this.stagingQueue];
  }

  public getPendingCount(): number {
    return this.stagingQueue.filter((s) => s.status === 'pending' || s.status === 'failed').length;
  }

  /**
   * Ingests all pending staged shares into the canonical vault
   */
  public async drainPendingShares(context: {
    notes: Note[];
    folders: Folder[];
    settings: AppSettings;
    isVaultLocked: boolean;
    createNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
    saveNote: (note: Note) => Promise<void>;
    createFolder: (name: string, color?: string) => Promise<void>;
    openNote?: (id: string, title?: string) => void;
  }): Promise<{ ingestedCount: number; errors: string[] }> {
    if (context.isVaultLocked) {
      return { ingestedCount: 0, errors: ['Vault is locked. Unlock vault to finish ingesting shares.'] };
    }

    const pending = this.stagingQueue.filter((s) => s.status === 'pending' || s.status === 'failed');
    if (pending.length === 0) {
      return { ingestedCount: 0, errors: [] };
    }

    let ingestedCount = 0;
    const errors: string[] = [];

    for (const share of pending) {
      share.status = 'ingesting';
      this.persistStaging();

      try {
        await this.commitShareToVault(share, context);
        share.status = 'committed';
        this.processedIds.add(share.id);
        ingestedCount++;
      } catch (err: any) {
        console.error(`[MobileShareService] Failed to commit share ${share.id}:`, err);
        share.status = 'failed';
        share.errorMessage = err.message || 'Failed to persist note in canonical vault.';
        share.retryCount += 1;
        errors.push(share.errorMessage || 'Share ingestion error');
      }
    }

    // Clean up committed shares from staging queue
    this.stagingQueue = this.stagingQueue.filter((s) => s.status !== 'committed');
    this.persistStaging();

    if (ingestedCount > 0) {
      mobileCapabilityService.triggerHaptic('success');
    }

    return { ingestedCount, errors };
  }

  /**
   * Commits a single share item to the canonical vault
   */
  private async commitShareToVault(
    share: MobileSharePayload,
    context: {
      notes: Note[];
      folders: Folder[];
      settings: AppSettings;
      createNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
      saveNote: (note: Note) => Promise<void>;
      createFolder: (name: string, color?: string) => Promise<void>;
      openNote?: (id: string, title?: string) => void;
    }
  ): Promise<void> {
    const mobileSettings = mobileCapabilityService.getSettings();
    const destination = share.destination || mobileSettings.defaultShareDestination;

    // Construct note content
    let content = '';
    let title = share.title || '';

    if (share.type === 'url') {
      title = title || (share.url ? `Link: ${new URL(share.url).hostname}` : 'Captured Link');
      content = [
        `# ${title}`,
        '',
        share.url ? `**URL:** [${share.url}](${share.url})` : '',
        share.text ? `\n> ${share.text.replace(/\n/g, '\n> ')}\n` : '',
        '',
        `*Captured via Mobile Share Sheet on ${new Date(share.timestamp).toLocaleString()}*`,
      ].filter(Boolean).join('\n');
    } else if (share.type === 'image') {
      title = title || `Image: ${share.fileName || 'Mobile Photo'}`;
      content = [
        `# ${title}`,
        '',
        share.dataUrl ? `![${share.fileName || 'Shared Image'}](${share.dataUrl})` : '',
        share.text ? `\n${share.text}\n` : '',
        '',
        `*Shared on ${new Date(share.timestamp).toLocaleString()}*`,
      ].filter(Boolean).join('\n');
    } else if (share.type === 'pdf' || share.type === 'file') {
      title = title || `File: ${share.fileName || 'Shared Document'}`;
      content = [
        `# ${title}`,
        '',
        `📎 **Attachment:** \`${share.fileName || 'Document'}\` (${share.fileSize ? `${Math.round(share.fileSize / 1024)} KB` : 'file'})`,
        share.dataUrl ? `\n[Download / View File](${share.dataUrl})\n` : '',
        share.text ? `\n${share.text}\n` : '',
        '',
        `*Shared on ${new Date(share.timestamp).toLocaleString()}*`,
      ].filter(Boolean).join('\n');
    } else {
      // General text share
      title = title || (share.text ? share.text.split('\n')[0].replace(/^#*\s*/, '').slice(0, 40) : 'Shared Note');
      content = share.text || '';
    }

    if (destination === 'daily') {
      // Append to today's daily note
      const { note } = await dailyNotesService.getOrCreateDailyNote({
        date: new Date(),
        notes: context.notes,
        folders: context.folders,
        appSettings: context.settings,
        createNote: context.createNote,
        createFolder: context.createFolder,
      });

      const appendBlock = `\n\n### Shared: ${title}\n${content}`;
      const updated = {
        ...note,
        content: `${note.content}${appendBlock}`,
        updatedAt: new Date().toISOString(),
      };
      await context.saveNote(updated);
      if (context.openNote) context.openNote(updated.id, updated.title);
    } else {
      // Inbox or New Note
      let folderId = share.targetFolderId || null;
      if (destination === 'inbox' && !folderId) {
        let inboxFolder = context.folders.find((f) => f.name.toLowerCase() === 'inbox');
        if (!inboxFolder) {
          const newFId = `folder-inbox-${Date.now()}`;
          await context.createFolder('Inbox', '#f59e0b');
          folderId = newFId;
        } else {
          folderId = inboxFolder.id;
        }
      }

      const newNote = await context.createNote({
        title: title || 'Mobile Capture',
        content,
        type: 'text',
        tags: ['mobile-share', share.type],
        checklist: [],
        color: 'default',
        pinned: false,
        archived: false,
        trashed: false,
        folderId,
        reminderDate: null,
        images: share.dataUrl && share.type === 'image' ? [{
          id: `img-${Date.now()}`,
          name: share.fileName || 'Shared Image',
          dataUrl: share.dataUrl,
          size: share.fileSize,
        }] : [],
      });

      if (context.openNote) {
        context.openNote(newNote.id, newNote.title);
      }
    }
  }

  /**
   * Deletes a staged share item from queue
   */
  public removeStagedShare(id: string): void {
    this.stagingQueue = this.stagingQueue.filter((s) => s.id !== id);
    this.persistStaging();
  }

  /**
   * Clears all failed or pending shares
   */
  public clearAllStagedShares(): void {
    this.stagingQueue = [];
    this.persistStaging();
  }
}

export const mobileShareService = new MobileShareService();
