/**
 * Phase P50 — Deterministic Tracking Recurrence & Occurrence Engine
 * 
 * Computes scheduled occurrences, due dates, paused period exclusion,
 * and historical schedule revisions without timezone shifts or duplicate events.
 */

import {
  parseCanonicalDate,
  getTodayDateString,
  addDays,
  createLocalDate,
  formatLocalDateOnly,
  compareDateOnly,
  isBeforeDate,
} from '../temporal/dateUtils';
import { RecurrenceRule } from '../temporal/temporalTypes';
import {
  TrackingDefinition,
  RoutineDefinition,
  CheckInDefinition,
  ScheduleRevision,
  PausedInterval,
} from './trackingTypes';

type SchedulableItem = TrackingDefinition | RoutineDefinition | CheckInDefinition;

/**
 * Checks if a specific date falls within any paused interval
 */
export function isDatePaused(dateStr: string, intervals?: PausedInterval[]): boolean {
  if (!intervals || intervals.length === 0) return false;
  
  for (const interval of intervals) {
    const from = interval.pausedFrom;
    const to = interval.resumedAt;
    
    if (to) {
      if (dateStr >= from && dateStr <= to) {
        return true;
      }
    } else {
      if (dateStr >= from) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Resolves the effective recurrence rule for a specific target date,
 * respecting historical schedule revisions.
 */
export function getEffectiveRuleForDate(
  item: SchedulableItem,
  dateStr: string
): RecurrenceRule | undefined {
  // Check if historical revisions exist
  if (item.scheduleHistory && item.scheduleHistory.length > 0) {
    for (const revision of item.scheduleHistory) {
      const from = revision.effectiveFrom;
      const to = revision.effectiveTo;
      
      if (to) {
        if (dateStr >= from && dateStr <= to) {
          return revision.schedule;
        }
      } else {
        if (dateStr >= from) {
          return revision.schedule;
        }
      }
    }
  }
  
  return item.schedule;
}

/**
 * Deterministically checks if a RecurrenceRule matches a specific date.
 */
export function matchesRecurrenceRule(
  rule: RecurrenceRule,
  targetDateStr: string,
  baseDateStr: string
): boolean {
  if (compareDateOnly(targetDateStr, baseDateStr) < 0) {
    return false; // Target date is before item creation / start date
  }

  const targetDate = createLocalDate(targetDateStr);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat

  switch (rule.type) {
    case 'daily': {
      const interval = rule.interval || 1;
      if (interval === 1) return true;
      
      const diffDays = Math.round(
        (targetDate.getTime() - createLocalDate(baseDateStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays >= 0 && diffDays % interval === 0;
    }

    case 'weekdays': {
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    }

    case 'weekly': {
      const interval = rule.interval || 1;
      const baseDate = createLocalDate(baseDateStr);
      
      // Match day of week first
      if (dayOfWeek !== baseDate.getDay()) {
        return false;
      }
      
      const diffWeeks = Math.round(
        (targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      return diffWeeks >= 0 && diffWeeks % interval === 0;
    }

    case 'monthly': {
      const baseDate = createLocalDate(baseDateStr);
      return targetDate.getDate() === baseDate.getDate();
    }

    case 'yearly': {
      const baseDate = createLocalDate(baseDateStr);
      return (
        targetDate.getMonth() === baseDate.getMonth() &&
        targetDate.getDate() === baseDate.getDate()
      );
    }

    case 'interval': {
      const interval = rule.interval || 1;
      const baseDate = createLocalDate(baseDateStr);
      if (rule.unit === 'week') {
        if (dayOfWeek !== baseDate.getDay()) return false;
        const diffWeeks = Math.round(
          (targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
        );
        return diffWeeks >= 0 && diffWeeks % interval === 0;
      } else if (rule.unit === 'month') {
        return targetDate.getDate() === baseDate.getDate();
      } else {
        const diffDays = Math.round(
          (targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays >= 0 && diffDays % interval === 0;
      }
    }

    default:
      return true;
  }
}

/**
 * Evaluates whether a SchedulableItem is due on a given target date.
 */
export function isItemDueOnDate(item: SchedulableItem, targetDateStr: string): boolean {
  // If item is archived, no occurrences
  if (item.status === 'archived') {
    return false;
  }

  // Check if date is before creation
  const createdDateStr = formatLocalDateOnly(new Date(item.createdAt));
  if (compareDateOnly(targetDateStr, createdDateStr) < 0) {
    return false;
  }

  // If item is paused on target date, it is NOT due
  if (isDatePaused(targetDateStr, item.pausedIntervals)) {
    return false;
  }

  // If item status is currently paused and no intervals are defined
  if (item.status === 'paused' && (!item.pausedIntervals || item.pausedIntervals.length === 0)) {
    return false;
  }

  // For metrics (type === 'metric'), they are not scheduled routines unless a rule is present
  if ('type' in item && item.type === 'metric' && !item.schedule) {
    return false;
  }

  const effectiveRule = getEffectiveRuleForDate(item, targetDateStr);
  if (!effectiveRule) {
    // If no schedule rule, default is daily if active habit / routine
    return true;
  }

  return matchesRecurrenceRule(effectiveRule, targetDateStr, createdDateStr);
}

/**
 * Computes all expected occurrence dates for an item within a date range [startDate, endDate].
 */
export function getExpectedOccurrencesInRange(
  item: SchedulableItem,
  startDateStr: string,
  endDateStr: string
): string[] {
  const dates: string[] = [];
  let current = startDateStr;
  
  while (compareDateOnly(current, endDateStr) <= 0) {
    if (isItemDueOnDate(item, current)) {
      dates.push(current);
    }
    current = addDays(current, 1);
  }
  
  return dates;
}
