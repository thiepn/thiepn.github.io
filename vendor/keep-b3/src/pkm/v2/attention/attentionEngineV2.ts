/**
 * PKM V2.4 — Unified Attention Engine V2
 *
 * Central evaluation and deduplication engine for actionable factual conditions:
 * - Deterministic condition providers
 * - Deduplication (collapses multiple child overdue tasks under parent project)
 * - Auto-resolves / auto-removes items once underlying condition disappears
 * - Preserves strict separation between presentation Snooze/Acknowledge and canonical domain data
 */

import {
  AttentionItemV2,
  AttentionIdV2,
  AttentionReasonV2,
  AttentionSeverityV2,
  AttentionCategoryV2,
  AttentionFilterV2,
} from './attentionTypes';
import { ResourceRef } from '../core/resource/resourceCore';

export interface AttentionProviderContext {
  todayDateOnly: string; // YYYY-MM-DD
  nowTimestamp: string;
}

export type AttentionConditionEvaluator = (ctx: AttentionProviderContext) => AttentionItemV2[];

export class AttentionEngineV2 {
  private evaluators: AttentionConditionEvaluator[] = [];
  private presentationState = new Map<string, { acknowledgedAt?: string; snoozedUntil?: string }>();
  private activeItemsCache: AttentionItemV2[] = [];
  private lastEvaluatedAt: string = '';

  /**
   * Registers a condition evaluator provider
   */
  public registerEvaluator(evaluator: AttentionConditionEvaluator): void {
    this.evaluators.push(evaluator);
  }

  /**
   * Acknowledge item ("Seen") — modifies presentation only
   */
  public acknowledgeItem(dedupeKey: string): void {
    const existing = this.presentationState.get(dedupeKey) || {};
    this.presentationState.set(dedupeKey, {
      ...existing,
      acknowledgedAt: new Date().toISOString(),
    });
  }

  /**
   * Snooze item ("Hide until date") — modifies presentation only, never touches task due dates!
   */
  public snoozeItem(dedupeKey: string, snoozedUntilIso: string): void {
    const existing = this.presentationState.get(dedupeKey) || {};
    this.presentationState.set(dedupeKey, {
      ...existing,
      snoozedUntil: snoozedUntilIso,
    });
  }

  /**
   * Clears presentation state for a dedupeKey
   */
  public clearPresentationState(dedupeKey: string): void {
    this.presentationState.delete(dedupeKey);
  }

  /**
   * Evaluates all registered condition providers, deduplicates, and overlays presentation state
   */
  public evaluate(options: {
    todayDateOnly?: string;
    nowTimestamp?: string;
    filter?: AttentionFilterV2;
  } = {}): AttentionItemV2[] {
    const nowIso = options.nowTimestamp || new Date().toISOString();
    const today = options.todayDateOnly || nowIso.slice(0, 10);
    const ctx: AttentionProviderContext = { todayDateOnly: today, nowTimestamp: nowIso };

    // Collect raw items from all evaluators
    const rawItems: AttentionItemV2[] = [];
    for (const evaluator of this.evaluators) {
      try {
        const items = evaluator(ctx);
        rawItems.push(...items);
      } catch (err) {
        console.error('[PKM:ATTENTION] Evaluator error:', err);
      }
    }

    // Deduplication by dedupeKey
    const dedupeMap = new Map<string, AttentionItemV2>();

    for (const item of rawItems) {
      const existing = dedupeMap.get(item.dedupeKey);
      if (!existing) {
        dedupeMap.set(item.dedupeKey, item);
      } else {
        // Merge / upgrade severity if incoming has higher severity
        if (this.severityRank(item.severity) > this.severityRank(existing.severity)) {
          existing.severity = item.severity;
        }
        if (item.childResourceIds && item.childResourceIds.length > 0) {
          const mergedChildren = Array.from(new Set([...(existing.childResourceIds || []), ...item.childResourceIds]));
          existing.childResourceIds = mergedChildren;
          existing.childItemCount = mergedChildren.length;
        }
      }
    }

    // Overlay presentation state (Acknowledge / Snooze)
    const nowTime = new Date(nowIso).getTime();
    const evaluatedItems: AttentionItemV2[] = [];

    for (const item of dedupeMap.values()) {
      const pres = this.presentationState.get(item.dedupeKey);
      if (pres) {
        item.acknowledgedAt = pres.acknowledgedAt;
        item.snoozedUntil = pres.snoozedUntil;
      }

      // Check snooze validity
      if (item.snoozedUntil) {
        const snoozeTime = new Date(item.snoozedUntil).getTime();
        if (snoozeTime > nowTime && !options.filter?.includeSnoozed) {
          // Item is actively snoozed; skip from active list
          continue;
        }
      }

      // Check acknowledged filter
      if (item.acknowledgedAt && !options.filter?.includeAcknowledged) {
        // Continue showing acknowledged items in standard list but with acknowledged styling
      }

      // Apply category filter
      if (options.filter?.category && item.category !== options.filter.category) {
        continue;
      }

      // Apply severity filter
      if (options.filter?.severity && options.filter.severity.length > 0 && !options.filter.severity.includes(item.severity)) {
        continue;
      }

      // Apply context filter
      if (options.filter?.contextId && item.contextId !== options.filter.contextId) {
        continue;
      }

      evaluatedItems.push(item);
    }

    // Deterministic sorting hierarchy:
    // 1. Critical severity first
    // 2. Important
    // 3. Needs attention
    // 4. Info
    // 5. Tie-breaker: oldest createdAt first
    evaluatedItems.sort((a, b) => {
      const rankDiff = this.severityRank(b.severity) - this.severityRank(a.severity);
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    this.activeItemsCache = evaluatedItems;
    this.lastEvaluatedAt = nowIso;

    if (options.filter?.limit && options.filter.limit > 0) {
      return evaluatedItems.slice(0, options.filter.limit);
    }

    return evaluatedItems;
  }

  public getCachedItems(): AttentionItemV2[] {
    return this.activeItemsCache;
  }

  private severityRank(s: AttentionSeverityV2): number {
    switch (s) {
      case 'critical': return 4;
      case 'important': return 3;
      case 'needs_attention': return 2;
      case 'info': return 1;
      default: return 0;
    }
  }


  public clear(): void {
    this.evaluators = [];
    this.presentationState.clear();
    this.activeItemsCache = [];
  }
}

export const globalAttentionEngine = new AttentionEngineV2();
