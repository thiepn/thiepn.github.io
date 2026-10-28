import { Note } from '../../types';
import { SearchChunk, VectorRecord, SemanticModelStatus } from './searchTypes';
import {
  initEmbeddingsPipeline,
  getNoteEmbedding,
  EmbeddingProgressCallback,
  isWebGPUSupported,
} from '../embeddingsEngine';
import { computeStringHash } from './chunker';

const DEFAULT_MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const ESTIMATED_SIZE_MB = 23;

// In-memory embedding cache for chunk text -> Float32Array (avoid re-computing identical text)
const textVectorCache = new Map<string, Float32Array>();

class SemanticWorkerBridge {
  private isInitialized = false;
  private isInitializing = false;
  private currentDevice: 'webgpu' | 'wasm' | 'cpu' = 'wasm';
  private modelStatusListeners = new Set<(status: SemanticModelStatus) => void>();

  private status: SemanticModelStatus = {
    state: 'unloaded',
    modelId: DEFAULT_MODEL_NAME,
    version: '1.0.0',
    dimensions: 384,
    progress: 0,
    estimatedSizeMB: ESTIMATED_SIZE_MB,
    device: 'wasm',
    indexedNotesCount: 0,
    totalNotesCount: 0,
    indexedChunksCount: 0,
    isIndexing: false,
  };

  constructor() {
    this.detectDevice();
  }

  private async detectDevice() {
    try {
      const hasWebGPU = await isWebGPUSupported();
      this.currentDevice = hasWebGPU ? 'webgpu' : 'wasm';
      this.status.device = this.currentDevice;
    } catch {
      this.currentDevice = 'wasm';
    }
  }

  public getStatus(): SemanticModelStatus {
    return { ...this.status };
  }

  public onStatusChange(listener: (status: SemanticModelStatus) => void): () => void {
    this.modelStatusListeners.add(listener);
    listener(this.getStatus());
    return () => this.modelStatusListeners.delete(listener);
  }

  private notifyStatus(update: Partial<SemanticModelStatus>) {
    this.status = { ...this.status, ...update };
    for (const listener of this.modelStatusListeners) {
      try {
        listener(this.getStatus());
      } catch (err) {
        console.warn('Error in status listener:', err);
      }
    }
  }

  /**
   * Initializes the on-device transformer model on demand
   */
  public async ensureModelReady(preferWebGPU = true): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.isInitializing) {
      // Wait for initialization
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!this.isInitializing) {
            clearInterval(interval);
            resolve(this.isInitialized);
          }
        }, 100);
      });
    }

    this.isInitializing = true;
    this.notifyStatus({ state: 'downloading', progress: 10 });

    try {
      const success = await initEmbeddingsPipeline(
        (info) => {
          this.notifyStatus({
            state: info.status,
            progress: info.progress,
            device: info.device,
            error: info.error,
          });
        },
        preferWebGPU
      );

      this.isInitialized = success;
      this.isInitializing = false;

      if (success) {
        this.notifyStatus({ state: 'ready', progress: 100, error: undefined });
      } else {
        this.notifyStatus({ state: 'error', error: 'Failed to initialize model' });
      }

      return success;
    } catch (err: any) {
      this.isInitializing = false;
      this.isInitialized = false;
      this.notifyStatus({
        state: 'error',
        error: err?.message || String(err),
      });
      return false;
    }
  }

  /**
   * Computes embedding vector for a single query or text snippet
   */
  public async embedQuery(queryText: string): Promise<Float32Array | null> {
    if (!queryText.trim()) return null;
    const cacheKey = computeStringHash(queryText.trim().toLowerCase());
    const cached = textVectorCache.get(cacheKey);
    if (cached) return cached;

    const ready = await this.ensureModelReady();
    if (!ready) return null;

    try {
      // Create a dummy note structure to leverage getNoteEmbedding or direct pipeline
      const dummyNote: Note = {
        id: 'query-temp',
        title: queryText,
        content: queryText,
        type: 'text',
        tags: [],
        checklist: [],
        color: 'default',
        pinned: false,
        archived: false,
        trashed: false,
        folderId: null,
        createdAt: '',
        updatedAt: '',
        reminderDate: null,
        images: [],
      };

      const vec = await getNoteEmbedding(dummyNote);
      if (vec) {
        textVectorCache.set(cacheKey, vec);
      }
      return vec;
    } catch (err) {
      console.warn('Error generating query embedding:', err);
      return null;
    }
  }

  /**
   * Computes embedding vectors for a batch of search chunks incrementally
   */
  public async embedChunksBatch(
    chunks: SearchChunk[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<VectorRecord[]> {
    if (chunks.length === 0) return [];

    const ready = await this.ensureModelReady();
    if (!ready) return [];

    const records: VectorRecord[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const cacheKey = chunk.hash;
      let vec = textVectorCache.get(cacheKey);

      if (!vec) {
        // Construct clean text representation for embedding
        const textToEmbed = chunk.heading
          ? `${chunk.heading}\n${chunk.text.slice(0, 600)}`
          : chunk.text.slice(0, 600);

        const dummyNote: Note = {
          id: chunk.id,
          title: chunk.heading || '',
          content: textToEmbed,
          type: 'text',
          tags: [],
          checklist: [],
          color: 'default',
          pinned: false,
          archived: false,
          trashed: false,
          folderId: null,
          createdAt: '',
          updatedAt: '',
          reminderDate: null,
          images: [],
        };

        const computedVec = await getNoteEmbedding(dummyNote);
        if (computedVec) {
          vec = computedVec;
          textVectorCache.set(cacheKey, vec);
        }
      }

      if (vec) {
        records.push({
          id: chunk.id,
          noteId: chunk.noteId,
          chunkId: chunk.id,
          hash: chunk.hash,
          vector: Array.from(vec),
          modelId: DEFAULT_MODEL_NAME,
          heading: chunk.heading,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          updatedAt: now,
        });
      }

      if (onProgress && (i % 4 === 0 || i === chunks.length - 1)) {
        onProgress(i + 1, chunks.length);
      }
    }

    return records;
  }

  /**
   * Clear in-memory caches
   */
  public clearMemoryCache(): void {
    textVectorCache.clear();
  }
}

export const semanticWorkerBridge = new SemanticWorkerBridge();
