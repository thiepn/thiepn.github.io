/**
 * PKM V2.20 — Routine Coordinator V2
 * 
 * Manages structured, human-executed workflows (Morning Routine, Weekly Prep,
 * Project Launch Checklist) with step state tracking and historical run logs.
 */

import {
  V2RoutineDefinition,
  V2RoutineRun,
  V2RoutineStep,
} from './automationTypesV2';
import { DateOnlyString } from '../temporal/temporalTypes';
import { AdvancedRecurrenceEngineV2 } from './advancedRecurrenceEngineV2';

export class RoutineCoordinatorV2 {
  private routines = new Map<string, V2RoutineDefinition>();
  private runs = new Map<string, V2RoutineRun>();

  constructor() {
    this.registerBuiltInRoutines();
  }

  private registerBuiltInRoutines(): void {
    const morningKickoff: V2RoutineDefinition = {
      id: 'routine-morning-kickoff',
      name: 'Daily Morning Kickoff',
      description: 'Align mental clarity, check agenda, and select top 3 focus priorities',
      iconName: 'Sun',
      color: '#f59e0b',
      timeOfDay: 'morning',
      estimatedMinutes: 15,
      schedule: {
        frequency: 'weekdays',
        interval: 1,
      },
      steps: [
        {
          id: 'step-1',
          kind: 'checklist',
          label: 'Review yesterday’s completed log and open captures',
          order: 0,
        },
        {
          id: 'step-2',
          kind: 'safe_action',
          label: 'Generate Today Plan & Top 3 Focus Tasks',
          actionId: 'tasks:create-top-three',
          actionParams: { category: 'focus' },
          order: 1,
        },
        {
          id: 'step-3',
          kind: 'resource_link',
          label: 'Open Active Sprint / Project Dashboard',
          resourceId: 'view-active-projects',
          order: 2,
        },
      ],
      status: 'active',
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const weeklyReview: V2RoutineDefinition = {
      id: 'routine-weekly-review',
      name: 'Weekly System Maintenance & Reflection',
      description: 'Clear inboxes, audit overdue tasks, review goals, and calibrate next week',
      iconName: 'RotateCcw',
      color: '#8b5cf6',
      timeOfDay: 'anytime',
      estimatedMinutes: 30,
      schedule: {
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: ['sunday', 'monday'],
      },
      steps: [
        {
          id: 'wr-1',
          kind: 'checklist',
          label: 'Process all Inbox captures to zero',
          order: 0,
        },
        {
          id: 'wr-2',
          kind: 'checklist',
          label: 'Audit active projects and archive completed outcomes',
          order: 1,
        },
        {
          id: 'wr-3',
          kind: 'safe_action',
          label: 'Initiate Weekly Review Snapshot',
          actionId: 'review:start-weekly-review',
          actionParams: { title: 'Weekly Cadence' },
          order: 2,
        },
      ],
      status: 'active',
      order: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.registerRoutine(morningKickoff);
    this.registerRoutine(weeklyReview);
  }

  public registerRoutine(routine: V2RoutineDefinition): void {
    this.routines.set(routine.id, routine);
  }

  public getRoutines(includeArchived = false): V2RoutineDefinition[] {
    const list = Array.from(this.routines.values()).sort((a, b) => a.order - b.order);
    return includeArchived ? list : list.filter(r => r.status !== 'archived');
  }

  public getRoutine(id: string): V2RoutineDefinition | undefined {
    return this.routines.get(id);
  }

  public startRun(routineId: string, dateStr?: DateOnlyString): V2RoutineRun {
    const routine = this.routines.get(routineId);
    if (!routine) {
      throw new Error(`Routine "${routineId}" does not exist.`);
    }

    const date = dateStr || AdvancedRecurrenceEngineV2.formatSafeDate(new Date());
    const runId = `run-${routineId}-${date}-${Date.now()}`;

    const stepStates: Record<string, boolean> = {};
    for (const step of routine.steps) {
      stepStates[step.id] = false;
    }

    const run: V2RoutineRun = {
      id: runId,
      routineId,
      routineName: routine.name,
      date,
      startedAt: Date.now(),
      stepStates,
    };

    this.runs.set(run.id, run);
    return run;
  }

  public toggleStep(runId: string, stepId: string, completed?: boolean): V2RoutineRun {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Routine run "${runId}" not found.`);
    }

    const current = run.stepStates[stepId] || false;
    run.stepStates[stepId] = completed !== undefined ? completed : !current;

    // Check if all steps are complete
    const allDone = Object.values(run.stepStates).every(Boolean);
    if (allDone && !run.completedAt) {
      run.completedAt = Date.now();
      run.durationSeconds = Math.round((run.completedAt - run.startedAt) / 1000);
    } else if (!allDone && run.completedAt) {
      run.completedAt = undefined;
      run.durationSeconds = undefined;
    }

    return { ...run };
  }

  public finishRun(runId: string, notes?: string): V2RoutineRun {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Routine run "${runId}" not found.`);
    }

    run.completedAt = Date.now();
    run.durationSeconds = Math.round((run.completedAt - run.startedAt) / 1000);
    if (notes) run.notes = notes;

    return { ...run };
  }

  public getRunsForRoutine(routineId: string): V2RoutineRun[] {
    return Array.from(this.runs.values())
      .filter(r => r.routineId === routineId)
      .sort((a, b) => b.startedAt - a.startedAt);
  }

  public getRunsForDate(date: DateOnlyString): V2RoutineRun[] {
    return Array.from(this.runs.values())
      .filter(r => r.date === date)
      .sort((a, b) => b.startedAt - a.startedAt);
  }
}

export const routineCoordinatorV2 = new RoutineCoordinatorV2();
