import React, { useState } from 'react';
import {
  v2_23IntelligenceEngine,
  V23AutomationRule,
  V23DryRunResult,
  V23ExecutionLog,
  V23Reminder,
  V23AttentionItem,
  V23ActivityCategory,
  V23AIProposalAction,
  V23AIAnswerResult,
} from '../intelligence/v2_23IntelligenceEngine';
import { Note } from '../../../types';
import {
  Cpu,
  Zap,
  Clock,
  Bell,
  Activity,
  AlertCircle,
  RotateCcw,
  Sparkles,
  BarChart3,
  FileText,
  Shield,
  Play,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  Calendar,
  Lock,
  Search,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Tag,
  Folder,
  Layers,
  History,
  TrendingUp,
  Download,
  Check,
  X,
} from 'lucide-react';

interface V2UnifiedIntelligenceCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes?: Note[];
  onOpenNote?: (noteId: string) => void;
}

type TabType =
  | 'automations'
  | 'recurrence'
  | 'activity'
  | 'attention'
  | 'continuity'
  | 'dashboards'
  | 'reports'
  | 'ai_vault';

export const V2UnifiedIntelligenceCenterModal: React.FC<V2UnifiedIntelligenceCenterModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  onOpenNote,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('automations');
  const [rules, setRules] = useState<V23AutomationRule[]>(v2_23IntelligenceEngine.getRules());
  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0]?.id || '');
  const [dryRunResult, setDryRunResult] = useState<V23DryRunResult | null>(null);
  const [executionLogs, setExecutionLogs] = useState<V23ExecutionLog[]>(v2_23IntelligenceEngine.getExecutionLogs());
  const [isPaused, setIsPaused] = useState(v2_23IntelligenceEngine.getGlobalPause());

  // Reminders & Recurrence
  const [reminders, setReminders] = useState<V23Reminder[]>(v2_23IntelligenceEngine.getReminders());
  const [recurrencePreviewCount, setRecurrencePreviewCount] = useState(5);

  // Activity & Attention
  const [activityFilter, setActivityFilter] = useState<V23ActivityCategory | undefined>(undefined);
  const [activityEvents, setActivityEvents] = useState(v2_23IntelligenceEngine.getActivityEvents());
  const [attentionItems, setAttentionItems] = useState<V23AttentionItem[]>(v2_23IntelligenceEngine.getAttentionItems());

  // Continuity
  const whatChanged = v2_23IntelligenceEngine.getWhatChangedSummary();
  const continueSignals = v2_23IntelligenceEngine.getContinueSignals();
  const flashbacks = v2_23IntelligenceEngine.getFlashbackAnniversaries();

  // Dashboards & Metrics
  const dashboards = v2_23IntelligenceEngine.getDashboards();
  const [showChartTableFallback, setShowChartTableFallback] = useState(false);

  // Reports
  const [currentReport, setCurrentReport] = useState(v2_23IntelligenceEngine.generateWeeklyReviewEvidence());

  // AI & Local Intelligence
  const [aiConfig, setAiConfig] = useState(v2_23IntelligenceEngine.getAiConfiguration());
  const [aiQuestion, setAiQuestion] = useState('What are the key goals and compiler optimization notes?');
  const [aiAnswer, setAiAnswer] = useState<V23AIAnswerResult | null>(null);
  const [aiProposals, setAiProposals] = useState<V23AIProposalAction[]>(v2_23IntelligenceEngine.getAIProposals());
  const [selectedNoteForRelated, setSelectedNoteForRelated] = useState<string>(notes[0]?.id || '');

  if (!isOpen) return null;

  const activeRule = rules.find((r) => r.id === selectedRuleId) || rules[0];

  const handleSimulateDryRun = () => {
    if (!activeRule) return;
    const res = v2_23IntelligenceEngine.simulateDryRun(activeRule.id);
    setDryRunResult(res);
  };

  const handleRunNow = () => {
    if (!activeRule) return;
    const log = v2_23IntelligenceEngine.runRuleNow(activeRule.id);
    setExecutionLogs([...v2_23IntelligenceEngine.getExecutionLogs()]);
    setReminders(v2_23IntelligenceEngine.getReminders());
    setDryRunResult(null);
  };

  const handleToggleGlobalPause = () => {
    const next = !isPaused;
    v2_23IntelligenceEngine.setGlobalPause(next);
    setIsPaused(next);
  };

  const handleToggleRule = (id: string) => {
    v2_23IntelligenceEngine.toggleRuleEnabled(id);
    setRules([...v2_23IntelligenceEngine.getRules()]);
  };

  const handleSnoozeReminder = (id: string) => {
    v2_23IntelligenceEngine.snoozeReminder(id, 60);
    setReminders(v2_23IntelligenceEngine.getReminders());
  };

  const handleDismissReminder = (id: string) => {
    v2_23IntelligenceEngine.dismissReminder(id);
    setReminders(v2_23IntelligenceEngine.getReminders());
  };

  const handleAcknowledgeAttention = (id: string) => {
    v2_23IntelligenceEngine.acknowledgeAttentionItem(id);
    setAttentionItems(v2_23IntelligenceEngine.getAttentionItems());
  };

  const handleAskVault = () => {
    try {
      const res = v2_23IntelligenceEngine.askVault(
        aiQuestion,
        { type: 'permitted_vault', excludedDomains: aiConfig.excludedDomains },
        notes
      );
      setAiAnswer(res);
      setAiProposals(v2_23IntelligenceEngine.getAIProposals());
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApplyProposal = (id: string) => {
    v2_23IntelligenceEngine.applyAIProposal(id);
    setAiProposals([...v2_23IntelligenceEngine.getAIProposals()]);
  };

  const handleRejectProposal = (id: string) => {
    v2_23IntelligenceEngine.rejectAIProposal(id);
    setAiProposals([...v2_23IntelligenceEngine.getAIProposals()]);
  };

  const relatedNotes = selectedNoteForRelated
    ? v2_23IntelligenceEngine.computeDeterministicRelatedNotes(selectedNoteForRelated, notes)
    : [];

  const brokenLinks = v2_23IntelligenceEngine.findBrokenLinks(notes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Automation, Intelligence & Reporting Center
                </h2>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  V2.23 Certified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deterministic rules, semantic stream, actionable attention, live derived metrics & grounded local AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/90 overflow-x-auto gap-1 text-xs font-medium">
          {[
            { id: 'automations', label: 'Automations & Rules', icon: Zap },
            { id: 'recurrence', label: 'Recurrence & Reminders', icon: Clock },
            { id: 'activity', label: 'Semantic Activity', icon: Activity },
            { id: 'attention', label: 'Attention Center', icon: AlertCircle },
            { id: 'continuity', label: 'Continuity & Changes', icon: RotateCcw },
            { id: 'dashboards', label: 'Live Dashboards', icon: BarChart3 },
            { id: 'reports', label: 'Review Evidence', icon: FileText },
            { id: 'ai_vault', label: 'Ask Vault & Smart Notes', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 font-semibold bg-indigo-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
          {/* TAB 1: AUTOMATIONS & RULES */}
          {activeTab === 'automations' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Left Column: Rules List */}
              <div className="lg:col-span-4 flex flex-col gap-4 border-r border-slate-800/80 pr-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Configured Rules ({rules.length})
                  </span>
                  <button
                    onClick={handleToggleGlobalPause}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                      isPaused
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isPaused ? 'Paused Globally' : 'Active'}
                  </button>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px]">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      onClick={() => {
                        setSelectedRuleId(rule.id);
                        setDryRunResult(null);
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        selectedRuleId === rule.id
                          ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{rule.name}</span>
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleRule(rule.id);
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                        />
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-2">{rule.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {rule.trigger.type}
                        </span>
                        <span>• {rule.actions.length} action(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Rule Details & Dry Run */}
              <div className="lg:col-span-8 flex flex-col gap-5">
                {activeRule ? (
                  <>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-base font-semibold text-white">{activeRule.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{activeRule.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSimulateDryRun}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>Dry Run Test</span>
                          </button>
                          <button
                            onClick={handleRunNow}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Run Now</span>
                          </button>
                        </div>
                      </div>

                      {/* When / If / Then Structured Definition */}
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs space-y-2">
                        <div className="text-indigo-400 font-semibold">
                          WHEN: <span className="text-slate-300">{activeRule.trigger.type} (Catch-up: {activeRule.trigger.schedule?.catchUpPolicy || 'none'})</span>
                        </div>
                        <div className="text-amber-400 font-semibold">
                          IF ({activeRule.conditionOperator}):{' '}
                          <span className="text-slate-300">
                            {activeRule.conditions.length > 0
                              ? activeRule.conditions.map((c) => `${c.field} ${c.operator} ${c.value}`).join(' AND ')
                              : 'Always true'}
                          </span>
                        </div>
                        <div className="text-emerald-400 font-semibold">
                          THEN:{' '}
                          <span className="text-slate-300">
                            {activeRule.actions.map((a) => a.description).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dry Run Simulation Output */}
                    {dryRunResult && (
                      <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sky-400 font-medium text-xs">
                            <Shield className="w-4 h-4" />
                            <span>Dry Run Simulation (Zero Mutation Guarantee)</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              dryRunResult.allConditionsPassed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {dryRunResult.allConditionsPassed ? 'Conditions Satisfied' : 'Conditions Unmet'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300">
                          <p>
                            <strong>Simulated Trigger:</strong> {dryRunResult.triggerReason}
                          </p>
                          <p>
                            <strong>Affected Resources:</strong> {dryRunResult.affectedResourceCount}
                          </p>
                          <div className="mt-2 space-y-1">
                            {dryRunResult.simulatedMutations.map((m, idx) => (
                              <div key={idx} className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300">
                                {m.summary}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Execution History */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Recent Execution Receipts ({executionLogs.length})
                      </h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {executionLogs.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No executions logged yet.</p>
                        ) : (
                          executionLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                {log.status === 'succeeded' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                {log.status === 'skipped' && <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                                {log.status === 'deduplicated' && <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />}
                                {log.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                                <span className="font-medium text-slate-200">{log.ruleName}</span>
                              </div>
                              <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                                <span className="uppercase font-mono">{log.status}</span>
                                <span>{new Date(log.executedTimeIso).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* TAB 2: RECURRENCE & REMINDERS */}
          {activeTab === 'recurrence' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recurrence Rule Previews */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Recurrence Calculation Engine</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">RFC-5545 Compliant</span>
                </div>
                <p className="text-xs text-slate-400">
                  Deterministic temporal calculations accounting for Daylight Saving Time (DST), Month-End (28/29/30/31), and Leap-Years.
                </p>

                {(() => {
                  const preview = v2_23IntelligenceEngine.previewRecurrence(
                    {
                      time: '08:00',
                      frequency: 'monthly',
                      dayOfMonth: 31,
                      monthEndPolicy: 'last_day',
                      catchUpPolicy: 'run_latest_missed',
                    },
                    recurrencePreviewCount
                  );

                  return (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-400">
                          <span>Timezone:</span> <strong className="text-slate-200">{preview.timezone}</strong>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Month-End Adjusted:</span> <strong className="text-emerald-400">Active (Clamp to valid days)</strong>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Leap Year Handling:</span> <strong className="text-indigo-400">Feb 29 auto-detected</strong>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-slate-300">Next {recurrencePreviewCount} Calculated Occurrences:</span>
                        <div className="mt-2 space-y-1.5 font-mono text-xs">
                          {preview.nextOccurrences.map((occ, i) => (
                            <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 flex justify-between">
                              <span>Occurrence #{i + 1}</span>
                              <span className="text-indigo-400">{occ}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Reminders List */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>Scheduled Reminders ({reminders.length})</span>
                  </h3>
                  <span className="text-xs text-slate-400">Reminder != Canonical Due Date</span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {reminders.map((rem) => (
                    <div key={rem.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">{rem.resourceTitle}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="capitalize px-1.5 py-0.2 bg-slate-800 rounded">{rem.resourceType}</span>
                          <span>Delivery: {new Date(rem.deliveryTimeIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {rem.snoozedUntilIso && (
                            <span className="text-amber-400">(Snoozed)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSnoozeReminder(rem.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-colors"
                        >
                          Snooze 1h
                        </button>
                        <button
                          onClick={() => handleDismissReminder(rem.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 text-xs rounded border border-slate-700 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY & SEMANTIC HISTORY */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter Domain:</span>
                  {(['project', 'review', 'decision', 'learning'] as V23ActivityCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActivityFilter(activityFilter === cat ? undefined : cat)}
                      className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                        activityFilter === cat
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-500">Noise Filter Active (No autosave or indexing noise)</span>
              </div>

              <div className="space-y-2">
                {activityEvents
                  .filter((e) => !activityFilter || e.category === activityFilter)
                  .map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-2 h-2 rounded-full bg-indigo-500" />
                        <div>
                          <div className="text-sm font-medium text-white">{evt.title}</div>
                          <p className="text-xs text-slate-400 mt-0.5">{evt.summary}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono uppercase text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {evt.category}
                        </span>
                        <span className="text-xs text-slate-500">{evt.dateOnly}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: ATTENTION CENTER */}
          {activeTab === 'attention' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Actionable Attention Items</h3>
                  <p className="text-xs text-slate-400">
                    Factual notifications with explicit rationale ("Why am I seeing this?") and auto-resolution.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-medium">
                  {attentionItems.length} Actionable Items
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attentionItems.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-white">{item.title}</span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                            item.severity === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                        <div className="text-slate-500 font-semibold text-[11px]">WHY AM I SEEING THIS?</div>
                        <div>{item.reason}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-xs text-slate-500 capitalize">Source: {item.sourceDomain}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcknowledgeAttention(item.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          {item.suggestedActionLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CONTINUITY & WHAT CHANGED */}
          {activeTab === 'continuity' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* What Changed Summary */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-indigo-400" />
                    <span>What Changed</span>
                  </h3>
                  <span className="text-xs text-slate-500">{whatChanged.sinceLabel}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <div className="text-lg font-bold text-emerald-400">{whatChanged.completedTasks}</div>
                    <div className="text-[11px] text-slate-400">Completed Tasks</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <div className="text-lg font-bold text-indigo-400">{whatChanged.recordedDecisions}</div>
                    <div className="text-[11px] text-slate-400">Decisions Logged</div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-2">
                  <div className="font-semibold text-slate-300">Status Changes:</div>
                  {whatChanged.statusChanges.map((sc, i) => (
                    <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs flex justify-between">
                      <span>{sc.resourceTitle}</span>
                      <span className="text-indigo-400">{sc.oldStatus} → {sc.newStatus}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Continue Signals */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                  <span>Continue / Resume</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Explainable continuity signals without artificial engagement optimization.
                </p>

                <div className="space-y-2">
                  {continueSignals.map((sig) => (
                    <div key={sig.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-sm font-medium text-white">{sig.resourceTitle}</div>
                      <div className="text-xs text-emerald-400">{sig.reason}</div>
                      <div className="text-[11px] text-slate-500 capitalize">Domain: {sig.domain}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flashbacks */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-400" />
                  <span>Historical Flashback</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Deterministic anniversaries and milestone reflections from your vault history.
                </p>

                <div className="space-y-2">
                  {flashbacks.map((f) => (
                    <div key={f.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-sky-400">
                        <span>{f.anniversaryYears} Years Ago Today</span>
                        <span className="text-slate-500 font-mono">{f.originalDateOnly}</span>
                      </div>
                      <div className="text-sm font-medium text-white">{f.resourceTitle}</div>
                      <div className="text-xs text-slate-400">{f.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DASHBOARDS & LIVE METRICS */}
          {activeTab === 'dashboards' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">{dashboards[0]?.title}</h3>
                  <p className="text-xs text-slate-400">{dashboards[0]?.description}</p>
                </div>
                <button
                  onClick={() => setShowChartTableFallback(!showChartTableFallback)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  {showChartTableFallback ? 'Show Visual Charts' : 'Show Accessible Table Mode'}
                </button>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['projects_active_count', 'learning_study_hours', 'finance_net_cash_flow_cents'].map((k) => {
                  const m = v2_23IntelligenceEngine.getMetricValue(k);
                  return (
                    <div key={k} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{m.label}</span>
                        <span className="text-emerald-400 font-medium">{m.periodLabel}</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {m.value} {m.unit && <span className="text-sm font-normal text-slate-400">{m.unit}</span>}
                      </div>
                      <div className="pt-2 border-t border-slate-800 text-[11px] flex justify-between text-slate-400">
                        <span>Coverage: {m.dataCoverage}</span>
                        <span className="font-mono text-indigo-400">{m.underlyingItemCount} items</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chart or Table Section */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Habit Consistency (7-Day Coverage)
                </h4>
                {showChartTableFallback ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Habit Target</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Coverage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        <tr>
                          <td className="p-2.5">2026-09-14</td>
                          <td className="p-2.5">Daily Routine & Review</td>
                          <td className="p-2.5 text-emerald-400 font-semibold">Completed</td>
                          <td className="p-2.5">100%</td>
                        </tr>
                        <tr>
                          <td className="p-2.5">2026-09-13</td>
                          <td className="p-2.5">Daily Routine & Review</td>
                          <td className="p-2.5 text-emerald-400 font-semibold">Completed</td>
                          <td className="p-2.5">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-40 flex items-end justify-between gap-3 pt-6 pb-2 px-4 bg-slate-950 rounded-lg border border-slate-800">
                    {[
                      { day: 'Mon', val: 100 },
                      { day: 'Tue', val: 80 },
                      { day: 'Wed', val: 100 },
                      { day: 'Thu', val: 100 },
                      { day: 'Fri', val: 100 },
                      { day: 'Sat', val: 60 },
                      { day: 'Sun', val: 100 },
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div
                          className="w-full bg-indigo-500/80 hover:bg-indigo-400 rounded-t transition-all"
                          style={{ height: `${bar.val}%` }}
                        />
                        <span className="text-[10px] text-slate-400 font-mono">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: REPORTS & REVIEW EVIDENCE */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">{currentReport.title}</h3>
                  <p className="text-xs text-slate-400">
                    Period: {currentReport.periodStart} to {currentReport.periodEnd} • Deterministic Snapshot
                  </p>
                </div>
                <button
                  onClick={() => {
                    const text = JSON.stringify(currentReport, null, 2);
                    navigator.clipboard?.writeText(text);
                    alert('Report JSON copied to clipboard.');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="space-y-4">
                {currentReport.factualSections.map((sec, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      {sec.title}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(sec.metrics).map(([k, v]) => (
                        <div key={k} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-center">
                          <div className="text-base font-bold text-white">{v}</div>
                          <div className="text-[11px] text-slate-400">{k}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {sec.items.map((item, idx) => (
                        <div key={idx} className="p-2 rounded bg-slate-950/60 text-xs flex justify-between">
                          <span className="font-medium text-slate-300">{item.label}</span>
                          <span className="text-slate-400">{item.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: ASK VAULT & LOCAL SMART NOTES */}
          {activeTab === 'ai_vault' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Local Smart Features & Related Notes */}
              <div className="lg:col-span-5 space-y-5 border-r border-slate-800/80 pr-6">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Deterministic Related Notes (Offline)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Explicit bidirectional links rank above inferred lexical/tag similarity with zero AI dependencies.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">Select Note to Inspect:</span>
                  <select
                    value={selectedNoteForRelated}
                    onChange={(e) => setSelectedNoteForRelated(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                  >
                    {notes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {relatedNotes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No related notes found for current selection.</p>
                  ) : (
                    relatedNotes.map((rn) => (
                      <div key={rn.noteId} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between font-medium text-slate-200">
                          <span>{rn.title}</span>
                          <span className="text-indigo-400 font-mono">Score: {(rn.score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{rn.explanation}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Broken Links */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Broken Wiki Link Audit ({brokenLinks.length})
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {brokenLinks.length === 0 ? (
                      <p className="text-xs text-emerald-400">All [[wikilinks]] in vault resolve properly.</p>
                    ) : (
                      brokenLinks.map((bl, i) => (
                        <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                          <span className="text-rose-400 font-mono">[[{bl.brokenTarget}]]</span> in{' '}
                          <span className="text-slate-300">{bl.sourceNoteTitle}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Ask Vault & Proposal Approval */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Ask Your Vault (Privacy & RAG)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Scoped candidate retrieval with pre-retrieval exclusion of sensitive domains.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      Mode: {aiConfig.providerMode}
                    </span>
                  </div>
                </div>

                {/* Question Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask a question about your vault..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAskVault}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Query
                  </button>
                </div>

                {/* Answer Box */}
                {aiAnswer && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in">
                    <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {aiAnswer.answerText}
                    </div>

                    {/* Citations */}
                    {aiAnswer.citations.length > 0 && (
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 space-y-1 text-xs">
                        <div className="font-semibold text-slate-400 text-[11px]">VERIFIED CITATIONS:</div>
                        {aiAnswer.citations.map((c, idx) => (
                          <div key={idx} className="text-indigo-400 font-mono text-[11px]">
                            {c.sourceHandle}: <span className="text-slate-300">{c.excerpt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Proposals Pending Approval */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    AI Proposed Actions ({aiProposals.length})
                  </h4>
                  <div className="space-y-2">
                    {aiProposals.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No pending AI proposals.</p>
                    ) : (
                      aiProposals.map((prop) => (
                        <div
                          key={prop.id}
                          className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-medium text-white">{prop.targetTitle}</div>
                            <div className="font-mono text-[11px] text-emerald-400">{prop.previewDiff}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {prop.status === 'pending_approval' ? (
                              <>
                                <button
                                  onClick={() => handleApplyProposal(prop.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectProposal(prop.id)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 rounded font-medium text-xs transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] font-mono capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                {prop.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>Deterministic Local Execution</span>
            <span>• Zero Autonomous Mutations</span>
            <span>• No Health/Financial Diagnostic Scoring</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors"
          >
            Close Center
          </button>
        </div>
      </div>
    </div>
  );
};
