/**
 * Phase P29: Persistent Recovery Journal for Multi-Step & Long Operations
 */

import {
  JournalOperationEntry,
  JournalOperationType,
  JournalOperationStatus,
} from './resilienceTypes';

const JOURNAL_STORAGE_KEY = 'keepnotes_recovery_journal_v1';
const JOURNAL_DB_NAME = 'KeepNotes_Journal_DB';
const JOURNAL_STORE_NAME = 'operations';

export class RecoveryJournalService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private activeOperations: Map<string, JournalOperationEntry> = new Map();
  private listeners: Set<(entries: JournalOperationEntry[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }
      const request = indexedDB.open(JOURNAL_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(JOURNAL_STORE_NAME)) {
          db.createObjectStore(JOURNAL_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public subscribe(listener: (entries: JournalOperationEntry[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllEntries());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const list = this.getAllEntries();
    for (const l of this.listeners) {
      try {
        l(list);
      } catch (err) {
        console.error('Error in journal listener:', err);
      }
    }
  }

  private loadFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              this.activeOperations.set(item.id, item);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse recovery journal from localStorage:', e);
    }
  }

  private persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        const list = Array.from(this.activeOperations.values());
        localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(list));
      }
      // Also persist to IndexedDB asynchronously
      this.getDB()
        .then((db) => {
          const tx = db.transaction(JOURNAL_STORE_NAME, 'readwrite');
          const store = tx.objectStore(JOURNAL_STORE_NAME);
          store.clear();
          for (const item of this.activeOperations.values()) {
            store.put(item);
          }
        })
        .catch(() => {});
    } catch {
      // ignore
    }
    this.notify();
  }

  public getAllEntries(): JournalOperationEntry[] {
    return Array.from(this.activeOperations.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  public getUnfinishedOperations(): JournalOperationEntry[] {
    return this.getAllEntries().filter(
      (entry) =>
        entry.status === 'prepared' ||
        entry.status === 'running' ||
        entry.status === 'committing' ||
        entry.status === 'recovery-required'
    );
  }

  /**
   * Prepares a new journal entry before any mutation is performed
   */
  public prepareOperation(
    type: JournalOperationType,
    title: string,
    options: {
      description?: string;
      totalRecords?: number;
      affectedNoteIds?: string[];
      checkpointData?: any;
      rollbackPlan?: JournalOperationEntry['rollbackPlan'];
    } = {}
  ): JournalOperationEntry {
    const now = Date.now();
    const entry: JournalOperationEntry = {
      id: `journal-${now}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      description: options.description,
      status: 'prepared',
      startedAt: now,
      updatedAt: now,
      totalRecords: options.totalRecords || 0,
      processedRecords: 0,
      affectedNoteIds: options.affectedNoteIds || [],
      checkpointData: options.checkpointData,
      rollbackPlan: options.rollbackPlan,
    };

    this.activeOperations.set(entry.id, entry);
    this.persist();
    return entry;
  }

  /**
   * Transitions status to running and tracks incremental progress
   */
  public updateProgress(
    operationId: string,
    processedRecords: number,
    status: JournalOperationStatus = 'running'
  ) {
    const entry = this.activeOperations.get(operationId);
    if (!entry) return;

    entry.processedRecords = processedRecords;
    entry.status = status;
    entry.updatedAt = Date.now();
    this.persist();
  }

  /**
   * Marks operation completed safely
   */
  public completeOperation(operationId: string) {
    const entry = this.activeOperations.get(operationId);
    if (!entry) return;

    entry.status = 'completed';
    entry.completedAt = Date.now();
    entry.updatedAt = Date.now();
    this.persist();
  }

  /**
   * Marks operation failed and flags whether recovery is needed
   */
  public failOperation(
    operationId: string,
    errorMessage: string,
    needsRecovery = true
  ) {
    const entry = this.activeOperations.get(operationId);
    if (!entry) return;

    entry.status = needsRecovery ? 'recovery-required' : 'failed';
    entry.errorMessage = errorMessage;
    entry.updatedAt = Date.now();
    this.persist();
  }

  /**
   * Cleans up finished or acknowledged journal records
   */
  public pruneOperation(operationId: string) {
    this.activeOperations.delete(operationId);
    this.persist();
  }

  /**
   * Scans for unfinished operations on app startup
   */
  public scanAndRecover(): {
    interrupted: JournalOperationEntry[];
    hasInterruptedWork: boolean;
  } {
    const unfinished = this.getUnfinishedOperations();
    for (const op of unfinished) {
      if (op.status === 'running' || op.status === 'committing') {
        op.status = 'recovery-required';
        op.updatedAt = Date.now();
      }
    }
    if (unfinished.length > 0) {
      this.persist();
    }
    return {
      interrupted: unfinished,
      hasInterruptedWork: unfinished.length > 0,
    };
  }
}

export const recoveryJournal = new RecoveryJournalService();
