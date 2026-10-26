/**
 * PKM V2.13 — Cross-Domain Weekly Review Coordinator
 *
 * Implements a unified, step-by-step review cadence spanning:
 * 1. Universal Inbox Zero Triage (unprocessed items)
 * 2. Active Projects & Next Actions Audit
 * 3. Learning & Spaced Repetition Due Catchup
 * 4. Upcoming Finance Commitments & Bills
 * 5. Upcoming Health Appointments
 * 6. Decisions Due for Retrospective
 * 7. Snapshot Generation & Reflection Journaling
 */

import { inboxProcessingExcellence } from './inboxProcessingExcellence';
import { projectsGoalsDomainExcellence } from './projectsGoalsDomainExcellence';
import { learningLibraryDomainExcellence } from './learningLibraryDomainExcellence';
import { financeHealthDomainExcellence } from './financeHealthDomainExcellence';
import { travelAssetsDecisionsDomainExcellence } from './travelAssetsDecisionsDomainExcellence';

export interface WeeklyReviewStepSummary {
  stepIndex: number;
  stepName: string;
  domainId: string;
  itemCount: number;
  completed: boolean;
}

export interface WeeklyReviewSnapshot {
  id: string;
  reviewDateOnly: string;
  completedAt: string;
  inboxItemsCleared: number;
  activeProjectsReviewed: number;
  cardsStudiedCount: number;
  billsProjectedCount: number;
  decisionsReviewedCount: number;
  reflectionNotes?: string;
}

export class CrossDomainReviewCoordinator {
  private snapshots: WeeklyReviewSnapshot[] = [];

  public getReviewStatus(todayDateOnly: string): {
    steps: WeeklyReviewStepSummary[];
    totalPendingCount: number;
  } {
    const unprocessedInbox = inboxProcessingExcellence.getUnprocessedItems();
    const activeProjects = projectsGoalsDomainExcellence.getActiveProjects();
    const dueCards = learningLibraryDomainExcellence.getDueCards(todayDateOnly);
    const upcomingBills = financeHealthDomainExcellence.getUpcomingBills(todayDateOnly);
    const openDecisions = travelAssetsDecisionsDomainExcellence
      .getAllDecisions()
      .filter((d) => d.status === 'open' || (d.reviewDateOnly && d.reviewDateOnly <= todayDateOnly));

    const steps: WeeklyReviewStepSummary[] = [
      {
        stepIndex: 1,
        stepName: 'Inbox Triage',
        domainId: 'inbox',
        itemCount: unprocessedInbox.length,
        completed: unprocessedInbox.length === 0,
      },
      {
        stepIndex: 2,
        stepName: 'Projects & Next Actions',
        domainId: 'projects',
        itemCount: activeProjects.length,
        completed: false,
      },
      {
        stepIndex: 3,
        stepName: 'Study & Cards',
        domainId: 'learning',
        itemCount: dueCards.length,
        completed: dueCards.length === 0,
      },
      {
        stepIndex: 4,
        stepName: 'Upcoming Commitments',
        domainId: 'finance',
        itemCount: upcomingBills.length,
        completed: false,
      },
      {
        stepIndex: 5,
        stepName: 'Decisions Retrospective',
        domainId: 'decisions',
        itemCount: openDecisions.length,
        completed: false,
      },
    ];

    const totalPending = unprocessedInbox.length + dueCards.length + upcomingBills.length;

    return {
      steps,
      totalPendingCount: totalPending,
    };
  }

  public completeReview(params: {
    todayDateOnly: string;
    reflectionNotes?: string;
  }): WeeklyReviewSnapshot {
    const snapshot: WeeklyReviewSnapshot = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      reviewDateOnly: params.todayDateOnly,
      completedAt: new Date().toISOString(),
      inboxItemsCleared: inboxProcessingExcellence.getAllItems().filter((i) => i.processed).length,
      activeProjectsReviewed: projectsGoalsDomainExcellence.getActiveProjects().length,
      cardsStudiedCount: 0,
      billsProjectedCount: financeHealthDomainExcellence.getUpcomingBills(params.todayDateOnly).length,
      decisionsReviewedCount: travelAssetsDecisionsDomainExcellence.getAllDecisions().filter((d) => d.status === 'reviewed').length,
      reflectionNotes: params.reflectionNotes,
    };

    this.snapshots.unshift(snapshot);
    return snapshot;
  }

  public getAllSnapshots(): WeeklyReviewSnapshot[] {
    return [...this.snapshots];
  }

  public clear(): void {
    this.snapshots = [];
  }
}

export const crossDomainReviewCoordinator = new CrossDomainReviewCoordinator();
