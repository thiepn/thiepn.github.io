/**
 * Workflow Runner Modal
 * 
 * Provides an accessible, interactive execution dialog for Workflow Presets:
 * - Shows clear step-by-step progress and status
 * - Reports completed steps and detailed error messages if any step fails
 * - Allows re-running or closing with single click
 */

import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { WorkflowPreset, WorkflowExecutionReport } from '../personalizationTypes';
import { workflowPresetsManager } from '../workflowPresetsManager';

interface WorkflowRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: WorkflowPreset | null;
  runtimeContext: any;
}

export const WorkflowRunnerModal: React.FC<WorkflowRunnerModalProps> = ({
  isOpen,
  onClose,
  preset,
  runtimeContext,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<WorkflowExecutionReport | null>(null);

  if (!isOpen || !preset) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setReport(null);
    try {
      const res = await workflowPresetsManager.executeWorkflow(preset.id, runtimeContext);
      setReport(res);
    } catch (err: any) {
      setReport({
        presetId: preset.id,
        presetName: preset.name,
        startedAt: new Date().toISOString(),
        success: false,
        totalSteps: preset.steps.length,
        completedSteps: 0,
        stepResults: [],
        errorMessage: err?.message || 'Execution failed',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {preset.name}
              </h2>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                {preset.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-600 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
            Workflow Steps ({preset.steps.length})
          </div>

          <div className="space-y-2">
            {preset.steps.map((step, idx) => {
              const stepResult = report?.stepResults.find((r) => r.stepIndex === idx + 1);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">
                      {step.label || step.actionId}
                    </span>
                  </div>

                  <div>
                    {stepResult?.success && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {stepResult && !stepResult.success && (
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    )}
                    {!stepResult && isRunning && (
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Execution Result Banner */}
          {report && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                report.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {report.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <div>
                <div className="font-semibold">
                  {report.success ? 'Workflow Completed Successfully' : 'Workflow Stopped Early'}
                </div>
                <div className="text-[11px] opacity-90">
                  {report.success
                    ? `Executed ${report.completedSteps} of ${report.totalSteps} steps.`
                    : report.errorMessage}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            disabled={isRunning}
            onClick={handleRun}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            {report ? 'Run Again' : 'Execute Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
};
