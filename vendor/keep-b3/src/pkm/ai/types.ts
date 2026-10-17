import { Note, Folder, SavedSearch } from '../../types';
import { PDFAttachment } from '../pdfTypes';

/**
 * Supported AI operational modes
 */
export type AIMode = 'disabled' | 'local' | 'external';

/**
 * Grounded mode options
 */
export type AIGroundedMode = 'vault_only' | 'vault_plus_general';

/**
 * External provider types
 */
export type ExternalProviderType =
  | 'openai-compatible'
  | 'openrouter'
  | 'gemini'
  | 'anthropic'
  | 'custom';

/**
 * Local model status
 */
export type LocalModelStatus = 'not-downloaded' | 'downloading' | 'ready' | 'error';

/**
 * Local model definition and hardware telemetry
 */
export interface LocalModelInfo {
  id: string;
  name: string;
  version: string;
  downloadSizeMB: number;
  installedSizeMB: number;
  contextLength: number;
  requiresWebGPU: boolean;
  isWebGPUSupported: boolean;
  status: LocalModelStatus;
  downloadProgress: number; // 0 to 100
  downloadError?: string;
  lastUsedAt?: number;
}

/**
 * External provider configuration
 */
export interface ExternalProviderConfig {
  providerType: ExternalProviderType;
  endpointUrl: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  hasKeyConfigured: boolean;
  dataDisclosureAccepted: boolean;
  customHeaders?: Record<string, string>;
}

/**
 * Exclusion rules for RAG
 */
export interface AIExclusionRules {
  excludedFolderIds: string[];
  excludedTags: string[];
  excludedNoteIds: string[];
  excludeTrash: boolean;
  excludeTemplates: boolean;
  excludeDailyNotesByDefault: boolean;
}

/**
 * AI System Settings
 */
export interface AISettings {
  mode: AIMode;
  groundedModeDefault: AIGroundedMode;
  persistConversations: boolean;
  saveConversationEncrypted: boolean;
  localModel: LocalModelInfo;
  externalProvider: ExternalProviderConfig;
  exclusions: AIExclusionRules;
  customSystemInstructions?: string;
  retrievalTopK: number;
  contextBudgetTokens: number;
  enableSecretScannerWarning: boolean;
}

/**
 * Target Scope for AI Reasoning & Retrieval
 */
export type AIScopeType =
  | 'current_note'
  | 'selected_text'
  | 'selected_notes'
  | 'folder'
  | 'smart_view'
  | 'moc'
  | 'references'
  | 'search_results'
  | 'entire_vault';

export interface AIScope {
  type: AIScopeType;
  label: string;
  currentNoteId?: string;
  selectedText?: string;
  selectedNoteIds?: string[];
  folderId?: string;
  folderName?: string;
  viewId?: string;
  viewName?: string;
  mocId?: string;
  mocName?: string;
  referenceIds?: string[];
  searchQuery?: string;
}

/**
 * Scope inspection summary
 */
export interface AIScopeSummary {
  scope: AIScope;
  totalNotesInScope: number;
  totalChunksInScope: number;
  excludedNotesCount: number;
  totalEstimatedTokens: number;
  sampleNoteTitles: string[];
}

/**
 * Indexed RAG Chunk
 */
export type AIChunkType = 'heading_section' | 'paragraph' | 'reference_abstract' | 'pdf_highlight';

export interface AIChunk {
  id: string; // e.g. `${noteId}#h:${headingSlug}` or `${noteId}#p:${index}`
  noteId: string;
  noteTitle: string;
  folderId?: string;
  headingText?: string;
  headingId?: string;
  blockId?: string;
  content: string;
  contentHash: string;
  charStart: number;
  charEnd: number;
  type: AIChunkType;
  score?: number; // Hybrid score
  tokenEstimate: number;
  metadata?: Record<string, any>;
}

/**
 * Source Context passed to Model
 */
export interface AISourceContext {
  markerId: string; // e.g. 'SOURCE_1', 'SOURCE_2'
  markerNumber: number; // 1, 2, 3
  chunk: AIChunk;
  tokenEstimate: number;
  isRedacted?: boolean;
}

/**
 * Verified Source Citation
 */
export interface AICitation {
  markerNumber: number; // 1, 2, ...
  markerId: string; // 'SOURCE_1'
  noteId: string;
  noteTitle: string;
  headingId?: string;
  headingText?: string;
  blockId?: string;
  quoteExcerpt?: string;
  isVerified: boolean;
  sourceContentHash: string;
  isStale?: boolean;
}

/**
 * AI Proposed Bounded Action
 */
export type AIProposalType =
  | 'replace_selection'
  | 'insert_below'
  | 'create_note'
  | 'add_tags'
  | 'add_wikilinks'
  | 'create_review_card';

export interface AIDiffChunk {
  type: 'unchanged' | 'added' | 'removed';
  value: string;
}

export interface AIProposedAction {
  id: string;
  type: AIProposalType;
  title: string;
  description: string;
  targetNoteId?: string;
  expectedNoteVersion?: string | number; // note.updatedAt or content hash
  sourceRange?: { start: number; end: number };
  originalText?: string;
  proposedText: string;
  proposedTitle?: string;
  proposedFolderId?: string;
  proposedTags?: string[];
  proposedLinks?: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'stale';
  diff?: AIDiffChunk[];
  staleReason?: string;
}

/**
 * Chat Message in Knowledge Copilot
 */
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: AICitation[];
  sources: AISourceContext[];
  proposedActions?: AIProposedAction[];
  mode: AIMode;
  providerName?: string;
  modelName?: string;
  timestamp: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  groundedMode: AIGroundedMode;
  isPartial?: boolean;
  error?: string;
  scopeSummary?: string;
}

/**
 * AI Conversation Model
 */
export interface AIConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  isTemporary: boolean;
  scope: AIScope;
  groundedMode: AIGroundedMode;
  messages: AIChatMessage[];
}

/**
 * Contextual Writing Commands
 */
export type AIWritingCommandType =
  | 'summarize'
  | 'explain'
  | 'rewrite'
  | 'shorten'
  | 'expand'
  | 'outline'
  | 'compare'
  | 'synthesize'
  | 'custom';

export interface AIWritingRequest {
  command: AIWritingCommandType;
  customPrompt?: string;
  targetNoteId: string;
  selectedText?: string;
  noteContent?: string;
  noteVersion?: number;
  scope?: AIScope;
  rewriteTone?: 'clear' | 'academic' | 'concise' | 'technical';
}

/**
 * Default AI Settings
 */
export const DEFAULT_AI_SETTINGS: AISettings = {
  mode: 'local', // 100% Offline Local Engine
  groundedModeDefault: 'vault_only',
  persistConversations: true,
  saveConversationEncrypted: true,
  localModel: {
    id: 'keepnotes-local-sm-v1',
    name: 'KeepNotes Local Assistant (On-Device Vault Search & RAG)',
    version: '1.2.0',
    downloadSizeMB: 0,
    installedSizeMB: 0,
    contextLength: 4096,
    requiresWebGPU: false,
    isWebGPUSupported: false,
    status: 'ready',
    downloadProgress: 100,
  },
  externalProvider: {
    providerType: 'custom',
    endpointUrl: '',
    modelId: 'local-vault-indexer',
    temperature: 0.2,
    maxTokens: 2048,
    hasKeyConfigured: false,
    dataDisclosureAccepted: false,
  },
  exclusions: {
    excludedFolderIds: [],
    excludedTags: ['private', 'confidential', 'secret'],
    excludedNoteIds: [],
    excludeTrash: true,
    excludeTemplates: true,
    excludeDailyNotesByDefault: false,
  },
  retrievalTopK: 8,
  contextBudgetTokens: 3500,
  enableSecretScannerWarning: true,
};
