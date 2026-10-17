/**
 * Phase P52 — Reading, Books, Articles, Media & Knowledge Library
 *
 * Core type definitions for Library Items, Formats, Lifecycles, Progress Modes,
 * Reading Cycles, Unified Source Highlights, Locators, Reading Sessions, and Extraction.
 */

export type LibraryItemType =
  | 'book'
  | 'article'
  | 'essay'
  | 'paper'
  | 'video'
  | 'podcast'
  | 'audiobook'
  | 'web'
  | 'other';

export type LibraryFormat =
  | 'physical'
  | 'epub'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'web'
  | 'other';

export type LibraryStatus =
  | 'inbox'
  | 'queued'
  | 'in-progress'
  | 'paused'
  | 'finished'
  | 'reference'
  | 'archived'
  | 'abandoned';

export type CreatorRole =
  | 'author'
  | 'editor'
  | 'translator'
  | 'host'
  | 'speaker'
  | 'director'
  | 'creator';

export interface LibraryCreator {
  name: string;
  role?: CreatorRole;
  personNoteId?: string; // Optional link to a P48 Person Note
}

export type ProgressMode = 'page' | 'percentage' | 'time' | 'location' | 'none';

export interface LibraryProgress {
  mode: ProgressMode;
  currentPage?: number;
  totalPages?: number;
  percent?: number; // 0 - 100
  currentSeconds?: number;
  totalSeconds?: number;
  location?: string; // e.g. "Chapter 4", CFI locator, or textual anchor
  updatedAt: number;
}

export interface ConsumptionCycle {
  id: string;
  cycleNumber: number;
  startedAt?: string; // YYYY-MM-DD
  finishedAt?: string; // YYYY-MM-DD
  progress?: LibraryProgress;
  note?: string;
}

export interface LibraryMetadata {
  isbn?: string; // ISBN-10 or ISBN-13
  doi?: string; // Digital Object Identifier
  publisher?: string;
  publicationDate?: string; // YYYY, YYYY-MM, or YYYY-MM-DD
  edition?: string;
  language?: string;
  pageCount?: number;
  durationSeconds?: number;
  genre?: string[];
  tags?: string[];
  rating?: number; // Optional 1-5 user rating
  priority?: 'low' | 'medium' | 'high';
  customFields?: Record<string, string>;
}

export interface LibraryRelations {
  courseIds?: string[]; // Links to P51 Courses
  skillIds?: string[]; // Links to P51 Skills
  projectIds?: string[]; // Links to P49 Projects
  goalIds?: string[]; // Links to P49 Goals
  areaIds?: string[]; // Links to P49 Areas
  personIds?: string[]; // Links to P48 People
  organizationIds?: string[]; // Links to P48 Organizations
}

/**
 * 1. CANONICAL STRUCTURED LIBRARY ITEM
 */
export interface LibraryItem {
  id: string; // Stable internal ID e.g. "lib-1725184000-xyz"
  type: LibraryItemType;
  title: string;
  subtitle?: string;
  creators: LibraryCreator[];
  status: LibraryStatus;
  format?: LibraryFormat;

  noteId?: string; // Canonical Markdown note ID
  attachmentIds?: string[]; // P26 attachment IDs (EPUB, PDF, audio, media)
  referenceId?: string; // P35 academic Reference ID if scholarly
  sourceUrl?: string; // Original URL
  coverAttachmentId?: string; // Cover image attachment ID in P26
  coverUrl?: string; // Safe data/blob URL or cover link

  metadata?: LibraryMetadata;
  progress?: LibraryProgress;

  // Reading cycles for rereads
  currentCycle?: ConsumptionCycle;
  cycles?: ConsumptionCycle[];

  // Relations to other PKM domains
  relations?: LibraryRelations;

  createdAt: number;
  updatedAt: number;
}

/**
 * 2. UNIFIED SOURCE HIGHLIGHT & LOCATOR
 */
export type HighlightSourceType = 'pdf' | 'epub' | 'web' | 'manual' | 'audio' | 'video';

export interface SourceLocator {
  page?: number;
  totalPages?: number;
  cfi?: string; // EPUB CFI or chapter locator
  chapter?: string;
  timestampSeconds?: number;
  timestampFormatted?: string; // e.g. "01:24:31"
  pdfAnnotationId?: string; // Direct link to P26 PDF annotation
  webUrl?: string;
  locationText?: string; // e.g. "p. 142", "Chapter 3, §2"
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export type HighlightProcessingStatus = 'unprocessed' | 'extracted' | 'ignored';

export interface SourceHighlight {
  id: string; // Stable highlight ID e.g. "hl-1725184000-xyz"
  libraryItemId: string;
  sourceType: HighlightSourceType;
  text: string; // Exact quote / excerpt
  locator: SourceLocator;
  annotation?: string; // User-authored note/comment
  color?: HighlightColor;
  tags?: string[];
  status?: HighlightProcessingStatus;
  extractedNoteId?: string; // If extracted to canonical note
  createdAt: number;
  updatedAt: number;
}

/**
 * 3. READING & MEDIA CONSUMPTION SESSION
 */
export interface ReadingSession {
  id: string; // Stable session ID e.g. "rs-1725184000-xyz"
  libraryItemId: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  progressDelta?: number; // e.g. +30 pages or +15%
  progressUnit?: 'pages' | 'minutes' | 'percent';
  note?: string;
  cycleId?: string;
  courseId?: string; // Optional P51 Course link
  habitId?: string; // Optional P50 Habit link
  createdAt: number;
  updatedAt: number;
}

/**
 * Filter & Sort Options for Workspace Views
 */
export interface LibraryFilter {
  query?: string;
  type?: LibraryItemType | 'all';
  status?: LibraryStatus | 'all';
  format?: LibraryFormat | 'all';
  creator?: string;
  courseId?: string;
  goalId?: string;
  projectId?: string;
  tag?: string;
  hasNote?: boolean;
  hasFile?: boolean;
  hasHighlights?: boolean;
}

export type LibrarySortField =
  | 'title'
  | 'creator'
  | 'added'
  | 'updated'
  | 'status'
  | 'progress'
  | 'finishedDate'
  | 'publicationDate'
  | 'rating';

export type LibrarySortDirection = 'asc' | 'desc';

export interface LibraryDuplicateCandidate {
  primaryId: string;
  duplicateId: string;
  primaryTitle: string;
  duplicateTitle: string;
  reason: 'isbn' | 'doi' | 'url' | 'reference' | 'file_hash' | 'title_creator';
  similarityScore: number;
}
