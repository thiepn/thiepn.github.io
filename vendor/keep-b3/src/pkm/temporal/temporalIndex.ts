/**
 * Phase P37 - Temporal Knowledge Index & Range Query Engine
 *
 * Maintains a high-performance derived in-memory index mapping canonical dates (YYYY-MM-DD)
 * to Daily Notes, properties-dated notes, tasks with temporal tokens, and references.
 */

import { Note, Folder } from '../../types';
import { extractTasksFromNote } from '../tasks/taskParser';
import { parseFrontmatter } from '../properties/frontmatterEngine';
import { parseCanonicalDate, getTodayDateString, compareDateOnly, isBeforeDate, isAfterDate, addDays, getWeekRange } from './dateUtils';
import { parseTaskTemporalMetadata } from './taskTemporalParser';
import {
  TemporalEntry,
  TemporalFilterState,
  TemporalSettings,
  DEFAULT_TEMPORAL_SETTINGS,
  AgendaGroup,
  TimelineActivityItem,
} from './temporalTypes';
import { isDailyNote } from '../dailyNotes/dailyNotesTypes';
import { dailyNotesService } from '../dailyNotes/dailyNotesService';

export class TemporalIndex {
  private entries: TemporalEntry[] = [];
  private entriesByDate: Map<string, TemporalEntry[]> = new Map();
  private timelineActivities: TimelineActivityItem[] = [];
  private settings: TemporalSettings = DEFAULT_TEMPORAL_SETTINGS;
  private isLocked: boolean = false;

  public setSettings(settings: TemporalSettings): void {
    this.settings = { ...DEFAULT_TEMPORAL_SETTINGS, ...settings };
  }

  public getSettings(): TemporalSettings {
    return this.settings;
  }

  /**
   * Clears the index completely (used on vault encryption lock or reset)
   */
  public clear(): void {
    this.entries = [];
    this.entriesByDate.clear();
    this.timelineActivities = [];
  }

  public lock(): void {
    this.isLocked = true;
    this.clear();
  }

  public unlock(): void {
    this.isLocked = false;
  }

  /**
   * Full rebuild of the temporal index from notes, folders, and references
   */
  public rebuild(
    notes: Note[],
    folders: Folder[] = [],
    references: Array<{ id: string; title: string; year?: string | number; date?: string }> = []
  ): void {
    if (this.isLocked) {
      this.clear();
      return;
    }

    const folderMap = new Map<string, string>();
    for (const f of folders) {
      if (f && f.id) folderMap.set(f.id, f.name);
    }

    const newEntries: TemporalEntry[] = [];
    const activities: TimelineActivityItem[] = [];
    const dailySettings = dailyNotesService.getSettings();

    for (const note of notes) {
      if (!note || note.trashed) continue;

      const folderName = note.folderId ? folderMap.get(note.folderId) : undefined;

      // 1. Check if note is a Daily Note
      const isDaily = isDailyNote(note, dailySettings);
      if (isDaily) {
        // Resolve date from title or reminderDate or created
        const titleParsed = parseCanonicalDate(note.title);
        const reminderParsed = note.reminderDate ? parseCanonicalDate(note.reminderDate) : null;
        const targetDate = titleParsed.isValid
          ? titleParsed.dateOnly
          : reminderParsed && reminderParsed.isValid
          ? reminderParsed.dateOnly
          : parseCanonicalDate(note.createdAt).dateOnly;

        if (targetDate) {
          newEntries.push({
            id: `daily-${note.id}`,
            resourceType: 'daily-note',
            resourceId: note.id,
            title: note.title,
            date: targetDate,
            temporalRole: 'scheduled',
            folderId: note.folderId,
            folderName,
            tags: note.tags,
            noteId: note.id,
            noteTitle: note.title,
            metadata: { isDailyNote: true },
          });
        }
      }

      // 2. Check Note Properties / Frontmatter for recognized temporal roles
      const parsedFm = parseFrontmatter(note.content);
      if (parsedFm && parsedFm.ast.hasFrontmatter && parsedFm.frontmatter) {
        for (const [propKey, propVal] of Object.entries(parsedFm.frontmatter)) {
          const role = this.settings.recognizedPropertyRoles[propKey.toLowerCase().trim()];
          if (role && (typeof propVal === 'string' || typeof propVal === 'number' || propVal instanceof Date)) {
            const parsedPropDate = parseCanonicalDate(propVal);
            if (parsedPropDate.isValid && parsedPropDate.dateOnly) {
              newEntries.push({
                id: `note-prop-${note.id}-${propKey}`,
                resourceType: 'note',
                resourceId: note.id,
                title: note.title,
                date: parsedPropDate.dateOnly,
                time: parsedPropDate.time,
                dateTimeIso: parsedPropDate.iso,
                temporalRole: role,
                folderId: note.folderId,
                folderName,
                tags: note.tags,
                noteId: note.id,
                noteTitle: note.title,
                metadata: { propertyKey: propKey, propertyValue: propVal },
              });
            }
          }
        }
      }

      // 3. Fallback: if note has a reminderDate and not already indexed as daily
      if (note.reminderDate && !isDaily) {
        const remParsed = parseCanonicalDate(note.reminderDate);
        if (remParsed.isValid && remParsed.dateOnly) {
          newEntries.push({
            id: `note-rem-${note.id}`,
            resourceType: 'note',
            resourceId: note.id,
            title: note.title,
            date: remParsed.dateOnly,
            time: remParsed.time,
            dateTimeIso: remParsed.iso,
            temporalRole: 'reminder',
            folderId: note.folderId,
            folderName,
            tags: note.tags,
            noteId: note.id,
            noteTitle: note.title,
          });
        }
      }

      // 4. Extract Markdown Checklist Tasks
      const tasks = extractTasksFromNote(note);
      for (const t of tasks) {
        const temporalMeta = parseTaskTemporalMetadata(t.rawLine || t.text);

        // Due date entry
        if (temporalMeta.dueDate) {
          const dueParsed = parseCanonicalDate(temporalMeta.dueDate);
          if (dueParsed.isValid && dueParsed.dateOnly) {
            newEntries.push({
              id: `task-due-${t.id}`,
              resourceType: 'task',
              resourceId: t.id,
              title: temporalMeta.cleanText || t.text,
              date: dueParsed.dateOnly,
              dueDate: dueParsed.dateOnly,
              scheduledDate: temporalMeta.scheduledDate,
              time: dueParsed.time,
              dateTimeIso: dueParsed.iso,
              temporalRole: 'due',
              completed: t.completed,
              folderId: note.folderId,
              folderName,
              tags: note.tags,
              noteId: note.id,
              noteTitle: note.title,
              taskLine: t.line,
              recurrence: temporalMeta.recurrence,
              sourceSnippet: t.rawLine,
            });
          }
        }

        // Scheduled date entry (if distinct from due)
        if (temporalMeta.scheduledDate && temporalMeta.scheduledDate !== temporalMeta.dueDate) {
          const schedParsed = parseCanonicalDate(temporalMeta.scheduledDate);
          if (schedParsed.isValid && schedParsed.dateOnly) {
            newEntries.push({
              id: `task-sched-${t.id}`,
              resourceType: 'task',
              resourceId: t.id,
              title: temporalMeta.cleanText || t.text,
              date: schedParsed.dateOnly,
              dueDate: temporalMeta.dueDate,
              scheduledDate: schedParsed.dateOnly,
              time: schedParsed.time,
              dateTimeIso: schedParsed.iso,
              temporalRole: 'scheduled',
              completed: t.completed,
              folderId: note.folderId,
              folderName,
              tags: note.tags,
              noteId: note.id,
              noteTitle: note.title,
              taskLine: t.line,
              recurrence: temporalMeta.recurrence,
              sourceSnippet: t.rawLine,
            });
          }
        }
      }

      // 5. Timeline Activities from Note lifecycle
      const createdParsed = parseCanonicalDate(note.createdAt);
      if (createdParsed.isValid && createdParsed.dateOnly) {
        activities.push({
          id: `act-create-${note.id}`,
          timestamp: new Date(note.createdAt).getTime(),
          date: createdParsed.dateOnly,
          timeStr: createdParsed.time || '00:00',
          resourceType: isDaily ? 'daily-note' : 'note',
          resourceId: note.id,
          resourceTitle: note.title,
          action: 'created',
          folderName,
        });
      }

      if (note.updatedAt && note.updatedAt !== note.createdAt) {
        const updatedParsed = parseCanonicalDate(note.updatedAt);
        if (updatedParsed.isValid && updatedParsed.dateOnly) {
          activities.push({
            id: `act-edit-${note.id}`,
            timestamp: new Date(note.updatedAt).getTime(),
            date: updatedParsed.dateOnly,
            timeStr: updatedParsed.time || '00:00',
            resourceType: isDaily ? 'daily-note' : 'note',
            resourceId: note.id,
            resourceTitle: note.title,
            action: 'edited',
            folderName,
          });
        }
      }
    }

    // 6. Index References / BibTeX entries
    for (const ref of references) {
      if (!ref || !ref.id) continue;
      const refDateVal = ref.date || (ref.year ? `${ref.year}-01-01` : undefined);
      if (refDateVal) {
        const refParsed = parseCanonicalDate(refDateVal);
        if (refParsed.isValid && refParsed.dateOnly) {
          newEntries.push({
            id: `ref-${ref.id}`,
            resourceType: 'reference',
            resourceId: ref.id,
            title: ref.title,
            date: refParsed.dateOnly,
            temporalRole: 'published',
            metadata: { referenceId: ref.id },
          });

          activities.push({
            id: `act-ref-${ref.id}`,
            timestamp: new Date(refParsed.dateOnly).getTime(),
            date: refParsed.dateOnly,
            timeStr: '00:00',
            resourceType: 'reference',
            resourceId: ref.id,
            resourceTitle: ref.title,
            action: 'imported',
          });
        }
      }
    }

    // Sort entries by date ascending, then title
    newEntries.sort((a, b) => {
      const cmp = compareDateOnly(a.date, b.date);
      if (cmp !== 0) return cmp;
      return (a.title || '').localeCompare(b.title || '');
    });

    // Populate Map
    const dateMap = new Map<string, TemporalEntry[]>();
    for (const entry of newEntries) {
      const existing = dateMap.get(entry.date) || [];
      existing.push(entry);
      dateMap.set(entry.date, existing);
    }

    // Sort Timeline Activities descending
    activities.sort((a, b) => b.timestamp - a.timestamp);

    this.entries = newEntries;
    this.entriesByDate = dateMap;
    this.timelineActivities = activities;
  }

  /**
   * Retrieves all temporal entries in the index
   */
  public getAllEntries(): TemporalEntry[] {
    return this.entries;
  }

  /**
   * Retrieves all temporal entries within an inclusive date range [startDate, endDate]
   */
  public getEntriesForRange(
    startDate: string,
    endDate: string,
    filter?: Partial<TemporalFilterState>
  ): TemporalEntry[] {
    const results: TemporalEntry[] = [];

    for (const entry of this.entries) {
      if (compareDateOnly(entry.date, startDate) >= 0 && compareDateOnly(entry.date, endDate) <= 0) {
        if (this.matchesFilter(entry, filter)) {
          results.push(entry);
        }
      }
    }

    return results;
  }

  /**
   * Retrieves all temporal entries for a single specific date
   */
  public getEntriesForDate(dateStr: string, filter?: Partial<TemporalFilterState>): TemporalEntry[] {
    const list = this.entriesByDate.get(dateStr) || [];
    if (!filter) return list;
    return list.filter((e) => this.matchesFilter(e, filter));
  }

  /**
   * Returns structured Agenda sections (Overdue, Today, Tomorrow, This Week, Later, Completed)
   */
  public getAgendaGroups(
    todayStr = getTodayDateString(),
    horizonDays = this.settings.agendaHorizonDays || 14,
    filter?: Partial<TemporalFilterState>
  ): AgendaGroup[] {
    const tomorrowStr = addDays(todayStr, 1);
    const horizonEndStr = addDays(todayStr, horizonDays);
    const week = getWeekRange(todayStr, this.settings.firstDayOfWeek);

    const overdueEntries: TemporalEntry[] = [];
    const todayEntries: TemporalEntry[] = [];
    const tomorrowEntries: TemporalEntry[] = [];
    const thisWeekEntries: TemporalEntry[] = [];
    const laterEntries: TemporalEntry[] = [];
    const completedEntries: TemporalEntry[] = [];

    for (const entry of this.entries) {
      if (!this.matchesFilter(entry, filter)) continue;

      if (entry.completed) {
        completedEntries.push(entry);
        continue;
      }

      const d = entry.date;
      if (isBeforeDate(d, todayStr)) {
        overdueEntries.push(entry);
      } else if (d === todayStr) {
        todayEntries.push(entry);
      } else if (d === tomorrowStr) {
        tomorrowEntries.push(entry);
      } else if (compareDateOnly(d, week.endDate) <= 0) {
        thisWeekEntries.push(entry);
      } else if (compareDateOnly(d, horizonEndStr) <= 0) {
        laterEntries.push(entry);
      }
    }

    const groups: AgendaGroup[] = [
      {
        key: 'overdue',
        label: 'Overdue',
        entries: overdueEntries,
        count: overdueEntries.length,
      },
      {
        key: 'today',
        label: 'Today',
        dateStr: todayStr,
        entries: todayEntries,
        count: todayEntries.length,
      },
      {
        key: 'tomorrow',
        label: 'Tomorrow',
        dateStr: tomorrowStr,
        entries: tomorrowEntries,
        count: tomorrowEntries.length,
      },
      {
        key: 'this-week',
        label: 'This Week',
        entries: thisWeekEntries,
        count: thisWeekEntries.length,
      },
      {
        key: 'later',
        label: `Next ${horizonDays} Days`,
        entries: laterEntries,
        count: laterEntries.length,
      },
    ];

    if (filter?.showCompleted || this.settings.showCompletedInAgenda) {
      groups.push({
        key: 'completed',
        label: 'Completed Items',
        entries: completedEntries,
        count: completedEntries.length,
      });
    }

    return groups;
  }

  /**
   * Retrieves timeline activity items
   */
  public getTimelineActivities(options: {
    limit?: number;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  } = {}): TimelineActivityItem[] {
    let list = this.timelineActivities;

    if (options.resourceType && options.resourceType !== 'all') {
      list = list.filter((a) => a.resourceType === options.resourceType);
    }

    if (options.action && options.action !== 'all') {
      list = list.filter((a) => a.action === options.action);
    }

    if (options.startDate) {
      list = list.filter((a) => compareDateOnly(a.date, options.startDate!) >= 0);
    }

    if (options.endDate) {
      list = list.filter((a) => compareDateOnly(a.date, options.endDate!) <= 0);
    }

    if (options.limit && options.limit > 0) {
      return list.slice(0, options.limit);
    }

    return list;
  }

  /**
   * Filter predicate for temporal entries
   */
  private matchesFilter(entry: TemporalEntry, filter?: Partial<TemporalFilterState>): boolean {
    if (!filter) return true;

    // Type toggles
    if (filter.showTasks === false && entry.resourceType === 'task') return false;
    if (filter.showNotes === false && entry.resourceType === 'note') return false;
    if (filter.showDailyNotes === false && entry.resourceType === 'daily-note') return false;
    if (filter.showReferences === false && entry.resourceType === 'reference') return false;

    // Completed tasks
    if (filter.showCompleted === false && entry.completed) return false;

    // Selected folder
    if (filter.selectedFolderId && entry.folderId !== filter.selectedFolderId) {
      return false;
    }

    // Selected tag
    if (filter.selectedTag) {
      if (!entry.tags || !entry.tags.includes(filter.selectedTag)) {
        return false;
      }
    }

    // Selected role
    if (filter.selectedRole && filter.selectedRole !== 'all') {
      if (entry.temporalRole !== filter.selectedRole) {
        return false;
      }
    }

    // Search query
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchTitle = (entry.title || '').toLowerCase().includes(q);
      const matchNoteTitle = (entry.noteTitle || '').toLowerCase().includes(q);
      const matchFolder = (entry.folderName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchNoteTitle && !matchFolder) {
        return false;
      }
    }

    return true;
  }
}

export const temporalIndex = new TemporalIndex();
