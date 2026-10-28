import React, { useState, useEffect } from 'react';
import {
  X,
  CheckSquare,
  Calendar,
  Sparkles,
  Save,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { CheckInDefinition, CheckInField } from '../trackingTypes';
import { trackingService } from '../trackingService';
import { getTodayDateString } from '../../temporal/dateUtils';

interface CheckInModalProps {
  checkIn: CheckInDefinition;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  checkIn,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [targetDate, setTargetDate] = useState<string>(getTodayDateString());
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && checkIn) {
      setTargetDate(getTodayDateString());
      // Load saved draft or previous entry for target date
      const draft = trackingService.getCheckInDraft(checkIn.id);
      const existingEntries = trackingService.getCheckInEntries(checkIn.id);
      const todayEntry = existingEntries.find((e) => e.date === getTodayDateString());

      if (todayEntry) {
        setFormValues(todayEntry.values || {});
        setNotes(todayEntry.notes || '');
      } else if (Object.keys(draft).length > 0) {
        setFormValues(draft);
      } else {
        // Initialize default empty values
        const initial: Record<string, any> = {};
        checkIn.fields.forEach((f) => {
          if (f.type === 'rating') initial[f.id] = 3;
          else if (f.type === 'boolean') initial[f.id] = false;
          else initial[f.id] = '';
        });
        setFormValues(initial);
      }
    }
  }, [isOpen, checkIn]);

  // Handle draft autosave on changes
  const handleFieldChange = (fieldId: string, val: any) => {
    const updated = { ...formValues, [fieldId]: val };
    setFormValues(updated);
    trackingService.saveCheckInDraft(checkIn.id, updated);
  };

  if (!isOpen || !checkIn) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate required fields
    for (const field of checkIn.fields) {
      if (field.required) {
        const val = formValues[field.id];
        if (val === undefined || val === null || val === '') {
          setErrorMsg(`Please complete the required field: "${field.label}"`);
          return;
        }
      }
    }

    trackingService.submitCheckInEntry(checkIn.id, formValues, targetDate, notes);
    if (onSubmitted) onSubmitted();
    onClose();
  };

  const sortedFields = [...checkIn.fields].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {checkIn.name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {checkIn.description || 'Structured deliberate check-in reflection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selector & Draft Indicator */}
        <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-medium">Check-In Date:</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
            Draft autosaved
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {sortedFields.map((field) => {
            const val = formValues[field.id];

            return (
              <div
                key={field.id}
                className="p-3.5 rounded-lg bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-2"
              >
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {field.label}
                    {field.required && <span className="text-rose-500 ml-1">*</span>}
                  </label>
                  {field.unit && (
                    <span className="text-[10px] text-zinc-400 font-mono">({field.unit})</span>
                  )}
                </div>

                {field.description && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {field.description}
                  </p>
                )}

                {/* Field Controls */}
                {field.type === 'rating' && (
                  <div className="flex items-center gap-2 pt-1">
                    {(field.ratingScale === '1-10' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5]).map(
                      (num) => {
                        const isSelected = val === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleFieldChange(field.id, num)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}

                {field.type === 'boolean' && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={!!val}
                      onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
                    />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Yes / Confirmed
                    </span>
                  </label>
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={val !== undefined ? val : ''}
                    min={field.min}
                    max={field.max}
                    onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || 0)}
                    placeholder={field.placeholder || 'Enter numeric value...'}
                    className="w-full text-xs px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}

                {field.type === 'text' && (
                  <input
                    type="text"
                    value={val || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || 'Enter short answer...'}
                    className="w-full text-xs px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}

                {field.type === 'long_text' && (
                  <textarea
                    rows={3}
                    value={val || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || 'Reflect in detail...'}
                    className="w-full text-xs px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={val || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select an option...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}

          <div className="pt-2">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              General Reflection / Addendum Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context for this check-in..."
              className="w-full text-xs px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 -mx-5 -mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Submit Check-In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
