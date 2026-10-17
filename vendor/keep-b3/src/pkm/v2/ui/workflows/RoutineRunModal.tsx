import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  X,
  Play,
  CheckCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { RoutineDefinitionV2, RoutineRunV2 } from '../../workflows/workflowTypes';
import { routineEngineV2 } from '../../workflows/routineEngineV2';
import { getTodayDateOnly } from '../../temporal/recurrenceEngineV2';

interface RoutineRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  routine: RoutineDefinitionV2;
}

export const RoutineRunModal: React.FC<RoutineRunModalProps> = ({
  isOpen,
  onClose,
  routine,
}) => {
  const today = getTodayDateOnly();
  const [run, setRun] = useState<RoutineRunV2>(() =>
    routineEngineV2.startRun(routine.id, today)
  );
  const [closingNotes, setClosingNotes] = useState(run.notes || '');

  if (!isOpen) return null;

  const handleToggleStep = async (stepId: string) => {
    const updated = await routineEngineV2.toggleStep(run.id, stepId);
    setRun(updated);
  };

  const handleFinishRun = () => {
    const updated = routineEngineV2.finishRun(run.id, closingNotes);
    setRun(updated);
    onClose();
  };

  const completedCount = Object.values(run.stepStates).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / routine.steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-lg text-white font-bold"
              style={{ backgroundColor: routine.color || '#6366f1' }}
            >
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {routine.name}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {routine.description || `Active session for ${today}`}
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

        {/* Progress Bar */}
        <div className="w-full bg-stone-200 dark:bg-stone-800 h-1.5">
          <div
            className="h-1.5 transition-all duration-300 bg-amber-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps List */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-medium">
            <span>Progress: {completedCount} of {routine.steps.length} steps</span>
            <span>{progressPercent}% completed</span>
          </div>

          <div className="space-y-2">
            {routine.steps.map((step, idx) => {
              const isChecked = !!run.stepStates[step.id];

              return (
                <div
                  key={step.id}
                  onClick={() => handleToggleStep(step.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isChecked
                      ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-300 dark:border-amber-800'
                      : 'bg-stone-50 dark:bg-stone-950/60 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    {isChecked ? (
                      <CheckCircle2 className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isChecked
                          ? 'text-stone-500 line-through dark:text-stone-400'
                          : 'text-stone-900 dark:text-stone-100'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.note && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {step.note}
                      </p>
                    )}
                    {step.type === 'safe_action' && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                        <Sparkles className="w-3 h-3" /> Automated Action
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-stone-400">{idx + 1}</span>
                </div>
              );
            })}
          </div>

          {/* Reflection Notes */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Session Notes / Closing Reflection (Optional)
            </label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Log thoughts, insights, or modifications for next time..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            Save & Continue Later
          </button>
          <button
            type="button"
            onClick={handleFinishRun}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" /> Complete Routine
          </button>
        </div>
      </div>
    </div>
  );
};
