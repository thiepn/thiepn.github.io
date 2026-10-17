import React, { useState, useMemo } from 'react';
import {
  Decision,
  DecisionOption,
  DecisionCriterion,
  DecisionAssumption,
  Prediction,
  DecisionLesson,
  OutcomeStatus,
  WouldDecideAgain,
  AssumptionStatus,
} from '../decisionTypes';
import { decisionService } from '../decisionService';
import {
  X,
  Scale,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  GitBranch,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  ChevronRight,
  Target,
  BarChart3,
  BookOpen,
} from 'lucide-react';

interface DecisionDetailModalProps {
  decision: Decision;
  onClose: () => void;
  onUpdateDecision: (updated: Decision) => void;
  onOpenNote?: (noteId: string) => void;
  onCreateLessonNote?: (title: string, content: string) => void;
  onSupersede?: (originalDecision: Decision) => void;
}

export const DecisionDetailModal: React.FC<DecisionDetailModalProps> = ({
  decision,
  onClose,
  onUpdateDecision,
  onOpenNote,
  onCreateLessonNote,
  onSupersede,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'options' | 'assumptions' | 'predictions' | 'review' | 'ai_partner'
  >('overview');

  // Options, criteria, assumptions, predictions state
  const [options, setOptions] = useState<DecisionOption[]>(() =>
    decisionService.getOptionsForDecision(decision.id)
  );
  const [criteria, setCriteria] = useState<DecisionCriterion[]>(() =>
    decisionService.getCriteriaForDecision(decision.id)
  );
  const [assumptions, setAssumptions] = useState<DecisionAssumption[]>(() =>
    decisionService.getAssumptionsForDecision(decision.id)
  );
  const [predictions, setPredictions] = useState<Prediction[]>(() =>
    decisionService.getPredictionsForDecision(decision.id)
  );

  const [showWeightedScores, setShowWeightedScores] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  // New item draft states
  const [newOptionTitle, setNewOptionTitle] = useState('');
  const [newOptionNotes, setNewOptionNotes] = useState('');
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionWeight, setNewCriterionWeight] = useState<number>(3);
  const [newAssumptionText, setNewAssumptionText] = useState('');
  const [newAssumptionConf, setNewAssumptionConf] = useState<number>(75);

  // Review editing state
  const [reviewOutcome, setReviewOutcome] = useState<OutcomeStatus>(
    decision.outcomeStatus || 'unknown'
  );
  const [reviewWouldDecide, setReviewWouldDecide] = useState<WouldDecideAgain>(
    decision.wouldDecideAgain || 'unsure'
  );
  const [reviewLesson, setReviewLesson] = useState(decision.lessonSummary || '');
  const [reviewRationale, setReviewRationale] = useState(decision.rationale || '');

  // Reload data helper
  const reloadData = () => {
    setOptions(decisionService.getOptionsForDecision(decision.id));
    setCriteria(decisionService.getCriteriaForDecision(decision.id));
    setAssumptions(decisionService.getAssumptionsForDecision(decision.id));
    setPredictions(decisionService.getPredictionsForDecision(decision.id));
  };

  // Calculations
  const weightedCalculation = useMemo(() => {
    return decisionService.calculateWeightedScores(decision.id);
  }, [decision.id, options, criteria]);

  // Option operations
  const handleAddOption = () => {
    if (!newOptionTitle.trim()) return;
    const newOpt: DecisionOption = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      decisionId: decision.id,
      title: newOptionTitle.trim(),
      status: 'considered',
      notes: newOptionNotes.trim() || undefined,
      criterionValues: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    decisionService.saveOption(newOpt);
    setNewOptionTitle('');
    setNewOptionNotes('');
    reloadData();
  };

  const handleSetOptionStatus = (
    optionId: string,
    status: 'considered' | 'selected' | 'rejected' | 'deferred'
  ) => {
    const opt = options.find((o) => o.id === optionId);
    if (!opt) return;

    // If selecting this option, set all others to considered/rejected unless user overrides
    if (status === 'selected') {
      options.forEach((o) => {
        if (o.id === optionId) {
          decisionService.saveOption({ ...o, status: 'selected' });
        } else if (o.status === 'selected') {
          decisionService.saveOption({ ...o, status: 'considered' });
        }
      });
      // Also update decision status to 'decided' if was 'considering'
      if (decision.status === 'considering' || decision.status === 'draft') {
        const updated = {
          ...decision,
          status: 'decided' as const,
          decisionDate: new Date().toISOString().slice(0, 10),
        };
        decisionService.saveDecision(updated);
        onUpdateDecision(updated);
      }
    } else {
      decisionService.saveOption({ ...opt, status });
    }
    reloadData();
  };

  const handleUpdateOptionCriterionValue = (
    optionId: string,
    criterionId: string,
    val: any
  ) => {
    const opt = options.find((o) => o.id === optionId);
    if (!opt) return;
    const updatedValues = {
      ...(opt.criterionValues || {}),
      [criterionId]: val,
    };
    decisionService.saveOption({ ...opt, criterionValues: updatedValues });
    reloadData();
  };

  const handleDeleteOption = (id: string) => {
    decisionService.deleteOption(id);
    reloadData();
  };

  // Criteria operations
  const handleAddCriterion = () => {
    if (!newCriterionName.trim()) return;
    const newCrit: DecisionCriterion = {
      id: `crit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      decisionId: decision.id,
      name: newCriterionName.trim(),
      mode: 'rating',
      weight: newCriterionWeight,
    };
    decisionService.saveCriterion(newCrit);
    setNewCriterionName('');
    reloadData();
  };

  const handleDeleteCriterion = (id: string) => {
    decisionService.deleteCriterion(id);
    reloadData();
  };

  // Assumptions operations
  const handleAddAssumption = () => {
    if (!newAssumptionText.trim()) return;
    const newAsm: DecisionAssumption = {
      id: `asm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      decisionId: decision.id,
      text: newAssumptionText.trim(),
      confidence: newAssumptionConf,
      status: 'untested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    decisionService.saveAssumption(newAsm);
    setNewAssumptionText('');
    reloadData();
  };

  const handleUpdateAssumptionStatus = (id: string, status: AssumptionStatus) => {
    const asm = assumptions.find((a) => a.id === id);
    if (!asm) return;
    decisionService.saveAssumption({ ...asm, status });
    reloadData();
  };

  const handleDeleteAssumption = (id: string) => {
    decisionService.deleteAssumption(id);
    reloadData();
  };

  // Save review changes
  const handleSaveReview = () => {
    const updated: Decision = {
      ...decision,
      outcomeStatus: reviewOutcome,
      wouldDecideAgain: reviewWouldDecide,
      lessonSummary: reviewLesson.trim() || undefined,
      rationale: reviewRationale.trim() || undefined,
      status: reviewOutcome !== 'unknown' && reviewOutcome !== 'too_early' ? 'reviewed' : decision.status,
    };
    decisionService.saveDecision(updated);
    onUpdateDecision(updated);
  };

  // Extract lesson
  const handleExtractLesson = () => {
    if (!decision.lessonSummary && !reviewLesson.trim()) return;
    const lessonText = reviewLesson.trim() || decision.lessonSummary || '';
    const newLesson: DecisionLesson = {
      id: `lsn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceDecisionId: decision.id,
      title: `${decision.title} — Key Lesson`,
      takeaway: lessonText,
      domain: decision.domain,
      tags: ['decision-lesson', decision.domain ? decision.domain.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'general'],
      createdAt: new Date().toISOString(),
    };
    decisionService.saveLesson(newLesson);

    if (onCreateLessonNote) {
      const { title, content } = decisionService.extractLessonToNote(newLesson);
      onCreateLessonNote(title, content);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between gap-4 bg-stone-50/50 dark:bg-stone-800/30">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {decision.status.toUpperCase()}
              </span>
              {decision.domain && (
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  {decision.domain}
                </span>
              )}
              {decision.reversibility && (
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  Reversibility: <strong className="text-stone-700 dark:text-stone-200">{decision.reversibility}</strong>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 truncate">
              {decision.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {decision.status === 'decided' && onSupersede && (
              <button
                onClick={() => onSupersede(decision)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Supersede
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 sm:px-5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Overview & Rationale
          </button>
          <button
            onClick={() => setActiveTab('options')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'options'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Options & Comparison ({options.length})
          </button>
          <button
            onClick={() => setActiveTab('assumptions')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'assumptions'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Assumptions ({assumptions.length})
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'predictions'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Predictions ({predictions.length})
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Review & Hindsight Reflection
          </button>
          <button
            onClick={() => setActiveTab('ai_partner')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 text-amber-700 dark:text-amber-300 ${
              activeTab === 'ai_partner'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent hover:text-amber-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Reasoning Partner
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Context */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Background Context & Problem Statement
                </label>
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-sm text-stone-800 dark:text-stone-200">
                  {decision.context || 'No specific background context recorded yet.'}
                </div>
              </div>

              {/* Selected Option Rationale */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Chosen Path & Core Rationale
                </label>
                <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-sm text-stone-800 dark:text-stone-200">
                  {decision.rationale || 'Rationale has not been finalized yet.'}
                </div>
              </div>

              {/* Grid of Key Properties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/50">
                  <span className="text-[11px] text-stone-500 block mb-1">Decision Date</span>
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {decision.decisionDate || 'Not yet decided'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/50">
                  <span className="text-[11px] text-stone-500 block mb-1">Scheduled Review Date</span>
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {decision.reviewDate || 'No review scheduled'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/50">
                  <span className="text-[11px] text-stone-500 block mb-1">Cost of Reversal</span>
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {decision.costOfReversal || 'Negligible or unstated'}
                  </span>
                </div>
              </div>

              {/* Supersession Chain Notice */}
              {decision.supersedesId && (
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs text-purple-900 dark:text-purple-200">
                      This decision supersedes prior decision: <strong>#{decision.supersedesId}</strong>
                    </span>
                  </div>
                </div>
              )}

              {decision.supersededById && (
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs text-purple-900 dark:text-purple-200">
                      This decision was superseded by newer decision: <strong>#{decision.supersededById}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OPTIONS & COMPARISON MATRIX */}
          {activeTab === 'options' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Evaluated Options ({options.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowWeightedScores(!showWeightedScores)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      showWeightedScores
                        ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                        : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    {showWeightedScores ? 'Hide Weighted Scores' : 'Show Weighted Scores'}
                  </button>
                </div>
              </div>

              {/* Weighted calculation explanation if active */}
              {showWeightedScores && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    Transparent Mathematical Evaluation
                  </div>
                  <p className="text-stone-600 dark:text-stone-300">
                    {weightedCalculation.formulaExplanation}
                  </p>
                  <p className="text-[11px] text-stone-500 italic">
                    Note: The PKM never chooses for you. Use weights as structured thinking support rather than an absolute mandate.
                  </p>
                </div>
              )}

              {/* Options Table / Matrix */}
              <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400">
                      <th className="p-3 font-semibold min-w-[160px]">Option</th>
                      <th className="p-3 font-semibold min-w-[110px]">Status</th>
                      {criteria.map((c) => (
                        <th key={c.id} className="p-3 font-semibold min-w-[120px]">
                          <div className="flex items-center justify-between gap-1">
                            <span>{c.name}</span>
                            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-700">
                              w:{c.weight || 1}
                            </span>
                          </div>
                        </th>
                      ))}
                      {showWeightedScores && (
                        <th className="p-3 font-semibold min-w-[100px] text-amber-600">Total Score</th>
                      )}
                      <th className="p-3 font-semibold w-12 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {options.map((opt) => {
                      const breakdown = weightedCalculation.options.find(
                        (b) => b.optionId === opt.id
                      );
                      const isSelected = opt.status === 'selected';

                      return (
                        <tr
                          key={opt.id}
                          className={`${
                            isSelected
                              ? 'bg-emerald-500/5 dark:bg-emerald-950/20'
                              : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                          } transition-colors`}
                        >
                          <td className="p-3 font-medium text-stone-900 dark:text-stone-100">
                            <div>{opt.title}</div>
                            {opt.notes && (
                              <div className="text-[11px] text-stone-500 font-normal mt-0.5">
                                {opt.notes}
                              </div>
                            )}
                          </td>

                          {/* Status Selector */}
                          <td className="p-3">
                            <select
                              value={opt.status}
                              onChange={(e) =>
                                handleSetOptionStatus(opt.id, e.target.value as any)
                              }
                              className={`text-xs px-2 py-1 rounded-md border font-medium ${
                                opt.status === 'selected'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                                  : opt.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                  : 'bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
                              }`}
                            >
                              <option value="considered">Considered</option>
                              <option value="selected">Selected</option>
                              <option value="rejected">Rejected</option>
                              <option value="deferred">Deferred</option>
                            </select>
                          </td>

                          {/* Criterion values */}
                          {criteria.map((c) => {
                            const val = opt.criterionValues?.[c.id];
                            return (
                              <td key={c.id} className="p-3">
                                {c.mode === 'rating' ? (
                                  <select
                                    value={val !== undefined ? String(val) : ''}
                                    onChange={(e) =>
                                      handleUpdateOptionCriterionValue(
                                        opt.id,
                                        c.id,
                                        e.target.value ? Number(e.target.value) : undefined
                                      )
                                    }
                                    className="text-xs px-2 py-1 bg-stone-50 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700"
                                  >
                                    <option value="">—</option>
                                    <option value="1">1 (Poor)</option>
                                    <option value="2">2 (Fair)</option>
                                    <option value="3">3 (Good)</option>
                                    <option value="4">4 (Very Good)</option>
                                    <option value="5">5 (Excellent)</option>
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    defaultValue={val !== undefined ? String(val) : ''}
                                    onBlur={(e) =>
                                      handleUpdateOptionCriterionValue(
                                        opt.id,
                                        c.id,
                                        e.target.value
                                      )
                                    }
                                    className="w-full text-xs px-2 py-1 bg-stone-50 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700"
                                    placeholder="Value..."
                                  />
                                )}
                              </td>
                            );
                          })}

                          {showWeightedScores && (
                            <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                              {breakdown ? breakdown.totalWeightedScore : '—'}
                            </td>
                          )}

                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteOption(opt.id)}
                              className="p-1 text-stone-400 hover:text-rose-500 rounded transition"
                              title="Delete option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add New Option & Criterion Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Add Option */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/50 space-y-2">
                  <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Add Evaluated Option
                  </h4>
                  <input
                    type="text"
                    placeholder="Option name (e.g. Option B: Refactor in-place)"
                    value={newOptionTitle}
                    onChange={(e) => setNewOptionTitle(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Brief rationale / notes (optional)"
                    value={newOptionNotes}
                    onChange={(e) => setNewOptionNotes(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleAddOption}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 hover:opacity-90 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Option
                  </button>
                </div>

                {/* Add Criterion */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/50 space-y-2">
                  <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Add Evaluation Criterion
                  </h4>
                  <input
                    type="text"
                    placeholder="Criterion name (e.g. Privacy, Latency, Cost)"
                    value={newCriterionName}
                    onChange={(e) => setNewCriterionName(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">Weight (1-5):</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={newCriterionWeight}
                      onChange={(e) => setNewCriterionWeight(Number(e.target.value))}
                      className="w-16 text-xs px-2 py-1 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                  <button
                    onClick={handleAddCriterion}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 hover:opacity-90 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Criterion Column
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ASSUMPTIONS */}
          {activeTab === 'assumptions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Explicit Assumptions & Hypotheses
                  </h3>
                  <p className="text-xs text-stone-500">
                    Document what must be true for this decision to succeed.
                  </p>
                </div>
              </div>

              {/* Assumptions List */}
              <div className="space-y-3">
                {assumptions.map((asm) => (
                  <div
                    key={asm.id}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="text-xs font-medium text-stone-900 dark:text-stone-100">
                        {asm.text}
                      </div>
                      {asm.provenanceSource && (
                        <div className="text-[11px] text-stone-500">
                          Source: <span className="font-mono">{asm.provenanceSource}</span>
                        </div>
                      )}
                      {asm.reviewNotes && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          Review: {asm.reviewNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {asm.confidence !== undefined && (
                        <span className="text-xs font-mono font-medium text-stone-500">
                          {asm.confidence}% Conf.
                        </span>
                      )}

                      <select
                        value={asm.status}
                        onChange={(e) =>
                          handleUpdateAssumptionStatus(asm.id, e.target.value as any)
                        }
                        className={`text-xs px-2.5 py-1 rounded-md border font-medium ${
                          asm.status === 'supported'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                            : asm.status === 'contradicted'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            : asm.status === 'uncertain'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
                        }`}
                      >
                        <option value="untested">Untested</option>
                        <option value="supported">Supported</option>
                        <option value="contradicted">Contradicted</option>
                        <option value="uncertain">Uncertain</option>
                      </select>

                      <button
                        onClick={() => handleDeleteAssumption(asm.id)}
                        className="p-1 text-stone-400 hover:text-rose-500 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Assumption Box */}
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/50 space-y-2">
                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  Add Assumption to Test
                </h4>
                <input
                  type="text"
                  placeholder="e.g. Migration will complete in under 4 hours on Saturday morning"
                  value={newAssumptionText}
                  onChange={(e) => setNewAssumptionText(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-500">Confidence (0-100%):</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newAssumptionConf}
                    onChange={(e) => setNewAssumptionConf(Number(e.target.value))}
                    className="w-20 text-xs px-2 py-1 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                  />
                  <button
                    onClick={handleAddAssumption}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 hover:opacity-90 transition ml-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Record Assumption
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PREDICTIONS */}
          {activeTab === 'predictions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Falsifiable Predictions Attached to this Decision
                  </h3>
                  <p className="text-xs text-stone-500">
                    Make predictions before seeing outcomes to counter hindsight bias.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {predictions.length === 0 ? (
                  <div className="text-center py-8 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
                    <p className="text-xs text-stone-500">
                      No explicit predictions attached to this decision yet.
                    </p>
                  </div>
                ) : (
                  predictions.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {p.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            {p.confidence !== undefined ? `${p.confidence}% Confidence` : 'Unrated'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            p.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                          }`}>
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-700 dark:text-stone-300">
                        {p.statement}
                      </p>

                      {p.outcome && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                          <div className="font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Resolved Outcome: {p.outcome.result.toUpperCase()}
                          </div>
                          {p.outcome.actualValue && <div>Actual: {p.outcome.actualValue}</div>}
                          {p.outcome.reflectionNotes && (
                            <div className="text-stone-600 dark:text-stone-400 italic">
                              Reflection: {p.outcome.reflectionNotes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: REVIEW & HINDSIGHT REFLECTION */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
                <span className="font-semibold block mb-0.5">
                  The "With What I Knew Then" Standard
                </span>
                A sound decision can have a bad outcome due to luck or black-swan randomness. Evaluate whether your original reasoning was sound given the information available at the time.
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                    Realized Outcome Evaluation
                  </label>
                  <select
                    value={reviewOutcome}
                    onChange={(e) => setReviewOutcome(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="unknown">Unknown / Not Yet Evaluated</option>
                    <option value="too_early">Too Early to Tell</option>
                    <option value="positive">Positive / Met Expectations</option>
                    <option value="mixed">Mixed Outcome / Partial Success</option>
                    <option value="negative">Negative / Below Expectations</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                    Would you make the same choice again with what you knew then?
                  </label>
                  <select
                    value={reviewWouldDecide}
                    onChange={(e) => setReviewWouldDecide(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="unsure">Unsure / Need more evidence</option>
                    <option value="yes">Yes — The reasoning was sound</option>
                    <option value="no">No — Flawed reasoning / ignored warning signs</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                    Extracted Lesson & Durable Takeaway
                  </label>
                  <textarea
                    rows={3}
                    value={reviewLesson}
                    onChange={(e) => setReviewLesson(e.target.value)}
                    placeholder="What principle or heuristic should you remember for future decisions in this domain?"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleSaveReview}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition shadow-xs"
                  >
                    Save Review
                  </button>

                  <button
                    onClick={handleExtractLesson}
                    disabled={!reviewLesson.trim() && !decision.lessonSummary}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition disabled:opacity-50"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Extract Lesson to Note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AI REASONING PARTNER (Assistance, not autonomous choice) */}
          {activeTab === 'ai_partner' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-semibold block mb-0.5">
                  AI Socratic Reasoning Partner
                </span>
                The AI does not make decisions for you. It helps stress-test your thinking, surface blind spots, and steelman alternatives.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-2">
                  <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Challenge My Assumptions
                  </div>
                  <p className="text-[11px] text-stone-500">
                    What if the key premise is false? How fragile is the selected choice?
                  </p>
                  <button
                    onClick={() => {
                      alert(
                        `Socratic Prompt: "Examine decision '${decision.title}'. What hidden assumptions might fail under pressure? What single point of failure exists?"`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Run Assumption Stress-Test
                  </button>
                </div>

                <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-2">
                  <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-600" />
                    Steelman Alternatives
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Formulate the strongest possible case for the rejected alternatives.
                  </p>
                  <button
                    onClick={() => {
                      alert(
                        `Socratic Prompt: "For decision '${decision.title}', formulate the best arguments in favor of the alternative paths considered."`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Generate Steelman Arguments
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30 text-xs">
          <div className="text-stone-500">
            ID: <span className="font-mono">{decision.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
