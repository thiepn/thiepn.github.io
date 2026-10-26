import { Note } from '../types';
import {
  InferredRelation,
  SemanticSettings,
  ModelDownloadInfo,
  TokenizedDocument,
  DEFAULT_SEMANTIC_SETTINGS,
} from './semanticTypes';
import {
  computeAllLexicalRelatedness,
  computeLexicalRelatednessForDoc,
  buildLexicalIndex,
  computeNoteContentHash,
} from './lexicalRelatedness';
import {
  initEmbeddingsPipeline,
  computeAllEmbeddingRelatedness,
  clearEmbeddingCache,
} from './embeddingsEngine';
import { extractWikiLinks } from '../utils/linking';

const SETTINGS_STORAGE_KEY = 'pkm_semantic_relatedness_settings_v1';

export class SemanticManager {
  private settings: SemanticSettings = { ...DEFAULT_SEMANTIC_SETTINGS };
  private cachedDocs = new Map<string, TokenizedDocument>();
  private modelInfo: ModelDownloadInfo = {
    modelName: 'Xenova/all-MiniLM-L6-v2',
    estimatedSizeMB: 23,
    description: '384-dimensional on-device sentence embeddings running 100% locally',
    status: 'unloaded',
    progress: 0,
    device: 'wasm',
  };
  private subscribers = new Set<(info: ModelDownloadInfo) => void>();
  private settingsSubscribers = new Set<(settings: SemanticSettings) => void>();

  constructor() {
    this.loadSettings();
  }

  public getSettings(): SemanticSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<SemanticSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    this.notifySettingsSubscribers();
  }

  public subscribe(callback: (settings: SemanticSettings) => void): () => void {
    this.settingsSubscribers.add(callback);
    callback(this.settings);
    return () => {
      this.settingsSubscribers.delete(callback);
    };
  }

  private notifySettingsSubscribers() {
    for (const sub of this.settingsSubscribers) {
      sub(this.settings);
    }
  }

  public getModelInfo(): ModelDownloadInfo {
    return { ...this.modelInfo };
  }

  public onModelProgress(callback: (info: ModelDownloadInfo) => void): () => void {
    this.subscribers.add(callback);
    callback(this.modelInfo);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    for (const sub of this.subscribers) {
      sub(this.modelInfo);
    }
  }

  /**
   * Initializes and downloads the small on-device embedding model
   */
  public async enableEmbeddingsMode(): Promise<boolean> {
    const success = await initEmbeddingsPipeline((info) => {
      this.modelInfo = info;
      this.notifySubscribers();
    }, this.settings.useWebGPU);

    if (success) {
      this.updateSettings({ mode: 'embeddings', modelDownloaded: true });
    }
    return success;
  }

  /**
   * Helper to build the set of existing explicit links to avoid duplicate inferred edges
   */
  public extractExistingLinkPairs(notes: Note[]): Set<string> {
    const linkSet = new Set<string>();
    const titleToIdMap = new Map<string, string>();

    for (const n of notes) {
      titleToIdMap.set(n.title.trim().toLowerCase(), n.id);
    }

    for (const note of notes) {
      if (note.linkedNoteIds) {
        for (const targetId of note.linkedNoteIds) {
          if (targetId && targetId !== note.id) {
            linkSet.add([note.id, targetId].sort().join('---'));
          }
        }
      }

      const wikiTargets = extractWikiLinks(note.content);
      for (const target of wikiTargets) {
        let targetId: string | undefined;
        if (target.startsWith('note:')) {
          targetId = target.slice(5);
        } else {
          targetId = titleToIdMap.get(target.toLowerCase());
        }
        if (targetId && targetId !== note.id) {
          linkSet.add([note.id, targetId].sort().join('---'));
        }
      }
    }

    return linkSet;
  }

  /**
   * Computes all inferred relationships across the vault
   */
  public async computeInferredLinks(
    notes: Note[],
    customSettings?: Partial<SemanticSettings>
  ): Promise<InferredRelation[]> {
    const effectiveSettings = { ...this.settings, ...(customSettings || {}) };
    if (!effectiveSettings.enabled || notes.length < 2) return [];

    const existingLinks = this.extractExistingLinkPairs(notes);

    // Layer 2: On-device embeddings (if active and ready)
    if (effectiveSettings.mode === 'embeddings' && this.modelInfo.status === 'ready') {
      try {
        const results = await computeAllEmbeddingRelatedness(notes, effectiveSettings, existingLinks);
        return results;
      } catch (err) {
        console.warn('Embedding computation failed, falling back to lexical:', err);
      }
    }

    // Layer 1: BM25 Field-Weighted Lexical Relatedness
    return computeAllLexicalRelatedness(
      notes,
      effectiveSettings,
      existingLinks,
      this.cachedDocs
    );
  }

  /**
   * Finds related notes for a specific individual note (e.g. for Note Inspector or Sidebar)
   */
  public getSimilarNotesForNote(
    targetNoteId: string,
    notes: Note[],
    customSettings?: Partial<SemanticSettings>
  ): InferredRelation[] {
    const effectiveSettings = { ...this.settings, ...(customSettings || {}) };
    const existingLinks = this.extractExistingLinkPairs(notes);

    const index = buildLexicalIndex(notes, this.cachedDocs);
    const threshold = Math.max(0.05, Math.min(0.95, effectiveSettings.threshold));
    const maxNeighbors = Math.max(1, Math.min(10, effectiveSettings.maxNeighborsPerNode));

    return computeLexicalRelatednessForDoc(
      targetNoteId,
      index,
      threshold,
      maxNeighbors,
      existingLinks
    );
  }

  /**
   * Clears internal memory caches
   */
  public clearCache(): void {
    this.cachedDocs.clear();
    clearEmbeddingCache();
  }

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = { ...DEFAULT_SEMANTIC_SETTINGS, ...parsed };
      }
    } catch {
      this.settings = { ...DEFAULT_SEMANTIC_SETTINGS };
    }
  }

  private saveSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (err) {
      console.warn('Failed to save semantic settings to localStorage:', err);
    }
  }
}

export const semanticManager = new SemanticManager();
