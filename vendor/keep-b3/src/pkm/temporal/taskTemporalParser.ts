/**
 * Phase P37 - Task Temporal Parser & Canonical Markdown Serializer
 *
 * Parses portable Markdown task tokens:
 * - Due Date: 📅 YYYY-MM-DD (e.g., "📅 2026-09-17" or "📅 2026-09-17 14:30")
 * - Scheduled Date: ⏳ YYYY-MM-DD
 * - Completed Date: ✅ YYYY-MM-DD
 * - Recurrence: 🔁 every day | 🔁 every week | 🔁 every 2 weeks | 🔁 every month | 🔁 every year | 🔁 every weekday
 * - Reminder: ⏰ HH:mm or ⏰ YYYY-MM-DD HH:mm
 */

import { parseCanonicalDate } from './dateUtils';
import { RecurrenceRule } from './temporalTypes';

export interface ParsedTaskTemporal {
  cleanText: string;
  dueDate?: string; // YYYY-MM-DD or YYYY-MM-DD HH:mm
  scheduledDate?: string;
  completedDate?: string;
  recurrence?: string;
  recurrenceRule?: RecurrenceRule;
  reminderTime?: string;
  hasDuplicateDueTokens?: boolean;
  hasInvalidDateTokens?: boolean;
}

// Regex patterns for tokens
const DUE_REGEX = /📅\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)/g;
const SCHEDULED_REGEX = /⏳\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)/g;
const COMPLETED_REGEX = /✅\s*(\d{4}-\d{2}-\d{2})/g;
const RECURRENCE_REGEX = /🔁\s*(every\s+(?:\d+\s+)?(?:day|week|month|year|weekday|days|weeks|months|years))/gi;
const REMINDER_REGEX = /⏰\s*((?:\d{4}-\d{2}-\d{2}\s+)?\d{2}:\d{2})/g;

/**
 * Parses a recurrence string into a structured RecurrenceRule
 */
export function parseRecurrenceString(raw: string): RecurrenceRule | undefined {
  if (!raw) return undefined;
  const clean = raw.trim().toLowerCase();

  if (clean === 'every day' || clean === 'daily') {
    return { type: 'daily', interval: 1, unit: 'day', rawText: raw };
  }
  if (clean === 'every week' || clean === 'weekly') {
    return { type: 'weekly', interval: 1, unit: 'week', rawText: raw };
  }
  if (clean === 'every month' || clean === 'monthly') {
    return { type: 'monthly', interval: 1, unit: 'month', rawText: raw };
  }
  if (clean === 'every year' || clean === 'yearly') {
    return { type: 'yearly', interval: 1, unit: 'year', rawText: raw };
  }
  if (clean === 'every weekday' || clean === 'weekdays') {
    return { type: 'weekdays', interval: 1, rawText: raw };
  }

  // Interval match: e.g. "every 2 weeks", "every 3 days", "every 6 months"
  const intervalMatch = clean.match(/^every\s+(\d+)\s+(day|week|month|year|days|weeks|months|years)$/);
  if (intervalMatch) {
    const num = parseInt(intervalMatch[1], 10);
    const unitRaw = intervalMatch[2];
    const unit = unitRaw.startsWith('day')
      ? 'day'
      : unitRaw.startsWith('week')
      ? 'week'
      : unitRaw.startsWith('month')
      ? 'month'
      : 'year';

    return {
      type: 'interval',
      interval: num > 0 ? num : 1,
      unit,
      rawText: raw,
    };
  }

  return undefined;
}

/**
 * Parses temporal tokens out of a task's raw text or line
 */
export function parseTaskTemporalMetadata(text: string): ParsedTaskTemporal {
  let dueDate: string | undefined;
  let scheduledDate: string | undefined;
  let completedDate: string | undefined;
  let recurrence: string | undefined;
  let reminderTime: string | undefined;
  let hasDuplicateDueTokens = false;
  let hasInvalidDateTokens = false;

  // 1. Check Due Date
  const dueMatches = Array.from(text.matchAll(DUE_REGEX));
  if (dueMatches.length > 0) {
    if (dueMatches.length > 1) {
      hasDuplicateDueTokens = true;
    }
    const val = dueMatches[0][1];
    const parsed = parseCanonicalDate(val);
    if (parsed.isValid) {
      dueDate = val;
    } else {
      hasInvalidDateTokens = true;
    }
  }

  // 2. Check Scheduled Date
  const schedMatches = Array.from(text.matchAll(SCHEDULED_REGEX));
  if (schedMatches.length > 0) {
    const val = schedMatches[0][1];
    const parsed = parseCanonicalDate(val);
    if (parsed.isValid) {
      scheduledDate = val;
    } else {
      hasInvalidDateTokens = true;
    }
  }

  // 3. Check Completed Date
  const compMatches = Array.from(text.matchAll(COMPLETED_REGEX));
  if (compMatches.length > 0) {
    const val = compMatches[0][1];
    const parsed = parseCanonicalDate(val);
    if (parsed.isValid) {
      completedDate = val;
    } else {
      hasInvalidDateTokens = true;
    }
  }

  // 4. Check Recurrence
  const recMatches = Array.from(text.matchAll(RECURRENCE_REGEX));
  if (recMatches.length > 0) {
    recurrence = recMatches[0][1].trim();
  }

  // 5. Check Reminder
  const remMatches = Array.from(text.matchAll(REMINDER_REGEX));
  if (remMatches.length > 0) {
    reminderTime = remMatches[0][1].trim();
  }

  // 6. Clean Text (strip checkbox prefix, tokens, and trailing block IDs)
  let cleanText = text
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s*/, '')
    .replace(DUE_REGEX, '')
    .replace(SCHEDULED_REGEX, '')
    .replace(COMPLETED_REGEX, '')
    .replace(RECURRENCE_REGEX, '')
    .replace(REMINDER_REGEX, '')
    .replace(/\^[a-zA-Z0-9_-]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  const recurrenceRule = recurrence ? parseRecurrenceString(recurrence) : undefined;

  return {
    cleanText,
    dueDate,
    scheduledDate,
    completedDate,
    recurrence,
    recurrenceRule,
    reminderTime,
    hasDuplicateDueTokens,
    hasInvalidDateTokens,
  };
}

/**
 * Updates or removes temporal tokens on a task's raw line or text while preserving original indentation and bullet
 */
export function updateTaskLineTemporalTokens(
  rawLine: string,
  updates: {
    dueDate?: string | null;
    scheduledDate?: string | null;
    recurrence?: string | null;
    completedDate?: string | null;
    reminderTime?: string | null;
  }
): string {
  // Extract line prefix: whitespace, bullet, checkbox
  const match = rawLine.match(/^(\s*[-*+]\s+\[[ xX]\]\s*)(.*)$/);
  const prefix = match ? match[1] : '';
  const body = match ? match[2] : rawLine;

  // Extract trailing block ID if any
  let blockIdSuffix = '';
  const blockMatch = body.match(/(\s+\^[a-zA-Z0-9_-]+)$/);
  let mainBody = body;
  if (blockMatch) {
    blockIdSuffix = blockMatch[1];
    mainBody = body.slice(0, blockMatch.index);
  }

  // Parse existing metadata
  const existing = parseTaskTemporalMetadata(mainBody);

  // Apply updates (if key is explicitly provided: string to set/replace, null to remove, undefined to keep)
  const finalDueDate = updates.dueDate !== undefined ? updates.dueDate : existing.dueDate;
  const finalScheduledDate = updates.scheduledDate !== undefined ? updates.scheduledDate : existing.scheduledDate;
  const finalRecurrence = updates.recurrence !== undefined ? updates.recurrence : existing.recurrence;
  const finalCompletedDate = updates.completedDate !== undefined ? updates.completedDate : existing.completedDate;
  const finalReminderTime = updates.reminderTime !== undefined ? updates.reminderTime : existing.reminderTime;

  // Build clean text
  let newBody = existing.cleanText;

  // Append tokens in consistent standard order
  if (finalRecurrence) {
    newBody += ` 🔁 ${finalRecurrence.trim()}`;
  }
  if (finalScheduledDate) {
    newBody += ` ⏳ ${finalScheduledDate.trim()}`;
  }
  if (finalDueDate) {
    newBody += ` 📅 ${finalDueDate.trim()}`;
  }
  if (finalReminderTime) {
    newBody += ` ⏰ ${finalReminderTime.trim()}`;
  }
  if (finalCompletedDate) {
    newBody += ` ✅ ${finalCompletedDate.trim()}`;
  }

  return `${prefix}${newBody}${blockIdSuffix}`;
}

export const updateTaskTemporalLine = updateTaskLineTemporalTokens;
export const cleanTaskTemporalTokens = (text: string): string => parseTaskTemporalMetadata(text).cleanText;
