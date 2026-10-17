/**
 * Phase P29: Same-Origin Vault Recovery Points & Snapshot Manager
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAnnotation } from '../pdfTypes';
import {
  RecoveryPointManifest,
  RecoveryPointSummary,
  RecoveryPointTrigger,
} from './resilienceTypes';
import { computeDeterministicChecksum, canonicalizeJson } from '../portableVaultSerializer';
import { atomicTransactionService } from './atomicTransactions';

const SNAPSHOTS_DB_NAME = 'KeepNotes_Snapshots_DB';
const SNAPSHOTS_STORE_NAME = 'snapshots';
const MAX_SNAPSHOTS = 12;

export class RecoveryPointService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memorySnapshots: Map<string, RecoveryPointManifest> = new Map();
  private listeners: Set<(summaries: RecoveryPointSummary[]) => void> = new Set();

  constructor() {
    this.init();
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const request = indexedDB.open(SNAPSHOTS_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SNAPSHOTS_STORE_NAME)) {
          db.createObjectStore(SNAPSHOTS_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async init() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return;
    }
    try {
      const db = await this.getDB();
      const tx = db.transaction(SNAPSHOTS_STORE_NAME, 'readonly');
      const store = tx.objectStore(SNAPSHOTS_STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result as RecoveryPointManifest[];
        if (Array.isArray(items)) {
          for (const item of items) {
            this.memorySnapshots.set(item.id, item);
          }
        }
        this.notify();
      };
    } catch (e) {
      // In headless test environments or restricted modes, fallback silently to in-memory
    }
  }

  public subscribe(listener: (summaries: RecoveryPointSummary[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSummaries());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const list = this.getSummaries();
    for (const l of this.listeners) {
      try {
        l(list);
      } catch (err) {
        console.error('Error in recovery point listener:', err);
      }
    }
  }

  public getSummaries(): RecoveryPointSummary[] {
    return Array.from(this.memorySnapshots.values())
      .map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        trigger: s.trigger,
        label: s.label,
        isProtected: Boolean(s.isProtected),
        noteCount: s.stats.noteCount,
        folderCount: s.stats.folderCount,
        canvasCount: s.stats.canvasCount,
        approximateSizeBytes: s.stats.approximateSizeBytes,
        contentChecksum: s.contentChecksum,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getRecoveryPoint(id: string): Promise<RecoveryPointManifest | null> {
    if (this.memorySnapshots.has(id)) {
      return this.memorySnapshots.get(id)!;
    }
    try {
      const db = await this.getDB();
      const tx = db.transaction(SNAPSHOTS_STORE_NAME, 'readonly');
      const store = tx.objectStore(SNAPSHOTS_STORE_NAME);
      const req = store.get(id);

      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Creates a new Recovery Point snapshot of current vault state
   */
  public async createRecoveryPoint(
    trigger: RecoveryPointTrigger,
    label: string,
    data: {
      notes: Note[];
      folders: Folder[];
      savedSearches?: SavedSearch[];
      canvases?: CanvasBoard[];
      pdfAnnotations?: PDFAnnotation[];
      settings?: AppSettings;
    },
    isProtected = false
  ): Promise<RecoveryPointManifest> {
    const now = new Date().toISOString();
    const id = `recovery-pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Compute deterministic checksum of canonical text
    const serializedForChecksum = canonicalizeJson({
      notes: data.notes,
      folders: data.folders,
      canvases: data.canvases || [],
    });
    const contentChecksum = computeDeterministicChecksum(serializedForChecksum);
    const approximateSizeBytes = new Blob([serializedForChecksum]).size;

    const manifest: RecoveryPointManifest = {
      id,
      createdAt: now,
      trigger,
      label,
      isProtected,
      stats: {
        noteCount: data.notes.length,
        folderCount: data.folders.length,
        canvasCount: data.canvases?.length || 0,
        pdfCount: 0,
        attachmentCount: 0,
        approximateSizeBytes,
      },
      contentChecksum,
      notes: data.notes,
      folders: data.folders,
      savedSearches: data.savedSearches || [],
      canvases: data.canvases || [],
      pdfAnnotations: data.pdfAnnotations || [],
      settings: data.settings,
    };

    this.memorySnapshots.set(id, manifest);

    // Persist to IndexedDB
    try {
      const db = await this.getDB();
      const tx = db.transaction(SNAPSHOTS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(SNAPSHOTS_STORE_NAME);
      store.put(manifest);
    } catch (e) {
      console.warn('Failed to persist snapshot to IndexedDB:', e);
    }

    // Bounded pruning of old unprotected snapshots
    await this.pruneOldSnapshots();
    this.notify();

    return manifest;
  }

  /**
   * Toggle protection pin for a snapshot
   */
  public async toggleProtected(id: string): Promise<boolean> {
    const snap = await this.getRecoveryPoint(id);
    if (!snap) return false;

    snap.isProtected = !snap.isProtected;
    this.memorySnapshots.set(id, snap);

    try {
      const db = await this.getDB();
      const tx = db.transaction(SNAPSHOTS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(SNAPSHOTS_STORE_NAME);
      store.put(snap);
    } catch {}

    this.notify();
    return Boolean(snap.isProtected);
  }

  /**
   * Delete a recovery point
   */
  public async deleteRecoveryPoint(id: string): Promise<boolean> {
    this.memorySnapshots.delete(id);
    try {
      const db = await this.getDB();
      const tx = db.transaction(SNAPSHOTS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(SNAPSHOTS_STORE_NAME);
      store.delete(id);
    } catch {}

    this.notify();
    return true;
  }

  private async pruneOldSnapshots() {
    const list = Array.from(this.memorySnapshots.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (list.length <= MAX_SNAPSHOTS) return;

    for (const snap of list) {
      if (!snap.isProtected && this.memorySnapshots.size > MAX_SNAPSHOTS) {
        await this.deleteRecoveryPoint(snap.id);
      }
    }
  }

  /**
   * Previews differences between current state and a recovery point
   */
  public async previewRestoreDiff(
    targetSnapshotId: string,
    currentNotes: Note[]
  ): Promise<{
    snapshot: RecoveryPointManifest | null;
    addedNoteCount: number;
    modifiedNoteCount: number;
    deletedNoteCount: number;
    unchangedNoteCount: number;
  }> {
    const snap = await this.getRecoveryPoint(targetSnapshotId);
    if (!snap) {
      return {
        snapshot: null,
        addedNoteCount: 0,
        modifiedNoteCount: 0,
        deletedNoteCount: 0,
        unchangedNoteCount: 0,
      };
    }

    const currentMap = new Map(currentNotes.map((n) => [n.id, n]));
    const snapMap = new Map(snap.notes.map((n) => [n.id, n]));

    let addedNoteCount = 0;
    let modifiedNoteCount = 0;
    let deletedNoteCount = 0;
    let unchangedNoteCount = 0;

    for (const [id, sNote] of snapMap.entries()) {
      if (!currentMap.has(id)) {
        addedNoteCount++;
      } else {
        const cNote = currentMap.get(id)!;
        if (cNote.content === sNote.content && cNote.title === sNote.title) {
          unchangedNoteCount++;
        } else {
          modifiedNoteCount++;
        }
      }
    }

    for (const [id] of currentMap.entries()) {
      if (!snapMap.has(id)) {
        deletedNoteCount++;
      }
    }

    return {
      snapshot: snap,
      addedNoteCount,
      modifiedNoteCount,
      deletedNoteCount,
      unchangedNoteCount,
    };
  }

  /**
   * Restores a recovery point manifest
   */
  public async restoreRecoveryPoint(id: string): Promise<RecoveryPointManifest | null> {
    return this.getRecoveryPoint(id);
  }
}

export const recoveryPointService = new RecoveryPointService();
