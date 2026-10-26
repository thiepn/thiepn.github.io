import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, GripVertical } from 'lucide-react';
import { WorkoutTemplate, WorkoutTemplateExercise, Exercise } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  initialTemplate?: WorkoutTemplate | null;
  onSaved: () => void;
}

export const HealthTemplateModal: React.FC<HealthTemplateModalProps> = ({
  isOpen,
  onClose,
  exercises,
  initialTemplate,
  onSaved,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState<string>(initialTemplate?.name || '');
  const [type, setType] = useState<string>(initialTemplate?.type || 'Strength');
  const [notes, setNotes] = useState<string>(initialTemplate?.notes || '');
  const [items, setItems] = useState<WorkoutTemplateExercise[]>(
    initialTemplate?.exercises || [
      { exerciseId: exercises[0]?.id || 'ex-bench-press', targetSets: 3, defaultReps: 8, defaultLoad: 60 },
    ]
  );
  const [error, setError] = useState<string | null>(null);

  const handleAddExercise = () => {
    if (exercises.length === 0) return;
    setItems([
      ...items,
      {
        exerciseId: exercises[0].id,
        targetSets: 3,
        defaultReps: 8,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const next = [...items];
    next.splice(index, 1);
    setItems(next);
  };

  const handleUpdateItem = (index: number, updates: Partial<WorkoutTemplateExercise>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    setItems(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (items.length === 0) {
      setError('Add at least one exercise to the template');
      return;
    }

    if (initialTemplate) {
      healthService.updateTemplate(initialTemplate.id, {
        name: name.trim(),
        type: type.trim(),
        exercises: items,
        notes: notes.trim() || undefined,
      });
    } else {
      healthService.createTemplate({
        name: name.trim(),
        type: type.trim(),
        exercises: items,
        notes: notes.trim() || undefined,
      });
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialTemplate ? 'Edit Workout Routine' : 'New Workout Routine / Template'}
              </h2>
              <p className="text-xs text-stone-500">Preset structure for quick logging</p>
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
                Routine Name
              </label>
              <input
                type="text"
                placeholder="e.g. Upper Body Hypertrophy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="Strength, Cardio, etc."
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Description or Routine Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. Focus on progressive overload on bench press, RPE 8"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Exercises in Template */}
          <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Exercises in Routine ({items.length})
              </label>
              <button
                type="button"
                onClick={handleAddExercise}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-200 rounded-lg text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Exercise
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => {
                const exDef = exercises.find((e) => e.id === item.exerciseId);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-[11px] font-bold flex items-center justify-center text-stone-600 dark:text-stone-300 shrink-0">
                          {idx + 1}
                        </span>
                        <select
                          value={item.exerciseId}
                          onChange={(e) => handleUpdateItem(idx, { exerciseId: e.target.value })}
                          className="flex-1 text-xs p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                        >
                          {exercises.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.category})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                          Target Sets
                        </label>
                        <input
                          type="number"
                          value={item.targetSets || 3}
                          onChange={(e) => handleUpdateItem(idx, { targetSets: parseInt(e.target.value, 10) || 1 })}
                          className="w-full p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                          Target Reps
                        </label>
                        <input
                          type="number"
                          value={item.defaultReps || 8}
                          onChange={(e) => handleUpdateItem(idx, { defaultReps: parseInt(e.target.value, 10) || 0 })}
                          className="w-full p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                          Default Load ({exDef?.defaultUnit || 'kg'})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.defaultLoad || ''}
                          placeholder="e.g. 50"
                          onChange={(e) => handleUpdateItem(idx, { defaultLoad: parseFloat(e.target.value) || undefined })}
                          className="w-full p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition-colors"
            >
              {initialTemplate ? 'Save Routine' : 'Create Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
