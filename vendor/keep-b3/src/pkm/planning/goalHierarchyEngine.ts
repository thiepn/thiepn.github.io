/**
 * Phase P49 — Goal Hierarchy & Cycle Detection Engine
 * 
 * Supports shallow goal hierarchies (parent-goal) and detects recursive cycles
 * (e.g. Goal A -> Goal B -> Goal A) with explainable warnings without crashing.
 */

import { GoalRecord } from './planningTypes';

export interface GoalTreeNode {
  goal: GoalRecord;
  children: GoalTreeNode[];
  depth: number;
}

export interface HierarchyValidationResult {
  hasCycle: boolean;
  cycleGoalIds: Set<string>;
  cycleDescriptions: string[];
}

/**
 * Validates a collection of goals for hierarchy cycles
 */
export function validateGoalHierarchies(goals: GoalRecord[]): HierarchyValidationResult {
  const goalMap = new Map<string, GoalRecord>(goals.map((g) => [g.id, g]));
  const cycleGoalIds = new Set<string>();
  const cycleDescriptions: string[] = [];

  for (const goal of goals) {
    if (!goal.parentGoalId) continue;

    const visited = new Set<string>();
    let current: GoalRecord | undefined = goal;
    const path: string[] = [];

    while (current && current.parentGoalId) {
      visited.add(current.id);
      path.push(current.title);

      const parentId = current.parentGoalId;
      if (visited.has(parentId)) {
        // Cycle detected
        path.push(goalMap.get(parentId)?.title || parentId);
        cycleGoalIds.add(current.id);
        cycleGoalIds.add(parentId);
        cycleDescriptions.push(`Circular hierarchy detected: ${path.join(' ➔ ')}`);
        break;
      }

      current = goalMap.get(parentId);
    }
  }

  return {
    hasCycle: cycleGoalIds.size > 0,
    cycleGoalIds,
    cycleDescriptions,
  };
}

/**
 * Builds a hierarchical tree of goals
 */
export function buildGoalHierarchyTree(goals: GoalRecord[]): GoalTreeNode[] {
  const goalMap = new Map<string, GoalRecord>(goals.map((g) => [g.id, g]));
  const childMap = new Map<string, GoalRecord[]>();
  const rootGoals: GoalRecord[] = [];

  const { cycleGoalIds } = validateGoalHierarchies(goals);

  // Group by parent
  for (const goal of goals) {
    if (!goal.parentGoalId || !goalMap.has(goal.parentGoalId) || cycleGoalIds.has(goal.id)) {
      rootGoals.push(goal);
    } else {
      const list = childMap.get(goal.parentGoalId) || [];
      list.push(goal);
      childMap.set(goal.parentGoalId, list);
    }
  }

  function buildNode(goal: GoalRecord, depth = 0): GoalTreeNode {
    const children = (childMap.get(goal.id) || []).map((child) => buildNode(child, depth + 1));
    return {
      goal,
      children,
      depth,
    };
  }

  return rootGoals.map((g) => buildNode(g, 0));
}
