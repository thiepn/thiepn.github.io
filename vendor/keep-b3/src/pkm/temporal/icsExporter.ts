/**
 * Phase P37 - iCalendar (ICS) Export Engine
 *
 * Implements RFC 5545 compliant iCalendar export for dated notes, Daily Notes, and scheduled tasks.
 */

import { TemporalEntry } from './temporalTypes';
import { parseCanonicalDate } from './dateUtils';

function escapeICSString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Formats a canonical YYYY-MM-DD string to ICS DATE format YYYYMMDD
 */
function toICSDate(dateOnlyStr: string): string {
  return dateOnlyStr.replace(/-/g, '');
}

/**
 * Generates an RFC 5545 iCalendar (.ics) string from a list of TemporalEntry items
 */
export function generateICSContent(
  entries: TemporalEntry[],
  calendarName = 'KeepNotes Calendar'
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KeepNotes PKM//Temporal Knowledge Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSString(calendarName)}`,
    'X-WR-TIMEZONE:UTC',
  ];

  const nowStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  for (const entry of entries) {
    if (!entry.date) continue;
    const dateFormatted = toICSDate(entry.date);
    const uid = `pkm-${entry.id || entry.resourceId}-${dateFormatted}@keepnotes.local`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStamp}`);

    if (entry.time) {
      const timeClean = entry.time.replace(/:/g, '') + '00';
      lines.push(`DTSTART:${dateFormatted}T${timeClean}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${dateFormatted}`);
    }

    const summary = entry.title || (entry.resourceType === 'daily-note' ? `Daily Note ${entry.date}` : 'Untitled Event');
    lines.push(`SUMMARY:${escapeICSString(summary)}`);

    const descParts: string[] = [];
    if (entry.noteTitle && entry.resourceType === 'task') {
      descParts.push(`Note: ${entry.noteTitle}`);
    }
    if (entry.folderName) {
      descParts.push(`Folder: ${entry.folderName}`);
    }
    if (entry.temporalRole) {
      descParts.push(`Role: ${entry.temporalRole}`);
    }
    if (entry.recurrence) {
      descParts.push(`Recurrence: ${entry.recurrence}`);
    }
    if (entry.completed !== undefined) {
      descParts.push(`Status: ${entry.completed ? 'Completed' : 'Pending'}`);
    }

    if (descParts.length > 0) {
      lines.push(`DESCRIPTION:${escapeICSString(descParts.join('\\n'))}`);
    }

    if (entry.completed) {
      lines.push('STATUS:COMPLETED');
    } else {
      lines.push('STATUS:CONFIRMED');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Initiates a browser download for the generated .ics file
 */
export function downloadICSFile(entries: TemporalEntry[], filename = 'keepnotes-calendar.ics'): void {
  const icsText = generateICSContent(entries);
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
