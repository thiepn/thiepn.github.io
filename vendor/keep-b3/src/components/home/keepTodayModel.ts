/**
 * KEEP Today is a projection of already-owned Notes records, never another
 * storage engine. Folio/Calendar/Habits must contribute through owner-approved
 * adapters; a raw note checkbox must not be presented as a Folio task.
 */
import type { Note } from '../../types';
import type { PKMTask } from '../../pkm/tasks/taskTypes';
import { buildVaultTasks } from '../../pkm/tasks/taskIndex';

export interface KeepTodayProjection {
  dateOnly: string;
  pinnedNotes: Note[];
  recentNotes: Note[];
  dueNoteTasks: PKMTask[];
  upcomingNoteReminders: Note[];
  openNoteTaskCount: number;
}

/** Local calendar date, not UTC: a local 00:30 should stay on its own day. */
export function dateOnlyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function selectKeepToday(notes: readonly Note[], now: Date = new Date()): KeepTodayProjection {
  const today = dateOnlyLocal(now);
  // Archived, trashed and note-level locked records are not projected here.
  // The outer application also suppresses this panel while the vault is locked.
  const active = notes.filter(n => !n.trashed && !n.archived && !n.isLocked);
  const chronological = [...active].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const { allTasks, openCount } = buildVaultTasks(active);
  const dueNoteTasks = allTasks
    .filter(t => !t.completed && Boolean(t.dueDate || t.noteDate) && (t.dueDate || t.noteDate)! <= today)
    .sort((a, b) => (a.dueDate || a.noteDate || '').localeCompare(b.dueDate || b.noteDate || '') || a.text.localeCompare(b.text));
  const reminders = active
    .filter(n => n.reminderDate && !Number.isNaN(Date.parse(n.reminderDate)))
    .filter(n => new Date(n.reminderDate!).getTime() <= now.getTime() + 7 * 86400000)
    .sort((a, b) => Date.parse(a.reminderDate!) - Date.parse(b.reminderDate!));

  return {
    dateOnly: today,
    pinnedNotes: chronological.filter(n => n.pinned).slice(0, 6),
    recentNotes: chronological.slice(0, 5),
    dueNoteTasks: dueNoteTasks.slice(0, 6),
    upcomingNoteReminders: reminders.slice(0, 5),
    openNoteTaskCount: openCount,
  };
}
