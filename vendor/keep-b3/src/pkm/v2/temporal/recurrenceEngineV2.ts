/**
 * PKM V2.3 — Deterministic Recurrence Engine V2
 * 
 * Provides robust, RFC 5545-aligned occurrence calculations without timezone drift.
 * Handles edge cases cleanly:
 * - 31st of month in 30-day months & February (clamp or skip based on policy)
 * - Leap year Feb 29th handling in non-leap years
 * - Day-of-week interval steps
 * - Bounded date window expansion (no infinite future array allocations)
 * - Completion advancement ('from_schedule' vs 'from_completion')
 */

import {
  RecurrenceRuleV2,
  DateOnlyString,
  Weekday,
  MonthEndPolicy,
  AdvancePolicy,
  OccurrenceInstance,
  generateOccurrenceId,
} from './temporalTypes';
import { ResourceType } from '../core/resource/resourceCore';

const WEEKDAY_MAP: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const NUMBER_TO_WEEKDAY: Record<number, Weekday> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/**
 * Validates and formats a DateOnly string (YYYY-MM-DD)
 */
export function isValidDateOnly(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

/**
 * Creates a pure local Date object at noon (12:00:00) to completely avoid DST midnight boundary shifting
 */
export function createSafeDate(dateOnly: DateOnlyString): Date {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatSafeDate(d: Date): DateOnlyString {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateOnly(): DateOnlyString {
  const now = new Date();
  return formatSafeDate(now);
}

export function addDaysDateOnly(dateOnly: DateOnlyString, days: number): DateOnlyString {
  const d = createSafeDate(dateOnly);
  d.setDate(d.getDate() + days);
  return formatSafeDate(d);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: number, month1Indexed: number): number {
  switch (month1Indexed) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/**
 * Calculates the next occurrence date after a base date
 */
export function computeNextOccurrenceDateV2(
  baseDate: DateOnlyString,
  rule: RecurrenceRuleV2,
  options: {
    completionDate?: DateOnlyString;
    policyOverride?: AdvancePolicy;
    clampPastDates?: boolean;
    todayStr?: DateOnlyString;
  } = {}
): DateOnlyString {
  const today = options.todayStr || getTodayDateOnly();
  const policy = options.policyOverride || rule.advancePolicy || 'from_schedule';
  
  // Choose calculation starting origin
  const startingDate = (policy === 'from_completion' && options.completionDate)
    ? options.completionDate
    : baseDate;

  const [startYear, startMonth, startDay] = startingDate.split('-').map(Number);
  const interval = Math.max(1, rule.interval || 1);

  let candidate: DateOnlyString;

  switch (rule.frequency) {
    case 'daily': {
      candidate = addDaysDateOnly(startingDate, interval);
      break;
    }

    case 'weekdays': {
      let current = startingDate;
      let count = 0;
      while (count < interval) {
        current = addDaysDateOnly(current, 1);
        const d = createSafeDate(current);
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
      }
      candidate = current;
      break;
    }

    case 'weekly': {
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Find next designated day of week
        const targetDays = rule.daysOfWeek.map((dow) => WEEKDAY_MAP[dow]).sort((a, b) => a - b);
        let current = startingDate;
        let found = false;
        let daysChecked = 0;
        
        while (!found && daysChecked < 14 * interval) {
          current = addDaysDateOnly(current, 1);
          daysChecked++;
          const d = createSafeDate(current);
          const currentDow = d.getDay();
          if (targetDays.includes(currentDow)) {
            // Check if we advanced enough full weeks if interval > 1
            if (interval === 1 || daysChecked >= 7 * (interval - 1)) {
              found = true;
              candidate = current;
              break;
            }
          }
        }
        candidate = candidate! || addDaysDateOnly(startingDate, 7 * interval);
      } else {
        candidate = addDaysDateOnly(startingDate, 7 * interval);
      }
      break;
    }

    case 'monthly': {
      let nextMonth = startMonth + interval;
      let nextYear = startYear;
      while (nextMonth > 12) {
        nextMonth -= 12;
        nextYear += 1;
      }

      const targetDay = rule.dayOfMonth || startDay;
      const maxDaysInNextMonth = getDaysInMonth(nextYear, nextMonth);
      const monthEndPolicy: MonthEndPolicy = rule.monthEndPolicy || 'clamp_to_last_day';

      if (targetDay > maxDaysInNextMonth) {
        if (monthEndPolicy === 'clamp_to_last_day') {
          candidate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(maxDaysInNextMonth).padStart(2, '0')}`;
        } else if (monthEndPolicy === 'skip_month') {
          // Advance to next valid month
          return computeNextOccurrenceDateV2(
            `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
            { ...rule, interval: 1 },
            options
          );
        } else {
          // exact_only
          candidate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(maxDaysInNextMonth).padStart(2, '0')}`;
        }
      } else {
        candidate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
      }
      break;
    }

    case 'yearly': {
      const nextYear = startYear + interval;
      let nextMonth = startMonth;
      let nextDay = startDay;

      // Handle leap year edge case (Feb 29 on non-leap year)
      if (nextMonth === 2 && nextDay === 29 && !isLeapYear(nextYear)) {
        nextDay = 28; // Clamp to Feb 28
      }

      candidate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      break;
    }

    case 'custom_interval':
    default: {
      candidate = addDaysDateOnly(startingDate, interval);
      break;
    }
  }

  // If catch-up / clamping is requested and candidate is before today, advance iteratively
  if (options.clampPastDates && candidate < today) {
    let safetyCounter = 0;
    while (candidate < today && safetyCounter < 500) {
      candidate = computeNextOccurrenceDateV2(candidate, rule, {
        ...options,
        clampPastDates: false,
      });
      safetyCounter++;
    }
  }

  return candidate;
}

/**
 * Expands occurrences of a recurrence rule within a strictly bounded window [windowStart, windowEnd]
 * Never materializes infinite future records.
 */
export function expandRecurrenceInstancesInWindow(
  resourceId: string,
  resourceType: ResourceType,
  title: string,
  rule: RecurrenceRuleV2,
  startDate: DateOnlyString,
  windowStart: DateOnlyString,
  windowEnd: DateOnlyString,
  options: {
    version?: number;
    time?: string;
    maxOccurrences?: number;
  } = {}
): OccurrenceInstance[] {
  const instances: OccurrenceInstance[] = [];
  const version = options.version || 1;
  const maxCap = Math.min(options.maxOccurrences || 365, rule.maxOccurrences || 365);

  let currentDate = startDate;
  let sequenceIndex = 0;
  let safetyLoop = 0;

  while (safetyLoop < 1000 && sequenceIndex < maxCap) {
    safetyLoop++;

    if (rule.endDate && currentDate > rule.endDate) {
      break;
    }

    if (currentDate > windowEnd) {
      break;
    }

    if (currentDate >= windowStart && currentDate <= windowEnd) {
      instances.push({
        occurrenceId: generateOccurrenceId(resourceId, version, currentDate, options.time),
        resourceId,
        resourceType,
        title,
        occurrenceDate: currentDate,
        time: options.time,
        status: 'expected',
        sequenceIndex,
      });
    }

    sequenceIndex++;
    currentDate = computeNextOccurrenceDateV2(currentDate, rule);
  }

  return instances;
}
