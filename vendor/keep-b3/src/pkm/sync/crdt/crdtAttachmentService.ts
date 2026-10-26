/**
 * KEEP CRDT Attachment Service
 * Content-addressed binary attachment storage and chunked synchronization engine.
 * Never embeds large binaries into CRDT text; transfers attachments out-of-band via SHA-256 hashes.
 */

import { CRDT_DEFAULT_CHUNK_SIZE, CRDTAttachmentItem } from './crdtTypes';

const ATTACHMENTS_DB_NAME = 'keep_crdt_attachments_v1';
const ATTACHMENTS_STORE = 'blobs';

export interface StoredAttachment {
  hash: string;
  blob: Blob;
  mimeType: string;
  filename: string;
  size: number;
  createdAt: string;
}

export class CRDTAttachmentService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private inMemoryCache: Map<string, StoredAttachment> = new Map();
  private pendingTransfers: Map<
    string,
    {
      hash: string;
      filename: string;
      mimeType: string;
      totalBytes: number;
      totalChunks: number;
      chunks: Map<number, Uint8Array>;
      createdAt: number;
    }
  > = new Map();

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        // Fallback for non-browser or test environments
        resolve({} as IDBDatabase);
        return;
      }

      const request = indexedDB.open(ATTACHMENTS_DB_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ATTACHMENTS_STORE)) {
          db.createObjectStore(ATTACHMENTS_STORE, { keyPath: 'hash' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Computes SHA-256 hash of an ArrayBuffer or Uint8Array
   */
  public async computeHash(data: ArrayBuffer | Uint8Array): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buffer = data instanceof Uint8Array ? data.buffer : data;
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Fallback simple checksum for test environments without subtle crypto
    let h = 0;
    const view = data instanceof Uint8Array ? data : new Uint8Array(data);
    for (let i = 0; i < view.length; i++) {
      h = (Math.imul(31, h) + view[i]) | 0;
    }
    return `fallback-${Math.abs(h).toString(16).padStart(16, '0')}`;
  }

  /**
   * Stores a binary blob in the content-addressed store
   */
  public async storeAttachment(
    blob: Blob | Uint8Array,
    filename: string = 'attachment.bin',
    mimeType: string = 'application/octet-stream'
  ): Promise<StoredAttachment> {
    let arrayBuffer: ArrayBuffer;
    let finalBlob: Blob;

    if (blob instanceof Uint8Array) {
      arrayBuffer = blob.buffer;
      finalBlob = new Blob([blob], { type: mimeType });
    } else {
      arrayBuffer = await blob.arrayBuffer();
      finalBlob = blob;
    }

    const hash = await this.computeHash(arrayBuffer);
    const item: StoredAttachment = {
      hash,
      blob: finalBlob,
      mimeType: mimeType || finalBlob.type || 'application/octet-stream',
      filename,
      size: arrayBuffer.byteLength,
      createdAt: new Date().toISOString(),
    };

    this.inMemoryCache.set(hash, item);

    try {
      const db = await this.initDB();
      if (db.transaction) {
        const tx = db.transaction(ATTACHMENTS_STORE, 'readwrite');
        tx.objectStore(ATTACHMENTS_STORE).put({
          hash: item.hash,
          data: arrayBuffer,
          mimeType: item.mimeType,
          filename: item.filename,
          size: item.size,
          createdAt: item.createdAt,
        });
      }
    } catch (err) {
      console.warn('Could not persist attachment to IndexedDB:', err);
    }

    return item;
  }

  /**
   * Retrieves an attachment by SHA-256 hash
   */
  public async getAttachment(hash: string): Promise<StoredAttachment | null> {
    if (this.inMemoryCache.has(hash)) {
      return this.inMemoryCache.get(hash)!;
    }

    try {
      const db = await this.initDB();
      if (!db.transaction) return null;

      return new Promise((resolve) => {
        const tx = db.transaction(ATTACHMENTS_STORE, 'readonly');
        const req = tx.objectStore(ATTACHMENTS_STORE).get(hash);
        req.onsuccess = () => {
          const res = req.result;
          if (res) {
            const stored: StoredAttachment = {
              hash: res.hash,
              blob: new Blob([res.data], { type: res.mimeType }),
              mimeType: res.mimeType,
              filename: res.filename,
              size: res.size,
              createdAt: res.createdAt,
            };
            this.inMemoryCache.set(hash, stored);
            resolve(stored);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Checks if an attachment is present locally
   */
  public async hasAttachment(hash: string): Promise<boolean> {
    if (this.inMemoryCache.has(hash)) return true;
    const item = await this.getAttachment(hash);
    return item !== null;
  }

  /**
   * Splits an attachment into chunked packets for transfer
   */
  public async createChunks(
    hash: string,
    chunkSize: number = CRDT_DEFAULT_CHUNK_SIZE
  ): Promise<{
    item: StoredAttachment;
    totalChunks: number;
    getChunk: (index: number) => { index: number; dataBase64: string };
  } | null> {
    const item = await this.getAttachment(hash);
    if (!item) return null;

    const buffer = await item.blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const totalChunks = Math.ceil(bytes.length / chunkSize) || 1;

    return {
      item,
      totalChunks,
      getChunk: (index: number) => {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, bytes.length);
        const slice = bytes.slice(start, end);
        let binary = '';
        for (let i = 0; i < slice.length; i++) {
          binary += String.fromCharCode(slice[i]);
        }
        return {
          index,
          dataBase64: btoa(binary),
        };
      },
    };
  }

  /**
   * Initiates incoming chunked transfer
   */
  public beginIncomingTransfer(
    hash: string,
    filename: string,
    mimeType: string,
    totalBytes: number,
    totalChunks: number
  ) {
    this.pendingTransfers.set(hash, {
      hash,
      filename,
      mimeType,
      totalBytes,
      totalChunks,
      chunks: new Map(),
      createdAt: Date.now(),
    });
  }

  /**
   * Receives a chunk and saves attachment when all chunks are collected
   */
  public async receiveChunk(
    hash: string,
    chunkIndex: number,
    totalChunks: number,
    dataBase64: string
  ): Promise<{ complete: boolean; attachment?: StoredAttachment }> {
    let pending = this.pendingTransfers.get(hash);
    if (!pending) {
      pending = {
        hash,
        filename: 'attachment.bin',
        mimeType: 'application/octet-stream',
        totalBytes: 0,
        totalChunks,
        chunks: new Map(),
        createdAt: Date.now(),
      };
      this.pendingTransfers.set(hash, pending);
    }

    const binary = atob(dataBase64);
    const chunkBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      chunkBytes[i] = binary.charCodeAt(i);
    }

    pending.chunks.set(chunkIndex, chunkBytes);

    if (pending.chunks.size >= pending.totalChunks) {
      // Reassemble complete binary
      let totalSize = 0;
      for (let i = 0; i < pending.totalChunks; i++) {
        totalSize += pending.chunks.get(i)?.length || 0;
      }

      const combined = new Uint8Array(totalSize);
      let offset = 0;
      for (let i = 0; i < pending.totalChunks; i++) {
        const ch = pending.chunks.get(i);
        if (ch) {
          combined.set(ch, offset);
          offset += ch.length;
        }
      }

      this.pendingTransfers.delete(hash);
      const stored = await this.storeAttachment(combined, pending.filename, pending.mimeType);
      return { complete: true, attachment: stored };
    }

    return { complete: false };
  }

  /**
   * Cleans up stale pending transfers older than 10 minutes
   */
  public cleanStaleTransfers() {
    const now = Date.now();
    for (const [hash, transfer] of this.pendingTransfers.entries()) {
      if (now - transfer.createdAt > 10 * 60 * 1000) {
        this.pendingTransfers.delete(hash);
      }
    }
  }
}

export const crdtAttachmentService = new CRDTAttachmentService();
