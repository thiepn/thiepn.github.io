/**
 * Phase P54: Health Data Storage & State Persistence
 * 
 * Local-first, private encrypted-ready storage for:
 * - Health Profile
 * - Measurement Definitions & Entries
 * - Exercises, Workout Templates, Completed Workouts
 * - Resilient Active Workout Autosave
 * - Activity Summaries, Sleep Sessions
 * - Nutrition Entries, Symptom Logs
 * - Medication Records, Lab Reports
 * - Device Sync Configurations
 */

import {
  HealthProfile,
  MeasurementTypeDefinition,
  HealthMeasurement,
  Exercise,
  WorkoutTemplate,
  Workout,
  ActiveWorkoutState,
  ActivitySummary,
  SleepSession,
  NutritionEntry,
  SymptomEntry,
  MedicationRecord,
  LabReport,
  HealthSyncDeviceConfig,
} from './healthTypes';

const STORAGE_KEYS = {
  PROFILE: 'pkm_health_profile',
  MEASUREMENT_TYPES: 'pkm_health_measurement_types',
  MEASUREMENTS: 'pkm_health_measurements',
  EXERCISES: 'pkm_health_exercises',
  TEMPLATES: 'pkm_health_workout_templates',
  WORKOUTS: 'pkm_health_workouts',
  ACTIVE_WORKOUT: 'pkm_health_active_workout',
  ACTIVITY_SUMMARIES: 'pkm_health_activity_summaries',
  SLEEP_SESSIONS: 'pkm_health_sleep_sessions',
  NUTRITION_ENTRIES: 'pkm_health_nutrition_entries',
  SYMPTOMS: 'pkm_health_symptoms',
  MEDICATIONS: 'pkm_health_medications',
  LAB_REPORTS: 'pkm_health_lab_reports',
  DEVICE_CONFIG: 'pkm_health_device_config',
};

export const DEFAULT_MEASUREMENT_TYPES: MeasurementTypeDefinition[] = [
  {
    id: 'body-weight',
    name: 'Body Weight',
    category: 'body_composition',
    defaultUnit: 'kg',
    allowedUnits: ['kg', 'lb'],
    description: 'Measured body weight',
    isSystem: true,
  },
  {
    id: 'blood-pressure',
    name: 'Blood Pressure',
    category: 'vitals',
    defaultUnit: 'mmHg',
    allowedUnits: ['mmHg'],
    isPairedVitals: true,
    description: 'Systolic and diastolic blood pressure with optional pulse',
    isSystem: true,
  },
  {
    id: 'resting-heart-rate',
    name: 'Resting Heart Rate',
    category: 'vitals',
    defaultUnit: 'bpm',
    allowedUnits: ['bpm'],
    description: 'Resting pulse rate',
    isSystem: true,
  },
  {
    id: 'body-fat',
    name: 'Body Fat Percentage',
    category: 'body_composition',
    defaultUnit: '%',
    allowedUnits: ['%'],
    description: 'User or device-provided body fat percentage',
    isSystem: true,
  },
  {
    id: 'waist-circumference',
    name: 'Waist Circumference',
    category: 'body_composition',
    defaultUnit: 'cm',
    allowedUnits: ['cm', 'in'],
    description: 'Waist measurement',
    isSystem: true,
  },
  {
    id: 'body-temperature',
    name: 'Body Temperature',
    category: 'vitals',
    defaultUnit: 'celsius',
    allowedUnits: ['celsius', 'fahrenheit'],
    description: 'Core body temperature',
    isSystem: true,
  },
  {
    id: 'blood-glucose',
    name: 'Blood Glucose',
    category: 'metabolic',
    defaultUnit: 'mg/dL',
    allowedUnits: ['mg/dL', 'mmol/L'],
    description: 'Blood glucose reading',
    isSystem: true,
  },
  {
    id: 'oxygen-saturation',
    name: 'Oxygen Saturation (SpO2)',
    category: 'vitals',
    defaultUnit: '%',
    allowedUnits: ['%'],
    description: 'Blood oxygen saturation percentage',
    isSystem: true,
  },
];

export const DEFAULT_EXERCISES: Exercise[] = [
  {
    id: 'ex-bench-press',
    name: 'Barbell Bench Press',
    category: 'strength',
    mode: 'reps_and_load',
    defaultUnit: 'kg',
    aliases: ['Bench Press', 'Flat Bench'],
    targetMuscles: ['Chest', 'Triceps', 'Shoulders'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ex-squat',
    name: 'Barbell Back Squat',
    category: 'strength',
    mode: 'reps_and_load',
    defaultUnit: 'kg',
    aliases: ['Squat', 'Back Squat'],
    targetMuscles: ['Quadriceps', 'Glutes', 'Core'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ex-deadlift',
    name: 'Barbell Deadlift',
    category: 'strength',
    mode: 'reps_and_load',
    defaultUnit: 'kg',
    aliases: ['Deadlift', 'Conventional Deadlift'],
    targetMuscles: ['Hamstrings', 'Glutes', 'Back', 'Grip'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ex-overhead-press',
    name: 'Overhead Press',
    category: 'strength',
    mode: 'reps_and_load',
    defaultUnit: 'kg',
    aliases: ['OHP', 'Military Press', 'Shoulder Press'],
    targetMuscles: ['Shoulders', 'Triceps', 'Upper Chest'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ex-pull-up',
    name: 'Pull-Up',
    category: 'bodyweight',
    mode: 'reps_only',
    aliases: ['Pullup', 'Chin-Up'],
    targetMuscles: ['Lats', 'Biceps', 'Upper Back'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ex-barbell-row',
    name: 'Barbell Bent-Over Row',
    category: 'strength',
    mode: 'reps_and_load',
    defaultUnit: 'kg',
    aliases: ['Barbell Row', 'Bent Over Row'],
    targetMuscles: ['Back', 'Lats', 'Biceps'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ex-running',
    name: 'Outdoor Running',
    category: 'cardio',
    mode: 'distance_and_duration',
    defaultUnit: 'km',
    aliases: ['Run', 'Jogging'],
    targetMuscles: ['Cardiovascular', 'Legs'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ex-cycling',
    name: 'Cycling',
    category: 'cardio',
    mode: 'distance_and_duration',
    defaultUnit: 'km',
    aliases: ['Biking', 'Bike Ride'],
    targetMuscles: ['Cardiovascular', 'Quadriceps'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ex-walking',
    name: 'Walking',
    category: 'cardio',
    mode: 'distance_and_duration',
    defaultUnit: 'km',
    aliases: ['Walk', 'Stroll'],
    targetMuscles: ['Cardiovascular', 'Lower Body'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ex-push-up',
    name: 'Push-Up',
    category: 'bodyweight',
    mode: 'reps_only',
    aliases: ['Pushup'],
    targetMuscles: ['Chest', 'Triceps', 'Core'],
    isCustom: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tmpl-upper',
    name: 'Upper Body Strength',
    type: 'Strength',
    exercises: [
      { exerciseId: 'ex-bench-press', targetSets: 4, defaultReps: 6, defaultLoad: 70 },
      { exerciseId: 'ex-pull-up', targetSets: 3, defaultReps: 8 },
      { exerciseId: 'ex-overhead-press', targetSets: 3, defaultReps: 8, defaultLoad: 45 },
      { exerciseId: 'ex-barbell-row', targetSets: 3, defaultReps: 8, defaultLoad: 60 },
    ],
    notes: 'Compound upper-body push & pull session',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tmpl-lower',
    name: 'Lower Body Strength',
    type: 'Strength',
    exercises: [
      { exerciseId: 'ex-squat', targetSets: 4, defaultReps: 5, defaultLoad: 90 },
      { exerciseId: 'ex-deadlift', targetSets: 3, defaultReps: 5, defaultLoad: 110 },
      { exerciseId: 'ex-walking', targetSets: 1, notes: '15 min cooldown' },
    ],
    notes: 'Compound lower-body squat & hinge session',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

class HealthStorage {
  private safeGet<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`[HealthStorage] Failed to parse key ${key}`, e);
      return fallback;
    }
  }

  private safeSet<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[HealthStorage] Failed to save key ${key}`, e);
    }
  }

  // Health Profile
  getProfile(): HealthProfile {
    return this.safeGet<HealthProfile>(STORAGE_KEYS.PROFILE, {
      preferredUnits: {
        weight: 'kg',
        distance: 'km',
        temperature: 'celsius',
        glucose: 'mg/dL',
      },
      hideWeightMetrics: false,
      externalAiAccess: false,
      updatedAt: Date.now(),
    });
  }

  saveProfile(profile: HealthProfile): void {
    this.safeSet(STORAGE_KEYS.PROFILE, { ...profile, updatedAt: Date.now() });
  }

  // Measurement Types
  getMeasurementTypes(): MeasurementTypeDefinition[] {
    const existing = this.safeGet<MeasurementTypeDefinition[]>(STORAGE_KEYS.MEASUREMENT_TYPES, []);
    if (existing.length === 0) {
      this.safeSet(STORAGE_KEYS.MEASUREMENT_TYPES, DEFAULT_MEASUREMENT_TYPES);
      return DEFAULT_MEASUREMENT_TYPES;
    }
    // Ensure all default system types exist
    const map = new Map<string, MeasurementTypeDefinition>(existing.map((t) => [t.id, t]));
    let modified = false;
    for (const def of DEFAULT_MEASUREMENT_TYPES) {
      if (!map.has(def.id)) {
        map.set(def.id, def);
        modified = true;
      }
    }
    const combined = Array.from(map.values());
    if (modified) {
      this.safeSet(STORAGE_KEYS.MEASUREMENT_TYPES, combined);
    }
    return combined;
  }

  saveMeasurementTypes(types: MeasurementTypeDefinition[]): void {
    this.safeSet(STORAGE_KEYS.MEASUREMENT_TYPES, types);
  }

  // Measurements
  getMeasurements(): HealthMeasurement[] {
    return this.safeGet<HealthMeasurement[]>(STORAGE_KEYS.MEASUREMENTS, []);
  }

  saveMeasurements(measurements: HealthMeasurement[]): void {
    this.safeSet(STORAGE_KEYS.MEASUREMENTS, measurements);
  }

  // Exercises
  getExercises(): Exercise[] {
    const existing = this.safeGet<Exercise[]>(STORAGE_KEYS.EXERCISES, []);
    if (existing.length === 0) {
      this.safeSet(STORAGE_KEYS.EXERCISES, DEFAULT_EXERCISES);
      return DEFAULT_EXERCISES;
    }
    return existing;
  }

  saveExercises(exercises: Exercise[]): void {
    this.safeSet(STORAGE_KEYS.EXERCISES, exercises);
  }

  // Templates
  getTemplates(): WorkoutTemplate[] {
    const existing = this.safeGet<WorkoutTemplate[]>(STORAGE_KEYS.TEMPLATES, []);
    if (existing.length === 0) {
      this.safeSet(STORAGE_KEYS.TEMPLATES, DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }
    return existing;
  }

  saveTemplates(templates: WorkoutTemplate[]): void {
    this.safeSet(STORAGE_KEYS.TEMPLATES, templates);
  }

  // Workouts
  getWorkouts(): Workout[] {
    return this.safeGet<Workout[]>(STORAGE_KEYS.WORKOUTS, []);
  }

  saveWorkouts(workouts: Workout[]): void {
    this.safeSet(STORAGE_KEYS.WORKOUTS, workouts);
  }

  // Active Workout Autosave
  getActiveWorkout(): ActiveWorkoutState | null {
    return this.safeGet<ActiveWorkoutState | null>(STORAGE_KEYS.ACTIVE_WORKOUT, null);
  }

  saveActiveWorkout(state: ActiveWorkoutState | null): void {
    if (state === null) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT);
    } else {
      this.safeSet(STORAGE_KEYS.ACTIVE_WORKOUT, state);
    }
  }

  // Activity Summaries
  getActivitySummaries(): ActivitySummary[] {
    return this.safeGet<ActivitySummary[]>(STORAGE_KEYS.ACTIVITY_SUMMARIES, []);
  }

  saveActivitySummaries(summaries: ActivitySummary[]): void {
    this.safeSet(STORAGE_KEYS.ACTIVITY_SUMMARIES, summaries);
  }

  // Sleep Sessions
  getSleepSessions(): SleepSession[] {
    return this.safeGet<SleepSession[]>(STORAGE_KEYS.SLEEP_SESSIONS, []);
  }

  saveSleepSessions(sessions: SleepSession[]): void {
    this.safeSet(STORAGE_KEYS.SLEEP_SESSIONS, sessions);
  }

  // Nutrition Entries
  getNutritionEntries(): NutritionEntry[] {
    return this.safeGet<NutritionEntry[]>(STORAGE_KEYS.NUTRITION_ENTRIES, []);
  }

  saveNutritionEntries(entries: NutritionEntry[]): void {
    this.safeSet(STORAGE_KEYS.NUTRITION_ENTRIES, entries);
  }

  // Symptom Entries
  getSymptoms(): SymptomEntry[] {
    return this.safeGet<SymptomEntry[]>(STORAGE_KEYS.SYMPTOMS, []);
  }

  saveSymptoms(symptoms: SymptomEntry[]): void {
    this.safeSet(STORAGE_KEYS.SYMPTOMS, symptoms);
  }

  // Medications
  getMedications(): MedicationRecord[] {
    return this.safeGet<MedicationRecord[]>(STORAGE_KEYS.MEDICATIONS, []);
  }

  saveMedications(medications: MedicationRecord[]): void {
    this.safeSet(STORAGE_KEYS.MEDICATIONS, medications);
  }

  // Lab Reports
  getLabReports(): LabReport[] {
    return this.safeGet<LabReport[]>(STORAGE_KEYS.LAB_REPORTS, []);
  }

  saveLabReports(reports: LabReport[]): void {
    this.safeSet(STORAGE_KEYS.LAB_REPORTS, reports);
  }

  // Device Sync Config
  getDeviceConfig(): HealthSyncDeviceConfig[] {
    return this.safeGet<HealthSyncDeviceConfig[]>(STORAGE_KEYS.DEVICE_CONFIG, [
      {
        platform: 'apple_health',
        connected: false,
        grantedDataTypes: ['workouts', 'steps', 'weight', 'sleep'],
        syncWindowDays: 30,
      },
      {
        platform: 'health_connect',
        connected: false,
        grantedDataTypes: ['workouts', 'steps', 'weight', 'sleep'],
        syncWindowDays: 30,
      },
    ]);
  }

  saveDeviceConfig(configs: HealthSyncDeviceConfig[]): void {
    this.safeSet(STORAGE_KEYS.DEVICE_CONFIG, configs);
  }

  // Clear on Encryption Lock
  clearSensitiveInMemoryCache(): void {
    // In-memory runtime state cleared when vault locks
  }
}

export const healthStorage = new HealthStorage();
