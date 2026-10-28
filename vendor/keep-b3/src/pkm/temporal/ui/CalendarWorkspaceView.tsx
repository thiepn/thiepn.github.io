import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  FileText,
  Bookmark,
  Repeat,
  Download,
  Settings as SettingsIcon,
  Search,
  Folder as FolderIcon,
  Layers,
  ArrowUpRight,
  ListTodo,
  Activity,
  CalendarDays,
} from 'lucide-react';
import { Note, Folder, AppSettings } from '../../../types';
import { temporalService } from '../temporalService';
import {
  getTodayDateString,
  addDays,
  addWeeks,
  addMonths,
  generateMonthGrid,
  getWeekRange,
  getWeekdayNames,
  formatFriendlyDate,
  compareDateOnly,
  createLocalDate,
} from '../dateUtils';
import {
  TemporalEntry,
  TemporalFilterState,
  CalendarViewMode,
} from '../temporalTypes';
import { AgendaView } from './AgendaView';
import { TimelineView } from './TimelineView';
import { TaskDatePickerModal } from './TaskDatePickerModal';
import { TemporalSettingsModal } from './TemporalSettingsModal';
import { dailyNotesService } from '../../dailyNotes/dailyNotesService';

export interface CalendarWorkspaceViewProps {
  notes: Note[];
  folders: Folder[];
  appSettings: AppSettings;
  onOpenNote: (noteId: string) => void;
  onOpenDailyNote?: (date?: Date) => void;
  onUpdateNoteContent: (noteId: string, newContent: string) => Promise<void>;
  createNote?: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  createFolder?: (name: string, color?: string) => Promise<void>;
}

export const CalendarWorkspaceView: React.FC<CalendarWorkspaceViewProps> = ({
  notes,
  folders,
  appSettings,
  onOpenNote,
  onOpenDailyNote,
  onUpdateNoteContent,
  createNote,
  createFolder,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getTodayDateString());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingTaskEntry, setEditingTaskEntry] = useState<TemporalEntry | null>(null);

  // Filters
  const [filter, setFilter] = useState<TemporalFilterState>({
    showTasks: true,
    showNotes: true,
    showDailyNotes: true,
    showReferences: true,
    showCompleted: false,
    searchQuery: '',
    selectedFolderId: null,
    selectedTag: null,
  });

  const todayStr = getTodayDateString();
  const settings = temporalService.getSettings();

  // Month grid data
  const monthGrid = useMemo(() => {
    return generateMonthGrid(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      settings.firstDayOfWeek
    );
  }, [currentDate, settings.firstDayOfWeek]);

  // Week range data
  const weekRange = useMemo(() => {
    return getWeekRange(selectedDateStr || todayStr, settings.firstDayOfWeek);
  }, [selectedDateStr, todayStr, settings.firstDayOfWeek]);

  // Query entries for current month view range
  const monthEntries = useMemo(() => {
    if (monthGrid.days.length === 0) return [];
    const start = monthGrid.days[0].dateStr;
    const end = monthGrid.days[monthGrid.days.length - 1].dateStr;
    return temporalService.getEntriesForRange(start, end, filter);
  }, [monthGrid, filter, notes]);

  // Map month entries by date
  const entriesByDateMap = useMemo(() => {
    const map = new Map<string, TemporalEntry[]>();
    for (const e of monthEntries) {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [monthEntries]);

  // Selected date entries
  const selectedDateEntries = useMemo(() => {
    return temporalService.getEntriesForDate(selectedDateStr, filter);
  }, [selectedDateStr, filter, notes]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      const newD = new Date(currentDate);
      newD.setMonth(newD.getMonth() - 1);
      setCurrentDate(newD);
    } else if (viewMode === 'week') {
      const prevWeekStr = addWeeks(selectedDateStr, -1);
      setSelectedDateStr(prevWeekStr);
      setCurrentDate(createLocalDate(prevWeekStr));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      const newD = new Date(currentDate);
      newD.setMonth(newD.getMonth() + 1);
      setCurrentDate(newD);
    } else if (viewMode === 'week') {
      const nextWeekStr = addWeeks(selectedDateStr, 1);
      setSelectedDateStr(nextWeekStr);
      setCurrentDate(createLocalDate(nextWeekStr));
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(todayStr);
  };

  const handleToggleTask = async (entry: TemporalEntry) => {
    if (!entry.noteId || entry.taskLine === undefined) return;
    const note = notes.find((n) => n.id === entry.noteId);
    if (!note) return;

    await temporalService.completeTask(note, entry.taskLine, onUpdateNoteContent);
  };

  const handleSaveTaskDates = async (updates: {
    dueDate?: string | null;
    scheduledDate?: string | null;
    recurrence?: string | null;
    reminderTime?: string | null;
  }) => {
    if (!editingTaskEntry || !editingTaskEntry.noteId || editingTaskEntry.taskLine === undefined) return;
    const note = notes.find((n) => n.id === editingTaskEntry.noteId);
    if (!note) return;

    await temporalService.updateTaskTemporalMetadata(note, editingTaskEntry.taskLine, updates, onUpdateNoteContent);
    setEditingTaskEntry(null);
  };

  const handleOpenOrCreateDailyNoteForDate = async (targetDateStr: string) => {
    const dt = createLocalDate(targetDateStr);
    if (onOpenDailyNote) {
      onOpenDailyNote(dt);
    } else if (createNote) {
      const res = await dailyNotesService.getOrCreateDailyNote({
        date: dt,
        notes,
        folders,
        appSettings,
        createNote,
        createFolder,
      });
      if (res && res.note) {
        onOpenNote(res.note.id);
      }
    }
  };

  const weekdayHeaders = useMemo(() => {
    return getWeekdayNames(settings.firstDayOfWeek);
  }, [settings.firstDayOfWeek]);

  const monthLabel = currentDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fdfdfc] dark:bg-[#131316] overflow-hidden select-none">
      {/* Top Header & Navigation Bar */}
      <div className="h-14 border-b border-stone-200 dark:border-stone-800 px-4 flex items-center justify-between gap-3 bg-white/70 dark:bg-stone-900/70 backdrop-blur-xs shrink-0">
        {/* Left: View Modes & Today */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-stone-100 dark:bg-stone-800/80 p-0.5 border border-stone-200/80 dark:border-stone-700/80 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
              <span>Month</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-sky-500" />
              <span>Week</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
              <span>Agenda</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-purple-500" />
              <span>Timeline</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors"
          >
            Today
          </button>
        </div>

        {/* Center: Month/Week Title Navigation (for Month & Week) */}
        {(viewMode === 'month' || viewMode === 'week') && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
              title="Previous"
              aria-label="Previous range"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h2 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base min-w-[140px] text-center">
              {viewMode === 'month'
                ? monthLabel
                : `${formatFriendlyDate(weekRange.startDate, todayStr)} – ${formatFriendlyDate(weekRange.endDate, todayStr)}`}
            </h2>

            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
              title="Next"
              aria-label="Next range"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right: Actions, Filters & Settings */}
        <div className="flex items-center gap-2 text-xs">
          {/* Quick Today's Daily Note */}
          {onOpenDailyNote && (
            <button
              type="button"
              onClick={() => onOpenDailyNote()}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Open or Create Daily Note (Alt+D)"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Daily Note</span>
            </button>
          )}

          {/* Export ICS */}
          <button
            type="button"
            onClick={() => temporalService.exportICS()}
            className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
            title="Export iCalendar (.ics)"
            aria-label="Export iCalendar"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Temporal Settings Trigger */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
            title="Calendar & Temporal Settings"
            aria-label="Calendar Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'agenda' ? (
        <AgendaView
          notes={notes}
          folders={folders}
          onOpenNote={onOpenNote}
          onOpenDailyNote={onOpenDailyNote}
          onUpdateNoteContent={onUpdateNoteContent}
        />
      ) : viewMode === 'timeline' ? (
        <TimelineView notes={notes} onOpenNote={onOpenNote} />
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Main Grid View */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {/* Weekday Header Bar */}
            <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/60 text-center py-2 text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
              {weekdayHeaders.map((dayName) => (
                <div key={dayName}>{dayName}</div>
              ))}
            </div>

            {/* Month Grid */}
            {viewMode === 'month' && (
              <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-[540px] bg-stone-200/50 dark:bg-stone-800/50 gap-[1px]">
                {monthGrid.days.map((cell) => {
                  const dayEntries = entriesByDateMap.get(cell.dateStr) || [];
                  const isSelected = cell.dateStr === selectedDateStr;
                  const isToday = cell.dateStr === todayStr;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => setSelectedDateStr(cell.dateStr)}
                      onDoubleClick={() => handleOpenOrCreateDailyNoteForDate(cell.dateStr)}
                      className={`min-h-[85px] p-1.5 flex flex-col justify-between transition-colors cursor-pointer bg-white dark:bg-stone-900 group ${
                        !cell.isCurrentMonth
                          ? 'opacity-40 bg-stone-50 dark:bg-stone-950/40'
                          : isSelected
                          ? 'ring-2 ring-amber-500 z-10'
                          : 'hover:bg-amber-50/30 dark:hover:bg-amber-950/10'
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            isToday
                              ? 'bg-amber-500 text-white font-bold'
                              : isSelected
                              ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                              : 'text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {dayEntries.length > 0 && (
                          <span className="text-[10px] font-mono text-stone-400">
                            {dayEntries.length}
                          </span>
                        )}
                      </div>

                      {/* Item Badges (up to 3) */}
                      <div className="mt-1 space-y-1 overflow-hidden flex-1">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <div
                            key={entry.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (entry.noteId) onOpenNote(entry.noteId);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 border transition-colors ${
                              entry.completed
                                ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 line-through border-transparent'
                                : entry.resourceType === 'task'
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-200/50 dark:border-amber-800/50'
                                : entry.resourceType === 'daily-note'
                                ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200 border-sky-200/50 dark:border-sky-800/50'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                            }`}
                            title={entry.title}
                          >
                            {entry.resourceType === 'task' ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                            ) : (
                              <CalendarIcon className="w-2.5 h-2.5 text-sky-500 shrink-0" />
                            )}
                            <span className="truncate">{entry.title}</span>
                          </div>
                        ))}

                        {dayEntries.length > 3 && (
                          <div className="text-[9px] text-stone-400 font-medium pl-1">
                            +{dayEntries.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Week Grid View */}
            {viewMode === 'week' && (
              <div className="flex-1 grid grid-cols-7 min-h-[500px] bg-stone-200/50 dark:bg-stone-800/50 gap-[1px]">
                {weekRange.days.map((dateStr) => {
                  const dayEntries = temporalService.getEntriesForDate(dateStr, filter);
                  const isSelected = dateStr === selectedDateStr;
                  const isToday = dateStr === todayStr;
                  const dt = createLocalDate(dateStr);

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDateStr(dateStr)}
                      onDoubleClick={() => handleOpenOrCreateDailyNoteForDate(dateStr)}
                      className={`p-2 flex flex-col justify-start space-y-2 bg-white dark:bg-stone-900 transition-colors cursor-pointer ${
                        isSelected ? 'ring-2 ring-amber-500 z-10' : 'hover:bg-amber-50/20'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isToday
                              ? 'bg-amber-500 text-white font-bold'
                              : 'text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          {dt.getDate()}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {dayEntries.length} items
                        </span>
                      </div>

                      {/* Entries List */}
                      <div className="space-y-1.5 overflow-y-auto flex-1">
                        {dayEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`p-1.5 rounded-lg border text-xs transition-colors group ${
                              entry.completed
                                ? 'bg-stone-50 dark:bg-stone-950/40 text-stone-400 opacity-60 border-stone-200/40'
                                : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200/70 dark:border-stone-700/70 hover:border-amber-400'
                            }`}
                          >
                            <div className="flex items-start gap-1.5">
                              {entry.resourceType === 'task' ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTask(entry);
                                  }}
                                  className="mt-0.5 text-stone-400 hover:text-amber-500"
                                >
                                  {entry.completed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <div className="w-3 h-3 rounded border border-stone-400" />
                                  )}
                                </button>
                              ) : (
                                <CalendarIcon className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                              )}

                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (entry.noteId) onOpenNote(entry.noteId);
                                }}
                                className="min-w-0 flex-1 cursor-pointer"
                              >
                                <p className={`font-medium text-[11px] truncate ${entry.completed ? 'line-through' : ''}`}>
                                  {entry.title}
                                </p>
                                {entry.recurrence && (
                                  <span className="text-[9px] text-indigo-500 block">🔁 {entry.recurrence}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Selected Date Detail Sidebar */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-4">
              {/* Selected Day Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                    {formatFriendlyDate(selectedDateStr, todayStr)}
                  </h3>
                  <span className="text-[11px] font-mono text-stone-400 dark:text-stone-500">
                    {selectedDateStr}
                  </span>
                </div>

                {/* Open Daily Note for Day */}
                <button
                  type="button"
                  onClick={() => handleOpenOrCreateDailyNoteForDate(selectedDateStr)}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 hover:bg-amber-200 text-xs font-semibold transition-colors flex items-center gap-1"
                  title="Open or Create Daily Note for this date"
                >
                  <CalendarIcon className="w-3 h-3" />
                  <span>Daily Note</span>
                </button>
              </div>

              {/* Items List on Selected Date */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Scheduled Items ({selectedDateEntries.length})
                </div>

                {selectedDateEntries.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 dark:text-stone-500 text-xs italic">
                    No items scheduled for this date.
                  </div>
                ) : (
                  selectedDateEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 text-xs flex items-start justify-between gap-2 group transition-all ${
                        entry.completed ? 'opacity-60 bg-stone-100/50' : 'hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {entry.resourceType === 'task' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleTask(entry)}
                            className="mt-0.5 text-stone-400 hover:text-amber-500 p-0.5"
                          >
                            {entry.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded border border-stone-400 group-hover:border-amber-500" />
                            )}
                          </button>
                        ) : (
                          <CalendarIcon className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        )}

                        <div className="min-w-0 flex-1">
                          <span
                            onClick={() => entry.noteId && onOpenNote(entry.noteId)}
                            className={`font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer block truncate ${
                              entry.completed ? 'line-through text-stone-400' : ''
                            }`}
                          >
                            {entry.title}
                          </span>

                          {entry.recurrence && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">
                              🔁 {entry.recurrence}
                            </span>
                          )}

                          {entry.noteTitle && (
                            <span className="text-[10px] text-stone-400 truncate block mt-0.5">
                              in [[{entry.noteTitle}]]
                            </span>
                          )}
                        </div>
                      </div>

                      {entry.resourceType === 'task' && (
                        <button
                          type="button"
                          onClick={() => setEditingTaskEntry(entry)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-stone-400 hover:text-amber-600"
                          title="Reschedule"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Helper Legend */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-400 space-y-1">
              <p>💡 Tip: Double-click any day cell to open or generate its Daily Note.</p>
              <p>Markdown tokens: <code className="font-mono">📅 Due</code>, <code className="font-mono">⏳ Sched</code>, <code className="font-mono">🔁 Recur</code></p>
            </div>
          </div>
        </div>
      )}

      {/* Task Date Picker Modal */}
      {editingTaskEntry && (
        <TaskDatePickerModal
          isOpen={Boolean(editingTaskEntry)}
          onClose={() => setEditingTaskEntry(null)}
          taskLineText={editingTaskEntry.sourceSnippet || editingTaskEntry.title}
          onSave={handleSaveTaskDates}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <TemporalSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};
