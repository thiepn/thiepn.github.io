/**
 * PKM V2.3 — Planning System Types
 * 
 * Formalizes planning hierarchies without forcing rigid constraints:
 * - Goal: Long-term intention/direction
 * - Project: Multi-action outcome
 * - Task: Concrete actionable step
 * - Area: Ongoing responsibility
 * - Focus: Current temporary emphasis
 * - Context: Active cognitive working frame
 */

import { DateOnlyString } from '../temporal/temporalTypes';

export interface GoalV2 {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  targetDate?: DateOnlyString;
  areaId?: string;
  supportingProjectIds: string[];
  tags?: string[];
}

export interface ProjectV2 {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'waiting' | 'paused' | 'archived';
  goalId?: string;
  areaId?: string;
  due?: DateOnlyString;
  scheduled?: DateOnlyString;
  tags?: string[];
  totalTasksCount: number;
  completedTasksCount: number;
  openTasksCount: number;
  nextActionTaskId?: string;
  nextActionTitle?: string;
  hasNoNextAction: boolean; // Flagged when active project has 0 open next actions
}

export interface AreaV2 {
  id: string;
  title: string;
  status: 'active' | 'archived';
  projectIds: string[];
  goalIds: string[];
  tags?: string[];
}

export interface FocusItemV2 {
  id: string;
  resourceId: string;
  resourceType: 'project' | 'goal' | 'task' | 'note';
  title: string;
  reason?: string;
  scheduledTime?: string;
  order: number;
}

export interface PlanTodayState {
  date: DateOnlyString;
  focusItems: FocusItemV2[];
  scheduledTaskIds: string[];
  dailyNoteCreated: boolean;
  notes?: string;
}

export interface AIPlanProposal {
  proposedDate: DateOnlyString;
  proposedFocus: Array<{
    resourceId: string;
    title: string;
    suggestedTime?: string;
    rationale: string;
  }>;
  detectedConflicts: Array<{
    time: string;
    existingItemTitle: string;
    proposedItemTitle: string;
    severity: 'warning' | 'conflict';
  }>;
  suggestedOrdering: string[];
}
