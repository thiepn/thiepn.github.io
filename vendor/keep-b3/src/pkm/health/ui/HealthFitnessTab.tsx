import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Play,
  Plus,
  Layers,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Timer,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Workout,
  ActiveWorkoutState,
  Exercise,
  WorkoutTemplate,
  PersonalRecord,
  EstimatedOneRepMax,
  WorkoutSet,
} from '../healthTypes';
import { calculateWorkoutVolume } from '../healthCalculations';
import { healthService } from '../healthService';

interface HealthFitnessTabProps {
  workouts: Workout[];
  activeWorkout: ActiveWorkoutState | null;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  personalRecords: PersonalRecord[];
  estimated1RMs: EstimatedOneRepMax[];
  onOpenWorkoutModal: (initialWorkout?: Workout) => void;
  onOpenExerciseModal: (initialExercise?: Exercise) => void;
  onOpenTemplateModal: (initialTemplate?: WorkoutTemplate) => void;
  onRefresh: () => void;
}

export const HealthFitnessTab: React.FC<HealthFitnessTabProps> = ({
  workouts,
  activeWorkout,
  exercises,
  templates,
  personalRecords,
  estimated1RMs,
  onOpenWorkoutModal,
  onOpenExerciseModal,
  onOpenTemplateModal,
  onRefresh,
}) => {
  const [subView, setSubView] = useState<'workouts' | 'active' | 'exercises' | 'templates' | 'prs'>(
    activeWorkout ? 'active' : 'workouts'
  );
  const [oneRmFormula, setOneRmFormula] = useState<'Epley' | 'Brzycki'>('Epley');
  const [restRemaining, setRestRemaining] = useState<number>(0);
  const [isResting, setIsResting] = useState<boolean>(false);

  // Active workout rest timer hook
  useEffect(() => {
    let interval: any = null;
    if (isResting && restRemaining > 0) {
      interval = setInterval(() => {
        setRestRemaining((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restRemaining]);

  const handleStartRestTimer = (seconds: number = 90) => {
    setRestRemaining(seconds);
    setIsResting(true);
  };

  const handleStartNewWorkout = (templateId?: string) => {
    healthService.startWorkout(templateId);
    setSubView('active');
    onRefresh();
  };

  const handleToggleSetCompleted = (exIdx: number, setIdx: number) => {
    if (!activeWorkout) return;
    const next = { ...activeWorkout };
    const targetSet = next.workout.exercises[exIdx].sets[setIdx];
    targetSet.isCompleted = !targetSet.isCompleted;

    if (targetSet.isCompleted) {
      // Trigger rest timer
      handleStartRestTimer(90);
    }

    healthService.updateActiveWorkout(next);
    onRefresh();
  };

  const handleDuplicateSet = (exIdx: number, setIdx: number) => {
    if (!activeWorkout) return;
    const ex = activeWorkout.workout.exercises[exIdx];
    const source = ex.sets[setIdx];
    healthService.addSetToActiveWorkout(exIdx, {
      reps: source.reps,
      load: source.load ? { ...source.load } : undefined,
      setType: source.setType,
    });
    onRefresh();
  };

  const handleFinishActiveWorkout = () => {
    if (confirm('Complete and record this workout session?')) {
      healthService.completeActiveWorkout();
      setSubView('workouts');
      onRefresh();
    }
  };

  const handleAbandonActiveWorkout = () => {
    if (confirm('Discard active workout session? Unsaved active progress will be deleted.')) {
      healthService.abandonActiveWorkout();
      setSubView('workouts');
      onRefresh();
    }
  };

  const handleDeleteWorkout = (id: string) => {
    if (confirm('Delete this workout record?')) {
      healthService.deleteWorkout(id);
      onRefresh();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Sub-nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-amber-500" />
            Training, Workouts & Records
          </h2>
          <p className="text-xs text-stone-500">
            Resilient logger, movement definitions, and factual PR tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeWorkout && (
            <button
              type="button"
              onClick={() => setSubView('active')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-stone-950 text-xs font-bold rounded-xl shadow-xs animate-pulse"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Active Session
            </button>
          )}

          <button
            type="button"
            onClick={() => handleStartNewWorkout()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold rounded-xl shadow-xs hover:opacity-90 transition-opacity"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Empty Workout
          </button>
        </div>
      </div>

      {/* Sub-View Navigation Bar */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
        <button
          type="button"
          onClick={() => setSubView('workouts')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
            subView === 'workouts'
              ? 'bg-amber-500 text-stone-950'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          History ({workouts.length})
        </button>

        {activeWorkout && (
          <button
            type="button"
            onClick={() => setSubView('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              subView === 'active'
                ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-400'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Active Session
          </button>
        )}

        <button
          type="button"
          onClick={() => setSubView('templates')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
            subView === 'templates'
              ? 'bg-amber-500 text-stone-950'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Routines ({templates.length})
        </button>

        <button
          type="button"
          onClick={() => setSubView('exercises')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
            subView === 'exercises'
              ? 'bg-amber-500 text-stone-950'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Exercises ({exercises.length})
        </button>

        <button
          type="button"
          onClick={() => setSubView('prs')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
            subView === 'prs'
              ? 'bg-amber-500 text-stone-950'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Personal Records & 1RM
        </button>
      </div>

      {/* 1. WORKOUTS LOG SUB-VIEW */}
      {subView === 'workouts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">
              Completed Workout Logs ({workouts.length})
            </span>
            <button
              type="button"
              onClick={() => onOpenWorkoutModal()}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Manually Add Past Workout
            </button>
          </div>

          {workouts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-400 space-y-3">
              <Dumbbell className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-700" />
              <p>No workouts recorded yet. Start a session or log a routine.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.map((w) => {
                const vol = calculateWorkoutVolume(w);
                return (
                  <div
                    key={w.id}
                    className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                          <Dumbbell className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {w.title || 'Workout Session'}
                          </h3>
                          <div className="text-[11px] text-stone-500 flex items-center gap-2">
                            <span>{w.date}</span>
                            {w.durationMinutes && <span>• {w.durationMinutes} min</span>}
                            <span>• {w.type || 'Strength'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right pr-2">
                          <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            {vol.totalVolume} {vol.unit}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {vol.totalSets} sets • {vol.totalReps} reps
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenWorkoutModal(w)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWorkout(w.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Exercise sets summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs pt-1">
                      {w.exercises.map((ex, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800"
                        >
                          <span className="font-bold text-stone-800 dark:text-stone-200 block truncate">
                            {ex.exerciseName}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            {ex.sets.length} sets: {ex.sets.map((s) => `${s.reps || 0}@${s.load?.value || 0}${s.load?.unit || 'kg'}`).slice(0, 3).join(', ')}
                            {ex.sets.length > 3 ? '...' : ''}
                          </span>
                        </div>
                      ))}
                    </div>

                    {w.notes && (
                      <p className="text-xs text-stone-500 italic bg-stone-50 dark:bg-stone-800/30 p-2 rounded-lg">
                        "{w.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. ACTIVE WORKOUT LOGGER SUB-VIEW */}
      {subView === 'active' && activeWorkout && (
        <div className="space-y-4">
          {/* Active Banner & Gym-friendly controls */}
          <div className="p-5 bg-stone-900 text-white rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 block">
                  In Progress Session • Autosaving Locally
                </span>
                <h3 className="text-xl font-black text-white">{activeWorkout.workout.title}</h3>
              </div>

              {/* Rest Timer */}
              <div className="flex items-center gap-3 bg-stone-800/80 p-2.5 px-4 rounded-xl border border-stone-700">
                <Timer className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-[10px] text-stone-400 uppercase font-bold">Rest Timer</div>
                  <div className="text-lg font-black font-mono text-white">
                    {restRemaining > 0 ? `${Math.floor(restRemaining / 60)}:${(restRemaining % 60).toString().padStart(2, '0')}` : '00:00'}
                  </div>
                </div>
                <div className="flex gap-1 pl-2">
                  <button
                    type="button"
                    onClick={() => handleStartRestTimer(60)}
                    className="px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-[11px] font-bold"
                  >
                    60s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartRestTimer(90)}
                    className="px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-[11px] font-bold"
                  >
                    90s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartRestTimer(120)}
                    className="px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-[11px] font-bold"
                  >
                    120s
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAbandonActiveWorkout}
                  className="px-3 py-2 bg-stone-800 hover:bg-rose-950 text-rose-400 text-xs font-bold rounded-xl transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleFinishActiveWorkout}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-stone-950 text-xs font-black rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  Finish Workout
                </button>
              </div>
            </div>
          </div>

          {/* Active Exercises List */}
          <div className="space-y-4">
            {activeWorkout.workout.exercises.map((ex, exIdx) => (
              <div
                key={exIdx}
                className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-center font-black">
                      {exIdx + 1}
                    </span>
                    {ex.exerciseName}
                  </h4>

                  <button
                    type="button"
                    onClick={() => {
                      healthService.addSetToActiveWorkout(exIdx);
                      onRefresh();
                    }}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Set
                  </button>
                </div>

                {/* Sets Table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-stone-400 px-2 uppercase">
                    <span className="col-span-1">Set</span>
                    <span className="col-span-4">Weight (kg/lb)</span>
                    <span className="col-span-3">Reps</span>
                    <span className="col-span-2">RPE</span>
                    <span className="col-span-2 text-right">Done</span>
                  </div>

                  {ex.sets.map((s, sIdx) => (
                    <div
                      key={s.id || sIdx}
                      className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition-colors ${
                        s.isCompleted
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40'
                          : 'bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <span className="col-span-1 text-xs font-black text-stone-500 text-center">
                        {s.setNumber}
                      </span>

                      <div className="col-span-4 flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          value={s.load?.value ?? ''}
                          onChange={(e) => {
                            s.load = {
                              value: parseFloat(e.target.value) || 0,
                              unit: s.load?.unit || 'kg',
                            };
                            healthService.updateActiveWorkout(activeWorkout);
                            onRefresh();
                          }}
                          className="w-full text-sm font-bold p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                        <span className="text-[11px] font-bold text-stone-500">{s.load?.unit || 'kg'}</span>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          value={s.reps ?? ''}
                          onChange={(e) => {
                            s.reps = parseInt(e.target.value, 10) || 0;
                            healthService.updateActiveWorkout(activeWorkout);
                            onRefresh();
                          }}
                          className="w-full text-sm font-bold p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="RPE"
                          value={s.rpe ?? ''}
                          onChange={(e) => {
                            s.rpe = parseFloat(e.target.value) || undefined;
                            healthService.updateActiveWorkout(activeWorkout);
                            onRefresh();
                          }}
                          className="w-full text-xs p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicateSet(exIdx, sIdx)}
                          title="Duplicate set values"
                          className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSetCompleted(exIdx, sIdx)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold transition-transform active:scale-90 ${
                            s.isCompleted
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-500 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add Exercise to Active Session */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  const defaultEx = exercises[0];
                  if (!defaultEx) return;
                  activeWorkout.workout.exercises.push({
                    exerciseId: defaultEx.id,
                    exerciseName: defaultEx.name,
                    sets: [
                      {
                        id: `set-${Date.now()}-1`,
                        setNumber: 1,
                        reps: 8,
                        load: { value: 50, unit: 'kg' },
                        isCompleted: false,
                      },
                    ],
                  });
                  healthService.updateActiveWorkout(activeWorkout);
                  onRefresh();
                }}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Exercise to Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ROUTINES & TEMPLATES SUB-VIEW */}
      {subView === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">
              Preset Workout Routines ({templates.length})
            </span>
            <button
              type="button"
              onClick={() => onOpenTemplateModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Routine Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      {t.type || 'Strength'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenTemplateModal(t)}
                        className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{t.name}</h3>
                  {t.notes && <p className="text-xs text-stone-500">{t.notes}</p>}

                  <div className="pt-2 space-y-1">
                    {t.exercises.map((te, idx) => {
                      const exDef = exercises.find((e) => e.id === te.exerciseId);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400"
                        >
                          <span>• {exDef?.name || 'Exercise'}</span>
                          <span className="font-mono text-[11px] text-stone-400">
                            {te.targetSets} sets × {te.defaultReps || 'reps'}{' '}
                            {te.defaultLoad ? `@ ${te.defaultLoad}kg` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleStartNewWorkout(t.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Start Session with this Routine
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. EXERCISE LIBRARY SUB-VIEW */}
      {subView === 'exercises' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">
              Exercise & Movement Definitions ({exercises.length})
            </span>
            <button
              type="button"
              onClick={() => onOpenExerciseModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Exercise
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-2 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                    {ex.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenExerciseModal(ex)}
                    className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">{ex.name}</h4>

                {ex.targetMuscles && ex.targetMuscles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ex.targetMuscles.map((m, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {ex.notes && <p className="text-xs text-stone-400 italic">"{ex.notes}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. PERSONAL RECORDS & ESTIMATED 1RM SUB-VIEW */}
      {subView === 'prs' && (
        <div className="space-y-6">
          {/* Actual Personal Records */}
          <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Actual Personal Records (Derived from Workouts)
              </h3>
              <span className="text-xs text-stone-400">{personalRecords.length} records</span>
            </div>

            {personalRecords.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">
                No personal records derived yet. Complete workouts with completed sets to establish PRs.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {personalRecords.map((pr) => (
                  <div
                    key={pr.id}
                    className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      {pr.type === 'max_load'
                        ? 'Max Load'
                        : pr.type === 'max_volume'
                        ? 'Session Volume'
                        : 'Longest Distance'}
                    </div>
                    <div className="text-base font-black text-stone-900 dark:text-stone-100">
                      {pr.value} {pr.unit}{' '}
                      {pr.reps && <span className="text-xs font-normal text-stone-500">× {pr.reps} reps</span>}
                    </div>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                      {pr.exerciseName}
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono">Achieved: {pr.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estimated 1RM (Clearly Labeled as Formula-Derived) */}
          <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Estimated One-Rep Max (1RM)
                </h3>
                <p className="text-xs text-stone-500">
                  Mathematical formula projection based on submaximal completed sets
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOneRmFormula('Epley')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    oneRmFormula === 'Epley'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-500'
                  }`}
                >
                  Epley Formula
                </button>
                <button
                  type="button"
                  onClick={() => setOneRmFormula('Brzycki')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    oneRmFormula === 'Brzycki'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-500'
                  }`}
                >
                  Brzycki Formula
                </button>
              </div>
            </div>

            {estimated1RMs.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">
                No estimated 1RM calculations available. Log completed strength sets between 1 and 15 reps.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {estimated1RMs.map((est) => (
                  <div
                    key={est.exerciseId}
                    className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                        Est. 1RM ({est.formula})
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">{est.basedOnSet.date}</span>
                    </div>

                    <div className="text-xl font-black text-stone-900 dark:text-stone-100">
                      {est.estimated1RM} <span className="text-xs font-normal text-stone-500">{est.unit}</span>
                    </div>

                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                      {est.exerciseName}
                    </div>

                    <div className="text-[10px] text-stone-500">
                      Calculated from set: {est.basedOnSet.load} {est.unit} × {est.basedOnSet.reps} reps
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
