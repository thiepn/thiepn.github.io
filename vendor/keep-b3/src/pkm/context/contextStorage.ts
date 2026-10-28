/**
 * Phase P59 - Context Storage & State Persistence
 * Handles custom contexts, context pins, resume checkpoints, attention acknowledgements,
 * and secure memory purging on vault lock.
 */

import {
  CustomContextDefinition,
  ContextResumeState,
  WorkingSetItem,
} from './contextTypes';

const CUSTOM_CONTEXTS_KEY = 'pkm_custom_contexts_v1';
const CONTEXT_PINS_KEY = 'pkm_context_pins_v1';
const CONTEXT_RESUME_KEY = 'pkm_context_resume_v1';
const ATTENTION_ACKS_KEY = 'pkm_attention_acks_v1';
const CONTEXT_REVIEW_CURSORS_KEY = 'pkm_context_review_cursors_v1';
const ACTIVE_CONTEXT_KEY = 'pkm_active_context_state_v1';

class ContextStorageService {
  private inMemoryCustomContexts: Map<string, CustomContextDefinition> = new Map();
  private inMemoryPins: Map<string, WorkingSetItem[]> = new Map();
  private inMemoryResumeStates: Map<string, ContextResumeState> = new Map();
  private inMemoryAttentionAcks: Map<string, string> = new Map(); // attentionId -> ISO snooze date
  private inMemoryReviewCursors: Map<string, number> = new Map(); // contextId -> timestamp
  private isLoaded = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      // 1. Custom Contexts
      const customRaw = localStorage.getItem(CUSTOM_CONTEXTS_KEY);
      if (customRaw) {
        const arr: CustomContextDefinition[] = JSON.parse(customRaw);
        this.inMemoryCustomContexts.clear();
        arr.forEach((c) => this.inMemoryCustomContexts.set(c.id, c));
      }

      // 2. Pins
      const pinsRaw = localStorage.getItem(CONTEXT_PINS_KEY);
      if (pinsRaw) {
        const obj: Record<string, WorkingSetItem[]> = JSON.parse(pinsRaw);
        this.inMemoryPins.clear();
        Object.entries(obj).forEach(([ctxId, items]) => {
          this.inMemoryPins.set(ctxId, items);
        });
      }

      // 3. Resume states
      const resumeRaw = localStorage.getItem(CONTEXT_RESUME_KEY);
      if (resumeRaw) {
        const arr: ContextResumeState[] = JSON.parse(resumeRaw);
        this.inMemoryResumeStates.clear();
        arr.forEach((r) => this.inMemoryResumeStates.set(r.contextId, r));
      }

      // 4. Attention Acks
      const acksRaw = localStorage.getItem(ATTENTION_ACKS_KEY);
      if (acksRaw) {
        const acks: Record<string, string> = JSON.parse(acksRaw);
        this.inMemoryAttentionAcks.clear();
        Object.entries(acks).forEach(([id, dateStr]) => {
          this.inMemoryAttentionAcks.set(id, dateStr);
        });
      }

      // 5. Review cursors
      const cursorsRaw = localStorage.getItem(CONTEXT_REVIEW_CURSORS_KEY);
      if (cursorsRaw) {
        const cursors: Record<string, number> = JSON.parse(cursorsRaw);
        this.inMemoryReviewCursors.clear();
        Object.entries(cursors).forEach(([id, ts]) => {
          this.inMemoryReviewCursors.set(id, ts);
        });
      }

      this.isLoaded = true;
    } catch (e) {
      console.warn('[ContextStorage] Failed to load local storage state:', e);
    }
  }

  // --- Custom Contexts ---
  public getCustomContexts(): CustomContextDefinition[] {
    if (!this.isLoaded) this.loadFromStorage();
    return Array.from(this.inMemoryCustomContexts.values());
  }

  public getCustomContext(id: string): CustomContextDefinition | undefined {
    if (!this.isLoaded) this.loadFromStorage();
    return this.inMemoryCustomContexts.get(id);
  }

  public saveCustomContext(def: CustomContextDefinition): void {
    this.inMemoryCustomContexts.set(def.id, def);
    this.persistCustomContexts();
  }

  public deleteCustomContext(id: string): void {
    this.inMemoryCustomContexts.delete(id);
    this.persistCustomContexts();
  }

  private persistCustomContexts() {
    try {
      const arr = Array.from(this.inMemoryCustomContexts.values());
      localStorage.setItem(CUSTOM_CONTEXTS_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('[ContextStorage] Persist custom contexts error:', e);
    }
  }

  // --- Context Pins ---
  public getPinsForContext(contextId: string): WorkingSetItem[] {
    if (!this.isLoaded) this.loadFromStorage();
    return this.inMemoryPins.get(contextId) || [];
  }

  public pinResource(contextId: string, item: WorkingSetItem): void {
    const list = this.getPinsForContext(contextId);
    const existingIdx = list.findIndex((i) => i.id === item.id || (i.resourceId === item.resourceId && i.resourceType === item.resourceType));
    const updated = [...list];
    const pinnedItem: WorkingSetItem = { ...item, isPinned: true, relevanceType: 'pinned', relevanceExplanation: 'Pinned by user to this Context' };
    if (existingIdx >= 0) {
      updated[existingIdx] = pinnedItem;
    } else {
      updated.push(pinnedItem);
    }
    this.inMemoryPins.set(contextId, updated);
    this.persistPins();
  }

  public unpinResource(contextId: string, resourceId: string): void {
    const list = this.getPinsForContext(contextId);
    const updated = list.filter((i) => i.id !== resourceId && i.resourceId !== resourceId);
    this.inMemoryPins.set(contextId, updated);
    this.persistPins();
  }

  private persistPins() {
    try {
      const obj: Record<string, WorkingSetItem[]> = {};
      this.inMemoryPins.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(CONTEXT_PINS_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('[ContextStorage] Persist pins error:', e);
    }
  }

  // --- Resume Checkpoints ---
  public saveResumeState(state: ContextResumeState): void {
    this.inMemoryResumeStates.set(state.contextId, state);
    this.persistResumeStates();
  }

  public getResumeState(contextId: string): ContextResumeState | undefined {
    if (!this.isLoaded) this.loadFromStorage();
    return this.inMemoryResumeStates.get(contextId);
  }

  public getRecentResumeStates(limit = 6): ContextResumeState[] {
    if (!this.isLoaded) this.loadFromStorage();
    return Array.from(this.inMemoryResumeStates.values())
      .sort((a, b) => b.lastWorkedOn - a.lastWorkedOn)
      .slice(0, limit);
  }

  public removeResumeState(contextId: string): void {
    this.inMemoryResumeStates.delete(contextId);
    this.persistResumeStates();
  }

  private persistResumeStates() {
    try {
      // Keep only top 20 most recent resume states
      const arr = Array.from(this.inMemoryResumeStates.values())
        .sort((a, b) => b.lastWorkedOn - a.lastWorkedOn)
        .slice(0, 20);
      localStorage.setItem(CONTEXT_RESUME_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('[ContextStorage] Persist resume error:', e);
    }
  }

  // --- Attention Acknowledged / Snoozed ---
  public snoozeAttentionItem(attentionId: string, untilIsoDate: string): void {
    this.inMemoryAttentionAcks.set(attentionId, untilIsoDate);
    this.persistAttentionAcks();
  }

  public isAttentionSnoozed(attentionId: string): boolean {
    const until = this.inMemoryAttentionAcks.get(attentionId);
    if (!until) return false;
    const now = new Date().toISOString();
    return until > now;
  }

  public clearAttentionSnooze(attentionId: string): void {
    this.inMemoryAttentionAcks.delete(attentionId);
    this.persistAttentionAcks();
  }

  private persistAttentionAcks() {
    try {
      const obj: Record<string, string> = {};
      this.inMemoryAttentionAcks.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(ATTENTION_ACKS_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('[ContextStorage] Persist attention acks error:', e);
    }
  }

  // --- Review Cursors ("What Changed?") ---
  public getReviewCursor(contextId: string): number {
    return this.inMemoryReviewCursors.get(contextId) || (Date.now() - 7 * 24 * 3600 * 1000);
  }

  public setReviewCursor(contextId: string, timestamp: number = Date.now()): void {
    this.inMemoryReviewCursors.set(contextId, timestamp);
    try {
      const obj: Record<string, number> = {};
      this.inMemoryReviewCursors.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(CONTEXT_REVIEW_CURSORS_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('[ContextStorage] Persist review cursors error:', e);
    }
  }

  // --- Vault Lock Security Purge ---
  public purgeSensitiveMemoryOnLock(): void {
    // Clear ephemeral in-memory state so nothing leaks during vault lock
    this.inMemoryResumeStates.clear();
    this.inMemoryReviewCursors.clear();
    try {
      localStorage.removeItem(ACTIVE_CONTEXT_KEY);
    } catch (_) {}
  }
}

export const contextStorage = new ContextStorageService();
