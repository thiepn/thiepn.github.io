/**
 * Phase P29: Canonical, Derived, and Ephemeral Data Classification
 */

import { DataClassificationEntry, DataPersistenceClass } from './resilienceTypes';
import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAttachment, PDFAnnotation } from '../pdfTypes';
import { CanonicalAttachment } from '../media/mediaTypes';

export const DATA_CLASSIFICATION_REGISTRY: Record<string, DataClassificationEntry> = {
  // --- CANONICAL USER DATA ---
  notes: {
    dataType: 'notes',
    name: 'Note Documents & Frontmatter',
    persistenceClass: 'canonical',
    storageTarget: 'IndexedDB',
    isEncryptedAtRest: true,
    canBeDiscardedAndRebuilt: false,
    description: 'User-written markdown content, tags, checklists, task status, priority, and colors.',
  },
  folders: {
    dataType: 'folders',
    name: 'Folder Hierarchy',
    persistenceClass: 'canonical',
    storageTarget: 'IndexedDB',
    isEncryptedAtRest: true,
    canBeDiscardedAndRebuilt: false,
    description: 'Hierarchical organization containers and custom icons/colors.',
  },
  saved_searches: {
    dataType: 'saved_searches',
    name: 'Saved Views & Search Presets',
    persistenceClass: 'canonical',
    storageTarget: 'IndexedDB',
    isEncryptedAtRest: true,
    canBeDiscardedAndRebuilt: false,
    description: 'User-configured smart search filters and custom pinned queries.',
  },
  canvases: {
    dataType: 'canvases',
    name: 'Spatial Canvas Boards',
    persistenceClass: 'canonical',
    storageTarget: 'IndexedDB',
    isEncryptedAtRest: true,
    canBeDiscardedAndRebuilt: false,
    description: 'Spatial whiteboards, sticky cards, connection arrows, grouping frames, and freehand strokes.',
  },
  attachments: {
    dataType: 'attachments',
    name: 'Media & File Attachments',
    persistenceClass: 'canonical',
    storageTarget: 'IndexedDB',
    isEncryptedAtRest: true,
    canBeDiscardedAndRebuilt: false,
    description: 'Binary blobs for images, PDFs, audio recordings, and generic file attachments.',
  },
  pdf_annotations: {
    dataType: 'pdf_annotations',
    name: 'PDF Annotations & Highlights',
    persistenceClass: 'canonical',
    storageTarget: 'IndexedDB',
    isEncryptedAtRest: true,
    canBeDiscardedAndRebuilt: false,
    description: 'User-created text highlights, page coordinates, and citations on PDF documents.',
  },
  settings: {
    dataType: 'settings',
    name: 'User Preferences & Settings',
    persistenceClass: 'canonical',
    storageTarget: 'IndexedDB',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: false,
    description: 'Visual theme, font choice, default layout, and editor preferences.',
  },
  encryption_metadata: {
    dataType: 'encryption_metadata',
    name: 'Encryption Salt & Wrapped Key',
    persistenceClass: 'canonical',
    storageTarget: 'localStorage',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: false,
    description: 'Argon2id salt, KDF parameters, and wrapped master vault key header.',
  },

  // --- DERIVED / REBUILDABLE DATA ---
  fulltext_index: {
    dataType: 'fulltext_index',
    name: 'Full-Text Search Index',
    persistenceClass: 'derived',
    storageTarget: 'Memory',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: true,
    description: 'Inverted index tokens for instant search across all notes.',
  },
  vault_index: {
    dataType: 'vault_index',
    name: 'Vault Link & AST Index',
    persistenceClass: 'derived',
    storageTarget: 'Memory',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: true,
    description: 'Backlink graph, outgoing links, heading index, and block references derived from markdown AST.',
  },
  semantic_embeddings: {
    dataType: 'semantic_embeddings',
    name: 'Semantic & Lexical Vector Cache',
    persistenceClass: 'derived',
    storageTarget: 'localStorage',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: true,
    description: 'Off-thread calculated cosine vectors and word frequency weights for related notes.',
  },
  task_index: {
    dataType: 'task_index',
    name: 'Aggregated Task Index',
    persistenceClass: 'derived',
    storageTarget: 'Memory',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: true,
    description: 'Cross-note checklist item status, priority, and date aggregator.',
  },
  diagnostics_cache: {
    dataType: 'diagnostics_cache',
    name: 'Vault Doctor Diagnostics Report',
    persistenceClass: 'derived',
    storageTarget: 'Memory',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: true,
    description: 'Cached integrity audit results, broken link list, and orphaned attachment list.',
  },

  // --- EPHEMERAL UI STATE ---
  cursor_selection: {
    dataType: 'cursor_selection',
    name: 'Active Cursor & Text Selection',
    persistenceClass: 'ephemeral',
    storageTarget: 'Memory',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: true,
    description: 'Active cursor line, selection range, and scroll position in editor.',
  },
  transient_search_query: {
    dataType: 'transient_search_query',
    name: 'Transient Search Query',
    persistenceClass: 'ephemeral',
    storageTarget: 'Memory',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: true,
    description: 'Unsubmitted text in search bar or command palette.',
  },
  active_modal: {
    dataType: 'active_modal',
    name: 'Active Modal Dialog State',
    persistenceClass: 'ephemeral',
    storageTarget: 'Memory',
    isEncryptedAtRest: false,
    canBeDiscardedAndRebuilt: true,
    description: 'Currently open modal view (e.g. Vault Doctor, Canvas, Quick Capture).',
  },
};

/**
 * Returns all canonical data types that MUST be protected during backup and recovery
 */
export function getCanonicalDataTypes(): DataClassificationEntry[] {
  return Object.values(DATA_CLASSIFICATION_REGISTRY).filter(
    (e) => e.persistenceClass === 'canonical'
  );
}

/**
 * Returns all derived data types that can be safely discarded to reclaim space
 */
export function getDerivedDataTypes(): DataClassificationEntry[] {
  return Object.values(DATA_CLASSIFICATION_REGISTRY).filter(
    (e) => e.persistenceClass === 'derived'
  );
}

/**
 * Verify whether a data type is safe to delete without losing canonical user work
 */
export function isSafeToRebuild(dataType: string): boolean {
  const entry = DATA_CLASSIFICATION_REGISTRY[dataType];
  return entry ? entry.canBeDiscardedAndRebuilt : false;
}

/**
 * Audit vault integrity invariants
 */
export interface VaultInvariantAuditResult {
  valid: boolean;
  checkedNotes: number;
  checkedCanvases: number;
  checkedAttachments: number;
  danglingCanvasReferences: string[];
  orphanedAttachments: string[];
  missingAttachmentBlobs: string[];
  corruptNotes: string[];
}

export function auditVaultInvariants(
  notes: Note[],
  canvases: CanvasBoard[] = [],
  attachments: CanonicalAttachment[] = [],
  pdfAttachments: PDFAttachment[] = []
): VaultInvariantAuditResult {
  const noteIdSet = new Set(notes.map((n) => n.id));
  const danglingCanvasReferences: string[] = [];
  const orphanedAttachments: string[] = [];
  const missingAttachmentBlobs: string[] = [];
  const corruptNotes: string[] = [];

  // 1. Audit Notes for minimal canonical validity
  for (const note of notes) {
    if (!note || typeof note.id !== 'string' || !note.id.trim()) {
      corruptNotes.push(note?.id || 'unknown-invalid-id');
    }
  }

  // 2. Audit Canvas Note references
  for (const canvas of canvases) {
    for (const node of canvas.nodes || []) {
      if (node.type === 'note' && node.noteId) {
        if (!noteIdSet.has(node.noteId)) {
          danglingCanvasReferences.push(`${canvas.id}:${node.id} -> ${node.noteId}`);
        }
      }
    }
  }

  // 3. Audit Attachments
  const referencedAttachmentIds = new Set<string>();
  for (const note of notes) {
    for (const img of note.images || []) {
      if (img.id) referencedAttachmentIds.add(img.id);
    }
    for (const aud of note.audios || []) {
      if (aud.id) referencedAttachmentIds.add(aud.id);
    }
  }

  for (const att of attachments) {
    if (!referencedAttachmentIds.has(att.id)) {
      orphanedAttachments.push(att.id);
    }
  }

  return {
    valid: corruptNotes.length === 0,
    checkedNotes: notes.length,
    checkedCanvases: canvases.length,
    checkedAttachments: attachments.length + pdfAttachments.length,
    danglingCanvasReferences,
    orphanedAttachments,
    missingAttachmentBlobs,
    corruptNotes,
  };
}
