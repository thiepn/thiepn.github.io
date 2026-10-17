import { Note, Folder, AppSettings } from '../../types';

export interface DailyNotesSettings {
  enabled: boolean;
  dateFormat: string; // e.g. 'YYYY-MM-DD', 'YYYY/MM/DD', 'dddd, MMMM D, YYYY', 'YYYY-MM-DD dddd'
  folderName: string; // e.g. 'Daily Notes'
  folderId?: string | null;
  templateId: string | null; // e.g. 'tmpl-daily-journal' or null
  openOnStartup: boolean;
  appendHeading: string; // e.g. '## Log' or '## Fleeting Notes'
  autoTags: string[]; // e.g. ['daily']
}

export const DEFAULT_DAILY_NOTES_SETTINGS: DailyNotesSettings = {
  enabled: true,
  dateFormat: 'YYYY-MM-DD',
  folderName: 'Daily Notes',
  folderId: null,
  templateId: 'tmpl-daily-journal',
  openOnStartup: false,
  appendHeading: '## Log',
  autoTags: ['daily'],
};

export const COMMON_DATE_FORMATS = [
  { format: 'YYYY-MM-DD', label: '2026-09-02 (ISO Standard)', sample: '2026-09-02' },
  { format: 'YYYY-MM-DD dddd', label: '2026-09-02 Wednesday', sample: '2026-09-02 Wednesday' },
  { format: 'dddd, MMMM D, YYYY', label: 'Wednesday, September 2, 2026', sample: 'Wednesday, September 2, 2026' },
  { format: 'MMMM D, YYYY', label: 'September 2, 2026', sample: 'September 2, 2026' },
  { format: 'DD-MM-YYYY', label: '02-09-2026 (EU Standard)', sample: '02-09-2026' },
  { format: 'YYYY_MM_DD', label: '2026_09_02 (Underscore)', sample: '2026_09_02' },
];

/**
 * Robust date formatting utility supporting common PKM date tokens
 */
export function formatDailyDate(d: Date, pattern: string): string {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  const dayShort = [
    'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
  ];

  let res = pattern;
  res = res.replace(/YYYY/g, String(year));
  res = res.replace(/YY/g, String(year).slice(-2));
  res = res.replace(/MMMM/g, monthNames[d.getMonth()]);
  res = res.replace(/MMM/g, monthShort[d.getMonth()]);
  res = res.replace(/MM/g, String(month).padStart(2, '0'));
  res = res.replace(/dddd/g, dayNames[d.getDay()]);
  res = res.replace(/ddd/g, dayShort[d.getDay()]);
  res = res.replace(/DD/g, String(day).padStart(2, '0'));
  res = res.replace(/\bD\b/g, String(day));

  return res;
}

/**
 * Attempts to parse a Date object from a note title or ISO date key
 */
export function parseDateFromTitle(title: string, pattern: string = 'YYYY-MM-DD'): Date | null {
  if (!title || typeof title !== 'string') return null;

  // 1. Direct ISO YYYY-MM-DD match
  const isoMatch = title.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return date;
  }

  // 2. Underscore match YYYY_MM_DD
  const underMatch = title.match(/(\d{4})_(\d{2})_(\d{2})/);
  if (underMatch) {
    const [, y, m, d] = underMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return date;
  }

  // 3. DD-MM-YYYY match
  const euMatch = title.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (euMatch) {
    const [, d, m, y] = euMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return date;
  }

  // 4. Try JS standard Date parsing (e.g. "Wednesday, September 2, 2026")
  const parsed = new Date(title);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
    return parsed;
  }

  return null;
}

/**
 * Checks whether a given note is recognized as a Daily Note
 */
export function isDailyNote(note: Note, settings: DailyNotesSettings): boolean {
  if (!note || note.trashed) return false;

  // 1. Check if note has 'daily' or 'daily-note' or configured autoTags in tags
  const hasDailyTag = (note.tags || []).some((t) =>
    t.toLowerCase() === 'daily' ||
    t.toLowerCase() === 'journal' ||
    (settings.autoTags && settings.autoTags.includes(t.toLowerCase()))
  );

  // 2. Check if note is in the Daily Notes folder
  const inDailyFolder = Boolean(
    settings.folderId && note.folderId === settings.folderId
  );

  // 3. Check if title matches date format pattern
  const parsedDate = parseDateFromTitle(note.title, settings.dateFormat);

  return Boolean(parsedDate && (hasDailyTag || inDailyFolder || isStrictDateTitle(note.title)));
}

function isStrictDateTitle(title: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(title) ||
    /^\d{4}_\d{2}_\d{2}/.test(title) ||
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/i.test(title);
}

/**
 * Returns adjacent day dates and formatted titles
 */
export function getAdjacentDailyDates(currentDate: Date, pattern: string) {
  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);

  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);

  return {
    prevDate,
    nextDate,
    prevTitle: formatDailyDate(prevDate, pattern),
    nextTitle: formatDailyDate(nextDate, pattern),
    todayDate: new Date(),
    todayTitle: formatDailyDate(new Date(), pattern),
  };
}
