/**
 * KEEP CRDT Vault Document Store
 * Manages persistent CRDT Yjs documents, tombstones, snapshot compaction,
 * and state vector index caching in IndexedDB.
 */

import * as Y from 'yjs';
import { Note, Folder } from '../../../types';
import {
  CRDTEntityType,
  CRDTTombstone,
  CRDTSyncManifest,
  CRDTEntityVectorEntry,
  CRDT_PROTOCOL_VERSION,
  CRDT_PERSIST_DEBOUNCE_MS,
} from './crdtTypes';
import { CRDTNoteAdapter } from './crdtNoteAdapter';
import { CRDTFolderAdapter } from './crdtFolderAdapter';

const CRDT_DB_NAME = 'keep_crdt_vault_v1';
const CRDT_NOTE_DOCS_STORE = 'note_docs';
const CRDT_FOLDER_DOCS_STORE = 'folder_docs';
const CRDT_TOMBSTONES_STORE = 'tombstones';

export class CRDTVaultStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private activeNoteDocs: Map<string, Y.Doc> = new Map();
  private activeFolderDocs: Map<string, Y.Doc> = new Map();
  private tombstones: Map<string, CRDTTombstone> = new Map();
  private pendingPersistTimeouts: Map<string, any> = new Map();
  private initialized: boolean = false;
  private initListeners: Set<() => void> = new Set();

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        resolve({} as IDBDatabase);
        return;
      }

      const req = indexedDB.open(CRDT_DB_NAME, 1);
      req.onupgradeneeded = (e: any) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CRDT_NOTE_DOCS_STORE)) {
          db.createObjectStore(CRDT_NOTE_DOCS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CRDT_FOLDER_DOCS_STORE)) {
          db.createObjectStore(CRDT_FOLDER_DOCS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CRDT_TOMBSTONES_STORE)) {
          db.createObjectStore(CRDT_TOMBSTONES_STORE, { keyPath: 'id' });
        }
      };

      req.onsuccess = async () => {
        const db = req.result;
        await this.loadAllStoredData(db);
        this.initialized = true;
        this.notifyInit();
        resolve(db);
      };

      req.onerror = () => reject(req.error);
    });

    return this.dbPromise;
  }

  private async loadAllStoredData(db: IDBDatabase) {
    if (!db.transaction) return;

    try {
      // 1. Load Tombstones
      const tx = db.transaction([CRDT_TOMBSTONES_STORE, CRDT_NOTE_DOCS_STORE, CRDT_FOLDER_DOCS_STORE], 'readonly');
      const tombReq = tx.objectStore(CRDT_TOMBSTONES_STORE).getAll();
      tombReq.onsuccess = () => {
        if (Array.isArray(tombReq.result)) {
          for (const t of tombReq.result) {
            this.tombstones.set(t.id, t);
          }
        }
      };

      // 2. Load Note Docs
      const noteReq = tx.objectStore(CRDT_NOTE_DOCS_STORE).getAll();
      noteReq.onsuccess = () => {
        if (Array.isArray(noteReq.result)) {
          for (const record of noteReq.result) {
            if (record.snapshotBase64 && !this.tombstones.has(record.id)) {
              try {
                const bytes = CRDTNoteAdapter.base64ToUint8(record.snapshotBase64);
                const doc = new Y.Doc();
                Y.applyUpdate(doc, bytes);
                this.activeNoteDocs.set(record.id, doc);
              } catch (e) {
                console.warn('Could not restore Y.Doc for note:', record.id, e);
              }
            }
          }
        }
      };

      // 3. Load Folder Docs
      const folderReq = tx.objectStore(CRDT_FOLDER_DOCS_STORE).getAll();
      folderReq.onsuccess = () => {
        if (Array.isArray(folderReq.result)) {
          for (const record of folderReq.result) {
            if (record.snapshotBase64 && !this.tombstones.has(record.id)) {
              try {
                const bytes = CRDTNoteAdapter.base64ToUint8(record.snapshotBase64);
                const doc = new Y.Doc();
                Y.applyUpdate(doc, bytes);
                this.activeFolderDocs.set(record.id, doc);
              } catch (e) {
                console.warn('Could not restore Y.Doc for folder:', record.id, e);
              }
            }
          }
        }
      };
    } catch (err) {
      console.warn('Error loading CRDT store data:', err);
    }
  }

  private notifyInit() {
    for (const listener of this.initListeners) {
      try {
        listener();
      } catch {}
    }
    this.initListeners.clear();
  }

  public async whenReady(): Promise<void> {
    if (this.initialized) return;
    return new Promise((resolve) => {
      this.initListeners.add(resolve);
    });
  }

  /**
   * Lazily migrates existing KEEP notes and folders into the CRDT store
   */
  public async ensureInitializedFromVault(notes: Note[], folders: Folder[]): Promise<void> {
    await this.whenReady();

    let newNotesCount = 0;
    for (const note of notes) {
      if (!this.activeNoteDocs.has(note.id) && !this.tombstones.has(note.id)) {
        const doc = CRDTNoteAdapter.createDocFromNote(note);
        this.activeNoteDocs.set(note.id, doc);
        this.schedulePersistDoc(note.id, 'note', doc);
        newNotesCount++;
      }
    }

    for (const folder of folders) {
      if (!this.activeFolderDocs.has(folder.id) && !this.tombstones.has(folder.id)) {
        const doc = CRDTFolderAdapter.createDocFromFolder(folder);
        this.activeFolderDocs.set(folder.id, doc);
        this.schedulePersistDoc(folder.id, 'folder', doc);
      }
    }
  }

  /**
   * Returns active Y.Doc for a note (or creates one if not present)
   */
  public getOrCreateNoteDoc(note: Note): Y.Doc {
    let doc = this.activeNoteDocs.get(note.id);
    if (!doc) {
      doc = CRDTNoteAdapter.createDocFromNote(note);
      this.activeNoteDocs.set(note.id, doc);
      this.schedulePersistDoc(note.id, 'note', doc);
    }
    return doc;
  }

  /**
   * Updates CRDT document whenever user makes an edit to a note in the local UI
   */
  public updateNote(note: Note): { doc: Y.Doc; incrementalUpdate: Uint8Array } {
    let doc = this.activeNoteDocs.get(note.id);
    let beforeVector: Uint8Array | undefined;

    if (!doc) {
      doc = CRDTNoteAdapter.createDocFromNote(note);
      this.activeNoteDocs.set(note.id, doc);
    } else {
      beforeVector = Y.encodeStateVector(doc);
      CRDTNoteAdapter.updateDocFromNote(doc, note);
    }

    const incrementalUpdate = beforeVector
      ? Y.encodeStateAsUpdate(doc, beforeVector)
      : Y.encodeStateAsUpdate(doc);

    // Remove tombstone if previously tombstoned
    if (this.tombstones.has(note.id)) {
      this.tombstones.delete(note.id);
      this.deleteTombstoneFromDB(note.id);
    }

    this.schedulePersistDoc(note.id, 'note', doc);
    return { doc, incrementalUpdate };
  }

  /**
   * Updates CRDT document for a folder
   */
  public updateFolder(folder: Folder): { doc: Y.Doc; incrementalUpdate: Uint8Array } {
    let doc = this.activeFolderDocs.get(folder.id);
    let beforeVector: Uint8Array | undefined;

    if (!doc) {
      doc = CRDTFolderAdapter.createDocFromFolder(folder);
      this.activeFolderDocs.set(folder.id, doc);
    } else {
      beforeVector = Y.encodeStateVector(doc);
      CRDTFolderAdapter.updateDocFromFolder(doc, folder);
    }

    const incrementalUpdate = beforeVector
      ? Y.encodeStateAsUpdate(doc, beforeVector)
      : Y.encodeStateAsUpdate(doc);

    if (this.tombstones.has(folder.id)) {
      this.tombstones.delete(folder.id);
      this.deleteTombstoneFromDB(folder.id);
    }

    this.schedulePersistDoc(folder.id, 'folder', doc);
    return { doc, incrementalUpdate };
  }

  /**
   * Records a tombstone for a deleted entity
   */
  public recordTombstone(
    id: string,
    type: CRDTEntityType,
    originDeviceId: string,
    lastKnownTitle?: string
  ): CRDTTombstone {
    const existing = this.tombstones.get(id);
    const tombstone: CRDTTombstone = {
      id,
      type,
      deletedAt: new Date().toISOString(),
      originDeviceId,
      logicalVersion: (existing?.logicalVersion || 0) + 1,
      lastKnownTitle,
    };

    this.tombstones.set(id, tombstone);
    this.activeNoteDocs.delete(id);
    this.activeFolderDocs.delete(id);

    this.persistTombstoneToDB(tombstone);
    this.deleteDocFromDB(id, type);

    return tombstone;
  }

  /**
   * Applies an incoming tombstone from a peer
   */
  public applyRemoteTombstone(tombstone: CRDTTombstone): boolean {
    const existing = this.tombstones.get(tombstone.id);
    if (existing && new Date(existing.deletedAt).getTime() >= new Date(tombstone.deletedAt).getTime()) {
      return false; // Already tombstoned with equal or newer timestamp
    }

    // Check if we have an active doc that was updated *after* the tombstone
    const activeDoc = this.activeNoteDocs.get(tombstone.id);
    if (activeDoc) {
      const meta = activeDoc.getMap('meta');
      const updatedAt = meta.get('updatedAt') as string;
      if (updatedAt && new Date(updatedAt).getTime() > new Date(tombstone.deletedAt).getTime()) {
        // Concurrent edit beats earlier deletion (resurrection semantics)
        return false;
      }
    }

    this.tombstones.set(tombstone.id, tombstone);
    this.activeNoteDocs.delete(tombstone.id);
    this.activeFolderDocs.delete(tombstone.id);

    this.persistTombstoneToDB(tombstone);
    this.deleteDocFromDB(tombstone.id, tombstone.type);

    return true;
  }

  /**
   * Applies an incoming remote CRDT delta update to a Note or Folder
   */
  public applyRemoteDelta(
    id: string,
    type: CRDTEntityType,
    updateBytes: Uint8Array
  ): { mergedNote?: Note; mergedFolder?: Folder; wasResurrected: boolean } {
    let wasResurrected = false;

    // Check tombstone collision
    if (this.tombstones.has(id)) {
      // Remote has an active update; remove tombstone and resurrect
      this.tombstones.delete(id);
      this.deleteTombstoneFromDB(id);
      wasResurrected = true;
    }

    if (type === 'note') {
      let doc = this.activeNoteDocs.get(id);
      if (!doc) {
        doc = new Y.Doc();
        this.activeNoteDocs.set(id, doc);
      }

      CRDTNoteAdapter.applyUpdate(doc, updateBytes, 'remote');
      this.schedulePersistDoc(id, 'note', doc);
      const mergedNote = CRDTNoteAdapter.extractNoteFromDoc(doc, id);
      return { mergedNote, wasResurrected };
    } else if (type === 'folder') {
      let doc = this.activeFolderDocs.get(id);
      if (!doc) {
        doc = new Y.Doc();
        this.activeFolderDocs.set(id, doc);
      }

      Y.applyUpdate(doc, updateBytes, 'remote');
      this.schedulePersistDoc(id, 'folder', doc);
      const mergedFolder = CRDTFolderAdapter.extractFolderFromDoc(doc, id);
      return { mergedFolder, wasResurrected };
    }

    return { wasResurrected };
  }

  /**
   * Compiles the global state vector manifest for differential sync exchange
   */
  public async getSyncManifest(vaultId: string, deviceId: string): Promise<CRDTSyncManifest> {
    await this.whenReady();

    const entities: Record<string, CRDTEntityVectorEntry> = {};
    const attachmentHashesSet = new Set<string>();

    for (const [id, doc] of this.activeNoteDocs.entries()) {
      if (this.tombstones.has(id)) continue;
      const sv = Y.encodeStateVector(doc);
      const meta = doc.getMap('meta');
      const updatedAt = (meta.get('updatedAt') as string) || new Date().toISOString();
      const title = (meta.get('title') as string) || '';

      const imagesArray = doc.getArray<string>('images');
      imagesArray.forEach((h) => {
        if (h && typeof h === 'string' && h.length === 64) {
          attachmentHashesSet.add(h);
        }
      });

      entities[id] = {
        id,
        type: 'note',
        stateVectorBase64: CRDTNoteAdapter.uint8ToBase64(sv),
        updatedAt,
        title,
      };
    }

    for (const [id, doc] of this.activeFolderDocs.entries()) {
      if (this.tombstones.has(id)) continue;
      const sv = Y.encodeStateVector(doc);
      const meta = doc.getMap('meta');
      const name = (meta.get('name') as string) || 'Folder';
      entities[id] = {
        id,
        type: 'folder',
        stateVectorBase64: CRDTNoteAdapter.uint8ToBase64(sv),
        updatedAt: new Date().toISOString(),
        title: name,
      };
    }

    const tombstonesRecord: Record<string, CRDTTombstone> = {};
    for (const [id, t] of this.tombstones.entries()) {
      tombstonesRecord[id] = t;
    }

    return {
      version: CRDT_PROTOCOL_VERSION,
      vaultId,
      deviceId,
      timestamp: new Date().toISOString(),
      entities,
      tombstones: tombstonesRecord,
      attachmentHashes: Array.from(attachmentHashesSet),
    };
  }

  /**
   * Computes missing differential updates to send to a peer based on their manifest
   */
  public computeDeltasToSend(peerManifest: CRDTSyncManifest): {
    id: string;
    type: CRDTEntityType;
    updateBase64: string;
    updatedAt: string;
    isSnapshot: boolean;
  }[] {
    const deltas: {
      id: string;
      type: CRDTEntityType;
      updateBase64: string;
      updatedAt: string;
      isSnapshot: boolean;
    }[] = [];

    // Check Note Docs
    for (const [id, doc] of this.activeNoteDocs.entries()) {
      if (this.tombstones.has(id)) continue;
      const peerEntry = peerManifest.entities[id];

      if (!peerEntry) {
        // Peer has never seen this note -> send full compacted snapshot
        const snapshot = Y.encodeStateAsUpdate(doc);
        const meta = doc.getMap('meta');
        deltas.push({
          id,
          type: 'note',
          updateBase64: CRDTNoteAdapter.uint8ToBase64(snapshot),
          updatedAt: (meta.get('updatedAt') as string) || new Date().toISOString(),
          isSnapshot: true,
        });
      } else {
        // Peer has a version -> compute minimal differential delta since peer's state vector
        const peerSV = CRDTNoteAdapter.base64ToUint8(peerEntry.stateVectorBase64);
        const diffUpdate = Y.encodeStateAsUpdate(doc, peerSV);

        // diffUpdate is empty ([0, 0] in Yjs) if peer is already up to date
        if (diffUpdate.length > 2) {
          const meta = doc.getMap('meta');
          deltas.push({
            id,
            type: 'note',
            updateBase64: CRDTNoteAdapter.uint8ToBase64(diffUpdate),
            updatedAt: (meta.get('updatedAt') as string) || new Date().toISOString(),
            isSnapshot: false,
          });
        }
      }
    }

    // Check Folder Docs
    for (const [id, doc] of this.activeFolderDocs.entries()) {
      if (this.tombstones.has(id)) continue;
      const peerEntry = peerManifest.entities[id];

      if (!peerEntry) {
        const snapshot = Y.encodeStateAsUpdate(doc);
        deltas.push({
          id,
          type: 'folder',
          updateBase64: CRDTNoteAdapter.uint8ToBase64(snapshot),
          updatedAt: new Date().toISOString(),
          isSnapshot: true,
        });
      } else {
        const peerSV = CRDTNoteAdapter.base64ToUint8(peerEntry.stateVectorBase64);
        const diffUpdate = Y.encodeStateAsUpdate(doc, peerSV);
        if (diffUpdate.length > 2) {
          deltas.push({
            id,
            type: 'folder',
            updateBase64: CRDTNoteAdapter.uint8ToBase64(diffUpdate),
            updatedAt: new Date().toISOString(),
            isSnapshot: false,
          });
        }
      }
    }

    return deltas;
  }

  /**
   * Throttled persistence helper
   */
  private schedulePersistDoc(id: string, type: CRDTEntityType, doc: Y.Doc) {
    if (this.pendingPersistTimeouts.has(id)) {
      clearTimeout(this.pendingPersistTimeouts.get(id));
    }

    const timeout = setTimeout(async () => {
      this.pendingPersistTimeouts.delete(id);
      await this.persistDocToDB(id, type, doc);
    }, CRDT_PERSIST_DEBOUNCE_MS);

    this.pendingPersistTimeouts.set(id, timeout);
  }

  private async persistDocToDB(id: string, type: CRDTEntityType, doc: Y.Doc) {
    try {
      const db = await this.initDB();
      if (!db.transaction) return;

      const snapshot = Y.encodeStateAsUpdate(doc);
      const sv = Y.encodeStateVector(doc);
      const snapshotBase64 = CRDTNoteAdapter.uint8ToBase64(snapshot);
      const svBase64 = CRDTNoteAdapter.uint8ToBase64(sv);

      const storeName = type === 'note' ? CRDT_NOTE_DOCS_STORE : CRDT_FOLDER_DOCS_STORE;
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put({
        id,
        snapshotBase64,
        stateVectorBase64: svBase64,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Error persisting CRDT Doc to IndexedDB:', id, e);
    }
  }

  private async persistTombstoneToDB(tombstone: CRDTTombstone) {
    try {
      const db = await this.initDB();
      if (!db.transaction) return;
      const tx = db.transaction(CRDT_TOMBSTONES_STORE, 'readwrite');
      tx.objectStore(CRDT_TOMBSTONES_STORE).put(tombstone);
    } catch (e) {
      console.warn('Error persisting Tombstone to IndexedDB:', tombstone.id, e);
    }
  }

  private async deleteDocFromDB(id: string, type: CRDTEntityType) {
    try {
      const db = await this.initDB();
      if (!db.transaction) return;
      const storeName = type === 'note' ? CRDT_NOTE_DOCS_STORE : CRDT_FOLDER_DOCS_STORE;
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
    } catch (e) {
      console.warn('Error deleting CRDT Doc from IndexedDB:', id, e);
    }
  }

  private async deleteTombstoneFromDB(id: string) {
    try {
      const db = await this.initDB();
      if (!db.transaction) return;
      const tx = db.transaction(CRDT_TOMBSTONES_STORE, 'readwrite');
      tx.objectStore(CRDT_TOMBSTONES_STORE).delete(id);
    } catch (e) {
      console.warn('Error deleting Tombstone from IndexedDB:', id, e);
    }
  }

  public getAllTombstones(): CRDTTombstone[] {
    return Array.from(this.tombstones.values());
  }

  public getNoteDoc(id: string): Y.Doc | undefined {
    return this.activeNoteDocs.get(id);
  }

  public getAllNoteDocs(): Map<string, Y.Doc> {
    return this.activeNoteDocs;
  }
}

export const crdtVaultStore = new CRDTVaultStore();
