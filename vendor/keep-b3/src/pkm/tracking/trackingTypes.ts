/**
 * Phase P50 — Routines, Habits, Check-Ins & Personal Tracking System
 * 
 * Core type definitions for user-defined Habits, Routines, Check-Ins,
 * Tracking Definitions, Canonical Tracking Entries, and Schedule Revisions.
 */

import { RecurrenceRule } from '../temporal/temporalTypes';

export type TrackingDefinitionType = 'habit' | 'metric';

export type TrackingValueType = 'completion' | 'count' | 'duration' | 'number' | 'rating';

export type RatingScale = '1-5' | '1-10';

export type Daypart = 'morning' | 'afternoon' | 'evening' | 'anytime';

export type ResourceStatus = 'active' | 'paused' | 'archived';

export interface ScheduleRevision {
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD (undefined = current)
  schedule: RecurrenceRule;
}

export interface PausedInterval {
  pausedFrom: string; // YYYY-MM-DD
  resumedAt?: string; // YYYY-MM-DD (undefined = currently paused)
  reason?: string;
}

export interface HabitTarget {
  value: number;
  operator?: 'gte' | 'lte' | 'eq';
  unit?: string;
}

export interface TrackingRelations {
  areaIds?: string[];
  goalIds?: string[];
  projectIds?: string[];
  noteIds?: string[];
}

/**
 * 1. Habit / Metric Definition
 */
export interface TrackingDefinition {
  id: string;
  name: string;
  description?: string;
  type: TrackingDefinitionType; // 'habit' (recurrent) or 'metric' (free tracking)
  trackingType: TrackingValueType; // 'completion' | 'count' | 'duration' | 'number' | 'rating'
  
  // Scheduling & Recurrence (reuses P37 RecurrenceRule)
  schedule?: RecurrenceRule;
  scheduleHistory?: ScheduleRevision[];
  pausedIntervals?: PausedInterval[];
  daypart?: Daypart;
  
  // Target & Display
  target?: HabitTarget;
  unit?: string; // e.g. 'min', 'pages', 'km', 'kg', 'sessions'
  ratingScale?: RatingScale;
  minValue?: number;
  maxValue?: number;
  color?: string;
  icon?: string;
  
  // Relations to P49 Planning and Knowledge Notes
  relations?: TrackingRelations;
  
  // Lifecycle
  status: ResourceStatus;
  order?: number;
  includeInWeeklyReview?: boolean;
  
  createdAt: number;
  updatedAt: number;
}

/**
 * 2. Routine Item & Definition
 */
export type RoutineItemType = 'checklist' | 'habit_ref' | 'resource_link' | 'task_template';

export interface RoutineItem {
  id: string;
  type: RoutineItemType;
  label: string;
  note?: string;
  habitId?: string; // If habit_ref, links to TrackingDefinition
  resourceId?: string; // If resource_link (noteId, goalId, projectId, etc.)
  resourceType?: 'note' | 'goal' | 'project' | 'area' | 'collection' | 'agenda' | 'review';
  order: number;
}

export interface RoutineDefinition {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  
  schedule?: RecurrenceRule;
  scheduleHistory?: ScheduleRevision[];
  pausedIntervals?: PausedInterval[];
  daypart?: Daypart;
  
  items: RoutineItem[];
  relations?: TrackingRelations;
  
  status: ResourceStatus;
  order?: number;
  includeInWeeklyReview?: boolean;
  
  createdAt: number;
  updatedAt: number;
}

/**
 * 3. Routine Execution Run
 */
export interface RoutineRun {
  id: string;
  routineId: string;
  routineName: string;
  date: string; // YYYY-MM-DD
  startedAt: number;
  completedAt?: number; // undefined if partial / paused
  itemStates: Record<string, boolean>; // itemId -> completed
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 4. Check-In Form Field & Definition
 */
export type CheckInFieldType =
  | 'boolean'
  | 'number'
  | 'rating'
  | 'select'
  | 'multi_select'
  | 'text'
  | 'long_text'
  | 'date'
  | 'relation';

export interface CheckInField {
  id: string;
  label: string;
  description?: string;
  type: CheckInFieldType;
  required?: boolean;
  ratingScale?: RatingScale;
  options?: string[]; // For select / multi_select
  unit?: string; // For number
  min?: number;
  max?: number;
  placeholder?: string;
  order: number;
}

export interface CheckInDefinition {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  
  schedule?: RecurrenceRule;
  scheduleHistory?: ScheduleRevision[];
  pausedIntervals?: PausedInterval[];
  daypart?: Daypart;
  
  fields: CheckInField[];
  relations?: TrackingRelations;
  
  status: ResourceStatus;
  order?: number;
  includeInWeeklyReview?: boolean;
  
  createdAt: number;
  updatedAt: number;
}

/**
 * 5. Check-In Submission Entry
 */
export interface CheckInEntry {
  id: string;
  definitionId: string;
  definitionName: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  values: Record<string, any>; // fieldId -> value
  notes?: string;
  revision?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * 6. Canonical Tracking Entry (Event Model)
 */
export interface TrackingEntry {
  id: string; // Unique event ID
  definitionId: string;
  date: string; // Strict YYYY-MM-DD local date
  timestamp: number; // Event recording epoch
  
  value: boolean | number | string;
  unit?: string;
  note?: string;
  
  source?: 'manual' | 'routine' | 'quick_capture' | 'import';
  routineRunId?: string;
  idempotencyKey?: string;
  
  createdAt: number;
  updatedAt: number;
}

/**
 * 7. Daily Aggregated Snapshot (Worker & UI Projection)
 */
export interface DailyTrackingSummary {
  definitionId: string;
  definitionName: string;
  type: TrackingDefinitionType;
  trackingType: TrackingValueType;
  date: string;
  
  isDue: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  
  totalValue?: number;
  entryCount: number;
  entries: TrackingEntry[];
  
  target?: HabitTarget;
  targetMet?: boolean;
  unit?: string;
  daypart?: Daypart;
}

/**
 * 8. Period Analytics & Review Summary
 */
export interface PeriodTrackingMetrics {
  definitionId: string;
  definitionName: string;
  trackingType: TrackingValueType;
  unit?: string;
  
  startDate: string;
  endDate: string;
  
  expectedOccurrences: number;
  recordedOccurrences: number;
  completionCount: number;
  completionRate: number; // 0 to 1
  
  totalSum?: number;
  averageValue?: number;
  minValue?: number;
  maxValue?: number;
  entryCount: number;
  
  dailyData: {
    date: string;
    hasEntry: boolean;
    value?: number | boolean | string;
    isDue: boolean;
    isCompleted: boolean;
  }[];
}
