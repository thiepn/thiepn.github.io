import React, { useState } from 'react';
import { ResourceCore } from '../core/resource/resourceCore';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from 'lucide-react';
import { toDateTimestamp } from '../core/query/filterOperators';

export interface UnifiedCalendarViewProps {
  items: ResourceCore[];
  dateField?: string;
  onSelectResource: (id: string) => void;
  onCreateResourceOnDate?: (dateStr: string) => void;
}

export const UnifiedCalendarView: React.FC<UnifiedCalendarViewProps> = ({
  items,
  dateField = 'dueDate',
  onSelectResource,
  onCreateResourceOnDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group items by YYYY-MM-DD
  const itemsByDate: Record<string, ResourceCore[]> = {};
  for (const item of items) {
    const raw = (item as any)[dateField] || item.metadata?.[dateField] || item.createdAt;
    const ts = toDateTimestamp(raw);
    if (ts !== null) {
      const d = new Date(ts);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!itemsByDate[dateKey]) itemsByDate[dateKey] = [];
      itemsByDate[dateKey].push(item);
    }
  }

  // Build month calendar grid
  const daysArray = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="border border-neutral-800 rounded-xl bg-neutral-950/70 p-4 shadow-sm">
      {/* Calendar Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CalendarIcon size={18} className="text-amber-400" />
          <h2 className="text-base font-bold text-white">
            {monthNames[month]} {year}
          </h2>
          <span className="text-xs text-neutral-400 font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
            Mapped to: {dateField}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handlePrevMonth}
            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-neutral-400 mb-1 border-b border-neutral-800 pb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[90px] bg-neutral-900/20 rounded-lg" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = isCurrentMonth && today.getDate() === day;
          const dayItems = itemsByDate[dateStr] || [];

          return (
            <div
              key={dateStr}
              className={`min-h-[95px] p-1.5 bg-neutral-900/50 border rounded-lg flex flex-col justify-between transition-colors group ${
                isToday ? 'border-amber-500/60 bg-amber-500/5' : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono font-semibold ${
                    isToday ? 'bg-amber-500 text-neutral-950 px-1.5 py-0.2 rounded-full' : 'text-neutral-400'
                  }`}
                >
                  {day}
                </span>

                {onCreateResourceOnDate && (
                  <button
                    onClick={() => onCreateResourceOnDate(dateStr)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-white p-0.5 rounded transition-opacity"
                    title={`Add resource on ${dateStr}`}
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>

              {/* Day item chips */}
              <div className="space-y-1 mt-1 overflow-y-auto max-h-[65px]">
                {dayItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectResource(item.id)}
                    className="w-full text-left truncate px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 border border-neutral-700/60 transition-colors block"
                    title={item.title}
                  >
                    {item.title || 'Untitled'}
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
