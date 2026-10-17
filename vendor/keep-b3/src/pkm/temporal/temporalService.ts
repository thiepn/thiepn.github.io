/**
 * Phase P37 - Temporal Knowledge Service
 *
 * Central coordinator for calendar views, agenda tasks, recurrence completion,
 * property mutations, and ICS export.
 */

import { Note, Folder } from '../../types';
import {
  TemporalSettings,
  DEFAULT_TEMPORAL_SETTINGS,
  TemporalEntry,
  AgendaGroup,
  TemporalFilterState,
  TimelineActivityItem,
} from './temporalTypes';
import { temporalIndex } from './temporalIndex';
import { getTodayDateString } from './dateUtils';
import { updateTaskLineTemporalTokens, parseTaskTemporalMetadata } from './taskTemporalParser';
import { completeRecurringTaskLine } from './recurrenceEngine';
import { updatePropertyInFrontmatter } from '../properties/frontmatterEngine';
import { downloadICSFile } from './icsExporter';

class TemporalService {
  private settingsKey = 'keepnotes_temporal_settings';
  private listeners: Set<() => void> = new Set();
  private reminderCheckInterval: number | null = null;

  constructor() {
    this.loadSettings();
  }

  public getSettings(): TemporalSettings {
    return temporalIndex.getSettings();
  }

  public saveSettings(settings: Partial<TemporalSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    temporalIndex.setSettings(updated);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.settingsKey, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist temporal settings', e);
      }
    }
    this.notify();
  }

  private loadSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.settingsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        temporalIndex.setSettings({ ...DEFAULT_TEMPORAL_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.warn('Failed to load temporal settings', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Error in temporal listener', e);
      }
    });
  }

  /**
   * Rebuilds the global temporal index from vault contents
   */
  public syncVault(
    notes: Note[],
    folders: Folder[] = [],
    references: Array<{ id: string; title: string; year?: string | number; date?: string }> = []
  ): void {
    temporalIndex.rebuild(notes, folders, references);
    this.notify();
  }

  /**
   * Clears all indexed temporal data on vault lock
   */
  public lockVault(): void {
    temporalIndex.lock();
    this.notify();
  }

  public unlockVault(): void {
    temporalIndex.unlock();
    this.notify();
  }

  /**
   * Completes or toggles a task in a note, supporting deterministic recurrence generation
   */
  public async completeTask(
    note: Note,
    taskLineIndex: number,
    updateNoteContent: (noteId: string, newContent: string) => Promise<void>
  ): Promise<void> {
    if (!note || !note.content) return;
    const lines = note.content.split('\n');
    if (taskLineIndex < 0 || taskLineIndex >= lines.length) return;

    const targetLine = lines[taskLineIndex];
    const isCurrentlyChecked = /^\s*[-*+]\s+\[[xX]\]/.test(targetLine);
    const parsedTemporal = parseTaskTemporalMetadata(targetLine);

    if (!isCurrentlyChecked && parsedTemporal.recurrenceRule) {
      // 🔁 Recurring Task Completion
      const result = completeRecurringTaskLine(targetLine, {
        todayStr: getTodayDateString(),
        autoAddCompletionDate: this.getSettings().autoAddCompletionDate,
      });

      if (result) {
        // Replace current line with completed version and insert next occurrence line
        lines.splice(taskLineIndex, 1, result.completedLine, result.nextOccurrenceLine);
        const newContent = lines.join('\n');
        await updateNoteContent(note.id, newContent);
        return;
      }
    }

    // Standard Non-Recurring Toggle
    let newLine: string;
    if (isCurrentlyChecked) {
      // Uncheck task: [x] -> [ ], remove completed date token if present
      newLine = targetLine.replace(/^(\s*[-*+]\s+)\[[xX]\]/, '$1[ ]');
      newLine = updateTaskLineTemporalTokens(newLine, { completedDate: null });
    } else {
      // Check task: [ ] -> [x]
      newLine = targetLine.replace(/^(\s*[-*+]\s+)\[[ ]\]/, '$1[x]');
      if (this.getSettings().autoAddCompletionDate) {
        newLine = updateTaskLineTemporalTokens(newLine, {
          completedDate: getTodayDateString(),
        });
      }
    }

    lines[taskLineIndex] = newLine;
    const newContent = lines.join('\n');
    await updateNoteContent(note.id, newContent);
  }

  /**
   * Updates or sets temporal metadata (due, scheduled, recurrence) on a task line in markdown
   */
  public async updateTaskTemporalMetadata(
    note: Note,
    taskLineIndex: number,
    updates: {
      dueDate?: string | null;
      scheduledDate?: string | null;
      recurrence?: string | null;
      reminderTime?: string | null;
    },
    updateNoteContent: (noteId: string, newContent: string) => Promise<void>
  ): Promise<void> {
    if (!note || !note.content) return;
    const lines = note.content.split('\n');
    if (taskLineIndex < 0 || taskLineIndex >= lines.length) return;

    const targetLine = lines[taskLineIndex];
    const newLine = updateTaskLineTemporalTokens(targetLine, updates);

    lines[taskLineIndex] = newLine;
    const newContent = lines.join('\n');
    await updateNoteContent(note.id, newContent);
  }

  /**
   * Updates a date property in a note's frontmatter
   */
  public async updateNoteDateProperty(
    note: Note,
    propertyKey: string,
    dateStr: string | null,
    updateNoteContent: (noteId: string, newContent: string) => Promise<void>
  ): Promise<void> {
    const updatedContent = updatePropertyInFrontmatter(note.content, propertyKey, dateStr);
    await updateNoteContent(note.id, updatedContent);
  }

  /**
   * Queries temporal entries for a date range
   */
  public getEntriesForRange(startDate: string, endDate: string, filter?: Partial<TemporalFilterState>): TemporalEntry[] {
    return temporalIndex.getEntriesForRange(startDate, endDate, filter);
  }

  /**
   * Queries temporal entries for a single date
   */
  public getEntriesForDate(dateStr: string, filter?: Partial<TemporalFilterState>): TemporalEntry[] {
    return temporalIndex.getEntriesForDate(dateStr, filter);
  }

  /**
   * Queries agenda sections
   */
  public getAgendaGroups(
    todayStr = getTodayDateString(),
    horizonDays = this.getSettings().agendaHorizonDays || 14,
    filter?: Partial<TemporalFilterState>
  ): AgendaGroup[] {
    return temporalIndex.getAgendaGroups(todayStr, horizonDays, filter);
  }

  /**
   * Queries timeline activity items
   */
  public getTimelineActivities(options?: {
    limit?: number;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): TimelineActivityItem[] {
    return temporalIndex.getTimelineActivities(options);
  }

  /**
   * Exports dated items to iCalendar (.ics) file
   */
  public exportICS(entries?: TemporalEntry[], filename = 'keepnotes-calendar.ics'): void {
    const targetEntries = entries || temporalIndex.getEntriesForRange('1970-01-01', '2099-12-31');
    downloadICSFile(targetEntries, filename);
  }
}

export const temporalService = new TemporalService();
