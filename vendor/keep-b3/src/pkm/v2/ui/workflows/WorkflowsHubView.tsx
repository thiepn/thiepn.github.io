import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  Zap,
  Plus,
  CheckCircle2,
  AlertCircle,
  Layers,
  Clock,
  ChevronRight,
  Shield,
  FileText,
} from 'lucide-react';
import { routineEngineV2 } from '../../workflows/routineEngineV2';
import { automationEngineV2 } from '../../workflows/automationEngineV2';
import { actionSequenceExecutor } from '../../workflows/actionSequenceExecutor';
import { WorkflowPresetV2, RoutineDefinitionV2, AutomationRuleV2 } from '../../workflows/workflowTypes';
import { RoutineRunModal } from './RoutineRunModal';
import { AutomationBuilderModal } from './AutomationBuilderModal';

export const BUILTIN_WORKFLOW_PRESETS_V2: WorkflowPresetV2[] = [
  {
    id: 'preset-daily-startup',
    name: 'Daily Startup Sequence',
    description: 'Triage quick inbox items, align top focus, and verify today’s scheduled commitments',
    iconName: 'Play',
    category: 'productivity',
    isBuiltIn: true,
    order: 1,
    steps: [
      { actionId: 'core:create-note', label: 'Initialize Daily Working Pad', args: { title: 'Working Pad' } },
      { actionId: 'view:query-today', label: 'Load Today Index', optional: true },
    ],
  },
  {
    id: 'preset-sprint-closing',
    name: 'Sprint Closing Sequence',
    description: 'Archive finished tasks, prepare summary reflection, and advance overdue milestones',
    iconName: 'Layers',
    category: 'productivity',
    isBuiltIn: true,
    order: 2,
    steps: [
      { actionId: 'review:start-weekly-review', label: 'Open Sprint Review Workspace' },
    ],
  },
];

export const WorkflowsHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'presets' | 'routines' | 'automations' | 'logs'>('presets');
  const [routines, setRoutines] = useState<RoutineDefinitionV2[]>(() => routineEngineV2.getRoutines());
  const [automations, setAutomations] = useState<AutomationRuleV2[]>(() => automationEngineV2.getRules());
  const [presets] = useState<WorkflowPresetV2[]>(BUILTIN_WORKFLOW_PRESETS_V2);

  // Modals
  const [selectedRoutineForRun, setSelectedRoutineForRun] = useState<RoutineDefinitionV2 | null>(null);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationRuleV2 | undefined>(undefined);
  const [presetReport, setPresetReport] = useState<any | null>(null);

  const handleRunPreset = async (preset: WorkflowPresetV2) => {
    const report = await actionSequenceExecutor.executeSequence(
      preset.id,
      preset.name,
      preset.steps
    );
    setPresetReport(report);
  };

  const handleToggleAutomation = (ruleId: string) => {
    const rule = automationEngineV2.getRule(ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      rule.status = rule.enabled ? 'active' : 'disabled';
      setAutomations([...automationEngineV2.getRules()]);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-stone-50 dark:bg-stone-950 overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Workflows, Routines & Automations
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Deterministic orchestration hub: manual sequence presets, repeatable routines, and loop-protected trigger rules
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-amber-500" />
            Presets ({presets.length})
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'routines'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
            Routines ({routines.length})
          </button>
          <button
            onClick={() => setActiveTab('automations')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'automations'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
            Automations ({automations.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-stone-400" />
            Execution Logs
          </button>
        </div>
      </div>

      {/* Preset Run Report Toast (if any) */}
      {presetReport && (
        <div className="mx-6 mt-4 p-3 bg-stone-900 text-white rounded-xl shadow-lg border border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>{presetReport.presetName}</strong>: Completed {presetReport.completedSteps} of {presetReport.totalSteps} steps.
            </span>
          </div>
          <button
            onClick={() => setPresetReport(null)}
            className="text-stone-400 hover:text-white font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6 max-w-6xl w-full mx-auto">
        {/* TAB 1: PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Workflow Presets are linear sequences of actions run on-demand with human confirmation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        {preset.name}
                      </h3>
                      <span className="text-[11px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">
                        {preset.steps.length} Steps
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {preset.description}
                    </p>

                    <div className="pt-2 space-y-1">
                      {preset.steps.map((s, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-stone-600 dark:text-stone-300 flex items-center gap-1.5"
                        >
                          <span className="w-3.5 h-3.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-400 font-mono text-[9px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          {s.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                    <button
                      onClick={() => handleRunPreset(preset)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Run Sequence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ROUTINES */}
        {activeTab === 'routines' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Routines are trackable multi-step processes designed for daily rhythm without streak gamification guilt.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: routine.color || '#6366f1' }}
                        />
                        <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                          {routine.name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-stone-400 capitalize">
                        {routine.daypart || 'anytime'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {routine.description}
                    </p>

                    <div className="pt-2 space-y-1.5">
                      {routine.steps.map((step, idx) => (
                        <div
                          key={step.id}
                          className="text-xs text-stone-700 dark:text-stone-300 flex items-center gap-2"
                        >
                          <span className="font-mono text-stone-400 text-[10px]">{idx + 1}.</span>
                          <span>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                    <button
                      onClick={() => setSelectedRoutineForRun(routine)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start Today's Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AUTOMATIONS */}
        {activeTab === 'automations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Automations trigger deterministic actions when events occur, protected by chain-depth limits and action safety rules.
              </p>
              <button
                onClick={() => {
                  setEditingAutomation(undefined);
                  setIsAutomationModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Rule
              </button>
            </div>

            <div className="space-y-3">
              {automations.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {rule.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          rule.enabled
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                        }`}
                      >
                        {rule.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      When: <code className="text-indigo-600 dark:text-indigo-400">{rule.trigger.type}</code> ·{' '}
                      Then: <code className="text-emerald-600 dark:text-emerald-400">{rule.actions.map((a) => a.actionClass).join(', ')}</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAutomation(rule.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        rule.enabled
                          ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {rule.enabled ? 'Pause' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Audit log of recent automated triggers and execution receipts.
            </p>

            {automationEngineV2.getLogs().length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs text-stone-400">
                No automation execution logs recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {automationEngineV2.getLogs().map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-stone-800 dark:text-stone-200">
                        {log.ruleName}
                      </span>
                      <p className="text-stone-400 text-[11px]">
                        Trigger: {log.triggerType} · Duration: {log.durationMs}ms
                      </p>
                    </div>
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        log.status === 'success' ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Routine Run Modal */}
      {selectedRoutineForRun && (
        <RoutineRunModal
          isOpen={true}
          onClose={() => setSelectedRoutineForRun(null)}
          routine={selectedRoutineForRun}
        />
      )}

      {/* Automation Builder Modal */}
      {isAutomationModalOpen && (
        <AutomationBuilderModal
          isOpen={true}
          onClose={() => setIsAutomationModalOpen(false)}
          onSaved={(newRule) => {
            setAutomations([...automationEngineV2.getRules()]);
          }}
          initialRule={editingAutomation}
        />
      )}
    </div>
  );
};
