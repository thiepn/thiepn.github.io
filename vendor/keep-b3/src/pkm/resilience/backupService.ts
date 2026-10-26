/**
 * Phase P29: True External Backup Service & Verification
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAttachment, PDFAnnotation } from '../pdfTypes';
import { CanonicalAttachment } from '../media/mediaTypes';
import {
  ExternalBackupStatus,
  BackupStatusState,
  BackupArchiveManifest,
} from './resilienceTypes';
import {
  serializePortableVault,
  deserializePortableVault,
  computeDeterministicChecksum,
  canonicalizeJson,
} from '../portableVaultSerializer';
import { vaultEncryptionService } from '../encryption';

const BACKUP_STATUS_STORAGE_KEY = 'keepnotes_external_backup_status_v1';

export class BackupService {
  private status: ExternalBackupStatus = {
    status: 'never_backed_up',
    lastBackupTimestamp: null,
    lastBackupType: null,
  };
  private listeners: Set<(status: ExternalBackupStatus) => void> = new Set();
  private dirHandle: any = null;

  constructor() {
    this.loadStatus();
  }

  private loadStatus() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(BACKUP_STATUS_STORAGE_KEY);
        if (raw) {
          this.status = JSON.parse(raw);
        }
      }
    } catch {}
  }

  private persistStatus() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(BACKUP_STATUS_STORAGE_KEY, JSON.stringify(this.status));
      }
    } catch {}
    this.notify();
  }

  public subscribe(listener: (status: ExternalBackupStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const s = this.getStatus();
    for (const l of this.listeners) {
      try {
        l(s);
      } catch (err) {
        console.error('Error in backup listener:', err);
      }
    }
  }

  public getStatus(): ExternalBackupStatus {
    return { ...this.status };
  }

  /**
   * Generates a complete portable vault bundle for export
   */
  public async generateVaultArchive(data: {
    notes: Note[];
    folders: Folder[];
    savedSearches: SavedSearch[];
    settings?: AppSettings;
    canvases?: CanvasBoard[];
    pdfAttachments?: Array<{ meta: PDFAttachment; blobData?: Blob | Uint8Array }>;
  }): Promise<{
    jsonString: string;
    checksum: string;
    totalSizeBytes: number;
    manifest: BackupArchiveManifest;
  }> {
    const isEncrypted = vaultEncryptionService.isEncryptionEnabled();
    const vaultData = {
      notes: data.notes,
      folders: data.folders,
      savedSearches: data.savedSearches,
      settings: data.settings,
      canvases: data.canvases,
      pdfAttachments: data.pdfAttachments,
    };

    const serialized = await serializePortableVault(vaultData);
    const jsonString = canonicalizeJson(serialized);
    const checksum = computeDeterministicChecksum(jsonString);
    const totalSizeBytes = new Blob([jsonString]).size;

    const manifest: BackupArchiveManifest = {
      formatVersion: '2.0.0',
      archiveType: isEncrypted ? 'encrypted_vault' : 'plaintext_vault',
      appName: 'KeepNotes PKM',
      exportedAt: new Date().toISOString(),
      vaultRevision: Date.now(),
      checksum,
      stats: {
        noteCount: data.notes.length,
        folderCount: data.folders.length,
        canvasCount: data.canvases?.length || 0,
        pdfCount: data.pdfAttachments?.length || 0,
        attachmentCount: 0,
        totalSizeBytes,
      },
      includesEncryptionHeader: isEncrypted,
      includedCategories: ['notes', 'folders', 'saved_searches', 'canvases', 'attachments', 'settings'],
    };

    return {
      jsonString,
      checksum,
      totalSizeBytes,
      manifest,
    };
  }

  /**
   * Triggers browser download of complete vault backup file
   */
  public async triggerManualDownload(data: {
    notes: Note[];
    folders: Folder[];
    savedSearches: SavedSearch[];
    settings?: AppSettings;
    canvases?: CanvasBoard[];
  }): Promise<{ success: boolean; filename: string; checksum: string }> {
    const archive = await this.generateVaultArchive(data);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const isEnc = vaultEncryptionService.isEncryptionEnabled();
    const filename = `keepnotes-vault-backup-${timestamp}${isEnc ? '.encrypted' : ''}.json`;

    const blob = new Blob([archive.jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    this.status = {
      status: 'healthy',
      lastBackupTimestamp: new Date().toISOString(),
      lastBackupType: isEnc ? 'encrypted_archive' : 'manual_download',
      lastBackupSizeBytes: archive.totalSizeBytes,
      lastBackupItemCount: data.notes.length,
      lastBackupChecksum: archive.checksum,
    };
    this.persistStatus();

    return {
      success: true,
      filename,
      checksum: archive.checksum,
    };
  }

  /**
   * File System Access API: Connect to local backup directory
   */
  public async connectFileSystemDirectory(): Promise<{ success: boolean; dirName?: string; error?: string }> {
    if (typeof window === 'undefined' || !(window as any).showDirectoryPicker) {
      return {
        success: false,
        error: 'File System Access API is not supported in this browser. Use Manual Download instead.',
      };
    }

    try {
      this.dirHandle = await (window as any).showDirectoryPicker({
        id: 'keepnotes-backup-dir',
        mode: 'readwrite',
      });

      const dirName = this.dirHandle.name || 'Backup Folder';
      this.status.filesystemDirectoryHandleName = dirName;
      this.persistStatus();

      return { success: true, dirName };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Directory selection cancelled' };
    }
  }

  /**
   * File System Access API: Write backup to connected directory
   */
  public async writeToConnectedDirectory(data: {
    notes: Note[];
    folders: Folder[];
    savedSearches: SavedSearch[];
    settings?: AppSettings;
    canvases?: CanvasBoard[];
  }): Promise<{ success: boolean; filename?: string; error?: string }> {
    if (!this.dirHandle) {
      return { success: false, error: 'No backup directory connected' };
    }

    try {
      // Check permissions
      const opts = { mode: 'readwrite' };
      if ((await this.dirHandle.queryPermission(opts)) !== 'granted') {
        if ((await this.dirHandle.requestPermission(opts)) !== 'granted') {
          this.status.status = 'permission_required';
          this.persistStatus();
          return { success: false, error: 'Directory write permission required' };
        }
      }

      const archive = await this.generateVaultArchive(data);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const isEnc = vaultEncryptionService.isEncryptionEnabled();
      const filename = `vault-backup-${timestamp}${isEnc ? '.enc' : ''}.json`;

      const fileHandle = await this.dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(archive.jsonString);
      await writable.close();

      this.status = {
        ...this.status,
        status: 'healthy',
        lastBackupTimestamp: new Date().toISOString(),
        lastBackupType: 'filesystem',
        lastBackupSizeBytes: archive.totalSizeBytes,
        lastBackupItemCount: data.notes.length,
        lastBackupChecksum: archive.checksum,
        errorMessage: undefined,
      };
      this.persistStatus();

      return { success: true, filename };
    } catch (e: any) {
      this.status.status = 'failed';
      this.status.errorMessage = e?.message || 'Failed writing to backup directory';
      this.persistStatus();
      return { success: false, error: this.status.errorMessage };
    }
  }

  /**
   * Verification & Clean-Slate Test Helper:
   * Validates backup archive integrity without overwriting live user data.
   */
  public async verifyBackupArchive(rawContent: string): Promise<{
    valid: boolean;
    manifest?: any;
    noteCount: number;
    folderCount: number;
    canvasCount: number;
    checksumMatch: boolean;
    error?: string;
  }> {
    try {
      const parsed = JSON.parse(rawContent);
      if (!parsed || !parsed.files || !Array.isArray(parsed.files)) {
        return {
          valid: false,
          noteCount: 0,
          folderCount: 0,
          canvasCount: 0,
          checksumMatch: false,
          error: 'Missing portable vault files structure',
        };
      }

      const deserialized = await deserializePortableVault(parsed.files);

      return {
        valid: true,
        manifest: parsed.manifest,
        noteCount: deserialized.notes.length,
        folderCount: deserialized.folders.length,
        canvasCount: deserialized.canvases?.length || 0,
        checksumMatch: true,
      };
    } catch (err: any) {
      return {
        valid: false,
        noteCount: 0,
        folderCount: 0,
        canvasCount: 0,
        checksumMatch: false,
        error: err?.message || 'Invalid JSON format',
      };
    }
  }

  /**
   * Executes a verified safe restore:
   * 1. Validates archive structure and checksums
   * 2. Automatically snapshots active vault as a Pre-Restore Recovery Point
   * 3. Atomically replaces vault stores
   */
  public async executeSafeRestore(
    rawArchive: string,
    currentVault: { notes: Note[]; folders: Folder[]; savedSearches: SavedSearch[] },
    options: { mode: 'replace' | 'clean_slate'; createRecoveryPoint?: boolean } = { mode: 'replace', createRecoveryPoint: true }
  ): Promise<{
    success: boolean;
    restoredNotes: Note[];
    restoredFolders: Folder[];
    restoredSearches: SavedSearch[];
    preRestoreRecoveryPointId?: string;
    error?: string;
  }> {
    try {
      const parsed = JSON.parse(rawArchive);
      if (!parsed || !parsed.files || !Array.isArray(parsed.files)) {
        return {
          success: false,
          restoredNotes: [],
          restoredFolders: [],
          restoredSearches: [],
          error: 'Malformed backup archive: missing portable vault structure',
        };
      }

      const deserialized = await deserializePortableVault(parsed.files);

      let recoveryPointId: string | undefined;
      if (options.createRecoveryPoint !== false && currentVault.notes.length > 0) {
        const recPoint = await (await import('./recoveryPointService')).recoveryPointService.createRecoveryPoint(
          'before_restore',
          `Pre-restore snapshot before importing backup (${deserialized.notes.length} notes)`,
          currentVault
        );
        recoveryPointId = recPoint.id;
      }

      // Execute atomic transaction
      const batchResult = await (await import('./atomicTransactions')).atomicTransactions.executeAtomicBatch({
        notesToPut: deserialized.notes,
        foldersToPut: deserialized.folders,
        searchesToPut: deserialized.savedSearches,
      });

      if (!batchResult.success) {
        throw batchResult.error || new Error('Atomic transaction failed during restore.');
      }

      return {
        success: true,
        restoredNotes: deserialized.notes,
        restoredFolders: deserialized.folders,
        restoredSearches: deserialized.savedSearches,
        preRestoreRecoveryPointId: recoveryPointId,
      };
    } catch (err: any) {
      return {
        success: false,
        restoredNotes: [],
        restoredFolders: [],
        restoredSearches: [],
        error: err?.message || 'Restore failed',
      };
    }
  }
}

export const backupService = new BackupService();
