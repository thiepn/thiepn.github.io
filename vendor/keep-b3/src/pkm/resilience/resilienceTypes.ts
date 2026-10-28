/**
 * Phase P29: Data Resilience, Transaction Safety & Recovery Types
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAttachment, PDFAnnotation } from '../pdfTypes';
import { CanonicalAttachment } from '../media/mediaTypes';

// ==========================================
// 1. DATA CLASSIFICATION TAXONOMY
// ==========================================

export type DataPersistenceClass = 'canonical' | 'derived' | 'ephemeral';

export interface DataClassificationEntry {
  dataType: string;
  name: string;
  persistenceClass: DataPersistenceClass;
  storageTarget: 'IndexedDB' | 'localStorage' | 'Memory' | 'FileSystem';
  isEncryptedAtRest: boolean;
  canBeDiscardedAndRebuilt: boolean;
  description: string;
}

// ==========================================
// 2. NOTE AUTOSAVE STATE MACHINE & CONCURRENCY
// ==========================================

export type NoteSaveStatus =
  | 'clean'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error'
  | 'conflict';

export interface NoteSaveState {
  noteId: string;
  status: NoteSaveStatus;
  localVersion: number;
  persistedVersion: number;
  lastSavedAt: string | null;
  lastAttemptAt: string | null;
  errorMessage: string | null;
  isQuotaError: boolean;
  uncommittedContent?: string;
  saveSequenceId: number;
}

export interface NoteMutationResult {
  success: boolean;
  note?: Note;
  previousVersion?: number;
  newVersion?: number;
  error?: string;
  conflictDetected?: boolean;
}

// ==========================================
// 3. RECOVERY JOURNAL
// ==========================================

export type JournalOperationStatus =
  | 'prepared'
  | 'running'
  | 'committing'
  | 'completed'
  | 'failed'
  | 'recovery-required';

export type JournalOperationType =
  | 'vault_import'
  | 'bulk_metadata_mutation'
  | 'bulk_tag_edit'
  | 'bulk_folder_move'
  | 'bulk_note_delete'
  | 'note_extraction'
  | 'canvas_card_conversion'
  | 'encryption_migration'
  | 'encryption_password_change'
  | 'git_merge_application'
  | 'recovery_point_restore'
  | 'attachment_deduplication';

export interface JournalOperationEntry {
  id: string;
  type: JournalOperationType;
  title: string;
  description?: string;
  status: JournalOperationStatus;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  totalRecords: number;
  processedRecords: number;
  affectedNoteIds: string[];
  checkpointData?: any;
  rollbackPlan?: {
    action: 'restore_snapshot' | 'undo_mutations' | 'discard_staging';
    payload: any;
  };
  errorMessage?: string;
}

// ==========================================
// 4. RECOVERY POINTS (SAME-ORIGIN CHECKPOINTS)
// ==========================================

export type RecoveryPointTrigger =
  | 'manual'
  | 'daily'
  | 'weekly'
  | 'before_import'
  | 'before_bulk_edit'
  | 'before_encryption'
  | 'before_restore'
  | 'before_doctor_repair'
  | 'before_p2p_sync'
  | 'before_filesystem_reconcile';

export interface RecoveryPointManifest {
  id: string;
  createdAt: string;
  trigger: RecoveryPointTrigger;
  label: string;
  isProtected?: boolean; // Pinned from automatic pruning
  stats: {
    noteCount: number;
    folderCount: number;
    canvasCount: number;
    pdfCount: number;
    attachmentCount: number;
    approximateSizeBytes: number;
  };
  contentChecksum: string;
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  canvases?: CanvasBoard[];
  pdfAnnotations?: PDFAnnotation[];
  attachmentManifest?: Array<{
    id: string;
    name: string;
    checksum: string;
    sizeBytes: number;
    mimeType: string;
  }>;
  settings?: AppSettings;
}

export interface RecoveryPointSummary {
  id: string;
  createdAt: string;
  trigger: RecoveryPointTrigger;
  label: string;
  isProtected: boolean;
  noteCount: number;
  folderCount: number;
  canvasCount: number;
  approximateSizeBytes: number;
  contentChecksum: string;
}

// ==========================================
// 5. NOTE REVISIONS
// ==========================================

export interface BoundedNoteRevision {
  id: string;
  noteId: string;
  version: number;
  timestamp: string;
  title: string;
  content: string;
  characterCount: number;
  wordCount: number;
  checksum: string;
  trigger: 'auto_coalesced' | 'manual_checkpoint' | 'before_destructive_edit' | 'pre_restore';
}

export interface NoteRevisionDiff {
  oldVersion: number;
  newVersion: number;
  addedLines: number;
  removedLines: number;
  unchangedLines: number;
  diffChunks: Array<{
    type: 'add' | 'remove' | 'unchanged';
    text: string;
    lineNumber?: number;
  }>;
}

// ==========================================
// 6. TRUE INDEPENDENT BACKUPS
// ==========================================

export type BackupDestinationType = 'download' | 'filesystem_directory' | 'git_remote';

export type BackupStatusState =
  | 'never_backed_up'
  | 'healthy'
  | 'backup_due'
  | 'permission_required'
  | 'failed'
  | 'creating';

export interface ExternalBackupStatus {
  status: BackupStatusState;
  lastBackupTimestamp: string | null;
  lastBackupType: 'manual_download' | 'filesystem' | 'encrypted_archive' | null;
  lastBackupSizeBytes?: number;
  lastBackupItemCount?: number;
  lastBackupChecksum?: string;
  filesystemDirectoryHandleName?: string;
  errorMessage?: string;
}

export interface BackupArchiveManifest {
  formatVersion: '2.0.0';
  archiveType: 'plaintext_vault' | 'encrypted_vault';
  appName: 'KeepNotes PKM';
  exportedAt: string;
  vaultRevision: number;
  checksum: string;
  stats: {
    noteCount: number;
    folderCount: number;
    canvasCount: number;
    pdfCount: number;
    attachmentCount: number;
    totalSizeBytes: number;
  };
  includesEncryptionHeader: boolean;
  includedCategories: Array<'notes' | 'folders' | 'saved_searches' | 'canvases' | 'attachments' | 'pdf_annotations' | 'settings'>;
}

// ==========================================
// 7. STORAGE QUOTA & BREAKDOWN
// ==========================================

export type StoragePressureLevel = 'normal' | 'elevated' | 'high' | 'critical';

export interface StorageQuotaEstimate {
  isSupported: boolean;
  usageBytes: number;
  quotaBytes: number;
  percentUsed: number;
  pressureLevel: StoragePressureLevel;
  humanUsage: string;
  humanQuota: string;
  breakdown: {
    notesSizeBytes: number;
    attachmentsSizeBytes: number;
    canvasSizeBytes: number;
    revisionsSizeBytes: number;
    recoveryPointsSizeBytes: number;
    derivedCachesSizeBytes: number;
  };
  hasPersistentStoragePermission: boolean;
}
