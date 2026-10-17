import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  AutomationRuleV2,
  AutomationTriggerTypeV2,
  AutomationSafeActionClass,
  AutomationConditionV2,
} from '../../workflows/workflowTypes';
import { automationEngineV2, ALLOWED_AUTOMATION_ACTION_CLASSES } from '../../workflows/automationEngineV2';

interface AutomationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (rule: AutomationRuleV2) => void;
  initialRule?: AutomationRuleV2;
}

export const AutomationBuilderModal: React.FC<AutomationBuilderModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialRule,
}) => {
  const [name, setName] = useState(initialRule?.name || '');
  const [description, setDescription] = useState(initialRule?.description || '');
  const [triggerType, setTriggerType] = useState<AutomationTriggerTypeV2>(
    initialRule?.trigger.type || 'task_completed'
  );
  const [conditions, setConditions] = useState<AutomationConditionV2[]>(
    initialRule?.conditions || []
  );
  const [actions, setActions] = useState<
    Array<{ actionId: string; actionClass: AutomationSafeActionClass; params: Record<string, any> }>
  >(
    initialRule?.actions || [
      {
        actionId: 'core:create-note',
        actionClass: 'create_note',
        params: { title: 'New Automation Note' },
      },
    ]
  );
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        id: `cond_${Date.now()}`,
        field: 'priority',
        operator: 'equals',
        value: 'High',
      },
    ]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const handleTestSimulation = () => {
    const draftRule: AutomationRuleV2 = {
      id: initialRule?.id || `auto_${Date.now()}`,
      name: name || 'Untitled Automation',
      description,
      enabled: true,
      status: 'active',
      trigger: { type: triggerType },
      conditionGroup: 'ALL',
      conditions,
      actions,
      createdAt: initialRule?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const sim = automationEngineV2.dryRun(
      draftRule,
      {
        type: triggerType,
        resourceType: 'task',
        timestamp: Date.now(),
      },
      { priority: 'High' }
    );
    setDryRunResult(sim);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const savedRule: AutomationRuleV2 = {
      id: initialRule?.id || `auto_${Date.now()}`,
      name: name.trim(),
      description,
      enabled: true,
      status: 'active',
      trigger: { type: triggerType },
      conditionGroup: 'ALL',
      conditions,
      actions,
      createdAt: initialRule?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    automationEngineV2.registerRule(savedRule);
    onSaved(savedRule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Bounded trigger-condition-action workflow with loop protection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Rule Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                Rule Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. When high-priority task finishes, append to sprint log"
                className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section 1: When (Trigger) */}
          <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              1. When (Trigger Event)
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as AutomationTriggerTypeV2)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="task_completed">Task Completed</option>
              <option value="resource_created">Resource Created</option>
              <option value="tag_added">Tag Added</option>
              <option value="schedule_time">Scheduled Time (Cron/Schedule)</option>
              <option value="review_due">Review Due</option>
              <option value="routine_expected">Routine Expected</option>
            </select>
          </div>

          {/* Section 2: If (Conditions) */}
          <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                2. If (Conditions Filter)
              </label>
              <button
                type="button"
                onClick={handleAddCondition}
                className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Condition
              </button>
            </div>

            {conditions.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No conditions set (runs for all matching trigger events).</p>
            ) : (
              <div className="space-y-2">
                {conditions.map((cond) => (
                  <div key={cond.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      value={cond.field}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConditions(conditions.map((c) => (c.id === cond.id ? { ...c, field: val } : c)));
                      }}
                      placeholder="field (e.g. priority)"
                      className="w-1/3 px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded text-stone-900 dark:text-stone-100"
                    />
                    <select
                      value={cond.operator}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setConditions(conditions.map((c) => (c.id === cond.id ? { ...c, operator: val } : c)));
                      }}
                      className="w-1/3 px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded text-stone-900 dark:text-stone-100"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="contains">Contains</option>
                      <option value="starts_with">Starts With</option>
                    </select>
                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConditions(conditions.map((c) => (c.id === cond.id ? { ...c, value: val } : c)));
                      }}
                      placeholder="value"
                      className="w-1/3 px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded text-stone-900 dark:text-stone-100"
                    />
                    <button
                      onClick={() => handleRemoveCondition(cond.id)}
                      className="p-1 text-stone-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Then (Actions) */}
          <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                3. Then (Safe Actions)
              </label>
              <span className="text-[11px] text-stone-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Safe Action Whitelist Only
              </span>
            </div>

            <div className="space-y-2">
              {actions.map((act, idx) => (
                <div key={idx} className="p-2.5 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {act.actionClass}
                    </span>
                    <span className="text-stone-500 dark:text-stone-400">
                      ({act.actionId})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Simulation / Dry Run Preview */}
          {dryRunResult && (
            <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-300 dark:border-stone-700 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-700 dark:text-stone-300 uppercase">
                  Dry Run Simulation Result
                </span>
                <span
                  className={`font-semibold ${
                    dryRunResult.conditionsPassed ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {dryRunResult.conditionsPassed ? 'Conditions Passed' : 'Conditions Filtered Out'}
                </span>
              </div>
              <p className="text-stone-500 dark:text-stone-400">
                Trigger Matched: {dryRunResult.triggerMatched ? 'Yes' : 'No'} · Actions would run:{' '}
                {dryRunResult.wouldExecuteActions.length}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex justify-between items-center">
          <button
            type="button"
            onClick={handleTestSimulation}
            className="px-3.5 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Test Simulation (Dry Run)
          </button>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow transition-colors"
            >
              Save Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
