/**
 * PKM V2.3 — Plan Today Workflow Engine
 * 
 * Implements the user-guided morning alignment and daily planning workflow.
 * 
 * Non-negotiable principles:
 * - User remains in full control (no silent algorithmic auto-scheduling).
 * - Focus items represent intentional daily emphasis.
 * - Scheduling a task changes its `scheduled` field, NOT its `due` date.
 * - Daily note is created ONLY if explicitly requested by user.
 */

import { PlanTodayState, FocusItemV2 } from './planningTypes';
import { DateOnlyString } from '../temporal/temporalTypes';
import { getTodayDateOnly } from '../temporal/recurrenceEngineV2';
import { temporalIndexV2 } from '../temporal/temporalIndex';

export class PlanTodayWorkflowEngine {
  private activePlans = new Map<DateOnlyString, PlanTodayState>();

  /**
   * Initializes or gets the plan for a specific date (defaults to today)
   */
  public getOrCreatePlan(date: DateOnlyString = getTodayDateOnly()): PlanTodayState {
    const existing = this.activePlans.get(date);
    if (existing) return existing;

    const newPlan: PlanTodayState = {
      date,
      focusItems: [],
      scheduledTaskIds: [],
      dailyNoteCreated: false,
    };

    this.activePlans.set(date, newPlan);
    return newPlan;
  }

  /**
   * Adds a focus item to the daily plan
   */
  public addFocusItem(
    date: DateOnlyString,
    item: Omit<FocusItemV2, 'id' | 'order'>
  ): PlanTodayState {
    const plan = this.getOrCreatePlan(date);
    const newItem: FocusItemV2 = {
      ...item,
      id: `focus_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order: plan.focusItems.length + 1,
    };

    plan.focusItems.push(newItem);
    return { ...plan };
  }

  /**
   * Removes a focus item from the daily plan
   */
  public removeFocusItem(date: DateOnlyString, focusId: string): PlanTodayState {
    const plan = this.getOrCreatePlan(date);
    plan.focusItems = plan.focusItems.filter((f) => f.id !== focusId);
    return { ...plan };
  }

  /**
   * Assigns a scheduled time for a task during planning
   * Mutates Scheduled property without touching Due date.
   */
  public scheduleTaskForToday(
    taskId: string,
    taskTitle: string,
    time: string, // "14:00"
    date: DateOnlyString = getTodayDateOnly()
  ): {
    success: boolean;
    conflictWarning?: string;
  } {
    const plan = this.getOrCreatePlan(date);

    // Check for existing events at this time
    const existingToday = temporalIndexV2.getForDate(date);
    const conflict = existingToday.find((item) => item.time === time);

    let conflictWarning: string | undefined;
    if (conflict) {
      conflictWarning = `Time slot ${time} conflicts with existing item: "${conflict.title}"`;
    }

    // Index projection as scheduled
    temporalIndexV2.indexProjection({
      id: `proj-task-${taskId}-sched`,
      resourceId: taskId,
      resourceType: 'task',
      title: taskTitle,
      field: 'scheduled',
      dateOnly: date,
      time,
      isAllDay: false,
      completed: false,
    });

    if (!plan.scheduledTaskIds.includes(taskId)) {
      plan.scheduledTaskIds.push(taskId);
    }

    return {
      success: true,
      conflictWarning,
    };
  }

  /**
   * Clears scheduled time for a task (leaves Due intact)
   */
  public unscheduleTask(taskId: string): void {
    temporalIndexV2.removeProjection(`proj-task-${taskId}-sched`);
  }
}

export const planTodayWorkflowEngine = new PlanTodayWorkflowEngine();
