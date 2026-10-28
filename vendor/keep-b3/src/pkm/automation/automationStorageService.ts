/**
 * Phase P36: Automation Storage Service
 * High-performance, durable IndexedDB persistence for rules, occurrence receipts, logs, and suggestions.
 */

import {
  AutomationRule,
  OccurrenceRecord,
  AutomationLogEntry,
  AutomationSuggestion,
  MAX_LOG_ENTRIES,
} from './automationTypes';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';

const DB_NAME = 'KeepNotes_Automations_DB';
const DB_VERSION = 1;
const STORE_RULES = 'rules';
const STORE_OCCURRENCES = 'occurrences';
const STORE_LOGS = 'logs';
const STORE_SUGGESTIONS = 'suggestions';
const STORE_META = 'meta';

const LOCAL_STORAGE_RULES_KEY = 'keepnotes_automation_rules_v1';
const LOCAL_STORAGE_OCCURRENCES_KEY = 'keepnotes_automation_occurrences_v1';
const LOCAL_STORAGE_LOGS_KEY = 'keepnotes_automation_logs_v1';
const LOCAL_STORAGE_PAUSED_KEY = 'keepnotes_automation_paused_v1';

class AutomationStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_RULES)) {
          db.createObjectStore(STORE_RULES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_OCCURRENCES)) {
          const store = db.createObjectStore(STORE_OCCURRENCES, { keyPath: 'id' });
          store.createIndex('ruleId', 'ruleId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_LOGS)) {
          const logStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('ruleId', 'ruleId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SUGGESTIONS)) {
          db.createObjectStore(STORE_SUGGESTIONS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Rules Storage ---

  public async loadRules(): Promise<AutomationRule[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_RULES, 'readonly');
        const store = tx.objectStore(STORE_RULES);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result as AutomationRule[]) || [];
          resolve(items);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
        if (raw) return JSON.parse(raw);
      } catch (err) {}
      return [];
    }
  }

  public async saveRule(rule: AutomationRule): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_RULES, 'readwrite');
        const store = tx.objectStore(STORE_RULES);
        const req = store.put(rule);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      // Fallback
      const rules = await this.loadRules();
      const idx = rules.findIndex((r) => r.id === rule.id);
      if (idx >= 0) rules[idx] = rule;
      else rules.push(rule);
      localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(rules));
    }
  }

  public async saveAllRules(rules: AutomationRule[]): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_RULES, 'readwrite');
        const store = tx.objectStore(STORE_RULES);
        store.clear();
        for (const r of rules) {
          store.put(r);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(rules));
    }
  }

  public async deleteRule(ruleId: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_RULES, 'readwrite');
        const store = tx.objectStore(STORE_RULES);
        const req = store.delete(ruleId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      const rules = await this.loadRules();
      const updated = rules.filter((r) => r.id !== ruleId);
      localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(updated));
    }
  }

  // --- Scheduled Occurrence Receipts (Idempotency) ---

  public async getOccurrence(id: string): Promise<OccurrenceRecord | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_OCCURRENCES, 'readonly');
        const store = tx.objectStore(STORE_OCCURRENCES);
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as OccurrenceRecord) || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_OCCURRENCES_KEY);
        if (raw) {
          const map = JSON.parse(raw);
          return map[id] || null;
        }
      } catch (err) {}
      return null;
    }
  }

  public async recordOccurrence(occurrence: OccurrenceRecord): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_OCCURRENCES, 'readwrite');
        const store = tx.objectStore(STORE_OCCURRENCES);
        const req = store.put(occurrence);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_OCCURRENCES_KEY);
        const map = raw ? JSON.parse(raw) : {};
        map[occurrence.id] = occurrence;
        localStorage.setItem(LOCAL_STORAGE_OCCURRENCES_KEY, JSON.stringify(map));
      } catch (err) {}
    }
  }

  public async listOccurrencesForRule(ruleId: string): Promise<OccurrenceRecord[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_OCCURRENCES, 'readonly');
        const store = tx.objectStore(STORE_OCCURRENCES);
        const index = store.index('ruleId');
        const req = index.getAll(ruleId);
        req.onsuccess = () => resolve((req.result as OccurrenceRecord[]) || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return [];
    }
  }

  // --- Execution Logs (Bounded Ring Buffer) ---

  public async loadLogs(): Promise<AutomationLogEntry[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_LOGS, 'readonly');
        const store = tx.objectStore(STORE_LOGS);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result as AutomationLogEntry[]) || [];
          items.sort((a, b) => b.timestamp - a.timestamp);
          resolve(items.slice(0, MAX_LOG_ENTRIES));
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
        if (raw) return JSON.parse(raw);
      } catch (err) {}
      return [];
    }
  }

  public async appendLog(entry: AutomationLogEntry): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_LOGS, 'readwrite');
        const store = tx.objectStore(STORE_LOGS);
        store.put(entry);

        // Prune if exceeds limit
        const countReq = store.count();
        countReq.onsuccess = () => {
          if (countReq.result > MAX_LOG_ENTRIES + 20) {
            const index = store.index('timestamp');
            const openCursorReq = index.openCursor();
            let deleted = 0;
            const toDelete = countReq.result - MAX_LOG_ENTRIES;

            openCursorReq.onsuccess = () => {
              const cursor = openCursorReq.result;
              if (cursor && deleted < toDelete) {
                cursor.delete();
                deleted++;
                cursor.continue();
              }
            };
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      try {
        const logs = await this.loadLogs();
        logs.unshift(entry);
        const sliced = logs.slice(0, MAX_LOG_ENTRIES);
        localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(sliced));
      } catch (err) {}
    }
  }

  public async clearLogs(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_LOGS, 'readwrite');
        const store = tx.objectStore(STORE_LOGS);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
    }
  }

  // --- Suggestions ---

  public async loadSuggestions(): Promise<AutomationSuggestion[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SUGGESTIONS, 'readonly');
        const store = tx.objectStore(STORE_SUGGESTIONS);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as AutomationSuggestion[]) || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return [];
    }
  }

  public async saveSuggestion(suggestion: AutomationSuggestion): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SUGGESTIONS, 'readwrite');
        const store = tx.objectStore(STORE_SUGGESTIONS);
        const req = store.put(suggestion);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {}
  }

  public async deleteSuggestion(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SUGGESTIONS, 'readwrite');
        const store = tx.objectStore(STORE_SUGGESTIONS);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {}
  }

  public async dismissSuggestion(id: string): Promise<void> {
    return this.deleteSuggestion(id);
  }

  public async clearSuggestions(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SUGGESTIONS, 'readwrite');
        const store = tx.objectStore(STORE_SUGGESTIONS);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {}
  }

  // --- Master Pause State ---

  public async isPaused(): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_META, 'readonly');
        const store = tx.objectStore(STORE_META);
        const req = store.get('is_paused');
        req.onsuccess = () => {
          if (req.result && req.result.value !== undefined) {
            resolve(Boolean(req.result.value));
          } else {
            resolve(localStorage.getItem(LOCAL_STORAGE_PAUSED_KEY) === 'true');
          }
        };
        req.onerror = () => resolve(localStorage.getItem(LOCAL_STORAGE_PAUSED_KEY) === 'true');
      });
    } catch (e) {
      return localStorage.getItem(LOCAL_STORAGE_PAUSED_KEY) === 'true';
    }
  }

  public async setPaused(paused: boolean): Promise<void> {
    localStorage.setItem(LOCAL_STORAGE_PAUSED_KEY, String(paused));
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_META, 'readwrite');
        const store = tx.objectStore(STORE_META);
        const req = store.put({ key: 'is_paused', value: paused, updatedAt: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {}
  }
}

export const automationStorageService = new AutomationStorageService();
