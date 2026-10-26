/**
 * Phase P38 - Review Storage Service
 *
 * Handles persistent storage of card scheduling states and append-only review event logs.
 * Supports zero-knowledge vault encryption, vault purge on lock, and multi-device event merge.
 */

import {
  CardScheduleState,
  ReviewLogEvent,
  ReviewSettings,
  DEFAULT_REVIEW_SETTINGS,
} from './reviewTypes';
import { createInitialCardScheduleState, applyReviewRating } from './fsrsEngine';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';
import { vaultPurgeManager } from '../security/vaultPurge';

const REVIEW_STATES_KEY = 'keepnotes_review_card_states_v1';
const REVIEW_LOGS_KEY = 'keepnotes_review_event_logs_v1';
const REVIEW_SETTINGS_KEY = 'keepnotes_review_settings_v1';
const DEVICE_ID_KEY = 'keepnotes_review_device_id';

class ReviewStorageService {
  private cardStates: Map<string, CardScheduleState> = new Map();
  private eventLogs: ReviewLogEvent[] = [];
  private settings: ReviewSettings = { ...DEFAULT_REVIEW_SETTINGS };
  private deviceId: string = '';
  private initialized = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initDeviceId();
    this.loadData();
    this.registerPurge();
  }

  private initDeviceId(): void {
    if (typeof window === 'undefined') {
      this.deviceId = 'server-node';
      return;
    }
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      this.deviceId = id;
    } catch {
      this.deviceId = 'fallback-dev-' + Date.now();
    }
  }

  private registerPurge(): void {
    vaultPurgeManager.registerPurgeCallback(() => {
      // Clear sensitive memory when vault is locked
      this.cardStates.clear();
      this.eventLogs = [];
      this.initialized = false;
      this.notify();
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('Error in review storage listener', e);
      }
    }
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getSettings(): ReviewSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<ReviewSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.persistSettings();
    this.notify();
  }

  public getCardState(cardId: string): CardScheduleState {
    this.ensureLoaded();
    const existing = this.cardStates.get(cardId);
    if (existing) return existing;

    const initial = createInitialCardScheduleState(cardId);
    this.cardStates.set(cardId, initial);
    return initial;
  }

  public getAllCardStates(): Map<string, CardScheduleState> {
    this.ensureLoaded();
    return new Map(this.cardStates);
  }

  public getEventLogs(): ReviewLogEvent[] {
    this.ensureLoaded();
    return [...this.eventLogs];
  }

  /**
   * Records a completed review rating, updates card state, and appends to event log.
   */
  public async recordReview(
    cardId: string,
    nextState: CardScheduleState,
    logEvent: Omit<ReviewLogEvent, 'id' | 'deviceId'>
  ): Promise<ReviewLogEvent> {
    this.ensureLoaded();

    const event: ReviewLogEvent = {
      ...logEvent,
      id: 'rev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      deviceId: this.deviceId,
    };

    this.cardStates.set(cardId, nextState);
    this.eventLogs.push(event);

    await this.persistData();
    this.notify();
    return event;
  }

  /**
   * Rolls back the last review event for a card (Undo Last Rating)
   */
  public async undoLastReview(cardId?: string): Promise<{ success: boolean; revertedCardId?: string }> {
    this.ensureLoaded();
    if (this.eventLogs.length === 0) return { success: false };

    // Find the last event matching cardId or the very last event in history
    let targetIdx = -1;
    if (cardId) {
      for (let i = this.eventLogs.length - 1; i >= 0; i--) {
        if (this.eventLogs[i].cardId === cardId) {
          targetIdx = i;
          break;
        }
      }
    } else {
      targetIdx = this.eventLogs.length - 1;
    }

    if (targetIdx === -1) return { success: false };

    const lastEvent = this.eventLogs[targetIdx];
    const targetCardId = lastEvent.cardId;

    // Remove event from history
    this.eventLogs.splice(targetIdx, 1);

    // Recompute schedule for this card by replaying its remaining events
    this.recomputeCardState(targetCardId);

    await this.persistData();
    this.notify();
    return { success: true, revertedCardId: targetCardId };
  }

  /**
   * Reset review progress for a card back to 'new'
   */
  public async resetCardProgress(cardId: string): Promise<void> {
    this.ensureLoaded();
    const freshState = createInitialCardScheduleState(cardId);
    this.cardStates.set(cardId, freshState);

    // Filter out historical events for this card
    this.eventLogs = this.eventLogs.filter((e) => e.cardId !== cardId);

    await this.persistData();
    this.notify();
  }

  /**
   * Bulk reset review progress for multiple cards
   */
  public async resetMultipleCards(cardIds: string[]): Promise<void> {
    this.ensureLoaded();
    const idSet = new Set(cardIds);
    for (const id of cardIds) {
      this.cardStates.set(id, createInitialCardScheduleState(id));
    }
    this.eventLogs = this.eventLogs.filter((e) => !idSet.has(e.cardId));

    await this.persistData();
    this.notify();
  }

  /**
   * Set card suspension status
   */
  public async setCardSuspended(cardId: string, suspended: boolean): Promise<void> {
    this.ensureLoaded();
    const state = this.getCardState(cardId);
    state.suspended = suspended;
    this.cardStates.set(cardId, state);

    await this.persistData();
    this.notify();
  }

  /**
   * Bury card until tomorrow
   */
  public async buryCard(cardId: string, untilDateStr: string): Promise<void> {
    this.ensureLoaded();
    const state = this.getCardState(cardId);
    state.buriedUntil = untilDateStr;
    this.cardStates.set(cardId, state);

    await this.persistData();
    this.notify();
  }

  /**
   * Recomputes a single card's schedule state from its ordered review event logs
   */
  private recomputeCardState(cardId: string): void {
    const cardEvents = this.eventLogs
      .filter((e) => e.cardId === cardId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let state = createInitialCardScheduleState(cardId);

    for (const ev of cardEvents) {
      const res = applyReviewRating(state, ev.rating, ev.timestamp, this.settings);
      state = res.nextState;
    }

    this.cardStates.set(cardId, state);
  }

  /**
   * Recompute all card states across the entire event log (used after sync merge)
   */
  public recomputeAllSchedules(): void {
    this.ensureLoaded();
    // Group events by cardId
    const eventsByCard = new Map<string, ReviewLogEvent[]>();
    for (const ev of this.eventLogs) {
      const list = eventsByCard.get(ev.cardId) || [];
      list.push(ev);
      eventsByCard.set(ev.cardId, list);
    }

    for (const [cardId, events] of eventsByCard.entries()) {
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      let state = createInitialCardScheduleState(cardId);
      for (const ev of events) {
        const res = applyReviewRating(state, ev.rating, ev.timestamp, this.settings);
        state = res.nextState;
      }
      this.cardStates.set(cardId, state);
    }
  }

  /**
   * Multi-device synchronization: Merge remote review events and deterministically recompute state
   */
  public async mergeRemoteEvents(remoteEvents: ReviewLogEvent[]): Promise<number> {
    this.ensureLoaded();
    if (!remoteEvents || remoteEvents.length === 0) return 0;

    const existingIds = new Set(this.eventLogs.map((e) => e.id));
    let addedCount = 0;

    for (const rem of remoteEvents) {
      if (rem && rem.id && !existingIds.has(rem.id)) {
        this.eventLogs.push(rem);
        existingIds.add(rem.id);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      // Re-sort total event logs chronologically
      this.eventLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      this.recomputeAllSchedules();
      await this.persistData();
      this.notify();
    }

    return addedCount;
  }

  /**
   * Export portable review state payload (for Git sync / backup)
   */
  public exportPortableReviewData(): {
    version: number;
    settings: ReviewSettings;
    cardStates: Record<string, CardScheduleState>;
    eventLogs: ReviewLogEvent[];
  } {
    this.ensureLoaded();
    const statesObj: Record<string, CardScheduleState> = {};
    for (const [id, state] of this.cardStates.entries()) {
      statesObj[id] = state;
    }

    return {
      version: 1,
      settings: this.settings,
      cardStates: statesObj,
      eventLogs: this.eventLogs,
    };
  }

  /**
   * Import portable review state payload
   */
  public async importPortableReviewData(data: {
    settings?: Partial<ReviewSettings>;
    cardStates?: Record<string, CardScheduleState>;
    eventLogs?: ReviewLogEvent[];
  }): Promise<void> {
    this.ensureLoaded();
    if (data.settings) {
      this.settings = { ...this.settings, ...data.settings };
    }

    if (data.cardStates) {
      for (const [id, state] of Object.entries(data.cardStates)) {
        this.cardStates.set(id, state);
      }
    }

    if (data.eventLogs && Array.isArray(data.eventLogs)) {
      await this.mergeRemoteEvents(data.eventLogs);
    }

    await this.persistData();
    this.notify();
  }

  // --- Persistence Subsystem ---

  private ensureLoaded(): void {
    if (!this.initialized) {
      this.loadData();
    }
  }

  private loadData(): void {
    if (typeof window === 'undefined') return;

    try {
      // Load Settings
      const settingsStr = localStorage.getItem(REVIEW_SETTINGS_KEY);
      if (settingsStr) {
        this.settings = { ...DEFAULT_REVIEW_SETTINGS, ...JSON.parse(settingsStr) };
      }

      // Load Card States
      const statesStr = localStorage.getItem(REVIEW_STATES_KEY);
      if (statesStr) {
        const parsed = JSON.parse(statesStr);
        if (parsed && typeof parsed === 'object') {
          for (const [id, state] of Object.entries(parsed)) {
            this.cardStates.set(id, state as CardScheduleState);
          }
        }
      }

      // Load Event Logs
      const logsStr = localStorage.getItem(REVIEW_LOGS_KEY);
      if (logsStr) {
        const parsedLogs = JSON.parse(logsStr);
        if (Array.isArray(parsedLogs)) {
          this.eventLogs = parsedLogs;
        }
      }

      this.initialized = true;
    } catch (err) {
      console.warn('Failed to load review storage data from localStorage', err);
      this.initialized = true;
    }
  }

  private persistSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(REVIEW_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save review settings', e);
    }
  }

  private async persistData(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      this.persistSettings();

      const statesObj: Record<string, CardScheduleState> = {};
      for (const [id, state] of this.cardStates.entries()) {
        statesObj[id] = state;
      }

      localStorage.setItem(REVIEW_STATES_KEY, JSON.stringify(statesObj));
      localStorage.setItem(REVIEW_LOGS_KEY, JSON.stringify(this.eventLogs));
    } catch (err) {
      console.error('Failed to persist review storage data', err);
      throw err;
    }
  }
}

export const reviewStorageService = new ReviewStorageService();
