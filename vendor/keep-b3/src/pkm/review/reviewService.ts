/**
 * Phase P38 - Spaced Repetition Review Service
 *
 * Primary coordinator for review sessions, queue generation, rating commits,
 * practice mode, sibling burying, undo management, and learning analytics.
 */

import { Note } from '../../types';
import {
  ReviewCard,
  CardScheduleState,
  ReviewRating,
  ReviewFilterScope,
  RatingPreview,
  ReviewQueueSummary,
  ReviewAnalyticsData,
  ReviewSettings,
} from './reviewTypes';
import { cardIndex } from './cardIndex';
import { reviewStorageService } from './reviewStorageService';
import {
  applyReviewRating,
  getRatingPreviews,
  calculateRetrievability,
} from './fsrsEngine';
import { gamificationEngine } from '../gamification';

export interface ActiveReviewItem {
  card: ReviewCard;
  state: CardScheduleState;
  previews: RatingPreview[];
}

class ReviewService {
  private listeners: Set<() => void> = new Set();
  private sessionUndoStack: Array<{ cardId: string; previousState: CardScheduleState }> = [];

  constructor() {
    reviewStorageService.subscribe(() => this.notify());
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
        console.error('Error in review service listener', e);
      }
    }
  }

  /**
   * Sync and index notes into card index
   */
  public syncNotes(notes: Note[]): void {
    cardIndex.rebuild(notes);
    this.notify();
  }

  public getSettings(): ReviewSettings {
    return reviewStorageService.getSettings();
  }

  public updateSettings(settings: Partial<ReviewSettings>): void {
    reviewStorageService.updateSettings(settings);
  }

  /**
   * Builds an ordered list of review items for an active session
   */
  public buildReviewQueue(scope: ReviewFilterScope = {}): ActiveReviewItem[] {
    const allCards = this.getScopedCards(scope);
    const settings = this.getSettings();
    const now = new Date();
    const nowIso = now.toISOString();
    const todayDateStr = now.toISOString().slice(0, 10);

    // If Practice Mode is enabled, return all cards (or random sample) without FSRS due restrictions
    if (scope.practiceMode) {
      return allCards.map((card) => {
        const state = reviewStorageService.getCardState(card.id);
        const previews = getRatingPreviews(state, nowIso, settings);
        return { card, state, previews };
      });
    }

    const learningItems: ActiveReviewItem[] = [];
    const dueReviewItems: ActiveReviewItem[] = [];
    const newItems: ActiveReviewItem[] = [];

    // Count how many new cards were already introduced today
    const eventLogs = reviewStorageService.getEventLogs();
    const newStudiedTodayCount = new Set(
      eventLogs
        .filter((ev) => ev.timestamp.startsWith(todayDateStr) && ev.previousState === 'new')
        .map((ev) => ev.cardId)
    ).size;

    const remainingNewQuota = Math.max(0, settings.dailyNewLimit - newStudiedTodayCount);

    for (const card of allCards) {
      const state = reviewStorageService.getCardState(card.id);

      // Skip suspended cards
      if (state.suspended) continue;

      // Skip buried cards (buried until today or future)
      if (state.buriedUntil && state.buriedUntil >= todayDateStr) continue;

      const previews = getRatingPreviews(state, nowIso, settings);
      const item: ActiveReviewItem = { card, state, previews };

      if (state.state === 'learning' || state.state === 'relearning') {
        learningItems.push(item);
      } else if (state.state === 'review') {
        const dueDate = new Date(state.due);
        if (dueDate <= now || state.due.slice(0, 10) <= todayDateStr) {
          dueReviewItems.push(item);
        }
      } else if (state.state === 'new') {
        if (newItems.length < remainingNewQuota) {
          newItems.push(item);
        }
      }
    }

    // Sort review items by due date (most overdue first)
    dueReviewItems.sort((a, b) => new Date(a.state.due).getTime() - new Date(b.state.due).getTime());

    // Priority: Learning cards first, then Overdue Reviews, then New cards
    return [...learningItems, ...dueReviewItems, ...newItems];
  }

  /**
   * Submit a rating for a card in the current session
   */
  public async submitRating(
    cardId: string,
    rating: ReviewRating,
    reviewDurationMs = 0,
    practiceMode = false
  ): Promise<{ nextState: CardScheduleState; intervalDays: number }> {
    const card = cardIndex.getCard(cardId);
    const currentState = reviewStorageService.getCardState(cardId);
    const nowIso = new Date().toISOString();
    const settings = this.getSettings();

    const { nextState, intervalDays } = applyReviewRating(
      currentState,
      rating,
      nowIso,
      settings
    );

    if (!practiceMode) {
      // Push previous state for undo capability
      this.sessionUndoStack.push({ cardId, previousState: currentState });

      // Record in storage and append event log
      await reviewStorageService.recordReview(cardId, nextState, {
        cardId,
        rating,
        state: nextState.state,
        previousState: currentState.state,
        due: nextState.due,
        stability: nextState.stability,
        difficulty: nextState.difficulty,
        elapsedDays: nextState.elapsedDays,
        lastElapsedDays: currentState.elapsedDays || 0,
        scheduledDays: intervalDays,
        reviewDurationMs,
        timestamp: nowIso,
      });

      // Award Gamification XP & Quest Progress for Card Review
      gamificationEngine.recordCardsReviewed(1);

      // Sibling burying: bury any sibling cards until tomorrow
      if (settings.burySiblings && card) {
        const siblingIds = cardIndex.getSiblingCardIds(cardId);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        for (const sibId of siblingIds) {
          await reviewStorageService.buryCard(sibId, tomorrowStr);
        }
      }
    }

    this.notify();
    return { nextState, intervalDays };
  }

  /**
   * Undo the last submitted review rating
   */
  public async undoLastRating(): Promise<{ success: boolean; revertedCardId?: string }> {
    const lastSessionItem = this.sessionUndoStack.pop();
    const res = await reviewStorageService.undoLastReview(lastSessionItem?.cardId);
    this.notify();
    return res;
  }

  /**
   * Suspend or unsuspend a card
   */
  public async toggleCardSuspension(cardId: string): Promise<boolean> {
    const state = reviewStorageService.getCardState(cardId);
    const newStatus = !state.suspended;
    await reviewStorageService.setCardSuspended(cardId, newStatus);
    this.notify();
    return newStatus;
  }

  /**
   * Reset card scheduling progress
   */
  public async resetCardProgress(cardId: string): Promise<void> {
    await reviewStorageService.resetCardProgress(cardId);
    this.notify();
  }

  /**
   * Get total summary statistics for the review queue
   */
  public getQueueSummary(scope: ReviewFilterScope = {}): ReviewQueueSummary {
    const cards = this.getScopedCards(scope);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let dueCount = 0;
    let newCount = 0;
    let learningCount = 0;
    let matureCount = 0;
    let suspendedCount = 0;

    for (const card of cards) {
      const state = reviewStorageService.getCardState(card.id);

      if (state.suspended) {
        suspendedCount++;
        continue;
      }

      if (state.state === 'new') {
        newCount++;
      } else if (state.state === 'learning' || state.state === 'relearning') {
        learningCount++;
        dueCount++;
      } else if (state.state === 'review') {
        if (state.scheduledDays >= 21) {
          matureCount++;
        }
        if (new Date(state.due) <= now || state.due.slice(0, 10) <= todayStr) {
          dueCount++;
        }
      }
    }

    return {
      dueCount,
      newCount,
      learningCount,
      matureCount,
      suspendedCount,
      totalCards: cards.length,
    };
  }

  /**
   * Get learning analytics and progress overview
   */
  public getAnalyticsData(): ReviewAnalyticsData {
    const allCards = cardIndex.getAllCards();
    const logs = reviewStorageService.getEventLogs();
    const todayStr = new Date().toISOString().slice(0, 10);

    const todayLogs = logs.filter((l) => l.timestamp.startsWith(todayStr));
    const studiedTodayCardIds = new Set(todayLogs.map((l) => l.cardId));

    let totalRetentionSum = 0;
    let retentionCount = 0;
    let totalDurationMs = 0;

    for (const log of todayLogs) {
      if (log.reviewDurationMs) {
        totalDurationMs += log.reviewDurationMs;
      }
    }

    const stateBreakdown = {
      new: 0,
      learning: 0,
      review: 0,
      relearning: 0,
      suspended: 0,
    };

    const maturityBreakdown = {
      young: 0,
      mature: 0,
    };

    const now = new Date();

    for (const card of allCards) {
      const state = reviewStorageService.getCardState(card.id);
      if (state.suspended) {
        stateBreakdown.suspended++;
        continue;
      }

      stateBreakdown[state.state]++;

      if (state.state === 'review') {
        if (state.scheduledDays >= 21) {
          maturityBreakdown.mature++;
        } else {
          maturityBreakdown.young++;
        }

        let elapsedDays = 0;
        if (state.lastReviewedAt) {
          elapsedDays = Math.max(0, (now.getTime() - new Date(state.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24));
        }
        const retrievability = calculateRetrievability(elapsedDays, state.stability || 1);
        totalRetentionSum += retrievability;
        retentionCount++;
      }
    }

    const avgRetention = retentionCount > 0 ? (totalRetentionSum / retentionCount) * 100 : 90;
    const avgResponseTimeSec = todayLogs.length > 0 ? totalDurationMs / 1000 / todayLogs.length : 0;

    return {
      cardsStudiedToday: studiedTodayCardIds.size,
      reviewsCompletedToday: todayLogs.length,
      estimatedRetention: Number(avgRetention.toFixed(1)),
      averageResponseTimeSec: Number(avgResponseTimeSec.toFixed(1)),
      stateBreakdown,
      maturityBreakdown,
    };
  }

  /**
   * Filter cards by given scope (note, folder, tag, query)
   */
  private getScopedCards(scope: ReviewFilterScope): ReviewCard[] {
    let cards: ReviewCard[] = [];

    if (scope.noteId) {
      cards = cardIndex.getCardsForNote(scope.noteId);
    } else if (scope.folderId) {
      cards = cardIndex.getCardsForFolder(scope.folderId);
    } else if (scope.tag) {
      cards = cardIndex.getCardsForTag(scope.tag);
    } else {
      cards = cardIndex.getAllCards();
    }

    if (scope.searchQuery && scope.searchQuery.trim()) {
      const q = scope.searchQuery.toLowerCase().trim();
      cards = cards.filter(
        (c) =>
          c.prompt.toLowerCase().includes(q) ||
          c.answer.toLowerCase().includes(q) ||
          c.sourceNoteTitle.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return cards;
  }
}

export const reviewService = new ReviewService();
