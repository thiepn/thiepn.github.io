import React, { useMemo } from 'react';
import { CalendarDays, Clock, CheckSquare2, FileText, ArrowUpRight, Repeat2, ListTodo } from 'lucide-react';
import type { Note } from '../../types';
import { KeepResourceBoard } from './KeepResourceBoard';
import { selectKeepToday } from './keepTodayModel';

interface KeepTodayOverviewProps {
  notes: Note[];
  onOpenNote: (note: Note, cursorLine?: number) => void;
  onSaveNote: (note: Note) => Promise<unknown>;
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onOpenPlanning: () => void;
  onOpenRoutines: () => void;
  onOpenDiscovery: (savedViewId?: string) => void;
}

const sectionClass = 'min-w-0 border-t border-stone-200 dark:border-stone-800 pt-3';
const linkClass = 'text-left w-full rounded-md px-2 py-2 -mx-2 hover:bg-stone-100 dark:hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-amber-600 transition-colors';

/**
 * Native KEEP projection: items are opened and edited in their original Notes
 * or Markdown-task owner. External THIEPN providers are NOT claimed here.
 */
export const KeepTodayOverview: React.FC<KeepTodayOverviewProps> = ({ notes, onOpenNote, onSaveNote, onOpenTasks, onOpenCalendar, onOpenPlanning, onOpenRoutines, onOpenDiscovery }) => {
  const view = useMemo(() => selectKeepToday(notes), [notes]);
  const byId = useMemo(() => new Map(notes.map(n => [n.id, n])), [notes]);
  const actions = [
    { title: 'Tasks', detail: 'Note-backed tasks', icon: CheckSquare2, action: onOpenTasks },
    { title: 'Calendar', detail: 'KEEP calendar', icon: CalendarDays, action: onOpenCalendar },
    { title: 'Planning', detail: 'Projects & next actions', icon: ListTodo, action: onOpenPlanning },
    { title: 'Routines', detail: 'Habits & check-ins', icon: Repeat2, action: onOpenRoutines },
  ];

  return (
    <section aria-label="KEEP daily workspace" className="mb-7 border-y border-stone-200 dark:border-stone-800 py-5 space-y-5">
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">KEEP · Today</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Your note-backed work in one place · {view.dateOnly}</p>
        </div>
        <span className="text-xs text-stone-500 dark:text-stone-400">{view.openNoteTaskCount} open note tasks</span>
      </div>

      <nav aria-label="Workspace sections" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map(({ title, detail, icon: Icon, action }) => (
          <button key={title} type="button" onClick={action} className="flex flex-col items-start gap-1.5 text-left border border-stone-200 dark:border-stone-800 rounded-md px-3 py-3 hover:bg-stone-100 dark:hover:bg-stone-900 focus-visible:outline-2 focus-visible:outline-amber-600">
            <Icon aria-hidden="true" className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">{title}</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">{detail}</span>
          </button>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-stone-200 dark:border-stone-800 pt-3">
        <h3 className="text-sm font-semibold">Pinned resources</h3>
        <button type="button" className="text-xs underline text-amber-700 dark:text-amber-400" onClick={() => onOpenDiscovery()}>Open knowledge & project explorer</button>
      </div>
      <KeepResourceBoard notes={notes} onOpenNote={onOpenNote} onSaveNote={onSaveNote} compact onOpenSavedView={(id) => onOpenDiscovery(id)} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
        <div className={sectionClass}>
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 flex gap-2 items-center mb-2"><CheckSquare2 className="w-4 h-4" aria-hidden="true"/> Due note tasks</h3>
          {view.dueNoteTasks.length ? view.dueNoteTasks.map(task => (
            <button type="button" key={task.id} onClick={() => { const note = byId.get(task.noteId); if (note) onOpenNote(note, task.line); }} className={linkClass}>
              <span className="text-sm block text-stone-800 dark:text-stone-200 line-clamp-2">{task.text}</span>
              <span className="text-xs block text-stone-500 dark:text-stone-400 truncate">{task.noteTitle} · {task.dueDate || task.noteDate}</span>
            </button>
          )) : <p className="text-xs text-stone-500 dark:text-stone-400">No overdue or due-today tasks in your notes.</p>}
          {view.dueNoteTasks.length > 0 && <button type="button" className="flex items-center gap-1 text-xs mt-2 text-amber-700 dark:text-amber-400" onClick={onOpenTasks}>Manage note tasks <ArrowUpRight className="w-3 h-3" /></button>}
        </div>
        <div className={sectionClass}>
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 flex gap-2 items-center mb-2"><Clock className="w-4 h-4" aria-hidden="true"/> Note reminders · due/next 7 days</h3>
          {view.upcomingNoteReminders.length ? view.upcomingNoteReminders.map(note => (
            <button type="button" key={note.id} onClick={() => onOpenNote(note)} className={linkClass}>
              <span className="text-sm block truncate text-stone-800 dark:text-stone-200">{note.title || 'Untitled'}</span>
              <span className="text-xs block text-stone-500 dark:text-stone-400">{new Date(note.reminderDate!).toLocaleString()}</span>
            </button>
          )) : <p className="text-xs text-stone-500 dark:text-stone-400">No note reminders due this week.</p>}
        </div>
      </div>

      {view.recentNotes.length > 0 && (
        <div className="border-t border-stone-200 dark:border-stone-800 pt-3">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" aria-hidden="true"/> Continue writing</h3>
          <div className="flex flex-wrap gap-2">
            {view.recentNotes.map(note => (
              <button type="button" key={note.id} onClick={() => onOpenNote(note)} className="text-xs px-3 py-2 rounded-md border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-amber-600 max-w-full truncate">{note.title || 'Untitled'}</button>
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-stone-500 dark:text-stone-400">Only KEEP-owned notes, Markdown tasks and reminders are shown. Folio, external calendar and Habits data are not connected yet.</p>
    </section>
  );
};
