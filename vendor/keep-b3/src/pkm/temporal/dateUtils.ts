/**
 * Phase P37 - Canonical Date Utilities & Temporal Normalization
 *
 * Implements strict separation between Date-Only (YYYY-MM-DD) and DateTime representations,
 * preventing time-zone shift bugs, daylight saving errors, and calendar drift.
 */

export interface ParsedDateResult {
  dateOnly: string; // Strict YYYY-MM-DD
  time?: string; // HH:mm or HH:mm:ss if present
  isValid: boolean;
  isDateTime: boolean;
  iso?: string;
}

/**
 * Validates whether a string is a strict YYYY-MM-DD date-only string
 */
export function isDateOnly(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
}

/**
 * Returns today's date formatted as strict YYYY-MM-DD in local time
 */
export function getTodayDateString(refDate = new Date()): string {
  const y = refDate.getFullYear();
  const m = String(refDate.getMonth() + 1).padStart(2, '0');
  const d = String(refDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object to YYYY-MM-DD using local calendar components (no UTC shift)
 */
export function formatLocalDateOnly(date: Date): string {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses any date-like string or Date object into canonical temporal components
 */
export function parseCanonicalDate(input: string | Date | number | undefined | null): ParsedDateResult {
  if (!input) {
    return { dateOnly: '', isValid: false, isDateTime: false };
  }

  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      return { dateOnly: '', isValid: false, isDateTime: false };
    }
    const dateOnly = formatLocalDateOnly(input);
    const time = `${String(input.getHours()).padStart(2, '0')}:${String(input.getMinutes()).padStart(2, '0')}`;
    return {
      dateOnly,
      time,
      isValid: true,
      isDateTime: true,
      iso: input.toISOString(),
    };
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return parseCanonicalDate(d);
  }

  const str = input.trim();
  if (!str) {
    return { dateOnly: '', isValid: false, isDateTime: false };
  }

  // 1. Strict Date-Only: YYYY-MM-DD
  const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const y = parseInt(dateOnlyMatch[1], 10);
    const m = parseInt(dateOnlyMatch[2], 10);
    const d = parseInt(dateOnlyMatch[3], 10);

    // Validate calendar range (e.g. month 1-12, days in month)
    if (m >= 1 && m <= 12 && d >= 1 && d <= getDaysInMonth(y, m - 1)) {
      return {
        dateOnly: `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`,
        isValid: true,
        isDateTime: false,
      };
    }
    return { dateOnly: '', isValid: false, isDateTime: false };
  }

  // 2. Date with time: YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm
  const dateTimeMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/);
  if (dateTimeMatch) {
    const y = parseInt(dateTimeMatch[1], 10);
    const m = parseInt(dateTimeMatch[2], 10);
    const d = parseInt(dateTimeMatch[3], 10);
    const hh = dateTimeMatch[4];
    const mm = dateTimeMatch[5];

    if (m >= 1 && m <= 12 && d >= 1 && d <= getDaysInMonth(y, m - 1)) {
      const dateOnly = `${dateTimeMatch[1]}-${dateTimeMatch[2]}-${dateTimeMatch[3]}`;
      const time = `${hh}:${mm}`;
      const parsedNative = new Date(str);
      return {
        dateOnly,
        time,
        isValid: true,
        isDateTime: true,
        iso: !isNaN(parsedNative.getTime()) ? parsedNative.toISOString() : undefined,
      };
    }
  }

  // 3. Fallback to standard Date parser
  const nativeParsed = new Date(str);
  if (!isNaN(nativeParsed.getTime())) {
    const dateOnly = formatLocalDateOnly(nativeParsed);
    const time = `${String(nativeParsed.getHours()).padStart(2, '0')}:${String(nativeParsed.getMinutes()).padStart(2, '0')}`;
    return {
      dateOnly,
      time,
      isValid: true,
      isDateTime: str.includes(':') || str.includes('T'),
      iso: nativeParsed.toISOString(),
    };
  }

  return { dateOnly: '', isValid: false, isDateTime: false };
}

/**
 * Creates a Date object at 12:00 (noon) from a YYYY-MM-DD string to avoid midnight DST boundary shifts
 */
export function createLocalDate(dateOnlyStr: string): Date {
  const parts = dateOnlyStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d, 12, 0, 0, 0);
  }
  return new Date();
}

/**
 * Returns the number of days in a given year and month (0-indexed month: 0=Jan, 11=Dec)
 */
export function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

/**
 * Checks if a year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Adds N days to a YYYY-MM-DD date string, returning the resulting YYYY-MM-DD
 */
export function addDays(dateOnlyStr: string, days: number): string {
  const dt = createLocalDate(dateOnlyStr);
  dt.setDate(dt.getDate() + days);
  return formatLocalDateOnly(dt);
}

/**
 * Adds N weeks to a YYYY-MM-DD date string
 */
export function addWeeks(dateOnlyStr: string, weeks: number): string {
  return addDays(dateOnlyStr, weeks * 7);
}

/**
 * Adds N months to a YYYY-MM-DD date string with explicit month-end clamping (e.g. Jan 31 -> Feb 28/29)
 */
export function addMonths(dateOnlyStr: string, months: number): string {
  const parts = dateOnlyStr.split('-');
  if (parts.length !== 3) return dateOnlyStr;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const targetDate = new Date(y, m + months, 1, 12, 0, 0, 0);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const maxDays = getDaysInMonth(targetYear, targetMonth);

  const clampedDay = Math.min(d, maxDays);
  const finalDate = new Date(targetYear, targetMonth, clampedDay, 12, 0, 0, 0);
  return formatLocalDateOnly(finalDate);
}

/**
 * Adds N years to a YYYY-MM-DD date string with leap year Feb 29 -> Feb 28 clamping
 */
export function addYears(dateOnlyStr: string, years: number): string {
  const parts = dateOnlyStr.split('-');
  if (parts.length !== 3) return dateOnlyStr;

  const y = parseInt(parts[0], 10) + years;
  const m = parseInt(parts[1], 10) - 1;
  let d = parseInt(parts[2], 10);

  if (m === 1 && d === 29 && !isLeapYear(y)) {
    d = 28;
  }

  const finalDate = new Date(y, m, d, 12, 0, 0, 0);
  return formatLocalDateOnly(finalDate);
}

/**
 * Computes ISO 8601 week number for a given date
 */
export function getISOWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Returns start and end dates of the week containing dateOnlyStr, respecting firstDayOfWeek (0=Sun, 1=Mon)
 */
export function getWeekRange(dateOnlyStr: string, firstDayOfWeek: 0 | 1 = 1): { startDate: string; endDate: string; days: string[] } {
  const date = createLocalDate(dateOnlyStr);
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;

  const start = new Date(date);
  start.setDate(date.getDate() - diff);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    days.push(formatLocalDateOnly(cur));
  }

  return {
    startDate: days[0],
    endDate: days[6],
    days,
  };
}

/**
 * Compares two date-only strings: returns negative if d1 < d2, 0 if d1 == d2, positive if d1 > d2
 */
export function compareDateOnly(d1: string, d2: string): number {
  return d1.localeCompare(d2);
}

/**
 * Checks if a date-only string is strictly before another
 */
export function isBeforeDate(d1: string, d2: string): boolean {
  return compareDateOnly(d1, d2) < 0;
}

/**
 * Checks if a date-only string is strictly after another
 */
export function isAfterDate(d1: string, d2: string): boolean {
  return compareDateOnly(d1, d2) > 0;
}

/**
 * Formats a date-only string to user-friendly label (e.g., "Today", "Tomorrow", "Yesterday", "Sep 17", "Sep 17, 2025")
 */
export function formatFriendlyDate(dateOnlyStr: string, todayStr = getTodayDateString()): string {
  if (!dateOnlyStr) return '';
  if (dateOnlyStr === todayStr) return 'Today';

  const today = createLocalDate(todayStr);
  const tomorrowStr = addDays(todayStr, 1);
  if (dateOnlyStr === tomorrowStr) return 'Tomorrow';

  const yesterdayStr = addDays(todayStr, -1);
  if (dateOnlyStr === yesterdayStr) return 'Yesterday';

  const d = createLocalDate(dateOnlyStr);
  const isCurrentYear = d.getFullYear() === today.getFullYear();

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: isCurrentYear ? undefined : 'numeric',
    weekday: Math.abs(compareDateOnly(dateOnlyStr, todayStr)) <= 6 ? 'short' : undefined,
  });
}

/**
 * Returns short weekday name from index
 */
export function getWeekdayNames(firstDayOfWeek: 0 | 1 = 1): string[] {
  const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (firstDayOfWeek === 1) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }
  return base;
}

/**
 * Generates matrix of dates for a month view (including padding days from adjacent months)
 */
export function generateMonthGrid(year: number, monthZeroIndexed: number, firstDayOfWeek: 0 | 1 = 1): {
  year: number;
  month: number;
  days: Array<{
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
  }>;
} {
  const todayStr = getTodayDateString();
  const firstOfMonth = new Date(year, monthZeroIndexed, 1, 12, 0, 0, 0);
  const startDayOfWeek = firstOfMonth.getDay(); // 0 = Sun, 6 = Sat

  // Calculate leading padding days
  const leadingPadding = (startDayOfWeek < firstDayOfWeek ? 7 : 0) + startDayOfWeek - firstDayOfWeek;

  const daysInCurrentMonth = getDaysInMonth(year, monthZeroIndexed);
  const days: Array<{
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
  }> = [];

  // 1. Previous month trailing days
  const prevMonthDate = new Date(year, monthZeroIndexed, 0, 12, 0, 0, 0);
  const prevMonthDays = prevMonthDate.getDate();
  const prevMonthYear = prevMonthDate.getFullYear();
  const prevMonthNum = prevMonthDate.getMonth();

  for (let i = leadingPadding - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const mStr = String(prevMonthNum + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const dateStr = `${prevMonthYear}-${mStr}-${dStr}`;
    const dt = createLocalDate(dateStr);
    const dayOfWeek = dt.getDay();
    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const mStr = String(monthZeroIndexed + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;
    const dt = createLocalDate(dateStr);
    const dayOfWeek = dt.getDay();
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // 3. Next month leading days to complete grid (42 cells: 6 weeks)
  const totalCells = days.length <= 35 ? 35 : 42;
  const trailingPadding = totalCells - days.length;
  const nextMonthDate = new Date(year, monthZeroIndexed + 1, 1, 12, 0, 0, 0);
  const nextMonthYear = nextMonthDate.getFullYear();
  const nextMonthNum = nextMonthDate.getMonth();

  for (let d = 1; d <= trailingPadding; d++) {
    const mStr = String(nextMonthNum + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${nextMonthYear}-${mStr}-${dStr}`;
    const dt = createLocalDate(dateStr);
    const dayOfWeek = dt.getDay();
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  return {
    year,
    month: monthZeroIndexed,
    days,
  };
}
