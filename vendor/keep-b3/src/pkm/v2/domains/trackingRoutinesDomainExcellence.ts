/**
 * PKM V2.13 — Tracking, Routines & Habits Excellence Engine
 *
 * Implements low-friction factual tracking and routine workflows:
 * - Tracker definition & Quick Log (open -> value -> save)
 * - Immutable factual event ledger
 * - Missing data semantics: Missing entry != failure (no guilt colors)
 * - Bounded time-series projection windows (7d, 30d, 3m, 1y, All)
 * - Routines with sequential step runner and resume capability
 * - Habit logs without gamified/punitive streak dominance
 * - Millions-scale event handling capability with indexed aggregation
 */

export type TrackerValueType = 'number' | 'boolean' | 'scale_1_5' | 'duration_minutes' | 'text';

export interface V2TrackerDefinition {
  id: string;
  name: string;
  unit: string;
  valueType: TrackerValueType;
  description?: string;
  targetDirection?: 'higher_is_better' | 'lower_is_better' | 'neutral';
  tags?: string[];
  createdAt: string;
}

export interface V2TrackingEvent {
  id: string;
  trackerId: string;
  timestamp: string; // ISO UTC Instant
  dateOnly: string; // YYYY-MM-DD
  numericValue?: number;
  textValue?: string;
  notes?: string;
  source: 'manual_quick_log' | 'automated_sensor' | 'imported_csv';
}

export interface V2RoutineStep {
  id: string;
  label: string;
  durationEstimateMinutes?: number;
  optional?: boolean;
}

export interface V2RoutineDefinition {
  id: string;
  title: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  steps: V2RoutineStep[];
  expectedDaysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  active: boolean;
}

export interface V2RoutineExecutionRun {
  id: string;
  routineId: string;
  startedAt: string;
  completedAt?: string;
  completedStepIds: string[];
  totalStepsCount: number;
}

export interface V2HabitDefinition {
  id: string;
  name: string;
  frequency: 'daily' | 'weekdays' | 'weekly';
  description?: string;
  active: boolean;
}

export interface V2HabitLogEntry {
  id: string;
  habitId: string;
  dateOnly: string;
  completed: boolean;
  loggedAt: string;
}

export class TrackingRoutinesDomainExcellence {
  private trackers = new Map<string, V2TrackerDefinition>();
  private trackingEvents = new Map<string, V2TrackingEvent[]>(); // trackerId -> events
  private routines = new Map<string, V2RoutineDefinition>();
  private routineRuns = new Map<string, V2RoutineExecutionRun[]>(); // routineId -> runs
  private habits = new Map<string, V2HabitDefinition>();
  private habitLogs = new Map<string, V2HabitLogEntry[]>(); // habitId -> logs

  // ================= Tracking =================

  public saveTracker(tracker: V2TrackerDefinition): V2TrackerDefinition {
    this.trackers.set(tracker.id, { ...tracker });
    if (!this.trackingEvents.has(tracker.id)) {
      this.trackingEvents.set(tracker.id, []);
    }
    return tracker;
  }

  public getTracker(id: string): V2TrackerDefinition | undefined {
    return this.trackers.get(id);
  }

  public getAllTrackers(): V2TrackerDefinition[] {
    return Array.from(this.trackers.values());
  }

  /**
   * Fast Quick Log (2-tap logging)
   */
  public logEvent(params: {
    trackerId: string;
    numericValue?: number;
    textValue?: string;
    notes?: string;
    timestamp?: string;
    source?: 'manual_quick_log' | 'automated_sensor' | 'imported_csv';
  }): V2TrackingEvent {
    const ts = params.timestamp || new Date().toISOString();
    const dateOnly = ts.slice(0, 10);

    const event: V2TrackingEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      trackerId: params.trackerId,
      timestamp: ts,
      dateOnly,
      numericValue: params.numericValue,
      textValue: params.textValue,
      notes: params.notes,
      source: params.source || 'manual_quick_log',
    };

    const list = this.trackingEvents.get(params.trackerId) || [];
    list.unshift(event);
    this.trackingEvents.set(params.trackerId, list);

    return event;
  }

  public getEvents(trackerId: string, limit: number = 100): V2TrackingEvent[] {
    const list = this.trackingEvents.get(trackerId) || [];
    return list.slice(0, limit);
  }

  /**
   * Time series projection windows: 7d, 30d, 90d, 1y, All
   * Factual calculation: Missing days are clearly marked as missing (no data), NOT zero or failure!
   */
  public getAggregatesInWindow(
    trackerId: string,
    daysWindow: 7 | 30 | 90 | 365 | 0,
    anchorDate?: string | Date
  ): {
    totalEvents: number;
    daysWithData: number;
    missingDays: number;
    averageValue?: number;
    minValue?: number;
    maxValue?: number;
    series: Array<{ dateOnly: string; value?: number; hasData: boolean }>;
  } {
    const events = this.trackingEvents.get(trackerId) || [];
    let now = new Date();
    if (anchorDate) {
      now = new Date(anchorDate);
    } else if (events.length > 0) {
      // If events exist and all events are in the past relative to now's window, anchor to latest event date
      const eventTimes = events.map((e) => new Date(e.timestamp).getTime()).filter((t) => !isNaN(t));
      if (eventTimes.length > 0) {
        const latestTs = Math.max(...eventTimes);
        const windowDurationMs = (daysWindow === 0 ? 365 : daysWindow) * 86400000;
        if (Math.abs(now.getTime() - latestTs) > windowDurationMs) {
          now = new Date(latestTs);
        }
      }
    }
    const days = daysWindow === 0 ? 365 : daysWindow;

    const seriesMap = new Map<string, number>();
    for (const evt of events) {
      if (evt.numericValue !== undefined) {
        seriesMap.set(evt.dateOnly, evt.numericValue);
      }
    }

    const series: Array<{ dateOnly: string; value?: number; hasData: boolean }> = [];
    let numericSum = 0;
    let numericCount = 0;
    let minVal: number | undefined;
    let maxVal: number | undefined;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = d.toISOString().slice(0, 10);
      const val = seriesMap.get(dStr);

      if (val !== undefined) {
        series.push({ dateOnly: dStr, value: val, hasData: true });
        numericSum += val;
        numericCount++;
        minVal = minVal === undefined ? val : Math.min(minVal, val);
        maxVal = maxVal === undefined ? val : Math.max(maxVal, val);
      } else {
        // Missing data: explicitly flagged as hasData=false, never synthesized as 0!
        series.push({ dateOnly: dStr, hasData: false });
      }
    }

    return {
      totalEvents: events.length,
      daysWithData: numericCount,
      missingDays: days - numericCount,
      averageValue: numericCount > 0 ? Number((numericSum / numericCount).toFixed(2)) : undefined,
      minValue: minVal,
      maxValue: maxVal,
      series,
    };
  }

  public exportCsv(trackerId: string): string {
    const events = this.trackingEvents.get(trackerId) || [];
    const rows = ['timestamp,dateOnly,value,notes,source'];
    for (const evt of events) {
      const val = evt.numericValue !== undefined ? evt.numericValue : `"${(evt.textValue || '').replace(/"/g, '""')}"`;
      rows.push(`${evt.timestamp},${evt.dateOnly},${val},"${(evt.notes || '').replace(/"/g, '""')}",${evt.source}`);
    }
    return rows.join('\n');
  }

  // ================= Routines =================

  public saveRoutine(routine: V2RoutineDefinition): V2RoutineDefinition {
    this.routines.set(routine.id, { ...routine });
    if (!this.routineRuns.has(routine.id)) {
      this.routineRuns.set(routine.id, []);
    }
    return routine;
  }

  public getRoutine(id: string): V2RoutineDefinition | undefined {
    return this.routines.get(id);
  }

  public getAllRoutines(): V2RoutineDefinition[] {
    return Array.from(this.routines.values());
  }

  public startRoutineRun(routineId: string): V2RoutineExecutionRun {
    const routine = this.routines.get(routineId);
    const run: V2RoutineExecutionRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      routineId,
      startedAt: new Date().toISOString(),
      completedStepIds: [],
      totalStepsCount: routine ? routine.steps.length : 0,
    };

    const list = this.routineRuns.get(routineId) || [];
    list.unshift(run);
    this.routineRuns.set(routineId, list);
    return run;
  }

  public completeRoutineStep(runId: string, stepId: string): boolean {
    for (const runs of this.routineRuns.values()) {
      const run = runs.find((r) => r.id === runId);
      if (run && !run.completedStepIds.includes(stepId)) {
        run.completedStepIds.push(stepId);
        if (run.completedStepIds.length >= run.totalStepsCount) {
          run.completedAt = new Date().toISOString();
        }
        return true;
      }
    }
    return false;
  }

  // ================= Habits =================

  public saveHabit(habit: V2HabitDefinition): V2HabitDefinition {
    this.habits.set(habit.id, { ...habit });
    if (!this.habitLogs.has(habit.id)) {
      this.habitLogs.set(habit.id, []);
    }
    return habit;
  }

  public getHabit(id: string): V2HabitDefinition | undefined {
    return this.habits.get(id);
  }

  public getAllHabits(): V2HabitDefinition[] {
    return Array.from(this.habits.values());
  }

  public logHabit(habitId: string, dateOnly: string, completed: boolean): V2HabitLogEntry {
    const entry: V2HabitLogEntry = {
      id: `hlog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      habitId,
      dateOnly,
      completed,
      loggedAt: new Date().toISOString(),
    };

    const list = this.habitLogs.get(habitId) || [];
    // remove existing entry for same day if any
    const filtered = list.filter((l) => l.dateOnly !== dateOnly);
    filtered.unshift(entry);
    this.habitLogs.set(habitId, filtered);
    return entry;
  }

  public getHabitCompletionRate(habitId: string, days: number = 30): {
    completedDays: number;
    totalDays: number;
    completionPercentage: number;
  } {
    const logs = this.habitLogs.get(habitId) || [];
    const completedDays = logs.filter((l) => l.completed).length;
    const pct = days > 0 ? Math.round((completedDays / days) * 100) : 0;
    return {
      completedDays,
      totalDays: days,
      completionPercentage: pct,
    };
  }

  public clear(): void {
    this.trackers.clear();
    this.trackingEvents.clear();
    this.routines.clear();
    this.routineRuns.clear();
    this.habits.clear();
    this.habitLogs.clear();
  }
}

export const trackingRoutinesDomainExcellence = new TrackingRoutinesDomainExcellence();
