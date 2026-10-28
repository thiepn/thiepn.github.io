/**
 * Phase P29: Atomic IndexedDB Multi-Store Transactions
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { vaultEncryptionService } from '../encryption';

const DB_NAME = 'KeepNotesDB';
const STORE_NOTES = 'notes';
const STORE_FOLDERS = 'folders';
const STORE_SEARCHES = 'saved_searches';
const STORE_SETTINGS = 'settings';

export interface AtomicWriteBatch {
  notesToPut?: Note[];
  noteIdsToDelete?: string[];
  foldersToPut?: Folder[];
  folderIdsToDelete?: string[];
  searchesToPut?: SavedSearch[];
  searchIdsToDelete?: string[];
  settingsToPut?: AppSettings;
}

export interface TransactionExecutionResult {
  success: boolean;
  notesCommitted: number;
  foldersCommitted: number;
  searchesCommitted: number;
  durationMs: number;
  error?: Error;
}

export class AtomicTransactionService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in current environment'));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Pre-encrypts records before opening the IndexedDB transaction
   * to keep the storage transaction ultra-short and non-blocking.
   */
  private async prepareRecordForPut<T>(
    id: string,
    type: 'note' | 'folder' | 'saved_search',
    item: T
  ): Promise<any> {
    if (vaultEncryptionService.isEncryptionEnabled() && vaultEncryptionService.isVaultUnlocked()) {
      return await vaultEncryptionService.encryptRecord(id, type, item);
    }
    return item;
  }

  /**
   * Executes an atomic multi-store write batch.
   * If any write fails, the whole transaction is aborted automatically.
   */
  async executeAtomicBatch(batch: AtomicWriteBatch): Promise<TransactionExecutionResult> {
    const startTime = performance.now();

    // 1. Prepare and pre-encrypt all records BEFORE opening transaction
    const preparedNotes: any[] = [];
    if (batch.notesToPut && batch.notesToPut.length > 0) {
      for (const n of batch.notesToPut) {
        preparedNotes.push(await this.prepareRecordForPut(n.id, 'note', n));
      }
    }

    const preparedFolders: any[] = [];
    if (batch.foldersToPut && batch.foldersToPut.length > 0) {
      for (const f of batch.foldersToPut) {
        preparedFolders.push(await this.prepareRecordForPut(f.id, 'folder', f));
      }
    }

    const preparedSearches: any[] = [];
    if (batch.searchesToPut && batch.searchesToPut.length > 0) {
      for (const s of batch.searchesToPut) {
        preparedSearches.push(await this.prepareRecordForPut(s.id, 'saved_search', s));
      }
    }

    // 2. Identify all required stores
    const storesNeeded = new Set<string>();
    if (preparedNotes.length > 0 || (batch.noteIdsToDelete && batch.noteIdsToDelete.length > 0)) {
      storesNeeded.add(STORE_NOTES);
    }
    if (preparedFolders.length > 0 || (batch.folderIdsToDelete && batch.folderIdsToDelete.length > 0)) {
      storesNeeded.add(STORE_FOLDERS);
    }
    if (preparedSearches.length > 0 || (batch.searchIdsToDelete && batch.searchIdsToDelete.length > 0)) {
      storesNeeded.add(STORE_SEARCHES);
    }
    if (batch.settingsToPut) {
      storesNeeded.add(STORE_SETTINGS);
    }

    if (storesNeeded.size === 0) {
      return {
        success: true,
        notesCommitted: 0,
        foldersCommitted: 0,
        searchesCommitted: 0,
        durationMs: 0,
      };
    }

    try {
      const db = await this.getDB();
      const storeNamesArray = Array.from(storesNeeded);
      const tx = db.transaction(storeNamesArray, 'readwrite');

      // Notes
      if (storesNeeded.has(STORE_NOTES)) {
        const noteStore = tx.objectStore(STORE_NOTES);
        for (const record of preparedNotes) {
          noteStore.put(record);
        }
        for (const delId of batch.noteIdsToDelete || []) {
          noteStore.delete(delId);
        }
      }

      // Folders
      if (storesNeeded.has(STORE_FOLDERS)) {
        const folderStore = tx.objectStore(STORE_FOLDERS);
        for (const record of preparedFolders) {
          folderStore.put(record);
        }
        for (const delId of batch.folderIdsToDelete || []) {
          folderStore.delete(delId);
        }
      }

      // Searches
      if (storesNeeded.has(STORE_SEARCHES)) {
        const searchStore = tx.objectStore(STORE_SEARCHES);
        for (const record of preparedSearches) {
          searchStore.put(record);
        }
        for (const delId of batch.searchIdsToDelete || []) {
          searchStore.delete(delId);
        }
      }

      // Settings
      if (storesNeeded.has(STORE_SETTINGS) && batch.settingsToPut) {
        const settingsStore = tx.objectStore(STORE_SETTINGS);
        settingsStore.put({ key: 'app_settings', value: batch.settingsToPut });
      }

      // Await atomic commit or abort
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Transaction failed'));
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });

      return {
        success: true,
        notesCommitted: preparedNotes.length + (batch.noteIdsToDelete?.length || 0),
        foldersCommitted: preparedFolders.length + (batch.folderIdsToDelete?.length || 0),
        searchesCommitted: preparedSearches.length + (batch.searchIdsToDelete?.length || 0),
        durationMs: performance.now() - startTime,
      };
    } catch (err: any) {
      console.error('Atomic IndexedDB transaction aborted:', err);
      return {
        success: false,
        notesCommitted: 0,
        foldersCommitted: 0,
        searchesCommitted: 0,
        durationMs: performance.now() - startTime,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  /**
   * Atomic Note Extraction:
   * Writes the newly extracted target note AND updates the source note in ONE transaction.
   */
  async executeAtomicExtraction(
    sourceNote: Note,
    targetNote: Note
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.executeAtomicBatch({
      notesToPut: [sourceNote, targetNote],
    });

    if (!result.success) {
      return { success: false, error: result.error?.message || 'Extraction transaction failed' };
    }
    return { success: true };
  }

  /**
   * Atomic Bulk Note Updates:
   * Safely updates dozens or hundreds of notes in one transaction.
   */
  async executeAtomicBulkNotes(notes: Note[]): Promise<{ success: boolean; error?: string }> {
    const result = await this.executeAtomicBatch({
      notesToPut: notes,
    });
    if (!result.success) {
      return { success: false, error: result.error?.message || 'Bulk note update transaction failed' };
    }
    return { success: true };
  }
}

export const atomicTransactionService = new AtomicTransactionService();
export const atomicTransactions = atomicTransactionService;
