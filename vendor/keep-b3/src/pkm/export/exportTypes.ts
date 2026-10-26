/**
 * PKM V1.8: Sharing, Publishing, Export & Interoperability Architecture
 * Core Type Definitions
 */

import { Note, Folder, AppSettings, SavedSearch } from '../../types';
import { Reference } from '../reference/referenceTypes';
import { PersonRecord } from '../people/peopleTypes';
import { TemporalEntry } from '../temporal/temporalTypes';
import { FinanceTransaction, FinanceAccount } from '../finance/financeTypes';
import { CanvasBoard } from '../canvasTypes';
import { PDFAttachment } from '../pdfTypes';

export type ExportPipelineStage =
  | 'select'
  | 'scope'
  | 'privacy'
  | 'dependency'
  | 'transform'
  | 'validate'
  | 'package'
  | 'destination'
  | 'report';

export type ExportScopeType =
  | 'current-note'
  | 'selected-notes'
  | 'folder'
  | 'saved-view'
  | 'collection'
  | 'project'
  | 'course'
  | 'library'
  | 'domain-records'
  | 'full-vault';

export type ExportFormat =
  | 'portable-markdown'
  | 'native-markdown'
  | 'standalone-html'
  | 'static-site'
  | 'data-csv'
  | 'data-json'
  | 'bibtex'
  | 'vcard'
  | 'ics'
  | 'config-package'
  | 'full-portable-vault';

export type ExportPrivacyLevel = 'strict-clean' | 'redacted' | 'full-unredacted';

export type LinkRewriteMode =
  | 'relative-markdown'    // [[Target]] -> [Target](./Target.md) if in scope
  | 'preserve-wikilinks'   // [[Target]] -> [[Target]] (Native mode)
  | 'plain-text'           // [[Target]] -> Target (no links)
  | 'anchor-links';        // [[Target]] -> <a href="#target"> (Single HTML doc)

export interface ExportScopeConfig {
  scopeType: ExportScopeType;
  primaryNoteIds: string[];
  folderId?: string | null;
  savedViewId?: string;
  collectionId?: string;
  domain?: string;
  includeDescendants?: boolean;
  includeAttachments: boolean;
  attachmentTypes?: Array<'images' | 'audio' | 'pdfs' | 'all'>;
  includeReferences: boolean;
  propertyAllowlist?: string[];
  excludeTags: string[];
  hidePrivateTags: boolean;
  maskSensitiveData: boolean;
  linkRewriteMode: LinkRewriteMode;
  includeBacklinks: boolean;
  includeTableOfContents: boolean;
  includeBibliography: boolean;
  theme: 'light' | 'dark' | 'sepia' | 'system';
  basePath?: string;
  siteTitle?: string;
}

export interface PrivacyFinding {
  id: string;
  noteId?: string;
  noteTitle?: string;
  type: 'api-key' | 'secret-token' | 'private-tag' | 'credit-card' | 'ssn' | 'account-number' | 'unselected-relation' | 'sensitive-health';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  snippet?: string;
  line?: number;
  autoRemediated: boolean;
}

export interface ExportDependencyItem {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'audio' | 'linked-note' | 'citation' | 'canvas';
  sourcePath?: string;
  targetPath: string;
  inScope: boolean;
  isPrivate: boolean;
  sizeBytes?: number;
}

export interface ExportFileEntry {
  path: string;
  content: string | Uint8Array;
  isBinary: boolean;
  sizeBytes?: number;
  checksum?: string;
  mimeType?: string;
}

export interface ExportValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  privacyFindings: PrivacyFinding[];
  totalNotes: number;
  totalAssets: number;
  totalDependencies: number;
  missingDependencies: string[];
  brokenInternalLinks: string[];
  excludedPrivateRelations: string[];
  generatedAt: string;
  checksum: string;
}

export interface ExportPipelineProgress {
  stage: ExportPipelineStage;
  percentage: number;
  message: string;
  currentItem?: string;
}

export type ExportProgressCallback = (progress: ExportPipelineProgress) => void;

export interface ExportPipelineResult {
  success: boolean;
  format: ExportFormat;
  files: ExportFileEntry[];
  validation: ExportValidationReport;
  zipBlob?: Blob;
  primaryFileName?: string;
  primaryFileContent?: string;
  executionTimeMs: number;
  cancellationToken?: { isCancelled: boolean };
}

export interface ExportProfile {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  defaultScope: ExportScopeType;
  config: Partial<ExportScopeConfig>;
  isBuiltin: boolean;
}

export interface InterchangeMatrixEntry {
  sourceDomain: string;
  exportFormats: ExportFormat[];
  humanReadable: boolean;
  machineReadable: boolean;
  dependenciesPreserved: boolean;
  privacyDefault: 'Excluded' | 'Stripped' | 'Opt-in';
  leaveTheAppUsability: 'Zero-loss' | 'High' | 'Structured';
  standardSpecification?: string;
  description: string;
}
