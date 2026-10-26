/**
 * Phase P36: Variable Interpolator
 * Safe, deterministic token replacement for templates and dynamic values without eval or script execution.
 */

import { Note, Folder } from '../../types';
import { CanonicalDomainEvent } from './automationTypes';
import { getISOWeekNumber, formatLocalDateOnly } from '../temporal/dateUtils';

export interface InterpolationContext {
  note?: Note | null;
  folders?: Folder[];
  event?: CanonicalDomainEvent | null;
  referenceDate?: Date;
  customVars?: Record<string, string>;
}

/**
 * Interpolates safe predefined variables in a template string
 */
export function interpolateVariables(templateStr: string, context: InterpolationContext = {}): string {
  if (!templateStr || typeof templateStr !== 'string') return '';

  const now = context.referenceDate || new Date();
  const year = now.getFullYear();
  const monthNum = String(now.getMonth() + 1).padStart(2, '0');
  const dayNum = String(now.getDate()).padStart(2, '0');
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekday = weekdayNames[now.getDay()];
  const isoWeek = getISOWeekNumber(now);
  const isoWeekPadded = String(isoWeek).padStart(2, '0');
  const prevWeek = isoWeek === 1 ? 52 : isoWeek - 1;
  const prevWeekPadded = String(prevWeek).padStart(2, '0');
  const nextWeek = isoWeek >= 52 ? 1 : isoWeek + 1;
  const nextWeekPadded = String(nextWeek).padStart(2, '0');

  const note = context.note;
  const noteTitle = note?.title || '';
  const noteId = note?.id || '';
  const noteFolderId = note?.folderId || '';
  let folderName = '';
  if (noteFolderId && context.folders) {
    const f = context.folders.find((x) => x.id === noteFolderId);
    if (f) folderName = f.name;
  }

  const event = context.event;
  const oldValueStr = event?.propertyOldValue !== undefined ? String(event.propertyOldValue) : '';
  const newValueStr = event?.propertyNewValue !== undefined ? String(event.propertyNewValue) : '';
  const propKey = event?.propertyKey || '';
  const tagVal = event?.tag || '';
  const sourceHost = event?.captureData?.sourceHost || '';

  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_\-\+\.]+)\s*\}\}/g, (match, token) => {
    const rawToken = token.trim();
    const lower = rawToken.toLowerCase();

    // Built-in date tokens
    if (lower === 'today') return formatLocalDateOnly(now);
    if (lower === 'date') return formatLocalDateOnly(now);
    if (lower === 'now') return now.toISOString();
    if (lower === 'time') return now.toTimeString().slice(0, 5);
    if (lower === 'year') return String(year);
    if (lower === 'month') return monthNum;
    if (lower === 'day') return dayNum;
    if (lower === 'weekday') return weekday;
    if (lower === 'week') return isoWeekPadded;
    if (lower === 'isoweek') return isoWeekPadded;
    if (lower === 'previousweek' || lower === 'prevweek') return prevWeekPadded;
    if (lower === 'nextweek') return nextWeekPadded;

    // Date offsets: {{today+7d}}, {{date+1d}}, {{today-7d}}, {{today+30d}}
    const offsetMatch = lower.match(/^(?:today|date|now)([\+\-])(\d+)([d|w|m])?$/);
    if (offsetMatch) {
      const sign = offsetMatch[1] === '+' ? 1 : -1;
      const count = parseInt(offsetMatch[2], 10);
      const unit = offsetMatch[3] || 'd';
      const offsetDate = new Date(now.getTime());

      if (unit === 'd') {
        offsetDate.setDate(offsetDate.getDate() + sign * count);
      } else if (unit === 'w') {
        offsetDate.setDate(offsetDate.getDate() + sign * count * 7);
      } else if (unit === 'm') {
        offsetDate.setMonth(offsetDate.getMonth() + sign * count);
      }
      return formatLocalDateOnly(offsetDate);
    }

    // Note tokens
    if (lower === 'note.title' || lower === 'title') return noteTitle;
    if (lower === 'note.id' || lower === 'id') return noteId;
    if (lower === 'note.folder' || lower === 'folder') return folderName;

    // Event / Trigger tokens
    if (lower === 'trigger.oldvalue' || lower === 'oldvalue') return oldValueStr;
    if (lower === 'trigger.newvalue' || lower === 'newvalue') return newValueStr;
    if (lower === 'trigger.propertykey' || lower === 'propertykey') return propKey;
    if (lower === 'trigger.tag' || lower === 'tag') return tagVal;
    if (lower === 'trigger.sourcehost' || lower === 'sourcehost' || lower === 'host') return sourceHost;

    // Custom supplied dictionary
    if (context.customVars && context.customVars[rawToken] !== undefined) {
      return context.customVars[rawToken];
    }

    return match; // Leave unreplaced if unknown
  });
}
