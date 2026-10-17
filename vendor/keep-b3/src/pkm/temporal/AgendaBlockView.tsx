import React, { useMemo } from 'react';
import { Calendar, CheckSquare, Clock, AlertCircle, CheckCircle2, ChevronRight, Tag, Folder as FolderIcon } from 'lucide-react';
import { Note } from '../../types';
import { temporalService } from './temporalService';
import { getTodayDateString, addDays, getWeekRange, formatFriendlyDate } from './dateUtils';
import { TemporalEntry } from './temporalTypes';

export interface AgendaBlockViewProps {
  rawParams: string; // Content of the ```agenda block
  notes: Note[];
  onOpenNote?: (noteId: string) => void;
  onUpdateNoteContent?: (noteId: string, newContent: string) => Promise<void>;
}

interface ParsedAgendaParams {
  range: 'today' | 'tomorrow' | 'this-week' | 'overdue' | 'upcoming' | 'all';
  tasks: 'open' | 'completed' | 'all';
  folder?: string;
  tag?: string;
  limit?: number;
}

export const AgendaBlockView: React.FC<AgendaBlockViewProps> = ({
  rawParams,
  notes,
  onOpenNote,
  onUpdateNoteContent,
}) => {
  // Parse yaml-like or key:value params from the code block
  const params: ParsedAgendaParams = useMemo(() => {
    const lines = rawParams.split('\n');
    const result: ParsedAgendaParams = {
      range: 'today',
      tasks: 'open',
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > -1) {
        const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
        const val = trimmed.slice(colonIdx + 1).trim();

        if (key === 'range') {
          const cleanVal = val.toLowerCase();
          if (['today', 'tomorrow', 'this-week', 'overdue', 'upcoming', 'all'].includes(cleanVal)) {
            result.range = cleanVal as ParsedAgendaParams['range'];
          }
        } else if (key === 'tasks' || key === 'status') {
          const cleanVal = val.toLowerCase();
          if (['open', 'completed', 'all'].includes(cleanVal)) {
            result.tasks = cleanVal as ParsedAgendaParams['tasks'];
          }
        } else if (key === 'folder') {
          result.folder = val;
        } else if (key === 'tag') {
          result.tag = val.replace(/^#/, '');
        } else if (key === 'limit') {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num > 0) result.limit = num;
        }
      }
    }

    return result;
  }, [rawParams]);

  const todayStr = getTodayDateString();

  // Query entries matching block criteria
  const entries = useMemo(() => {
    let startDate = '1970-01-01';
    let endDate = '2099-12-31';

    if (params.range === 'today') {
      startDate = todayStr;
      endDate = todayStr;
    } else if (params.range === 'tomorrow') {
      const tom = addDays(todayStr, 1);
      startDate = tom;
      endDate = tom;
    } else if (params.range === 'overdue') {
      startDate = '1970-01-01';
      endDate = addDays(todayStr, -1);
    } else if (params.range === 'this-week') {
      const week = getWeekRange(todayStr, temporalService.getSettings().firstDayOfWeek);
      startDate = week.startDate;
      endDate = week.endDate;
    } else if (params.range === 'upcoming') {
      startDate = todayStr;
      endDate = addDays(todayStr, 14);
    }

    const rawList = temporalService.getEntriesForRange(startDate, endDate, {
      showTasks: true,
      showNotes: true,
      showDailyNotes: true,
      showReferences: false,
      showCompleted: params.tasks === 'completed' || params.tasks === 'all',
      selectedTag: params.tag || null,
    });

    let filtered = rawList;

    if (params.tasks === 'open') {
      filtered = filtered.filter((e) => !e.completed);
    } else if (params.tasks === 'completed') {
      filtered = filtered.filter((e) => e.completed);
    }

    if (params.folder) {
      const folderQuery = params.folder.toLowerCase();
      filtered = filtered.filter((e) => (e.folderName || '').toLowerCase().includes(folderQuery));
    }

    if (params.limit && params.limit > 0) {
      return filtered.slice(0, params.limit);
    }

    return filtered;
  }, [params, todayStr, notes]);

  const handleToggleTask = async (entry: TemporalEntry) => {
    if (!entry.noteId || entry.taskLine === undefined || !onUpdateNoteContent) return;
    const note = notes.find((n) => n.id === entry.noteId);
    if (!note) return;

    await temporalService.completeTask(note, entry.taskLine, onUpdateNoteContent);
  };

  return (
    <div className="my-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 p-3.5 text-xs shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800/80 pb-2 mb-2.5">
        <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-semibold">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span>Agenda: {params.range.replace('-', ' ').toUpperCase()}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 font-mono">
            {entries.length}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-stone-500">
          {params.folder && (
            <span className="flex items-center gap-1">
              <FolderIcon className="w-3 h-3" />
              {params.folder}
            </span>
          )}
          {params.tag && (
            <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
              <Tag className="w-3 h-3" />#{params.tag}
            </span>
          )}
        </div>
      </div>

      {/* Items list */}
      {entries.length === 0 ? (
        <div className="py-4 text-center text-stone-400 dark:text-stone-500 italic text-[11px]">
          No items scheduled for this agenda range
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const isOverdue = entry.date < todayStr && !entry.completed;

            return (
              <div
                key={entry.id}
                className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors group ${
                  entry.completed
                    ? 'opacity-60 bg-stone-100/50 dark:bg-stone-900/40'
                    : isOverdue
                    ? 'bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40'
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                {/* Task Checkbox or Resource Icon */}
                {entry.resourceType === 'task' ? (
                  <button
                    type="button"
                    onClick={() => handleToggleTask(entry)}
                    className={`mt-0.5 p-0.5 rounded transition-colors ${
                      entry.completed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-stone-400 hover:text-amber-600 dark:hover:text-amber-400'
                    }`}
                    title={entry.completed ? 'Mark pending' : 'Mark complete'}
                    aria-label={`Toggle task: ${entry.title}`}
                  >
                    {entry.completed ? (
                      <CheckCircle2 className="w-4 h-4 fill-emerald-500/20" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded border border-stone-400 hover:border-amber-500" />
                    )}
                  </button>
                ) : (
                  <Calendar className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`font-medium text-stone-800 dark:text-stone-200 ${
                        entry.completed ? 'line-through text-stone-400 dark:text-stone-500' : ''
                      }`}
                    >
                      {entry.title}
                    </span>

                    {/* Recurrence token */}
                    {entry.recurrence && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                        🔁 {entry.recurrence}
                      </span>
                    )}

                    {/* Role / Date badge */}
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isOverdue
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold'
                          : entry.date === todayStr
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                          : 'bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {entry.time ? `${entry.date} ${entry.time}` : formatFriendlyDate(entry.date, todayStr)}
                    </span>
                  </div>

                  {/* Note source link */}
                  {entry.noteId && (
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-stone-400 dark:text-stone-500">
                      {entry.noteTitle && (
                        <button
                          type="button"
                          onClick={() => onOpenNote && onOpenNote(entry.noteId!)}
                          className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline flex items-center gap-0.5 truncate"
                        >
                          <ChevronRight className="w-2.5 h-2.5" />
                          <span>{entry.noteTitle}</span>
                        </button>
                      )}
                      {entry.folderName && <span>in {entry.folderName}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
