import { Note, Folder } from '../../types';
import {
  HybridSearchResult,
  SearchFilterOptions,
  SemanticSearchSettings,
  DEFAULT_SEMANTIC_SEARCH_SETTINGS,
  SemanticModelStatus,
} from './searchTypes';
import { intelligentChunkNote } from './chunker';
import { vectorStore } from './vectorStore';
import { semanticWorkerBridge } from './semanticWorkerBridge';
import {
  executeLexicalSearch,
  executeSemanticVectorSearch,
  fuseHybridSearchResults,
} from './hybridEngine';

const SETTINGS_KEY = 'keep_semantic_search_settings';

class SemanticSearchService {
  private settings: SemanticSearchSettings = { ...DEFAULT_SEMANTIC_SEARCH_SETTINGS };
  private indexingQueue: Set<string> = new Set();
  private isProcessingQueue = false;
  private isIndexingVault = false;
  private lastIndexedTime: string | undefined = undefined;

  constructor() {
    this.loadSettings();
  }

  public getSettings(): SemanticSearchSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<SemanticSearchSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
  }

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SEMANTIC_SEARCH_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.warn('Failed to load semantic search settings from localStorage:', err);
    }
  }

  private saveSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (err) {
      console.warn('Failed to save semantic search settings to localStorage:', err);
    }
  }

  public getModelStatus(): SemanticModelStatus {
    const bridgeStatus = semanticWorkerBridge.getStatus();
    return {
      ...bridgeStatus,
      state: !this.settings.enabled ? 'disabled' : bridgeStatus.state,
      isIndexing: this.isIndexingVault || this.isProcessingQueue,
      lastIndexedAt: this.lastIndexedTime,
    };
  }

  public onStatusChange(callback: (status: SemanticModelStatus) => void): () => void {
    return semanticWorkerBridge.onStatusChange((bridgeStatus) => {
      callback({
        ...bridgeStatus,
        state: !this.settings.enabled ? 'disabled' : bridgeStatus.state,
        isIndexing: this.isIndexingVault || this.isProcessingQueue,
        lastIndexedAt: this.lastIndexedTime,
      });
    });
  }

  /**
   * Warm up model in background if enabled
   */
  public async initializeModel(): Promise<boolean> {
    if (!this.settings.enabled) return false;
    return semanticWorkerBridge.ensureModelReady(this.settings.preferWebGPU);
  }

  /**
   * Incremental index update when a single note is created or modified
   */
  public async onNoteSaved(note: Note): Promise<void> {
    if (!this.settings.enabled || !this.settings.autoIndexOnSave || note.trashed) return;

    try {
      const chunks = intelligentChunkNote(note);
      const existingHashes = await vectorStore.getStoredHashesForNote(note.id);

      const chunksToEmbed = chunks.filter((c) => existingHashes.get(c.id) !== c.hash);
      const currentChunkIds = new Set(chunks.map((c) => c.id));

      // Remove obsolete chunks
      for (const oldChunkId of existingHashes.keys()) {
        if (!currentChunkIds.has(oldChunkId)) {
          await vectorStore.deleteVector(oldChunkId);
        }
      }

      // If new or modified chunks exist, compute embeddings and persist
      if (chunksToEmbed.length > 0) {
        const newVectors = await semanticWorkerBridge.embedChunksBatch(chunksToEmbed);
        if (newVectors.length > 0) {
          await vectorStore.saveVectorsBatch(newVectors);
        }
      }
      this.lastIndexedTime = new Date().toISOString();
    } catch (err) {
      console.warn(`Error incrementally indexing note ${note.id}:`, err);
    }
  }

  /**
   * Remove note vectors when a note is deleted or trashed
   */
  public async onNoteDeleted(noteId: string): Promise<void> {
    try {
      await vectorStore.deleteVectorsForNote(noteId);
    } catch (err) {
      console.warn(`Error removing vectors for deleted note ${noteId}:`, err);
    }
  }

  /**
   * Full vault indexation with progress reporting and differential skipping
   */
  public async indexEntireVault(
    notes: Note[],
    onProgress?: (indexed: number, total: number) => void
  ): Promise<{ indexedNotes: number; generatedVectors: number }> {
    if (!this.settings.enabled) {
      return { indexedNotes: 0, generatedVectors: 0 };
    }

    this.isIndexingVault = true;
    const ready = await semanticWorkerBridge.ensureModelReady(this.settings.preferWebGPU);
    if (!ready) {
      this.isIndexingVault = false;
      return { indexedNotes: 0, generatedVectors: 0 };
    }

    const validNotes = notes.filter((n) => !n.trashed);
    let totalGenerated = 0;
    let processedNotes = 0;

    try {
      for (const note of validNotes) {
        const chunks = intelligentChunkNote(note);
        const existingHashes = await vectorStore.getStoredHashesForNote(note.id);

        const chunksToEmbed = chunks.filter((c) => existingHashes.get(c.id) !== c.hash);
        const currentChunkIds = new Set(chunks.map((c) => c.id));

        for (const oldChunkId of existingHashes.keys()) {
          if (!currentChunkIds.has(oldChunkId)) {
            await vectorStore.deleteVector(oldChunkId);
          }
        }

        if (chunksToEmbed.length > 0) {
          const newVectors = await semanticWorkerBridge.embedChunksBatch(chunksToEmbed);
          if (newVectors.length > 0) {
            await vectorStore.saveVectorsBatch(newVectors);
            totalGenerated += newVectors.length;
          }
        }

        processedNotes++;
        if (onProgress) {
          onProgress(processedNotes, validNotes.length);
        }
      }

      this.lastIndexedTime = new Date().toISOString();
    } finally {
      this.isIndexingVault = false;
    }

    return { indexedNotes: processedNotes, generatedVectors: totalGenerated };
  }

  /**
   * Clear all local vector embeddings
   */
  public async clearVectorIndex(): Promise<void> {
    await vectorStore.clearAllVectors();
    semanticWorkerBridge.clearMemoryCache();
    this.lastIndexedTime = undefined;
  }

  /**
   * Execute Hybrid / Lexical / Semantic search
   */
  public async search(
    query: string,
    notes: Note[],
    folders: Folder[],
    options?: SearchFilterOptions
  ): Promise<HybridSearchResult[]> {
    const trimmedQuery = (query || '').trim();
    const mode = options?.mode || (this.settings.enabled ? 'hybrid' : 'exact');
    const notesMap = new Map<string, Note>();
    for (const n of notes) {
      notesMap.set(n.id, n);
    }
    const foldersMap = new Map<string, Folder>();
    for (const f of folders) {
      foldersMap.set(f.id, f);
    }

    if (!trimmedQuery) {
      // Return recent notes if no query
      const validNotes = notes
        .filter((n) => !n.trashed && (options?.includeArchived || !n.archived))
        .slice(0, options?.limit || 20);

      return validNotes.map((note) => {
        const folder = note.folderId ? foldersMap.get(note.folderId) : undefined;
        return {
          noteId: note.id,
          note,
          folderName: folder?.name,
          combinedScore: 1.0,
          rrfScore: 1.0,
          matchMode: 'exact',
          primaryHitType: 'lexical',
          topExcerpt: (note.content || '').slice(0, 140),
          matchedTags: [],
          highlightRanges: [],
        };
      });
    }

    // 1. Lexical BM25 Search
    const lexicalHits = executeLexicalSearch(trimmedQuery, notes, options);

    // If exact search only, or semantic disabled, fuse lexical directly
    if (mode === 'exact' || !this.settings.enabled) {
      return fuseHybridSearchResults(lexicalHits, [], notesMap, foldersMap, trimmedQuery, {
        mode: 'exact',
        rrfK: this.settings.rrfConstantK,
        titleBoost: this.settings.titleBoost,
        limit: options?.limit || this.settings.maxSearchResults,
      });
    }

    // 2. Semantic Search
    let semanticHits: any[] = [];
    try {
      const queryVector = await semanticWorkerBridge.embedQuery(trimmedQuery);
      if (queryVector) {
        const allVectors = await vectorStore.getAllVectors();
        if (allVectors.length > 0) {
          semanticHits = executeSemanticVectorSearch(
            queryVector,
            allVectors,
            notesMap,
            options
          );
        }
      }
    } catch (err) {
      console.warn('Semantic vector search failed, falling back to lexical search:', err);
    }

    // 3. Reciprocal Rank Fusion
    return fuseHybridSearchResults(
      lexicalHits,
      semanticHits,
      notesMap,
      foldersMap,
      trimmedQuery,
      {
        mode,
        rrfK: this.settings.rrfConstantK,
        titleBoost: this.settings.titleBoost,
        limit: options?.limit || this.settings.maxSearchResults,
      }
    );
  }

  /**
   * Finds semantically similar notes for a target note
   */
  public async findSimilarNotes(
    targetNote: Note,
    allNotes: Note[],
    limit = 5,
    threshold = 0.4
  ): Promise<Array<{ note: Note; similarity: number; rationale: string }>> {
    const text = [targetNote.title, targetNote.content.slice(0, 500)].filter(Boolean).join('\n');
    const vec = await semanticWorkerBridge.embedQuery(text);
    if (!vec) return [];

    const notesMap = new Map(allNotes.map((n) => [n.id, n]));
    const allVectors = await vectorStore.getAllVectors();

    const hits = executeSemanticVectorSearch(
      vec,
      allVectors.filter((v) => v.noteId !== targetNote.id),
      notesMap,
      { threshold }
    );

    return hits.slice(0, limit).map((h) => {
      const note = notesMap.get(h.noteId)!;
      return {
        note,
        similarity: Math.round(h.score * 100) / 100,
        rationale: `Semantic match (${Math.round(h.score * 100)}%)`,
      };
    });
  }
}

export const semanticSearchService = new SemanticSearchService();
