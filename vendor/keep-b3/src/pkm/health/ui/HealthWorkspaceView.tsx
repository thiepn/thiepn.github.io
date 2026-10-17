import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Heart,
  Dumbbell,
  Moon,
  Utensils,
  Pill,
  FlaskConical,
  Database,
  Settings,
  Plus,
  Play,
  Scale,
} from 'lucide-react';
import {
  HealthProfile,
  HealthMeasurement,
  MeasurementTypeDefinition,
  Workout,
  ActiveWorkoutState,
  Exercise,
  WorkoutTemplate,
  MedicationRecord,
  LabReport,
  ActivitySummary,
  SleepSession,
  PersonalRecord,
  EstimatedOneRepMax,
} from '../healthTypes';
import { healthService } from '../healthService';

// Tabs
import { HealthOverviewTab } from './HealthOverviewTab';
import { HealthMeasurementsTab } from './HealthMeasurementsTab';
import { HealthFitnessTab } from './HealthFitnessTab';
import { HealthActivitySleepTab } from './HealthActivitySleepTab';
import { HealthNutritionSymptomsTab } from './HealthNutritionSymptomsTab';
import { HealthMedicationsTab } from './HealthMedicationsTab';
import { HealthLabsTab } from './HealthLabsTab';
import { HealthSyncImportTab } from './HealthSyncImportTab';

// Modals
import { HealthMeasurementModal } from './HealthMeasurementModal';
import { HealthExerciseModal } from './HealthExerciseModal';
import { HealthTemplateModal } from './HealthTemplateModal';
import { HealthWorkoutModal } from './HealthWorkoutModal';
import { HealthLabReportModal } from './HealthLabReportModal';
import { HealthMedicationModal } from './HealthMedicationModal';
import { HealthProfileModal } from './HealthProfileModal';

export const HealthWorkspaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Domain State
  const [profile, setProfile] = useState<HealthProfile>(healthService.getProfile());
  const [measurementTypes, setMeasurementTypes] = useState<MeasurementTypeDefinition[]>(
    healthService.getMeasurementTypes()
  );
  const [measurements, setMeasurements] = useState<HealthMeasurement[]>(
    healthService.getMeasurements()
  );
  const [workouts, setWorkouts] = useState<Workout[]>(healthService.getWorkouts());
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(
    healthService.getActiveWorkout()
  );
  const [exercises, setExercises] = useState<Exercise[]>(healthService.getExercises());
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(healthService.getTemplates());
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>(
    healthService.getPersonalRecords()
  );
  const [estimated1RMs, setEstimated1RMs] = useState<EstimatedOneRepMax[]>(
    healthService.getEstimated1RMs()
  );
  const [medications, setMedications] = useState<MedicationRecord[]>(
    healthService.getMedications()
  );
  const [labReports, setLabReports] = useState<LabReport[]>(healthService.getLabReports());
  const [activitySummaries, setActivitySummaries] = useState<ActivitySummary[]>(
    healthService.getActivitySummaries()
  );
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>(
    healthService.getSleepSessions()
  );
  const [nutritionLogs, setNutritionLogs] = useState(healthService.getNutritionEntries());
  const [symptomLogs, setSymptomLogs] = useState(healthService.getSymptoms());

  // Modal Control States
  const [measurementModalState, setMeasurementModalState] = useState<{
    isOpen: boolean;
    typeId?: string;
    initial?: HealthMeasurement;
  }>({ isOpen: false });

  const [workoutModalState, setWorkoutModalState] = useState<{
    isOpen: boolean;
    initial?: Workout;
  }>({ isOpen: false });

  const [exerciseModalState, setExerciseModalState] = useState<{
    isOpen: boolean;
    initial?: Exercise;
  }>({ isOpen: false });

  const [templateModalState, setTemplateModalState] = useState<{
    isOpen: boolean;
    initial?: WorkoutTemplate;
  }>({ isOpen: false });

  const [labModalState, setLabModalState] = useState<{
    isOpen: boolean;
    initial?: LabReport;
  }>({ isOpen: false });

  const [medicationModalState, setMedicationModalState] = useState<{
    isOpen: boolean;
    initial?: MedicationRecord;
  }>({ isOpen: false });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setProfile(healthService.getProfile());
    setMeasurementTypes(healthService.getMeasurementTypes());
    setMeasurements(healthService.getMeasurements());
    setWorkouts(healthService.getWorkouts());
    setActiveWorkout(healthService.getActiveWorkout());
    setExercises(healthService.getExercises());
    setTemplates(healthService.getTemplates());
    setPersonalRecords(healthService.getPersonalRecords());
    setEstimated1RMs(healthService.getEstimated1RMs());
    setMedications(healthService.getMedications());
    setLabReports(healthService.getLabReports());
    setActivitySummaries(healthService.getActivitySummaries());
    setSleepSessions(healthService.getSleepSessions());
    setNutritionLogs(healthService.getNutritionEntries());
    setSymptomLogs(healthService.getSymptoms());
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'measurements', label: 'Measurements', icon: Scale, count: measurements.length },
    { id: 'fitness', label: 'Fitness & Workouts', icon: Dumbbell, count: workouts.length },
    { id: 'activity_sleep', label: 'Activity & Sleep', icon: Moon },
    { id: 'nutrition_symptoms', label: 'Nutrition & Symptoms', icon: Utensils },
    { id: 'medications', label: 'Medications', icon: Pill, count: medications.length },
    { id: 'labs', label: 'Lab Reports', icon: FlaskConical, count: labReports.length },
    { id: 'sync', label: 'Sync & Import', icon: Database },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-stone-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden font-sans">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">
              Health, Fitness & Wellness
            </h1>
            <span className="text-[10px] text-stone-400 block">
              Private, local-first health vault
            </span>
          </div>
        </div>

        {/* Global Action & Settings */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-stone-500" />
            <span>Profile & Units</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Header Bar */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 shrink-0 overflow-x-auto">
        <nav className="flex space-x-1 min-w-max py-2">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? 'bg-white/20 dark:bg-stone-900/20 text-white dark:text-stone-900'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <HealthOverviewTab
            profile={profile}
            measurements={measurements}
            workouts={workouts}
            activeWorkout={activeWorkout}
            medications={medications}
            labReports={labReports}
            activitySummaries={activitySummaries}
            sleepSessions={sleepSessions}
            onOpenQuickLog={(typeId) =>
              setMeasurementModalState({ isOpen: true, typeId: typeId || 'body-weight' })
            }
            onStartWorkout={() => {
              healthService.startWorkout();
              handleRefresh();
              setActiveTab('fitness');
            }}
            onResumeActiveWorkout={() => setActiveTab('fitness')}
            onOpenLabModal={() => setLabModalState({ isOpen: true })}
            onOpenMedicationModal={() => setMedicationModalState({ isOpen: true })}
            onNavigateTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'measurements' && (
          <HealthMeasurementsTab
            measurementTypes={measurementTypes}
            measurements={measurements}
            profile={profile}
            onOpenModal={(typeId, initial) =>
              setMeasurementModalState({ isOpen: true, typeId, initial })
            }
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'fitness' && (
          <HealthFitnessTab
            workouts={workouts}
            activeWorkout={activeWorkout}
            exercises={exercises}
            templates={templates}
            personalRecords={personalRecords}
            estimated1RMs={estimated1RMs}
            onOpenWorkoutModal={(initial) => setWorkoutModalState({ isOpen: true, initial })}
            onOpenExerciseModal={(initial) => setExerciseModalState({ isOpen: true, initial })}
            onOpenTemplateModal={(initial) => setTemplateModalState({ isOpen: true, initial })}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'activity_sleep' && (
          <HealthActivitySleepTab
            activitySummaries={activitySummaries}
            sleepSessions={sleepSessions}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'nutrition_symptoms' && (
          <HealthNutritionSymptomsTab
            nutritionLogs={nutritionLogs}
            symptomLogs={symptomLogs}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'medications' && (
          <HealthMedicationsTab
            medications={medications}
            onOpenModal={(initial) => setMedicationModalState({ isOpen: true, initial })}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'labs' && (
          <HealthLabsTab
            labReports={labReports}
            onOpenModal={(initial) => setLabModalState({ isOpen: true, initial })}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'sync' && <HealthSyncImportTab onRefresh={handleRefresh} />}
      </main>

      {/* Modals */}
      <HealthMeasurementModal
        isOpen={measurementModalState.isOpen}
        onClose={() => setMeasurementModalState({ isOpen: false })}
        types={measurementTypes}
        selectedTypeId={measurementModalState.typeId}
        initialMeasurement={measurementModalState.initial}
        preferredWeightUnit={profile.preferredUnits.weight}
        onSaved={handleRefresh}
      />

      <HealthWorkoutModal
        isOpen={workoutModalState.isOpen}
        onClose={() => setWorkoutModalState({ isOpen: false })}
        exercises={exercises}
        initialWorkout={workoutModalState.initial}
        onSaved={handleRefresh}
      />

      <HealthExerciseModal
        isOpen={exerciseModalState.isOpen}
        onClose={() => setExerciseModalState({ isOpen: false })}
        initialExercise={exerciseModalState.initial}
        onSaved={handleRefresh}
      />

      <HealthTemplateModal
        isOpen={templateModalState.isOpen}
        onClose={() => setTemplateModalState({ isOpen: false })}
        exercises={exercises}
        initialTemplate={templateModalState.initial}
        onSaved={handleRefresh}
      />

      <HealthLabReportModal
        isOpen={labModalState.isOpen}
        onClose={() => setLabModalState({ isOpen: false })}
        initialReport={labModalState.initial}
        onSaved={handleRefresh}
      />

      <HealthMedicationModal
        isOpen={medicationModalState.isOpen}
        onClose={() => setMedicationModalState({ isOpen: false })}
        initialMedication={medicationModalState.initial}
        onSaved={handleRefresh}
      />

      <HealthProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSaved={handleRefresh}
      />
    </div>
  );
};
