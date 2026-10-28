import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Calendar,
  Sparkles,
  ChevronRight,
  FileText,
  Clock,
  Info,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { Note } from '../types';
import {
  generate52WeekActivity,
  ActivityMode,
  DayActivity,
  HeatmapWeek,
} from '../utils/activityHeatmap';
import { formatShortDate } from '../utils/date';
import { NOTE_COLORS } from '../utils/colors';

interface WritingActivityHeatmapProps {
  notes: Note[];
  onOpenNote?: (note: Note) => void;
  onFilterDate?: (dateKey: string) => void;
  variant?: 'compact' | 'full';
  showStats?: boolean;
  className?: string;
}

export const WritingActivityHeatmap: React.FC<WritingActivityHeatmapProps> = ({
  notes,
  onOpenNote,
  onFilterDate,
  variant = 'full',
  showStats = true,
  className = '',
}) => {
  const [mode, setMode] = useState<ActivityMode>('all');
  const [hoveredDay, setHoveredDay] = useState<{
    day: DayActivity;
    rect: DOMRect;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const { weeks, stats } = useMemo(() => {
    return generate52WeekActivity(notes, mode);
  }, [notes, mode]);

  // Color mapping based on level
  const getCellClasses = (day: DayActivity) => {
    if (day.isFuture) {
      return 'bg-stone-50/50 dark:bg-stone-900/30 border border-transparent cursor-not-allowed opacity-40';
    }

    const isSelected = selectedDay?.dateKey === day.dateKey;
    const base = 'transition-all duration-150 cursor-pointer';

    switch (day.level) {
      case 1:
        return `${base} bg-amber-100 dark:bg-amber-950/80 border border-amber-300/70 dark:border-amber-800/80 hover:scale-125 hover:z-20 ${
          isSelected ? 'ring-2 ring-amber-500 scale-110 z-10' : ''
        }`;
      case 2:
        return `${base} bg-amber-300 dark:bg-amber-700/90 border border-amber-400 dark:border-amber-600 hover:scale-125 hover:z-20 ${
          isSelected ? 'ring-2 ring-amber-500 scale-110 z-10' : ''
        }`;
      case 3:
        return `${base} bg-amber-500 dark:bg-amber-500 border border-amber-600 dark:border-amber-400 hover:scale-125 hover:z-20 ${
          isSelected ? 'ring-2 ring-amber-500 scale-110 z-10' : ''
        }`;
      case 4:
        return `${base} bg-amber-600 dark:bg-amber-400 border border-amber-700 dark:border-amber-300 shadow-2xs hover:scale-125 hover:z-20 ${
          isSelected ? 'ring-2 ring-amber-500 scale-110 z-10' : ''
        }`;
      case 0:
      default:
        return `${base} bg-stone-100/90 dark:bg-stone-800/60 border border-stone-200/50 dark:border-stone-700/40 hover:border-stone-400 dark:hover:border-stone-500 hover:scale-110 ${
          isSelected ? 'ring-2 ring-amber-500 scale-110 z-10' : ''
        } ${day.isToday ? 'ring-1 ring-amber-500/70' : ''}`;
    }
  };

  const handleCellClick = (day: DayActivity) => {
    if (day.isFuture) return;
    if (selectedDay?.dateKey === day.dateKey) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
      if (onFilterDate && day.count > 0) {
        onFilterDate(day.dateKey);
      }
    }
  };

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div
      ref={containerRef}
      className={`relative bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 shadow-xs overflow-hidden ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            <Calendar className="w-4 h-4 stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              Writing Activity & Heatmap
              <span className="text-[11px] font-normal text-stone-400 font-mono">
                (Past 52 Weeks)
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {stats.totalContributions} notes written & revised across {stats.totalActiveDays} active days.
            </p>
          </div>
        </div>

        {/* Activity Filter Mode (Clean segmented control) */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60 text-xs">
          {(['all', 'created', 'updated'] as ActivityMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                mode === m
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              {m === 'all' ? 'All Activity' : m === 'created' ? 'Created' : 'Edited'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Strip */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/80 dark:border-stone-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100 leading-none">
                {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
              </div>
              <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                Current Streak
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/80 dark:border-stone-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100 leading-none">
                {stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}
              </div>
              <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                Longest Streak
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/80 dark:border-stone-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100 leading-none">
                {stats.totalActiveDays}
              </div>
              <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                Active Days (365d)
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/80 dark:border-stone-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100 leading-none">
                {stats.totalContributions}
              </div>
              <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                Total Notes & Edits
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 52-Week Matrix Grid Container */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="inline-block min-w-full">
          {/* Month Labels Bar */}
          <div className="flex text-[10px] font-mono text-stone-400 dark:text-stone-500 mb-1.5 pl-6 select-none">
            {weeks.map((week, idx) => (
              <div
                key={`month-${idx}`}
                className="w-[12px] sm:w-[13px] mr-[2.5px] sm:mr-[3px] shrink-0 text-left"
              >
                {week.monthLabel || ''}
              </div>
            ))}
          </div>

          {/* Matrix Body with Day Labels */}
          <div className="flex">
            {/* Day of Week Labels (Sun to Sat) */}
            <div className="flex flex-col justify-between pr-2 text-[9px] font-mono text-stone-400 dark:text-stone-500 select-none py-0.5 w-6 shrink-0">
              {dayLabels.map((lbl, idx) => (
                <div key={`lbl-${idx}`} className="h-[12px] sm:h-[13px] flex items-center">
                  {lbl}
                </div>
              ))}
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-[2.5px] sm:gap-[3px]">
              {weeks.map((week) => (
                <div
                  key={`week-${week.weekIndex}`}
                  className="flex flex-col gap-[2.5px] sm:gap-[3px]"
                >
                  {week.days.map((day) => (
                    <button
                      key={day.dateKey}
                      type="button"
                      tabIndex={day.isFuture ? -1 : 0}
                      onClick={() => handleCellClick(day)}
                      onMouseEnter={(e) => {
                        if (!day.isFuture) {
                          setHoveredDay({
                            day,
                            rect: e.currentTarget.getBoundingClientRect(),
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      onFocus={(e) => {
                        if (!day.isFuture) {
                          setHoveredDay({
                            day,
                            rect: e.currentTarget.getBoundingClientRect(),
                          });
                        }
                      }}
                      onBlur={() => setHoveredDay(null)}
                      aria-label={`${day.dateKey}: ${day.count} notes`}
                      className={`w-[12px] sm:w-[13px] h-[12px] sm:h-[13px] rounded-[2.5px] ${getCellClasses(
                        day
                      )}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Matrix Footer Legend */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400">
            <div className="text-xs text-stone-400 dark:text-stone-500">
              {selectedDay
                ? `Selected: ${formatShortDate(selectedDay.date.toISOString())} (${selectedDay.count} active ${
                    selectedDay.count === 1 ? 'note' : 'notes'
                  })`
                : 'Click any square to inspect notes for that day.'}
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span>Less</span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-stone-100 dark:bg-stone-800 border border-stone-200/50 dark:border-stone-700/40" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-100 dark:bg-amber-950/80 border border-amber-300/70 dark:border-amber-800/80" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-300 dark:bg-amber-700/90 border border-amber-400 dark:border-amber-600" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-500 dark:bg-amber-500 border border-amber-600 dark:border-amber-400" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-600 dark:bg-amber-400 border border-amber-700 dark:border-amber-300" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDay && !selectedDay && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-lg bg-stone-900/95 dark:bg-stone-950/95 text-stone-100 backdrop-blur-md border border-stone-700/80 shadow-xl text-xs max-w-xs animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-black/10"
          style={{
            left: `${hoveredDay.rect.left + hoveredDay.rect.width / 2}px`,
            top: `${hoveredDay.rect.top - 8}px`,
          }}
        >
          <div className="font-bold flex items-center justify-between gap-3 text-[11px]">
            <span>{formatShortDate(hoveredDay.day.date.toISOString())}</span>
            <span className="text-amber-400 font-mono">
              {hoveredDay.day.count}{' '}
              {hoveredDay.day.count === 1 ? 'activity' : 'activities'}
            </span>
          </div>

          <div className="text-[10px] text-stone-400 mt-0.5">
            {hoveredDay.day.createdNotes.length} created · {hoveredDay.day.updatedNotes.length} edited
          </div>

          {hoveredDay.day.createdNotes.length > 0 && (
            <div className="mt-1 pt-1 border-t border-stone-800 text-[10px] text-stone-300 truncate max-w-[200px]">
              "{hoveredDay.day.createdNotes[0].title || 'Untitled'}"
              {hoveredDay.day.createdNotes.length > 1 && ` +${hoveredDay.day.createdNotes.length - 1} more`}
            </div>
          )}
        </div>
      )}

      {/* Selected Day Inspector Drawer */}
      {selectedDay && (
        <div className="mt-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Notes from {formatShortDate(selectedDay.date.toISOString())}
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-300/60 dark:border-amber-800">
                {selectedDay.count} {selectedDay.count === 1 ? 'note' : 'notes'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors"
              aria-label="Close day inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedDay.count === 0 ? (
            <div className="text-center py-4 text-stone-400 text-xs italic">
              No notes created or edited on this day.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {/* Combine unique notes */}
              {Array.from(
                new Map(
                  [...selectedDay.createdNotes, ...selectedDay.updatedNotes].map((n) => [n.id, n])
                ).values()
              ).map((note) => {
                const colorConf = NOTE_COLORS[note.color] || NOTE_COLORS.default;
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      if (onOpenNote) onOpenNote(note);
                    }}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer hover:shadow-xs flex items-center justify-between gap-2 ${colorConf.bgLight} ${colorConf.borderLight} ${colorConf.bgDark} ${colorConf.borderDark}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colorConf.hex }}
                        />
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {note.title || 'Untitled Note'}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                        {note.content?.slice(0, 60) || 'Checklist note'}
                      </div>
                    </div>

                    <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
