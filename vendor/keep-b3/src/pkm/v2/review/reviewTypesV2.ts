/**
 * PKM V2.3 — Canonical Review System Types
 * 
 * Formalizes periodic reflection workflows:
 * - Review records are canonical Notes/Resources.
 * - Evidence panels are query-backed and live.
 * - Optional snapshots store structured summary counts/references at completion time.
 * - Strictly NO fake productivity scores or guilt messaging.
 */

import { DateOnlyString, RecurrenceRuleV2 } from '../temporal/temporalTypes';

export type ReviewTypeV2 =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'project_review';

export interface ReviewReflectionPrompt {
  id: string;
  category: 'wins' | 'clarity' | 'blockers' | 'intentions' | 'custom';
  question: string;
}

export interface ReviewTemplateV2 {
  id: string;
  type: ReviewTypeV2;
  title: string;
  description: string;
  recurrence?: RecurrenceRuleV2;
  prompts: ReviewReflectionPrompt[];
  includedEvidenceSections: Array<
    | 'completed_tasks'
    | 'overdue_tasks'
    | 'projects_without_next_action'
    | 'upcoming_deadlines'
    | 'decisions_due'
    | 'inbox_count'
  >;
}

export interface ReviewEvidenceSummary {
  periodStart: DateOnlyString;
  periodEnd: DateOnlyString;
  completedTasks: Array<{ id: string; title: string; completedDate?: string; projectTitle?: string }>;
  overdueTasks: Array<{ id: string; title: string; dueDate: string; priority?: string }>;
  projectsWithoutNextAction: Array<{ id: string; title: string; totalTasks: number }>;
  upcomingItems: Array<{ id: string; title: string; date: string; type: string }>;
  decisionsDue: Array<{ id: string; title: string; reviewDate: string }>;
  inboxCount: number;
}

export interface ReviewRecordV2 {
  id: string;
  templateId: string;
  type: ReviewTypeV2;
  title: string;
  date: DateOnlyString;
  periodStart: DateOnlyString;
  periodEnd: DateOnlyString;
  projectId?: string; // If project_review
  promptResponses: Record<string, string>; // promptId -> response text
  completedAt?: number;
  snapshot?: ReviewEvidenceSummary;
  createdAt: number;
  updatedAt: number;
}
