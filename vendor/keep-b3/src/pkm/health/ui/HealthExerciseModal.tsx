import React, { useState } from 'react';
import { X, Dumbbell, Plus } from 'lucide-react';
import { Exercise, ExerciseCategory, ExerciseMode } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialExercise?: Exercise | null;
  onSaved: () => void;
}

export const HealthExerciseModal: React.FC<HealthExerciseModalProps> = ({
  isOpen,
  onClose,
  initialExercise,
  onSaved,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState<string>(initialExercise?.name || '');
  const [category, setCategory] = useState<ExerciseCategory>(initialExercise?.category || 'strength');
  const [mode, setMode] = useState<ExerciseMode>(initialExercise?.mode || 'reps_and_load');
  const [defaultUnit, setDefaultUnit] = useState<string>(initialExercise?.defaultUnit || 'kg');
  const [aliases, setAliases] = useState<string>(initialExercise?.aliases?.join(', ') || '');
  const [targetMuscles, setTargetMuscles] = useState<string>(initialExercise?.targetMuscles?.join(', ') || '');
  const [notes, setNotes] = useState<string>(initialExercise?.notes || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Exercise name is required');
      return;
    }

    const aliasList = aliases
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    const muscleList = targetMuscles
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    if (initialExercise) {
      healthService.updateExercise(initialExercise.id, {
        name: name.trim(),
        category,
        mode,
        defaultUnit: defaultUnit.trim() || undefined,
        aliases: aliasList,
        targetMuscles: muscleList,
        notes: notes.trim() || undefined,
      });
    } else {
      healthService.createExercise({
        name: name.trim(),
        category,
        mode,
        defaultUnit: defaultUnit.trim() || undefined,
        aliases: aliasList,
        targetMuscles: muscleList,
        notes: notes.trim() || undefined,
      });
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialExercise ? 'Edit Exercise' : 'New Exercise Definition'}
              </h2>
              <p className="text-xs text-stone-500">Reusable movement definition</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-xs text-rose-600">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Exercise Name
            </label>
            <input
              type="text"
              placeholder="e.g. Incline Dumbbell Press"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="strength">Strength</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="cardio">Cardio</option>
                <option value="mobility">Mobility</option>
                <option value="sport">Sport</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Tracking Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ExerciseMode)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="reps_and_load">Reps & Load</option>
                <option value="reps_only">Reps Only</option>
                <option value="distance_and_duration">Distance & Duration</option>
                <option value="duration">Duration Only</option>
                <option value="distance_only">Distance Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Default Load/Distance Unit
              </label>
              <input
                type="text"
                placeholder="kg, lb, km, mi"
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Target Muscles (comma-sep)
              </label>
              <input
                type="text"
                placeholder="Chest, Triceps"
                value={targetMuscles}
                onChange={(e) => setTargetMuscles(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Aliases (comma-separated for search)
            </label>
            <input
              type="text"
              placeholder="Incline DB Press, DB Incline"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Notes or Cue
            </label>
            <textarea
              rows={2}
              placeholder="Form notes, machine settings, warmup cue..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
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
              {initialExercise ? 'Save Exercise' : 'Create Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
