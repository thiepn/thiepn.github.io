/**
 * Phase P37 - Deterministic Task Recurrence Engine
 *
 * Implements deterministic calculation for next occurrence dates across daily,
 * weekly, monthly, yearly, and weekday intervals without timezone drifts or duplicate tasks.
 */

import {
  parseCanonicalDate,
  getTodayDateString,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  createLocalDate,
  formatLocalDateOnly,
  compareDateOnly,
  isBeforeDate,
} from './dateUtils';
import { RecurrenceRule } from './temporalTypes';
import { parseTaskTemporalMetadata, updateTaskLineTemporalTokens } from './taskTemporalParser';

/**
 * Computes the next occurrence date string (YYYY-MM-DD) based on a recurrence rule
 */
export function computeNextOccurrenceDate(
  currentDueDateStr: string,
  rule: RecurrenceRule,
  options: {
    todayStr?: string;
    catchUpPastDates?: boolean; // Advance until today or later if overdue
  } = {}
): string {
  const todayStr = options.todayStr || getTodayDateString();
  const catchUp = options.catchUpPastDates ?? true;

  const parsedCurrent = parseCanonicalDate(currentDueDateStr);
  const baseDateStr = parsedCurrent.isValid ? parsedCurrent.dateOnly : todayStr;

  let nextDateStr = baseDateStr;

  const stepNext = (fromStr: string): string => {
    switch (rule.type) {
      case 'daily':
        return addDays(fromStr, rule.interval || 1);

      case 'weekly':
        return addWeeks(fromStr, rule.interval || 1);

      case 'weekdays': {
        let cur = fromStr;
        do {
          cur = addDays(cur, 1);
          const dt = createLocalDate(cur);
          const day = dt.getDay(); // 0 = Sun, 6 = Sat
          if (day !== 0 && day !== 6) {
            return cur;
          }
        } while (true);
      }

      case 'monthly':
        return addMonths(fromStr, rule.interval || 1);

      case 'yearly':
        return addYears(fromStr, rule.interval || 1);

      case 'interval': {
        const interval = rule.interval || 1;
        if (rule.unit === 'day') return addDays(fromStr, interval);
        if (rule.unit === 'week') return addWeeks(fromStr, interval);
        if (rule.unit === 'month') return addMonths(fromStr, interval);
        if (rule.unit === 'year') return addYears(fromStr, interval);
        return addDays(fromStr, interval);
      }

      default:
        return addDays(fromStr, 1);
    }
  };

  // Compute first step
  nextDateStr = stepNext(baseDateStr);

  // If task is overdue and catchUp is enabled, advance until nextDateStr >= todayStr
  if (catchUp && isBeforeDate(nextDateStr, todayStr)) {
    let safetyCounter = 0;
    while (isBeforeDate(nextDateStr, todayStr) && safetyCounter < 1000) {
      nextDateStr = stepNext(nextDateStr);
      safetyCounter++;
    }
  }

  return nextDateStr;
}

/**
 * Handles completing a recurring task line by generating both:
 * 1. The marked-complete current task line (with completion date)
 * 2. The new pending task line with the updated due/scheduled dates
 */
export function completeRecurringTaskLine(
  rawLine: string,
  options: {
    todayStr?: string;
    autoAddCompletionDate?: boolean;
  } = {}
): {
  completedLine: string;
  nextOccurrenceLine: string;
  nextDueDate: string;
} | null {
  const todayStr = options.todayStr || getTodayDateString();
  const parsed = parseTaskTemporalMetadata(rawLine);

  if (!parsed.recurrenceRule) {
    return null;
  }

  // Calculate next due date
  const currentDueDate = parsed.dueDate || todayStr;
  const nextDueDate = computeNextOccurrenceDate(currentDueDate, parsed.recurrenceRule, {
    todayStr,
    catchUpPastDates: true,
  });

  // 1. Completed Line
  // Replace [ ] or [X] with [x]
  let completedLine = rawLine.replace(/^(\s*[-*+]\s+)\[[ xX]\]/, '$1[x]');
  if (options.autoAddCompletionDate && !parsed.completedDate) {
    completedLine = updateTaskLineTemporalTokens(completedLine, {
      completedDate: todayStr,
    });
  }

  // 2. Next Occurrence Line
  // Reset checkbox to [ ]
  let nextOccurrenceLine = rawLine.replace(/^(\s*[-*+]\s+)\[[ xX]\]/, '$1[ ]');

  // If scheduledDate was set, shift scheduled date by the same delta
  let nextScheduledDate: string | undefined;
  if (parsed.scheduledDate && parsed.dueDate) {
    const scheduledParsed = parseCanonicalDate(parsed.scheduledDate);
    const dueParsed = parseCanonicalDate(parsed.dueDate);
    if (scheduledParsed.isValid && dueParsed.isValid) {
      const diffMs = createLocalDate(dueParsed.dateOnly).getTime() - createLocalDate(scheduledParsed.dateOnly).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      nextScheduledDate = addDays(nextDueDate, -diffDays);
    }
  }

  // Remove completion date on new task line, set new due and scheduled dates
  nextOccurrenceLine = updateTaskLineTemporalTokens(nextOccurrenceLine, {
    dueDate: nextDueDate,
    scheduledDate: nextScheduledDate || null,
    completedDate: null,
  });

  return {
    completedLine,
    nextOccurrenceLine,
    nextDueDate,
  };
}
