/**
 * Phase P49 — Project Task Derivation & Progress Engine
 * 
 * Derives project tasks from existing canonical Markdown note tasks (P25 Task Index).
 * Evaluates transparent deterministic progress only when configured.
 * Finds the deterministic Next Action.
 * Detects when all project tasks are complete to offer a completion suggestion.
 */

import { Note } from '../../types';
import { PKMTask } from '../tasks/taskTypes';
import { extractTasksFromNote } from '../tasks/taskParser';
import { ProjectProgressMode, ProjectRecord } from './planningTypes';

export interface ProjectTaskDerivationResult {
  tasks: PKMTask[];
  totalTasksCount: number;
  completedTasksCount: number;
  openTasksCount: number;
  nextActionTask: PKMTask | null;
  progressPercent: number | null;
  progressText?: string;
  canSuggestCompletion: boolean;
}

/**
 * Derives tasks and progress for a single project note
 */
export function deriveProjectTasks(
  projectNote: Note,
  progressMode?: ProjectProgressMode,
  manualProgress?: number,
  isProjectActive = true
): ProjectTaskDerivationResult {
  const tasks = extractTasksFromNote(projectNote);
  const totalTasksCount = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed);
  const openTasks = tasks.filter((t) => !t.completed);

  const completedTasksCount = completedTasks.length;
  const openTasksCount = openTasks.length;

  // Next Action: Deterministic extraction of the first open task in document order
  // (If any open task has explicit priority or earliest scheduled date, it's prioritized)
  let nextActionTask: PKMTask | null = null;
  if (openTasks.length > 0) {
    // Check if any open task is scheduled for today or overdue
    const prioritizedTask = openTasks.find((t) => t.notePriority === 'high' || t.notePriority === 'urgent');
    nextActionTask = prioritizedTask || openTasks[0];
  }

  // Progress computation
  let progressPercent: number | null = null;
  let progressText: string | undefined = undefined;

  if (progressMode === 'tasks') {
    if (totalTasksCount === 0) {
      progressPercent = 0;
      progressText = '0 tasks tracked';
    } else {
      const pct = Math.round((completedTasksCount / totalTasksCount) * 100);
      progressPercent = pct;
      progressText = `${completedTasksCount} of ${totalTasksCount} tasks (${pct}%)`;
    }
  } else if (progressMode === 'manual') {
    const manualVal = typeof manualProgress === 'number' ? Math.min(100, Math.max(0, manualProgress)) : 0;
    progressPercent = manualVal;
    progressText = `${manualVal}% (manual)`;
  } else {
    // No configured progress mode: do NOT show arbitrary percentage
    progressPercent = null;
    progressText = undefined;
  }

  // Suggest completion: All tasks are complete, at least 1 task exists, and project is still active
  const canSuggestCompletion = isProjectActive && totalTasksCount > 0 && openTasksCount === 0;

  return {
    tasks,
    totalTasksCount,
    completedTasksCount,
    openTasksCount,
    nextActionTask,
    progressPercent,
    progressText,
    canSuggestCompletion,
  };
}

/**
 * Validates blocked-by dependencies for circular references
 */
export function validateBlockedByCycles(projects: ProjectRecord[]): {
  hasCycle: boolean;
  cycleProjectIds: Set<string>;
  descriptions: string[];
} {
  const projMap = new Map<string, ProjectRecord>(projects.map((p) => [p.id, p]));
  const cycleProjectIds = new Set<string>();
  const descriptions: string[] = [];

  for (const project of projects) {
    if (!project.blockedByIds || project.blockedByIds.length === 0) continue;

    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [
      { id: project.id, path: [project.title] },
    ];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      visited.add(id);

      const curr = projMap.get(id);
      if (!curr) continue;

      for (const blockerId of curr.blockedByIds) {
        const blocker = projMap.get(blockerId);
        if (!blocker) continue;

        if (visited.has(blockerId) || blockerId === project.id) {
          cycleProjectIds.add(project.id);
          cycleProjectIds.add(blockerId);
          descriptions.push(`Circular dependency: ${path.join(' ➔ ')} ➔ ${blocker.title}`);
        } else {
          queue.push({ id: blockerId, path: [...path, blocker.title] });
        }
      }
    }
  }

  return {
    hasCycle: cycleProjectIds.size > 0,
    cycleProjectIds,
    descriptions,
  };
}
