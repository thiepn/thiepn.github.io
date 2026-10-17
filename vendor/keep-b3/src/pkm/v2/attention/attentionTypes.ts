/**
 * PKM V2.4 — Unified Attention Foundation Types
 *
 * Defines exact Attention Item contracts:
 * - Factual explainability (Every item explains "Why am I seeing this?")
 * - Restrained severity classes (Critical reserved for data loss/corruption/backup failure)
 * - Presentation-only Acknowledgement & Snooze (Never alters canonical due dates or domain data)
 * - Separation between System Attention and Domain Attention
 */

import { ResourceRef } from '../core/resource/resourceCore';

export type AttentionIdV2 = string;

export type AttentionReasonV2 =
  | 'overdue_task'
  | 'due_soon_task'
  | 'review_due'
  | 'no_next_action'
  | 'sync_conflict'
  | 'backup_failed'
  | 'storage_low'
  | 'automation_failed'
  | 'connector_expired'
  | 'asset_maintenance_due'
  | 'decision_review_due';

export type AttentionSeverityV2 =
  | 'info'              // Low-friction factual heads-up
  | 'needs_attention'  // Routine action item (e.g., periodic review due, no next action)
  | 'important'        // Significant deadline or conflict (e.g., overdue tasks, automation error)
  | 'critical';         // STRICTLY reserved for data loss risk, corruption, backup failure

export type AttentionCategoryV2 = 'system' | 'planning' | 'domain';

export interface AttentionItemV2 {
  id: AttentionIdV2;
  dedupeKey: string;
  category: AttentionCategoryV2;
  reason: AttentionReasonV2;
  severity: AttentionSeverityV2;
  title: string;
  whyExplanation: string; // Plain-English factual explanation of why this item is present
  createdAt: string; // ISO UTC Instant
  resource?: ResourceRef;
  childItemCount?: number;
  childResourceIds?: string[];
  contextId?: string;
  contextTitle?: string;
  suggestedActionLabel?: string;
  actionId?: string; // Action ID to dispatch if user clicks primary fix action
  
  // Presentation state (synced or local, leaves canonical domain data untouched)
  acknowledgedAt?: string;
  snoozedUntil?: string; // ISO UTC Instant
}

export interface AttentionFilterV2 {
  category?: AttentionCategoryV2;
  severity?: AttentionSeverityV2[];
  contextId?: string;
  includeSnoozed?: boolean;
  includeAcknowledged?: boolean;
  limit?: number;
}

