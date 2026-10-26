/**
 * PKM V2.4 — What Changed Engine V2
 *
 * Answers: "What meaningfully changed in this Context / Project / Workspace since I last looked?"
 * - Cursor-based checkpoint tracking (lastSeenActivityCursor)
 * - Scope-isolated filtering (only connected resources, no whole-vault noise)
 * - Deterministic delta grouping (Tasks, Notes, Decisions, Routines, Reviews)
 * - Explicit "Mark Caught Up" action (presentation state only, leaves canonical domain data untouched)
 * - Grounded, factual change summarization
 */

import { ActivityEvent, ActivityEngineV2, globalActivityEngine } from '../activity';

export interface WhatChangedCheckpoint {
  scopeId: string; // 'global' or contextId or projectId
  lastSeenTimestamp: string; // ISO UTC Instant
  updatedAt: string;
}

export interface WhatChangedGroupedDelta {
  scopeId: string;
  scopeTitle?: string;
  sinceTimestamp: string;
  currentTimestamp: string;
  totalEventCount: number;
  isEmpty: boolean;
  
  tasksCompleted: ActivityEvent[];
  tasksAdded: ActivityEvent[];
  notesUpdated: ActivityEvent[];
  notesCreated: ActivityEvent[];
  decisionsMade: ActivityEvent[];
  reviewsCompleted: ActivityEvent[];
  routinesCompleted: ActivityEvent[];
  otherChanges: ActivityEvent[];

  structuredBulletSummary: string[];
}

export class WhatChangedEngineV2 {
  private activityEngine: ActivityEngineV2;
  private checkpoints = new Map<string, WhatChangedCheckpoint>();

  constructor(activityEngine: ActivityEngineV2 = globalActivityEngine) {
    this.activityEngine = activityEngine;
  }

  public getCheckpoint(scopeId: string = 'global'): WhatChangedCheckpoint {
    const existing = this.checkpoints.get(scopeId);
    if (existing) return existing;

    // Default to 7 days ago if no checkpoint is recorded
    const defaultTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return {
      scopeId,
      lastSeenTimestamp: defaultTime,
      updatedAt: new Date().toISOString(),
    };
  }

  public setCheckpoint(scopeId: string, timestampIso?: string): WhatChangedCheckpoint {
    const ts = timestampIso || new Date().toISOString();
    const checkpoint: WhatChangedCheckpoint = {
      scopeId,
      lastSeenTimestamp: ts,
      updatedAt: new Date().toISOString(),
    };
    this.checkpoints.set(scopeId, checkpoint);
    return checkpoint;
  }

  /**
   * Explicit user action: Mark Caught Up
   */
  public markCaughtUp(scopeId: string = 'global'): WhatChangedCheckpoint {
    return this.setCheckpoint(scopeId, new Date().toISOString());
  }

  /**
   * Computes the semantic delta since the last seen checkpoint
   */
  public computeWhatChanged(options: {
    scopeId?: string;
    scopeTitle?: string;
    connectedResourceIds?: string[];
    sinceTimestampOverride?: string;
    limit?: number;
  } = {}): WhatChangedGroupedDelta {
    const scopeId = options.scopeId || 'global';
    const checkpoint = this.getCheckpoint(scopeId);
    const sinceTimestamp = options.sinceTimestampOverride || checkpoint.lastSeenTimestamp;
    const currentTimestamp = new Date().toISOString();

    // Query activity events occurred after the checkpoint
    const queryResult = this.activityEngine.query({
      contextId: scopeId !== 'global' ? scopeId : undefined,
      startDate: sinceTimestamp.slice(0, 10),
      limit: options.limit || 200,
    });

    // Filter strictly by timestamp > sinceTimestamp
    const sinceTime = new Date(sinceTimestamp).getTime();
    let events = queryResult.events.filter(
      ev => new Date(ev.timestamp).getTime() > sinceTime
    );

    // If connected resource IDs are provided for a scoped context, strictly filter by connection
    if (options.connectedResourceIds && options.connectedResourceIds.length > 0) {
      const allowedSet = new Set(options.connectedResourceIds);
      events = events.filter(
        ev => (ev.resource && allowedSet.has(ev.resource.id)) ||
              (ev.contextId === scopeId)
      );
    }

    const tasksCompleted: ActivityEvent[] = [];
    const tasksAdded: ActivityEvent[] = [];
    const notesUpdated: ActivityEvent[] = [];
    const notesCreated: ActivityEvent[] = [];
    const decisionsMade: ActivityEvent[] = [];
    const reviewsCompleted: ActivityEvent[] = [];
    const routinesCompleted: ActivityEvent[] = [];
    const otherChanges: ActivityEvent[] = [];

    for (const ev of events) {
      switch (ev.type) {
        case 'task_completed':
          tasksCompleted.push(ev);
          break;
        case 'resource_created':
          if (ev.resource?.type === 'task') {
            tasksAdded.push(ev);
          } else {
            notesCreated.push(ev);
          }
          break;
        case 'resource_edited':
          notesUpdated.push(ev);
          break;
        case 'decision_made':
        case 'decision_resolved':
          decisionsMade.push(ev);
          break;
        case 'review_completed':
          reviewsCompleted.push(ev);
          break;
        case 'routine_completed':
          routinesCompleted.push(ev);
          break;
        default:
          otherChanges.push(ev);
          break;
      }
    }

    // Build structured factual summary bullets
    const bullets: string[] = [];
    if (tasksCompleted.length > 0) {
      bullets.push(`${tasksCompleted.length} task${tasksCompleted.length > 1 ? 's' : ''} completed`);
    }
    if (tasksAdded.length > 0) {
      bullets.push(`${tasksAdded.length} new task${tasksAdded.length > 1 ? 's' : ''} added`);
    }
    if (notesCreated.length > 0) {
      bullets.push(`${notesCreated.length} note${notesCreated.length > 1 ? 's' : ''} created`);
    }
    if (notesUpdated.length > 0) {
      bullets.push(`${notesUpdated.length} note${notesUpdated.length > 1 ? 's' : ''} updated`);
    }
    if (decisionsMade.length > 0) {
      bullets.push(`${decisionsMade.length} decision${decisionsMade.length > 1 ? 's' : ''} made`);
    }
    if (reviewsCompleted.length > 0) {
      bullets.push(`${reviewsCompleted.length} review${reviewsCompleted.length > 1 ? 's' : ''} completed`);
    }
    if (routinesCompleted.length > 0) {
      bullets.push(`${routinesCompleted.length} routine${routinesCompleted.length > 1 ? 's' : ''} executed`);
    }

    const totalEventCount = events.length;

    return {
      scopeId,
      scopeTitle: options.scopeTitle,
      sinceTimestamp,
      currentTimestamp,
      totalEventCount,
      isEmpty: totalEventCount === 0,
      tasksCompleted,
      tasksAdded,
      notesUpdated,
      notesCreated,
      decisionsMade,
      reviewsCompleted,
      routinesCompleted,
      otherChanges,
      structuredBulletSummary: bullets,
    };
  }
}

export const globalWhatChangedEngine = new WhatChangedEngineV2();
