import React, { useState } from 'react';
import { X, Calendar, Plus, Trash2, Dumbbell } from 'lucide-react';
import { Workout, WorkoutExercise, WorkoutSet, Exercise } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  initialWorkout?: Workout | null;
  onSaved: () => void;
}

export const HealthWorkoutModal: React.FC<HealthWorkoutModalProps> = ({
  isOpen,
  onClose,
  exercises,
  initialWorkout,
  onSaved,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState<string>(initialWorkout?.title || 'Workout Session');
  const [date, setDate] = useState<string>(
    initialWorkout?.date || new Date().toISOString().slice(0, 10)
  );
  const [type, setType] = useState<string>(initialWorkout?.type || 'Strength');
  const [durationMinutes, setDurationMinutes] = useState<string>(
    initialWorkout?.durationMinutes ? initialWorkout.durationMinutes.toString() : '45'
  );
  const [notes, setNotes] = useState<string>(initialWorkout?.notes || '');
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(
    initialWorkout?.exercises || [
      {
        exerciseId: exercises[0]?.id || 'ex-bench-press',
        exerciseName: exercises[0]?.name || 'Bench Press',
        sets: [
          {
            id: `set-1`,
            setNumber: 1,
            reps: 8,
            load: { value: 60, unit: 'kg' },
            setType: 'working',
            isCompleted: true,
          },
        ],
      },
    ]
  );
  const [error, setError] = useState<string | null>(null);

  const handleAddExercise = () => {
    if (exercises.length === 0) return;
    const defaultEx = exercises[0];
    setWorkoutExercises([
      ...workoutExercises,
      {
        exerciseId: defaultEx.id,
        exerciseName: defaultEx.name,
        sets: [
          {
            id: `set-${Date.now()}-1`,
            setNumber: 1,
            reps: 8,
            load: { value: 50, unit: defaultEx.defaultUnit || 'kg' },
            setType: 'working',
            isCompleted: true,
          },
        ],
      },
    ]);
  };

  const handleRemoveExercise = (idx: number) => {
    const next = [...workoutExercises];
    next.splice(idx, 1);
    setWorkoutExercises(next);
  };

  const handleAddSet = (exIdx: number) => {
    const next = [...workoutExercises];
    const ex = next[exIdx];
    const prevSet = ex.sets[ex.sets.length - 1];
    const setNum = ex.sets.length + 1;
    ex.sets.push({
      id: `set-${Date.now()}-${setNum}`,
      setNumber: setNum,
      reps: prevSet?.reps || 8,
      load: prevSet?.load ? { ...prevSet.load } : { value: 50, unit: 'kg' },
      setType: 'working',
      isCompleted: true,
    });
    setWorkoutExercises(next);
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    const next = [...workoutExercises];
    next[exIdx].sets.splice(setIdx, 1);
    // renumber
    next[exIdx].sets.forEach((s, i) => (s.setNumber = i + 1));
    setWorkoutExercises(next);
  };

  const handleUpdateSet = (exIdx: number, setIdx: number, updates: Partial<WorkoutSet>) => {
    const next = [...workoutExercises];
    next[exIdx].sets[setIdx] = { ...next[exIdx].sets[setIdx], ...updates };
    setWorkoutExercises(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Workout title is required');
      return;
    }

    const dur = parseInt(durationMinutes, 10);

    if (initialWorkout) {
      healthService.updateWorkout(initialWorkout.id, {
        title: title.trim(),
        date,
        type: type.trim(),
        durationMinutes: !isNaN(dur) ? dur : undefined,
        notes: notes.trim() || undefined,
        exercises: workoutExercises,
      });
    } else {
      healthService.createWorkout({
        title: title.trim(),
        date,
        type: type.trim(),
        durationMinutes: !isNaN(dur) ? dur : undefined,
        notes: notes.trim() || undefined,
        exercises: workoutExercises,
        source: 'manual',
      });
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialWorkout ? 'Edit Workout' : 'Log Workout Session'}
              </h2>
              <p className="text-xs text-stone-500">Record exercises, completed sets, and volume</p>
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
                Workout Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chest & Triceps"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Activity Type
              </label>
              <input
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Strength, Cardio, etc."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Exercises Block */}
          <div className="space-y-4 pt-3 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Exercises & Sets ({workoutExercises.length})
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

            <div className="space-y-3">
              {workoutExercises.map((we, exIdx) => (
                <div
                  key={exIdx}
                  className="p-3.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={we.exerciseId}
                      onChange={(e) => {
                        const selectedDef = exercises.find((ex) => ex.id === e.target.value);
                        const next = [...workoutExercises];
                        next[exIdx].exerciseId = e.target.value;
                        next[exIdx].exerciseName = selectedDef?.name || 'Exercise';
                        setWorkoutExercises(next);
                      }}
                      className="text-xs font-bold p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex-1"
                    >
                      {exercises.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(exIdx)}
                      className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Sets Table */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-stone-400 px-1">
                      <span className="col-span-1">Set</span>
                      <span className="col-span-4">Weight (kg/lb)</span>
                      <span className="col-span-3">Reps</span>
                      <span className="col-span-2">RPE</span>
                      <span className="col-span-2 text-right">Action</span>
                    </div>

                    {we.sets.map((s, sIdx) => (
                      <div key={s.id || sIdx} className="grid grid-cols-12 gap-1.5 items-center">
                        <span className="col-span-1 text-xs font-bold text-stone-500 text-center">
                          {s.setNumber}
                        </span>
                        <div className="col-span-4 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            placeholder="0"
                            value={s.load?.value ?? ''}
                            onChange={(e) =>
                              handleUpdateSet(exIdx, sIdx, {
                                load: {
                                  value: parseFloat(e.target.value) || 0,
                                  unit: s.load?.unit || 'kg',
                                },
                              })
                            }
                            className="w-full text-xs p-1 rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                          <select
                            value={s.load?.unit || 'kg'}
                            onChange={(e) =>
                              handleUpdateSet(exIdx, sIdx, {
                                load: {
                                  value: s.load?.value || 0,
                                  unit: e.target.value,
                                },
                              })
                            }
                            className="text-[10px] p-1 rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                          >
                            <option value="kg">kg</option>
                            <option value="lb">lb</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            placeholder="Reps"
                            value={s.reps ?? ''}
                            onChange={(e) =>
                              handleUpdateSet(exIdx, sIdx, {
                                reps: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-full text-xs p-1 rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.5"
                            placeholder="RPE"
                            value={s.rpe ?? ''}
                            onChange={(e) =>
                              handleUpdateSet(exIdx, sIdx, {
                                rpe: parseFloat(e.target.value) || undefined,
                              })
                            }
                            className="w-full text-xs p-1 rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exIdx, sIdx)}
                            className="p-1 text-stone-400 hover:text-rose-500 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleAddSet(exIdx)}
                      className="mt-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Set
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Session Notes
            </label>
            <input
              type="text"
              placeholder="Felt strong on bench, took longer rests..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
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
              {initialWorkout ? 'Save Workout' : 'Log Workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
