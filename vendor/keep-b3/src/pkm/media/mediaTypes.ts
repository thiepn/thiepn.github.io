import { Note } from '../../types';

export type AttachmentKind = 'image' | 'pdf' | 'audio' | 'text' | 'other';

/**
 * Canonical Attachment Metadata stored in the vault
 */
export interface CanonicalAttachment {
  id: string; // e.g. "att-img-1725184000-xyz", "pdf-1725184000-abc", "att-aud-1725184000-mno"
  filename: string;
  kind: AttachmentKind;
  mimeType: string;
  size: number; // size in bytes
  createdAt: number;
  updatedAt: number;
  sourceNoteId?: string; // initial note where attachment was created/imported
  hash?: string; // FNV-1a or SHA checksum for duplicate detection
  dataUrl?: string; // cached data URL if stored directly (for small images/audio)

  // Kind-specific metadata
  width?: number;
  height?: number;
  duration?: number; // duration in seconds for audio
  pageCount?: number; // page count for PDF

  // Academic / Document Reference Metadata (PDFs & Documents)
  title?: string;
  author?: string;
  year?: number;
  doi?: string;
  arxivId?: string;
  url?: string;
  journal?: string;
  abstract?: string;
}

/**
 * Filter options for Media Library exploration
 */
export interface AttachmentFilter {
  query?: string;
  kind?: AttachmentKind | 'all';
  isReferenced?: 'all' | 'referenced' | 'unreferenced';
  minSize?: number; // bytes
  maxSize?: number; // bytes
  dateRange?: {
    start?: number;
    end?: number;
  };
}

export type AttachmentSortField = 'filename' | 'createdAt' | 'size' | 'refCount' | 'kind';
export type AttachmentSortOrder = 'asc' | 'desc';

/**
 * Reference location inside a vault note citing an attachment
 */
export interface AttachmentReference {
  noteId: string;
  noteTitle: string;
  line: number;
  raw: string;
  snippet?: string;
  page?: number;
  highlightId?: string;
}

/**
 * Audio Recording Lifecycle State
 */
export type AudioRecordingState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'paused'
  | 'preview'
  | 'saving'
  | 'error';

export interface AudioCapability {
  isSupported: boolean;
  supportedMimeType?: string;
  error?: string;
}

export interface AudioRecordingResult {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
  filename: string;
  attachmentId: string;
}

/**
 * View state for Media Library workspace view
 */
export interface MediaLibraryViewState {
  selectedAttachmentId: string | null;
  viewMode: 'grid' | 'list';
  filter: AttachmentFilter;
  sortField: AttachmentSortField;
  sortOrder: AttachmentSortOrder;
  previewAttachmentId: string | null;
  isRecordModalOpen: boolean;
  isUploadModalOpen: boolean;
  cleanupSelection: string[];
}
