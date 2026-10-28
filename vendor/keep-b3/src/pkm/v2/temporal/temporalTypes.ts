/**
 * PKM V2.3 — Unified Temporal Foundation Types
 * 
 * Formalizes exact temporal vocabulary:
 * - DateOnly (YYYY-MM-DD) vs DateTime (ISO String)
 * - Due vs Scheduled vs Starts vs CompletedAt vs Reminder vs Review
 * - RecurrenceRuleV2 with RFC 5545 alignment
 * - Stable occurrence identity generator
 * - Unified Today & Agenda projection contracts
 */

import { ResourceType } from '../core/resource/resourceCore';

export type DateOnlyString = string; // Strict YYYY-MM-DD format (no timezone shift)
export type DateTimeString = string; // ISO 8601 string (e.g. 2026-09-12T14:30:00.000Z)

export type TemporalFieldType =
  | 'due'          // Deadline: when something must be finished by
  | 'scheduled'    // Planned work: when the user intends to work on it
  | 'start'        // Begins: when an event or window begins
  | 'completedAt'  // Factual completion timestamp/date
  | 'review'       // When an item is due for periodic/decision review
  | 'reminder';    // Notification trigger timestamp

export interface TemporalProjection {
  id: string; // Unique projection entry ID (stable)
  resourceId: string;
  resourceType: ResourceType;
  title: string;
  field: TemporalFieldType;
  dateOnly: DateOnlyString;
  time?: string; // Optional HH:mm or HH:mm:ss in local time
  dateTimeIso?: DateTimeString;
  isAllDay: boolean;
  completed?: boolean;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  tags?: string[];
  contextIds?: string[];
  sourceDetails?: {
    noteId?: string;
    taskLine?: number;
    parentTitle?: string;
    status?: string;
  };
}

export type RecurrenceFrequencyV2 = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays' | 'custom_interval';
export type RecurrenceFrequency = RecurrenceFrequencyV2;

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type MonthEndPolicy = 'clamp_to_last_day' | 'skip_month' | 'exact_only';

export type AdvancePolicy = 'from_schedule' | 'from_completion';

export interface RecurrenceRuleV2 {
  frequency: RecurrenceFrequencyV2;
  interval: number; // e.g., every 2 weeks -> interval = 2
  daysOfWeek?: Weekday[];
  dayOfMonth?: number; // 1 to 31
  monthEndPolicy?: MonthEndPolicy;
  advancePolicy?: AdvancePolicy; // default 'from_schedule'
  endDate?: DateOnlyString;
  maxOccurrences?: number;
  rawText?: string;
}

export interface OccurrenceInstance {
  occurrenceId: string; // Stable: ${resourceId}_v${version}_${occurrenceDate}
  resourceId: string;
  resourceType: ResourceType;
  title: string;
  occurrenceDate: DateOnlyString;
  time?: string;
  status: 'expected' | 'completed' | 'skipped' | 'cancelled';
  completedAt?: number;
  sequenceIndex: number;
}

/**
 * Generates a deterministic stable occurrence ID across devices
 */
export function generateOccurrenceId(
  resourceId: string,
  recurrenceVersion: number,
  occurrenceDate: DateOnlyString,
  occurrenceTime?: string
): string {
  const timeSuffix = occurrenceTime ? `_${occurrenceTime.replace(/:/g, '')}` : '';
  return `${resourceId}_v${recurrenceVersion}_${occurrenceDate}${timeSuffix}`;
}

export type TodaySectionGroup =
  | 'now'        // Time-blocked items active right now
  | 'scheduled'  // Planned work items scheduled for today
  | 'due'        // Deadlines due today (not scheduled at a specific time)
  | 'routines'   // Expected routines & habits for today
  | 'later';     // Later today or evening items

export interface TodayItem {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  title: string;
  group: TodaySectionGroup;
  time?: string;
  isAllDay: boolean;
  isDueToday: boolean;
  isScheduledToday: boolean;
  isOverdue: boolean;
  completed: boolean;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  tags?: string[];
  contextTitles?: string[];
  sourceNoteTitle?: string;
}

export interface AgendaDaySection {
  date: DateOnlyString;
  displayLabel: string; // e.g. "Today, Sep 12", "Tomorrow, Sep 13", "Wednesday, Sep 17"
  isToday: boolean;
  isPast: boolean;
  items: TemporalProjection[];
}

export interface TemporalIndexFilter {
  startDate?: DateOnlyString;
  endDate?: DateOnlyString;
  resourceTypes?: ResourceType[];
  fields?: TemporalFieldType[];
  includeCompleted?: boolean;
  contextId?: string;
  tag?: string;
  searchQuery?: string;
}
