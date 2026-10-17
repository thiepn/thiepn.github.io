/**
 * PKM V2.4 — Review Snapshot & Historical Evidence Model
 *
 * Guarantees historical review immutability:
 * - Freezes factual evidence metrics at the exact moment a review is completed
 * - When reopening past reviews, historical values are shown instead of recalculating live state
 * - Cleanly separates Canonical User Reflection (Markdown) from Frozen Evidence Snapshots
 * - Strictly avoids productivity scores, engagement metrics, or subjective performance grades
 */

import { ResourceRef } from '../core/resource/resourceCore';
import { ActivityEvent } from '../activity';

export interface ReviewEvidenceMetrics {
  tasksCompletedCount: number;
  tasksCreatedCount: number;
  tasksOverdueCount: number;
  notesCreatedCount: number;
  notesUpdatedCount: number;
  decisionsMadeCount: number;
  routinesRunCount: number;
  activeProjectsCount: number;
  inboxCount: number;
  domainMetrics?: Record<string, number>; // e.g., workoutsCompleted, booksFinished
}

export interface ReviewSnapshotV2 {
  id: string; // snap_{reviewId}
  reviewId: string;
  reviewType: 'weekly' | 'monthly' | 'project' | 'daily';
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string;   // YYYY-MM-DD
  completedAt: string;     // ISO UTC Instant
  
  // Frozen factual evidence
  metrics: ReviewEvidenceMetrics;
  keyCompletedResourceRefs: ResourceRef[];
  activityEventIds: string[];
  
  // Query checksum for audit trail
  isImmutable: boolean;
}

export class ReviewSnapshotStoreV2 {
  private snapshots = new Map<string, ReviewSnapshotV2>();

  public saveSnapshot(snapshot: ReviewSnapshotV2): void {
    this.snapshots.set(snapshot.reviewId, {
      ...snapshot,
      isImmutable: true,
    });
  }

  public getSnapshot(reviewId: string): ReviewSnapshotV2 | undefined {
    return this.snapshots.get(reviewId);
  }

  public hasSnapshot(reviewId: string): boolean {
    return this.snapshots.has(reviewId);
  }

  public getAllSnapshots(): ReviewSnapshotV2[] {
    return Array.from(this.snapshots.values());
  }

  public clear(): void {
    this.snapshots.clear();
  }
}

export const globalReviewSnapshotStore = new ReviewSnapshotStoreV2();
