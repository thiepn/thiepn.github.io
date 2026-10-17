import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Target,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';
import { planTodayWorkflowEngine } from '../../planning/planTodayWorkflow';
import { aiPlanProposalEngine } from '../../planning/aiPlanProposal';
import { AIPlanProposal } from '../../planning/planningTypes';
import { getTodayDateOnly } from '../../temporal/recurrenceEngineV2';

interface PlanTodayModalProps {
  isOpen: boolean;
  onClose: () => void;
  openTasks?: Array<{ id: string; title: string; priority?: string; due?: string }>;
  onOpenDailyNote?: () => void;
}

export const PlanTodayModal: React.FC<PlanTodayModalProps> = ({
  isOpen,
  onClose,
  openTasks = [
    { id: 'task_1', title: 'Review V2.3 Temporal Architecture spec', priority: 'high', due: getTodayDateOnly() },
    { id: 'task_2', title: 'Complete RFC 5545 recurrence test suite', priority: 'urgent', due: getTodayDateOnly() },
    { id: 'task_3', title: 'Audit project next actions for sprint alignment', priority: 'medium' },
  ],
  onOpenDailyNote,
}) => {
  const today = getTodayDateOnly();
  const [plan, setPlan] = useState(planTodayWorkflowEngine.getOrCreatePlan(today));
  const [newFocusTitle, setNewFocusTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:30');
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [aiProposal, setAiProposal] = useState<AIPlanProposal | null>(null);
  const [createDailyNoteChecked, setCreateDailyNoteChecked] = useState(false);

  if (!isOpen) return null;

  const handleAddFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFocusTitle.trim()) return;
    const updated = planTodayWorkflowEngine.addFocusItem(today, {
      resourceId: `custom_${Date.now()}`,
      resourceType: 'task',
      title: newFocusTitle.trim(),
    });
    setPlan(updated);
    setNewFocusTitle('');
  };

  const handleRemoveFocus = (id: string) => {
    const updated = planTodayWorkflowEngine.removeFocusItem(today, id);
    setPlan(updated);
  };

  const handleScheduleTask = (e: React.FormEvent) => {
    e.preventDefault();
    const task = openTasks.find((t) => t.id === selectedTaskId);
    if (!task) return;

    const res = planTodayWorkflowEngine.scheduleTaskForToday(task.id, task.title, scheduleTime, today);
    if (res.conflictWarning) {
      setConflictNotice(res.conflictWarning);
    } else {
      setConflictNotice(null);
    }
    setPlan(planTodayWorkflowEngine.getOrCreatePlan(today));
  };

  const handleRequestAIPlan = () => {
    const proposal = aiPlanProposalEngine.generateProposal(openTasks, today);
    setAiProposal(proposal);
  };

  const handleApplyAIProposal = () => {
    if (!aiProposal) return;
    for (const item of aiProposal.proposedFocus) {
      planTodayWorkflowEngine.addFocusItem(today, {
        resourceId: item.resourceId,
        resourceType: 'task',
        title: item.title,
        scheduledTime: item.suggestedTime,
        reason: item.rationale,
      });
      if (item.suggestedTime) {
        planTodayWorkflowEngine.scheduleTaskForToday(item.resourceId, item.title, item.suggestedTime, today);
      }
    }
    setPlan(planTodayWorkflowEngine.getOrCreatePlan(today));
    setAiProposal(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Plan Today · {today}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Align daily focus, schedule tasks into time blocks, and set intentions
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

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* AI Plan Assistant Trigger */}
          <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Suggest a plan for today
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Generates an explicit, conflict-aware proposal. Requires your confirmation before applying.
                </p>
              </div>
            </div>
            <button
              onClick={handleRequestAIPlan}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
            >
              Generate Proposal
            </button>
          </div>

          {/* AI Proposal Preview Box (if active) */}
          {aiProposal && (
            <div className="p-4 bg-stone-100 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Proposed Daily Focus & Schedule
                </span>
                <button
                  onClick={() => setAiProposal(null)}
                  className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  Dismiss
                </button>
              </div>
              <div className="space-y-2">
                {aiProposal.proposedFocus.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {item.title}
                      </span>
                      <p className="text-stone-500 dark:text-stone-400">{item.rationale}</p>
                    </div>
                    {item.suggestedTime && (
                      <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded font-mono font-bold text-stone-700 dark:text-stone-300">
                        {item.suggestedTime}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {aiProposal.detectedConflicts.length > 0 && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Detected {aiProposal.detectedConflicts.length} potential calendar conflict(s).
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setAiProposal(null)}
                  className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyAIProposal}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold"
                >
                  Approve & Apply Plan
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Top Daily Focus */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-500" />
                Top Daily Focus (1-3 Essential Outcomes)
              </label>
              <span className="text-xs text-stone-400">{plan.focusItems.length} items</span>
            </div>

            <div className="space-y-2">
              {plan.focusItems.map((item) => (
                <div
                  key={item.id}
                  className="px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-stone-800 dark:text-stone-200">{item.title}</span>
                    {item.scheduledTime && (
                      <span className="text-xs font-mono text-stone-500 bg-stone-200 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                        {item.scheduledTime}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveFocus(item.id)}
                    className="text-stone-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddFocus} className="flex gap-2">
              <input
                type="text"
                placeholder="Add essential daily outcome..."
                value={newFocusTitle}
                onChange={(e) => setNewFocusTitle(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-stone-800 dark:bg-stone-700 hover:bg-stone-700 dark:hover:bg-stone-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>
          </div>

          {/* Section 2: Task Scheduling */}
          <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              Schedule Open Task Into Time Slot
            </label>

            {conflictNotice && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{conflictNotice}</span>
              </div>
            )}

            <form onSubmit={handleScheduleTask} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="sm:col-span-2 px-3 py-2 text-sm bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="">Select an open task...</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} {t.due ? `(Due ${t.due})` : ''}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-24 px-2 py-2 text-sm bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!selectedTaskId}
                  className="flex-1 px-3 py-2 bg-stone-800 dark:bg-stone-700 hover:bg-stone-700 dark:hover:bg-stone-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Daily Note Option */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={createDailyNoteChecked}
                onChange={(e) => setCreateDailyNoteChecked(e.target.checked)}
                className="rounded border-stone-400 text-amber-500 focus:ring-amber-500"
              />
              <span>Open today's Daily Note journal upon finishing</span>
            </label>

            {createDailyNoteChecked && onOpenDailyNote && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Ready to link
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (createDailyNoteChecked && onOpenDailyNote) {
                onOpenDailyNote();
              }
              onClose();
            }}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow transition-colors"
          >
            Finish Planning
          </button>
        </div>
      </div>
    </div>
  );
};
