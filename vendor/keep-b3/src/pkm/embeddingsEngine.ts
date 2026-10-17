import { Note } from '../types';
import {
  InferredRelation,
  ModelDownloadInfo,
  SemanticSettings,
} from './semanticTypes';
import { computeNoteContentHash } from './lexicalRelatedness';

const DEFAULT_MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const ESTIMATED_SIZE_MB = 23; // Quantized ONNX weights ~23MB

// In-memory cache for computed note vector embeddings (hash -> Float32Array)
const vectorCache = new Map<string, Float32Array>();

// Pipeline instance holder
type FeatureExtractionPipeline = (
  text: string | string[],
  options?: { pooling?: 'mean' | 'cls'; normalize?: boolean }
) => Promise<{ data: Float32Array }>;

let pipelineInstance: FeatureExtractionPipeline | null = null;
let isInitializing = false;
let currentDevice: 'webgpu' | 'wasm' | 'cpu' = 'wasm';

export interface EmbeddingProgressCallback {
  (info: ModelDownloadInfo): void;
}

/**
 * Checks if browser supports WebGPU
 */
export async function isWebGPUSupported(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  try {
    const adapter = await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
    return Boolean(adapter);
  } catch {
    return false;
  }
}

/**
 * Initializes and downloads the small on-device Transformers.js model
 * strictly on-demand when the user chooses to enable Advanced Semantic mode.
 */
export async function initEmbeddingsPipeline(
  onProgress?: EmbeddingProgressCallback,
  preferWebGPU = true
): Promise<boolean> {
  if (pipelineInstance) {
    if (onProgress) {
      onProgress({
        modelName: DEFAULT_MODEL_NAME,
        estimatedSizeMB: ESTIMATED_SIZE_MB,
        description: '384-dimensional sentence embeddings running 100% locally in browser',
        status: 'ready',
        progress: 100,
        device: currentDevice,
      });
    }
    return true;
  }

  if (isInitializing) return false;
  isInitializing = true;

  try {
    if (onProgress) {
      onProgress({
        modelName: DEFAULT_MODEL_NAME,
        estimatedSizeMB: ESTIMATED_SIZE_MB,
        description: '384-dimensional sentence embeddings running 100% locally in browser',
        status: 'downloading',
        progress: 10,
        device: currentDevice,
      });
    }

    // Dynamic import to prevent bundling into main entry point
    const { pipeline, env } = await import('@xenova/transformers');

    // Configure caching & local execution
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    // Device selection
    const hasWebGPU = preferWebGPU && (await isWebGPUSupported());
    currentDevice = hasWebGPU ? 'webgpu' : 'wasm';

    if (onProgress) {
      onProgress({
        modelName: DEFAULT_MODEL_NAME,
        estimatedSizeMB: ESTIMATED_SIZE_MB,
        description: 'Loading model weights into browser memory...',
        status: 'downloading',
        progress: 40,
        device: currentDevice,
      });
    }

    const extractor = await pipeline('feature-extraction', DEFAULT_MODEL_NAME, {
      progress_callback: (p: { status: string; progress?: number }) => {
        if (onProgress && p.progress !== undefined) {
          onProgress({
            modelName: DEFAULT_MODEL_NAME,
            estimatedSizeMB: ESTIMATED_SIZE_MB,
            description: `Downloading weights: ${Math.round(p.progress)}%`,
            status: 'downloading',
            progress: Math.min(95, Math.max(10, Math.round(p.progress))),
            device: currentDevice,
          });
        }
      },
    });

    pipelineInstance = extractor as unknown as FeatureExtractionPipeline;
    isInitializing = false;

    if (onProgress) {
      onProgress({
        modelName: DEFAULT_MODEL_NAME,
        estimatedSizeMB: ESTIMATED_SIZE_MB,
        description: 'On-device embeddings ready',
        status: 'ready',
        progress: 100,
        device: currentDevice,
      });
    }

    return true;
  } catch (err) {
    console.warn('Failed to load on-device embedding model:', err);
    isInitializing = false;
    if (onProgress) {
      onProgress({
        modelName: DEFAULT_MODEL_NAME,
        estimatedSizeMB: ESTIMATED_SIZE_MB,
        description: 'Failed to download/initialize model',
        status: 'error',
        progress: 0,
        error: err instanceof Error ? err.message : String(err),
        device: currentDevice,
      });
    }
    return false;
  }
}

/**
 * Calculates cosine similarity between two normalized vectors
 */
export function calculateCosineSimilarity(
  a: Float32Array | number[],
  b: Float32Array | number[]
): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.min(1.0, Math.max(0.0, sim));
}

export const cosineSimilarity = calculateCosineSimilarity;

/**
 * Generates an embedding vector for a note
 */
export async function getNoteEmbedding(note: Partial<Note> & { id?: string; title?: string; content?: string }): Promise<Float32Array | null> {
  const hash = computeNoteContentHash(note);
  const cached = vectorCache.get(hash);
  if (cached) return cached;

  if (!pipelineInstance) return null;

  try {
    // Prepare semantic text representation emphasizing title & tags
    const tags = note.tags || [];
    const textToEmbed = [
      note.title ? `Title: ${note.title}` : '',
      tags.length > 0 ? `Tags: ${tags.join(', ')}` : '',
      (note.content || '').slice(0, 800), // Clip to first 800 chars for speed & 512-token context window
    ]
      .filter(Boolean)
      .join('\n');

    const output = await pipelineInstance(textToEmbed, {
      pooling: 'mean',
      normalize: true,
    });

    const vec = new Float32Array(output.data);
    vectorCache.set(hash, vec);
    return vec;
  } catch (err) {
    console.warn(`Failed to generate embedding for note ${note.id}:`, err);
    return null;
  }
}

/**
 * Computes semantic relations using vector cosine similarity
 */
export async function computeAllEmbeddingRelatedness(
  notes: Note[],
  settings: SemanticSettings,
  existingLinkPairs: Set<string>
): Promise<InferredRelation[]> {
  if (!pipelineInstance || !settings.enabled || notes.length < 2) return [];

  const validNotes = notes.filter((n) => !n.trashed);
  const embeddings = new Map<string, Float32Array>();

  // Extract embeddings for all notes (using cached when available)
  for (const note of validNotes) {
    const vec = await getNoteEmbedding(note);
    if (vec) {
      embeddings.set(note.id, vec);
    }
  }

  const relationsMap = new Map<string, InferredRelation>();
  const threshold = Math.max(0.1, Math.min(0.95, settings.threshold));
  const maxNeighbors = Math.max(1, Math.min(10, settings.maxNeighborsPerNode));

  const noteList = Array.from(embeddings.entries());

  for (let i = 0; i < noteList.length; i++) {
    const [sourceId, sourceVec] = noteList[i];
    const candidateMatches: Array<{ targetId: string; score: number }> = [];

    for (let j = 0; j < noteList.length; j++) {
      if (i === j) continue;
      const [targetId, targetVec] = noteList[j];

      const linkKey = [sourceId, targetId].sort().join('---');
      if (existingLinkPairs.has(linkKey)) continue;

      const score = calculateCosineSimilarity(sourceVec, targetVec);
      if (score >= threshold) {
        candidateMatches.push({ targetId, score });
      }
    }

    candidateMatches.sort((a, b) => b.score - a.score);
    const topMatches = candidateMatches.slice(0, maxNeighbors);

    for (const match of topMatches) {
      const pairKey = [sourceId, match.targetId].sort().join('---');
      const roundedScore = Math.round(match.score * 100) / 100;
      relationsMap.set(pairKey, {
        sourceId,
        targetId: match.targetId,
        score: roundedScore,
        mode: 'embeddings',
        rationale: `Semantic vector similarity (${Math.round(roundedScore * 100)}%)`,
      });
    }
  }

  return Array.from(relationsMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * Resets vector cache (useful for testing or cache invalidation)
 */
export function clearEmbeddingCache(): void {
  vectorCache.clear();
}
