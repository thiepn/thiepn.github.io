/**
 * PKM V2.4 — Semantic Activity Foundation Types
 * 
 * Formalizes exact Activity Event contracts:
 * - Differentiates semantic activity from UI clickstream/hover/scroll
 * - Coalesces rapid autosaves into meaningful edit sessions
 * - Supports bulk/import batch summarization
 * - Provides multi-device deduplication & privacy-tier filtering
 */

import { ResourceType, ResourceRef } from '../core/resource/resourceCore';

export type ActivityEventId = string;

export type ActivityEventType =
  | 'resource_created'
  | 'resource_edited'
  | 'resource_completed'
  | 'resource_archived'
  | 'resource_restored'
  | 'resource_deleted'
  | 'task_completed'
  | 'task_reopened'
  | 'decision_made'
  | 'decision_resolved'
  | 'review_completed'
  | 'routine_completed'
  | 'reference_added'
  | 'asset_maintenance'
  | 'interaction_logged'
  | 'bulk_action'
  | 'import_completed'
  | 'system_reliability_event';

export type ActivityActor =
  | 'user'
  | 'automation'
  | 'sync'
  | 'import'
  | 'system';

export type ActivityVisibility =
  | 'public'       // Standard visible activity
  | 'private'      // Sensitive domain activity (Health, Finance, Private Notes)
  | 'restricted';   // System/diagnostic only

export type ActivityDomain =
  | 'core'
  | 'tasks'
  | 'projects'
  | 'decisions'
  | 'reviews'
  | 'routines'
  | 'health'
  | 'finance'
  | 'people'
  | 'assets'
  | 'learning'
  | 'library'
  | 'system';

export interface StructuredActivitySummary {
  primaryTitle: string;
  itemCount?: number;
  deltaSummary?: string;
  affectedFields?: string[];
  previousStatus?: string;
  newStatus?: string;
  amountMasked?: boolean; // For finance privacy
  batchType?: string;
  sourceContextTitle?: string;
}

export interface ActivityEvent {
  id: ActivityEventId;
  type: ActivityEventType;
  timestamp: string; // ISO 8601 UTC Instant
  actor: ActivityActor;
  domain: ActivityDomain;
  visibility: ActivityVisibility;
  resource?: ResourceRef;
  relatedResources?: ResourceRef[];
  contextId?: string;
  originDeviceId?: string;
  summary: StructuredActivitySummary;
  
  // Session coalescing metadata
  editCount?: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
}

export interface ActivityQueryFilter {
  domains?: ActivityDomain[];
  types?: ActivityEventType[];
  resourceId?: string;
  contextId?: string;
  actor?: ActivityActor;
  visibility?: ActivityVisibility[];
  startDate?: string; // ISO or DateOnly
  endDate?: string;   // ISO or DateOnly
  searchQuery?: string;
  limit?: number;
  cursor?: string; // Pagination cursor
}

export interface ActivityQueryResult {
  events: ActivityEvent[];
  nextCursor?: string;
  totalMatching: number;
  hasMore: boolean;
}

export interface ActivityCoalesceConfig {
  editSessionWindowMs: number; // e.g. 10 minutes (600,000 ms)
  maxEditsPerSession: number;
}

export const DEFAULT_ACTIVITY_COALESCE_CONFIG: ActivityCoalesceConfig = {
  editSessionWindowMs: 10 * 60 * 1000, // 10 minutes
  maxEditsPerSession: 100,
};
