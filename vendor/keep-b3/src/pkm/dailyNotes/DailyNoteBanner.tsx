import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Plus,
  Clock,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { Note } from '../../types';
import {
  DailyNotesSettings,
  formatDailyDate,
  parseDateFromTitle,
  getAdjacentDailyDates,
} from './dailyNotesTypes';

export interface DailyNoteBannerProps {
  note: Note;
  dailySettings: DailyNotesSettings;
  onNavigateToDate: (targetDate: Date) => void;
  onAppendLogEntry?: (text: string) => void;
}

export const DailyNoteBanner: React.FC<DailyNoteBannerProps> = ({
  note,
  dailySettings,
  onNavigateToDate,
  onAppendLogEntry,
}) => {
  const [quickLogText, setQuickLogText] = useState('');
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const parsedDate = parseDateFromTitle(note.title, dailySettings.dateFormat) || new Date();
  const adjacent = getAdjacentDailyDates(parsedDate, dailySettings.dateFormat);

  const isToday =
    parsedDate.getFullYear() === adjacent.todayDate.getFullYear() &&
    parsedDate.getMonth() === adjacent.todayDate.getMonth() &&
    parsedDate.getDate() === adjacent.todayDate.getDate();

  const formattedHeaderDate = formatDailyDate(parsedDate, 'dddd, MMMM D, YYYY');

  const handleQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLogText.trim() || !onAppendLogEntry) return;
    onAppendLogEntry(quickLogText.trim());
    setQuickLogText('');
    setIsQuickLogOpen(false);
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-3 text-stone-800 dark:text-stone-200 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Date and Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                {formattedHeaderDate}
              </span>
              {isToday ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                  <Sun className="h-2.5 w-2.5" /> Today
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateToDate(adjacent.todayDate)}
                  className="rounded-full bg-stone-200 dark:bg-stone-800 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:text-stone-300 hover:bg-amber-500 hover:text-white transition-colors"
                >
                  Jump to Today
                </button>
              )}
            </div>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              Daily Note • {dailySettings.folderName || 'Root'}
            </span>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-1.5">
          {/* Previous Day */}
          <button
            type="button"
            onClick={() => onNavigateToDate(adjacent.prevDate)}
            title={`Previous Day: ${adjacent.prevTitle}`}
            className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-850 px-2 py-1 text-xs font-medium text-stone-700 dark:text-stone-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shadow-2xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Yesterday</span>
          </button>

          {/* Date Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDatePickerOpen((prev) => !prev)}
              title="Jump to date"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-300 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shadow-2xs"
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </button>

            {isDatePickerOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-2 shadow-xl">
                <label className="block text-[10px] font-semibold uppercase text-stone-500 dark:text-stone-400 mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  defaultValue={parsedDate.toISOString().slice(0, 10)}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      onNavigateToDate(new Date(y, m - 1, d));
                      setIsDatePickerOpen(false);
                    }
                  }}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2 py-1 text-xs text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Next Day */}
          <button
            type="button"
            onClick={() => onNavigateToDate(adjacent.nextDate)}
            title={`Next Day: ${adjacent.nextTitle}`}
            className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-850 px-2 py-1 text-xs font-medium text-stone-700 dark:text-stone-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shadow-2xs"
          >
            <span className="hidden sm:inline">Tomorrow</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Append Log Button */}
          {onAppendLogEntry && (
            <button
              type="button"
              onClick={() => setIsQuickLogOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Micro-Log Form */}
      {isQuickLogOpen && onAppendLogEntry && (
        <form onSubmit={handleQuickLogSubmit} className="mt-2.5 flex items-center gap-2 pt-2 border-t border-amber-500/20">
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <input
            type="text"
            autoFocus
            placeholder="Type quick thought or task and press Enter..."
            value={quickLogText}
            onChange={(e) => setQuickLogText(e.target.value)}
            className="flex-1 rounded-lg border border-amber-500/40 bg-white dark:bg-stone-900 px-2.5 py-1 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={!quickLogText.trim()}
            className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setIsQuickLogOpen(false)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};
