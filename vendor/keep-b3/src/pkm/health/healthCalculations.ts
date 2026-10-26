/**
 * Phase P54: Health & Fitness Deterministic Calculations
 * 
 * Safe calculation engine:
 * - Rolling averages
 * - Workout volume & sets aggregation
 * - Actual Personal Records & Estimated 1RM formulas
 * - Lab test grouping and trend sequences
 * - BMI calculation (deterministic formula, without clinical diagnosis or body-shaming)
 */

import {
  HealthMeasurement,
  Workout,
  Exercise,
  PersonalRecord,
  EstimatedOneRepMax,
  LabReport,
  LabResultValue,
} from './healthTypes';
import { convertHealthUnit, areUnitsCompatible } from './healthUnits';

/**
 * Calculates rolling average for numeric measurements over a window (e.g. 7 days).
 */
export interface RollingAveragePoint {
  date: string;
  actualValue: number;
  rollingAvg: number;
  count: number;
  unit: string;
}

export function calculateRollingAverage(
  measurements: HealthMeasurement[],
  windowDays: number = 7,
  targetUnit?: string
): RollingAveragePoint[] {
  // Filter out excluded/erroneous measurements and sort ascending by date
  const valid = measurements
    .filter((m) => !m.isExcluded && typeof m.value === 'number' && !isNaN(m.value))
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());

  if (valid.length === 0) return [];

  const baseUnit = targetUnit || valid[0].unit;
  const converted = valid.map((m) => {
    const conv = convertHealthUnit(m.value, m.unit, baseUnit);
    return {
      date: m.observedAt.slice(0, 10),
      timestamp: new Date(m.observedAt).getTime(),
      value: conv.value,
      unit: baseUnit,
    };
  });

  const result: RollingAveragePoint[] = [];

  for (let i = 0; i < converted.length; i++) {
    const current = converted[i];
    const windowStartMs = current.timestamp - windowDays * 24 * 60 * 60 * 1000;

    let sum = 0;
    let count = 0;

    for (let j = 0; j <= i; j++) {
      if (converted[j].timestamp >= windowStartMs && converted[j].timestamp <= current.timestamp) {
        sum += converted[j].value;
        count++;
      }
    }

    const avg = count > 0 ? sum / count : current.value;
    result.push({
      date: current.date,
      actualValue: Math.round(current.value * 100) / 100,
      rollingAvg: Math.round(avg * 100) / 100,
      count,
      unit: baseUnit,
    });
  }

  return result;
}

/**
 * Deterministic BMI calculation from height (cm) and weight (kg).
 * BMI = weight (kg) / (height (m))^2
 */
export function calculateBMI(
  weightKg: number,
  heightCm: number
): { bmi: number; formulaDescription: string } | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  return {
    bmi: Math.round(bmi * 10) / 10,
    formulaDescription: 'BMI = weight(kg) / [height(m)]²',
  };
}

/**
 * Calculates total volume for a single workout (in kg or lbs).
 */
export function calculateWorkoutVolume(
  workout: Workout,
  targetUnit: 'kg' | 'lb' = 'kg'
): { totalVolume: number; unit: string; totalSets: number; totalReps: number } {
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;

  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (!s.isCompleted) continue;
      totalSets++;
      if (s.reps && s.reps > 0) {
        totalReps += s.reps;
      }
      if (s.load && s.reps && s.reps > 0) {
        const conv = convertHealthUnit(s.load.value, s.load.unit, targetUnit);
        totalVolume += conv.value * s.reps;
      }
    }
  }

  return {
    totalVolume: Math.round(totalVolume * 10) / 10,
    unit: targetUnit,
    totalSets,
    totalReps,
  };
}

/**
 * Derives all actual Personal Records (PRs) from recorded workouts.
 */
export function derivePersonalRecords(
  workouts: Workout[],
  exercises: Exercise[]
): PersonalRecord[] {
  const prs: PersonalRecord[] = [];
  const exerciseMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));

  // Track bests per exercise
  const maxLoadMap = new Map<string, { load: number; unit: string; reps: number; workoutId: string; date: string; achievedAt: number }>();
  const maxVolumeMap = new Map<string, { volume: number; unit: string; workoutId: string; date: string; achievedAt: number }>();
  const maxDistanceMap = new Map<string, { distance: number; unit: string; workoutId: string; date: string; achievedAt: number }>();

  // Sort workouts ascending by date
  const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const w of sortedWorkouts) {
    const timestamp = w.startedAt || new Date(w.date).getTime();

    for (const ex of w.exercises) {
      const def = exerciseMap.get(ex.exerciseId);
      const exName = def?.name || ex.exerciseName;

      let sessionVolume = 0;
      let volumeUnit = 'kg';

      for (const s of ex.sets) {
        if (!s.isCompleted) continue;

        // Max Load PR
        if (s.load && typeof s.load.value === 'number' && s.load.value > 0) {
          const currentBest = maxLoadMap.get(ex.exerciseId);
          // Standardize comparison to kg
          const loadInKg = convertHealthUnit(s.load.value, s.load.unit, 'kg').value;
          const bestInKg = currentBest ? convertHealthUnit(currentBest.load, currentBest.unit, 'kg').value : 0;

          if (!currentBest || loadInKg > bestInKg) {
            maxLoadMap.set(ex.exerciseId, {
              load: s.load.value,
              unit: s.load.unit,
              reps: s.reps || 1,
              workoutId: w.id,
              date: w.date,
              achievedAt: timestamp,
            });
          }

          if (s.reps && s.reps > 0) {
            sessionVolume += s.load.value * s.reps;
            volumeUnit = s.load.unit;
          }
        }

        // Distance PR
        if (s.distance && typeof s.distance.value === 'number' && s.distance.value > 0) {
          const currentBest = maxDistanceMap.get(ex.exerciseId);
          const distInKm = convertHealthUnit(s.distance.value, s.distance.unit, 'km').value;
          const bestInKm = currentBest ? convertHealthUnit(currentBest.distance, currentBest.unit, 'km').value : 0;

          if (!currentBest || distInKm > bestInKm) {
            maxDistanceMap.set(ex.exerciseId, {
              distance: s.distance.value,
              unit: s.distance.unit,
              workoutId: w.id,
              date: w.date,
              achievedAt: timestamp,
            });
          }
        }
      }

      // Max Volume PR for an exercise session
      if (sessionVolume > 0) {
        const currentBestVol = maxVolumeMap.get(ex.exerciseId);
        const volInKg = convertHealthUnit(sessionVolume, volumeUnit, 'kg').value;
        const bestVolInKg = currentBestVol ? convertHealthUnit(currentBestVol.volume, currentBestVol.unit, 'kg').value : 0;

        if (!currentBestVol || volInKg > bestVolInKg) {
          maxVolumeMap.set(ex.exerciseId, {
            volume: sessionVolume,
            unit: volumeUnit,
            workoutId: w.id,
            date: w.date,
            achievedAt: timestamp,
          });
        }
      }
    }
  }

  // Build PR list
  maxLoadMap.forEach((entry, exId) => {
    const exName = exerciseMap.get(exId)?.name || 'Exercise';
    prs.push({
      id: `pr-load-${exId}`,
      exerciseId: exId,
      exerciseName: exName,
      type: 'max_load',
      value: entry.load,
      unit: entry.unit,
      reps: entry.reps,
      workoutId: entry.workoutId,
      date: entry.date,
      achievedAt: entry.achievedAt,
    });
  });

  maxVolumeMap.forEach((entry, exId) => {
    const exName = exerciseMap.get(exId)?.name || 'Exercise';
    prs.push({
      id: `pr-vol-${exId}`,
      exerciseId: exId,
      exerciseName: exName,
      type: 'max_volume',
      value: Math.round(entry.volume * 10) / 10,
      unit: entry.unit,
      workoutId: entry.workoutId,
      date: entry.date,
      achievedAt: entry.achievedAt,
    });
  });

  maxDistanceMap.forEach((entry, exId) => {
    const exName = exerciseMap.get(exId)?.name || 'Exercise';
    prs.push({
      id: `pr-dist-${exId}`,
      exerciseId: exId,
      exerciseName: exName,
      type: 'longest_distance',
      value: entry.distance,
      unit: entry.unit,
      workoutId: entry.workoutId,
      date: entry.date,
      achievedAt: entry.achievedAt,
    });
  });

  return prs;
}

/**
 * Calculates Estimated 1RM using Epley and Brzycki formulas.
 * Labeled explicitly as formula estimates.
 * Epley formula: 1RM = load * (1 + reps / 30)
 * Brzycki formula: 1RM = load / (1.0278 - 0.0278 * reps)
 */
export function calculateEstimated1RM(
  workouts: Workout[],
  exercises: Exercise[],
  formula: 'Epley' | 'Brzycki' = 'Epley'
): EstimatedOneRepMax[] {
  const result: EstimatedOneRepMax[] = [];
  const exerciseMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));

  const bestEstimates = new Map<
    string,
    {
      best1RM: number;
      unit: string;
      setLoad: number;
      setReps: number;
      date: string;
      workoutId: string;
    }
  >();

  for (const w of workouts) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (!s.isCompleted || !s.load || !s.reps || s.reps <= 0 || s.load.value <= 0) continue;
        if (s.reps > 15) continue; // 1RM formulas are most valid for 1-10 reps

        let est1RM = 0;
        if (formula === 'Epley') {
          est1RM = s.load.value * (1 + s.reps / 30);
        } else {
          est1RM = s.load.value / (1.0278 - 0.0278 * s.reps);
        }

        const estInKg = convertHealthUnit(est1RM, s.load.unit, 'kg').value;
        const currentBest = bestEstimates.get(ex.exerciseId);
        const currentBestInKg = currentBest ? convertHealthUnit(currentBest.best1RM, currentBest.unit, 'kg').value : 0;

        if (!currentBest || estInKg > currentBestInKg) {
          bestEstimates.set(ex.exerciseId, {
            best1RM: Math.round(est1RM * 10) / 10,
            unit: s.load.unit,
            setLoad: s.load.value,
            setReps: s.reps,
            date: w.date,
            workoutId: w.id,
          });
        }
      }
    }
  }

  bestEstimates.forEach((entry, exId) => {
    const exName = exerciseMap.get(exId)?.name || 'Exercise';
    result.push({
      exerciseId: exId,
      exerciseName: exName,
      estimated1RM: entry.best1RM,
      unit: entry.unit,
      formula,
      basedOnSet: {
        load: entry.setLoad,
        reps: entry.setReps,
        date: entry.date,
        workoutId: entry.workoutId,
      },
    });
  });

  return result;
}

/**
 * Groups and trends lab test values across multiple lab reports.
 * Preserves each report's specific reference range and source flag.
 */
export interface LabTestTrendSeries {
  canonicalKey: string;
  testName: string;
  unit: string;
  points: {
    reportId: string;
    reportTitle: string;
    date: string;
    value: number;
    textualValue?: string;
    unit: string;
    referenceRangeLow?: number;
    referenceRangeHigh?: number;
    referenceRangeText?: string;
    sourceFlag?: string;
  }[];
}

export function buildLabTestTrends(reports: LabReport[]): LabTestTrendSeries[] {
  const seriesMap = new Map<string, LabTestTrendSeries>();

  // Sort reports chronologically
  const sorted = [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const report of sorted) {
    for (const val of report.values) {
      if (typeof val.value !== 'number' || isNaN(val.value)) continue;

      const key = (val.canonicalTestKey || val.testName).trim().toLowerCase();
      let series = seriesMap.get(key);

      if (!series) {
        series = {
          canonicalKey: key,
          testName: val.testName,
          unit: val.unit || '',
          points: [],
        };
        seriesMap.set(key, series);
      }

      // Check unit compatibility
      if (series.unit && val.unit && !areUnitsCompatible(series.unit, val.unit)) {
        // Different dimension, skip or preserve separately
        continue;
      }

      series.points.push({
        reportId: report.id,
        reportTitle: report.title,
        date: report.date,
        value: val.value,
        textualValue: val.textualValue,
        unit: val.unit || series.unit,
        referenceRangeLow: val.referenceRangeLow,
        referenceRangeHigh: val.referenceRangeHigh,
        referenceRangeText: val.referenceRangeText,
        sourceFlag: val.sourceFlag,
      });
    }
  }

  return Array.from(seriesMap.values());
}
