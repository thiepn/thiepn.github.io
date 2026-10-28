/**
 * PKM V2.4 — Semantic Activity Engine V2
 * 
 * Central orchestrator for semantic activity tracking:
 * - Emits meaningful events strictly from canonical mutations & actions
 * - Coalesces repeated autosaves into unified edit sessions (no log spam)
 * - Summarizes bulk and import operations into single grouped events
 * - Guarantees deterministic multi-device deduplication & clock-skew tolerance
 * - Enforces privacy boundaries for sensitive domains (Health, Finance)
 */

import {
  ActivityEvent,
  ActivityEventId,
  ActivityEventType,
  ActivityActor,
  ActivityDomain,
  ActivityVisibility,
  StructuredActivitySummary,
  ActivityQueryFilter,
  ActivityQueryResult,
  ActivityCoalesceConfig,
  DEFAULT_ACTIVITY_COALESCE_CONFIG,
} from './activityTypes';
import { ResourceRef } from '../core/resource/resourceCore';
import { ActivityIndexV2, globalActivityIndex } from './activityIndex';

export class ActivityEngineV2 {
  private index: ActivityIndexV2;
  private coalesceConfig: ActivityCoalesceConfig;
  private recentEditSessions = new Map<string, ActivityEvent>(); // resourceId -> latest edit session event
  private privacySettings = {
    includeHealthInTimeline: false,
    includeFinanceInTimeline: true,
    maskFinanceAmounts: true,
  };

  constructor(
    index: ActivityIndexV2 = globalActivityIndex,
    config: ActivityCoalesceConfig = DEFAULT_ACTIVITY_COALESCE_CONFIG
  ) {
    this.index = index;
    this.coalesceConfig = config;
  }

  public setPrivacySettings(settings: Partial<typeof this.privacySettings>): void {
    this.privacySettings = { ...this.privacySettings, ...settings };
  }

  public getPrivacySettings(): typeof this.privacySettings {
    return { ...this.privacySettings };
  }

  /**
   * Generates a stable deterministic event ID
   */
  public generateEventId(
    type: ActivityEventType,
    resourceId?: string,
    timestampIso?: string,
    originDeviceId?: string
  ): ActivityEventId {
    const ts = timestampIso || new Date().toISOString();
    const dev = originDeviceId || 'local';
    const res = resourceId || 'global';
    return `act_${type}_${res}_${ts.slice(0, 19).replace(/[:T-]/g, '')}_${dev}`;
  }

  /**
   * Records a semantic activity event with session coalescing and privacy enforcement
   */
  public recordActivity(params: {
    type: ActivityEventType;
    actor?: ActivityActor;
    domain?: ActivityDomain;
    visibility?: ActivityVisibility;
    resource?: ResourceRef;
    relatedResources?: ResourceRef[];
    contextId?: string;
    originDeviceId?: string;
    summary: StructuredActivitySummary;
    timestamp?: string;
    customId?: string;
  }): ActivityEvent {
    const timestamp = params.timestamp || new Date().toISOString();
    const actor = params.actor || 'user';
    const domain = params.domain || 'core';
    const originDeviceId = params.originDeviceId || 'device_local';

    // Determine default visibility based on domain & privacy rules
    let visibility = params.visibility || 'public';
    if (domain === 'health' && !this.privacySettings.includeHealthInTimeline) {
      visibility = 'private';
    }
    if (domain === 'finance') {
      if (this.privacySettings.maskFinanceAmounts) {
        params.summary.amountMasked = true;
      }
      if (!this.privacySettings.includeFinanceInTimeline) {
        visibility = 'private';
      }
    }

    // -------------------------------------------------------------
    // EDIT SESSION COALESCING:
    // Repeated resource_edited events on the same resource within window
    // coalesce into a single event instead of polluting the stream
    // -------------------------------------------------------------
    if (params.type === 'resource_edited' && params.resource?.id) {
      const resourceId = params.resource.id;
      const existingSession = this.recentEditSessions.get(resourceId);

      if (existingSession) {
        const lastTime = new Date(existingSession.lastTimestamp || existingSession.timestamp).getTime();
        const currentTime = new Date(timestamp).getTime();
        const timeDiff = Math.abs(currentTime - lastTime);

        if (timeDiff <= this.coalesceConfig.editSessionWindowMs) {
          // Coalesce into existing session
          const editCount = (existingSession.editCount || 1) + 1;
          const updatedEvent: ActivityEvent = {
            ...existingSession,
            lastTimestamp: timestamp,
            editCount,
            summary: {
              ...existingSession.summary,
              deltaSummary: `Edited ${editCount} times during active session`,
            },
          };

          this.recentEditSessions.set(resourceId, updatedEvent);
          this.index.update(updatedEvent);
          return updatedEvent;
        }
      }
    }

    // Create fresh semantic event
    const id = params.customId || this.generateEventId(params.type, params.resource?.id, timestamp, originDeviceId);

    const newEvent: ActivityEvent = {
      id,
      type: params.type,
      timestamp,
      actor,
      domain,
      visibility,
      resource: params.resource,
      relatedResources: params.relatedResources,
      contextId: params.contextId,
      originDeviceId,
      summary: params.summary,
      editCount: params.type === 'resource_edited' ? 1 : undefined,
      firstTimestamp: timestamp,
      lastTimestamp: timestamp,
    };

    if (params.type === 'resource_edited' && params.resource?.id) {
      this.recentEditSessions.set(params.resource.id, newEvent);
    }

    this.index.insert(newEvent);
    return newEvent;
  }

  /**
   * Helper: Record bulk action summary
   */
  public recordBulkAction(params: {
    actionType: string;
    itemCount: number;
    resourceType: string;
    contextId?: string;
    actor?: ActivityActor;
  }): ActivityEvent {
    return this.recordActivity({
      type: 'bulk_action',
      domain: 'core',
      actor: params.actor || 'user',
      contextId: params.contextId,
      summary: {
        primaryTitle: `${params.actionType} ${params.itemCount} ${params.resourceType}s`,
        itemCount: params.itemCount,
        batchType: params.actionType,
        deltaSummary: `Applied bulk ${params.actionType.toLowerCase()} across ${params.itemCount} items`,
      },
    });
  }

  /**
   * Helper: Record import batch summary
   */
  public recordImportBatch(params: {
    sourceName: string;
    itemCount: number;
    resourceType: string;
    actor?: ActivityActor;
  }): ActivityEvent {
    return this.recordActivity({
      type: 'import_completed',
      domain: 'core',
      actor: params.actor || 'import',
      summary: {
        primaryTitle: `Imported ${params.itemCount} ${params.resourceType}s from ${params.sourceName}`,
        itemCount: params.itemCount,
        deltaSummary: `Completed batch import from ${params.sourceName}`,
      },
    });
  }

  /**
   * Ingests remote synced events with deduplication and clock skew handling
   */
  public ingestSyncedEvents(remoteEvents: ActivityEvent[]): { ingested: number; deduped: number } {
    let ingested = 0;
    let deduped = 0;

    for (const ev of remoteEvents) {
      const existing = this.index.getById(ev.id);
      if (existing) {
        deduped++;
        continue;
      }

      // Check for identical semantic event at same timestamp
      const isDuplicate = this.index.getAll().some(
        local => local.type === ev.type &&
                 local.resource?.id === ev.resource?.id &&
                 Math.abs(new Date(local.timestamp).getTime() - new Date(ev.timestamp).getTime()) < 2000
      );

      if (isDuplicate) {
        deduped++;
        continue;
      }

      this.index.insert(ev);
      ingested++;
    }

    return { ingested, deduped };
  }

  /**
   * Query the activity stream
   */
  public query(filter: ActivityQueryFilter = {}): ActivityQueryResult {
    return this.index.query(filter);
  }

  /**
   * Retrieves chronological activity for a specific resource
   */
  public getResourceActivity(resourceId: string, limit: number = 50): ActivityEvent[] {
    return this.index.query({ resourceId, limit }).events;
  }

  /**
   * Retrieves chronological activity for a specific context
   */
  public getContextActivity(contextId: string, limit: number = 50): ActivityEvent[] {
    return this.index.query({ contextId, limit }).events;
  }

  public getIndex(): ActivityIndexV2 {
    return this.index;
  }
}

export const globalActivityEngine = new ActivityEngineV2();
