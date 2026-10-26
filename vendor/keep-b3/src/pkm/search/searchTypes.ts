import { Note, Folder } from '../../types';

export type SearchMode = 'hybrid' | 'exact' | 'semantic';

export interface SearchChunk {
  id: string; // `${noteId}#chunk-${index}`
  noteId: string;
  heading?: string; // e.g. "## Symptoms"
  headingLevel?: number;
  text: string;
  charStart: number;
  charEnd: number;
  hash: string; // Deterministic content hash for diffing
  tokenCount?: number;
}

export interface VectorRecord {
  id: string; // chunkId or noteId
  noteId: string;
  chunkId: string;
  hash: string;
  vector: number[] | Float32Array;
  modelId: string;
  heading?: string;
  charStart: number;
  charEnd: number;
  updatedAt: string;
}

export interface HighlightRange {
  start: number;
  end: number;
}

export interface LexicalHit {
  noteId: string;
  chunkId?: string;
  score: number; // BM25 / lexical score
  matchedFields: Array<'title' | 'heading' | 'tag' | 'alias' | 'content' | 'property'>;
  exactTitleMatch: boolean;
  exactPhraseMatch: boolean;
  matchedHeading?: string;
  matchedTags: string[];
  excerpt: string;
  highlightRanges: HighlightRange[];
}

export interface SemanticHit {
  noteId: string;
  chunkId: string;
  score: number; // Cosine similarity (0.0 to 1.0)
  heading?: string;
  chunkText: string;
  excerpt: string;
}

export interface HybridSearchResult {
  noteId: string;
  note: Note;
  folderName?: string;
  combinedScore: number;
  rrfScore: number;
  lexicalScore?: number;
  semanticScore?: number;
  lexicalRank?: number;
  semanticRank?: number;
  matchMode: 'exact' | 'semantic' | 'hybrid';
  primaryHitType: 'exact_title' | 'exact_phrase' | 'lexical' | 'semantic' | 'hybrid';
  topExcerpt: string;
  matchedHeading?: string;
  matchedTags: string[];
  highlightRanges: HighlightRange[];
}

export interface SemanticModelStatus {
  state: 'unloaded' | 'downloading' | 'ready' | 'error' | 'disabled';
  modelId: string;
  version: string;
  dimensions: number;
  progress: number;
  estimatedSizeMB: number;
  device: 'webgpu' | 'wasm' | 'cpu';
  error?: string;
  indexedNotesCount: number;
  totalNotesCount: number;
  indexedChunksCount: number;
  isIndexing: boolean;
  lastIndexedAt?: string;
}

export interface SearchFilterOptions {
  mode?: SearchMode;
  folderId?: string | null;
  tag?: string;
  includeArchived?: boolean;
  includeTrashed?: boolean;
  limit?: number;
  threshold?: number; // Minimum semantic similarity (default 0.35)
}

export interface SemanticSearchSettings {
  enabled: boolean;
  modelId: string;
  preferWebGPU: boolean;
  autoIndexOnSave: boolean;
  rrfConstantK: number; // Default 60
  titleBoost: number; // Default 3.0
  phraseBoost: number; // Default 1.8
  minSemanticThreshold: number; // Default 0.35
  maxSearchResults: number; // Default 30
}

export const DEFAULT_SEMANTIC_SEARCH_SETTINGS: SemanticSearchSettings = {
  enabled: true,
  modelId: 'Xenova/all-MiniLM-L6-v2',
  preferWebGPU: true,
  autoIndexOnSave: true,
  rrfConstantK: 60,
  titleBoost: 3.0,
  phraseBoost: 1.8,
  minSemanticThreshold: 0.35,
  maxSearchResults: 30,
};
