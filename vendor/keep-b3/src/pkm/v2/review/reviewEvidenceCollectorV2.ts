/**
 * PKM V2.4 — Review Evidence Collector V2
 *
 * Gathers factual evidence metrics from Semantic Activity and Canonical Stores
 * to assist intentional reflection during Weekly, Monthly, and Project Reviews.
 */

import { ActivityEngineV2, globalActivityEngine } from '../activity';
import { ReviewEvidenceMetrics, ReviewSnapshotV2, ReviewSnapshotStoreV2, globalReviewSnapshotStore } from './reviewSnapshotV2';
import { ResourceRef } from '../core/resource/resourceCore';

export interface GatherEvidenceParams {
  reviewId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  contextId?: string;
  projectResourceId?: string;
}

export interface ReviewEvidenceReport {
  isHistoricalSnapshot: boolean;
  periodStart: string;
  periodEnd: string;
  completedAt?: string;
  metrics: ReviewEvidenceMetrics;
  completedTasks: { id: string; title: string; completedAt?: string }[];
  createdNotes: { id: string; title: string; createdAt?: string }[];
  decisionsMade: { id: string; title: string; decidedAt?: string }[];
  routinesRun: { id: string; title: string; completedAt?: string }[];
}

export class ReviewEvidenceCollectorV2 {
  private activityEngine: ActivityEngineV2;
  private snapshotStore: ReviewSnapshotStoreV2;

  constructor(
    activityEngine: ActivityEngineV2 = globalActivityEngine,
    snapshotStore: ReviewSnapshotStoreV2 = globalReviewSnapshotStore
  ) {
    this.activityEngine = activityEngine;
    this.snapshotStore = snapshotStore;
  }

  /**
   * Gathers review evidence. If a completed review ID has an existing frozen snapshot,
   * returns the historical snapshot to prevent rewriting historical records.
   */
  public gatherEvidence(params: GatherEvidenceParams): ReviewEvidenceReport {
    if (params.reviewId) {
      const snapshot = this.snapshotStore.getSnapshot(params.reviewId);
      if (snapshot) {
        return {
          isHistoricalSnapshot: true,
          periodStart: snapshot.periodStartDate,
          periodEnd: snapshot.periodEndDate,
          completedAt: snapshot.completedAt,
          metrics: snapshot.metrics,
          completedTasks: snapshot.keyCompletedResourceRefs
            .filter(r => r.type === 'task')
            .map(r => ({ id: r.id, title: r.title })),
          createdNotes: snapshot.keyCompletedResourceRefs
            .filter(r => r.type === 'note')
            .map(r => ({ id: r.id, title: r.title })),
          decisionsMade: snapshot.keyCompletedResourceRefs
            .filter(r => r.type === 'decision')
            .map(r => ({ id: r.id, title: r.title })),
          routinesRun: [],
        };
      }
    }

    // Live evidence collection from semantic activity
    const activityResult = this.activityEngine.query({
      startDate: params.startDate,
      endDate: params.endDate,
      contextId: params.contextId,
      limit: 500,
    });

    const completedTasks: { id: string; title: string; completedAt?: string }[] = [];
    const createdNotes: { id: string; title: string; createdAt?: string }[] = [];
    const decisionsMade: { id: string; title: string; decidedAt?: string }[] = [];
    const routinesRun: { id: string; title: string; completedAt?: string }[] = [];

    let tasksCompletedCount = 0;
    let tasksCreatedCount = 0;
    let notesCreatedCount = 0;
    let notesUpdatedCount = 0;
    let decisionsMadeCount = 0;
    let routinesRunCount = 0;

    for (const ev of activityResult.events) {
      if (ev.type === 'task_completed') {
        tasksCompletedCount++;
        if (ev.resource) {
          completedTasks.push({ id: ev.resource.id, title: ev.summary.primaryTitle, completedAt: ev.timestamp });
        }
      } else if (ev.type === 'resource_created') {
        if (ev.resource?.type === 'task') {
          tasksCreatedCount++;
        } else {
          notesCreatedCount++;
          if (ev.resource) {
            createdNotes.push({ id: ev.resource.id, title: ev.summary.primaryTitle, createdAt: ev.timestamp });
          }
        }
      } else if (ev.type === 'resource_edited') {
        notesUpdatedCount++;
      } else if (ev.type === 'decision_made' || ev.type === 'decision_resolved') {
        decisionsMadeCount++;
        if (ev.resource) {
          decisionsMade.push({ id: ev.resource.id, title: ev.summary.primaryTitle, decidedAt: ev.timestamp });
        }
      } else if (ev.type === 'routine_completed') {
        routinesRunCount++;
        if (ev.resource) {
          routinesRun.push({ id: ev.resource.id, title: ev.summary.primaryTitle, completedAt: ev.timestamp });
        }
      }
    }

    const metrics: ReviewEvidenceMetrics = {
      tasksCompletedCount,
      tasksCreatedCount,
      tasksOverdueCount: 0,
      notesCreatedCount,
      notesUpdatedCount,
      decisionsMadeCount,
      routinesRunCount,
      activeProjectsCount: 0,
      inboxCount: 0,
    };

    return {
      isHistoricalSnapshot: false,
      periodStart: params.startDate,
      periodEnd: params.endDate,
      metrics,
      completedTasks,
      createdNotes,
      decisionsMade,
      routinesRun,
    };
  }

  /**
   * Freezes evidence into an immutable snapshot when a review is completed
   */
  public freezeReviewSnapshot(
    reviewId: string,
    reviewType: 'weekly' | 'monthly' | 'project' | 'daily',
    startDate: string,
    endDate: string,
    report: ReviewEvidenceReport
  ): ReviewSnapshotV2 {
    const keyRefs: ResourceRef[] = [
      ...report.completedTasks.map(t => ({ id: t.id, type: 'task' as const, title: t.title })),
      ...report.createdNotes.map(n => ({ id: n.id, type: 'note' as const, title: n.title })),
      ...report.decisionsMade.map(d => ({ id: d.id, type: 'decision' as const, title: d.title })),
    ];

    const snapshot: ReviewSnapshotV2 = {
      id: `snap_${reviewId}`,
      reviewId,
      reviewType,
      periodStartDate: startDate,
      periodEndDate: endDate,
      completedAt: new Date().toISOString(),
      metrics: report.metrics,
      keyCompletedResourceRefs: keyRefs,
      activityEventIds: [],
      isImmutable: true,
    };

    this.snapshotStore.saveSnapshot(snapshot);
    return snapshot;
  }
}

export const globalReviewEvidenceCollector = new ReviewEvidenceCollectorV2();
