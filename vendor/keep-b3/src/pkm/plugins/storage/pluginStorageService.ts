/**
 * Phase P41: Namespaced Plugin Private Storage Service
 * Provides isolated IndexedDB key-value storage bounded by per-plugin quotas (5MB)
 * and integrated with vault locking.
 */

import { PluginId } from '../types';

const DB_NAME = 'keepnotes_pkm_plugin_storage';
const STORE_NAME = 'plugin_kv';
const DB_VERSION = 1;
const DEFAULT_PLUGIN_QUOTA_BYTES = 5 * 1024 * 1024; // 5MB

interface StorageRecord {
  compositeKey: string; // `${pluginId}:${key}`
  pluginId: PluginId;
  key: string;
  value: any;
  sizeBytes: number;
  updatedAt: number;
}

export class PluginStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isVaultLocked = false;

  private async getDb(): Promise<IDBDatabase> {
    if (this.isVaultLocked) {
      throw new Error('Security Error: Cannot access plugin storage while vault is locked.');
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'compositeKey' });
            store.createIndex('by_plugin', 'pluginId', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(new Error(`Failed to open plugin storage database: ${req.error?.message}`));
      });
    }
    return this.dbPromise;
  }

  public setVaultLocked(locked: boolean): void {
    this.isVaultLocked = locked;
    if (locked) {
      this.dbPromise = null;
    }
  }

  public async get(pluginId: PluginId, key: string): Promise<any> {
    const db = await this.getDb();
    const compositeKey = `${pluginId}:${key}`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(compositeKey);
      req.onsuccess = () => {
        const record = req.result as StorageRecord | undefined;
        resolve(record ? record.value : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async set(pluginId: PluginId, key: string, value: any): Promise<void> {
    const db = await this.getDb();
    const compositeKey = `${pluginId}:${key}`;
    const serialized = JSON.stringify(value);
    const sizeBytes = new TextEncoder().encode(serialized).length;

    // Check quota for this plugin
    const currentUsage = await this.getPluginStorageUsage(pluginId);
    const existingVal = await this.get(pluginId, key);
    const existingSize = existingVal ? new TextEncoder().encode(JSON.stringify(existingVal)).length : 0;
    const projectedUsage = currentUsage - existingSize + sizeBytes;

    if (projectedUsage > DEFAULT_PLUGIN_QUOTA_BYTES) {
      throw new Error(
        `Storage Quota Exceeded: Plugin "${pluginId}" has exceeded its 5MB storage limit (attempted ${Math.round(projectedUsage / 1024)}KB).`
      );
    }

    const record: StorageRecord = {
      compositeKey,
      pluginId,
      key,
      value,
      sizeBytes,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async delete(pluginId: PluginId, key: string): Promise<void> {
    const db = await this.getDb();
    const compositeKey = `${pluginId}:${key}`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(compositeKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async listKeys(pluginId: PluginId): Promise<string[]> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('by_plugin');
      const req = index.getAll(pluginId);
      req.onsuccess = () => {
        const records = req.result as StorageRecord[];
        resolve(records.map((r) => r.key));
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async getPluginStorageUsage(pluginId: PluginId): Promise<number> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('by_plugin');
      const req = index.getAll(pluginId);
      req.onsuccess = () => {
        const records = req.result as StorageRecord[];
        const total = records.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
        resolve(total);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async clearPluginStorage(pluginId: PluginId): Promise<void> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('by_plugin');
      const req = index.openCursor(IDBKeyRange.only(pluginId));

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
}

export const pluginStorageService = new PluginStorageService();
