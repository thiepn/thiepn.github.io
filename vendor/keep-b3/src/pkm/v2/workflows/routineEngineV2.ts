/**
 * PKM V2.3 — Routine & Habit Workflow Engine V2
 * 
 * Manages structured, trackable routine definitions and execution runs.
 * Non-negotiable principles:
 * - Routines are ordered repeated processes with trackable steps and run history.
 * - Missed routines/habits are NOT marked failed; no streak gamification punishment.
 * - Actions within routine steps are bounded and safety validated.
 */

import {
  RoutineDefinitionV2,
  RoutineRunV2,
  RoutineStepV2,
} from './workflowTypes';
import { DateOnlyString } from '../temporal/temporalTypes';
import { getTodayDateOnly } from '../temporal/recurrenceEngineV2';
import { actionSequenceExecutor } from './actionSequenceExecutor';

export const BUILTIN_ROUTINES_V2: RoutineDefinitionV2[] = [
  {
    id: 'routine-morning-planning',
    name: 'Morning Alignment Routine',
    description: 'Review daily commitments, align top priorities, and set intention',
    iconName: 'Sun',
    color: '#f59e0b',
    schedule: {
      frequency: 'daily',
      interval: 1,
    },
    daypart: 'morning',
    steps: [
      { id: 'step-1', type: 'checklist', label: 'Review today’s scheduled calendar events', order: 1 },
      { id: 'step-2', type: 'checklist', label: 'Select top 1-3 focus tasks for today', order: 2 },
      { id: 'step-3', type: 'checklist', label: 'Check in with daily physical wellbeing', order: 3 },
    ],
    status: 'active',
    order: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'routine-evening-shutdown',
    name: 'Evening Shutdown Routine',
    description: 'Capture open loops, triage inbox, and close workspace cleanly',
    iconName: 'Moon',
    color: '#6366f1',
    schedule: {
      frequency: 'daily',
      interval: 1,
    },
    daypart: 'evening',
    steps: [
      { id: 'step-1', type: 'checklist', label: 'Triage pending quick captures and inbox items', order: 1 },
      { id: 'step-2', type: 'checklist', label: 'Mark finished tasks and update tomorrow’s schedule', order: 2 },
      { id: 'step-3', type: 'checklist', label: 'Clear working tabs and log daily closing reflection', order: 3 },
    ],
    status: 'active',
    order: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export class RoutineEngineV2 {
  private routines = new Map<string, RoutineDefinitionV2>();
  private runs = new Map<string, RoutineRunV2>();

  constructor() {
    for (const r of BUILTIN_ROUTINES_V2) {
      this.routines.set(r.id, r);
    }
  }

  public getRoutines(): RoutineDefinitionV2[] {
    return Array.from(this.routines.values()).sort((a, b) => a.order - b.order);
  }

  public getRoutine(id: string): RoutineDefinitionV2 | undefined {
    return this.routines.get(id);
  }

  public registerRoutine(routine: RoutineDefinitionV2): void {
    this.routines.set(routine.id, routine);
  }

  /**
   * Starts a new run for a routine on a specific date (defaults to today)
   */
  public startRun(routineId: string, date: DateOnlyString = getTodayDateOnly()): RoutineRunV2 {
    const routine = this.routines.get(routineId);
    if (!routine) {
      throw new Error(`Routine "${routineId}" not found.`);
    }

    const runId = `run_${routineId}_${date}`;
    const existing = this.runs.get(runId);
    if (existing) {
      return existing;
    }

    const newRun: RoutineRunV2 = {
      id: runId,
      routineId,
      routineName: routine.name,
      date,
      startedAt: Date.now(),
      stepStates: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Initialize all step states to false
    for (const step of routine.steps) {
      newRun.stepStates[step.id] = false;
    }

    this.runs.set(runId, newRun);
    return newRun;
  }

  /**
   * Toggles completion status for a step in a routine run
   */
  public async toggleStep(runId: string, stepId: string, runtimeContext?: any): Promise<RoutineRunV2> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Routine run "${runId}" not found.`);

    const routine = this.routines.get(run.routineId);
    if (!routine) throw new Error(`Routine "${run.routineId}" not found.`);

    const step = routine.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Step "${stepId}" not found.`);

    const nextState = !run.stepStates[stepId];
    run.stepStates[stepId] = nextState;
    run.updatedAt = Date.now();

    // If step is a safe action and became completed, execute action
    if (nextState && step.type === 'safe_action' && step.actionId) {
      await actionSequenceExecutor.executeSequence(
        `routine-step-${stepId}`,
        step.label,
        [{ actionId: step.actionId, label: step.label, args: step.actionArgs }],
        runtimeContext
      );
    }

    // Check if all steps are completed
    const allCompleted = routine.steps.every((s) => run.stepStates[s.id]);
    if (allCompleted && !run.completedAt) {
      run.completedAt = Date.now();
    } else if (!allCompleted) {
      run.completedAt = undefined;
    }

    return { ...run };
  }

  /**
   * Marks a run completely finished
   */
  public finishRun(runId: string, notes?: string): RoutineRunV2 {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Routine run "${runId}" not found.`);

    run.completedAt = Date.now();
    if (notes) run.notes = notes;
    run.updatedAt = Date.now();

    return { ...run };
  }

  public getRunsForRoutine(routineId: string): RoutineRunV2[] {
    return Array.from(this.runs.values())
      .filter((r) => r.routineId === routineId)
      .sort((a, b) => b.startedAt - a.startedAt);
  }

  public getRun(runId: string): RoutineRunV2 | undefined {
    return this.runs.get(runId);
  }
}

export const routineEngineV2 = new RoutineEngineV2();
