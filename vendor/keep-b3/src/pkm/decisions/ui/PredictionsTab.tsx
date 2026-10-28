import React, { useState, useMemo } from 'react';
import { Prediction, PredictionStatus } from '../decisionTypes';
import { decisionService } from '../decisionService';
import {
  Search,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  AlertCircle,
  History,
  FileCheck,
  HelpCircle,
  Trash2,
  Edit3,
} from 'lucide-react';

interface PredictionsTabProps {
  predictions: Prediction[];
  onNewPrediction: () => void;
  onResolvePrediction: (prediction: Prediction) => void;
  onEditPrediction: (prediction: Prediction) => void;
}

export const PredictionsTab: React.FC<PredictionsTabProps> = ({
  predictions,
  onNewPrediction,
  onResolvePrediction,
  onEditPrediction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'due' | 'resolved'>('all');
  const [inspectingRevisionId, setInspectingRevisionId] = useState<string | null>(null);

  const filteredPredictions = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return predictions.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.statement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.outcome?.actualValue && p.outcome.actualValue.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'open') {
        matchesStatus = p.status === 'open';
      } else if (statusFilter === 'due') {
        matchesStatus = Boolean(p.status === 'open' && p.resolutionDate && p.resolutionDate <= todayStr);
      } else if (statusFilter === 'resolved') {
        matchesStatus = p.status === 'resolved';
      }

      return matchesSearch && matchesStatus;
    });
  }, [predictions, searchQuery, statusFilter]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this prediction?')) {
      decisionService.deletePrediction(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search prediction statements, outcomes, reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-stone-50 dark:bg-stone-800/60 rounded-lg border border-stone-200 dark:border-stone-700/60 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            All ({predictions.length})
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'open'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setStatusFilter('due')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'due'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Due for Review
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'resolved'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Resolved
          </button>
        </div>

        <button
          id="btn-new-prediction-tab"
          onClick={onNewPrediction}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors shrink-0 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New Prediction
        </button>
      </div>

      {/* Predictions List */}
      {filteredPredictions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
          <Sparkles className="w-12 h-12 mx-auto text-stone-400 dark:text-stone-600 mb-3 stroke-[1.5]" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200 mb-1">
            No Predictions Found
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
            Record explicit, testable forecasts with estimated confidence to measure and refine your intuitive judgment over time.
          </p>
          <button
            onClick={onNewPrediction}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-500 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create Your First Prediction
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPredictions.map((p) => {
            const isDue =
              p.status === 'open' &&
              p.resolutionDate &&
              p.resolutionDate <= new Date().toISOString().slice(0, 10);

            const isInspecting = inspectingRevisionId === p.id;

            return (
              <div
                key={p.id}
                id={`pred-card-${p.id}`}
                className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 shadow-xs space-y-3 transition-all"
              >
                {/* Header line */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {p.title}
                      </span>
                      {p.decisionId && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                          Attached to Decision
                        </span>
                      )}
                      {p.revisionHistory && p.revisionHistory.length > 0 && (
                        <button
                          onClick={() =>
                            setInspectingRevisionId(isInspecting ? null : p.id)
                          }
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 transition"
                        >
                          <History className="w-3 h-3" />
                          {p.revisionHistory.length} revision(s)
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-sans">
                      {p.statement}
                    </p>
                  </div>

                  {/* Confidence meter & Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {p.confidence !== undefined && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                          <span>{p.confidence}%</span>
                          <div className="w-12 h-2 rounded-full bg-amber-200 dark:bg-amber-900 overflow-hidden">
                            <div
                              className="h-full bg-amber-600 dark:bg-amber-400 rounded-full"
                              style={{ width: `${p.confidence}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {p.status === 'open' && (
                        <button
                          onClick={() => onResolvePrediction(p)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-stone-400">
                      <button
                        onClick={() => onEditPrediction(p)}
                        className="p-1 hover:text-stone-600 dark:hover:text-stone-200 rounded transition"
                        title="Edit prediction"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(p.id, e)}
                        className="p-1 hover:text-rose-500 rounded transition"
                        title="Delete prediction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Outcome Display if Resolved */}
                {p.outcome && (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      p.outcome.result === 'correct'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-200'
                        : p.outcome.result === 'incorrect'
                        ? 'bg-rose-500/5 border-rose-500/20 text-rose-950 dark:text-rose-200'
                        : 'bg-stone-500/5 border-stone-500/20 text-stone-900 dark:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        {p.outcome.result === 'correct' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : p.outcome.result === 'incorrect' ? (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        ) : (
                          <HelpCircle className="w-4 h-4 text-stone-500" />
                        )}
                        Outcome: {p.outcome.result.toUpperCase()}
                      </span>
                      <span className="text-[11px] font-normal text-stone-500">
                        Resolved on {p.outcome.resolvedAt.slice(0, 10)}
                      </span>
                    </div>

                    {p.outcome.actualValue && (
                      <div>
                        <strong>Actual Result:</strong> {p.outcome.actualValue}
                      </div>
                    )}

                    {p.outcome.reflectionNotes && (
                      <div className="text-stone-600 dark:text-stone-400 italic">
                        <strong>Reflection:</strong> "{p.outcome.reflectionNotes}"
                      </div>
                    )}
                  </div>
                )}

                {/* Revision history drawer if open */}
                {isInspecting && p.revisionHistory && p.revisionHistory.length > 0 && (
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-xs space-y-2">
                    <div className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-600" />
                      Prediction Statement Audit Log (Hindsight-Safe)
                    </div>
                    {p.revisionHistory.map((rev, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-0.5 text-[11px]"
                      >
                        <div className="flex items-center justify-between text-stone-500 font-mono">
                          <span>{rev.timestamp.slice(0, 16).replace('T', ' ')}</span>
                          {rev.previousConfidence !== undefined && (
                            <span>Prior Confidence: {rev.previousConfidence}%</span>
                          )}
                        </div>
                        <div className="text-stone-800 dark:text-stone-200 line-through opacity-70">
                          {rev.previousStatement}
                        </div>
                        <div className="text-stone-500 italic">Reason: {rev.reason}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-1">
                  <div className="flex items-center gap-3">
                    <span>Created {p.createdAt.slice(0, 10)}</span>
                    {p.resolutionDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        Target Resolution: {p.resolutionDate}
                      </span>
                    )}
                  </div>

                  {isDue && (
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded text-[10px]">
                      <AlertCircle className="w-3 h-3" />
                      Due for Resolution
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
