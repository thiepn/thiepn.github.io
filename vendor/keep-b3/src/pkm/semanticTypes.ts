export type RelatednessMode = 'lexical' | 'embeddings';

export interface InferredRelation {
  sourceId: string;
  targetId: string;
  score: number; // 0.0 to 1.0 (normalized percentage)
  mode: RelatednessMode;
  sharedTerms?: string[]; // Top shared key terms / concepts (for lexical mode)
  rationale?: string; // Human-readable explanation of why these notes are related
}

export interface SemanticSettings {
  enabled: boolean; // Whether to compute and render inferred relatedness edges
  mode: RelatednessMode; // 'lexical' (BM25) vs 'embeddings' (Transformers.js)
  threshold: number; // Minimum similarity score (0.1 to 0.9, default 0.30)
  maxNeighborsPerNode: number; // Maximum inferred neighbors per note (1 to 8, default 3)
  useWebGPU: boolean; // Whether to attempt WebGPU for on-device embeddings
  embeddingsModelName: string; // Model identifier (e.g. 'Xenova/all-MiniLM-L6-v2')
  modelDownloaded: boolean; // Whether user has consented and model is cached locally
}

export interface ModelDownloadInfo {
  modelName: string;
  estimatedSizeMB: number;
  description: string;
  status: 'unloaded' | 'downloading' | 'ready' | 'error' | 'disabled';
  progress: number; // 0 to 100
  error?: string;
  device?: 'webgpu' | 'wasm' | 'cpu';
}

export type EmbeddingProgress = ModelDownloadInfo;

export interface TokenizedDocument {
  noteId: string;
  contentHash: string;
  titleTokens: Map<string, number>;
  aliasTokens: Map<string, number>;
  tagTokens: Map<string, number>;
  headingTokens: Map<string, number>;
  bodyTokens: Map<string, number>;
  allWeightedTokens: Map<string, number>;
  docLength: number; // Weighted document length
}

export interface LexicalIndex {
  documents: Record<string, TokenizedDocument>;
  invertedIndex: Record<string, Array<{ noteId: string; weightedTf: number }>>;
  avgDocLength: number;
  totalDocs: number;
  docFrequencies: Record<string, number>;
}

export const DEFAULT_SEMANTIC_SETTINGS: SemanticSettings = {
  enabled: true,
  mode: 'lexical',
  threshold: 0.30,
  maxNeighborsPerNode: 3,
  useWebGPU: true,
  embeddingsModelName: 'Xenova/all-MiniLM-L6-v2',
  modelDownloaded: false,
};
