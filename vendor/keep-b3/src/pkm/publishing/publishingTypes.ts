/**
 * PKM Phase P39: Publishing, Export & Static Site Generation Types
 */

import { Note, Folder } from '../../types';
import { VaultIndex } from '../types';

export type PublicationSourceType =
  | 'single-note'
  | 'selected-notes'
  | 'folder'
  | 'saved-view'
  | 'moc'
  | 'all-notes';

export type LinkExpansionMode = 'never' | 'one-level' | 'recursive';

export type PublicationFormat = 'static-site' | 'single-html' | 'markdown-package';

export type PublicationTheme = 'light' | 'dark' | 'auto' | 'sepia';

export interface PublicationSource {
  type: PublicationSourceType;
  /** Primary single note or root note */
  noteId?: string;
  /** Explicitly selected notes for 'selected-notes' */
  noteIds?: string[];
  /** Folder ID for 'folder' source */
  folderId?: string | null;
  /** Whether to recurse into subfolders */
  includeSubfolders?: boolean;
  /** Saved view ID for 'saved-view' source */
  savedViewId?: string;
  /** Root MOC note ID for 'moc' source */
  mocNoteId?: string;
  /** How to follow internal links to include connected notes */
  includeLinkedNotes?: LinkExpansionMode;
  /** Exclude notes with frontmatter publish: false or status: draft */
  excludeDrafts?: boolean;
  /** Exclude notes matching any of these tags */
  excludeTags?: string[];
  /** Exclude daily notes unless explicitly selected */
  excludeDailyNotes?: boolean;
  /** Exclude template notes */
  excludeTemplates?: boolean;
  /** Exclude archived notes */
  excludeArchived?: boolean;
}

export interface PublicationOutputConfig {
  format: PublicationFormat;
  theme: PublicationTheme;
  basePath: string; // e.g. '/' or '/my-docs/' for subpath hosting
  siteTitle: string;
  siteDescription?: string;
  author?: string;
  favicon?: string;
  language?: string;
  noindex?: boolean;
  customCss?: string;
  /** User-defined slug overrides: noteId -> customSlug */
  customSlugOverrides?: Record<string, string>;
}

export interface PublicationOptions {
  includeBacklinks: boolean;
  includeStaticSearch: boolean;
  includeTableOfContents: boolean;
  includeBibliography: boolean;
  /** Property keys to expose in published header/badges (e.g. ['author', 'date', 'tags']) */
  propertyAllowlist: string[];
  stripImageMetadata: boolean;
  packageMedia: boolean;
  enableSitemap: boolean;
  enableRss: boolean;
  strictMode: boolean; // Fail build if validation errors exist
  hidePrivateTags: boolean; // Strips internal '#' tags matching excludeTags from rendered content
}

export interface PublicationBuildSummary {
  buildId: string;
  timestamp: string;
  pageCount: number;
  assetCount: number;
  totalBytes: number;
  checksum: string;
  warningsCount: number;
  errorsCount: number;
  pages: Array<{
    noteId: string;
    title: string;
    slug: string;
    path: string;
    byteSize: number;
  }>;
}

export interface Publication {
  id: string;
  name: string;
  description?: string;
  homeNoteId?: string;
  source: PublicationSource;
  output: PublicationOutputConfig;
  options: PublicationOptions;
  createdAt: string;
  updatedAt: string;
  lastBuiltAt?: string;
  lastBuildSummary?: PublicationBuildSummary;
}

export type PublicationDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface PublicationDiagnosticIssue {
  id: string;
  code:
    | 'EMPTY_PUBLICATION'
    | 'MISSING_HOME_NOTE'
    | 'UNPUBLISHED_INTERNAL_LINK'
    | 'BROKEN_TRANSCLUSION'
    | 'TRANSCLUSION_CYCLE'
    | 'MISSING_ATTACHMENT'
    | 'SENSITIVE_DAILY_NOTE_INCLUDED'
    | 'TEMPLATE_NOTE_INCLUDED'
    | 'TRASHED_NOTE_INCLUDED'
    | 'UNALLOWLISTED_PRIVATE_PROPERTIES'
    | 'SLUG_COLLISION'
    | 'ENCRYPTED_VAULT_PLAINTEXT_WARNING'
    | 'CIRCULAR_MOC_TREE';
  severity: PublicationDiagnosticSeverity;
  title: string;
  message: string;
  noteId?: string;
  noteTitle?: string;
  target?: string;
  autoFixable?: boolean;
  suggestedAction?: string;
}

export interface PublicationValidationReport {
  isValid: boolean;
  canBuild: boolean;
  issues: PublicationDiagnosticIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  resolvedNoteCount: number;
  dependentNoteCount: number;
  isEncryptedVault: boolean;
}

export interface VirtualFile {
  path: string;
  content: string | Uint8Array;
  mimeType: string;
  isBinary: boolean;
}

export interface PublicationBuildResult {
  success: boolean;
  summary: PublicationBuildSummary;
  files: VirtualFile[];
  validationReport: PublicationValidationReport;
  zipBlob?: Blob;
  previewHtml?: string;
}

export interface ResolvedPublicationSnapshot {
  publication: Publication;
  primaryNotes: Note[]; // Notes that get their own published pages
  embeddedNotes: Note[]; // Notes only needed for transclusions
  allPublishedNotes: Note[]; // primaryNotes + embeddedNotes
  allPublishedNoteIds: Set<string>;
  slugMap: Map<string, string>; // noteId -> slug
  noteById: Map<string, Note>;
  homeNote?: Note;
  referencedAssets: Set<string>;
  referencedCitations: Set<string>;
  vaultIndex: VaultIndex;
}
