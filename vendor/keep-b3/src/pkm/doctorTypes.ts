import { Note, Folder, AppSettings, SavedSearch } from '../types';
import { CanvasBoard } from './canvasTypes';
import { PDFAttachment } from './pdfTypes';

export type DiagnosticCategory =
  | 'broken_links'
  | 'ambiguous_links'
  | 'orphan_notes'
  | 'tags'
  | 'folders'
  | 'attachments'
  | 'storage'
  | 'invalid_structures'
  | 'possible_duplicates'
  | 'orphan_connections'
  | 'moc_clusters'
  | 'review_system'
  | 'quarantined_resources';

export type DiagnosticSeverity = 'critical' | 'error' | 'warning' | 'info';

export type DiagnosticIssueType =
  // Broken links
  | 'missing_target_note'
  | 'missing_target_heading'
  | 'missing_target_block'
  // Ambiguous links
  | 'ambiguous_link_target'
  // Orphan notes
  | 'orphan_note'
  // Tags
  | 'unused_tag'
  | 'rare_tag'
  | 'casing_duplicate_tag'
  | 'empty_tag'
  // Folders
  | 'empty_folder'
  // Attachments
  | 'unreferenced_attachment_blob'
  | 'missing_referenced_attachment'
  | 'duplicate_attachment'
  // Invalid structures
  | 'broken_transclusion'
  | 'malformed_query_block'
  | 'stale_canvas_note_ref'
  // Knowledge Intelligence
  | 'duplicate_note_pair'
  | 'duplicate_note_group'
  | 'orphan_connection_suggestion'
  | 'unhubbed_moc_cluster'
  // Knowledge Review & Spaced Repetition (P38)
  | 'duplicate_card_id'
  | 'malformed_cloze_syntax'
  | 'orphan_review_state'
  | 'missing_card_anchor'
  // V1.2 Quarantined & Schema Invariants
  | 'quarantined_corrupt_record'
  | 'schema_invariant_violation';

export interface DiagnosticAction {
  id: string;
  label: string;
  description?: string;
  actionType:
    | 'create_missing_note'
    | 'repoint_link'
    | 'delete_empty_folder'
    | 'merge_tags'
    | 'delete_unreferenced_attachment'
    | 'fix_query_block'
    | 'remove_stale_canvas_node'
    | 'open_note'
    | 'open_canvas'
    | 'compare_duplicates'
    | 'ignore_duplicate_pair'
    | 'apply_orphan_connection'
    | 'create_moc_from_cluster'
    | 'dismiss_orphan_suggestion'
    | 'dismiss_moc_suggestion'
    | 'repair_duplicate_card_ids'
    | 'clean_orphan_review_states'
    | 'fix_cloze_syntax';
  isDestructive?: boolean;
  requiresTargetSelection?: boolean;
  params?: Record<string, unknown>;
}

export interface DiagnosticIssue {
  id: string;
  category: DiagnosticCategory;
  type: DiagnosticIssueType;
  severity: DiagnosticSeverity;
  title: string;
  description: string;
  sourceId?: string; // Note ID, Board ID, Folder ID, or Attachment ID
  sourceName?: string;
  targetName?: string;
  location?: {
    line?: number;
    charOffset?: number;
    rawSnippet?: string;
  };
  metadata?: {
    target?: string;
    subpath?: string;
    subpathType?: 'heading' | 'block';
    candidates?: Array<{ noteId: string; title: string }>;
    duplicateIds?: string[];
    canonicalTag?: string;
    variantTags?: string[];
    count?: number;
    sizeBytes?: number;
    querySyntaxError?: string;
    querySuggestion?: string;
    boardId?: string;
    staleNodeIds?: string[];
  };
  suggestedActions: DiagnosticAction[];
}

export interface StorageBreakdown {
  notesBytes: number;
  notesCount: number;
  imagesBytes: number;
  imagesCount: number;
  pdfBytes: number;
  pdfCount: number;
  audioBytes: number;
  audioCount: number;
  canvasBytes: number;
  canvasCount: number;
  otherAttachmentsBytes: number;
  otherAttachmentsCount: number;
  cacheEstimatedBytes: number;
  totalAppBytes: number;
  quotaReport?: {
    usage: number; // bytes
    quota: number; // bytes
    usagePercent: number;
    isEstimate: boolean;
  };
}

export interface VaultDiagnosticsReport {
  timestamp: string;
  totalIssues: number;
  errorsCount: number;
  warningsCount: number;
  infoCount: number;
  issues: DiagnosticIssue[];
  issuesByCategory: Record<DiagnosticCategory, DiagnosticIssue[]>;
  storageBreakdown: StorageBreakdown;
  durationMs: number;
}

export interface DiagnosticsScanProgress {
  phase: string;
  currentStep: number;
  totalSteps: number;
  percent: number;
}

export interface RepairCheckpoint {
  id: string;
  timestamp: string;
  description: string;
  backupJSON: string;
}
