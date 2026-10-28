import React, { useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { MonthGroup, groupNotesByMonth } from '../utils/search';
import { Note } from '../types';

interface TimelineScrubberProps {
  notes?: Note[];
  monthGroups?: MonthGroup[];
  selectedMonth: string | null;
  onSelectMonth: (monthKey: string | null) => void;
  onScrollToMonth?: (monthKey: string) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  notes,
  monthGroups: propMonthGroups,
  selectedMonth,
  onSelectMonth,
  onScrollToMonth,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    if (propMonthGroups && Array.isArray(propMonthGroups)) {
      return propMonthGroups;
    }
    if (notes && Array.isArray(notes)) {
      return groupNotesByMonth(notes);
    }
    return [];
  }, [propMonthGroups, notes]);

  if (!groups || groups.length <= 1) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full my-2 p-1.5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center gap-2">
      <div className="flex items-center gap-1.5 pl-2 text-stone-400 text-xs font-semibold uppercase tracking-wider shrink-0">
        <Clock className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden sm:inline">Timeline:</span>
      </div>

      <button
        onClick={() => scroll('left')}
        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
        title="Scroll earlier"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Month Pills Container */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
      >
        <button
          onClick={() => onSelectMonth(null)}
          className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-all ${
            selectedMonth === null
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
        >
          All Time
        </button>

        {groups.map((group) => {
          const isSelected = selectedMonth === group.key;
          return (
            <button
              key={group.key}
              onClick={() => {
                onSelectMonth(group.key);
                if (onScrollToMonth) onScrollToMonth(group.key);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <span>{group.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400'
                }`}
              >
                {group.notes?.length || 0}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => scroll('right')}
        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
        title="Scroll later"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
