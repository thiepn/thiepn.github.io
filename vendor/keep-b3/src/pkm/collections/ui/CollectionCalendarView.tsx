import React, { useState, useMemo } from 'react';
import { Note, Folder } from '../../../types';
import {
  Collection,
  CollectionView,
  CollectionRecord,
} from '../collectionTypes';
import { collectionService } from '../collectionService';
import { formatDateOnly } from '../../properties/frontmatterEngine';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ExternalLink, Plus } from 'lucide-react';

export interface CollectionCalendarViewProps {
  collection: Collection;
  view: CollectionView;
  records: CollectionRecord[];
  allNotes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onSaveNote: (updatedNote: Note) => void;
  onCreateNewNote?: (initialTitle?: string, initialProperties?: Record<string, any>) => void;
}

export const CollectionCalendarView: React.FC<CollectionCalendarViewProps> = ({
  collection,
  view,
  records,
  allNotes,
  folders,
  onOpenNote,
  onSaveNote,
  onCreateNewNote,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const datePropId = view.datePropertyId || 'due';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar Grid generation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: formatDateOnly(prevDate),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(year, month, d);
      days.push({
        dateStr: formatDateOnly(curDate),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill complete weeks (42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      days.push({
        dateStr: formatDateOnly(nextDate),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Map records by their date property string (YYYY-MM-DD)
  const recordsByDate = useMemo(() => {
    const map = new Map<string, CollectionRecord[]>();

    for (const record of records) {
      const dateVal = collectionService.getRecordFieldValue(record, datePropId);
      const dateStr = formatDateOnly(dateVal);
      if (dateStr) {
        let list = map.get(dateStr);
        if (!list) {
          list = [];
          map.set(dateStr, list);
        }
        list.push(record);
      }
    }
    return map;
  }, [records, datePropId]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = formatDateOnly(new Date());

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-stone-900 overflow-hidden">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850/50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {monthName}
          </h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500">
            Tracking '{datePropId}'
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium text-stone-600 dark:text-stone-300"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-center text-[11px] font-semibold text-stone-500 py-1.5">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* 42-day Month Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-stone-100 dark:divide-stone-800/80 overflow-y-auto">
        {calendarDays.map((day) => {
          const isToday = day.dateStr === todayStr;
          const dayRecords = recordsByDate.get(day.dateStr) || [];

          return (
            <div
              key={day.dateStr}
              className={`p-1.5 flex flex-col justify-between transition-colors min-h-[90px] ${
                day.isCurrentMonth
                  ? 'bg-white dark:bg-stone-900'
                  : 'bg-stone-50/60 dark:bg-stone-950/40 text-stone-400 dark:text-stone-600'
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : day.isCurrentMonth
                      ? 'text-stone-800 dark:text-stone-200'
                      : 'text-stone-400'
                  }`}
                >
                  {day.dayNum}
                </span>

                {day.isCurrentMonth && onCreateNewNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onCreateNewNote('Untitled', { [datePropId]: day.dateStr });
                    }}
                    className="opacity-0 hover:opacity-100 p-0.5 rounded text-stone-400 hover:text-indigo-600"
                    title={`Add note on ${day.dateStr}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Day Record Pills */}
              <div className="flex-1 overflow-y-auto space-y-1">
                {dayRecords.map((record) => (
                  <button
                    key={record.note.id}
                    type="button"
                    onClick={() => onOpenNote(record.note.id)}
                    className="w-full p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 text-left text-[11px] text-indigo-900 dark:text-indigo-200 font-medium truncate flex items-center justify-between gap-1 transition-colors"
                  >
                    <span className="truncate">{record.note.title || 'Untitled'}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
