/**
 * Phase P54: Health, Fitness, Wellness & Personal Body Data
 * 
 * Strict Safety & Architectural Principles:
 * - Deterministic, privacy-first, local-first storage.
 * - Factual recordkeeping without medical diagnosis, prescribing, or health scores.
 * - Units are explicit and conversion-safe with original values preserved.
 * - Lab reference ranges and flags remain source-provided per report.
 */

export type HealthSource =
  | 'manual'
  | 'healthkit'
  | 'health-connect'
  | 'import'
  | 'document';

export type MeasurementCategory =
  | 'body_composition'
  | 'vitals'
  | 'metabolic'
  | 'fitness'
  | 'custom';

export type MeasurementUnit =
  | 'kg'
  | 'lb'
  | 'g'
  | 'oz'
  | 'cm'
  | 'in'
  | 'm'
  | 'km'
  | 'mi'
  | 'mmHg'
  | 'bpm'
  | 'celsius'
  | 'fahrenheit'
  | 'mg/dL'
  | 'mmol/L'
  | '%'
  | 'kcal'
  | 'kJ'
  | 'sec'
  | 'min'
  | 'h'
  | 'count'
  | 'custom';

export interface MeasurementTypeDefinition {
  id: string;
  name: string;
  category: MeasurementCategory;
  defaultUnit: MeasurementUnit | string;
  allowedUnits: (MeasurementUnit | string)[];
  isPairedVitals?: boolean; // e.g. blood pressure (systolic/diastolic)
  description?: string;
  isSystem?: boolean;
  isHidden?: boolean;
}

export interface PairedVitalsValue {
  systolic: number; // mmHg
  diastolic: number; // mmHg
  pulse?: number; // bpm
}

export interface HealthMeasurement {
  id: string;
  typeId: string; // references MeasurementTypeDefinition.id
  observedAt: string; // ISO 8601 or YYYY-MM-DDTHH:mm
  value: number; // primary numeric value (or systolic for BP)
  structuredValue?: PairedVitalsValue;
  unit: string;
  originalValue?: number;
  originalUnit?: string;
  source: HealthSource;
  sourceRecordId?: string;
  isExcluded?: boolean; // Marked as erroneous or outlier by user
  exclusionReason?: string;
  note?: string;
  noteId?: string; // linked canonical Markdown note
  createdAt: number;
  updatedAt: number;
}

export interface HealthProfile {
  birthDate?: string;
  height?: {
    value: number;
    unit: 'cm' | 'in';
  };
  preferredUnits: {
    weight: 'kg' | 'lb';
    distance: 'km' | 'mi';
    temperature: 'celsius' | 'fahrenheit';
    glucose: 'mg/dL' | 'mmol/L';
  };
  hideWeightMetrics: boolean;
  externalAiAccess: boolean; // Default FALSE (strict privacy)
  updatedAt: number;
}

export type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'mobility'
  | 'bodyweight'
  | 'sport'
  | 'other';

export type ExerciseMode =
  | 'reps_and_load'
  | 'reps_only'
  | 'duration'
  | 'distance_and_duration'
  | 'distance_only';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  mode: ExerciseMode;
  aliases?: string[];
  defaultUnit?: string; // 'kg', 'lb', 'km', 'mi', etc.
  targetMuscles?: string[];
  notes?: string;
  isCustom?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type WorkoutSetType = 'warmup' | 'working' | 'backoff' | 'drop' | 'other';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  reps?: number;
  load?: {
    value: number;
    unit: string; // 'kg' | 'lb'
  };
  distance?: {
    value: number;
    unit: string; // 'km' | 'mi' | 'm'
  };
  durationSeconds?: number;
  rpe?: number; // 1-10 Rate of Perceived Exertion
  rir?: number; // Reps In Reserve
  setType?: WorkoutSetType;
  isCompleted: boolean;
  notes?: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  title?: string;
  startedAt?: number;
  endedAt?: number;
  durationMinutes?: number;
  type?: string; // 'Strength', 'Running', 'Cycling', etc.
  exercises: WorkoutExercise[];
  notes?: string;
  noteId?: string; // linked canonical note
  templateId?: string;
  source: HealthSource;
  sourceRecordId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutTemplateExercise {
  exerciseId: string;
  targetSets?: number;
  defaultReps?: number;
  defaultLoad?: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  type?: string;
  exercises: WorkoutTemplateExercise[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActiveWorkoutState {
  workout: Workout;
  activeExerciseIndex: number;
  restTimerSeconds?: number;
  restTimerStartedAt?: number;
  isRestTimerRunning?: boolean;
}

export type PersonalRecordType =
  | 'max_load'
  | 'max_reps'
  | 'max_volume'
  | 'longest_distance'
  | 'fastest_pace';

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: PersonalRecordType;
  value: number;
  unit: string;
  reps?: number;
  workoutId: string;
  date: string;
  achievedAt: number;
}

export interface EstimatedOneRepMax {
  exerciseId: string;
  exerciseName: string;
  estimated1RM: number;
  unit: string;
  formula: 'Epley' | 'Brzycki';
  basedOnSet: {
    load: number;
    reps: number;
    date: string;
    workoutId: string;
  };
}

export interface ActivitySummary {
  id: string;
  date: string; // YYYY-MM-DD
  steps?: number;
  activeMinutes?: number;
  distanceKm?: number;
  estimatedActiveEnergyKcal?: number;
  source: HealthSource;
  sourceRecordId?: string;
  notes?: string;
  createdAt: number;
}

export interface SleepSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO 8601 or HH:mm
  endTime: string; // ISO 8601 or HH:mm
  durationMinutes: number;
  timeInBedMinutes?: number;
  stages?: {
    deepMinutes?: number;
    lightMinutes?: number;
    remMinutes?: number;
    awakeMinutes?: number;
  };
  source: HealthSource;
  sourceRecordId?: string;
  vendorSleepScore?: number;
  vendorScoreSource?: string;
  notes?: string;
  createdAt: number;
}

export interface NutritionEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meal?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  energyKcal?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  waterMl?: number;
  notes?: string;
  createdAt: number;
}

export interface SymptomEntry {
  id: string;
  observedAt: string; // YYYY-MM-DD or ISO
  symptomName: string;
  severity?: number; // 1-10
  durationMinutes?: number;
  tags?: string[];
  notes?: string;
  createdAt: number;
}

export interface MedicationRecord {
  id: string;
  name: string;
  type: 'medication' | 'supplement' | 'other';
  doseText?: string; // e.g. "500 mg", "1 tablet", "5 mL"
  frequency?: string; // e.g. "Once daily", "Twice daily with meals"
  scheduleTimes?: string[]; // e.g. ["08:00", "20:00"]
  instructions?: string;
  prescribingDoctor?: string;
  startedDate?: string;
  endedDate?: string;
  status: 'active' | 'paused' | 'stopped';
  reminderEnabled?: boolean;
  attachmentId?: string; // P26 prescription/document
  noteId?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type LabSourceFlag = 'H' | 'L' | 'abnormal' | 'normal' | 'critical';

export interface LabResultValue {
  id: string;
  testName: string;
  canonicalTestKey?: string; // Normalized key for grouping/trending across labs
  value?: number;
  textualValue?: string;
  unit?: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  referenceRangeText?: string;
  sourceFlag?: LabSourceFlag;
  notes?: string;
}

export interface LabReport {
  id: string;
  date: string; // YYYY-MM-DD
  provider?: string;
  title: string;
  attachmentId?: string; // P26 PDF attachment link
  values: LabResultValue[];
  notes?: string;
  noteId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface HealthSyncDeviceConfig {
  platform: 'apple_health' | 'health_connect';
  connected: boolean;
  lastSyncAt?: number;
  grantedDataTypes: string[]; // ['workouts', 'steps', 'weight', 'sleep', 'vitals']
  syncWindowDays: number;
}

export interface HealthDiagnosticIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  type:
    | 'invalid_unit'
    | 'duplicate_source_id'
    | 'orphan_attachment'
    | 'active_workout_recoverable'
    | 'incompatible_lab_units'
    | 'malformed_record';
  message: string;
  resourceId?: string;
  resourceType?: string;
  autoFixable?: boolean;
}
