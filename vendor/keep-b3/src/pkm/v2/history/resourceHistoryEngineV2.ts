/**
 * PKM V2.4 — Unified Resource History Engine V2
 *
 * Coherently integrates 3 distinct historical layers for any Resource:
 * 1. Semantic Activity (Meaningful actions: created, session edits, status transitions, relations added)
 * 2. Content Revisions (Point-in-time content versions for diffing & recovery)
 * 3. Canonical Domain History (Domain-specific records like Interactions, Maintenance, Decisions)
 */

import { ResourceRef } from '../core/resource/resourceCore';
import { ActivityEvent, ActivityEngineV2, globalActivityEngine } from '../activity';

export interface ResourceRevisionEntry {
  revisionId: string;
  timestamp: string;
  charCount?: number;
  wordCount?: number;
  author?: string;
  description?: string;
}

export interface DomainHistoryEntry {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  details?: string;
}

export interface UnifiedResourceHistoryReport {
  resourceRef: ResourceRef;
  activityEvents: ActivityEvent[];
  revisions: ResourceRevisionEntry[];
  domainHistory: DomainHistoryEntry[];
  createdTimestamp?: string;
  lastEditedTimestamp?: string;
  lifecycleState: 'active' | 'completed' | 'archived' | 'trash';
}

export class ResourceHistoryEngineV2 {
  private activityEngine: ActivityEngineV2;

  constructor(activityEngine: ActivityEngineV2 = globalActivityEngine) {
    this.activityEngine = activityEngine;
  }

  /**
   * Retrieves the combined history for a specific resource
   */
  public getUnifiedHistory(
    resourceRef: ResourceRef,
    options: {
      revisions?: ResourceRevisionEntry[];
      domainHistory?: DomainHistoryEntry[];
      lifecycleState?: 'active' | 'completed' | 'archived' | 'trash';
      limit?: number;
    } = {}
  ): UnifiedResourceHistoryReport {
    const activityEvents = this.activityEngine.getResourceActivity(
      resourceRef.id,
      options.limit || 50
    );

    let createdTimestamp: string | undefined;
    let lastEditedTimestamp: string | undefined;

    const createdEvent = activityEvents.find(e => e.type === 'resource_created');
    if (createdEvent) {
      createdTimestamp = createdEvent.timestamp;
    }

    if (activityEvents.length > 0) {
      lastEditedTimestamp = activityEvents[0].timestamp;
    }

    return {
      resourceRef,
      activityEvents,
      revisions: options.revisions || [],
      domainHistory: options.domainHistory || [],
      createdTimestamp,
      lastEditedTimestamp,
      lifecycleState: options.lifecycleState || 'active',
    };
  }
}

export const globalResourceHistoryEngine = new ResourceHistoryEngineV2();
