/**
 * PKM V2.20 — Advanced Recurrence Engine V2
 * 
 * Provides deterministic, RFC 5545-aligned temporal recurrence expansion with zero timezone drift.
 * Invariants:
 * 1. Safe Date-Only Arithmetic (noon UTC/local construction prevents DST midnight shifting).
 * 2. Leap year Feb 29 clamping to Feb 28 on non-leap years.
 * 3. 31st of month policies (clamp_to_last_day, skip_month, exact_only).
 * 4. Advance policies: 'from_schedule' (strict cadence) vs 'from_completion' (chores/fluid habits).
 * 5. Bounded window expansion (strictly bounded [windowStart, windowEnd], never infinite allocation).
 * 6. Deterministic Occurrence Identifiers across multi-device sync.
 */

import {
  RecurrenceRuleV2,
  DateOnlyString,
  Weekday,
  MonthEndPolicy,
  AdvancePolicy,
  OccurrenceInstance,
  generateOccurrenceId,
} from '../temporal/temporalTypes';
import { ResourceType } from '../core/resource/resourceCore';

export const WEEKDAY_INDEX: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const INDEX_TO_WEEKDAY: Record<number, Weekday> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export class AdvancedRecurrenceEngineV2 {
  /**
   * Validates date format YYYY-MM-DD
   */
  public static isValidDateOnly(str: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const [y, m, d] = str.split('-').map(Number);
    if (m < 1 || m > 12) return false;
    const maxDays = this.getDaysInMonth(y, m);
    return d >= 1 && d <= maxDays;
  }

  /**
   * Creates a timezone-safe Date object pegged at 12:00:00 (Noon)
   */
  public static createSafeDate(dateOnly: DateOnlyString): Date {
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  /**
   * Formats a Date to YYYY-MM-DD
   */
  public static formatSafeDate(d: Date): DateOnlyString {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  public static getDaysInMonth(year: number, month1Indexed: number): number {
    switch (month1Indexed) {
      case 2:
        return this.isLeapYear(year) ? 29 : 28;
      case 4:
      case 6:
      case 9:
      case 11:
        return 30;
      default:
        return 31;
    }
  }

  public static addDays(dateOnly: DateOnlyString, days: number): DateOnlyString {
    const d = this.createSafeDate(dateOnly);
    d.setDate(d.getDate() + days);
    return this.formatSafeDate(d);
  }

  public static getWeekdayOfDate(dateOnly: DateOnlyString): Weekday {
    const d = this.createSafeDate(dateOnly);
    return INDEX_TO_WEEKDAY[d.getDay()];
  }

  /**
   * Calculates the next occurrence date after a base date according to rule and advance policy
   */
  public static computeNextOccurrence(
    baseDate: DateOnlyString,
    rule: RecurrenceRuleV2,
    options: {
      completionDate?: DateOnlyString;
      policyOverride?: AdvancePolicy;
      clampPastDates?: boolean;
      referenceToday?: DateOnlyString;
    } = {}
  ): DateOnlyString {
    const today = options.referenceToday || this.formatSafeDate(new Date());
    const policy = options.policyOverride || rule.advancePolicy || 'from_schedule';
    
    // Choose start anchor based on completion advancement if configured
    const startingDate = (policy === 'from_completion' && options.completionDate)
      ? options.completionDate
      : baseDate;

    const [startYear, startMonth, startDay] = startingDate.split('-').map(Number);
    const interval = Math.max(1, rule.interval || 1);

    let candidate: DateOnlyString;

    switch (rule.frequency) {
      case 'daily': {
        candidate = this.addDays(startingDate, interval);
        break;
      }

      case 'weekdays': {
        let current = startingDate;
        let counted = 0;
        while (counted < interval) {
          current = this.addDays(current, 1);
          const dow = this.createSafeDate(current).getDay();
          if (dow !== 0 && dow !== 6) {
            counted++;
          }
        }
        candidate = current;
        break;
      }

      case 'weekly': {
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          const targetIndices = rule.daysOfWeek.map(d => WEEKDAY_INDEX[d]).sort((a, b) => a - b);
          let current = startingDate;
          let found = false;
          let daysChecked = 0;
          const maxCheck = 14 * interval;

          while (!found && daysChecked < maxCheck) {
            current = this.addDays(current, 1);
            daysChecked++;
            const currentDow = this.createSafeDate(current).getDay();
            if (targetIndices.includes(currentDow)) {
              // Interval check: if multi-week interval, ensure we've moved interval cycles
              if (interval === 1 || daysChecked >= 7 * (interval - 1)) {
                found = true;
                candidate = current;
                break;
              }
            }
          }
          candidate = candidate! || this.addDays(startingDate, 7 * interval);
        } else {
          candidate = this.addDays(startingDate, 7 * interval);
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
        const maxDaysInNextMonth = this.getDaysInMonth(nextYear, nextMonth);
        const monthEndPolicy: MonthEndPolicy = rule.monthEndPolicy || 'clamp_to_last_day';

        if (targetDay > maxDaysInNextMonth) {
          if (monthEndPolicy === 'clamp_to_last_day') {
            candidate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(maxDaysInNextMonth).padStart(2, '0')}`;
          } else if (monthEndPolicy === 'skip_month') {
            // Recurse to next valid month
            return this.computeNextOccurrence(
              `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
              { ...rule, interval: 1 },
              options
            );
          } else {
            // exact_only -> clamp
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

        // Handle leap year Feb 29 on non-leap year
        if (nextMonth === 2 && nextDay === 29 && !this.isLeapYear(nextYear)) {
          nextDay = 28;
        }

        candidate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
        break;
      }

      case 'custom_interval':
      default: {
        candidate = this.addDays(startingDate, interval);
        break;
      }
    }

    // Advance if clamping past dates is requested
    if (options.clampPastDates && candidate < today) {
      let iter = 0;
      while (candidate < today && iter < 365) {
        candidate = this.computeNextOccurrence(candidate, rule, {
          ...options,
          clampPastDates: false,
        });
        iter++;
      }
    }

    return candidate;
  }

  /**
   * Generates bounded occurrence instances in a date range [windowStart, windowEnd]
   */
  public static expandOccurrencesInWindow(
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
    let loopGuard = 0;

    while (loopGuard < 1000 && sequenceIndex < maxCap) {
      loopGuard++;

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
      currentDate = this.computeNextOccurrence(currentDate, rule);
    }

    return instances;
  }

  /**
   * Calculates all missed occurrences between lastEvaluatedDate and referenceDate
   */
  public static calculateMissedOccurrences(
    rule: RecurrenceRuleV2,
    lastEvaluatedDate: DateOnlyString,
    currentDate: DateOnlyString
  ): DateOnlyString[] {
    if (lastEvaluatedDate >= currentDate) return [];

    const missed: DateOnlyString[] = [];
    let cur = this.computeNextOccurrence(lastEvaluatedDate, rule);
    let guard = 0;

    while (cur <= currentDate && guard < 100) {
      missed.push(cur);
      cur = this.computeNextOccurrence(cur, rule);
      guard++;
    }

    return missed;
  }
}
