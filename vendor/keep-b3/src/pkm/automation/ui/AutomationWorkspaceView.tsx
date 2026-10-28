/**
 * Phase P36: Automation Center Workspace View Surface
 * Comprehensive workspace surface for managing rules, execution history logs, recipes, and diagnostics.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Edit2,
  Trash2,
  History,
  BookOpen,
  Activity,
  ArrowRight,
  Clock,
  Tag,
  Folder as FolderIcon,
  ShieldAlert,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import {
  AutomationRule,
  AutomationLogEntry,
  AutomationTriggerType,
} from '../automationTypes';
import { automationEngine } from '../automationEngine';
import { generateRuleSummary, getTriggerSummary } from '../ruleSummaryGenerator';
import { BUILTIN_RECIPES, AutomationRecipe } from '../recipes';
import { RuleBuilderModal } from './RuleBuilderModal';

interface AutomationWorkspaceViewProps {
  allNotes: Note[];
  folders: Folder[];
  activeNoteId?: string;
  onOpenNote?: (noteId: string) => void;
}

export const AutomationWorkspaceView: React.FC<AutomationWorkspaceViewProps> = ({
  allNotes,
  folders,
  activeNoteId,
  onOpenNote,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'logs' | 'recipes' | 'doctor'>('rules');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'needs_attention'>('all');

  // Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Sync state with engine
  const refreshData = async () => {
    setRules(automationEngine.getRules());
    setIsPaused(automationEngine.isPaused());
    const loadedLogs = await automationEngine.getLogs();
    setLogs(loadedLogs);
  };

  useEffect(() => {
    refreshData();
    const unsub = automationEngine.subscribe(() => {
      refreshData();
    });
    return () => unsub();
  }, []);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (statusFilter === 'active' && !rule.enabled) return false;
      if (statusFilter === 'disabled' && rule.enabled) return false;
      if (statusFilter === 'needs_attention' && rule.status !== 'needs_attention') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rule.name.toLowerCase().includes(q);
        const matchesDesc = (rule.description || '').toLowerCase().includes(q);
        const matchesTrigger = rule.trigger.type.toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesTrigger;
      }
      return true;
    });
  }, [rules, searchQuery, statusFilter]);

  // Health Diagnostics
  const healthReport = useMemo(() => {
    return automationEngine.checkAutomationHealth(allNotes, folders);
  }, [allNotes, folders, rules]);

  // Actions
  const handleTogglePause = async () => {
    await automationEngine.setPaused(!isPaused);
  };

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    await automationEngine.toggleRule(ruleId, !currentEnabled);
  };

  const handleRunRuleNow = async (ruleId: string) => {
    await automationEngine.runRuleNow(ruleId, activeNoteId);
  };

  const handleDuplicateRule = async (ruleId: string) => {
    await automationEngine.duplicateRule(ruleId);
  };

  const handleDeleteRule = async (ruleId: string) => {
    await automationEngine.deleteRule(ruleId);
  };

  const handleInstallRecipe = async (recipe: AutomationRecipe) => {
    await automationEngine.saveRule({
      ...recipe.rule,
      name: recipe.name,
      description: recipe.description,
    });
    setActiveTab('rules');
  };

  const handleUndoLog = async (logId: string) => {
    await automationEngine.undoRun(logId);
  };

  const handleClearLogs = async () => {
    await automationEngine.clearLogs();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#fdfcfb] dark:bg-[#121215] overflow-hidden text-stone-900 dark:text-stone-100">
      {/* Top Banner / Master Pause State */}
      {isPaused && (
        <div className="px-6 py-2.5 bg-amber-500/15 border-b border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <Pause className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Automations Master Switch is PAUSED. Scheduled and event rules will not execute.</span>
          </div>
          <button
            type="button"
            onClick={handleTogglePause}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors"
          >
            Resume All Automations
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-white/70 dark:bg-stone-900/60 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Automation Center
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Deterministic, local rules & recurring scheduled workflows
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePause}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors ${
              isPaused
                ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Engine' : 'Pause All'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingRule(null);
              setIsBuilderOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Rule</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-6 border-b border-stone-200 dark:border-stone-800 flex items-center gap-6 text-xs font-bold shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Rules ({rules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Execution Log ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recipes')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'recipes'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Recipe Gallery ({BUILTIN_RECIPES.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('doctor')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'doctor'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Diagnostics</span>
          {!healthReport.healthy && (
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'rules' && (
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter rules by name, trigger, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  All ({rules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  Active ({rules.filter((r) => r.enabled).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('disabled')}
                  className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                    statusFilter === 'disabled'
                      ? 'bg-stone-500 text-white border-stone-500'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  Disabled ({rules.filter((r) => !r.enabled).length})
                </button>
              </div>
            </div>

            {/* Rules List */}
            {filteredRules.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-300 dark:border-stone-800 rounded-2xl p-8 space-y-3">
                <Sliders className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                  No matching automation rules found
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRule(null);
                    setIsBuilderOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"
                >
                  Create Your First Rule
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => {
                  const summary = generateRuleSummary(rule, folders);
                  const triggerText = getTriggerSummary(rule.trigger, folders);

                  return (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        rule.enabled
                          ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs'
                          : 'bg-stone-50/70 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 opacity-75'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-[240px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                              {rule.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                rule.enabled
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
                              }`}
                            >
                              {rule.enabled ? 'Active' : 'Disabled'}
                            </span>
                            {rule.status === 'needs_attention' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Needs Attention</span>
                              </span>
                            )}
                            {rule.options?.requireConfirmation && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                Suggestion Mode
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                            {summary}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-stone-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Trigger: {triggerText}</span>
                            </span>
                            <span>•</span>
                            <span>{rule.actions.length} action(s)</span>
                            {rule.lastExecutedAt && (
                              <>
                                <span>•</span>
                                <span>
                                  Last run: {new Date(rule.lastExecutedAt).toLocaleTimeString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleRule(rule.id, rule.enabled)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                              rule.enabled
                                ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            }`}
                          >
                            {rule.enabled ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRunRuleNow(rule.id)}
                            title="Run rule immediately"
                            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingRule(rule);
                              setIsBuilderOpen(true);
                            }}
                            title="Edit rule"
                            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateRule(rule.id)}
                            title="Duplicate rule"
                            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            title="Delete rule"
                            className="p-1.5 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/60 text-stone-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Execution Activity Log</h3>
                <p className="text-xs text-stone-500">
                  Bounded local ring-buffer of rule executions, durations, and state transitions.
                </p>
              </div>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-500 hover:text-rose-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Clear History
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-300 dark:border-stone-800 rounded-2xl p-8">
                <History className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-xs text-stone-500">No automation executions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {log.status === 'failed' && <XCircle className="w-4 h-4 text-rose-500" />}
                        {log.status === 'loop_detected' && (
                          <ShieldAlert className="w-4 h-4 text-amber-500" />
                        )}
                        {log.status === 'suggestion_pending' && (
                          <Sparkles className="w-4 h-4 text-indigo-500" />
                        )}
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {log.ruleName}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          ({log.triggerType})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-stone-400 text-[11px]">
                        <span>{log.durationMs}ms</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        {log.isUndoable && (
                          <button
                            type="button"
                            onClick={() => handleUndoLog(log.id)}
                            className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Undo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {log.error && (
                      <p className="text-rose-500 text-[11px] font-mono bg-rose-500/10 p-2 rounded-lg">
                        {log.error}
                      </p>
                    )}

                    {log.actionResults && log.actionResults.length > 0 && (
                      <div className="pl-6 space-y-1">
                        {log.actionResults.map((ar, i) => (
                          <div key={i} className="text-[11px] text-stone-500 flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-stone-400">↳</span>
                            <span className="font-medium text-stone-700 dark:text-stone-300">
                              {ar.actionType}:
                            </span>
                            <span>{ar.details || ar.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h3 className="text-sm font-bold">Curated Automation Recipes</h3>
              <p className="text-xs text-stone-500">
                Pre-configured workflows tailored for PKM and research that install in one click.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BUILTIN_RECIPES.map((recipe) => (
                <div
                  key={recipe.id}
                  className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {recipe.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {recipe.name}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      {recipe.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-[11px] text-stone-400">
                      {recipe.rule.actions.length} action(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleInstallRecipe(recipe)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Install Recipe</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'doctor' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Automation Health & Integrity</h3>
                <p className="text-xs text-stone-500">
                  Scans rules for broken references, missing folders, non-existent templates, or execution loops.
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                healthReport.healthy
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {healthReport.healthy ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>All Automation Rules Healthy & Verified</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <span>Integrity Issues Detected ({healthReport.issues.length})</span>
                  </>
                )}
              </div>
            </div>

            {healthReport.issues.length > 0 && (
              <div className="space-y-2">
                {healthReport.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs flex items-start gap-3"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {issue.ruleName}:{' '}
                      </span>
                      <span className="text-stone-600 dark:text-stone-300">{issue.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rule Builder Modal */}
      {isBuilderOpen && (
        <RuleBuilderModal
          isOpen={isBuilderOpen}
          initialRule={editingRule}
          notes={allNotes}
          folders={folders}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingRule(null);
          }}
          onSave={async (savedRule) => {
            await automationEngine.saveRule(savedRule);
          }}
        />
      )}
    </div>
  );
};
