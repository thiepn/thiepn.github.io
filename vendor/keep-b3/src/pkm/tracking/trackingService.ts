/**
 * Phase P50 — Tracking Service
 * 
 * Canonical data store and operations for Habits, Trackers, Routines,
 * Check-Ins, and Entry Event streams.
 */

import {
  TrackingDefinition,
  RoutineDefinition,
  RoutineRun,
  CheckInDefinition,
  CheckInEntry,
  TrackingEntry,
  DailyTrackingSummary,
  PeriodTrackingMetrics,
  ResourceStatus,
  TrackingValueType,
} from './trackingTypes';
import {
  getTodayDateString,
  formatLocalDateOnly,
  addDays,
} from '../temporal/dateUtils';
import {
  aggregateDayForDefinition,
  aggregatePeriodMetrics,
  exportTrackingEntriesToCSV,
  generateTrackingMarkdownSummary,
} from './trackingAggregationEngine';
import { isItemDueOnDate } from './trackingScheduleEngine';

const STORAGE_KEY_DEFINITIONS = 'pkm_tracking_definitions_v1';
const STORAGE_KEY_ROUTINES = 'pkm_routine_definitions_v1';
const STORAGE_KEY_ROUTINE_RUNS = 'pkm_routine_runs_v1';
const STORAGE_KEY_CHECKINS = 'pkm_checkin_definitions_v1';
const STORAGE_KEY_CHECKIN_ENTRIES = 'pkm_checkin_entries_v1';
const STORAGE_KEY_CHECKIN_DRAFTS = 'pkm_checkin_drafts_v1';
const STORAGE_KEY_ENTRIES = 'pkm_tracking_entries_v1';

// Seed default initial definitions to give users a structured out-of-the-box starting point
export const INITIAL_TRACKING_DEFINITIONS: TrackingDefinition[] = [
  {
    id: 'habit-french',
    name: 'French Listening & Vocab',
    description: 'Daily French immersion and spaced repetition flashcards',
    type: 'habit',
    trackingType: 'duration',
    schedule: { type: 'daily', interval: 1, rawText: 'daily' },
    target: { value: 30, operator: 'gte', unit: 'min' },
    unit: 'min',
    status: 'active',
    daypart: 'morning',
    includeInWeeklyReview: true,
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 14 * 86400000,
  },
  {
    id: 'habit-reading',
    name: 'Read Non-Fiction',
    description: 'Read physical or digital book chapters',
    type: 'habit',
    trackingType: 'number',
    schedule: { type: 'daily', interval: 1, rawText: 'daily' },
    target: { value: 15, operator: 'gte', unit: 'pages' },
    unit: 'pages',
    status: 'active',
    daypart: 'evening',
    includeInWeeklyReview: true,
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 14 * 86400000,
  },
  {
    id: 'habit-exercise',
    name: 'Physical Movement / Workout',
    description: 'Gym, running, mobility, or walk',
    type: 'habit',
    trackingType: 'completion',
    schedule: { type: 'weekdays', interval: 1, rawText: 'weekdays' },
    status: 'active',
    daypart: 'afternoon',
    includeInWeeklyReview: true,
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 14 * 86400000,
  },
  {
    id: 'metric-focus-quality',
    name: 'Daily Focus Quality',
    description: 'Deliberate rating of daily deep work concentration',
    type: 'metric',
    trackingType: 'rating',
    ratingScale: '1-5',
    status: 'active',
    daypart: 'evening',
    includeInWeeklyReview: true,
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 14 * 86400000,
  },
];

export const INITIAL_ROUTINE_DEFINITIONS: RoutineDefinition[] = [
  {
    id: 'routine-morning-kickoff',
    name: 'Morning Kickoff',
    description: 'Prime focus, review today’s agenda and quick tasks',
    icon: 'Sun',
    color: '#f59e0b',
    schedule: { type: 'weekdays', interval: 1, rawText: 'weekdays' },
    daypart: 'morning',
    status: 'active',
    includeInWeeklyReview: true,
    items: [
      { id: 'item-1', type: 'checklist', label: 'Review Today Agenda & Focus items', order: 1 },
      { id: 'item-2', type: 'habit_ref', label: 'Practice French Vocab', habitId: 'habit-french', order: 2 },
      { id: 'item-3', type: 'checklist', label: 'Clear fleeting thoughts in Quick Capture', order: 3 },
      { id: 'item-4', type: 'checklist', label: 'Identify single must-do focus outcome', order: 4 },
    ],
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 14 * 86400000,
  },
  {
    id: 'routine-evening-shutdown',
    name: 'Evening Shutdown',
    description: 'Review day accomplishments, tidy workspace, and log evening check-in',
    icon: 'Moon',
    color: '#6366f1',
    schedule: { type: 'daily', interval: 1, rawText: 'daily' },
    daypart: 'evening',
    status: 'active',
    includeInWeeklyReview: true,
    items: [
      { id: 'item-e1', type: 'checklist', label: 'Check off completed tasks in Daily Note', order: 1 },
      { id: 'item-e2', type: 'habit_ref', label: 'Log Reading Pages', habitId: 'habit-reading', order: 2 },
      { id: 'item-e3', type: 'checklist', label: 'Run Evening Check-In reflection', order: 3 },
      { id: 'item-e4', type: 'checklist', label: 'Set top priority for tomorrow', order: 4 },
    ],
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 14 * 86400000,
  },
];

export const INITIAL_CHECKIN_DEFINITIONS: CheckInDefinition[] = [
  {
    id: 'checkin-evening',
    name: 'Evening Deliberate Check-In',
    description: 'Short structured reflection on energy, wins, and next focus',
    icon: 'CheckSquare',
    color: '#10b981',
    schedule: { type: 'daily', interval: 1, rawText: 'daily' },
    daypart: 'evening',
    status: 'active',
    includeInWeeklyReview: true,
    fields: [
      {
        id: 'field-energy',
        label: 'Energy & Focus Rating',
        description: 'How energized and clear did you feel overall today?',
        type: 'rating',
        ratingScale: '1-5',
        required: true,
        order: 1,
      },
      {
        id: 'field-accomplishment',
        label: 'Main Accomplishment / Highlight',
        description: 'What single progress or milestone felt most meaningful today?',
        type: 'text',
        placeholder: 'Completed the architecture draft for...',
        required: false,
        order: 2,
      },
      {
        id: 'field-unresolved',
        label: 'Unresolved Thoughts / Blockers',
        description: 'Anything lingering that needs parking or clarity?',
        type: 'text',
        placeholder: 'Waiting on feedback from...',
        required: false,
        order: 3,
      },
      {
        id: 'field-tomorrow-focus',
        label: 'Tomorrow’s Single Primary Focus',
        description: 'The one deliverable that matters most tomorrow morning',
        type: 'text',
        placeholder: 'Finalize P50 test suites',
        required: false,
        order: 4,
      },
    ],
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 14 * 86400000,
  },
];

class TrackingService {
  private definitions: TrackingDefinition[] = [];
  private routines: RoutineDefinition[] = [];
  private routineRuns: RoutineRun[] = [];
  private checkIns: CheckInDefinition[] = [];
  private checkInEntries: CheckInEntry[] = [];
  private checkInDrafts: Record<string, Record<string, any>> = {}; // definitionId -> field values
  private entries: TrackingEntry[] = [];
  private undoStack: string[] = []; // List of entry IDs that can be undone
  private initialized = false;

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const rawDefs = localStorage.getItem(STORAGE_KEY_DEFINITIONS);
      this.definitions = rawDefs ? JSON.parse(rawDefs) : INITIAL_TRACKING_DEFINITIONS;

      const rawRoutines = localStorage.getItem(STORAGE_KEY_ROUTINES);
      this.routines = rawRoutines ? JSON.parse(rawRoutines) : INITIAL_ROUTINE_DEFINITIONS;

      const rawRuns = localStorage.getItem(STORAGE_KEY_ROUTINE_RUNS);
      this.routineRuns = rawRuns ? JSON.parse(rawRuns) : [];

      const rawCheckIns = localStorage.getItem(STORAGE_KEY_CHECKINS);
      this.checkIns = rawCheckIns ? JSON.parse(rawCheckIns) : INITIAL_CHECKIN_DEFINITIONS;

      const rawCheckInEntries = localStorage.getItem(STORAGE_KEY_CHECKIN_ENTRIES);
      this.checkInEntries = rawCheckInEntries ? JSON.parse(rawCheckInEntries) : [];

      const rawDrafts = localStorage.getItem(STORAGE_KEY_CHECKIN_DRAFTS);
      this.checkInDrafts = rawDrafts ? JSON.parse(rawDrafts) : {};

      const rawEntries = localStorage.getItem(STORAGE_KEY_ENTRIES);
      this.entries = rawEntries ? JSON.parse(rawEntries) : [];

      this.initialized = true;
    } catch (err) {
      console.error('[TrackingService] Failed to load tracking state:', err);
      this.definitions = INITIAL_TRACKING_DEFINITIONS;
      this.routines = INITIAL_ROUTINE_DEFINITIONS;
      this.checkIns = INITIAL_CHECKIN_DEFINITIONS;
      this.entries = [];
      this.initialized = true;
    }
  }

  private saveDefinitions() {
    localStorage.setItem(STORAGE_KEY_DEFINITIONS, JSON.stringify(this.definitions));
  }

  private saveRoutines() {
    localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(this.routines));
  }

  private saveRoutineRuns() {
    localStorage.setItem(STORAGE_KEY_ROUTINE_RUNS, JSON.stringify(this.routineRuns));
  }

  private saveCheckIns() {
    localStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(this.checkIns));
  }

  private saveCheckInEntries() {
    localStorage.setItem(STORAGE_KEY_CHECKIN_ENTRIES, JSON.stringify(this.checkInEntries));
  }

  private saveCheckInDrafts() {
    localStorage.setItem(STORAGE_KEY_CHECKIN_DRAFTS, JSON.stringify(this.checkInDrafts));
  }

  private saveEntries() {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(this.entries));
  }

  // ==================== DEFINITIONS (HABITS & METRICS) ====================

  public getDefinitions(includeArchived = false): TrackingDefinition[] {
    if (includeArchived) return [...this.definitions];
    return this.definitions.filter((d) => d.status !== 'archived');
  }

  public getDefinitionById(id: string): TrackingDefinition | undefined {
    return this.definitions.find((d) => d.id === id);
  }

  public saveDefinition(def: TrackingDefinition): void {
    const existingIndex = this.definitions.findIndex((d) => d.id === def.id);
    const updated = { ...def, updatedAt: Date.now() };

    if (existingIndex >= 0) {
      // If schedule changed, preserve schedule history
      const old = this.definitions[existingIndex];
      if (old.schedule && def.schedule && JSON.stringify(old.schedule) !== JSON.stringify(def.schedule)) {
        const todayStr = getTodayDateString();
        const history = old.scheduleHistory ? [...old.scheduleHistory] : [];
        
        // Find latest open revision or create from old schedule
        if (history.length > 0 && !history[history.length - 1].effectiveTo) {
          history[history.length - 1].effectiveTo = addDays(todayStr, -1);
        } else {
          history.push({
            effectiveFrom: formatLocalDateOnly(new Date(old.createdAt)),
            effectiveTo: addDays(todayStr, -1),
            schedule: old.schedule,
          });
        }

        history.push({
          effectiveFrom: todayStr,
          schedule: def.schedule,
        });

        updated.scheduleHistory = history;
      }

      this.definitions[existingIndex] = updated;
    } else {
      this.definitions.push(updated);
    }
    this.saveDefinitions();
  }

  public setDefinitionStatus(id: string, status: ResourceStatus): void {
    const def = this.getDefinitionById(id);
    if (!def) return;

    const todayStr = getTodayDateString();
    const intervals = def.pausedIntervals ? [...def.pausedIntervals] : [];

    if (status === 'paused' && def.status !== 'paused') {
      intervals.push({ pausedFrom: todayStr });
    } else if (status !== 'paused' && def.status === 'paused') {
      const lastInterval = intervals[intervals.length - 1];
      if (lastInterval && !lastInterval.resumedAt) {
        lastInterval.resumedAt = todayStr;
      }
    }

    def.status = status;
    def.pausedIntervals = intervals;
    def.updatedAt = Date.now();
    this.saveDefinitions();
  }

  public deleteDefinition(id: string, deleteHistoricalEntries = false): void {
    this.definitions = this.definitions.filter((d) => d.id !== id);
    this.saveDefinitions();

    if (deleteHistoricalEntries) {
      this.entries = this.entries.filter((e) => e.definitionId !== id);
      this.saveEntries();
    }
  }

  // ==================== ROUTINES ====================

  public getRoutines(includeArchived = false): RoutineDefinition[] {
    if (includeArchived) return [...this.routines];
    return this.routines.filter((r) => r.status !== 'archived');
  }

  public getRoutineById(id: string): RoutineDefinition | undefined {
    return this.routines.find((r) => r.id === id);
  }

  public saveRoutine(routine: RoutineDefinition): void {
    const idx = this.routines.findIndex((r) => r.id === routine.id);
    const updated = { ...routine, updatedAt: Date.now() };
    if (idx >= 0) {
      this.routines[idx] = updated;
    } else {
      this.routines.push(updated);
    }
    this.saveRoutines();
  }

  public setRoutineStatus(id: string, status: ResourceStatus): void {
    const routine = this.getRoutineById(id);
    if (!routine) return;
    routine.status = status;
    routine.updatedAt = Date.now();
    this.saveRoutines();
  }

  public deleteRoutine(id: string): void {
    this.routines = this.routines.filter((r) => r.id !== id);
    this.saveRoutines();
  }

  // ==================== ROUTINE RUNS ====================

  public getRoutineRuns(routineId?: string): RoutineRun[] {
    if (routineId) {
      return this.routineRuns.filter((r) => r.routineId === routineId);
    }
    return [...this.routineRuns];
  }

  public getActiveOrRecentRun(routineId: string, dateStr: string): RoutineRun | undefined {
    return this.routineRuns.find((r) => r.routineId === routineId && r.date === dateStr);
  }

  public startOrGetRoutineRun(routine: RoutineDefinition, dateStr?: string): RoutineRun {
    const targetDate = dateStr || getTodayDateString();
    const existing = this.getActiveOrRecentRun(routine.id, targetDate);
    if (existing) return existing;

    const initialStates: Record<string, boolean> = {};
    routine.items.forEach((item) => {
      initialStates[item.id] = false;
    });

    const newRun: RoutineRun = {
      id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      routineId: routine.id,
      routineName: routine.name,
      date: targetDate,
      startedAt: Date.now(),
      itemStates: initialStates,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.routineRuns.unshift(newRun);
    this.saveRoutineRuns();
    return newRun;
  }

  public updateRoutineRunItem(
    runId: string,
    itemId: string,
    completed: boolean,
    autoRecordLinkedHabit = true
  ): RoutineRun | undefined {
    const run = this.routineRuns.find((r) => r.id === runId);
    if (!run) return undefined;

    run.itemStates[itemId] = completed;
    run.updatedAt = Date.now();

    // Check if item references a habit
    if (autoRecordLinkedHabit) {
      const routine = this.getRoutineById(run.routineId);
      const item = routine?.items.find((i) => i.id === itemId);
      if (item && item.type === 'habit_ref' && item.habitId) {
        const habit = this.getDefinitionById(item.habitId);
        if (habit) {
          if (completed) {
            this.recordEntry({
              definitionId: habit.id,
              date: run.date,
              value: habit.trackingType === 'completion' ? true : (habit.target?.value || 1),
              source: 'routine',
              routineRunId: run.id,
              idempotencyKey: `routine-run-${run.id}-${itemId}`,
            });
          }
        }
      }
    }

    // Check if all items are completed
    const allDone = Object.values(run.itemStates).every(Boolean);
    if (allDone && !run.completedAt) {
      run.completedAt = Date.now();
    } else if (!allDone && run.completedAt) {
      run.completedAt = undefined;
    }

    this.saveRoutineRuns();
    return run;
  }

  public completeRoutineRun(runId: string, notes?: string): RoutineRun | undefined {
    const run = this.routineRuns.find((r) => r.id === runId);
    if (!run) return undefined;

    run.completedAt = Date.now();
    if (notes !== undefined) run.notes = notes;
    run.updatedAt = Date.now();
    this.saveRoutineRuns();
    return run;
  }

  // ==================== CHECK-INS ====================

  public getCheckIns(includeArchived = false): CheckInDefinition[] {
    if (includeArchived) return [...this.checkIns];
    return this.checkIns.filter((c) => c.status !== 'archived');
  }

  public getCheckInById(id: string): CheckInDefinition | undefined {
    return this.checkIns.find((c) => c.id === id);
  }

  public saveCheckIn(checkIn: CheckInDefinition): void {
    const idx = this.checkIns.findIndex((c) => c.id === checkIn.id);
    const updated = { ...checkIn, updatedAt: Date.now() };
    if (idx >= 0) {
      this.checkIns[idx] = updated;
    } else {
      this.checkIns.push(updated);
    }
    this.saveCheckIns();
  }

  public setCheckInStatus(id: string, status: ResourceStatus): void {
    const c = this.getCheckInById(id);
    if (!c) return;
    c.status = status;
    c.updatedAt = Date.now();
    this.saveCheckIns();
  }

  public deleteCheckIn(id: string): void {
    this.checkIns = this.checkIns.filter((c) => c.id !== id);
    this.saveCheckIns();
  }

  public getCheckInDraft(definitionId: string): Record<string, any> {
    return this.checkInDrafts[definitionId] || {};
  }

  public saveCheckInDraft(definitionId: string, values: Record<string, any>): void {
    this.checkInDrafts[definitionId] = values;
    this.saveCheckInDrafts();
  }

  public clearCheckInDraft(definitionId: string): void {
    delete this.checkInDrafts[definitionId];
    this.saveCheckInDrafts();
  }

  public submitCheckInEntry(
    definitionId: string,
    values: Record<string, any>,
    dateStr?: string,
    notes?: string
  ): CheckInEntry {
    const def = this.getCheckInById(definitionId);
    const targetDate = dateStr || getTodayDateString();

    const existingIdx = this.checkInEntries.findIndex(
      (e) => e.definitionId === definitionId && e.date === targetDate
    );

    const now = Date.now();
    let entry: CheckInEntry;

    if (existingIdx >= 0) {
      const old = this.checkInEntries[existingIdx];
      entry = {
        ...old,
        values,
        notes: notes ?? old.notes,
        revision: (old.revision || 1) + 1,
        updatedAt: now,
      };
      this.checkInEntries[existingIdx] = entry;
    } else {
      entry = {
        id: `checkin-entry-${now}-${Math.random().toString(36).substring(2, 7)}`,
        definitionId,
        definitionName: def?.name || 'Check-In',
        date: targetDate,
        timestamp: now,
        values,
        notes,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      this.checkInEntries.unshift(entry);
    }

    this.saveCheckInEntries();
    this.clearCheckInDraft(definitionId);
    return entry;
  }

  public getCheckInEntries(definitionId?: string): CheckInEntry[] {
    if (definitionId) {
      return this.checkInEntries.filter((e) => e.definitionId === definitionId);
    }
    return [...this.checkInEntries];
  }

  // ==================== CANONICAL TRACKING ENTRIES ====================

  public getEntries(): TrackingEntry[] {
    return [...this.entries];
  }

  public getEntriesForDefinition(definitionId: string): TrackingEntry[] {
    return this.entries.filter((e) => e.definitionId === definitionId);
  }

  public recordEntry(params: {
    definitionId: string;
    value: boolean | number | string;
    date?: string;
    unit?: string;
    note?: string;
    source?: 'manual' | 'routine' | 'quick_capture' | 'import';
    routineRunId?: string;
    idempotencyKey?: string;
  }): TrackingEntry {
    const targetDate = params.date || getTodayDateString();
    const now = Date.now();

    // Idempotency check: if key matches existing entry, update or return without duplicating
    if (params.idempotencyKey) {
      const existing = this.entries.find((e) => e.idempotencyKey === params.idempotencyKey);
      if (existing) {
        existing.value = params.value;
        existing.updatedAt = now;
        this.saveEntries();
        return existing;
      }
    }

    const def = this.getDefinitionById(params.definitionId);

    // For completion habits: avoid duplicate true entries on same date
    if (def?.trackingType === 'completion' && (params.value === true || params.value === 1)) {
      const existing = this.entries.find(
        (e) => e.definitionId === params.definitionId && e.date === targetDate
      );
      if (existing) {
        existing.value = true;
        existing.updatedAt = now;
        this.saveEntries();
        return existing;
      }
    }

    const newEntry: TrackingEntry = {
      id: `entry-${now}-${Math.random().toString(36).substring(2, 7)}`,
      definitionId: params.definitionId,
      date: targetDate,
      timestamp: now,
      value: params.value,
      unit: params.unit || def?.unit,
      note: params.note,
      source: params.source || 'manual',
      routineRunId: params.routineRunId,
      idempotencyKey: params.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    this.entries.unshift(newEntry);
    this.undoStack.push(newEntry.id);
    if (this.undoStack.length > 50) this.undoStack.shift();

    this.saveEntries();
    return newEntry;
  }

  public toggleCompletionHabit(definitionId: string, dateStr?: string): boolean {
    const targetDate = dateStr || getTodayDateString();
    const existingEntries = this.entries.filter(
      (e) => e.definitionId === definitionId && e.date === targetDate
    );

    const isCurrentlyDone = existingEntries.some((e) => e.value === true || e.value === 1);

    if (isCurrentlyDone) {
      // Toggle off: remove today's completion entries
      this.entries = this.entries.filter(
        (e) => !(e.definitionId === definitionId && e.date === targetDate)
      );
      this.saveEntries();
      return false;
    } else {
      // Toggle on: record completion
      this.recordEntry({
        definitionId,
        date: targetDate,
        value: true,
      });
      return true;
    }
  }

  public undoLastEntry(): TrackingEntry | null {
    const lastId = this.undoStack.pop();
    if (!lastId) return null;

    const entry = this.entries.find((e) => e.id === lastId);
    if (entry) {
      this.entries = this.entries.filter((e) => e.id !== lastId);
      this.saveEntries();
      return entry;
    }
    return null;
  }

  public deleteEntry(entryId: string): void {
    this.entries = this.entries.filter((e) => e.id !== entryId);
    this.saveEntries();
  }

  public updateEntry(entryId: string, updates: Partial<TrackingEntry>): TrackingEntry | undefined {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry) return undefined;

    Object.assign(entry, updates, { updatedAt: Date.now() });
    this.saveEntries();
    return entry;
  }

  // ==================== HIGH-PERFORMANCE PROJECTIONS ====================

  public getTodayDueSummaries(dateStr?: string): {
    habits: DailyTrackingSummary[];
    routines: { definition: RoutineDefinition; isDue: boolean; activeRun?: RoutineRun }[];
    checkIns: { definition: CheckInDefinition; isDue: boolean; entry?: CheckInEntry }[];
  } {
    const targetDate = dateStr || getTodayDateString();

    const habits = this.getDefinitions()
      .map((d) => aggregateDayForDefinition(d, targetDate, this.entries))
      .filter((s) => s.isDue || s.entryCount > 0);

    const routines = this.getRoutines().map((r) => ({
      definition: r,
      isDue: isItemDueOnDate(r, targetDate),
      activeRun: this.getActiveOrRecentRun(r.id, targetDate),
    })).filter((r) => r.isDue || r.activeRun);

    const checkIns = this.getCheckIns().map((c) => ({
      definition: c,
      isDue: isItemDueOnDate(c, targetDate),
      entry: this.checkInEntries.find((e) => e.definitionId === c.id && e.date === targetDate),
    })).filter((c) => c.isDue || c.entry);

    return { habits, routines, checkIns };
  }

  public getPeriodMetrics(
    definitionId: string,
    startDateStr: string,
    endDateStr: string
  ): PeriodTrackingMetrics | null {
    const def = this.getDefinitionById(definitionId);
    if (!def) return null;
    return aggregatePeriodMetrics(def, startDateStr, endDateStr, this.entries);
  }

  // ==================== CSV / MARKDOWN EXPORTS ====================

  public exportCSV(definitionId: string, dateRange?: { start: string; end: string }): string {
    const def = this.getDefinitionById(definitionId);
    if (!def) return '';
    return exportTrackingEntriesToCSV(def, this.entries, dateRange);
  }

  public generateMarkdownSummary(dateStr?: string): string {
    const targetDate = dateStr || getTodayDateString();
    return generateTrackingMarkdownSummary(this.definitions, this.entries, targetDate);
  }

  // ==================== VAULT DOCTOR DIAGNOSTICS ====================

  public runDiagnostics(): {
    orphanEntries: TrackingEntry[];
    duplicateEntryIds: string[];
    invalidSchedules: TrackingDefinition[];
    fixedOrphans: number;
  } {
    const validDefIds = new Set(this.definitions.map((d) => d.id));
    const orphanEntries = this.entries.filter((e) => !validDefIds.has(e.definitionId));

    const seenIds = new Set<string>();
    const duplicateEntryIds: string[] = [];
    this.entries.forEach((e) => {
      if (seenIds.has(e.id)) duplicateEntryIds.push(e.id);
      seenIds.add(e.id);
    });

    const invalidSchedules = this.definitions.filter((d) => {
      if (!d.schedule) return false;
      return !['daily', 'weekly', 'monthly', 'yearly', 'weekdays', 'interval'].includes(d.schedule.type);
    });

    return {
      orphanEntries,
      duplicateEntryIds,
      invalidSchedules,
      fixedOrphans: 0,
    };
  }

  public clearAllData(): void {
    this.definitions = [];
    this.routines = [];
    this.routineRuns = [];
    this.checkIns = [];
    this.checkInEntries = [];
    this.checkInDrafts = {};
    this.entries = [];
    this.undoStack = [];
    this.saveDefinitions();
    this.saveRoutines();
    this.saveRoutineRuns();
    this.saveCheckIns();
    this.saveCheckInEntries();
    this.saveCheckInDrafts();
    this.saveEntries();
  }
}

export const trackingService = new TrackingService();
