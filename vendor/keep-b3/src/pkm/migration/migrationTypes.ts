/**
 * P40 — Universal Import, Migration & Interoperability Hub Types
 */

import { Note, Folder } from '../../types';
import { Reference } from '../reference/referenceTypes';

export type MigrationSourceType =
  | 'generic-markdown'
  | 'obsidian'
  | 'notion'
  | 'evernote-enex'
  | 'joplin'
  | 'logseq'
  | 'bibtex-reference'
  | 'apple-notes-html'
  | 'vcard';

export type WarningSeverity = 'blocking' | 'warning' | 'info';

export interface MigrationWarning {
  id: string;
  severity: WarningSeverity;
  category:
    | 'broken-link'
    | 'ambiguous-link'
    | 'missing-attachment'
    | 'unsupported-syntax'
    | 'unsupported-plugin'
    | 'malformed-metadata'
    | 'encrypted-content'
    | 'formula-rollup-degraded'
    | 'duplicate-id'
    | 'encoding-issue';
  message: string;
  sourcePath?: string;
  noteTitle?: string;
  lineNumber?: number;
  snippet?: string;
  remediation?: string;
}

export interface RawImportFile {
  name: string;
  path: string; // Relative normalized path e.g. "Folder/Subfolder/Note.md"
  size: number;
  lastModified?: number;
  readAsText: () => Promise<string>;
  readAsArrayBuffer: () => Promise<ArrayBuffer>;
  readAsBlob: () => Promise<Blob>;
}

export interface DetectionResult {
  sourceType: MigrationSourceType;
  confidence: number; // 0.0 to 1.0
  reason: string;
  detectedFeatures: string[];
  suggestedRootTitle?: string;
}

export interface NoteCandidate {
  id: string;
  sourcePath: string;
  sourceOriginalId?: string;
  title: string;
  rawMarkdown: string;
  frontmatter: Record<string, any>;
  createdTime?: number;
  modifiedTime?: number;
  folderPath?: string;
  tags: string[];
  aliases: string[];
  isDailyNote?: boolean;
  dailyNoteDate?: string;
  links: {
    target: string;
    label?: string;
    isWikilink: boolean;
    isEmbed: boolean;
    heading?: string;
    blockId?: string;
  }[];
  attachments: string[]; // Referenced relative paths/hashes
  provenance: {
    sourceType: MigrationSourceType;
    originalPath: string;
    importTimestamp: number;
    sourceHash: string;
  };
}

export interface AttachmentCandidate {
  id: string;
  sourcePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  blob?: Blob;
  dataUrl?: string;
  hash: string;
  referencedByNotePaths: string[];
}

export interface CanvasCandidate {
  id: string;
  sourcePath: string;
  title: string;
  nodesCount: number;
  edgesCount: number;
  canvasJson: string; // Canonical Canvas JSON format
}

export interface FolderCandidate {
  id: string;
  path: string; // e.g. "Work/Projects"
  name: string;
  parentPath?: string;
}

export interface MigrationPlan {
  sourceType: MigrationSourceType;
  duplicateStrategy: 'keep-both' | 'skip-exact' | 'review-conflicts';
  importRootFolder?: string; // Optional isolation folder e.g. "Imported/Obsidian"
  strictMode: boolean; // Halt if warnings exist
  createRecoveryPoint: boolean;
  mapDailyNotes: boolean;
  importCanvas: boolean;
  preserveSourceMetadata: boolean;
  propertyMappings?: Record<string, { targetName: string; targetType: string }>;
}

export interface LinkResolutionStats {
  totalLinks: number;
  resolvedDirect: number;
  resolvedFuzzyOrAlias: number;
  ambiguous: number;
  missingInternal: number;
  external: number;
  mediaEmbeds: number;
  blockRefsResolved: number;
}

export interface MigrationAnalysis {
  sourceType: MigrationSourceType;
  totalFilesScanned: number;
  totalBytes: number;
  notes: NoteCandidate[];
  attachments: AttachmentCandidate[];
  canvases: CanvasCandidate[];
  references: Reference[];
  folders: FolderCandidate[];
  warnings: MigrationWarning[];
  linkStats: LinkResolutionStats;
  exactDuplicatesCount: number;
  titleCollisionsCount: number;
  fingerprint: string;
  estimatedDiskSpaceBytes: number;
}

export interface MigrationProgress {
  stage: 'idle' | 'scanning' | 'analyzing' | 'converting' | 'resolving-links' | 'staging' | 'creating-recovery-point' | 'committing' | 'indexing' | 'completed' | 'failed' | 'cancelled';
  progressPercentage: number;
  currentMessage: string;
  processedItems: number;
  totalItems: number;
  error?: string;
}

export interface MigrationReport {
  operationId: string;
  sourceType: MigrationSourceType;
  timestamp: number;
  durationMs: number;
  summary: {
    notesImported: number;
    notesSkipped: number;
    attachmentsImported: number;
    canvasesImported: number;
    referencesImported: number;
    foldersCreated: number;
    warningsCount: number;
    errorsCount: number;
  };
  linkStats: LinkResolutionStats;
  warnings: MigrationWarning[];
  recoveryPointId?: string;
  targetFolder?: string;
  adapterVersion: string;
}

export interface MigrationHistoryEntry {
  id: string;
  timestamp: number;
  sourceType: MigrationSourceType;
  sourceFingerprint: string;
  counts: {
    notes: number;
    attachments: number;
    canvases: number;
    references: number;
  };
  status: 'success' | 'partial' | 'rolled-back' | 'failed';
  warningsCount: number;
  recoveryPointId?: string;
  reportSummary: string;
}

export interface ReimportMatch {
  candidate: NoteCandidate;
  existingNote: Note;
  matchType: 'exact-duplicate' | 'modified-source' | 'modified-local' | 'both-modified';
  sourceHashMatch: boolean;
}
