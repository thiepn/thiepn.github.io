/**
 * Phase P54: Health Domain Service
 * 
 * Provides unified, deterministic API for:
 * - Measurements & Unit Conversions
 * - Exercises, Templates & Workouts
 * - Resilient Active Workout Logger
 * - Personal Records & Estimated 1RM
 * - Sleep & Activity Summaries
 * - Lightweight Nutrition & Symptom Journaling
 * - Medications & Reminders
 * - Lab Reports with per-report Reference Ranges and Source Flags
 * - HealthKit / Health Connect Sync & Deduplication
 * - CSV Import / Export
 * - Vault Doctor Health Diagnostics
 */

import {
  HealthProfile,
  MeasurementTypeDefinition,
  HealthMeasurement,
  Exercise,
  WorkoutTemplate,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  ActiveWorkoutState,
  PersonalRecord,
  EstimatedOneRepMax,
  ActivitySummary,
  SleepSession,
  NutritionEntry,
  SymptomEntry,
  MedicationRecord,
  LabReport,
  LabResultValue,
  HealthSyncDeviceConfig,
  HealthDiagnosticIssue,
  HealthSource,
} from './healthTypes';
import { healthStorage } from './healthStorage';
import {
  calculateRollingAverage,
  derivePersonalRecords,
  calculateEstimated1RM,
  buildLabTestTrends,
  LabTestTrendSeries,
  calculateBMI,
  calculateWorkoutVolume,
} from './healthCalculations';
import { convertHealthUnit } from './healthUnits';

class HealthService {
  // Profile
  getProfile(): HealthProfile {
    return healthStorage.getProfile();
  }

  saveProfile(profile: HealthProfile): void {
    healthStorage.saveProfile(profile);
  }

  // Measurement Types
  getMeasurementTypes(): MeasurementTypeDefinition[] {
    return healthStorage.getMeasurementTypes();
  }

  createMeasurementType(draft: Partial<MeasurementTypeDefinition>): MeasurementTypeDefinition {
    const types = healthStorage.getMeasurementTypes();
    const newType: MeasurementTypeDefinition = {
      id: draft.id || `type-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: draft.name || 'Custom Measurement',
      category: draft.category || 'custom',
      defaultUnit: draft.defaultUnit || 'count',
      allowedUnits: draft.allowedUnits || [draft.defaultUnit || 'count'],
      isPairedVitals: draft.isPairedVitals || false,
      description: draft.description,
      isSystem: false,
      isHidden: false,
    };
    healthStorage.saveMeasurementTypes([...types, newType]);
    return newType;
  }

  updateMeasurementType(id: string, updates: Partial<MeasurementTypeDefinition>): MeasurementTypeDefinition | null {
    const types = healthStorage.getMeasurementTypes();
    const idx = types.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const updated = { ...types[idx], ...updates };
    types[idx] = updated;
    healthStorage.saveMeasurementTypes(types);
    return updated;
  }

  // Measurements
  getMeasurements(filter?: {
    typeId?: string;
    fromDate?: string;
    toDate?: string;
    includeExcluded?: boolean;
  }): HealthMeasurement[] {
    let all = healthStorage.getMeasurements();
    if (filter) {
      if (filter.typeId) {
        all = all.filter((m) => m.typeId === filter.typeId);
      }
      if (filter.fromDate) {
        all = all.filter((m) => m.observedAt.slice(0, 10) >= filter.fromDate!);
      }
      if (filter.toDate) {
        all = all.filter((m) => m.observedAt.slice(0, 10) <= filter.toDate!);
      }
      if (!filter.includeExcluded) {
        all = all.filter((m) => !m.isExcluded);
      }
    }
    return all.sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
  }

  addMeasurement(draft: Partial<HealthMeasurement>): HealthMeasurement {
    const list = healthStorage.getMeasurements();
    const now = Date.now();
    const newMeasurement: HealthMeasurement = {
      id: draft.id || `meas-${now}-${Math.random().toString(36).substring(2, 6)}`,
      typeId: draft.typeId || 'body-weight',
      observedAt: draft.observedAt || new Date().toISOString(),
      value: typeof draft.value === 'number' ? draft.value : 0,
      structuredValue: draft.structuredValue,
      unit: draft.unit || 'kg',
      originalValue: draft.originalValue ?? draft.value,
      originalUnit: draft.originalUnit ?? draft.unit,
      source: draft.source || 'manual',
      sourceRecordId: draft.sourceRecordId,
      isExcluded: draft.isExcluded || false,
      exclusionReason: draft.exclusionReason,
      note: draft.note,
      noteId: draft.noteId,
      createdAt: now,
      updatedAt: now,
    };
    healthStorage.saveMeasurements([newMeasurement, ...list]);
    return newMeasurement;
  }

  updateMeasurement(id: string, updates: Partial<HealthMeasurement>): HealthMeasurement | null {
    const list = healthStorage.getMeasurements();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const updated: HealthMeasurement = {
      ...list[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    list[idx] = updated;
    healthStorage.saveMeasurements(list);
    return updated;
  }

  deleteMeasurement(id: string): boolean {
    const list = healthStorage.getMeasurements();
    const filtered = list.filter((m) => m.id !== id);
    if (filtered.length === list.length) return false;
    healthStorage.saveMeasurements(filtered);
    return true;
  }

  toggleExcludeMeasurement(id: string, reason?: string): HealthMeasurement | null {
    const list = healthStorage.getMeasurements();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const current = list[idx];
    const isNowExcluded = !current.isExcluded;
    const updated: HealthMeasurement = {
      ...current,
      isExcluded: isNowExcluded,
      exclusionReason: isNowExcluded ? reason || 'Marked as outlier' : undefined,
      updatedAt: Date.now(),
    };
    list[idx] = updated;
    healthStorage.saveMeasurements(list);
    return updated;
  }

  // Exercises
  getExercises(): Exercise[] {
    return healthStorage.getExercises();
  }

  createExercise(draft: Partial<Exercise>): Exercise {
    const exercises = healthStorage.getExercises();
    const now = Date.now();
    const newEx: Exercise = {
      id: draft.id || `ex-${now}-${Math.random().toString(36).substring(2, 6)}`,
      name: draft.name || 'New Exercise',
      category: draft.category || 'strength',
      mode: draft.mode || 'reps_and_load',
      aliases: draft.aliases || [],
      defaultUnit: draft.defaultUnit || 'kg',
      targetMuscles: draft.targetMuscles || [],
      notes: draft.notes,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };
    healthStorage.saveExercises([...exercises, newEx]);
    return newEx;
  }

  updateExercise(id: string, updates: Partial<Exercise>): Exercise | null {
    const exercises = healthStorage.getExercises();
    const idx = exercises.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const updated: Exercise = {
      ...exercises[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    exercises[idx] = updated;
    healthStorage.saveExercises(exercises);
    return updated;
  }

  deleteExercise(id: string): boolean {
    const exercises = healthStorage.getExercises();
    const filtered = exercises.filter((e) => e.id !== id);
    if (filtered.length === exercises.length) return false;
    healthStorage.saveExercises(filtered);
    return true;
  }

  getExerciseHistory(exerciseId: string): { workoutId: string; date: string; sets: WorkoutSet[] }[] {
    const workouts = healthStorage.getWorkouts();
    const history: { workoutId: string; date: string; sets: WorkoutSet[] }[] = [];

    // Sort descending by date
    const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const w of sorted) {
      const match = w.exercises.find((ex) => ex.exerciseId === exerciseId);
      if (match && match.sets.length > 0) {
        history.push({
          workoutId: w.id,
          date: w.date,
          sets: match.sets,
        });
      }
    }

    return history;
  }

  // Templates
  getTemplates(): WorkoutTemplate[] {
    return healthStorage.getTemplates();
  }

  createTemplate(draft: Partial<WorkoutTemplate>): WorkoutTemplate {
    const templates = healthStorage.getTemplates();
    const now = Date.now();
    const newTmpl: WorkoutTemplate = {
      id: draft.id || `tmpl-${now}-${Math.random().toString(36).substring(2, 6)}`,
      name: draft.name || 'New Workout Template',
      type: draft.type || 'Strength',
      exercises: draft.exercises || [],
      notes: draft.notes,
      createdAt: now,
      updatedAt: now,
    };
    healthStorage.saveTemplates([...templates, newTmpl]);
    return newTmpl;
  }

  updateTemplate(id: string, updates: Partial<WorkoutTemplate>): WorkoutTemplate | null {
    const templates = healthStorage.getTemplates();
    const idx = templates.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const updated: WorkoutTemplate = {
      ...templates[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    templates[idx] = updated;
    healthStorage.saveTemplates(templates);
    return updated;
  }

  deleteTemplate(id: string): boolean {
    const templates = healthStorage.getTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    if (filtered.length === templates.length) return false;
    healthStorage.saveTemplates(filtered);
    return true;
  }

  // Workouts
  getWorkouts(): Workout[] {
    return healthStorage.getWorkouts().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getWorkout(id: string): Workout | null {
    const workouts = healthStorage.getWorkouts();
    return workouts.find((w) => w.id === id) || null;
  }

  createWorkout(draft: Partial<Workout>): Workout {
    const workouts = healthStorage.getWorkouts();
    const now = Date.now();
    const newWorkout: Workout = {
      id: draft.id || `wo-${now}-${Math.random().toString(36).substring(2, 6)}`,
      date: draft.date || new Date().toISOString().slice(0, 10),
      title: draft.title || 'Workout Session',
      startedAt: draft.startedAt || now,
      endedAt: draft.endedAt,
      durationMinutes: draft.durationMinutes,
      type: draft.type || 'Strength',
      exercises: draft.exercises || [],
      notes: draft.notes,
      noteId: draft.noteId,
      templateId: draft.templateId,
      source: draft.source || 'manual',
      sourceRecordId: draft.sourceRecordId,
      createdAt: now,
      updatedAt: now,
    };
    healthStorage.saveWorkouts([newWorkout, ...workouts]);
    return newWorkout;
  }

  updateWorkout(id: string, updates: Partial<Workout>): Workout | null {
    const workouts = healthStorage.getWorkouts();
    const idx = workouts.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    const updated: Workout = {
      ...workouts[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    workouts[idx] = updated;
    healthStorage.saveWorkouts(workouts);
    return updated;
  }

  deleteWorkout(id: string): boolean {
    const workouts = healthStorage.getWorkouts();
    const filtered = workouts.filter((w) => w.id !== id);
    if (filtered.length === workouts.length) return false;
    healthStorage.saveWorkouts(filtered);
    return true;
  }

  // Active Workout Logger (Resilient Local Autosave)
  getActiveWorkout(): ActiveWorkoutState | null {
    return healthStorage.getActiveWorkout();
  }

  startWorkout(templateId?: string, customTitle?: string): ActiveWorkoutState {
    const templates = healthStorage.getTemplates();
    const exercises = healthStorage.getExercises();
    const exMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));

    let workoutExercises: WorkoutExercise[] = [];
    let title = customTitle || 'Workout Session';
    let type = 'Strength';

    if (templateId) {
      const tmpl = templates.find((t) => t.id === templateId);
      if (tmpl) {
        title = tmpl.name;
        type = tmpl.type || 'Strength';
        workoutExercises = tmpl.exercises.map((te) => {
          const exDef = exMap.get(te.exerciseId);
          const setsCount = te.targetSets || 3;
          const initialSets: WorkoutSet[] = [];
          for (let s = 1; s <= setsCount; s++) {
            initialSets.push({
              id: `set-${Date.now()}-${s}-${Math.random().toString(36).substring(2, 5)}`,
              setNumber: s,
              reps: te.defaultReps || 8,
              load: te.defaultLoad ? { value: te.defaultLoad, unit: exDef?.defaultUnit || 'kg' } : undefined,
              setType: 'working',
              isCompleted: false,
            });
          }
          return {
            exerciseId: te.exerciseId,
            exerciseName: exDef?.name || 'Exercise',
            sets: initialSets,
            notes: te.notes,
          };
        });
      }
    }

    const now = Date.now();
    const activeState: ActiveWorkoutState = {
      workout: {
        id: `wo-active-${now}`,
        date: new Date().toISOString().slice(0, 10),
        title,
        type,
        startedAt: now,
        exercises: workoutExercises,
        templateId,
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      },
      activeExerciseIndex: 0,
      restTimerSeconds: 90,
      isRestTimerRunning: false,
    };

    healthStorage.saveActiveWorkout(activeState);
    return activeState;
  }

  updateActiveWorkout(state: ActiveWorkoutState): void {
    healthStorage.saveActiveWorkout(state);
  }

  addSetToActiveWorkout(exerciseIndex: number, draftSet?: Partial<WorkoutSet>): ActiveWorkoutState | null {
    const active = healthStorage.getActiveWorkout();
    if (!active || !active.workout.exercises[exerciseIndex]) return null;

    const ex = active.workout.exercises[exerciseIndex];
    const prevSet = ex.sets[ex.sets.length - 1];

    const newSet: WorkoutSet = {
      id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      setNumber: ex.sets.length + 1,
      reps: draftSet?.reps ?? prevSet?.reps ?? 8,
      load: draftSet?.load ?? prevSet?.load ?? (ex.sets[0]?.load ? { ...ex.sets[0].load } : undefined),
      distance: draftSet?.distance ?? prevSet?.distance,
      durationSeconds: draftSet?.durationSeconds ?? prevSet?.durationSeconds,
      rpe: draftSet?.rpe ?? prevSet?.rpe,
      rir: draftSet?.rir,
      setType: draftSet?.setType || 'working',
      isCompleted: false,
      notes: draftSet?.notes,
    };

    ex.sets.push(newSet);
    healthStorage.saveActiveWorkout(active);
    return active;
  }

  completeActiveWorkout(): Workout | null {
    const active = healthStorage.getActiveWorkout();
    if (!active) return null;

    const now = Date.now();
    const durationMinutes = active.workout.startedAt
      ? Math.max(1, Math.round((now - active.workout.startedAt) / (1000 * 60)))
      : 30;

    const finalWorkout: Workout = {
      ...active.workout,
      id: `wo-${now}-${Math.random().toString(36).substring(2, 6)}`,
      endedAt: now,
      durationMinutes,
      updatedAt: now,
    };

    const workouts = healthStorage.getWorkouts();
    healthStorage.saveWorkouts([finalWorkout, ...workouts]);
    healthStorage.saveActiveWorkout(null);
    return finalWorkout;
  }

  abandonActiveWorkout(): void {
    healthStorage.saveActiveWorkout(null);
  }

  // Personal Records
  getPersonalRecords(): PersonalRecord[] {
    const workouts = healthStorage.getWorkouts();
    const exercises = healthStorage.getExercises();
    return derivePersonalRecords(workouts, exercises);
  }

  getEstimated1RMs(formula: 'Epley' | 'Brzycki' = 'Epley'): EstimatedOneRepMax[] {
    const workouts = healthStorage.getWorkouts();
    const exercises = healthStorage.getExercises();
    return calculateEstimated1RM(workouts, exercises, formula);
  }

  // Activity Summaries
  getActivitySummaries(): ActivitySummary[] {
    return healthStorage.getActivitySummaries().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  saveActivitySummary(summary: Partial<ActivitySummary>): ActivitySummary {
    const list = healthStorage.getActivitySummaries();
    const now = Date.now();
    const existingIdx = list.findIndex((s) => s.date === summary.date && s.source === (summary.source || 'manual'));

    const item: ActivitySummary = {
      id: summary.id || (existingIdx >= 0 ? list[existingIdx].id : `act-${now}-${Math.random().toString(36).substring(2, 6)}`),
      date: summary.date || new Date().toISOString().slice(0, 10),
      steps: summary.steps,
      activeMinutes: summary.activeMinutes,
      distanceKm: summary.distanceKm,
      estimatedActiveEnergyKcal: summary.estimatedActiveEnergyKcal,
      source: summary.source || 'manual',
      sourceRecordId: summary.sourceRecordId,
      notes: summary.notes,
      createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : now,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = item;
    } else {
      list.unshift(item);
    }
    healthStorage.saveActivitySummaries(list);
    return item;
  }

  // Sleep Sessions
  getSleepSessions(): SleepSession[] {
    return healthStorage.getSleepSessions().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  saveSleepSession(session: Partial<SleepSession>): SleepSession {
    const list = healthStorage.getSleepSessions();
    const now = Date.now();
    const newSession: SleepSession = {
      id: session.id || `sleep-${now}-${Math.random().toString(36).substring(2, 6)}`,
      date: session.date || new Date().toISOString().slice(0, 10),
      startTime: session.startTime || '23:00',
      endTime: session.endTime || '07:00',
      durationMinutes: session.durationMinutes || 480,
      timeInBedMinutes: session.timeInBedMinutes,
      stages: session.stages,
      source: session.source || 'manual',
      sourceRecordId: session.sourceRecordId,
      vendorSleepScore: session.vendorSleepScore,
      vendorScoreSource: session.vendorScoreSource,
      notes: session.notes,
      createdAt: now,
    };

    const existingIdx = list.findIndex((s) => s.id === newSession.id);
    if (existingIdx >= 0) {
      list[existingIdx] = newSession;
    } else {
      list.unshift(newSession);
    }
    healthStorage.saveSleepSessions(list);
    return newSession;
  }

  deleteSleepSession(id: string): boolean {
    const list = healthStorage.getSleepSessions();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;
    healthStorage.saveSleepSessions(filtered);
    return true;
  }

  // Nutrition Entries
  getNutritionEntries(date?: string): NutritionEntry[] {
    let list = healthStorage.getNutritionEntries();
    if (date) {
      list = list.filter((n) => n.date === date);
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  saveNutritionEntry(entry: Partial<NutritionEntry>): NutritionEntry {
    const list = healthStorage.getNutritionEntries();
    const now = Date.now();
    const newEntry: NutritionEntry = {
      id: entry.id || `nutr-${now}-${Math.random().toString(36).substring(2, 6)}`,
      date: entry.date || new Date().toISOString().slice(0, 10),
      meal: entry.meal || 'lunch',
      energyKcal: entry.energyKcal,
      proteinGrams: entry.proteinGrams,
      carbsGrams: entry.carbsGrams,
      fatGrams: entry.fatGrams,
      waterMl: entry.waterMl,
      notes: entry.notes,
      createdAt: now,
    };

    const existingIdx = list.findIndex((n) => n.id === newEntry.id);
    if (existingIdx >= 0) {
      list[existingIdx] = newEntry;
    } else {
      list.unshift(newEntry);
    }
    healthStorage.saveNutritionEntries(list);
    return newEntry;
  }

  deleteNutritionEntry(id: string): boolean {
    const list = healthStorage.getNutritionEntries();
    const filtered = list.filter((n) => n.id !== id);
    if (filtered.length === list.length) return false;
    healthStorage.saveNutritionEntries(filtered);
    return true;
  }

  // Symptoms
  getSymptoms(): SymptomEntry[] {
    return healthStorage.getSymptoms().sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
  }

  saveSymptom(symptom: Partial<SymptomEntry>): SymptomEntry {
    const list = healthStorage.getSymptoms();
    const now = Date.now();
    const newSymptom: SymptomEntry = {
      id: symptom.id || `sym-${now}-${Math.random().toString(36).substring(2, 6)}`,
      observedAt: symptom.observedAt || new Date().toISOString(),
      symptomName: symptom.symptomName || 'Observation',
      severity: symptom.severity,
      durationMinutes: symptom.durationMinutes,
      tags: symptom.tags || [],
      notes: symptom.notes,
      createdAt: now,
    };

    const existingIdx = list.findIndex((s) => s.id === newSymptom.id);
    if (existingIdx >= 0) {
      list[existingIdx] = newSymptom;
    } else {
      list.unshift(newSymptom);
    }
    healthStorage.saveSymptoms(list);
    return newSymptom;
  }

  deleteSymptom(id: string): boolean {
    const list = healthStorage.getSymptoms();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;
    healthStorage.saveSymptoms(filtered);
    return true;
  }

  // Medications
  getMedications(): MedicationRecord[] {
    return healthStorage.getMedications().sort((a, b) => a.name.localeCompare(b.name));
  }

  saveMedication(med: Partial<MedicationRecord>): MedicationRecord {
    const list = healthStorage.getMedications();
    const now = Date.now();
    const newMed: MedicationRecord = {
      id: med.id || `med-${now}-${Math.random().toString(36).substring(2, 6)}`,
      name: med.name || 'Medication / Supplement',
      type: med.type || 'medication',
      doseText: med.doseText,
      frequency: med.frequency,
      scheduleTimes: med.scheduleTimes || [],
      instructions: med.instructions,
      prescribingDoctor: med.prescribingDoctor,
      startedDate: med.startedDate,
      endedDate: med.endedDate,
      status: med.status || 'active',
      reminderEnabled: med.reminderEnabled ?? true,
      attachmentId: med.attachmentId,
      noteId: med.noteId,
      notes: med.notes,
      createdAt: now,
      updatedAt: now,
    };

    const existingIdx = list.findIndex((m) => m.id === newMed.id);
    if (existingIdx >= 0) {
      list[existingIdx] = newMed;
    } else {
      list.unshift(newMed);
    }
    healthStorage.saveMedications(list);
    return newMed;
  }

  deleteMedication(id: string): boolean {
    const list = healthStorage.getMedications();
    const filtered = list.filter((m) => m.id !== id);
    if (filtered.length === list.length) return false;
    healthStorage.saveMedications(filtered);
    return true;
  }

  // Lab Reports
  getLabReports(): LabReport[] {
    return healthStorage.getLabReports().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getLabReport(id: string): LabReport | null {
    const reports = healthStorage.getLabReports();
    return reports.find((r) => r.id === id) || null;
  }

  saveLabReport(report: Partial<LabReport>): LabReport {
    const list = healthStorage.getLabReports();
    const now = Date.now();
    const newReport: LabReport = {
      id: report.id || `lab-${now}-${Math.random().toString(36).substring(2, 6)}`,
      date: report.date || new Date().toISOString().slice(0, 10),
      provider: report.provider,
      title: report.title || 'Laboratory Report',
      attachmentId: report.attachmentId,
      values: report.values || [],
      notes: report.notes,
      noteId: report.noteId,
      createdAt: now,
      updatedAt: now,
    };

    const existingIdx = list.findIndex((r) => r.id === newReport.id);
    if (existingIdx >= 0) {
      list[existingIdx] = newReport;
    } else {
      list.unshift(newReport);
    }
    healthStorage.saveLabReports(list);
    return newReport;
  }

  deleteLabReport(id: string): boolean {
    const list = healthStorage.getLabReports();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length === list.length) return false;
    healthStorage.saveLabReports(filtered);
    return true;
  }

  getLabTestTrends(): LabTestTrendSeries[] {
    const reports = healthStorage.getLabReports();
    return buildLabTestTrends(reports);
  }

  // Device Sync (Apple Health / Health Connect simulation & deduplication)
  getDeviceConfigs(): HealthSyncDeviceConfig[] {
    return healthStorage.getDeviceConfig();
  }

  updateDeviceConfig(platform: 'apple_health' | 'health_connect', updates: Partial<HealthSyncDeviceConfig>): void {
    const configs = healthStorage.getDeviceConfig();
    const idx = configs.findIndex((c) => c.platform === platform);
    if (idx >= 0) {
      configs[idx] = { ...configs[idx], ...updates };
      healthStorage.saveDeviceConfig(configs);
    }
  }

  simulateDeviceSync(platform: 'apple_health' | 'health_connect'): {
    importedCount: number;
    duplicateCount: number;
    dataTypes: string[];
  } {
    const configs = healthStorage.getDeviceConfig();
    const conf = configs.find((c) => c.platform === platform);
    if (!conf || !conf.connected) {
      return { importedCount: 0, duplicateCount: 0, dataTypes: [] };
    }

    const source: HealthSource = platform === 'apple_health' ? 'healthkit' : 'health-connect';
    const now = Date.now();
    let imported = 0;
    let duplicates = 0;

    // Simulate sample safe daily step aggregate and resting heart rate for current week
    const existingActivities = healthStorage.getActivitySummaries();
    const existingMeasurements = healthStorage.getMeasurements();

    const datesToSync: string[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(now - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      datesToSync.push(dt);
    }

    if (conf.grantedDataTypes.includes('steps')) {
      for (const d of datesToSync) {
        const sourceId = `dev-sync-step-${platform}-${d}`;
        const hasExisting = existingActivities.some((a) => a.sourceRecordId === sourceId);
        if (hasExisting) {
          duplicates++;
        } else {
          // Synthetic deterministic step count based on date hash
          const stepVal = 6000 + (Math.abs(d.charCodeAt(8) * 31 + d.charCodeAt(9) * 17) % 5000);
          this.saveActivitySummary({
            date: d,
            steps: stepVal,
            activeMinutes: Math.round(stepVal / 110),
            distanceKm: Math.round((stepVal * 0.00075) * 10) / 10,
            estimatedActiveEnergyKcal: Math.round(stepVal * 0.04),
            source,
            sourceRecordId: sourceId,
            notes: `Imported via ${platform === 'apple_health' ? 'Apple HealthKit' : 'Health Connect'}`,
          });
          imported++;
        }
      }
    }

    if (conf.grantedDataTypes.includes('vitals')) {
      for (const d of datesToSync) {
        const sourceId = `dev-sync-rhr-${platform}-${d}`;
        const hasExisting = existingMeasurements.some((m) => m.sourceRecordId === sourceId);
        if (hasExisting) {
          duplicates++;
        } else {
          const rhrVal = 58 + (Math.abs(d.charCodeAt(9) * 13) % 12);
          this.addMeasurement({
            typeId: 'resting-heart-rate',
            observedAt: `${d}T08:00:00`,
            value: rhrVal,
            unit: 'bpm',
            source,
            sourceRecordId: sourceId,
            note: `Resting pulse imported from ${platform === 'apple_health' ? 'Apple Health' : 'Health Connect'}`,
          });
          imported++;
        }
      }
    }

    this.updateDeviceConfig(platform, { lastSyncAt: now });
    return { importedCount: imported, duplicateCount: duplicates, dataTypes: conf.grantedDataTypes };
  }

  deleteImportedHealthData(platform?: string): { deletedCount: number } {
    let deleted = 0;
    const targetSource = platform ? (platform === 'apple_health' ? 'healthkit' : 'health-connect') : null;

    // Measurements
    const measurements = healthStorage.getMeasurements();
    const keptMeas = measurements.filter((m) => {
      if (targetSource ? m.source === targetSource : (m.source === 'healthkit' || m.source === 'health-connect')) {
        deleted++;
        return false;
      }
      return true;
    });
    healthStorage.saveMeasurements(keptMeas);

    // Activities
    const activities = healthStorage.getActivitySummaries();
    const keptAct = activities.filter((a) => {
      if (targetSource ? a.source === targetSource : (a.source === 'healthkit' || a.source === 'health-connect')) {
        deleted++;
        return false;
      }
      return true;
    });
    healthStorage.saveActivitySummaries(keptAct);

    // Sleep
    const sleeps = healthStorage.getSleepSessions();
    const keptSleep = sleeps.filter((s) => {
      if (targetSource ? s.source === targetSource : (s.source === 'healthkit' || s.source === 'health-connect')) {
        deleted++;
        return false;
      }
      return true;
    });
    healthStorage.saveSleepSessions(keptSleep);

    return { deletedCount: deleted };
  }

  // CSV Import / Export
  importMeasurementsCSV(csvText: string, defaultTypeId: string = 'body-weight'): { imported: number; errors: string[] } {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return { imported: 0, errors: ['CSV contains no data rows'] };

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const dateIdx = header.findIndex((h) => h.includes('date') || h.includes('time'));
    const valIdx = header.findIndex((h) => h.includes('value') || h.includes('val') || h.includes('weight') || h.includes('measurement'));
    const unitIdx = header.findIndex((h) => h.includes('unit'));
    const typeIdx = header.findIndex((h) => h.includes('type'));
    const noteIdx = header.findIndex((h) => h.includes('note') || h.includes('comment'));

    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const dateStr = dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().slice(0, 10);
      const valStr = valIdx >= 0 ? cols[valIdx] : cols[1];
      const valNum = parseFloat(valStr);

      if (isNaN(valNum)) {
        errors.push(`Row ${i + 1}: Invalid numeric value "${valStr}"`);
        continue;
      }

      const unit = unitIdx >= 0 && cols[unitIdx] ? cols[unitIdx] : 'kg';
      const typeId = typeIdx >= 0 && cols[typeIdx] ? cols[typeIdx] : defaultTypeId;
      const note = noteIdx >= 0 ? cols[noteIdx] : undefined;

      this.addMeasurement({
        typeId,
        observedAt: dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`,
        value: valNum,
        unit,
        source: 'import',
        note,
      });
      imported++;
    }

    return { imported, errors };
  }

  exportMeasurementsCSV(typeId?: string): string {
    const list = this.getMeasurements({ typeId, includeExcluded: true });
    const header = 'ID,Date,Type,Value,Unit,OriginalValue,OriginalUnit,Source,IsExcluded,ExclusionReason,Note\n';
    const rows = list.map((m) => {
      const cleanNote = (m.note || '').replace(/"/g, '""');
      return `"${m.id}","${m.observedAt}","${m.typeId}",${m.value},"${m.unit}",${m.originalValue ?? m.value},"${m.originalUnit ?? m.unit}","${m.source}",${m.isExcluded || false},"${m.exclusionReason || ''}","${cleanNote}"`;
    });
    return header + rows.join('\n');
  }

  exportWorkoutsCSV(): string {
    const workouts = this.getWorkouts();
    const header = 'WorkoutID,Date,Title,Type,DurationMinutes,Exercise,SetNumber,Reps,LoadValue,LoadUnit,RPE,Completed,Notes\n';
    const rows: string[] = [];

    for (const w of workouts) {
      for (const ex of w.exercises) {
        for (const s of ex.sets) {
          rows.push(
            `"${w.id}","${w.date}","${w.title || ''}","${w.type || ''}",${w.durationMinutes || 0},"${ex.exerciseName}",${s.setNumber},${s.reps || 0},${s.load?.value || 0},"${s.load?.unit || ''}",${s.rpe || ''},${s.isCompleted},"${(s.notes || '').replace(/"/g, '""')}"`
          );
        }
      }
    }

    return header + rows.join('\n');
  }

  exportHealthDataJSON(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        version: 'P54-1.0',
        profile: healthStorage.getProfile(),
        measurementTypes: healthStorage.getMeasurementTypes(),
        measurements: healthStorage.getMeasurements(),
        exercises: healthStorage.getExercises(),
        templates: healthStorage.getTemplates(),
        workouts: healthStorage.getWorkouts(),
        activitySummaries: healthStorage.getActivitySummaries(),
        sleepSessions: healthStorage.getSleepSessions(),
        nutritionEntries: healthStorage.getNutritionEntries(),
        symptoms: healthStorage.getSymptoms(),
        medications: healthStorage.getMedications(),
        labReports: healthStorage.getLabReports(),
      },
      null,
      2
    );
  }

  // Vault Doctor Health Diagnostics
  runHealthDiagnostics(): HealthDiagnosticIssue[] {
    const issues: HealthDiagnosticIssue[] = [];

    // Check 1: Active workout recovery state
    const activeWo = healthStorage.getActiveWorkout();
    if (activeWo) {
      issues.push({
        id: 'diag-active-workout',
        severity: 'info',
        type: 'active_workout_recoverable',
        message: `An active workout session (${activeWo.workout.title}) is in progress or was saved from a previous session.`,
        resourceId: activeWo.workout.id,
        autoFixable: true,
      });
    }

    // Check 2: Duplicate source IDs across imported records
    const meas = healthStorage.getMeasurements();
    const sourceMap = new Map<string, number>();
    for (const m of meas) {
      if (m.sourceRecordId) {
        const count = (sourceMap.get(m.sourceRecordId) || 0) + 1;
        sourceMap.set(m.sourceRecordId, count);
      }
    }
    sourceMap.forEach((count, id) => {
      if (count > 1) {
        issues.push({
          id: `diag-dup-source-${id}`,
          severity: 'warning',
          type: 'duplicate_source_id',
          message: `Duplicate imported source record ID found (${id}) with ${count} instances.`,
          resourceId: id,
          autoFixable: true,
        });
      }
    });

    // Check 3: Malformed workout sets (e.g. negative reps)
    const workouts = healthStorage.getWorkouts();
    for (const w of workouts) {
      for (const ex of w.exercises) {
        for (const s of ex.sets) {
          if (s.reps && s.reps < 0) {
            issues.push({
              id: `diag-invalid-set-${s.id}`,
              severity: 'error',
              type: 'malformed_record',
              message: `Workout "${w.title}" has set with negative repetitions (${s.reps}).`,
              resourceId: w.id,
              autoFixable: true,
            });
          }
        }
      }
    }

    return issues;
  }

  fixHealthDiagnostic(issueId: string): boolean {
    if (issueId === 'diag-active-workout') {
      this.completeActiveWorkout();
      return true;
    }
    if (issueId.startsWith('diag-dup-source-')) {
      const sourceId = issueId.replace('diag-dup-source-', '');
      const meas = healthStorage.getMeasurements();
      let seen = false;
      const filtered = meas.filter((m) => {
        if (m.sourceRecordId === sourceId) {
          if (seen) return false;
          seen = true;
          return true;
        }
        return true;
      });
      healthStorage.saveMeasurements(filtered);
      return true;
    }
    return false;
  }
}

export const healthService = new HealthService();
