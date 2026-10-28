/**
 * Phase P49 — Planning Attention Signals Engine
 * 
 * Factual, explainable signals for projects and goals.
 * STRICT NON-NEGOTIABLE PRINCIPLE:
 * No opaque productivity scoring. No life score. No gamified health ratings.
 * Every signal is an explainable fact derived directly from canonical properties.
 */

import {
  PlanningAttentionSignal,
  ProjectRecord,
  GoalRecord,
  PlanningSettings,
} from './planningTypes';
import { getTodayDateString } from '../temporal/dateUtils';
import { validateGoalHierarchies } from './goalHierarchyEngine';
import { validateBlockedByCycles } from './projectTaskEngine';

export function computeAttentionSignals(
  projects: ProjectRecord[],
  goals: GoalRecord[],
  settings: PlanningSettings
): PlanningAttentionSignal[] {
  const signals: PlanningAttentionSignal[] = [];
  const today = getTodayDateString();

  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);
  const next7DaysStr = next7Days.toISOString().slice(0, 10);

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - (settings.staleProjectDaysThreshold || 30));
  const staleDateStr = staleDate.toISOString();

  // 1. Goal Hierarchy Cycles
  const { hasCycle: hasGoalCycle, cycleDescriptions: goalCycleDescs } = validateGoalHierarchies(goals);
  if (hasGoalCycle) {
    for (const desc of goalCycleDescs) {
      signals.push({
        id: `signal-goal-cycle-${Math.random().toString(36).slice(2, 7)}`,
        type: 'goal_hierarchy_cycle',
        level: 'critical',
        resourceId: 'all-goals',
        resourceTitle: 'Goal Hierarchy',
        resourceType: 'goal',
        message: 'Circular Goal Hierarchy Detected',
        detail: desc,
      });
    }
  }

  // 2. Project Blocker Cycles
  const { hasCycle: hasProjectCycle, descriptions: projCycleDescs } = validateBlockedByCycles(projects);
  if (hasProjectCycle) {
    for (const desc of projCycleDescs) {
      signals.push({
        id: `signal-proj-cycle-${Math.random().toString(36).slice(2, 7)}`,
        type: 'project_blocked_cycle',
        level: 'critical',
        resourceId: 'all-projects',
        resourceTitle: 'Project Blockers',
        resourceType: 'project',
        message: 'Circular Project Blocker Dependency',
        detail: desc,
      });
    }
  }

  // 3. Project-level factual signals
  for (const p of projects) {
    if (p.status === 'completed' || p.status === 'cancelled') continue;

    // Overdue
    if (p.due && p.due < today) {
      signals.push({
        id: `signal-p-overdue-${p.id}`,
        type: 'project_overdue',
        level: 'critical',
        resourceId: p.id,
        resourceTitle: p.title,
        resourceType: 'project',
        message: 'Overdue Project Deadline',
        detail: `Due date was ${p.due} (past today).`,
        actionLabel: 'Open Project',
      });
    } else if (p.due && p.due <= next7DaysStr) {
      signals.push({
        id: `signal-p-due-soon-${p.id}`,
        type: 'project_due_soon',
        level: 'warning',
        resourceId: p.id,
        resourceTitle: p.title,
        resourceType: 'project',
        message: 'Due within 7 days',
        detail: `Scheduled deadline: ${p.due}.`,
      });
    }

    // No next action
    if (p.status === 'active' && p.openTasksCount === 0) {
      if (p.totalTasksCount > 0) {
        signals.push({
          id: `signal-p-all-complete-${p.id}`,
          type: 'project_all_tasks_complete',
          level: 'info',
          resourceId: p.id,
          resourceTitle: p.title,
          resourceType: 'project',
          message: 'All tasks completed',
          detail: 'All tracked tasks are finished. Consider marking the project Completed.',
          actionLabel: 'Mark Completed',
        });
      } else {
        signals.push({
          id: `signal-p-no-action-${p.id}`,
          type: 'project_no_next_action',
          level: 'warning',
          resourceId: p.id,
          resourceTitle: p.title,
          resourceType: 'project',
          message: 'No open task found',
          detail: 'Active project has no actionable open tasks in its note.',
          actionLabel: 'Add Task',
        });
      }
    }

    // Waiting / Blocked
    if (p.status === 'waiting' || (p.blockedByIds && p.blockedByIds.length > 0)) {
      const blockerNames = p.blockedByTitles.join(', ') || 'external dependency';
      signals.push({
        id: `signal-p-waiting-${p.id}`,
        type: 'project_waiting',
        level: 'info',
        resourceId: p.id,
        resourceTitle: p.title,
        resourceType: 'project',
        message: 'Waiting on blocker',
        detail: `Blocked by: ${blockerNames}.`,
      });
    }

    // Inactive Stale
    if (p.status === 'active' && p.updatedAt < staleDateStr) {
      const days = Math.round((Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      signals.push({
        id: `signal-p-stale-${p.id}`,
        type: 'project_stale',
        level: 'info',
        resourceId: p.id,
        resourceTitle: p.title,
        resourceType: 'project',
        message: 'Inactive recently',
        detail: `No note modifications for ${days} days.`,
      });
    }
  }

  // 4. Goal-level factual signals
  for (const g of goals) {
    if (g.status === 'achieved' || g.status === 'abandoned') continue;

    // Overdue Target
    if (g.targetDate && g.targetDate < today) {
      signals.push({
        id: `signal-g-overdue-${g.id}`,
        type: 'goal_overdue_target',
        level: 'warning',
        resourceId: g.id,
        resourceTitle: g.title,
        resourceType: 'goal',
        message: 'Target date passed',
        detail: `Target date was ${g.targetDate}.`,
      });
    } else if (g.targetDate && g.targetDate <= next7DaysStr) {
      signals.push({
        id: `signal-g-due-soon-${g.id}`,
        type: 'goal_target_approaching',
        level: 'info',
        resourceId: g.id,
        resourceTitle: g.title,
        resourceType: 'goal',
        message: 'Target date approaching',
        detail: `Target outcome date: ${g.targetDate}.`,
      });
    }

    // Active Goal without supporting projects
    if (g.status === 'active' && g.activeProjectsCount === 0) {
      signals.push({
        id: `signal-g-no-projects-${g.id}`,
        type: 'goal_no_projects',
        level: 'info',
        resourceId: g.id,
        resourceTitle: g.title,
        resourceType: 'goal',
        message: 'No active supporting projects',
        detail: 'Active goal has no current supporting projects linked to it.',
        actionLabel: 'Create Project',
      });
    }
  }

  return signals;
}
