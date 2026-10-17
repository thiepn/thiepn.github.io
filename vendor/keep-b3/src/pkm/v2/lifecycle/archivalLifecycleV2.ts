/**
 * PKM V2.4 — Unified Archival & Lifecycle Engine V2
 *
 * Enforces clear, predictable resource lifecycle semantics:
 * - Active: Primary working state included in standard daily queries & views
 * - Completed: Domain-level finished state (e.g. project completed, task done)
 * - Archived: Long-term retained state, excluded from active queries, fully searchable & linkable
 * - Trash: Recoverable soft-deletion
 *
 * Non-Negotiable Rules:
 * - Archive NEVER silently deletes user data
 * - No automatic age-only archiving without explicit user decision
 * - Archived resources maintain all connections, backlinks, and searchability
 * - Instant single-click restore to active
 */

import { ResourceRef, ResourceType } from '../core/resource/resourceCore';
import { ActivityEngineV2, globalActivityEngine } from '../activity';

export type ResourceLifecycleState = 'active' | 'completed' | 'archived' | 'trash';

export interface ArchivalCandidate {
  resourceRef: ResourceRef;
  completedAt?: string;
  inactiveDays: number;
  reason: string; // Plain factual explanation
}

export interface LifecycleTransitionResult {
  resourceId: string;
  previousState: ResourceLifecycleState;
  newState: ResourceLifecycleState;
  timestamp: string;
}

export class ArchivalLifecycleEngineV2 {
  private activityEngine: ActivityEngineV2;
  private lifecycleStates = new Map<string, ResourceLifecycleState>();

  constructor(activityEngine: ActivityEngineV2 = globalActivityEngine) {
    this.activityEngine = activityEngine;
  }

  public getLifecycleState(resourceId: string): ResourceLifecycleState {
    return this.lifecycleStates.get(resourceId) || 'active';
  }

  public setLifecycleState(
    resourceRef: ResourceRef,
    newState: ResourceLifecycleState,
    actor: 'user' | 'automation' | 'sync' = 'user'
  ): LifecycleTransitionResult {
    const previousState = this.getLifecycleState(resourceRef.id);
    this.lifecycleStates.set(resourceRef.id, newState);
    const timestamp = new Date().toISOString();

    // Emit semantic activity event
    let eventType: 'resource_archived' | 'resource_restored' | 'resource_completed' | 'resource_edited' = 'resource_edited';
    if (newState === 'archived') eventType = 'resource_archived';
    else if (previousState === 'archived' && newState === 'active') eventType = 'resource_restored';
    else if (newState === 'completed') eventType = 'resource_completed';

    this.activityEngine.recordActivity({
      type: eventType,
      actor,
      domain: 'core',
      resource: resourceRef,
      summary: {
        primaryTitle: `${newState === 'archived' ? 'Archived' : previousState === 'archived' && newState === 'active' ? 'Restored' : 'Updated'} ${resourceRef.title}`,
        previousStatus: previousState,
        newStatus: newState,
        deltaSummary: `Changed lifecycle state from ${previousState} to ${newState}`,
      },
      timestamp,
    });

    return {
      resourceId: resourceRef.id,
      previousState,
      newState,
      timestamp,
    };
  }

  /**
   * Bulk archive resources safely
   */
  public bulkArchive(
    resources: ResourceRef[],
    actor: 'user' | 'automation' | 'sync' = 'user'
  ): LifecycleTransitionResult[] {
    const results: LifecycleTransitionResult[] = [];
    for (const res of resources) {
      const resResult = this.setLifecycleState(res, 'archived', actor);
      results.push(resResult);
    }

    // Record single consolidated bulk activity event
    if (resources.length > 0) {
      this.activityEngine.recordBulkAction({
        actionType: 'Archived',
        itemCount: resources.length,
        resourceType: resources[0].type,
      });
    }

    return results;
  }

  /**
   * Restores an archived resource back to active
   */
  public restoreToActive(resourceRef: ResourceRef): LifecycleTransitionResult {
    return this.setLifecycleState(resourceRef, 'active');
  }

  /**
   * Finds inactive completed items that may be suggested for archival (Never auto-archived!)
   */
  public findArchivalCandidates(
    completedResources: Array<{ ref: ResourceRef; completedAt: string; lastActivityAt?: string }>,
    minInactiveDays: number = 90
  ): ArchivalCandidate[] {
    const now = Date.now();
    const candidates: ArchivalCandidate[] = [];

    for (const item of completedResources) {
      if (this.getLifecycleState(item.ref.id) === 'archived') {
        continue;
      }

      const refDate = item.lastActivityAt || item.completedAt;
      const inactiveDays = Math.floor((now - new Date(refDate).getTime()) / (24 * 60 * 60 * 1000));

      if (inactiveDays >= minInactiveDays) {
        candidates.push({
          resourceRef: item.ref,
          completedAt: item.completedAt,
          inactiveDays,
          reason: `Completed ${inactiveDays} days ago with no further activity.`,
        });
      }
    }

    return candidates;
  }

  public clear(): void {
    this.lifecycleStates.clear();
  }
}

export const globalArchivalLifecycleEngine = new ArchivalLifecycleEngineV2();
