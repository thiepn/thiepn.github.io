import { Note, Folder } from '../types';
import { VaultIndex, ParsedNote } from './types';
import { buildVaultIndex, applyIncrementalNoteUpdate } from './vaultIndex';
import { parseNote } from './parser';
import { PKMWorkerRequest, PKMWorkerResponse } from './worker';
import { SemanticSettings, InferredRelation } from './semanticTypes';
import {
  computeAllLexicalRelatedness,
  computeLexicalRelatednessForDoc,
  buildLexicalIndex,
} from './lexicalRelatedness';
import { CanvasBoard } from './canvasTypes';
import { PDFAttachment } from './pdfTypes';
import { runFullVaultDiagnostics } from './vaultDoctor';
import { VaultDiagnosticsReport } from './doctorTypes';
import { detectVaultDuplicates } from './intelligence/duplicateDetector';
import { suggestTagsForNote } from './intelligence/tagRecommender';
import { detectMOCClusters } from './intelligence/mocDetector';
import { suggestOrphanConnections } from './intelligence/orphanAdvisor';
import {
  DuplicateCandidatePair,
  DuplicateGroup,
  TagSuggestion,
  MOCClusterSuggestion,
  OrphanConnectionSuggestion,
} from './intelligence/intelligenceTypes';

class PKMWorkerBridge {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: unknown) => void; reject: (err: Error) => void; timeout: ReturnType<typeof setTimeout> }
  >();
  private requestCounter = 0;
  private workerDisabled = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      this.workerDisabled = true;
      return;
    }

    try {
      // Vite worker import syntax
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (event: MessageEvent<PKMWorkerResponse>) => {
        const res = event.data;
        if (!res || !res.id) return;

        const pending = this.pendingRequests.get(res.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(res.id);

          if (res.type === 'SUCCESS') {
            pending.resolve(res.result);
          } else if (res.type === 'CANCELED') {
            pending.reject(new Error('Request canceled'));
          } else {
            pending.reject(new Error(res.error));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.warn('PKM Worker error, falling back to main-thread processing:', err);
        this.workerDisabled = true;
        this.terminate();
      };
    } catch (err) {
      console.warn('Unable to initialize PKM Web Worker, using main-thread fallback:', err);
      this.workerDisabled = true;
    }
  }

  public sendRequest<T>(type: PKMWorkerRequest['type'], payload: unknown): { promise: Promise<T>; requestId: string } {
    const id = `req-${++this.requestCounter}-${Date.now()}`;

    if (this.workerDisabled || !this.worker) {
      // Direct main thread execution
      const promise = this.executeOnMainThread<T>(type, payload);
      return { promise, requestId: id };
    }

    const promise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        console.warn(`PKM Worker request ${type} timed out, falling back to main thread`);
        this.executeOnMainThread<T>(type, payload).then(resolve).catch(reject);
      }, 5000);

      this.pendingRequests.set(id, {
        resolve: resolve as (val: unknown) => void,
        reject,
        timeout,
      });

      this.worker!.postMessage({ id, type, payload });
    });

    return { promise, requestId: id };
  }

  public cancelRequest(requestId: string): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      pending.reject(new Error('Request canceled'));
    }
    if (this.worker && !this.workerDisabled) {
      this.worker.postMessage({
        id: `cancel-${Date.now()}`,
        type: 'CANCEL_REQUEST',
        payload: { targetRequestId: requestId },
      });
    }
  }

  private async executeOnMainThread<T>(type: PKMWorkerRequest['type'], payload: unknown): Promise<T> {
    switch (type) {
      case 'REBUILD_INDEX': {
        const p = payload as { notes: Note[] };
        return buildVaultIndex(p.notes) as unknown as T;
      }
      case 'PARSE_NOTE': {
        const p = payload as { note: Note };
        return parseNote(p.note) as unknown as T;
      }
      case 'INCREMENTAL_UPDATE': {
        const p = payload as { note: Note | null; noteId: string; currentIndex: VaultIndex };
        return applyIncrementalNoteUpdate(p.note, p.noteId, p.currentIndex) as unknown as T;
      }
      case 'COMPUTE_LEXICAL_RELATEDNESS': {
        const p = payload as { notes: Note[]; settings: SemanticSettings; existingLinkPairs: string[] };
        const existingLinks = new Set<string>(p.existingLinkPairs || []);
        return computeAllLexicalRelatedness(p.notes, p.settings, existingLinks) as unknown as T;
      }
      case 'COMPUTE_NOTE_SIMILARITY': {
        const p = payload as {
          targetNoteId: string;
          notes: Note[];
          settings: SemanticSettings;
          existingLinkPairs: string[];
        };
        const existingLinks = new Set<string>(p.existingLinkPairs || []);
        const index = buildLexicalIndex(p.notes);
        return computeLexicalRelatednessForDoc(
          p.targetNoteId,
          index,
          p.settings.threshold,
          p.settings.maxNeighborsPerNode,
          existingLinks
        ) as unknown as T;
      }
      case 'COMPUTE_DUPLICATES': {
        const p = payload as { notes: Note[]; options?: { similarityThreshold?: number; ignoredPairs?: string[] } };
        return detectVaultDuplicates(p.notes, undefined, p.options) as unknown as T;
      }
      case 'COMPUTE_TAG_SUGGESTIONS': {
        const p = payload as { note: Note; notes: Note[]; dismissedTags?: string[] };
        return suggestTagsForNote(p.note, p.notes, undefined, { dismissedTags: p.dismissedTags }) as unknown as T;
      }
      case 'DETECT_MOC_CLUSTERS': {
        const p = payload as { notes: Note[]; options?: { minClusterSize?: number; maxClusterSize?: number; dismissedClusters?: string[] } };
        return detectMOCClusters(p.notes, undefined, p.options) as unknown as T;
      }
      case 'SUGGEST_ORPHAN_CONNECTIONS': {
        const p = payload as { orphanNoteId: string; notes: Note[]; limit?: number; dismissedTargets?: string[] };
        return suggestOrphanConnections(p.orphanNoteId, p.notes, undefined, {
          limit: p.limit,
          dismissedTargets: p.dismissedTargets,
        }) as unknown as T;
      }
      case 'RUN_VAULT_DIAGNOSTICS': {
        const p = payload as {
          notes: Note[];
          folders: Folder[];
          canvasBoards: CanvasBoard[];
          pdfAttachments: PDFAttachment[];
        };
        return (await runFullVaultDiagnostics(
          p.notes,
          p.folders,
          p.canvasBoards,
          p.pdfAttachments
        )) as unknown as T;
      }
      default:
        throw new Error(`Unknown request type: ${type}`);
    }
  }

  /**
   * Rebuild index in background worker (or fallback)
   */
  public async rebuildIndex(notes: Note[]): Promise<VaultIndex> {
    const { promise } = this.sendRequest<VaultIndex>('REBUILD_INDEX', { notes });
    return promise;
  }

  /**
   * Run full vault diagnostics in background worker
   */
  public async runVaultDiagnostics(
    notes: Note[],
    folders: Folder[],
    canvasBoards: CanvasBoard[],
    pdfAttachments: PDFAttachment[]
  ): Promise<VaultDiagnosticsReport> {
    const { promise } = this.sendRequest<VaultDiagnosticsReport>('RUN_VAULT_DIAGNOSTICS', {
      notes,
      folders,
      canvasBoards,
      pdfAttachments,
    });
    return promise;
  }

  /**
   * Parse single note in background worker
   */
  public async parseNote(note: Note): Promise<ParsedNote> {
    const { promise } = this.sendRequest<ParsedNote>('PARSE_NOTE', { note });
    return promise;
  }

  /**
   * Compute lexical relatedness in background worker
   */
  public async computeLexicalRelatedness(
    notes: Note[],
    settings: SemanticSettings,
    existingLinkPairs: string[]
  ): Promise<InferredRelation[]> {
    const { promise } = this.sendRequest<InferredRelation[]>('COMPUTE_LEXICAL_RELATEDNESS', {
      notes,
      settings,
      existingLinkPairs,
    });
    return promise;
  }

  /**
   * Compute duplicate candidates in background worker
   */
  public async computeDuplicates(
    notes: Note[],
    options?: { similarityThreshold?: number; ignoredPairs?: string[] }
  ): Promise<{ pairs: DuplicateCandidatePair[]; groups: DuplicateGroup[] }> {
    const { promise } = this.sendRequest<{ pairs: DuplicateCandidatePair[]; groups: DuplicateGroup[] }>(
      'COMPUTE_DUPLICATES',
      { notes, options }
    );
    return promise;
  }

  /**
   * Compute tag suggestions in background worker
   */
  public async computeTagSuggestions(
    note: Note,
    notes: Note[],
    dismissedTags?: string[]
  ): Promise<TagSuggestion[]> {
    const { promise } = this.sendRequest<TagSuggestion[]>('COMPUTE_TAG_SUGGESTIONS', {
      note,
      notes,
      dismissedTags,
    });
    return promise;
  }

  /**
   * Detect MOC clusters in background worker
   */
  public async detectMOCClusters(
    notes: Note[],
    options?: { minClusterSize?: number; maxClusterSize?: number; dismissedClusters?: string[] }
  ): Promise<MOCClusterSuggestion[]> {
    const { promise } = this.sendRequest<MOCClusterSuggestion[]>('DETECT_MOC_CLUSTERS', {
      notes,
      options,
    });
    return promise;
  }

  /**
   * Suggest orphan connections in background worker
   */
  public async suggestOrphanConnections(
    orphanNoteId: string,
    notes: Note[],
    limit?: number,
    dismissedTargets?: string[]
  ): Promise<OrphanConnectionSuggestion[]> {
    const { promise } = this.sendRequest<OrphanConnectionSuggestion[]>('SUGGEST_ORPHAN_CONNECTIONS', {
      orphanNoteId,
      notes,
      limit,
      dismissedTargets,
    });
    return promise;
  }

  /**
   * Terminate worker instance
   */
  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();
  }
}

export const pkmWorkerBridge = new PKMWorkerBridge();
