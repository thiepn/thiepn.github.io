export interface PDFHighlightAnchor {
  // Normalized bounding boxes [0..1] relative to the page dimensions
  rects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  // Context snippet for robust re-anchoring
  textPrefix?: string;
  textSuffix?: string;
  textExact?: string;
  pageIndex?: number;
  charOffset?: number;
  charLength?: number;
}

export type PDFHighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface PDFAnnotation {
  id: string; // e.g. "ann-1725184000-xyz"
  pdfId?: string; // Attachment ID
  pdfAttachmentId?: string;
  page: number; // 1-indexed page number
  text: string; // Selected text content
  color: PDFHighlightColor;
  note?: string; // Optional user marginalia / note
  anchor: PDFHighlightAnchor;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

export interface PDFAttachment {
  id: string; // e.g. "pdf-1725184000-abc"
  name: string; // e.g. "attention-is-all-you-need.pdf"
  fileName?: string;
  title?: string; // Document title or extracted title
  author?: string; // Extracted author metadata
  size: number; // File size in bytes
  pageCount: number;
  createdAt: string; // ISO timestamp
  updatedAt?: string;
  associatedNoteIds?: string[]; // Notes referencing this PDF
  dataBlob?: Blob; // In-memory / IndexedDB blob
  year?: number;
  doi?: string;
  arxivId?: string;
  url?: string;
}

export interface PDFCitationReference {
  pdfId: string;
  page: number;
  highlightId?: string;
  displayTitle?: string;
  quote?: string;
}

export interface PDFSearchMatch {
  pageIndex: number;
  matchIndex: number;
  text: string;
  matchLength: number;
}
