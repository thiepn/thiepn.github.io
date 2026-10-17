import { VectorRecord } from './searchTypes';

const DB_NAME = 'keep_pkm_semantic_vectors';
const DB_VERSION = 1;
const STORE_VECTORS = 'vectors';
const STORE_METADATA = 'metadata';

// In-memory fallback map for environments without IndexedDB (e.g., lightweight unit tests)
const memoryStore = new Map<string, VectorRecord>();

class VectorStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDBAvailable: boolean;

  constructor() {
    this.isIndexedDBAvailable = typeof indexedDB !== 'undefined';
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDBAvailable) return null;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_VECTORS)) {
            const store = db.createObjectStore(STORE_VECTORS, { keyPath: 'id' });
            store.createIndex('by_noteId', 'noteId', { unique: false });
            store.createIndex('by_hash', 'hash', { unique: false });
            store.createIndex('by_modelId', 'modelId', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_METADATA)) {
            db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
          }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('Failed to open VectorStore IndexedDB, falling back to memory store:', req.error);
          this.isIndexedDBAvailable = false;
          resolve(null as unknown as IDBDatabase);
        };
      } catch (err) {
        console.warn('VectorStore IndexedDB open exception:', err);
        this.isIndexedDBAvailable = false;
        resolve(null as unknown as IDBDatabase);
      }
    });

    return this.dbPromise;
  }

  public async saveVector(record: VectorRecord): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      memoryStore.set(record.id, record);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_VECTORS], 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async saveVectorsBatch(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;
    const db = await this.getDB();
    if (!db) {
      for (const rec of records) {
        memoryStore.set(rec.id, rec);
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_VECTORS], 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);

      for (const rec of records) {
        store.put(rec);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getVectorsForNote(noteId: string): Promise<VectorRecord[]> {
    const db = await this.getDB();
    if (!db) {
      const results: VectorRecord[] = [];
      for (const rec of memoryStore.values()) {
        if (rec.noteId === noteId) results.push(rec);
      }
      return results;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_VECTORS], 'readonly');
      const store = tx.objectStore(STORE_VECTORS);
      const index = store.index('by_noteId');
      const req = index.getAll(noteId);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllVectors(): Promise<VectorRecord[]> {
    const db = await this.getDB();
    if (!db) {
      return Array.from(memoryStore.values());
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_VECTORS], 'readonly');
      const store = tx.objectStore(STORE_VECTORS);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteVectorsForNote(noteId: string): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      for (const [key, val] of memoryStore.entries()) {
        if (val.noteId === noteId) memoryStore.delete(key);
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_VECTORS], 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);
      const index = store.index('by_noteId');
      const req = index.getAllKeys(noteId);

      req.onsuccess = () => {
        const keys = req.result;
        for (const key of keys) {
          store.delete(key);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async deleteVector(chunkId: string): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      memoryStore.delete(chunkId);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_VECTORS], 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);
      const req = store.delete(chunkId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearAllVectors(): Promise<void> {
    memoryStore.clear();
    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_VECTORS], 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getStoredHashesForNote(noteId: string): Promise<Map<string, string>> {
    const vectors = await this.getVectorsForNote(noteId);
    const map = new Map<string, string>();
    for (const v of vectors) {
      map.set(v.chunkId, v.hash);
    }
    return map;
  }

  public async getVectorCount(): Promise<number> {
    const db = await this.getDB();
    if (!db) return memoryStore.size;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_VECTORS], 'readonly');
      const store = tx.objectStore(STORE_VECTORS);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  }
}

export const vectorStore = new VectorStore();
