/**
 * Phase P45: Filesystem Vault Bridge Service
 * 
 * Central coordinator for live directory mirroring, external change detection,
 * 3-way synchronization, conflict resolution, and platform fallbacks.
 */

import { Note, Folder } from '../../types';
import {
  FilesystemBridgeConfig,
  FilesystemBridgeSettings,
  FilesystemBridgeStatus,
  MirrorManifest,
  ReconciliationPlan,
  ReconciliationItem,
  FilesystemConflict,
  FilesystemSyncLog,
} from './filesystemTypes';
import {
  getPlatformFilesystemCapabilities,
  pickUserVaultDirectory,
  persistDirectoryHandle,
  getPersistedDirectoryHandle,
  clearPersistedDirectoryHandle,
  verifyHandlePermission,
} from './filesystemCapabilities';
import { manifestService } from './manifestService';
import { pathMappingService } from './pathMappingService';
import { reconciliationEngine, DiskFileInfo } from './reconciliationEngine';
import { fileHasher } from './fileHasher';
import { serializeNoteToMarkdown, parseMarkdownToNote } from '../portableVaultSerializer';
import { recoveryPointService } from '../resilience/recoveryPointService';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';

const STORAGE_KEY = 'pkm_filesystem_bridge_v1';
const SYNC_LOGS_KEY = 'pkm_filesystem_sync_logs_v1';

const DEFAULT_SETTINGS: FilesystemBridgeSettings = {
  autoSync: true,
  pollingIntervalMs: 10000,
  debounceMs: 1200,
  filenamePolicy: 'follow_title',
  mirrorAttachments: true,
  mirrorConfig: true,
  allowPlaintextEncryptedMirror: false,
  maxPathLength: 240,
};

export class FilesystemBridgeService {
  private config: FilesystemBridgeConfig | null = null;
  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private manifest: MirrorManifest | null = null;
  private diskInventory: Map<string, DiskFileInfo> = new Map();
  private pendingPlan: ReconciliationPlan | null = null;
  private activeConflicts: FilesystemConflict[] = [];
  private syncLogs: FilesystemSyncLog[] = [];
  private listeners: Array<() => void> = [];

  private isLeader = false;
  private pollingTimer: any = null;
  private debounceTimer: any = null;
  private isSyncing = false;

  constructor() {
    this.loadState();
    this.setupListeners();
    this.initLeaderElection();
  }

  /**
   * Loads persisted configuration and sync logs
   */
  private loadState(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.config = JSON.parse(raw);
      }
      const rawLogs = localStorage.getItem(SYNC_LOGS_KEY);
      if (rawLogs) {
        this.syncLogs = JSON.parse(rawLogs);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Persists configuration to localStorage
   */
  private persistConfig(): void {
    try {
      if (this.config) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
    this.notify();
  }

  /**
   * Adds an entry to the sync history log
   */
  private logSync(entry: Omit<FilesystemSyncLog, 'id' | 'timestamp'>): void {
    const log: FilesystemSyncLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.syncLogs.unshift(log);
    if (this.syncLogs.length > 50) {
      this.syncLogs = this.syncLogs.slice(0, 50);
    }
    try {
      localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(this.syncLogs));
    } catch {
      // Ignore
    }
  }

  /**
   * Initializes tab leader election using Web Locks or BroadcastChannel
   */
  private initLeaderElection(): void {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      navigator.locks.request('pkm_filesystem_bridge_leader', { mode: 'exclusive' }, async () => {
        this.isLeader = true;
        this.startAutoSyncLoop();
        return new Promise(() => {
          // Keep lock active for tab lifetime
        });
      }).catch(() => {
        this.isLeader = false;
      });
    } else {
      // Fallback: single tab assumes leadership
      this.isLeader = true;
      this.startAutoSyncLoop();
    }
  }

  /**
   * Sets up focus, visibility, and storage event listeners
   */
  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('focus', () => {
      if (this.isLeader && this.config?.settings.autoSync) {
        this.triggerDebouncedSync();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isLeader && this.config?.settings.autoSync) {
        this.triggerDebouncedSync();
      }
    });
  }

  /**
   * Starts periodic polling loop if connected
   */
  private startAutoSyncLoop(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    const interval = this.config?.settings.pollingIntervalMs || 10000;
    this.pollingTimer = setInterval(() => {
      if (this.isLeader && this.config?.settings.autoSync && this.directoryHandle && !this.isSyncing) {
        this.triggerDebouncedSync();
      }
    }, interval);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch (err) {
        console.error('FilesystemBridgeService listener error:', err);
      }
    }
  }

  // --- Getters ---

  public getConfig(): FilesystemBridgeConfig | null {
    return this.config;
  }

  public getStatus(): FilesystemBridgeStatus {
    return this.config?.status || 'Disconnected';
  }

  public getManifest(): MirrorManifest | null {
    return this.manifest;
  }

  public getDiskInventory(): Map<string, DiskFileInfo> {
    return this.diskInventory;
  }

  public getPendingPlan(): ReconciliationPlan | null {
    return this.pendingPlan;
  }

  public getConflicts(): FilesystemConflict[] {
    return this.activeConflicts;
  }

  public getSyncLogs(): FilesystemSyncLog[] {
    return this.syncLogs;
  }

  public isConfigured(): boolean {
    return Boolean(this.config && this.config.status !== 'Disconnected');
  }

  public isConnected(): boolean {
    return Boolean(this.config && this.directoryHandle && this.config.status !== 'Disconnected');
  }

  // --- Lifecycle & Directory Connection ---

  /**
   * Attempts to restore directory handle from IndexedDB on startup
   */
  public async initStartupHandle(): Promise<boolean> {
    const handle = await getPersistedDirectoryHandle();
    if (handle) {
      this.directoryHandle = handle;
      const perm = await verifyHandlePermission(handle, false);
      if (perm === 'granted') {
        if (this.config) {
          this.config.status = 'Up to Date';
          this.persistConfig();
        }
        return true;
      } else if (perm === 'prompt') {
        if (this.config) {
          this.config.status = 'Permission Required';
          this.persistConfig();
        }
      }
    }
    return false;
  }

  /**
   * Connects a user-selected local folder via directory picker
   */
  public async connectFolder(
    notes: Note[],
    folders: Folder[],
    vaultId = 'default_vault'
  ): Promise<{ success: boolean; requiresAnalysis?: boolean; isExistingMirror?: boolean; message?: string }> {
    const caps = getPlatformFilesystemCapabilities();
    if (!caps.supportsDirectoryPicker) {
      return {
        success: false,
        message: 'The File System Access API is not supported in this browser.',
      };
    }

    try {
      const handle = await pickUserVaultDirectory();
      if (!handle) {
        return { success: false, message: 'Folder selection was cancelled.' };
      }

      this.directoryHandle = handle;
      await persistDirectoryHandle(handle);

      // Check directory contents
      const existingInventory = await reconciliationEngine.scanDiskDirectory(handle);
      this.diskInventory = existingInventory;

      // Check if .pkm-manifest.json already exists
      const existingManifest = await manifestService.readManifest(handle);

      if (existingManifest && existingManifest.vaultId) {
        // Re-connecting existing mirror
        this.manifest = existingManifest;
        this.config = {
          id: `bridge-${Date.now()}`,
          vaultId: existingManifest.vaultId,
          displayName: handle.name,
          mode: 'mirror',
          layoutVersion: 1,
          status: 'Up to Date',
          settings: this.config?.settings || DEFAULT_SETTINGS,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        this.persistConfig();
        return { success: true, isExistingMirror: true };
      }

      if (existingInventory.size > 0) {
        // Non-empty unknown folder
        return {
          success: true,
          requiresAnalysis: true,
          message: `The selected folder "${handle.name}" contains ${existingInventory.size} files.`,
        };
      }

      // Empty folder: Initialize fresh mirror
      const newManifest = manifestService.createEmptyManifest(vaultId);
      this.manifest = newManifest;

      this.config = {
        id: `bridge-${Date.now()}`,
        vaultId,
        displayName: handle.name,
        mode: 'mirror',
        layoutVersion: 1,
        status: 'Syncing',
        settings: this.config?.settings || DEFAULT_SETTINGS,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.persistConfig();

      // Initial populate from app vault to empty disk folder
      await this.buildInitialMirror(notes, folders);
      return { success: true };
    } catch (err: any) {
      console.error('Error connecting folder:', err);
      return { success: false, message: err.message || 'Failed to connect folder.' };
    }
  }

  /**
   * Re-requests directory permissions on a stored handle
   */
  public async requestPermissionPrompt(): Promise<boolean> {
    if (!this.directoryHandle) return false;
    const perm = await verifyHandlePermission(this.directoryHandle, true);
    if (perm === 'granted') {
      if (this.config) {
        this.config.status = 'Up to Date';
        this.persistConfig();
      }
      return true;
    }
    return false;
  }

  /**
   * Disconnects folder without deleting any local or external files
   */
  public async disconnectFolder(): Promise<void> {
    this.directoryHandle = null;
    this.manifest = null;
    this.diskInventory.clear();
    this.pendingPlan = null;
    this.activeConflicts = [];
    if (this.config) {
      this.config.status = 'Disconnected';
      this.persistConfig();
    }
    await clearPersistedDirectoryHandle();
  }

  /**
   * Builds the initial mirror by writing all active notes to the empty connected folder
   */
  private async buildInitialMirror(notes: Note[], folders: Folder[]): Promise<void> {
    if (!this.directoryHandle || !this.manifest || !this.config) return;

    const startTime = Date.now();
    const folderMap = new Map<string, string>();
    for (const f of folders) {
      folderMap.set(f.id, f.name);
    }

    const activeNotes = notes.filter((n) => !n.trashed);
    const existingPaths = new Set<string>();
    let written = 0;

    for (const note of activeNotes) {
      const filePath = pathMappingService.getNoteFilePath(
        note,
        folders,
        this.config.settings.filenamePolicy,
        existingPaths
      );
      existingPaths.add(filePath.toLowerCase());

      const mdContent = serializeNoteToMarkdown(note, folderMap);
      const hash = await fileHasher.hashText(mdContent);

      const success = await reconciliationEngine.writeTextFile(
        this.directoryHandle,
        filePath,
        mdContent
      );

      if (success) {
        manifestService.updateRecord(this.manifest, {
          resourceId: note.id,
          resourceType: 'note',
          path: filePath,
          lastHash: hash,
          mtime: Date.now(),
          canonicalTitle: note.title,
          folderId: note.folderId,
        });
        written++;
      }
    }

    await manifestService.writeManifest(this.directoryHandle, this.manifest);

    this.config.status = 'Up to Date';
    this.config.lastSyncTimestamp = Date.now();
    this.persistConfig();

    this.logSync({
      appToDisk: written,
      diskToApp: 0,
      conflicts: 0,
      errors: [],
      durationMs: Date.now() - startTime,
    });
  }

  // --- Debounced & Active Synchronization ---

  /**
   * Triggers a debounced sync scan (used by keystrokes, save handlers, or focus events)
   */
  public triggerDebouncedSync(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const debounceMs = this.config?.settings.debounceMs || 1200;
    this.debounceTimer = setTimeout(() => {
      // Notify listeners to perform sync if context is available
      this.notify();
    }, debounceMs);
  }

  /**
   * Performs an immediate active scan and generates a reconciliation plan
   */
  public async scanAndReconcile(
    notes: Note[],
    folders: Folder[],
    onSaveNote: (note: Note) => void,
    onDeleteNote: (noteId: string) => void
  ): Promise<ReconciliationPlan | null> {
    if (!this.directoryHandle || !this.config || this.isSyncing) {
      return null;
    }

    // Check permissions
    const perm = await verifyHandlePermission(this.directoryHandle, false);
    if (perm !== 'granted') {
      this.config.status = 'Permission Required';
      this.persistConfig();
      return null;
    }

    this.isSyncing = true;
    this.config.status = 'Syncing';
    this.notify();

    try {
      // 1. Refresh manifest from disk if needed
      if (!this.manifest) {
        this.manifest = await manifestService.readManifest(this.directoryHandle);
        if (!this.manifest) {
          this.manifest = manifestService.createEmptyManifest(this.config.vaultId);
        }
      }

      // 2. Scan disk inventory
      this.diskInventory = await reconciliationEngine.scanDiskDirectory(this.directoryHandle);

      // 3. Generate reconciliation plan
      const plan = await reconciliationEngine.generatePlan(
        notes,
        folders,
        this.manifest,
        this.diskInventory,
        this.config.settings.filenamePolicy
      );

      this.pendingPlan = plan;

      if (plan.requiresSafetyReview) {
        this.config.status = plan.stats.conflictCount > 0 ? 'Conflicts' : 'External Changes';
        this.persistConfig();
        return plan;
      }

      // 4. Auto-apply low-risk changes
      await this.applyReconciliationPlan(plan, notes, folders, onSaveNote, onDeleteNote);
      return plan;
    } catch (err: any) {
      console.error('Error during scan and reconcile:', err);
      this.config.status = 'Error';
      this.config.statusMessage = err.message || 'Synchronization failed';
      this.persistConfig();
      return null;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Applies the approved reconciliation plan safely
   */
  public async applyReconciliationPlan(
    plan: ReconciliationPlan,
    notes: Note[],
    folders: Folder[],
    onSaveNote: (note: Note) => void,
    onDeleteNote: (noteId: string) => void
  ): Promise<void> {
    if (!this.directoryHandle || !this.manifest || !this.config) return;

    const startTime = Date.now();
    let appToDisk = 0;
    let diskToApp = 0;
    const errors: string[] = [];

    // Create P29 recovery point if mass changes are about to occur
    if (plan.isMassChange || plan.isMassDelete) {
      try {
        await recoveryPointService.createRecoveryPoint(
          'before_filesystem_reconcile',
          `Pre-Filesystem Sync: ${plan.stats.totalChanges} changes`,
          { notes, folders },
          true
        );
      } catch (err) {
        console.warn('Could not create P29 recovery point before sync:', err);
      }
    }

    const folderMap = new Map<string, string>();
    const foldersByName = new Map<string, string>();
    for (const f of folders) {
      folderMap.set(f.id, f.name);
      foldersByName.set(f.name.toLowerCase(), f.id);
    }

    const noteMap = new Map<string, Note>();
    for (const n of notes) {
      noteMap.set(n.id, n);
    }

    for (const item of plan.items) {
      try {
        switch (item.action) {
          case 'app_to_disk': {
            const note = noteMap.get(item.resourceId);
            if (!note) break;
            const mdContent = serializeNoteToMarkdown(note, folderMap);
            const hash = await fileHasher.hashText(mdContent);
            const ok = await reconciliationEngine.writeTextFile(
              this.directoryHandle,
              item.path,
              mdContent
            );
            if (ok) {
              manifestService.updateRecord(this.manifest, {
                resourceId: note.id,
                resourceType: 'note',
                path: item.path,
                lastHash: hash,
                mtime: Date.now(),
                canonicalTitle: note.title,
                folderId: note.folderId,
              });
              appToDisk++;
            }
            break;
          }

          case 'disk_to_app': {
            const diskInfo = this.diskInventory.get(item.path);
            if (diskInfo) {
              const fileObj = await diskInfo.fileHandle.getFile();
              const mdContent = item.cleanMergedText || (await fileObj.text());
              const parsed = parseMarkdownToNote(mdContent, foldersByName);

              const existingNote = noteMap.get(item.resourceId);
              const updatedNote: Note = {
                ...(existingNote || {
                  id: item.resourceId,
                  createdAt: new Date().toISOString(),
                  tags: [],
                }),
                ...parsed,
                id: item.resourceId,
                title: parsed.title || item.title || 'Untitled Note',
                updatedAt: new Date().toISOString(),
              };

              onSaveNote(updatedNote);

              const hash = await fileHasher.hashText(mdContent);
              manifestService.updateRecord(this.manifest, {
                resourceId: updatedNote.id,
                resourceType: 'note',
                path: item.path,
                lastHash: hash,
                mtime: diskInfo.mtime,
                canonicalTitle: updatedNote.title,
                folderId: updatedNote.folderId,
              });
              diskToApp++;
            }
            break;
          }

          case 'new_external_note': {
            const diskInfo = this.diskInventory.get(item.path);
            if (diskInfo) {
              const fileObj = await diskInfo.fileHandle.getFile();
              const mdContent = await fileObj.text();
              const parsed = parseMarkdownToNote(mdContent, foldersByName);

              const newNote: Note = {
                id: parsed.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                title: parsed.title || item.title || pathMappingService.inferNoteTitle(diskInfo.name, mdContent),
                content: parsed.content || '',
                type: 'text',
                checklist: [],
                createdAt: parsed.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tags: parsed.tags || [],
                folderId: parsed.folderId || null,
                color: parsed.color || 'default',
                pinned: parsed.pinned || false,
                archived: parsed.archived || false,
                trashed: false,
                reminderDate: null,
                images: [],
              };

              onSaveNote(newNote);

              const hash = await fileHasher.hashText(mdContent);
              manifestService.updateRecord(this.manifest, {
                resourceId: newNote.id,
                resourceType: 'note',
                path: item.path,
                lastHash: hash,
                mtime: diskInfo.mtime,
                canonicalTitle: newNote.title,
                folderId: newNote.folderId,
              });
              diskToApp++;
            }
            break;
          }

          case 'rename_disk': {
            const note = noteMap.get(item.resourceId);
            if (note) {
              const oldRecord = this.manifest.resources[item.resourceId];
              if (oldRecord) {
                await reconciliationEngine.deleteFile(this.directoryHandle, oldRecord.path);
              }
              const mdContent = serializeNoteToMarkdown(note, folderMap);
              const hash = await fileHasher.hashText(mdContent);
              await reconciliationEngine.writeTextFile(this.directoryHandle, item.path, mdContent);
              manifestService.updateRecord(this.manifest, {
                resourceId: note.id,
                resourceType: 'note',
                path: item.path,
                lastHash: hash,
                mtime: Date.now(),
                canonicalTitle: note.title,
                folderId: note.folderId,
              });
              appToDisk++;
            }
            break;
          }

          case 'deletion_app_to_disk': {
            await reconciliationEngine.deleteFile(this.directoryHandle, item.path);
            manifestService.removeRecord(this.manifest, item.resourceId);
            break;
          }

          case 'deletion_disk_to_app': {
            onDeleteNote(item.resourceId);
            manifestService.removeRecord(this.manifest, item.resourceId);
            break;
          }

          case 'conflict': {
            const diskInfo = this.diskInventory.get(item.path);
            const note = noteMap.get(item.resourceId);
            let externalContent = '';
            if (diskInfo) {
              const f = await diskInfo.fileHandle.getFile();
              externalContent = await f.text();
            }
            const canonicalContent = note ? serializeNoteToMarkdown(note, folderMap) : '';

            this.activeConflicts.push({
              id: `conflict-${Date.now()}-${item.resourceId}`,
              resourceId: item.resourceId,
              resourceType: item.resourceType,
              path: item.path,
              title: item.title,
              detectedAt: Date.now(),
              canonicalContent,
              externalContent,
              baseHash: item.baseHash,
              appHash: item.appHash,
              diskHash: item.diskHash,
              conflictType: 'text',
            });
            break;
          }
        }
      } catch (err: any) {
        errors.push(`${item.path}: ${err.message}`);
      }
    }

    // Write updated manifest
    await manifestService.writeManifest(this.directoryHandle, this.manifest);

    this.pendingPlan = null;
    this.config.status = this.activeConflicts.length > 0 ? 'Conflicts' : 'Up to Date';
    this.config.lastSyncTimestamp = Date.now();
    this.persistConfig();

    this.logSync({
      appToDisk,
      diskToApp,
      conflicts: this.activeConflicts.length,
      errors,
      durationMs: Date.now() - startTime,
    });
  }

  /**
   * Resolves a single conflict explicitly
   */
  public async resolveConflict(
    conflictId: string,
    resolution: 'keep_app' | 'keep_external' | 'custom_merge',
    customText?: string,
    onSaveNote?: (note: Note) => void
  ): Promise<void> {
    const conflictIndex = this.activeConflicts.findIndex((c) => c.id === conflictId);
    if (conflictIndex === -1 || !this.directoryHandle || !this.manifest) return;

    const conflict = this.activeConflicts[conflictIndex];
    let finalText = '';

    if (resolution === 'keep_app') {
      finalText = conflict.canonicalContent || '';
    } else if (resolution === 'keep_external') {
      finalText = conflict.externalContent || '';
    } else if (resolution === 'custom_merge') {
      finalText = customText || '';
    }

    // Apply to disk
    await reconciliationEngine.writeTextFile(this.directoryHandle, conflict.path, finalText);
    const hash = await fileHasher.hashText(finalText);

    manifestService.updateRecord(this.manifest, {
      resourceId: conflict.resourceId,
      resourceType: conflict.resourceType,
      path: conflict.path,
      lastHash: hash,
      mtime: Date.now(),
      canonicalTitle: conflict.title,
    });
    await manifestService.writeManifest(this.directoryHandle, this.manifest);

    // Apply to app note if necessary
    if (onSaveNote && (resolution === 'keep_external' || resolution === 'custom_merge')) {
      const parsed = parseMarkdownToNote(finalText, new Map());
      onSaveNote({
        id: conflict.resourceId,
        title: parsed.title || conflict.title,
        content: parsed.content || '',
        type: 'text',
        checklist: [],
        color: 'default',
        pinned: false,
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: parsed.tags || [],
        folderId: parsed.folderId || null,
      });
    }

    this.activeConflicts.splice(conflictIndex, 1);
    if (this.config) {
      this.config.status = this.activeConflicts.length > 0 ? 'Conflicts' : 'Up to Date';
      this.persistConfig();
    }
  }

  /**
   * Updates bridge settings
   */
  public updateSettings(newSettings: Partial<FilesystemBridgeSettings>): void {
    if (!this.config) return;
    this.config.settings = { ...this.config.settings, ...newSettings };
    this.persistConfig();
    this.startAutoSyncLoop();
  }
}

export const filesystemBridgeService = new FilesystemBridgeService();
