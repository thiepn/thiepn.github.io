import React from 'react';
import {
  Activity,
  Heart,
  Scale,
  Dumbbell,
  Pill,
  FlaskConical,
  Moon,
  Footprints,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  EyeOff,
  Flame,
} from 'lucide-react';
import {
  HealthProfile,
  HealthMeasurement,
  Workout,
  ActiveWorkoutState,
  MedicationRecord,
  LabReport,
  ActivitySummary,
  SleepSession,
} from '../healthTypes';
import { formatHealthValue, formatBloodPressure, convertHealthUnit } from '../healthUnits';
import { calculateBMI } from '../healthCalculations';

interface HealthOverviewTabProps {
  profile: HealthProfile;
  measurements: HealthMeasurement[];
  workouts: Workout[];
  activeWorkout: ActiveWorkoutState | null;
  medications: MedicationRecord[];
  labReports: LabReport[];
  activitySummaries: ActivitySummary[];
  sleepSessions: SleepSession[];
  onOpenQuickLog: (typeId?: string) => void;
  onStartWorkout: () => void;
  onResumeActiveWorkout: () => void;
  onOpenLabModal: () => void;
  onOpenMedicationModal: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const HealthOverviewTab: React.FC<HealthOverviewTabProps> = ({
  profile,
  measurements,
  workouts,
  activeWorkout,
  medications,
  labReports,
  activitySummaries,
  sleepSessions,
  onOpenQuickLog,
  onStartWorkout,
  onResumeActiveWorkout,
  onOpenLabModal,
  onOpenMedicationModal,
  onNavigateTab,
}) => {
  // Recent body weight
  const latestWeight = measurements.find((m) => m.typeId === 'body-weight' && !m.isExcluded);
  const weightConverted = latestWeight
    ? convertHealthUnit(latestWeight.value, latestWeight.unit, profile.preferredUnits.weight)
    : null;

  // Recent blood pressure
  const latestBP = measurements.find((m) => m.typeId === 'blood-pressure' && !m.isExcluded);

  // Recent resting heart rate
  const latestRHR = measurements.find((m) => m.typeId === 'resting-heart-rate' && !m.isExcluded);

  // Workouts this week
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyWorkouts = workouts.filter((w) => new Date(w.date).getTime() >= oneWeekAgo);

  // Active medications
  const activeMeds = medications.filter((m) => m.status === 'active');

  // Recent lab report
  const latestLab = labReports[0];

  // Today activity
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayActivity = activitySummaries.find((a) => a.date === todayStr) || activitySummaries[0];
  const latestSleep = sleepSessions[0];

  // BMI Calculation
  let bmiInfo: { bmi: number; formulaDescription: string } | null = null;
  if (latestWeight && profile.height) {
    const weightInKg = convertHealthUnit(latestWeight.value, latestWeight.unit, 'kg').value;
    const heightInCm = profile.height.unit === 'in' ? profile.height.value * 2.54 : profile.height.value;
    bmiInfo = calculateBMI(weightInKg, heightInCm);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Active Workout Resume Banner */}
      {activeWorkout && (
        <div className="p-4 bg-amber-500 text-stone-950 rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/15 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/20 text-stone-950">
                  Active Session
                </span>
                <span className="font-bold text-sm">{activeWorkout.workout.title}</span>
              </div>
              <p className="text-xs opacity-90">
                {activeWorkout.workout.exercises.length} exercises logged • Autosaved locally
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResumeActiveWorkout}
            className="px-4 py-2 bg-stone-950 text-amber-400 hover:bg-stone-900 rounded-xl text-xs font-bold transition-transform active:scale-95 shadow-md flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Resume Workout
          </button>
        </div>
      )}

      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Quick Record</h2>
            <p className="text-[11px] text-stone-500">Log body metrics or initiate session</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenQuickLog('body-weight')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-emerald-500" />
            Log Weight
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickLog('blood-pressure')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            Log Blood Pressure
          </button>
          <button
            type="button"
            onClick={onStartWorkout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Workout
          </button>
          <button
            type="button"
            onClick={onOpenLabModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5 text-cyan-500" />
            Record Labs
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weight & BMI Card */}
        <div
          onClick={() => onNavigateTab('measurements')}
          className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl hover:border-emerald-500/50 transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-500" />
              Body Weight
            </span>
            {profile.hideWeightMetrics && (
              <span className="flex items-center gap-1 text-[10px] text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                <EyeOff className="w-3 h-3" /> Hidden
              </span>
            )}
          </div>

          {profile.hideWeightMetrics ? (
            <div className="py-2 text-xs text-stone-400 italic">
              Weight metric hidden in privacy preferences
            </div>
          ) : weightConverted ? (
            <div>
              <div className="text-2xl font-black text-stone-900 dark:text-stone-100">
                {weightConverted.value}{' '}
                <span className="text-xs font-normal text-stone-500">{weightConverted.unit}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
                <span>Observed: {latestWeight?.observedAt.slice(0, 10)}</span>
                {bmiInfo && (
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    BMI: {bmiInfo.bmi}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-stone-400">No weight entries recorded</div>
          )}
        </div>

        {/* Blood Pressure Card */}
        <div
          onClick={() => onNavigateTab('measurements')}
          className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl hover:border-rose-500/50 transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Blood Pressure
            </span>
          </div>

          {latestBP?.structuredValue ? (
            <div>
              <div className="text-2xl font-black text-stone-900 dark:text-stone-100">
                {latestBP.structuredValue.systolic}/{latestBP.structuredValue.diastolic}
                <span className="text-xs font-normal text-stone-500 ml-1">mmHg</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
                <span>Observed: {latestBP.observedAt.slice(0, 10)}</span>
                {latestBP.structuredValue.pulse && (
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    {latestBP.structuredValue.pulse} bpm
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-stone-400">No blood pressure recorded</div>
          )}
        </div>

        {/* Workouts This Week Card */}
        <div
          onClick={() => onNavigateTab('fitness')}
          className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl hover:border-amber-500/50 transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-amber-500" />
              Workouts (7d)
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-stone-900 dark:text-stone-100">
              {weeklyWorkouts.length}{' '}
              <span className="text-xs font-normal text-stone-500">sessions</span>
            </div>
            <div className="text-[11px] text-stone-500 mt-1 truncate">
              {weeklyWorkouts[0] ? `Last: ${weeklyWorkouts[0].title}` : 'No workouts this week'}
            </div>
          </div>
        </div>

        {/* Active Medications / Labs Card */}
        <div
          onClick={() => onNavigateTab('medications')}
          className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl hover:border-violet-500/50 transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-violet-500" />
              Active Regimen
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-stone-900 dark:text-stone-100">
              {activeMeds.length}{' '}
              <span className="text-xs font-normal text-stone-500">meds & supps</span>
            </div>
            <div className="text-[11px] text-stone-500 mt-1 truncate">
              {latestLab ? `Latest Lab: ${latestLab.title}` : 'No lab reports logged'}
            </div>
          </div>
        </div>
      </div>

      {/* Activity & Sleep Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Activity */}
        <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Footprints className="w-4 h-4 text-emerald-500" />
              Daily Activity Summary
            </h3>
            <span className="text-[11px] text-stone-500 font-mono">
              {todayActivity ? todayActivity.date : todayStr}
            </span>
          </div>

          {todayActivity ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-center">
                <div className="text-lg font-black text-stone-900 dark:text-stone-100">
                  {todayActivity.steps?.toLocaleString() || '0'}
                </div>
                <div className="text-[10px] font-bold text-stone-500 uppercase">Steps</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-center">
                <div className="text-lg font-black text-stone-900 dark:text-stone-100">
                  {todayActivity.activeMinutes || '0'}
                </div>
                <div className="text-[10px] font-bold text-stone-500 uppercase">Active Mins</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-center">
                <div className="text-lg font-black text-stone-900 dark:text-stone-100">
                  {todayActivity.estimatedActiveEnergyKcal || '0'}
                </div>
                <div className="text-[10px] font-bold text-stone-500 uppercase">Active kcal</div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 text-center text-xs text-stone-400">
              No activity logs for today. Import via HealthKit/Health Connect or log manually.
            </div>
          )}
        </div>

        {/* Latest Sleep Session */}
        <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              Latest Sleep Session
            </h3>
            {latestSleep && (
              <span className="text-[11px] text-stone-500 font-mono">{latestSleep.date}</span>
            )}
          </div>

          {latestSleep ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-black text-stone-900 dark:text-stone-100">
                  {Math.floor(latestSleep.durationMinutes / 60)}h {latestSleep.durationMinutes % 60}m
                </div>
                <div className="text-xs text-stone-500">
                  {latestSleep.startTime} → {latestSleep.endTime}
                </div>
              </div>

              {latestSleep.stages && (
                <div className="grid grid-cols-4 gap-1 text-center text-[10px] pt-1">
                  <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                    <span className="font-bold block">{latestSleep.stages.deepMinutes || 0}m</span>
                    <span>Deep</span>
                  </div>
                  <div className="p-1 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400">
                    <span className="font-bold block">{latestSleep.stages.lightMinutes || 0}m</span>
                    <span>Light</span>
                  </div>
                  <div className="p-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
                    <span className="font-bold block">{latestSleep.stages.remMinutes || 0}m</span>
                    <span>REM</span>
                  </div>
                  <div className="p-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                    <span className="font-bold block">{latestSleep.stages.awakeMinutes || 0}m</span>
                    <span>Awake</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 text-center text-xs text-stone-400">
              No sleep records available.
            </div>
          )}
        </div>
      </div>

      {/* Safety & Non-Diagnostic Architecture Notice */}
      <div className="p-4 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
          <p className="font-bold text-stone-800 dark:text-stone-200">
            Factual Recordkeeping & Privacy Standard
          </p>
          <p>
            Health data in this vault is stored locally and deterministically. This application is an objective personal recordkeeping system — not a diagnostic tool, medical device, treatment recommender, or emergency service. All lab reference ranges and flags are preserved as provided by your testing laboratory.
          </p>
        </div>
      </div>
    </div>
  );
};
