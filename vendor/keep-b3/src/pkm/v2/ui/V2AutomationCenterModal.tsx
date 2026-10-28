/**
 * PKM V2.20 — Automation, Scheduling & Workflow Center Modal
 * 
 * Provides unified, accessible management for:
 * 1. Automation Rules (Triggers, conditions, safe actions, dry-run tester, circuit breaker controls)
 * 2. Interactive Routines (Active runs, step checklists, duration tracking)
 * 3. Habit Tracking (Streak calculations, freeze days, milestone achievements)
 * 4. Recurrence & Reminders (Snooze presets, quiet hours, missed trigger evaluation)
 * 5. Telemetry & Certification (Audit logs, performance metrics, 18 quality gates runner)
 */

import React, { useState, useEffect } from 'react';
import {
  Zap,
  RotateCcw,
  CheckCircle2,
  Bell,
  Activity,
  ShieldCheck,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  Clock,
  Flame,
  Plus,
  Trash2,
  X,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  v2AutomationEngine,
} from '../automation/v2AutomationEngine';
import { habitEngineV2 } from '../automation/habitEngineV2';
import { routineCoordinatorV2 } from '../automation/routineCoordinatorV2';
import { reminderCoordinatorV2 } from '../automation/reminderCoordinatorV2';
import {
  V2AutomationRule,
  V2AutomationExecutionLog,
  V2DryRunResult,
  V2HabitDefinition,
  V2HabitStreakStats,
  V2RoutineDefinition,
  V2RoutineRun,
  V2ReminderItem,
} from '../automation/automationTypesV2';
import {
  AutomationCertificationEngineV2,
  V220CertificationReport,
} from '../automation/automationCertificationEngineV2';
import { AdvancedRecurrenceEngineV2 } from '../automation/advancedRecurrenceEngineV2';

export interface V2AutomationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'automations' | 'routines' | 'habits' | 'reminders' | 'telemetry' | 'certification';

export const V2AutomationCenterModal: React.FC<V2AutomationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('automations');
  const [rules, setRules] = useState<V2AutomationRule[]>([]);
  const [habits, setHabits] = useState<V2HabitDefinition[]>([]);
  const [habitStats, setHabitStats] = useState<Record<string, V2HabitStreakStats>>({});
  const [routines, setRoutines] = useState<V2RoutineDefinition[]>([]);
  const [activeRuns, setActiveRuns] = useState<Record<string, V2RoutineRun>>({});
  const [reminders, setReminders] = useState<V2ReminderItem[]>([]);
  const [logs, setLogs] = useState<V2AutomationExecutionLog[]>([]);
  const [certReport, setCertReport] = useState<V220CertificationReport | null>(null);
  const [isRunningCert, setIsRunningCert] = useState(false);
  const [dryRunRule, setDryRunRule] = useState<V2AutomationRule | null>(null);
  const [dryRunResult, setDryRunResult] = useState<V2DryRunResult | null>(null);

  const refreshData = () => {
    setRules(v2AutomationEngine.getRules());
    const hList = habitEngineV2.getHabits();
    setHabits(hList);
    const statsMap: Record<string, V2HabitStreakStats> = {};
    for (const h of hList) {
      statsMap[h.id] = habitEngineV2.calculateStats(h.id);
    }
    setHabitStats(statsMap);
    setRoutines(routineCoordinatorV2.getRoutines());
    setReminders(reminderCoordinatorV2.getReminders());
    setLogs(v2AutomationEngine.getLogs());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleRule = (ruleId: string) => {
    const rule = v2AutomationEngine.getRule(ruleId);
    if (!rule) return;
    rule.enabled = !rule.enabled;
    if (rule.enabled && rule.status === 'disabled') {
      rule.status = 'active';
    } else if (!rule.enabled) {
      rule.status = 'disabled';
    }
    refreshData();
  };

  const handleResetCircuit = (ruleId: string) => {
    v2AutomationEngine.resetCircuitBreaker(ruleId);
    refreshData();
  };

  const handleRunDryTest = (rule: V2AutomationRule) => {
    setDryRunRule(rule);
    const result = v2AutomationEngine.dryRun(
      rule,
      {
        type: rule.trigger.type,
        resourceId: 'res-sample-mock',
        propertyKey: rule.trigger.propertyKey || 'priority',
        propertyValue: 'urgent',
        timestamp: Date.now(),
      },
      { priority: 'urgent', tags: ['inbox'] }
    );
    setDryRunResult(result);
  };

  const handleStartRoutine = (routineId: string) => {
    const run = routineCoordinatorV2.startRun(routineId);
    setActiveRuns((prev) => ({ ...prev, [routineId]: run }));
    refreshData();
  };

  const handleToggleRoutineStep = (routineId: string, stepId: string) => {
    const run = activeRuns[routineId];
    if (!run) return;
    const updated = routineCoordinatorV2.toggleStep(run.id, stepId);
    setActiveRuns((prev) => ({ ...prev, [routineId]: updated }));
    refreshData();
  };

  const handleLogHabitToday = (habitId: string) => {
    const today = AdvancedRecurrenceEngineV2.formatSafeDate(new Date());
    habitEngineV2.logHabit(habitId, today, 1);
    refreshData();
  };

  const handleLogHabitFreeze = (habitId: string) => {
    const today = AdvancedRecurrenceEngineV2.formatSafeDate(new Date());
    habitEngineV2.logHabit(habitId, today, 0, { isFreezeOrGrace: true });
    refreshData();
  };

  const handleSnooze = (reminderId: string) => {
    reminderCoordinatorV2.snoozeReminder(reminderId, '1_hour');
    refreshData();
  };

  const handleRunCertification = async () => {
    setIsRunningCert(true);
    const report = await AutomationCertificationEngineV2.runAllGates();
    setCertReport(report);
    setIsRunningCert(false);
  };

  return (
    <div
      id="automation-center-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div
        id="automation-center-modal-container"
        className="flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-neutral-100">
                Automation, Scheduling & Workflows
              </h2>
              <p className="text-xs text-neutral-400">
                V2.20 Proactive Local-First Engine • Deterministic Execution • No Cloud Agents
              </p>
            </div>
          </div>
          <button
            id="close-automation-modal-btn"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 px-6">
          <button
            id="tab-automations-btn"
            onClick={() => setActiveTab('automations')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'automations'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            Rules ({rules.length})
          </button>
          <button
            id="tab-routines-btn"
            onClick={() => setActiveTab('routines')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'routines'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            Routines ({routines.length})
          </button>
          <button
            id="tab-habits-btn"
            onClick={() => setActiveTab('habits')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'habits'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Flame className="h-4 w-4 text-orange-400" />
            Habits & Streaks ({habits.length})
          </button>
          <button
            id="tab-reminders-btn"
            onClick={() => setActiveTab('reminders')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'reminders'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Bell className="h-4 w-4" />
            Reminders ({reminders.length})
          </button>
          <button
            id="tab-telemetry-btn"
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'telemetry'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            Telemetry Logs ({logs.length})
          </button>
          <button
            id="tab-cert-btn"
            onClick={() => setActiveTab('certification')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'certification'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Quality Gates
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: AUTOMATIONS */}
          {activeTab === 'automations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-neutral-200">Active Automation Rules</h3>
                  <p className="text-xs text-neutral-400">
                    Event-driven triggers with condition trees and sandboxed safe actions
                  </p>
                </div>
                <button
                  onClick={refreshData}
                  className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              <div className="grid gap-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    id={`automation-card-${rule.id}`}
                    className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-850 p-4 transition-colors hover:border-neutral-700"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-100">{rule.name}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-2xs font-medium ${
                              rule.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : rule.status === 'paused_circuit_breaker'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-neutral-700 text-neutral-400'
                            }`}
                          >
                            {rule.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400">{rule.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {rule.status === 'paused_circuit_breaker' && (
                          <button
                            onClick={() => handleResetCircuit(rule.id)}
                            className="flex items-center gap-1 rounded border border-amber-600/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/20"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Reset Circuit
                          </button>
                        )}
                        <button
                          onClick={() => handleRunDryTest(rule)}
                          className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
                        >
                          <Play className="h-3 w-3 text-amber-400" />
                          Dry Run
                        </button>
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className={`rounded px-2.5 py-1 text-xs font-medium ${
                            rule.enabled
                              ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          }`}
                        >
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                      <div>
                        <span className="text-neutral-500">Trigger:</span>{' '}
                        <code className="rounded bg-neutral-800 px-1 py-0.5 text-amber-300">
                          {rule.trigger.type}
                        </code>
                      </div>
                      <div>
                        <span className="text-neutral-500">Actions:</span>{' '}
                        <span className="text-neutral-200">
                          {rule.actions.map((a) => a.actionClass).join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Executions:</span>{' '}
                        <span className="text-neutral-200">{rule.executionCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dry Run Modal / Inspector */}
              {dryRunRule && dryRunResult && (
                <div className="mt-6 rounded-lg border border-amber-500/40 bg-neutral-900 p-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <h4 className="text-sm font-semibold text-neutral-200">
                        Dry-Run Simulation: {dryRunRule.name}
                      </h4>
                    </div>
                    <button
                      onClick={() => setDryRunResult(null)}
                      className="text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <span>
                        Trigger Matched:{' '}
                        <strong
                          className={dryRunResult.triggerMatched ? 'text-emerald-400' : 'text-red-400'}
                        >
                          {String(dryRunResult.triggerMatched)}
                        </strong>
                      </span>
                      <span>
                        Conditions Passed:{' '}
                        <strong
                          className={dryRunResult.conditionsPassed ? 'text-emerald-400' : 'text-red-400'}
                        >
                          {String(dryRunResult.conditionsPassed)}
                        </strong>
                      </span>
                    </div>

                    <div>
                      <span className="font-medium text-neutral-300">Simulated Effects:</span>
                      <ul className="mt-1 list-inside list-disc text-neutral-400">
                        {dryRunResult.simulatedEffects.map((eff, i) => (
                          <li key={i}>{eff}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ROUTINES */}
          {activeTab === 'routines' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-neutral-200">Structured Routines</h3>
                  <p className="text-xs text-neutral-400">
                    Repeatable multi-step processes with progress tracking and step completion logs
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {routines.map((routine) => {
                  const activeRun = activeRuns[routine.id];
                  return (
                    <div
                      key={routine.id}
                      id={`routine-box-${routine.id}`}
                      className="flex flex-col rounded-lg border border-neutral-800 bg-neutral-850 p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-neutral-100">{routine.name}</h4>
                          <p className="mt-1 text-xs text-neutral-400">{routine.description}</p>
                          <div className="mt-2 flex items-center gap-3 text-2xs text-neutral-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> ~{routine.estimatedMinutes || 15} mins
                            </span>
                            <span>Daypart: {routine.timeOfDay}</span>
                          </div>
                        </div>

                        {!activeRun ? (
                          <button
                            onClick={() => handleStartRoutine(routine.id)}
                            className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
                          >
                            <Play className="h-3 w-3" /> Start
                          </button>
                        ) : (
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-2xs font-semibold text-emerald-400">
                            Active Session
                          </span>
                        )}
                      </div>

                      {/* Steps List */}
                      <div className="mt-4 space-y-2 border-t border-neutral-800 pt-3">
                        <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-500">
                          Checklist Steps
                        </span>
                        {routine.steps.map((step) => {
                          const isChecked = activeRun ? activeRun.stepStates[step.id] || false : false;
                          return (
                            <div
                              key={step.id}
                              onClick={() => activeRun && handleToggleRoutineStep(routine.id, step.id)}
                              className={`flex items-center gap-3 rounded p-2 text-xs transition-colors ${
                                activeRun ? 'cursor-pointer hover:bg-neutral-800' : 'opacity-70'
                              }`}
                            >
                              <div
                                className={`flex h-4 w-4 items-center justify-center rounded border ${
                                  isChecked
                                    ? 'border-emerald-500 bg-emerald-500 text-neutral-900'
                                    : 'border-neutral-600 bg-neutral-800'
                                }`}
                              >
                                {isChecked && <CheckCircle2 className="h-3 w-3" />}
                              </div>
                              <span
                                className={isChecked ? 'text-neutral-400 line-through' : 'text-neutral-200'}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: HABITS & STREAKS */}
          {activeTab === 'habits' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-neutral-200">Habit Tracking & Streaks</h3>
                  <p className="text-xs text-neutral-400">
                    Deterministic streak calculations with freeze day protection and milestone badges
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {habits.map((habit) => {
                  const stats = habitStats[habit.id];
                  return (
                    <div
                      key={habit.id}
                      id={`habit-card-${habit.id}`}
                      className="rounded-lg border border-neutral-800 bg-neutral-850 p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-neutral-100">{habit.name}</h4>
                          <p className="text-xs text-neutral-400">{habit.description}</p>
                          <span className="mt-1 inline-block rounded bg-neutral-800 px-2 py-0.5 text-2xs text-neutral-300">
                            Frequency: {habit.frequency}
                          </span>
                        </div>

                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-lg font-bold text-orange-400">
                            <Flame className="h-5 w-5" />
                            {stats?.currentStreak || 0}d
                          </div>
                          <span className="text-2xs text-neutral-500">
                            Best: {stats?.longestStreak || 0}d
                          </span>
                        </div>
                      </div>

                      {/* Stats & Badges */}
                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-neutral-800 pt-3 text-center text-xs">
                        <div className="rounded bg-neutral-900 p-2">
                          <span className="text-2xs text-neutral-500">30d Rate</span>
                          <p className="font-semibold text-neutral-200">
                            {Math.round((stats?.completionRate30d || 0) * 100)}%
                          </p>
                        </div>
                        <div className="rounded bg-neutral-900 p-2">
                          <span className="text-2xs text-neutral-500">Completions</span>
                          <p className="font-semibold text-neutral-200">
                            {stats?.totalCompletions || 0}
                          </p>
                        </div>
                        <div className="rounded bg-neutral-900 p-2">
                          <span className="text-2xs text-neutral-500">Freeze Days</span>
                          <p className="font-semibold text-neutral-200">
                            {stats?.freezeDaysUsed || 0}
                          </p>
                        </div>
                      </div>

                      {/* Log Action Buttons */}
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => handleLogHabitToday(habit.id)}
                          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                        >
                          Log Today (Done)
                        </button>
                        <button
                          onClick={() => handleLogHabitFreeze(habit.id)}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-700"
                        >
                          Freeze Day
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: REMINDERS */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-neutral-200">Local Reminders Queue</h3>
                  <p className="text-xs text-neutral-400">
                    Deterministic snooze presets and offline-first notification evaluation
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-850 p-4"
                  >
                    <div>
                      <h4 className="font-medium text-neutral-100">{rem.title}</h4>
                      <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                        <span>Due: {rem.dueDateOnly}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-2xs ${
                            rem.status === 'snoozed'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          Status: {rem.status}
                        </span>
                        {rem.snoozeCount > 0 && <span>Snoozed {rem.snoozeCount}x</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSnooze(rem.id)}
                        className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
                      >
                        Snooze 1h
                      </button>
                      <button
                        onClick={() => {
                          reminderCoordinatorV2.completeReminder(rem.id);
                          refreshData();
                        }}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-neutral-200">Execution Telemetry</h3>
                  <p className="text-xs text-neutral-400">
                    Bounded execution audit trail with loop detection, execution chain metrics and timings
                  </p>
                </div>
                <button
                  onClick={() => {
                    v2AutomationEngine.clearLogs();
                    refreshData();
                  }}
                  className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
                >
                  Clear Logs
                </button>
              </div>

              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="py-8 text-center text-xs text-neutral-500">
                    No execution events recorded yet.
                  </p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-850 p-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-2xs font-semibold ${
                            log.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : log.status === 'loop_prevented'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {log.status}
                        </span>
                        <div>
                          <strong className="text-neutral-200">{log.ruleName}</strong>
                          <span className="ml-2 text-neutral-500">[{log.triggerType}]</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-neutral-400">
                        <span>{log.durationMs}ms</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: QUALITY GATES */}
          {activeTab === 'certification' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-neutral-200">
                    V2.20 Quality Certification
                  </h3>
                  <p className="text-xs text-neutral-400">
                    18 Strict Quality Gates for Temporal Correctness, Invariants & Offline Safety
                  </p>
                </div>
                <button
                  id="run-automation-certification-btn"
                  onClick={handleRunCertification}
                  disabled={isRunningCert}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isRunningCert ? 'Running Verification...' : 'Run All 18 Gates'}
                </button>
              </div>

              {certReport && (
                <div className="space-y-4">
                  <div
                    className={`flex items-center justify-between rounded-lg p-4 ${
                      certReport.allPassed
                        ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border border-red-500/40 bg-red-500/10 text-red-300'
                    }`}
                  >
                    <div>
                      <strong className="text-sm">
                        {certReport.allPassed
                          ? 'All 18 Quality Gates Certified Successfully'
                          : 'Certification Incomplete'}
                      </strong>
                      <p className="text-xs opacity-80">
                        {certReport.passedGates} / {certReport.totalGates} Gates Passing
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {certReport.gateResults.map((gate) => (
                      <div
                        key={gate.gateId}
                        className="flex items-start justify-between rounded border border-neutral-800 bg-neutral-850 p-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-2xs font-semibold ${
                                gate.passed
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {gate.passed ? 'PASSED' : 'FAILED'}
                            </span>
                            <span className="font-semibold text-neutral-200">{gate.name}</span>
                          </div>
                          <p className="mt-1 text-neutral-400">{gate.details}</p>
                          {gate.error && <p className="mt-1 text-red-400">{gate.error}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
