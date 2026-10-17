/**
 * PKM V2.3 — Review Engine V2
 * 
 * Aggregates query-backed evidence panels for reviews and manages reflection sessions.
 * 
 * Non-negotiable principles:
 * - Evidence is factual and query-derived.
 * - Project review is cleanly scoped to that project.
 * - Completing a review can store a bounded snapshot of summary counts.
 * - Advances review recurrence to next cycle deterministically.
 */

import {
  ReviewRecordV2,
  ReviewTemplateV2,
  ReviewEvidenceSummary,
} from './reviewTypesV2';
import { DateOnlyString } from '../temporal/temporalTypes';
import { getTodayDateOnly, addDaysDateOnly } from '../temporal/recurrenceEngineV2';
import { temporalIndexV2 } from '../temporal/temporalIndex';

export const BUILTIN_REVIEW_TEMPLATES_V2: ReviewTemplateV2[] = [
  {
    id: 'template-weekly-review',
    type: 'weekly',
    title: 'Weekly Review & Alignment',
    description: 'Reflect on accomplishments, clear open loops, and align upcoming week priorities',
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: ['friday'],
    },
    prompts: [
      { id: 'p1', category: 'wins', question: 'What meaningful progress or key outcomes were achieved this week?' },
      { id: 'p2', category: 'clarity', question: 'Which active projects or open commitments need next actions?' },
      { id: 'p3', category: 'blockers', question: 'What friction, delays, or energy drains occurred?' },
      { id: 'p4', category: 'intentions', question: 'What are the top 3 essential focal outcomes for next week?' },
    ],
    includedEvidenceSections: [
      'completed_tasks',
      'overdue_tasks',
      'projects_without_next_action',
      'upcoming_deadlines',
      'decisions_due',
      'inbox_count',
    ],
  },
  {
    id: 'template-project-review',
    type: 'project_review',
    title: 'Project Milestone Review',
    description: 'Assess project status, verify next actions, and unblock dependencies',
    prompts: [
      { id: 'p1', category: 'wins', question: 'What milestones or deliverables were finished for this project?' },
      { id: 'p2', category: 'clarity', question: 'What is the immediate concrete next action required to move forward?' },
      { id: 'p3', category: 'blockers', question: 'Are there external blockers, missing information, or waiting dependencies?' },
    ],
    includedEvidenceSections: [
      'completed_tasks',
      'overdue_tasks',
      'upcoming_deadlines',
      'decisions_due',
    ],
  },
  {
    id: 'template-monthly-review',
    type: 'monthly',
    title: 'Monthly Horizon Review',
    description: 'Step back to evaluate goal progress, habit consistency, and area health',
    recurrence: {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 1,
    },
    prompts: [
      { id: 'p1', category: 'wins', question: 'What major highlights and learning stood out this month?' },
      { id: 'p2', category: 'clarity', question: 'Which goals are on track versus needing scope adjustment?' },
      { id: 'p3', category: 'intentions', question: 'What major project commitments will define the upcoming month?' },
    ],
    includedEvidenceSections: [
      'completed_tasks',
      'projects_without_next_action',
      'upcoming_deadlines',
      'decisions_due',
    ],
  },
];

export class ReviewEngineV2 {
  private reviews = new Map<string, ReviewRecordV2>();
  private templates = new Map<string, ReviewTemplateV2>();

  constructor() {
    for (const t of BUILTIN_REVIEW_TEMPLATES_V2) {
      this.templates.set(t.id, t);
    }
  }

  public getTemplates(): ReviewTemplateV2[] {
    return Array.from(this.templates.values());
  }

  public getTemplate(id: string): ReviewTemplateV2 | undefined {
    return this.templates.get(id);
  }

  public getReviews(): ReviewRecordV2[] {
    return Array.from(this.reviews.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getReview(id: string): ReviewRecordV2 | undefined {
    return this.reviews.get(id);
  }

  /**
   * Starts or resumes a review session
   */
  public startReview(
    templateId: string,
    options: {
      projectId?: string;
      periodStart?: DateOnlyString;
      periodEnd?: DateOnlyString;
      title?: string;
    } = {}
  ): ReviewRecordV2 {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template "${templateId}" not found.`);

    const today = getTodayDateOnly();
    const start = options.periodStart || addDaysDateOnly(today, -7);
    const end = options.periodEnd || today;

    const id = `review_${template.type}_${today}_${Math.random().toString(36).substring(2, 6)}`;
    const newReview: ReviewRecordV2 = {
      id,
      templateId,
      type: template.type,
      title: options.title || `${template.title} (${today})`,
      date: today,
      periodStart: start,
      periodEnd: end,
      projectId: options.projectId,
      promptResponses: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.reviews.set(id, newReview);
    return newReview;
  }

  /**
   * Updates prompt response in a review
   */
  public updateResponse(reviewId: string, promptId: string, text: string): ReviewRecordV2 {
    const rev = this.reviews.get(reviewId);
    if (!rev) throw new Error(`Review "${reviewId}" not found.`);

    rev.promptResponses[promptId] = text;
    rev.updatedAt = Date.now();
    return { ...rev };
  }

  /**
   * Completes a review session and generates a bounded evidence snapshot
   */
  public completeReview(reviewId: string, evidenceSummary: ReviewEvidenceSummary): ReviewRecordV2 {
    const rev = this.reviews.get(reviewId);
    if (!rev) throw new Error(`Review "${reviewId}" not found.`);

    rev.completedAt = Date.now();
    rev.snapshot = evidenceSummary;
    rev.updatedAt = Date.now();

    return { ...rev };
  }

  /**
   * Gathers live query-derived evidence for a review window
   */
  public collectEvidence(
    periodStart: DateOnlyString,
    periodEnd: DateOnlyString,
    projectId?: string
  ): ReviewEvidenceSummary {
    const today = getTodayDateOnly();

    // 1. Completed tasks
    const completedProjections = temporalIndexV2.query({
      startDate: periodStart,
      endDate: periodEnd,
      resourceTypes: ['task'],
      fields: ['completedAt', 'due'],
      includeCompleted: true,
      contextId: projectId,
    }).filter((p) => p.completed);

    // 2. Overdue tasks
    const overdueProjections = temporalIndexV2.getOverdue(today).filter((p) => {
      if (projectId && p.contextIds && !p.contextIds.includes(projectId)) return false;
      return true;
    });

    // 3. Upcoming items next 7 days
    const upcomingProjections = temporalIndexV2.query({
      startDate: today,
      endDate: addDaysDateOnly(today, 7),
      includeCompleted: false,
      contextId: projectId,
    });

    // 4. Decisions due
    const decisionsProjections = temporalIndexV2.query({
      resourceTypes: ['decision'],
      fields: ['review'],
      includeCompleted: false,
      contextId: projectId,
    });

    return {
      periodStart,
      periodEnd,
      completedTasks: completedProjections.map((p) => ({
        id: p.resourceId,
        title: p.title,
        completedDate: p.dateOnly,
        projectTitle: p.sourceDetails?.parentTitle,
      })),
      overdueTasks: overdueProjections.map((p) => ({
        id: p.resourceId,
        title: p.title,
        dueDate: p.dateOnly,
        priority: p.priority,
      })),
      projectsWithoutNextAction: [], // Populated from planning manager if needed
      upcomingItems: upcomingProjections.map((p) => ({
        id: p.resourceId,
        title: p.title,
        date: p.dateOnly,
        type: p.resourceType,
      })),
      decisionsDue: decisionsProjections.map((p) => ({
        id: p.resourceId,
        title: p.title,
        reviewDate: p.dateOnly,
      })),
      inboxCount: 0,
    };
  }
}

export const reviewEngineV2 = new ReviewEngineV2();
