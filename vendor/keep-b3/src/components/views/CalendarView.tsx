import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Bell,
  Clock,
  CheckSquare,
  FileText,
  Archive,
  X,
  Activity,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { NOTE_COLORS } from '../../utils/colors';
import { WritingActivityHeatmap } from '../WritingActivityHeatmap';

interface CalendarViewProps {
  notes: Note[];
  allNotes: Note[];
  folders: Folder[];
  onOpenNote: (note: Note) => void;
  onOpenNewNoteWithDate: (dateIso: string) => void;
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  notes,
  allNotes,
  folders,
  onOpenNote,
  onOpenNewNoteWithDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mapBy, setMapBy] = useState<'reminder' | 'created'>('reminder');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedDayNotes, setSelectedDayNotes] = useState<{
    dateStr: string;
    notes: Note[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const goToday = () => {
    setCurrentDate(new Date());
  };

  // Build calendar matrix (42 cells: 6 rows of 7 days)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dateKey: string; // YYYY-MM-DD
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: toLocalDateKey(d),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        date: dateObj,
        isCurrentMonth: true,
        dateKey: toLocalDateKey(dateObj),
      });
    }

    // Next month padding to fill 42 or 35 cells
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      days.push({
        date: dateObj,
        isCurrentMonth: false,
        dateKey: toLocalDateKey(dateObj),
      });
    }

    return days;
  }, [year, month]);

  // Group active notes by dateKey (YYYY-MM-DD)
  const notesByDate = useMemo(() => {
    const map = new Map<string, Note[]>();

    for (const note of notes) {
      if (note.trashed) continue;

      let dateStr: string | null = null;
      if (mapBy === 'reminder') {
        if (note.reminderDate) {
          dateStr = toLocalDateKey(new Date(note.reminderDate));
        } else {
          // If no reminder, fallback to created date so calendar is not completely empty
          dateStr = toLocalDateKey(new Date(note.createdAt));
        }
      } else {
        dateStr = toLocalDateKey(new Date(note.createdAt));
      }

      if (dateStr) {
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(note);
      }
    }

    return map;
  }, [notes, mapBy]);

  const monthName = currentDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const todayKey = toLocalDateKey(new Date());

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 pb-16">
      {/* Calendar Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 tracking-tight">
            {monthName}
          </h3>

          <button
            onClick={goToday}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Heatmap Toggle Button */}
          <button
            type="button"
            onClick={() => setShowHeatmap((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showHeatmap
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-2xs'
                : 'bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
            }`}
            title={showHeatmap ? 'Hide 52-Week Writing Activity Heatmap' : 'Show 52-Week Writing Activity Heatmap'}
            aria-pressed={showHeatmap}
          >
            <Activity className="w-3.5 h-3.5 text-amber-500" />
            <span>{showHeatmap ? 'Hide Matrix' : '52-Week Heatmap'}</span>
          </button>

          {/* Toggle mapping mode */}
          <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60 text-xs">
            <button
              onClick={() => setMapBy('reminder')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                mapBy === 'reminder'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              By Reminders
            </button>
            <button
              onClick={() => setMapBy('created')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                mapBy === 'created'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              By Date Created
            </button>
          </div>
        </div>
      </div>

      {/* 52-Week Writing Activity Matrix */}
      {showHeatmap && (
        <WritingActivityHeatmap
          notes={allNotes && allNotes.length > 0 ? allNotes : notes}
          onOpenNote={onOpenNote}
          onFilterDate={(dateKey) => {
            const d = new Date(dateKey + 'T00:00:00');
            if (!isNaN(d.getTime())) {
              setCurrentDate(d);
            }
          }}
          variant="full"
          showStats={true}
        />
      )}

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 text-center text-xs font-semibold text-stone-400 py-2.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* 6x7 Days Matrix */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-stone-200 dark:divide-stone-800">
          {calendarDays.map((day) => {
            const dayNotes = notesByDate.get(day.dateKey) || [];
            const isToday = day.dateKey === todayKey;

            return (
              <div
                key={day.dateKey}
                onClick={() => {
                  if (dayNotes.length > 0) {
                    setSelectedDayNotes({ dateStr: day.dateKey, notes: dayNotes });
                  } else {
                    onOpenNewNoteWithDate(new Date(day.dateKey + 'T09:00:00').toISOString());
                  }
                }}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                  day.isCurrentMonth
                    ? 'bg-white dark:bg-stone-900 hover:bg-stone-50/70 dark:hover:bg-stone-800/40'
                    : 'bg-stone-50/40 dark:bg-stone-950/20 text-stone-400 dark:text-stone-600'
                }`}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-amber-500 text-white shadow-xs'
                        : day.isCurrentMonth
                        ? 'text-stone-800 dark:text-stone-200'
                        : 'text-stone-400 dark:text-stone-600'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>

                  {/* Add note on this date hover button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewNoteWithDate(new Date(day.dateKey + 'T09:00:00').toISOString());
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-stone-400 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-opacity"
                    title={`Add note on ${day.dateKey}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Notes Pills List for this day */}
                <div className="space-y-1 my-1 flex-1 overflow-hidden">
                  {dayNotes.slice(0, 3).map((note) => {
                    const conf = NOTE_COLORS[note.color] || NOTE_COLORS.default;
                    return (
                      <div
                        key={note.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenNote(note);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 border transition-transform hover:scale-[1.02] shadow-2xs ${
                          conf.badgeLight
                        } ${conf.badgeDark} border-stone-200/50 dark:border-stone-800`}
                        title={note.title || 'Untitled'}
                      >
                        {note.type === 'checklist' ? (
                          <CheckSquare className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                        ) : note.archived ? (
                          <Archive className="w-2.5 h-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <FileText className="w-2.5 h-2.5 shrink-0 opacity-60" />
                        )}
                        <span className="truncate">{note.title || 'Untitled'}</span>
                      </div>
                    );
                  })}

                  {dayNotes.length > 3 && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-1">
                      +{dayNotes.length - 3} more
                    </div>
                  )}
                </div>

                <div className="h-1" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Inspector Modal Drawer when clicking a day with notes */}
      {selectedDayNotes && (
        <div
          onClick={() => setSelectedDayNotes(null)}
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                  Notes for {selectedDayNotes.dateStr}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayNotes(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {selectedDayNotes.notes.map((note) => {
                const conf = NOTE_COLORS[note.color] || NOTE_COLORS.default;
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedDayNotes(null);
                      onOpenNote(note);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
                      conf.bgLight
                    } ${conf.borderLight} ${conf.bgDark} ${conf.borderDark}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                        {note.title || 'Untitled Note'}
                      </h4>
                      {note.archived && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                          <Archive className="w-2.5 h-2.5" /> Archived
                        </span>
                      )}
                    </div>
                    {note.content && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 mt-1">
                        {note.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                const dateIso = new Date(selectedDayNotes.dateStr + 'T09:00:00').toISOString();
                setSelectedDayNotes(null);
                onOpenNewNoteWithDate(dateIso);
              }}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Note on this Date
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
