/**
 * Phase P32: P2P Staging Buffer & Two-Phase Transaction Safety
 * Stages incoming resources in an isolated temporary store before atomic commit.
 */

import {
  P2PResourceType,
  P2PResourcePayload,
} from './p2pTypes';
import { computeSHA256Hex } from './p2pCrypto';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';

const STAGING_DB_NAME = 'KeepNotes_P2PStaging_DB';
const STAGING_STORE_NAME = 'staged_resources';

export interface StagedItem {
  id: string;
  type: P2PResourceType;
  logicalVersion: number;
  contentHash: string;
  updatedAt: string;
  payloadJson: string; // Serialized JSON of canonical data
  stagedAt: string;
  verified: boolean;
}

export class P2PStagingService {
  private memoryStore: Map<string, StagedItem> = new Map();
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.init();
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof window === 'undefined' || !window.indexedDB) return null;

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(STAGING_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STAGING_STORE_NAME)) {
            db.createObjectStore(STAGING_STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private async init() {
    try {
      const db = await this.getDB();
      if (!db) return;
      const tx = db.transaction(STAGING_STORE_NAME, 'readonly');
      const store = tx.objectStore(STAGING_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        if (Array.isArray(req.result)) {
          for (const item of req.result) {
            this.memoryStore.set(item.id, item);
          }
        }
      };
    } catch {}
  }

  /**
   * Checks if device has sufficient storage space before staging large sync batches
   */
  public async checkStorageQuota(requiredBytes: number): Promise<{
    hasSpace: boolean;
    availableBytes?: number;
    quotaBytes?: number;
  }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        const available = Math.max(0, quota - usage);

        if (available > 0 && available < requiredBytes + 10 * 1024 * 1024) {
          // Less than required + 10 MB safety margin
          return { hasSpace: false, availableBytes: available, quotaBytes: quota };
        }
        return { hasSpace: true, availableBytes: available, quotaBytes: quota };
      } catch {}
    }
    return { hasSpace: true };
  }

  /**
   * Stages an incoming verified resource into temporary staging
   */
  public async stageResource(payload: P2PResourcePayload): Promise<boolean> {
    // Validate schema
    if (!payload.id || !payload.type || !payload.contentHash) {
      throw new Error(`Malformed resource payload: missing required fields`);
    }

    const payloadJson = JSON.stringify(payload.data);

    // If vault is encrypted, ensure we do not stage plain sensitive data in unsafe persistent storage
    const isEncrypted = vaultEncryptionService.isVaultEncrypted();

    const stagedItem: StagedItem = {
      id: payload.id,
      type: payload.type,
      logicalVersion: payload.logicalVersion,
      contentHash: payload.contentHash,
      updatedAt: payload.updatedAt,
      payloadJson,
      stagedAt: new Date().toISOString(),
      verified: true,
    };

    this.memoryStore.set(payload.id, stagedItem);

    // Persist to IDB if not encrypted or in memory-only mode
    if (!isEncrypted) {
      try {
        const db = await this.getDB();
        if (db) {
          const tx = db.transaction(STAGING_STORE_NAME, 'readwrite');
          const store = tx.objectStore(STAGING_STORE_NAME);
          store.put(stagedItem);
        }
      } catch (e) {
        console.warn('Could not persist staged item to IndexedDB:', e);
      }
    }

    return true;
  }

  /**
   * Retrieves all currently staged items
   */
  public getAllStaged(): StagedItem[] {
    return Array.from(this.memoryStore.values());
  }

  /**
   * Clears the staging store completely (e.g. on commit completion or cancellation)
   */
  public async clearStaging(): Promise<void> {
    this.memoryStore.clear();
    try {
      const db = await this.getDB();
      if (db) {
        const tx = db.transaction(STAGING_STORE_NAME, 'readwrite');
        const store = tx.objectStore(STAGING_STORE_NAME);
        store.clear();
      }
    } catch {}
  }
}

export const p2pStagingService = new P2PStagingService();
