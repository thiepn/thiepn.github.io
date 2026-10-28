import { Note, Folder } from '../types';
import { buildVaultIndex, applyIncrementalNoteUpdate } from './vaultIndex';
import { parseNote } from './parser';
import { VaultIndex, ParsedNote } from './types';
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

export type PKMWorkerRequest =
  | { id: string; type: 'REBUILD_INDEX'; payload: { notes: Note[] } }
  | { id: string; type: 'PARSE_NOTE'; payload: { note: Note } }
  | {
      id: string;
      type: 'INCREMENTAL_UPDATE';
      payload: { note: Note | null; noteId: string; currentIndex: VaultIndex };
    }
  | {
      id: string;
      type: 'COMPUTE_LEXICAL_RELATEDNESS';
      payload: { notes: Note[]; settings: SemanticSettings; existingLinkPairs: string[] };
    }
  | {
      id: string;
      type: 'COMPUTE_NOTE_SIMILARITY';
      payload: {
        targetNoteId: string;
        notes: Note[];
        settings: SemanticSettings;
        existingLinkPairs: string[];
      };
    }
  | {
      id: string;
      type: 'COMPUTE_DUPLICATES';
      payload: { notes: Note[]; options?: { similarityThreshold?: number; ignoredPairs?: string[] } };
    }
  | {
      id: string;
      type: 'COMPUTE_TAG_SUGGESTIONS';
      payload: { note: Note; notes: Note[]; dismissedTags?: string[] };
    }
  | {
      id: string;
      type: 'DETECT_MOC_CLUSTERS';
      payload: { notes: Note[]; options?: { minClusterSize?: number; maxClusterSize?: number; dismissedClusters?: string[] } };
    }
  | {
      id: string;
      type: 'SUGGEST_ORPHAN_CONNECTIONS';
      payload: { orphanNoteId: string; notes: Note[]; limit?: number; dismissedTargets?: string[] };
    }
  | {
      id: string;
      type: 'RUN_VAULT_DIAGNOSTICS';
      payload: {
        notes: Note[];
        folders: Folder[];
        canvasBoards: CanvasBoard[];
        pdfAttachments: PDFAttachment[];
      };
    }
  | { id: string; type: 'CANCEL_REQUEST'; payload: { targetRequestId: string } };

export type PKMWorkerResponse =
  | { id: string; type: 'SUCCESS'; result: unknown }
  | { id: string; type: 'ERROR'; error: string }
  | { id: string; type: 'CANCELED' };

const canceledRequests = new Set<string>();

// Only attach self message listener if in Web Worker context
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.onmessage = async (event: MessageEvent<PKMWorkerRequest>) => {
    const request = event.data;
    if (!request || !request.id || !request.type) return;

    const requestId = request.id;

    if (request.type === 'CANCEL_REQUEST') {
      canceledRequests.add(request.payload.targetRequestId);
      self.postMessage({ id: requestId, type: 'SUCCESS', result: true });
      return;
    }

    if (canceledRequests.has(requestId)) {
      canceledRequests.delete(requestId);
      self.postMessage({ id: requestId, type: 'CANCELED' });
      return;
    }

    try {
      switch (request.type) {
        case 'REBUILD_INDEX': {
          const index = buildVaultIndex(request.payload.notes);
          if (canceledRequests.has(requestId)) {
            canceledRequests.delete(requestId);
            self.postMessage({ id: requestId, type: 'CANCELED' });
            return;
          }
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: index };
          self.postMessage(response);
          break;
        }
        case 'PARSE_NOTE': {
          const parsed = parseNote(request.payload.note);
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: parsed };
          self.postMessage(response);
          break;
        }
        case 'INCREMENTAL_UPDATE': {
          const updated = applyIncrementalNoteUpdate(
            request.payload.note,
            request.payload.noteId,
            request.payload.currentIndex
          );
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: updated };
          self.postMessage(response);
          break;
        }
        case 'COMPUTE_LEXICAL_RELATEDNESS': {
          const existingLinks = new Set<string>(request.payload.existingLinkPairs || []);
          const relations = computeAllLexicalRelatedness(
            request.payload.notes,
            request.payload.settings,
            existingLinks
          );
          if (canceledRequests.has(requestId)) {
            canceledRequests.delete(requestId);
            self.postMessage({ id: requestId, type: 'CANCELED' });
            return;
          }
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: relations };
          self.postMessage(response);
          break;
        }
        case 'COMPUTE_NOTE_SIMILARITY': {
          const existingLinks = new Set<string>(request.payload.existingLinkPairs || []);
          const index = buildLexicalIndex(request.payload.notes);
          const related = computeLexicalRelatednessForDoc(
            request.payload.targetNoteId,
            index,
            request.payload.settings.threshold,
            request.payload.settings.maxNeighborsPerNode,
            existingLinks
          );
          if (canceledRequests.has(requestId)) {
            canceledRequests.delete(requestId);
            self.postMessage({ id: requestId, type: 'CANCELED' });
            return;
          }
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: related };
          self.postMessage(response);
          break;
        }
        case 'COMPUTE_DUPLICATES': {
          const res = detectVaultDuplicates(request.payload.notes, undefined, request.payload.options);
          if (canceledRequests.has(requestId)) {
            canceledRequests.delete(requestId);
            self.postMessage({ id: requestId, type: 'CANCELED' });
            return;
          }
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: res };
          self.postMessage(response);
          break;
        }
        case 'COMPUTE_TAG_SUGGESTIONS': {
          const suggestions = suggestTagsForNote(request.payload.note, request.payload.notes, undefined, {
            dismissedTags: request.payload.dismissedTags,
          });
          if (canceledRequests.has(requestId)) {
            canceledRequests.delete(requestId);
            self.postMessage({ id: requestId, type: 'CANCELED' });
            return;
          }
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: suggestions };
          self.postMessage(response);
          break;
        }
        case 'DETECT_MOC_CLUSTERS': {
          const clusters = detectMOCClusters(request.payload.notes, undefined, request.payload.options);
          if (canceledRequests.has(requestId)) {
            canceledRequests.delete(requestId);
            self.postMessage({ id: requestId, type: 'CANCELED' });
            return;
          }
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: clusters };
          self.postMessage(response);
          break;
        }
        case 'SUGGEST_ORPHAN_CONNECTIONS': {
          const conns = suggestOrphanConnections(
            request.payload.orphanNoteId,
            request.payload.notes,
            undefined,
            {
              limit: request.payload.limit,
              dismissedTargets: request.payload.dismissedTargets,
            }
          );
          if (canceledRequests.has(requestId)) {
            canceledRequests.delete(requestId);
            self.postMessage({ id: requestId, type: 'CANCELED' });
            return;
          }
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: conns };
          self.postMessage(response);
          break;
        }
        case 'RUN_VAULT_DIAGNOSTICS': {
          const report = await runFullVaultDiagnostics(
            request.payload.notes,
            request.payload.folders,
            request.payload.canvasBoards,
            request.payload.pdfAttachments
          );
          if (canceledRequests.has(requestId)) {
            canceledRequests.delete(requestId);
            self.postMessage({ id: requestId, type: 'CANCELED' });
            return;
          }
          const response: PKMWorkerResponse = { id: requestId, type: 'SUCCESS', result: report };
          self.postMessage(response);
          break;
        }
        default: {
          const response: PKMWorkerResponse = {
            id: requestId,
            type: 'ERROR',
            error: `Unknown worker action: ${(request as { type?: string }).type}`,
          };
          self.postMessage(response);
        }
      }
    } catch (err) {
      const response: PKMWorkerResponse = {
        id: requestId,
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(response);
    }
  };
}
