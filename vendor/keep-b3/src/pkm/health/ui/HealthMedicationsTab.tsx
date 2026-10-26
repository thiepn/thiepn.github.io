import React, { useState } from 'react';
import {
  Pill,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  Pause,
  Play,
  Calendar,
} from 'lucide-react';
import { MedicationRecord } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthMedicationsTabProps {
  medications: MedicationRecord[];
  onOpenModal: (initialMedication?: MedicationRecord) => void;
  onRefresh: () => void;
}

export const HealthMedicationsTab: React.FC<HealthMedicationsTabProps> = ({
  medications,
  onOpenModal,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'stopped'>('all');

  const filtered = medications.filter((m) => (filter === 'all' ? true : m.status === filter));

  const handleDelete = (id: string) => {
    if (confirm('Delete this medication record?')) {
      healthService.deleteMedication(id);
      onRefresh();
    }
  };

  const handleToggleStatus = (med: MedicationRecord) => {
    const nextStatus = med.status === 'active' ? 'paused' : 'active';
    healthService.saveMedication({ ...med, status: nextStatus });
    onRefresh();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Pill className="w-5 h-5 text-violet-500" />
            Medications & Supplements
          </h2>
          <p className="text-xs text-stone-500">
            Dosage schedules, active regimens, and prescription logs
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Medication / Supplement
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        {(['all', 'active', 'paused', 'stopped'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-colors ${
              filter === f
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            {f} ({medications.filter((m) => (f === 'all' ? true : m.status === f)).length})
          </button>
        ))}
      </div>

      {/* Medication List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-400 space-y-3">
          <Pill className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-700" />
          <p>No medications recorded in this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((med) => (
            <div
              key={med.id}
              className={`p-5 bg-white dark:bg-stone-900 border rounded-2xl space-y-3 transition-colors ${
                med.status === 'active'
                  ? 'border-violet-200 dark:border-violet-900/40 shadow-xs'
                  : 'border-stone-200 dark:border-stone-800 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      med.type === 'medication'
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {med.type}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      med.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : med.status === 'paused'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                    }`}
                  >
                    {med.status}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(med)}
                    title={med.status === 'active' ? 'Pause regimen' : 'Resume regimen'}
                    className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    {med.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenModal(med)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(med.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{med.name}</h3>
                {med.doseText && (
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                    {med.doseText} • {med.frequency || 'As directed'}
                  </p>
                )}
              </div>

              {med.scheduleTimes && med.scheduleTimes.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Times: {med.scheduleTimes.join(', ')}</span>
                </div>
              )}

              {med.instructions && (
                <p className="text-xs text-stone-500 italic bg-stone-50 dark:bg-stone-800/40 p-2 rounded-xl">
                  {med.instructions}
                </p>
              )}

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                <span>Started: {med.startedDate || '—'}</span>
                {med.prescribingDoctor && <span>Dr. {med.prescribingDoctor}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
