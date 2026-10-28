/**
 * Phase P49 — Goals, Projects, Areas & Personal Planning System Types
 * 
 * Defines canonical properties, derived records, planning horizons, focus items,
 * and review structures.
 * 
 * Non-negotiable principle: Goals, Projects, Areas, and Reviews are CANONICAL NOTES
 * and structured views over existing data — NOT a secondary proprietary database.
 */

import { Note, Folder } from '../../types';
import { PKMTask } from '../tasks/taskTypes';

// ==========================================
// 1. GOALS
// ==========================================

export type GoalStatus = 'planned' | 'active' | 'paused' | 'achieved' | 'abandoned';
export type GoalPriority = 'urgent' | 'high' | 'medium' | 'low';
export type GoalProgressMode = 'tasks' | 'projects' | 'numeric' | 'manual';
export type ProgressDirection = 'increase' | 'decrease';

export interface GoalRecord {
  id: string; // Note ID
  noteId: string;
  title: string;
  status: GoalStatus;
  targetDate?: string; // YYYY-MM-DD
  areaId?: string;
  areaTitle?: string;
  parentGoalId?: string;
  parentGoalTitle?: string;
  priority?: GoalPriority;
  progressMode?: GoalProgressMode;
  progressTarget?: number;
  progressCurrent?: number;
  progressUnit?: string;
  progressDirection?: ProgressDirection;
  progressPercent?: number; // Calculated deterministic % if configured
  supportingProjectIds: string[];
  supportingProjectTitles: string[];
  activeProjectsCount: number;
  completedProjectsCount: number;
  hasHierarchyCycle?: boolean;
  tags: string[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2. PROJECTS
// ==========================================

export type ProjectStatus = 'planned' | 'active' | 'waiting' | 'paused' | 'completed' | 'cancelled';
export type ProjectPriority = 'urgent' | 'high' | 'medium' | 'low';
export type ProjectProgressMode = 'tasks' | 'manual';

export interface ProjectRecord {
  id: string; // Note ID
  noteId: string;
  title: string;
  status: ProjectStatus;
  goalIds: string[];
  goalTitles: string[];
  areaId?: string;
  areaTitle?: string;
  due?: string; // YYYY-MM-DD
  start?: string; // YYYY-MM-DD
  priority?: ProjectPriority;
  peopleIds: string[];
  peopleTitles: string[];
  organizationIds: string[];
  organizationTitles: string[];
  blockedByIds: string[];
  blockedByTitles: string[];
  progressMode?: ProjectProgressMode;
  manualProgress?: number; // 0-100
  completedDate?: string; // YYYY-MM-DD
  totalTasksCount: number;
  completedTasksCount: number;
  openTasksCount: number;
  nextActionTask?: PKMTask | null;
  progressPercent?: number | null; // null if unconfigured
  progressText?: string; // e.g. "6 of 10 tasks (60%)" or "40%"
  canSuggestCompletion?: boolean; // All tasks complete but status is still active
  isInactiveStale?: boolean; // No activity for 30+ days
  hasBlockedCycle?: boolean;
  tags: string[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. AREAS OF RESPONSIBILITY
// ==========================================

export type AreaStatus = 'active' | 'inactive' | 'archived';

export interface AreaRecord {
  id: string; // Note ID
  noteId: string;
  title: string;
  status: AreaStatus;
  goalIds: string[];
  goalTitles: string[];
  projectIds: string[];
  projectTitles: string[];
  activeProjectsCount: number;
  activeGoalsCount: number;
  peopleIds: string[];
  peopleTitles: string[];
  tags: string[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. PERIODIC REVIEWS
// ==========================================

export type ReviewPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface ReviewRecord {
  id: string; // Note ID
  noteId: string;
  title: string;
  period: ReviewPeriod;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  focusItemIds: string[];
  focusItemTitles: string[];
  completedTasksCount?: number;
  tags: string[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. CURRENT FOCUS (PLANNING EMPHASIS)
// ==========================================

export interface FocusItem {
  id: string; // Unique focus entry ID
  type: 'project' | 'goal' | 'note';
  resourceId: string; // Note ID
  title: string;
  status?: string;
  due?: string;
  nextAction?: string;
  progressText?: string;
  progressPercent?: number;
  isMissing?: boolean; // If note was deleted/trashed
}

// ==========================================
// 6. ATTENTION SIGNALS (FACTUAL ONLY)
// ==========================================

export type AttentionSignalType =
  | 'project_overdue'
  | 'project_due_soon'
  | 'project_no_next_action'
  | 'project_waiting'
  | 'project_stale'
  | 'project_all_tasks_complete'
  | 'project_blocked_cycle'
  | 'goal_target_approaching'
  | 'goal_no_projects'
  | 'goal_overdue_target'
  | 'goal_hierarchy_cycle';

export interface PlanningAttentionSignal {
  id: string;
  type: AttentionSignalType;
  level: 'info' | 'warning' | 'critical';
  resourceId: string;
  resourceTitle: string;
  resourceType: 'project' | 'goal' | 'area';
  message: string;
  detail: string;
  actionLabel?: string;
  actionCommand?: string;
}

// ==========================================
// 7. HOME / PLANNING HUB CONFIGURATION
// ==========================================

export interface PlanningHomeSection {
  id: 'today' | 'focus' | 'projects' | 'goals' | 'upcoming' | 'inbox' | 'followups' | 'review';
  name: string;
  visible: boolean;
  order: number;
}

export interface PlanningSettings {
  staleProjectDaysThreshold: number; // default 30
  taskScopeMode: 'note_only' | 'note_and_related';
  defaultProjectProgressMode: 'tasks' | 'manual' | 'none';
  defaultGoalProgressMode: 'projects' | 'numeric' | 'manual' | 'none';
  enableWeeklyReviewReminder: boolean;
  weeklyReviewDayOfWeek: number; // 0=Sunday, 5=Friday, 6=Saturday, 1=Monday
  homeSections: PlanningHomeSection[];
}

export const DEFAULT_PLANNING_SETTINGS: PlanningSettings = {
  staleProjectDaysThreshold: 30,
  taskScopeMode: 'note_only',
  defaultProjectProgressMode: 'tasks',
  defaultGoalProgressMode: 'projects',
  enableWeeklyReviewReminder: false,
  weeklyReviewDayOfWeek: 5, // Friday
  homeSections: [
    { id: 'today', name: 'Today & Agenda', visible: true, order: 0 },
    { id: 'focus', name: 'Current Focus', visible: true, order: 1 },
    { id: 'projects', name: 'Active Projects', visible: true, order: 2 },
    { id: 'upcoming', name: 'Upcoming Deadlines', visible: true, order: 3 },
    { id: 'inbox', name: 'Inbox & Captures', visible: true, order: 4 },
    { id: 'followups', name: 'People Follow-Ups', visible: true, order: 5 },
    { id: 'goals', name: 'Active Goals', visible: true, order: 6 },
    { id: 'review', name: 'Review Status', visible: true, order: 7 },
  ],
};

// ==========================================
// 8. WEEKLY REVIEW SNAPSHOT
// ==========================================

export interface WeeklyReviewSnapshot {
  period: ReviewPeriod;
  periodStart: string;
  periodEnd: string;
  label: string;
  completedTasks: PKMTask[];
  overdueTasks: PKMTask[];
  activeProjects: ProjectRecord[];
  projectsWithoutNextAction: ProjectRecord[];
  activeGoals: GoalRecord[];
  goalsWithoutActiveProjects: GoalRecord[];
  inboxCount: number;
  upcomingDeadlines: Array<{
    title: string;
    date: string;
    type: 'project' | 'task' | 'goal';
    id: string;
  }>;
  focusSuggestions: ProjectRecord[];
}
