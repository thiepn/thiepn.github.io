/**
 * Birthday & Recurring Annual Date Utilities for Phase P48
 * 
 * Supports both full dates (YYYY-MM-DD) and yearless dates (--MM-DD or MM-DD).
 * Never assumes fake years (such as 1900). Calculates age ONLY when birth year is known.
 */

import { BirthdayValue } from './peopleTypes';

/**
 * Checks if a given year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Parses raw birthday strings into a structured BirthdayValue
 */
export function parseBirthday(rawInput: unknown): BirthdayValue | undefined {
  if (!rawInput || typeof rawInput !== 'string') return undefined;

  const trimmed = rawInput.trim();
  if (!trimmed) return undefined;

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  let hasYear = false;

  // 1. Check ISO standard YYYY-MM-DD or YYYY/MM/DD
  const fullMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (fullMatch) {
    const y = parseInt(fullMatch[1], 10);
    const m = parseInt(fullMatch[2], 10);
    const d = parseInt(fullMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      year = y;
      month = m;
      day = d;
      hasYear = true;
    }
  }

  // 2. Check yearless ISO: --MM-DD or --MMDD
  if (!month) {
    const yearlessIsoMatch = trimmed.match(/^--(\d{1,2})[-/.]?(\d{1,2})$/);
    if (yearlessIsoMatch) {
      const m = parseInt(yearlessIsoMatch[1], 10);
      const d = parseInt(yearlessIsoMatch[2], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        month = m;
        day = d;
        hasYear = false;
      }
    }
  }

  // 3. Check simple MM-DD or MM/DD or MM.DD
  if (!month) {
    const simpleMonthDayMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})$/);
    if (simpleMonthDayMatch) {
      const m = parseInt(simpleMonthDayMatch[1], 10);
      const d = parseInt(simpleMonthDayMatch[2], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        month = m;
        day = d;
        hasYear = false;
      }
    }
  }

  // 4. Check text formats like "December 10" or "Dec 10, 1815" or "10 December 1815"
  if (!month) {
    for (let i = 0; i < MONTH_NAMES.length; i++) {
      const mName = MONTH_NAMES[i].toLowerCase();
      const mShort = mName.slice(0, 3);
      const lower = trimmed.toLowerCase();
      if (lower.includes(mName) || lower.includes(mShort)) {
        const numbers = trimmed.match(/\d+/g);
        if (numbers && numbers.length >= 1) {
          month = i + 1;
          if (numbers.length === 1) {
            day = parseInt(numbers[0], 10);
            hasYear = false;
          } else if (numbers.length >= 2) {
            // Check if first is day or year
            const n1 = parseInt(numbers[0], 10);
            const n2 = parseInt(numbers[1], 10);
            if (n1 > 31) {
              year = n1;
              day = n2;
              hasYear = true;
            } else if (n2 > 31) {
              day = n1;
              year = n2;
              hasYear = true;
            } else {
              day = n1;
              hasYear = false;
            }
          }
        }
        break;
      }
    }
  }

  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  // Validate days in month
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) {
    return undefined;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const today = new Date(currentYear, now.getMonth(), now.getDate());

  // Calculate next occurrence
  let targetYear = currentYear;
  let targetDay = day;
  // Handle Feb 29 on non-leap years
  if (month === 2 && day === 29 && !isLeapYear(targetYear)) {
    targetDay = 28; // Standard recurrence display on non-leap years
  }

  let nextDate = new Date(targetYear, month - 1, targetDay);
  if (nextDate.getTime() < today.getTime()) {
    targetYear = currentYear + 1;
    targetDay = day;
    if (month === 2 && day === 29 && !isLeapYear(targetYear)) {
      targetDay = 28;
    }
    nextDate = new Date(targetYear, month - 1, targetDay);
  }

  const diffMs = nextDate.getTime() - today.getTime();
  const daysUntilNext = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const targetDayStr = String(targetDay).padStart(2, '0');
  const nextOccurrenceDate = `${targetYear}-${monthStr}-${targetDayStr}`;

  let age: number | undefined;
  if (hasYear && year) {
    const birthDateThisYear = new Date(currentYear, month - 1, day);
    let calculatedAge = currentYear - year;
    if (today.getTime() < birthDateThisYear.getTime()) {
      calculatedAge -= 1;
    }
    age = Math.max(0, calculatedAge);
  }

  const monthName = MONTH_NAMES[month - 1];
  const formattedDisplay = hasYear && year
    ? `${monthName} ${day}, ${year}`
    : `${monthName} ${day}`;

  const canonicalRaw = hasYear && year
    ? `${year}-${monthStr}-${dayStr}`
    : `--${monthStr}-${dayStr}`;

  return {
    raw: canonicalRaw,
    hasYear,
    year,
    month,
    day,
    formattedDisplay,
    age,
    nextOccurrenceDate,
    daysUntilNext,
  };
}
