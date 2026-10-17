import { Note, Folder, AppSettings, ViewMode } from '../../types';
import { WorkspaceSurfaceType } from '../workspaceTypes';
import { ContextDescriptor } from '../context/contextTypes';

/**
 * High-level Navigable Resource Types across the PKM Personal Operating System
 */
export type NavigableResourceType =
  | 'note'
  | 'folder'
  | 'tag'
  | 'smart-view'
  | 'saved-search'
  | 'pdf'
  | 'canvas'
  | 'collection'
  | 'dashboard'
  | 'person'
  | 'project'
  | 'goal'
  | 'area'
  | 'routine'
  | 'course'
  | 'skill'
  | 'exam-prep'
  | 'library-item'
  | 'reference'
  | 'trip'
  | 'asset'
  | 'decision'
  | 'context-root'
  | 'universal-inbox';

/**
 * Universal Resource Descriptor for centralized routing
 */
export interface ResourceDescriptor {
  type: NavigableResourceType;
  id: string;
  title: string;
  subtitle?: string;
  iconName?: string;
  folderId?: string | null;
  tags?: string[];
  subpath?: {
    type: 'heading' | 'block' | 'pdf-page' | 'pdf-highlight' | 'canvas-viewport' | 'canvas-node';
    value: string | number;
    title?: string;
  };
  contextId?: string;
  isFavorite?: boolean;
  isLocked?: boolean;
  lastModified?: number;
  metadata?: Record<string, any>;
}

export interface NavOpenTargetOptions {
  paneId?: string;
  splitOrientation?: 'horizontal' | 'vertical';
  replaceCurrentTab?: boolean;
  viewState?: Record<string, any>;
  highlightId?: string;
  page?: number;
  subpath?: {
    type: 'heading' | 'block' | 'pdf-page' | 'pdf-highlight' | 'canvas-viewport' | 'canvas-node';
    value: string | number;
    title?: string;
  };
}

/**
 * Quick Switcher Item definition
 */
export interface QuickSwitcherItem {
  id: string;
  resourceType: NavigableResourceType;
  title: string;
  canonicalTitle: string;
  aliases?: string[];
  tags?: string[];
  subtitle?: string;
  iconName?: string;
  isFavorite?: boolean;
  isRecent?: boolean;
  lastAccessedAt?: number;
  contextTag?: string;
  folderPath?: string;
  score?: number;
  matchType?: 'exact-title' | 'exact-alias' | 'prefix-title' | 'fuzzy-title' | 'context' | 'favorite' | 'recent' | 'general';
}

/**
 * Search State preservation record
 */
export interface SearchNavigationState {
  query: string;
  mode?: 'all' | 'notes' | 'files' | 'tasks' | 'people' | 'other';
  filters?: {
    tags?: string[];
    folderId?: string | null;
    status?: string;
    priority?: string;
    dateRange?: { start?: string; end?: string };
  };
  selectedResultId?: string;
  scrollPosition?: number;
  resultCount?: number;
  timestamp: number;
}

/**
 * Heading / Block Navigation targets
 */
export interface HeadingJumpTarget {
  headingText: string;
  level: number;
  lineIndex: number;
  slug: string;
}

export interface BlockJumpTarget {
  blockId: string;
  lineIndex: number;
  content: string;
}

export interface HeadingResolutionResult {
  status: 'exact' | 'fuzzy_renamed' | 'missing';
  requestedHeading: string;
  resolvedHeading?: string;
  resolvedLineIndex?: number;
  nearbySuggestions?: string[];
}

/**
 * In-Note Find State
 */
export interface InNoteFindMatch {
  index: number;
  lineIndex: number;
  charStart: number;
  charEnd: number;
  text: string;
  isFolded?: boolean;
  sectionId?: string;
}

export interface InNoteFindState {
  query: string;
  matches: InNoteFindMatch[];
  activeMatchIndex: number;
  caseSensitive: boolean;
}

/**
 * Backlinks & Mention Structures
 */
export interface LinkedMention {
  id: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
  sourceType?: NavigableResourceType;
  targetRaw: string;
  headingTarget?: string;
  blockTarget?: string;
  surroundingExcerpt: string;
  lineIndex: number;
  isExplicitWikilink: boolean;
  isRelationField?: boolean;
  relationType?: string;
  updatedAt: number;
}

export interface NavUnlinkedMentionCandidate {
  id: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
  matchedText: string;
  canonicalTargetTitle: string;
  targetNoteId: string;
  surroundingExcerpt: string;
  lineIndex: number;
  charIndex: number;
  confidence: number;
}

export type BacklinkSortOption = 'relevance' | 'modified' | 'title';

export interface BacklinkGroup {
  sourceNoteId: string;
  sourceNoteTitle: string;
  folderPath?: string;
  updatedAt: number;
  mentions: LinkedMention[];
}

/**
 * Broken Links Audit & Repair
 */
export interface BrokenLinkItem {
  id: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
  rawTarget: string;
  brokenType: 'missing_note' | 'missing_heading' | 'missing_block' | 'invalid_alias';
  targetNoteTitle?: string;
  targetNoteId?: string;
  targetSubpath?: string;
  lineIndex: number;
  contextExcerpt: string;
  candidateResolutions?: Array<{
    noteId: string;
    title: string;
    reason: string;
  }>;
}

export interface LinkRepairAction {
  brokenLinkId: string;
  action: 'create_note' | 'redirect_to_existing' | 'remove_link';
  targetNoteTitle?: string;
  targetNoteId?: string;
  newHeadingTarget?: string;
}

/**
 * Link Previews (Peek)
 */
export interface LinkPreviewData {
  resourceType: NavigableResourceType;
  resourceId: string;
  title: string;
  subtitle?: string;
  properties?: Record<string, any>;
  tags?: string[];
  firstExcerpt?: string;
  isEncryptedOrLocked?: boolean;
  folderPath?: string;
  lastModified?: number;
  subpathTitle?: string;
  subpathContent?: string;
}

export interface LinkPreviewRequest {
  targetRaw: string;
  currentNoteId?: string;
  mousePosition?: { x: number; y: number };
  anchorElement?: HTMLElement;
}

/**
 * Device-Local Navigation History Entry
 */
export interface NavigationHistoryEntry {
  id: string;
  resourceType: NavigableResourceType;
  resourceId: string;
  title: string;
  subpath?: {
    type: 'heading' | 'block' | 'pdf-page' | 'pdf-highlight' | 'canvas-viewport' | 'canvas-node';
    value: string | number;
    title?: string;
  };
  scrollOffset?: number;
  pdfPage?: number;
  canvasViewport?: { x: number; y: number; zoom: number };
  searchState?: SearchNavigationState;
  contextId?: string;
  timestamp: number;
}

/**
 * Truthful Canonical Breadcrumb Item
 */
export interface CanonicalBreadcrumbItem {
  id: string;
  label: string;
  type: 'root' | 'folder' | 'container' | 'context' | 'resource' | 'subpath';
  resourceType?: NavigableResourceType;
  resourceId?: string;
  isClickable: boolean;
  isActive: boolean;
}

/**
 * Note Inspector Organization Data
 */
export interface NoteInspectionData {
  noteId: string;
  title: string;
  folderPath: string;
  tags: string[];
  properties: Record<string, any>;
  wordCount: number;
  characterCount: number;
  readingTimeMinutes: number;
  headingsCount: number;
  outgoingLinksCount: number;
  backlinksCount: number;
  tasksCount: { total: number; completed: number };
  relations: Array<{ type: string; targetId: string; targetTitle: string }>;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isFavorite: boolean;
  isLocked: boolean;
}

/**
 * Research Citation Provenance
 */
export interface CitationProvenanceItem {
  citeKey: string;
  referenceId?: string;
  referenceTitle: string;
  authors?: string[];
  year?: number;
  pdfId?: string;
  pdfTitle?: string;
  pdfPage?: number;
  pdfHighlightId?: string;
  highlightText?: string;
}

/**
 * Graph Navigation & Connection List alternative
 */
export interface AccessibleGraphConnection {
  nodeId: string;
  title: string;
  resourceType: NavigableResourceType;
  connectionType: 'wikilink' | 'backlink' | 'relation' | 'citation' | 'tag' | 'inferred';
  relationLabel?: string;
  folderPath?: string;
}

/**
 * Navigation Diagnostics Report
 */
export interface NavigationDiagnosticReport {
  timestamp: number;
  status: 'healthy' | 'warnings' | 'issues';
  duplicateTitles: Array<{ title: string; noteIds: string[] }>;
  brokenWikilinks: BrokenLinkItem[];
  missingHeadings: BrokenLinkItem[];
  missingBlocks: BrokenLinkItem[];
  invalidAliasTargets: Array<{ alias: string; targetId: string }>;
  staleBacklinkCount: number;
  brokenSavedViews: Array<{ viewId: string; title: string; missingField: string }>;
  brokenFavorites: Array<{ resourceType: string; resourceId: string }>;
  duplicateResourceIds: string[];
  historyEntriesCount: number;
  totalChecks: number;
}
