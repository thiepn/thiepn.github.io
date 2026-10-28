/**
 * Phase P36: Automation Rule Builder Modal
 * Structured visual rule builder with live natural-language summary and interactive dry-run testing.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Tag as TagIcon,
  Folder as FolderIcon,
  FileText,
  Sliders,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import {
  AutomationRule,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
  AutomationTriggerType,
  AutomationConditionType,
  AutomationActionType,
  DryRunResult,
} from '../automationTypes';
import { automationEngine } from '../automationEngine';
import { generateRuleSummary } from '../ruleSummaryGenerator';

interface RuleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: AutomationRule) => Promise<void>;
  initialRule?: AutomationRule | null;
  notes: Note[];
  folders: Folder[];
}

export const RuleBuilderModal: React.FC<RuleBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRule,
  notes,
  folders,
}) => {
  const [name, setName] = useState(initialRule?.name || 'Untitled Rule');
  const [description, setDescription] = useState(initialRule?.description || '');
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>(initialRule?.priority || 'normal');

  // Trigger State
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(
    initialRule?.trigger.type || 'note_created'
  );
  const [triggerFolderId, setTriggerFolderId] = useState<string | null>(
    (initialRule?.trigger as any)?.folderId ?? null
  );
  const [triggerTag, setTriggerTag] = useState<string>((initialRule?.trigger as any)?.tag || '');
  const [triggerPropKey, setTriggerPropKey] = useState<string>(
    (initialRule?.trigger as any)?.propertyKey || ''
  );
  const [triggerPropTarget, setTriggerPropTarget] = useState<string>(
    (initialRule?.trigger as any)?.targetValue || ''
  );
  const [triggerHost, setTriggerHost] = useState<string>((initialRule?.trigger as any)?.sourceHost || '');
  const [scheduleTime, setScheduleTime] = useState<string>((initialRule?.trigger as any)?.time || '08:00');
  const [scheduleWeekdays, setScheduleWeekdays] = useState<string[]>(
    (initialRule?.trigger as any)?.weekdays || ['monday']
  );
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState<number>(
    (initialRule?.trigger as any)?.dayOfMonth || 1
  );
  const [scheduleIntervalDays, setScheduleIntervalDays] = useState<number>(
    (initialRule?.trigger as any)?.intervalDays || 1
  );

  // Conditions State
  const [conditionGroup, setConditionGroup] = useState<'ALL' | 'ANY'>(
    initialRule?.conditionGroup || 'ALL'
  );
  const [conditions, setConditions] = useState<AutomationCondition[]>(
    initialRule?.conditions ? JSON.parse(JSON.stringify(initialRule.conditions)) : []
  );

  // Actions State
  const [actions, setActions] = useState<AutomationAction[]>(
    initialRule?.actions
      ? JSON.parse(JSON.stringify(initialRule.actions))
      : [
          {
            type: 'set_property',
            key: 'status',
            value: 'active',
          },
        ]
  );

  // Options
  const [requireConfirmation, setRequireConfirmation] = useState(
    Boolean(initialRule?.options?.requireConfirmation)
  );
  const [stopOnError, setStopOnError] = useState(initialRule?.options?.stopOnError !== false);
  const [runOnSync, setRunOnSync] = useState(Boolean(initialRule?.options?.runOnSync));
  const [runOnImport, setRunOnImport] = useState(Boolean(initialRule?.options?.runOnImport));

  // Dry Run testing state
  const [testNoteId, setTestNoteId] = useState<string>(notes[0]?.id || '');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'test'>('builder');

  // Build temporary rule object for live summary & testing
  const currentRuleDraft: AutomationRule = useMemo(() => {
    let trigger: AutomationTrigger;

    if (triggerType === 'schedule_daily') {
      trigger = { type: 'schedule_daily', time: scheduleTime, catchUpPolicy: 'run_once' };
    } else if (triggerType === 'schedule_weekly') {
      trigger = {
        type: 'schedule_weekly',
        weekdays: scheduleWeekdays as any,
        time: scheduleTime,
        catchUpPolicy: 'run_once',
      };
    } else if (triggerType === 'schedule_monthly') {
      trigger = {
        type: 'schedule_monthly',
        dayOfMonth: scheduleDayOfMonth,
        monthEndPolicy: 'last_day',
        time: scheduleTime,
        catchUpPolicy: 'run_once',
      };
    } else if (triggerType === 'schedule_interval') {
      trigger = {
        type: 'schedule_interval',
        intervalDays: scheduleIntervalDays,
        time: scheduleTime,
        catchUpPolicy: 'run_once',
      };
    } else if (triggerType.startsWith('property_')) {
      trigger = {
        type: triggerType as any,
        propertyKey: triggerPropKey || 'status',
        targetValue: triggerPropTarget,
      };
    } else if (triggerType === 'tag_added' || triggerType === 'tag_removed') {
      trigger = { type: triggerType, tag: triggerTag };
    } else if (triggerType === 'browser_capture_committed') {
      trigger = { type: triggerType, sourceHost: triggerHost };
    } else {
      trigger = {
        type: triggerType as any,
        folderId: triggerFolderId,
        tag: triggerTag || undefined,
      };
    }

    return {
      id: initialRule?.id || 'draft-rule',
      schemaVersion: 1,
      name: name || 'Untitled Rule',
      description,
      enabled,
      status: enabled ? 'active' : 'disabled',
      priority,
      trigger,
      conditionGroup,
      conditions,
      actions,
      options: {
        requireConfirmation,
        stopOnError,
        runOnSync,
        runOnImport,
      },
      createdAt: initialRule?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }, [
    name,
    description,
    enabled,
    priority,
    triggerType,
    triggerFolderId,
    triggerTag,
    triggerPropKey,
    triggerPropTarget,
    triggerHost,
    scheduleTime,
    scheduleWeekdays,
    scheduleDayOfMonth,
    scheduleIntervalDays,
    conditionGroup,
    conditions,
    actions,
    requireConfirmation,
    stopOnError,
    runOnSync,
    runOnImport,
    initialRule,
  ]);

  const liveSummary = useMemo(() => {
    return generateRuleSummary(currentRuleDraft, folders);
  }, [currentRuleDraft, folders]);

  if (!isOpen) return null;

  // --- Handlers for Conditions ---
  const handleAddCondition = () => {
    const newCond: AutomationCondition = {
      id: `cond-${Date.now()}`,
      type: 'has_tag',
      value: 'active',
    };
    setConditions([...conditions, newCond]);
  };

  const handleUpdateCondition = (index: number, updated: Partial<AutomationCondition>) => {
    const next = [...conditions];
    next[index] = { ...next[index], ...updated };
    setConditions(next);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  // --- Handlers for Actions ---
  const handleAddAction = () => {
    const newAction: AutomationAction = {
      type: 'set_property',
      key: 'status',
      value: 'active',
    };
    setActions([...actions, newAction]);
  };

  const handleUpdateAction = (index: number, updated: any) => {
    const next = [...actions];
    next[index] = { ...next[index], ...updated };
    setActions(next);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleMoveAction = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === actions.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const next = [...actions];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setActions(next);
  };

  // --- Run Dry Run ---
  const handleRunDryRun = () => {
    const targetNote = notes.find((n) => n.id === testNoteId) || notes[0] || null;
    const result = automationEngine.dryRunRule(currentRuleDraft, targetNote);
    setDryRunResult(result);
  };

  const handleSaveClick = async () => {
    if (!name.trim()) return;
    await onSave(currentRuleDraft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialRule ? 'Edit Automation Rule' : 'New Automation Rule'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Deterministic triggers, condition logic, and atomic actions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-stone-100 dark:bg-stone-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('builder')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'builder'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Rule Configuration
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('test');
                  handleRunDryRun();
                }}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'test'
                    ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>Test & Dry Run</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Natural-Language Summary Banner */}
        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Summary: </span>
            <span>{liveSummary}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {activeTab === 'builder' ? (
            <>
              {/* Basic Rule Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Project Setup or Weekly Review"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Status & Priority
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEnabled(!enabled)}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        enabled
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
                      }`}
                    >
                      {enabled ? 'Active' : 'Disabled'}
                    </button>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="px-2.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                    >
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 1. WHEN (TRIGGER) */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <span>1. WHEN (TRIGGER)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                      Event Type
                    </label>
                    <select
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <optgroup label="Note Lifecycle">
                        <option value="note_created">Note Created</option>
                        <option value="note_updated">Note Updated & Saved</option>
                        <option value="note_renamed">Note Renamed</option>
                        <option value="note_moved">Note Moved</option>
                        <option value="note_restored">Note Restored from Trash</option>
                        <option value="note_archived">Note Archived</option>
                      </optgroup>
                      <optgroup label="Property & Tags">
                        <option value="property_added">Property Added</option>
                        <option value="property_changed">Property Changed</option>
                        <option value="property_becomes_value">Property Becomes Value</option>
                        <option value="property_removed">Property Removed</option>
                        <option value="tag_added">Tag Added</option>
                        <option value="tag_removed">Tag Removed</option>
                      </optgroup>
                      <optgroup label="Tasks">
                        <option value="task_completed">Task Checked Off</option>
                        <option value="task_reopened">Task Reopened</option>
                        <option value="all_tasks_completed">All Tasks Completed in Note</option>
                      </optgroup>
                      <optgroup label="Capture & Web">
                        <option value="quick_capture_committed">Quick Capture Saved</option>
                        <option value="browser_capture_committed">Browser Extension Capture</option>
                        <option value="pwa_share_committed">PWA Share Target Received</option>
                      </optgroup>
                      <optgroup label="Scheduled & Recurrence">
                        <option value="schedule_daily">Daily Schedule</option>
                        <option value="schedule_weekly">Weekly Schedule</option>
                        <option value="schedule_monthly">Monthly Schedule</option>
                        <option value="schedule_interval">Interval Schedule (N days)</option>
                        <option value="app_open">Application Launch</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Trigger Specific Parameters */}
                  {(triggerType === 'note_created' || triggerType === 'note_updated') && (
                    <div>
                      <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                        Limit to Folder (Optional)
                      </label>
                      <select
                        value={triggerFolderId || ''}
                        onChange={(e) => setTriggerFolderId(e.target.value || null)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                      >
                        <option value="">Any Folder / Root</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {triggerType.startsWith('property_') && (
                    <>
                      <div>
                        <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                          Property Key
                        </label>
                        <input
                          type="text"
                          value={triggerPropKey}
                          onChange={(e) => setTriggerPropKey(e.target.value)}
                          placeholder="e.g. status, priority, due"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                      {triggerType === 'property_becomes_value' && (
                        <div>
                          <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                            Target Value
                          </label>
                          <input
                            type="text"
                            value={triggerPropTarget}
                            onChange={(e) => setTriggerPropTarget(e.target.value)}
                            placeholder="e.g. done, active"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {(triggerType === 'tag_added' || triggerType === 'tag_removed') && (
                    <div>
                      <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                        Tag Name
                      </label>
                      <input
                        type="text"
                        value={triggerTag}
                        onChange={(e) => setTriggerTag(e.target.value)}
                        placeholder="e.g. project or #review"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  )}

                  {triggerType.startsWith('schedule_') && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                          Scheduled Time
                        </label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                      {triggerType === 'schedule_monthly' && (
                        <div className="w-24">
                          <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                            Day (1-31)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={scheduleDayOfMonth}
                            onChange={(e) => setScheduleDayOfMonth(parseInt(e.target.value, 10))}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                        </div>
                      )}
                      {triggerType === 'schedule_interval' && (
                        <div className="w-24">
                          <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                            Days
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={scheduleIntervalDays}
                            onChange={(e) => setScheduleIntervalDays(parseInt(e.target.value, 10))}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. IF (CONDITIONS) */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      2. IF (CONDITIONS)
                    </span>
                    <select
                      value={conditionGroup}
                      onChange={(e) => setConditionGroup(e.target.value as any)}
                      className="text-xs px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-bold"
                    >
                      <option value="ALL">ALL must match (AND)</option>
                      <option value="ANY">ANY may match (OR)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Condition</span>
                  </button>
                </div>

                {conditions.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-2">
                    No conditions configured. Trigger will always execute actions.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {conditions.map((cond, idx) => (
                      <div
                        key={cond.id || idx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs"
                      >
                        <select
                          value={cond.type}
                          onChange={(e) =>
                            handleUpdateCondition(idx, { type: e.target.value as any })
                          }
                          className="px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                        >
                          <option value="has_tag">Has Tag</option>
                          <option value="does_not_have_tag">Does Not Have Tag</option>
                          <option value="folder_equals">Folder Equals</option>
                          <option value="title_contains">Title Contains</option>
                          <option value="is_daily_note">Is Daily Note</option>
                          <option value="has_open_tasks">Has Open Tasks</option>
                          <option value="all_tasks_completed">All Tasks Completed</option>
                          <option value="property_exists">Property Exists</option>
                          <option value="property_equals">Property Equals</option>
                          <option value="property_not_equals">Property Not Equals</option>
                          <option value="is_archived">Is Archived</option>
                        </select>

                        {cond.type.startsWith('property_') && (
                          <input
                            type="text"
                            placeholder="Key (e.g. status)"
                            value={cond.field || ''}
                            onChange={(e) => handleUpdateCondition(idx, { field: e.target.value })}
                            className="w-28 px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                          />
                        )}

                        {cond.type === 'folder_equals' ? (
                          <select
                            value={cond.value || ''}
                            onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
                            className="flex-1 px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                          >
                            <option value="">Root / Unassigned</option>
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        ) : cond.type !== 'all_tasks_completed' &&
                          cond.type !== 'has_open_tasks' &&
                          cond.type !== 'property_exists' &&
                          cond.type !== 'is_daily_note' &&
                          cond.type !== 'is_archived' ? (
                          <input
                            type="text"
                            placeholder="Value"
                            value={cond.value || ''}
                            onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
                            className="flex-1 px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                          />
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(idx)}
                          className="p-1 rounded-lg text-stone-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. THEN (ACTIONS) */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    3. THEN (ACTIONS)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddAction}
                    className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Action</span>
                  </button>
                </div>

                {actions.length === 0 ? (
                  <p className="text-xs text-rose-500 italic py-2">
                    Rule must have at least one action.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {actions.map((act, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-stone-400">{idx + 1}.</span>
                            <select
                              value={act.type}
                              onChange={(e) =>
                                handleUpdateAction(idx, { type: e.target.value as any })
                              }
                              className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 font-bold"
                            >
                              <optgroup label="Property & Tags">
                                <option value="set_property">Set Frontmatter Property</option>
                                <option value="remove_property">Remove Property</option>
                                <option value="add_tag">Add Tag</option>
                                <option value="remove_tag">Remove Tag</option>
                              </optgroup>
                              <optgroup label="Note Modifications">
                                <option value="create_note">Create New Note</option>
                                <option value="move_note">Move to Folder</option>
                                <option value="rename_note">Rename Note</option>
                                <option value="append_markdown">Append Markdown Content</option>
                                <option value="prepend_markdown">Prepend Markdown Content</option>
                                <option value="insert_under_heading">Insert Under Heading</option>
                                <option value="archive_note">Archive Note</option>
                                <option value="move_to_trash">Move to Trash</option>
                              </optgroup>
                              <optgroup label="Tasks">
                                <option value="add_task">Add Task Checkbox</option>
                                <option value="complete_all_tasks">Mark All Tasks Complete</option>
                              </optgroup>
                              <optgroup label="Feedback">
                                <option value="show_in_app_notification">Show In-App Toast</option>
                              </optgroup>
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveAction(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-30"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveAction(idx, 'down')}
                              disabled={idx === actions.length - 1}
                              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-30"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAction(idx)}
                              className="p-1 text-stone-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Action details */}
                        {act.type === 'set_property' && (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Property Key (e.g. status)"
                              value={(act as any).key || ''}
                              onChange={(e) => handleUpdateAction(idx, { key: e.target.value })}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                            />
                            <input
                              type="text"
                              placeholder="Value (supports {{today}}, {{now}})"
                              value={(act as any).value || ''}
                              onChange={(e) => handleUpdateAction(idx, { value: e.target.value })}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                            />
                          </div>
                        )}

                        {act.type === 'create_note' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Title Template (e.g. Review {{year}}-W{{week}})"
                                value={(act as any).titleTemplate || ''}
                                onChange={(e) =>
                                  handleUpdateAction(idx, { titleTemplate: e.target.value })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                              />
                              <select
                                value={(act as any).folderId || ''}
                                onChange={(e) =>
                                  handleUpdateAction(idx, { folderId: e.target.value || null })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                              >
                                <option value="">Root / Unassigned Folder</option>
                                {folders.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Note Content (Markdown, variables supported)"
                              value={(act as any).contentTemplate || ''}
                              onChange={(e) =>
                                handleUpdateAction(idx, { contentTemplate: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 font-mono text-[11px]"
                            />
                          </div>
                        )}

                        {act.type === 'move_note' && (
                          <div>
                            <select
                              value={(act as any).targetFolderId || ''}
                              onChange={(e) =>
                                handleUpdateAction(idx, { targetFolderId: e.target.value || null })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                            >
                              <option value="">Root / Unassigned</option>
                              {folders.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {act.type === 'add_tag' && (
                          <input
                            type="text"
                            placeholder="Tag name (e.g. project)"
                            value={(act as any).tag || ''}
                            onChange={(e) => handleUpdateAction(idx, { tag: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                          />
                        )}

                        {act.type === 'add_task' && (
                          <input
                            type="text"
                            placeholder="Task description (e.g. Complete review for {{note.title}})"
                            value={(act as any).taskText || ''}
                            onChange={(e) => handleUpdateAction(idx, { taskText: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                          />
                        )}

                        {act.type === 'insert_under_heading' && (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Heading name (e.g. Next Actions)"
                              value={(act as any).heading || ''}
                              onChange={(e) => handleUpdateAction(idx, { heading: e.target.value })}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                            />
                            <input
                              type="text"
                              placeholder="Content to insert"
                              value={(act as any).content || ''}
                              onChange={(e) => handleUpdateAction(idx, { content: e.target.value })}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. SAFETY & EXECUTION OPTIONS */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-3 text-xs">
                <span className="font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider block">
                  Safety & Execution Options
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireConfirmation}
                      onChange={(e) => setRequireConfirmation(e.target.checked)}
                      className="rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span>Require confirmation before executing (Suggestion Mode)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stopOnError}
                      onChange={(e) => setStopOnError(e.target.checked)}
                      className="rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span>Stop subsequent actions if an error occurs</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            /* Dry Run / Test View */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-stone-100 dark:bg-stone-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Test with Note:
                  </span>
                  <select
                    value={testNoteId}
                    onChange={(e) => {
                      setTestNoteId(e.target.value);
                    }}
                    className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    {notes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title || 'Untitled'} ({n.id.slice(0, 10)}...)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRunDryRun}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Re-evaluate Simulation</span>
                </button>
              </div>

              {dryRunResult && (
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-xl border ${
                      dryRunResult.conditionsPassed && dryRunResult.triggerMatched
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {dryRunResult.conditionsPassed && dryRunResult.triggerMatched ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span>Simulation Passed — All Conditions Met</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span>
                            {!dryRunResult.triggerMatched
                              ? 'Trigger did not match simulation context'
                              : 'Conditions not met for this note'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Traces */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Condition Traces
                    </span>
                    {dryRunResult.conditionTraces.length === 0 ? (
                      <p className="text-xs text-stone-400">No conditions to evaluate.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {dryRunResult.conditionTraces.map((trace, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs"
                          >
                            <span>{trace.description}</span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded-md ${
                                trace.passed
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {trace.passed ? 'MATCH' : 'NO MATCH'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Proposed Actions */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Simulated Actions ({dryRunResult.wouldExecuteActions.length})
                    </span>
                    {dryRunResult.wouldExecuteActions.map((act, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono"
                      >
                        {act.type} (Safe simulation, no data modified)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-50 dark:bg-stone-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={!name.trim() || actions.length === 0}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-colors"
          >
            Save Automation Rule
          </button>
        </div>
      </div>
    </div>
  );
};
