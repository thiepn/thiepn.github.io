import React, { useState, useMemo } from 'react';
import { Experiment, ExperimentStatus } from '../decisionTypes';
import { decisionService } from '../decisionService';
import {
  Search,
  FlaskConical,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  GitBranch,
  Edit3,
  Trash2,
} from 'lucide-react';

interface ExperimentsTabProps {
  experiments: Experiment[];
  onNewExperiment: () => void;
  onEditExperiment: (experiment: Experiment) => void;
  onFollowUpExperiment: (prevExperiment: Experiment) => void;
}

export const ExperimentsTab: React.FC<ExperimentsTabProps> = ({
  experiments,
  onNewExperiment,
  onEditExperiment,
  onFollowUpExperiment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'planned' | 'completed' | 'inconclusive'>('all');

  const filteredExperiments = useMemo(() => {
    return experiments.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.hypothesis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.intervention.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.resultsNotes && e.resultsNotes.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = e.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [experiments, searchQuery, statusFilter]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this experiment?')) {
      decisionService.deleteExperiment(id);
    }
  };

  const getStatusBadge = (status: ExperimentStatus) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Running
          </span>
        );
      case 'planned':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Planned
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'inconclusive':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20">
            <HelpCircle className="w-3 h-3" />
            Inconclusive
          </span>
        );
      default:
        return (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            {status}
          </span>
        );
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
            placeholder="Search experiments, hypotheses, interventions, findings..."
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
            All ({experiments.length})
          </button>
          <button
            onClick={() => setStatusFilter('running')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'running'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Running
          </button>
          <button
            onClick={() => setStatusFilter('planned')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'planned'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Planned
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'completed'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Completed
          </button>
        </div>

        <button
          id="btn-new-experiment-tab"
          onClick={onNewExperiment}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors shrink-0 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New Experiment
        </button>
      </div>

      {/* Experiments List */}
      {filteredExperiments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
          <FlaskConical className="w-12 h-12 mx-auto text-stone-400 dark:text-stone-600 mb-3 stroke-[1.5]" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200 mb-1">
            No Experiments Found
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
            Test lifestyle, learning, or workflow interventions with clear hypotheses, baselines, and honest reflection.
          </p>
          <button
            onClick={onNewExperiment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-500 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Design Your First Experiment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExperiments.map((e) => {
            return (
              <div
                key={e.id}
                id={`exp-card-${e.id}`}
                className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500/50 shadow-xs flex flex-col justify-between space-y-3 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {getStatusBadge(e.status)}
                    <div className="flex items-center gap-1 text-stone-400">
                      <button
                        onClick={() => onEditExperiment(e)}
                        className="p-1 hover:text-stone-600 dark:hover:text-stone-200 rounded transition"
                        title="Edit experiment"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(evt) => handleDelete(e.id, evt)}
                        className="p-1 hover:text-rose-500 rounded transition"
                        title="Delete experiment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-2">
                    {e.title}
                  </h4>

                  {/* Hypothesis Box */}
                  <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                      Hypothesis
                    </span>
                    <p className="text-stone-800 dark:text-stone-200 line-clamp-2 font-sans">
                      {e.hypothesis}
                    </p>
                  </div>

                  {/* Intervention Box */}
                  <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                      Intervention
                    </span>
                    <p className="text-stone-800 dark:text-stone-200 line-clamp-2">
                      {e.intervention}
                    </p>
                  </div>

                  {/* Target Metrics if any */}
                  {e.targetMetrics && e.targetMetrics.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Target Metrics
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {e.targetMetrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-1.5 rounded bg-stone-50 dark:bg-stone-800 text-[11px]"
                          >
                            <span className="text-stone-500 block truncate">{m.name}</span>
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {m.currentValue || m.targetValue || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Results & Conclusions if completed */}
                  {e.resultsNotes && (
                    <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 space-y-0.5">
                      <span className="font-semibold block">Findings:</span>
                      <p className="text-stone-700 dark:text-stone-300 line-clamp-2">
                        {e.resultsNotes}
                      </p>
                    </div>
                  )}

                  {/* Follow up link */}
                  {e.followUpExperimentId && (
                    <div className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1 font-medium">
                      <GitBranch className="w-3 h-3" />
                      Follow-up experiment configured
                    </div>
                  )}
                </div>

                {/* Footer and Actions */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-400" />
                    <span>
                      {e.startDate} to {e.endDate}
                    </span>
                  </div>

                  {e.status === 'completed' && !e.followUpExperimentId && (
                    <button
                      onClick={() => onFollowUpExperiment(e)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 font-semibold transition"
                    >
                      <GitBranch className="w-3 h-3" />
                      Follow-up
                    </button>
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
