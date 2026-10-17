import React, { useState } from 'react';
import { Calendar, Clock, Repeat, X, Check, Trash2 } from 'lucide-react';
import { getTodayDateString, addDays, addWeeks, addMonths, formatFriendlyDate } from '../dateUtils';
import { parseTaskTemporalMetadata } from '../taskTemporalParser';

export interface TaskDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskLineText: string;
  onSave: (updates: {
    dueDate?: string | null;
    scheduledDate?: string | null;
    recurrence?: string | null;
    reminderTime?: string | null;
  }) => void;
}

export const TaskDatePickerModal: React.FC<TaskDatePickerModalProps> = ({
  isOpen,
  onClose,
  taskLineText,
  onSave,
}) => {
  if (!isOpen) return null;

  const parsed = parseTaskTemporalMetadata(taskLineText);

  const [dueDate, setDueDate] = useState<string>(parsed.dueDate || '');
  const [scheduledDate, setScheduledDate] = useState<string>(parsed.scheduledDate || '');
  const [recurrence, setRecurrence] = useState<string>(parsed.recurrence || '');
  const [customRecurrence, setCustomRecurrence] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>(parsed.reminderTime || '');

  const todayStr = getTodayDateString();

  const handleApply = () => {
    const finalRecurrence = recurrence === 'custom' ? customRecurrence.trim() : recurrence;

    onSave({
      dueDate: dueDate.trim() || null,
      scheduledDate: scheduledDate.trim() || null,
      recurrence: finalRecurrence || null,
      reminderTime: reminderTime.trim() || null,
    });
    onClose();
  };

  const handleClearAll = () => {
    onSave({
      dueDate: null,
      scheduledDate: null,
      recurrence: null,
      reminderTime: null,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-date-picker-title"
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-md overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60">
          <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100 text-sm">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span id="task-date-picker-title">Schedule & Recurrence</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label="Close date picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Snippet Preview */}
        <div className="p-3 bg-stone-100/60 dark:bg-stone-950/40 border-b border-stone-200/60 dark:border-stone-800/60 text-stone-600 dark:text-stone-300 font-mono text-[11px] truncate">
          {parsed.cleanText || taskLineText}
        </div>

        <div className="p-4 space-y-4">
          {/* Due Date Section */}
          <div className="space-y-2">
            <label htmlFor="task-due-date-input" className="font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
              <span>📅 Due Date</span>
              {dueDate && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                  {formatFriendlyDate(dueDate, todayStr)}
                </span>
              )}
            </label>

            <div className="flex items-center gap-2">
              <input
                id="task-due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 text-xs"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Clear Due Date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setDueDate(todayStr)}
                className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors text-[11px]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDueDate(addDays(todayStr, 1))}
                className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors text-[11px]"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setDueDate(addWeeks(todayStr, 1))}
                className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors text-[11px]"
              >
                Next Week
              </button>
              <button
                type="button"
                onClick={() => setDueDate(addMonths(todayStr, 1))}
                className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors text-[11px]"
              >
                Next Month
              </button>
            </div>
          </div>

          {/* Scheduled Date Section */}
          <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
            <label htmlFor="task-scheduled-date-input" className="font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
              <span>⏳ Scheduled Date</span>
              {scheduledDate && (
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-normal">
                  {formatFriendlyDate(scheduledDate, todayStr)}
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="task-scheduled-date-input"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 text-xs"
              />
              {scheduledDate && (
                <button
                  type="button"
                  onClick={() => setScheduledDate('')}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Clear Scheduled Date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Recurrence Section */}
          <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
            <label htmlFor="task-recurrence-select" className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-indigo-500" />
              <span>🔁 Recurrence Pattern</span>
            </label>
            <select
              id="task-recurrence-select"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 text-xs"
            >
              <option value="">No Recurrence (One-off)</option>
              <option value="every day">Every Day</option>
              <option value="every weekday">Every Weekday (Mon-Fri)</option>
              <option value="every week">Every Week</option>
              <option value="every 2 weeks">Every 2 Weeks</option>
              <option value="every month">Every Month</option>
              <option value="every year">Every Year</option>
              <option value="custom">Custom Pattern...</option>
            </select>

            {recurrence === 'custom' && (
              <input
                type="text"
                value={customRecurrence}
                onChange={(e) => setCustomRecurrence(e.target.value)}
                placeholder="e.g. every 3 weeks, every 6 months"
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs mt-1"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60">
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg transition-colors text-[11px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Dates</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
