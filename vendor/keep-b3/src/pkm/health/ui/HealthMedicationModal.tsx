import React, { useState } from 'react';
import { X, Pill, Plus, Trash2, Bell } from 'lucide-react';
import { MedicationRecord } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMedication?: MedicationRecord | null;
  onSaved: () => void;
}

export const HealthMedicationModal: React.FC<HealthMedicationModalProps> = ({
  isOpen,
  onClose,
  initialMedication,
  onSaved,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState<string>(initialMedication?.name || '');
  const [type, setType] = useState<'medication' | 'supplement' | 'other'>(
    initialMedication?.type || 'medication'
  );
  const [doseText, setDoseText] = useState<string>(initialMedication?.doseText || '500 mg');
  const [frequency, setFrequency] = useState<string>(
    initialMedication?.frequency || 'Once daily in the morning'
  );
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(
    initialMedication?.scheduleTimes || ['08:00']
  );
  const [instructions, setInstructions] = useState<string>(
    initialMedication?.instructions || 'Take with food and a full glass of water'
  );
  const [prescribingDoctor, setPrescribingDoctor] = useState<string>(
    initialMedication?.prescribingDoctor || ''
  );
  const [startedDate, setStartedDate] = useState<string>(
    initialMedication?.startedDate || new Date().toISOString().slice(0, 10)
  );
  const [endedDate, setEndedDate] = useState<string>(initialMedication?.endedDate || '');
  const [status, setStatus] = useState<'active' | 'paused' | 'stopped'>(
    initialMedication?.status || 'active'
  );
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(
    initialMedication?.reminderEnabled ?? true
  );
  const [notes, setNotes] = useState<string>(initialMedication?.notes || '');
  const [error, setError] = useState<string | null>(null);

  const handleAddTime = () => {
    setScheduleTimes([...scheduleTimes, '12:00']);
  };

  const handleRemoveTime = (idx: number) => {
    const next = [...scheduleTimes];
    next.splice(idx, 1);
    setScheduleTimes(next);
  };

  const handleUpdateTime = (idx: number, val: string) => {
    const next = [...scheduleTimes];
    next[idx] = val;
    setScheduleTimes(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (initialMedication) {
      healthService.saveMedication({
        id: initialMedication.id,
        name: name.trim(),
        type,
        doseText: doseText.trim() || undefined,
        frequency: frequency.trim() || undefined,
        scheduleTimes,
        instructions: instructions.trim() || undefined,
        prescribingDoctor: prescribingDoctor.trim() || undefined,
        startedDate: startedDate || undefined,
        endedDate: endedDate || undefined,
        status,
        reminderEnabled,
        notes: notes.trim() || undefined,
      });
    } else {
      healthService.saveMedication({
        name: name.trim(),
        type,
        doseText: doseText.trim() || undefined,
        frequency: frequency.trim() || undefined,
        scheduleTimes,
        instructions: instructions.trim() || undefined,
        prescribingDoctor: prescribingDoctor.trim() || undefined,
        startedDate: startedDate || undefined,
        endedDate: endedDate || undefined,
        status,
        reminderEnabled,
        notes: notes.trim() || undefined,
      });
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialMedication ? 'Edit Medication / Supplement' : 'Add Medication / Supplement'}
              </h2>
              <p className="text-xs text-stone-500">Record dosage, frequency, and schedule</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-xs text-rose-600">{error}</div>}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Magnesium Glycinate, Amoxicillin"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-violet-500 focus:outline-none font-medium"
              >
                <option value="medication">Medication</option>
                <option value="supplement">Supplement</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Dosage
              </label>
              <input
                type="text"
                value={doseText}
                onChange={(e) => setDoseText(e.target.value)}
                placeholder="e.g. 200 mg, 1 capsule"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-violet-500 focus:outline-none font-medium"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="stopped">Stopped / Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Frequency
            </label>
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="e.g. Daily at bedtime, twice daily with meals"
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          {/* Schedule Times */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Scheduled Times
              </label>
              <button
                type="button"
                onClick={handleAddTime}
                className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Time
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {scheduleTimes.map((time, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700"
                >
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => handleUpdateTime(idx, e.target.value)}
                    className="text-xs p-1 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTime(idx)}
                    className="p-1 text-stone-400 hover:text-rose-500 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Started Date
              </label>
              <input
                type="date"
                value={startedDate}
                onChange={(e) => setStartedDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Prescribing Doctor (optional)
              </label>
              <input
                type="text"
                value={prescribingDoctor}
                onChange={(e) => setPrescribingDoctor(e.target.value)}
                placeholder="Dr. Smith"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Instructions & Warnings
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Do not take with dairy; store in cool dry place"
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="rounded border-stone-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="font-medium">Show in daily overview schedule & reminders</span>
            </label>
          </div>

          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition-colors"
            >
              {initialMedication ? 'Save Medication' : 'Add Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
