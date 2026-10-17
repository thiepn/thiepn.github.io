import React, { useState, useEffect, useMemo } from 'react';
import {
  Decision,
  Prediction,
  Experiment,
  DecisionLesson,
  Retrospective,
} from '../decisionTypes';
import { decisionService } from '../decisionService';
import { subscribeToDecisionsChanges } from '../decisionStorage';
import { DecisionsTab } from './DecisionsTab';
import { PredictionsTab } from './PredictionsTab';
import { ExperimentsTab } from './ExperimentsTab';
import { RetrospectivesTab } from './RetrospectivesTab';
import { CalibrationTab } from './CalibrationTab';
import { DecisionDetailModal } from './DecisionDetailModal';
import { DecisionFormModal } from './DecisionFormModal';
import { PredictionFormModal } from './PredictionFormModal';
import { ResolvePredictionModal } from './ResolvePredictionModal';
import { ExperimentFormModal } from './ExperimentFormModal';
import { DecisionReportModal } from './DecisionReportModal';
import {
  Scale,
  Sparkles,
  FlaskConical,
  BookOpen,
  Target,
  Plus,
  FileText,
  AlertCircle,
  HelpCircle,
  Download,
  ChevronDown,
} from 'lucide-react';

interface DecisionsWorkspaceViewProps {
  initialDecisionId?: string;
  onOpenNote?: (noteId: string) => void;
  onCreateNote?: (title: string, content: string, tags?: string[]) => void;
}

export const DecisionsWorkspaceView: React.FC<DecisionsWorkspaceViewProps> = ({
  initialDecisionId,
  onOpenNote,
  onCreateNote,
}) => {
  const [activeTab, setActiveTab] = useState<
    'decisions' | 'predictions' | 'experiments' | 'retrospectives' | 'calibration'
  >('decisions');

  // Reactive state from decisionStorage
  const [decisions, setDecisions] = useState<Decision[]>(() => decisionService.getDecisions());
  const [predictions, setPredictions] = useState<Prediction[]>(() => decisionService.getPredictions());
  const [experiments, setExperiments] = useState<Experiment[]>(() => decisionService.getExperiments());
  const [lessons, setLessons] = useState<DecisionLesson[]>(() => decisionService.getLessons());
  const [retrospectives, setRetrospectives] = useState<Retrospective[]>(() =>
    decisionService.getRetrospectives()
  );

  // Modal triggers
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [isDecisionFormOpen, setIsDecisionFormOpen] = useState(false);
  const [supersedingFromDecision, setSupersedingFromDecision] = useState<Decision | undefined>();
  const [isPredictionFormOpen, setIsPredictionFormOpen] = useState(false);
  const [editingPrediction, setEditingPrediction] = useState<Prediction | undefined>();
  const [resolvingPrediction, setResolvingPrediction] = useState<Prediction | null>(null);
  const [isExperimentFormOpen, setIsExperimentFormOpen] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<Experiment | undefined>();
  const [followUpToExperiment, setFollowUpToExperiment] = useState<Experiment | undefined>();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Subscribe to storage changes
  useEffect(() => {
    const unsub = subscribeToDecisionsChanges(() => {
      setDecisions(decisionService.getDecisions());
      setPredictions(decisionService.getPredictions());
      setExperiments(decisionService.getExperiments());
      setLessons(decisionService.getLessons());
      setRetrospectives(decisionService.getRetrospectives());
    });
    return unsub;
  }, []);

  // Handle initialDecisionId if passed
  useEffect(() => {
    if (initialDecisionId) {
      const found = decisionService.getDecisionById(initialDecisionId);
      if (found) {
        setSelectedDecision(found);
      }
    }
  }, [initialDecisionId]);

  // Derived counts
  const reviewsDueCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return decisions.filter(
      (d) => d.reviewDate && d.reviewDate <= today && d.status !== 'reviewed'
    ).length;
  }, [decisions]);

  const duePredictionsCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return predictions.filter(
      (p) => p.status === 'open' && p.resolutionDate && p.resolutionDate <= today
    ).length;
  }, [predictions]);

  const runningExperimentsCount = useMemo(() => {
    return experiments.filter((e) => e.status === 'running').length;
  }, [experiments]);

  return (
    <div className="flex flex-col h-full bg-stone-50/60 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-y-auto">
      {/* Top Banner & Header */}
      <div className="p-4 sm:p-6 pb-0 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/70 backdrop-blur-md shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-600/20">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  Decisions & Reflection
                </h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Preserve reasoning, calibrate predictions, run personal experiments, and counter hindsight bias.
                </p>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {reviewsDueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-3.5 h-3.5" />
                {reviewsDueCount} Decision Review{reviewsDueCount > 1 ? 's' : ''} Due
              </span>
            )}

            {duePredictionsCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Target className="w-3.5 h-3.5" />
                {duePredictionsCount} Prediction{duePredictionsCount > 1 ? 's' : ''} Due
              </span>
            )}

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export Log
            </button>
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1">
          <button
            onClick={() => setActiveTab('decisions')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'decisions'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            Decisions ({decisions.length})
          </button>

          <button
            onClick={() => setActiveTab('predictions')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'predictions'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Target className="w-4 h-4" />
            Predictions & Forecasts ({predictions.length})
          </button>

          <button
            onClick={() => setActiveTab('experiments')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'experiments'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            Experiments ({experiments.length})
            {runningExperimentsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('retrospectives')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'retrospectives'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Lessons & Retrospectives ({lessons.length})
          </button>

          <button
            onClick={() => setActiveTab('calibration')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'calibration'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Calibration & Stats
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'decisions' && (
          <DecisionsTab
            decisions={decisions}
            onSelectDecision={(d) => setSelectedDecision(d)}
            onNewDecision={() => {
              setSupersedingFromDecision(undefined);
              setIsDecisionFormOpen(true);
            }}
          />
        )}

        {activeTab === 'predictions' && (
          <PredictionsTab
            predictions={predictions}
            onNewPrediction={() => {
              setEditingPrediction(undefined);
              setIsPredictionFormOpen(true);
            }}
            onResolvePrediction={(p) => setResolvingPrediction(p)}
            onEditPrediction={(p) => {
              setEditingPrediction(p);
              setIsPredictionFormOpen(true);
            }}
          />
        )}

        {activeTab === 'experiments' && (
          <ExperimentsTab
            experiments={experiments}
            onNewExperiment={() => {
              setEditingExperiment(undefined);
              setFollowUpToExperiment(undefined);
              setIsExperimentFormOpen(true);
            }}
            onEditExperiment={(e) => {
              setEditingExperiment(e);
              setFollowUpToExperiment(undefined);
              setIsExperimentFormOpen(true);
            }}
            onFollowUpExperiment={(prevExp) => {
              setEditingExperiment(undefined);
              setFollowUpToExperiment(prevExp);
              setIsExperimentFormOpen(true);
            }}
          />
        )}

        {activeTab === 'retrospectives' && (
          <RetrospectivesTab
            lessons={lessons}
            retrospectives={retrospectives}
            onNewLesson={() => {
              const title = prompt('Lesson Title / Principle:');
              if (!title) return;
              const takeaway = prompt('Core durable takeaway:');
              if (!takeaway) return;
              decisionService.saveLesson({
                id: `lsn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                title,
                takeaway,
                domain: 'General',
                tags: ['lesson'],
                createdAt: new Date().toISOString(),
              });
            }}
            onNewRetrospective={() => {
              const title = prompt('Retrospective Title (e.g. Q3 Sync Milestone):');
              if (!title) return;
              const well = prompt('What went well?');
              const didnt = prompt("What didn't go well?");
              const takeaway = prompt('Core takeaway / lesson:');
              decisionService.saveRetrospective({
                id: `retro-${Date.now()}`,
                title,
                type: 'project',
                date: new Date().toISOString().slice(0, 10),
                whatWentWell: well || '',
                whatDidnt: didnt || '',
                lessonsLearned: takeaway || '',
                nextActions: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }}
            onCreateLessonNote={(title, content) => {
              if (onCreateNote) {
                onCreateNote(title, content, ['lesson', 'reflection']);
              } else {
                alert(`Created Markdown Lesson Note:\n\n${title}`);
              }
            }}
          />
        )}

        {activeTab === 'calibration' && <CalibrationTab />}
      </div>

      {/* MODALS */}
      {selectedDecision && (
        <DecisionDetailModal
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
          onUpdateDecision={(updated) => {
            setSelectedDecision(updated);
            setDecisions(decisionService.getDecisions());
          }}
          onOpenNote={onOpenNote}
          onCreateLessonNote={(title, content) => {
            if (onCreateNote) {
              onCreateNote(title, content, ['decision-lesson']);
            }
          }}
          onSupersede={(orig) => {
            setSelectedDecision(null);
            setSupersedingFromDecision(orig);
            setIsDecisionFormOpen(true);
          }}
        />
      )}

      {isDecisionFormOpen && (
        <DecisionFormModal
          supersedingFromDecision={supersedingFromDecision}
          onClose={() => {
            setIsDecisionFormOpen(false);
            setSupersedingFromDecision(undefined);
          }}
          onSaved={(saved) => {
            setIsDecisionFormOpen(false);
            setSupersedingFromDecision(undefined);
            setSelectedDecision(saved);
          }}
        />
      )}

      {isPredictionFormOpen && (
        <PredictionFormModal
          initialPrediction={editingPrediction}
          onClose={() => {
            setIsPredictionFormOpen(false);
            setEditingPrediction(undefined);
          }}
          onSaved={() => {
            setIsPredictionFormOpen(false);
            setEditingPrediction(undefined);
          }}
        />
      )}

      {resolvingPrediction && (
        <ResolvePredictionModal
          prediction={resolvingPrediction}
          onClose={() => setResolvingPrediction(null)}
          onResolved={() => setResolvingPrediction(null)}
        />
      )}

      {isExperimentFormOpen && (
        <ExperimentFormModal
          initialExperiment={editingExperiment}
          followUpToExperiment={followUpToExperiment}
          onClose={() => {
            setIsExperimentFormOpen(false);
            setEditingExperiment(undefined);
            setFollowUpToExperiment(undefined);
          }}
          onSaved={() => {
            setIsExperimentFormOpen(false);
            setEditingExperiment(undefined);
            setFollowUpToExperiment(undefined);
          }}
        />
      )}

      {isReportModalOpen && (
        <DecisionReportModal onClose={() => setIsReportModalOpen(false)} />
      )}
    </div>
  );
};
