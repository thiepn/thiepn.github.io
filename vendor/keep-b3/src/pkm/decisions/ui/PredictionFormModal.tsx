import React, { useState } from 'react';
import { Prediction, PredictionType } from '../decisionTypes';
import { decisionService } from '../decisionService';
import { X, Sparkles, AlertCircle } from 'lucide-react';

interface PredictionFormModalProps {
  initialPrediction?: Prediction;
  initialDecisionId?: string;
  onClose: () => void;
  onSaved: (prediction: Prediction) => void;
}

export const PredictionFormModal: React.FC<PredictionFormModalProps> = ({
  initialPrediction,
  initialDecisionId,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState(initialPrediction?.title || '');
  const [statement, setStatement] = useState(initialPrediction?.statement || '');
  const [confidence, setConfidence] = useState<number>(
    initialPrediction?.confidence !== undefined ? initialPrediction.confidence : 75
  );
  const [predictionType, setPredictionType] = useState<PredictionType>(
    initialPrediction?.predictionType || 'binary'
  );
  const [resolutionDate, setResolutionDate] = useState(
    initialPrediction?.resolutionDate || ''
  );
  const [selectedDecisionId, setSelectedDecisionId] = useState(
    initialPrediction?.decisionId || initialDecisionId || ''
  );
  const [revisionReason, setRevisionReason] = useState('');

  const decisions = decisionService.getDecisions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !statement.trim()) return;

    if (initialPrediction) {
      // Editing existing prediction with audit
      const updated = decisionService.updatePredictionWithAudit(
        initialPrediction.id,
        {
          title: title.trim(),
          statement: statement.trim(),
          confidence,
          predictionType,
          resolutionDate: resolutionDate || undefined,
          decisionId: selectedDecisionId || undefined,
        },
        revisionReason.trim() || undefined
      );

      if (updated) {
        onSaved(updated);
      }
      return;
    }

    // Creating new prediction
    const newPrediction: Prediction = {
      id: `pred-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      decisionId: selectedDecisionId || undefined,
      title: title.trim(),
      statement: statement.trim(),
      predictionType,
      confidence,
      createdAt: new Date().toISOString(),
      resolutionDate: resolutionDate || undefined,
      status: 'open',
      revisionHistory: [],
    };

    const saved = decisionService.savePrediction(newPrediction);
    onSaved(saved);
  };

  const isEditing = Boolean(initialPrediction);
  const isStatementOrConfidenceModified =
    isEditing &&
    initialPrediction &&
    (statement !== initialPrediction.statement || confidence !== initialPrediction.confidence);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isEditing ? 'Edit Prediction (Audited)' : 'Record New Prediction'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Prediction Title / Short Label *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 Book Reading Target"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Falsifiable Prediction Statement *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Be specific. State clearly what will happen, by when, and how it will be verified."
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Your Confidence: <span className="text-amber-600 dark:text-amber-400 font-mono">{confidence}%</span>
              </label>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                <span>50% (Coin flip)</span>
                <span>75%</span>
                <span>100% (Certain)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Target Resolution Date
              </label>
              <input
                type="date"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Attach to Decision (Optional)
            </label>
            <select
              value={selectedDecisionId}
              onChange={(e) => setSelectedDecisionId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">None (Standalone Prediction)</option>
              {decisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          {isStatementOrConfidenceModified && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Hindsight-Safe Audit Notice
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-300">
                To preserve historical integrity, changing your statement or confidence will record a timestamped revision entry.
              </p>
              <input
                type="text"
                placeholder="Reason for modifying this forecast..."
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900"
              />
            </div>
          )}

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
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition shadow-xs"
            >
              {isEditing ? 'Save Revision' : 'Record Prediction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
