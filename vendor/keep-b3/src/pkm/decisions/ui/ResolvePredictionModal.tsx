import React, { useState } from 'react';
import { Prediction, PredictionResult, PredictionOutcome } from '../decisionTypes';
import { decisionService } from '../decisionService';
import { X, CheckCircle2, AlertCircle, HelpCircle, XCircle } from 'lucide-react';

interface ResolvePredictionModalProps {
  prediction: Prediction;
  onClose: () => void;
  onResolved: (updated: Prediction) => void;
}

export const ResolvePredictionModal: React.FC<ResolvePredictionModalProps> = ({
  prediction,
  onClose,
  onResolved,
}) => {
  const [result, setResult] = useState<PredictionResult>('correct');
  const [actualValue, setActualValue] = useState('');
  const [reflectionNotes, setReflectionNotes] = useState('');

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();

    const outcome: PredictionOutcome = {
      result,
      actualValue: actualValue.trim() || undefined,
      resolvedAt: new Date().toISOString(),
      reflectionNotes: reflectionNotes.trim() || undefined,
    };

    const updated = decisionService.resolvePrediction(prediction.id, outcome);
    if (updated) {
      onResolved(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Resolve Prediction Outcome
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleResolve} className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-1">
            <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
              {prediction.title}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-300">
              "{prediction.statement}"
            </div>
            {prediction.confidence !== undefined && (
              <div className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 pt-1">
                Forecasted Confidence: {prediction.confidence}%
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1.5">
              Empirical Result *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResult('correct')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  result === 'correct'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Correct (True)
              </button>

              <button
                type="button"
                onClick={() => setResult('incorrect')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  result === 'incorrect'
                    ? 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                Incorrect (False)
              </button>

              <button
                type="button"
                onClick={() => setResult('partially')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  result === 'partially'
                    ? 'bg-amber-50 text-amber-700 border-amber-400 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Partially Correct
              </button>

              <button
                type="button"
                onClick={() => setResult('unresolvable')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  result === 'unresolvable'
                    ? 'bg-stone-200 text-stone-800 border-stone-400 dark:bg-stone-800 dark:text-stone-200'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-stone-500" />
                Unresolvable / Void
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              What Actually Happened (Empirical Evidence)
            </label>
            <input
              type="text"
              placeholder="e.g. Scored 91% on exam, finished 5 books"
              value={actualValue}
              onChange={(e) => setActualValue(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Hindsight Reflection & Calibration Takeaway
            </label>
            <textarea
              rows={3}
              placeholder="Were you overconfident? What factor did you fail to account for?"
              value={reflectionNotes}
              onChange={(e) => setReflectionNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-xs"
            >
              Save Resolution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
