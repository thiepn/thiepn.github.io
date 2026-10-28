/**
 * PKM V2.22 — Personal OS Feature Completion Center Modal
 *
 * Provides a unified, interactive cockpit for all first-party Personal OS domains:
 * - Goals & Areas (outcomes, responsibilities, review dates, measurable targets)
 * - Step-by-Step Human Review Workflow (Inbox, Projects, Cards, Bills, Decisions, Reflection)
 * - People & Relationship Memory (interactions, canonical follow-ups, vCard export, duplicate detection)
 * - Factual Tracking, Habits & Routines (quick log, routine runner, non-punitive habits)
 * - Learning, Courses & Spaced Repetition (study sessions, SM-2 flashcard deck)
 * - Library & References (media progress, continue reading, highlights, BibTeX export)
 * - Finance Bookkeeping (exact cents, transfers, split transactions, bills)
 * - Health Records (source provenance, explicit units, appointments)
 * - Travel & Active Trip Mode (timezone reservations, offline pack)
 * - Assets & Maintenance (warranty, service history, person loans)
 * - Decisions & Retrospectives (reasoning, predictions, outcomes)
 * - Earned Home Contributions & Factual Attention
 */

import React, { useState } from 'react';
import { dateOnlyLocal } from '../../../components/home/keepTodayModel';
import {
  X,
  Target,
  Layers,
  CalendarCheck,
  Users,
  Activity,
  CheckSquare,
  GraduationCap,
  BookOpen,
  DollarSign,
  Heart,
  Plane,
  Wrench,
  HelpCircle,
  Play,
  RotateCcw,
  Plus,
  CheckCircle2,
  Clock,
  Download,
  Shield,
  FileText,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import {
  v2_22PersonalOSEngine,
  FirstPartyDomainType,
  V22Goal,
  V22Person,
  V22Flashcard,
  V22FinanceAccount,
  V22FinanceTransaction,
  V22HealthMeasurement,
  V22Trip,
  V22Asset,
  V22Decision,
  V22ReviewSession,
} from '../domains/v2_22PersonalOSEngine';

interface V2PersonalOSCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CenterTab = 'hub' | 'review' | 'study' | 'finance' | 'travel' | 'export';

export const V2PersonalOSCenterModal: React.FC<V2PersonalOSCenterModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<CenterTab>('hub');
  const [selectedDomain, setSelectedDomain] = useState<FirstPartyDomainType>('goals');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Domain state
  const [goals, setGoals] = useState<V22Goal[]>(() => v2_22PersonalOSEngine.getGoals());
  const [people, setPeople] = useState<V22Person[]>(() => v2_22PersonalOSEngine.getPeople());
  const [accounts, setAccounts] = useState<V22FinanceAccount[]>(() => v2_22PersonalOSEngine.getFinanceAccounts());
  const [transactions, setTransactions] = useState<V22FinanceTransaction[]>(() => v2_22PersonalOSEngine.getTransactions());
  const [trips, setTrips] = useState<V22Trip[]>(() => v2_22PersonalOSEngine.getTrips());
  const [assets, setAssets] = useState<V22Asset[]>(() => v2_22PersonalOSEngine.getAssets());
  const [decisions, setDecisions] = useState<V22Decision[]>(() => v2_22PersonalOSEngine.getDecisions());
  const [measurements, setMeasurements] = useState<V22HealthMeasurement[]>(() => v2_22PersonalOSEngine.getHealthMeasurements());

  // Review session state
  const [currentReview, setCurrentReview] = useState<V22ReviewSession | null>(null);
  const [reviewReflection, setReviewReflection] = useState<string>('');

  // Study session / Flashcards state
  const [studyDeck, setStudyDeck] = useState<V22Flashcard[]>(() => v2_22PersonalOSEngine.getDueFlashcards(dateOnlyLocal(new Date())));
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);

  // Quick action inputs
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalOutcome, setNewGoalOutcome] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [interactionSummary, setInteractionSummary] = useState('');
  const [selectedPersonForInteraction, setSelectedPersonForInteraction] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickPayee, setQuickPayee] = useState('');
  const [healthVal, setHealthVal] = useState('');

  if (!isOpen) return null;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalOutcome.trim()) return;
    const g = v2_22PersonalOSEngine.createGoal({
      title: newGoalTitle.trim(),
      desiredOutcome: newGoalOutcome.trim(),
      whyItMatters: 'Strategic milestone for 2026',
      status: 'active',
      reviewDateOnly: dateOnlyLocal(new Date()),
      relatedProjectIds: [],
    });
    setGoals(v2_22PersonalOSEngine.getGoals());
    setNewGoalTitle('');
    setNewGoalOutcome('');
    showStatus(`Goal created: ${g.title}`);
  };

  const handleCreatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    const p = v2_22PersonalOSEngine.createPerson({
      name: newPersonName.trim(),
      email: newPersonEmail.trim() || undefined,
    });
    setPeople(v2_22PersonalOSEngine.getPeople());
    setNewPersonName('');
    setNewPersonEmail('');
    showStatus(`Contact created: ${p.name}`);
  };

  const handleLogInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonForInteraction || !interactionSummary.trim()) return;
    v2_22PersonalOSEngine.logInteraction({
      personId: selectedPersonForInteraction,
      dateOnly: new Date().toISOString().slice(0, 10),
      type: 'meeting',
      summary: interactionSummary.trim(),
    });
    setInteractionSummary('');
    setPeople(v2_22PersonalOSEngine.getPeople());
    showStatus(`Interaction logged`);
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAmount || !quickPayee || accounts.length === 0) return;
    const amountCents = Math.round(parseFloat(quickAmount) * 100);
    const tx = v2_22PersonalOSEngine.createTransaction({
      dateOnly: new Date().toISOString().slice(0, 10),
      kind: 'expense',
      amountCents,
      accountId: accounts[0].id,
      payee: quickPayee.trim(),
      category: 'General',
      reconciled: false,
    });
    setTransactions(v2_22PersonalOSEngine.getTransactions());
    setAccounts(v2_22PersonalOSEngine.getFinanceAccounts());
    setQuickAmount('');
    setQuickPayee('');
    showStatus(`Transaction logged: $${(tx.amountCents / 100).toFixed(2)} to ${tx.payee}`);
  };

  const handleLogHealth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!healthVal) return;
    const num = parseFloat(healthVal);
    v2_22PersonalOSEngine.logHealthMeasurement({
      type: 'weight',
      numericValue: num,
      unit: 'kg',
      dateOnly: new Date().toISOString().slice(0, 10),
      sourceProvenance: 'manual_log',
    });
    setMeasurements(v2_22PersonalOSEngine.getHealthMeasurements());
    setHealthVal('');
    showStatus(`Logged weight: ${num} kg (Source: Manual Log)`);
  };

  const startWeeklyReview = () => {
    const rev = v2_22PersonalOSEngine.startReviewSession('weekly', new Date().toISOString().slice(0, 10));
    setCurrentReview(rev);
    setActiveTab('review');
    showStatus(`Started Weekly Review Session`);
  };

  const toggleReviewStep = (stepId: string) => {
    if (!currentReview) return;
    const updated = v2_22PersonalOSEngine.completeReviewStep(currentReview.id, stepId);
    if (updated) setCurrentReview({ ...updated });
  };

  const finishReview = () => {
    if (!currentReview) return;
    const completed = v2_22PersonalOSEngine.completeReviewSession(currentReview.id, reviewReflection);
    if (completed) {
      setCurrentReview({ ...completed });
      showStatus(`Completed Weekly Review Snapshot!`);
    }
  };

  const rateCurrentCard = (rating: 1 | 2 | 3 | 4) => {
    const card = studyDeck[currentCardIndex];
    if (!card) return;
    v2_22PersonalOSEngine.rateFlashcard(card.id, rating, new Date().toISOString().slice(0, 10));
    setIsAnswerRevealed(false);
    if (currentCardIndex + 1 < studyDeck.length) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      showStatus(`Completed all flashcards in current deck!`);
      setStudyDeck(v2_22PersonalOSEngine.getDueFlashcards(dateOnlyLocal(new Date())));
      setCurrentCardIndex(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        <p role="note" className="px-5 py-2 text-xs border-b border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Experimental, in-memory data only. Creating goals, people, tracking entries or reviews here does not persist them into your canonical KEEP, Folio or Habits records.</p>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Personal OS Domain Center (V2.22)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Experimental in-memory domain sandbox • Not your saved Folio, Habits or KEEP records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 overflow-x-auto">
          {[
            { id: 'hub', label: 'Domains Hub', icon: Layers },
            { id: 'review', label: 'Review Runner', icon: CalendarCheck },
            { id: 'study', label: 'Spaced Repetition', icon: GraduationCap },
            { id: 'finance', label: 'Finance Ledger', icon: DollarSign },
            { id: 'travel', label: 'Travel & Active Trip', icon: Plane },
            { id: 'export', label: 'Exports & Privacy', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CenterTab)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-800/50 px-6 py-2 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'hub' && (
            <div className="space-y-6">
              {/* Domain Selector Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'goals', label: 'Goals & Areas', icon: Target },
                  { id: 'people', label: 'People & Relations', icon: Users },
                  { id: 'tracking', label: 'Tracking & Habits', icon: Activity },
                  { id: 'learning', label: 'Learning & Library', icon: BookOpen },
                  { id: 'finance', label: 'Finance & Bills', icon: DollarSign },
                  { id: 'health', label: 'Health Factual', icon: Heart },
                  { id: 'travel', label: 'Travel & Trips', icon: Plane },
                  { id: 'assets', label: 'Assets & Care', icon: Wrench },
                  { id: 'decisions', label: 'Decisions Log', icon: HelpCircle },
                ].map((d) => {
                  const Icon = d.icon;
                  const active = selectedDomain === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDomain(d.id as FirstPartyDomainType)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                          : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {d.label}
                    </button>
                  );
                })}
              </div>

              {/* Selected Domain View */}
              {selectedDomain === 'goals' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-500" />
                      Strategic Goals & Outcomes
                    </h3>
                    <div className="space-y-3">
                      {goals.map((g) => (
                        <div
                          key={g.id}
                          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{g.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium">
                              {g.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            <strong>Outcome:</strong> {g.desiredOutcome}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                            <span>Horizon: {g.targetHorizon || '2026'}</span>
                            <span>Review: {g.reviewDateOnly || 'Quarterly'}</span>
                            {g.measurableMetric && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                {g.measurableMetric.name}: {g.measurableMetric.currentValue} / {g.measurableMetric.targetValue} {g.measurableMetric.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Create Goal</h4>
                    <form onSubmit={handleCreateGoal} className="space-y-3">
                      <div>
                        <label className="text-[11px] text-zinc-500 block mb-1">Title</label>
                        <input
                          type="text"
                          value={newGoalTitle}
                          onChange={(e) => setNewGoalTitle(e.target.value)}
                          placeholder="e.g. Master Distributed Systems"
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 block mb-1">Desired Outcome</label>
                        <textarea
                          rows={2}
                          value={newGoalOutcome}
                          onChange={(e) => setNewGoalOutcome(e.target.value)}
                          placeholder="What does success look like?"
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Save Goal
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {selectedDomain === 'people' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Personal Relationship Memory
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {people.map((p) => {
                        const interactions = v2_22PersonalOSEngine.getInteractionsForPerson(p.id);
                        const followups = v2_22PersonalOSEngine.getPersonFollowUps(p.id);
                        return (
                          <div
                            key={p.id}
                            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{p.name}</span>
                              <span className="text-[10px] text-zinc-500">{p.organizationName || 'Personal'}</span>
                            </div>
                            {p.importantContext && (
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{p.importantContext}</p>
                            )}
                            <div className="text-[11px] text-zinc-500 space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                              <div className="flex justify-between">
                                <span>Interactions:</span>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">{interactions.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Follow-ups:</span>
                                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                                  {followups.filter((f) => !f.completed).length} open
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Log Interaction</h4>
                      <form onSubmit={handleLogInteraction} className="space-y-3">
                        <div>
                          <label className="text-[11px] text-zinc-500 block mb-1">Person</label>
                          <select
                            value={selectedPersonForInteraction}
                            onChange={(e) => setSelectedPersonForInteraction(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          >
                            <option value="">Select contact...</option>
                            {people.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-zinc-500 block mb-1">Summary</label>
                          <textarea
                            rows={2}
                            value={interactionSummary}
                            onChange={(e) => setInteractionSummary(e.target.value)}
                            placeholder="What did you discuss?"
                            className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Save Interaction
                        </button>
                      </form>
                    </div>

                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Add Person</h4>
                      <form onSubmit={handleCreatePerson} className="space-y-2">
                        <input
                          type="text"
                          value={newPersonName}
                          onChange={(e) => setNewPersonName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                        <input
                          type="email"
                          value={newPersonEmail}
                          onChange={(e) => setNewPersonEmail(e.target.value)}
                          placeholder="email@address.org"
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Add Contact
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {selectedDomain === 'tracking' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      Factual Tracking Log
                    </h3>
                    <div className="space-y-2">
                      {v2_22PersonalOSEngine.getTrackers().map((t) => {
                        const events = v2_22PersonalOSEngine.getTrackingEvents(t.id, 5);
                        return (
                          <div key={t.id} className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{t.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                                {t.unit}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1">
                              Recent: {events.length > 0 ? `${events[0].numericValue ?? events[0].textValue} (${events[0].dateOnly})` : 'No entries'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-indigo-500" />
                      Routines & Non-Punitive Habits
                    </h3>
                    <div className="space-y-2">
                      {v2_22PersonalOSEngine.getHabits().map((h) => (
                        <div key={h.id} className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
                          <span className="text-xs text-zinc-800 dark:text-zinc-200">{h.title}</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Logged Daily</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedDomain === 'finance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {accounts.map((a) => {
                      const balance = v2_22PersonalOSEngine.getAccountBalanceCents(a.id);
                      return (
                        <div key={a.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                          <div className="text-xs text-zinc-500">{a.name} ({a.currency})</div>
                          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                            ${(balance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-1 capitalize">{a.type} Account • Exact Integer Cents</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Quick Expense Entry</h4>
                    <form onSubmit={handleAddTransaction} className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount ($)"
                        value={quickAmount}
                        onChange={(e) => setQuickAmount(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 w-32"
                      />
                      <input
                        type="text"
                        placeholder="Payee / Merchant"
                        value={quickPayee}
                        onChange={(e) => setQuickPayee(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex-1"
                      />
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg"
                      >
                        Save
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {selectedDomain === 'health' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      Factual Measurements (With Provenance)
                    </h3>
                    <div className="space-y-2">
                      {measurements.map((m) => (
                        <div key={m.id} className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex justify-between items-center">
                          <div>
                            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                              {m.type.replace('_', ' ')}: {m.numericValue} {m.secondaryNumericValue ? `/${m.secondaryNumericValue}` : ''} {m.unit}
                            </div>
                            <div className="text-[10px] text-zinc-500">{m.dateOnly} • Source: {m.sourceProvenance}</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            Verified
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Log Weight / Metric</h4>
                    <form onSubmit={handleLogHealth} className="space-y-2">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Weight (kg)"
                        value={healthVal}
                        onChange={(e) => setHealthVal(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      />
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg"
                      >
                        Record Measurement
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {selectedDomain === 'travel' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {trips.map((t) => {
                      const resList = v2_22PersonalOSEngine.getReservationsForTrip(t.id);
                      return (
                        <div key={t.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{t.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 capitalize">
                              {t.status}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            {t.destination} • {t.startDateOnly} to {t.endDateOnly} (TZ: {t.timezone})
                          </div>
                          <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                            <span>Reservations: {resList.length}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Offline Ready</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDomain === 'assets' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {assets.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{a.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 capitalize">
                          {a.category}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        Serial: {a.serialNumber || 'N/A'} • Warranty: {a.warrantyEndDateOnly || 'Active'}
                      </div>
                      <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        Maintenance Records: {a.maintenanceHistory.length}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedDomain === 'decisions' && (
                <div className="space-y-4">
                  {decisions.map((d) => (
                    <div key={d.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{d.question}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 capitalize">
                          {d.status}
                        </span>
                      </div>
                      {d.chosenOptionTitle && (
                        <div className="text-xs text-zinc-700 dark:text-zinc-300">
                          <strong>Decision:</strong> {d.chosenOptionTitle}
                        </div>
                      )}
                      {d.reasoning && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{d.reasoning}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'review' && (
            <div className="space-y-6">
              {!currentReview ? (
                <div className="text-center py-12 space-y-4">
                  <CalendarCheck className="w-12 h-12 text-indigo-500 mx-auto" />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Step-by-Step Weekly Review Coordinator
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    Inspect active projects, clear inbox captures, study due flashcards, reconcile bills, and write your retrospective reflections.
                  </p>
                  <button
                    onClick={startWeeklyReview}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Start Weekly Review Session
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Weekly Review — {currentReview.reviewDateOnly}
                      </h3>
                      <p className="text-xs text-zinc-500">Step-by-step evidence inspection & reflection</p>
                    </div>
                    {currentReview.completed ? (
                      <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        Completed Snapshot Stored
                      </span>
                    ) : (
                      <button
                        onClick={finishReview}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg"
                      >
                        Complete Review Session
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {currentReview.steps.map((step) => (
                      <div
                        key={step.id}
                        className={`p-4 rounded-xl border transition-colors flex items-center justify-between ${
                          step.completed
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{step.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              {step.itemCount} items
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{step.description}</p>
                        </div>
                        <button
                          onClick={() => toggleReviewStep(step.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                            step.completed
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {step.completed ? 'Completed' : 'Mark Done'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Reflection & Next Week Intentions
                    </label>
                    <textarea
                      rows={3}
                      value={reviewReflection}
                      onChange={(e) => setReviewReflection(e.target.value)}
                      placeholder="What were the major insights, learnings, and next week priorities?"
                      className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'study' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Spaced Repetition Study Deck (SM-2)
                  </h3>
                  <p className="text-xs text-zinc-500">Card {currentCardIndex + 1} of {studyDeck.length}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">
                  Due Today: {studyDeck.length}
                </span>
              </div>

              {studyDeck.length > 0 && studyDeck[currentCardIndex] ? (
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md space-y-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Question</span>
                    <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                      {studyDeck[currentCardIndex].question}
                    </p>
                  </div>

                  {isAnswerRevealed ? (
                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Answer</span>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          {studyDeck[currentCardIndex].answer}
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-4">
                        <button
                          onClick={() => rateCurrentCard(1)}
                          className="py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-800"
                        >
                          1 - Again (1d)
                        </button>
                        <button
                          onClick={() => rateCurrentCard(2)}
                          className="py-2 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium border border-amber-200 dark:border-amber-800"
                        >
                          2 - Hard (3d)
                        </button>
                        <button
                          onClick={() => rateCurrentCard(3)}
                          className="py-2 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800"
                        >
                          3 - Good (6d)
                        </button>
                        <button
                          onClick={() => rateCurrentCard(4)}
                          className="py-2 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-800"
                        >
                          4 - Easy (14d)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAnswerRevealed(true)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    >
                      Reveal Answer
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  No flashcards due right now.
                </div>
              )}
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Transactions Ledger & Balances
                </h3>
                <span className="text-xs text-zinc-500">Integer Cents Arithmetic</span>
              </div>
              <div className="space-y-2">
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center"
                  >
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {t.payee || t.kind.toUpperCase()} {t.notes ? `• ${t.notes}` : ''}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {t.dateOnly} • {t.category || 'Transfer'}
                      </div>
                    </div>
                    <div className={`text-xs font-bold ${t.kind === 'income' ? 'text-emerald-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {t.kind === 'expense' || t.kind === 'split' ? '-' : ''}${ (t.amountCents / 100).toFixed(2) }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'travel' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Active Trips & Offline Itinerary Packs
              </h3>
              {trips.map((trip) => (
                <div key={trip.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{trip.title}</span>
                    <button
                      onClick={() => {
                        v2_22PersonalOSEngine.prepareOfflineTripPack(trip.id);
                        setTrips(v2_22PersonalOSEngine.getTrips());
                        showStatus(`Offline pack ready for ${trip.title}`);
                      }}
                      className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-lg"
                    >
                      {trip.offlinePackPrepared ? 'Offline Pack Ready' : 'Prepare Offline Pack'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">Destination: {trip.destination} • Dates: {trip.startDateOnly} - {trip.endDateOnly}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-emerald-800 dark:text-emerald-300">
                <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <strong>Privacy First:</strong> Health measurements and Finance accounts are strictly local. Zero external cloud or AI dependencies.
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Contacts vCard Export</div>
                    <div className="text-[10px] text-zinc-500">Standard RFC 6350 vCard 3.0 format</div>
                  </div>
                  <button
                    onClick={() => {
                      if (people.length > 0) {
                        const vcard = v2_22PersonalOSEngine.exportVCard(people[0].id);
                        navigator.clipboard.writeText(vcard);
                        showStatus('Copied vCard to clipboard');
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-xs font-medium rounded-lg"
                  >
                    Copy vCard
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Bibliography BibTeX Export</div>
                    <div className="text-[10px] text-zinc-500">Academic citation entries for Library & References</div>
                  </div>
                  <button
                    onClick={() => {
                      const bib = v2_22PersonalOSEngine.exportBibTeX();
                      navigator.clipboard.writeText(bib);
                      showStatus('Copied BibTeX to clipboard');
                    }}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-xs font-medium rounded-lg"
                  >
                    Copy BibTeX
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
