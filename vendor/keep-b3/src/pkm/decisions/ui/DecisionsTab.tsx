import React, { useState, useMemo } from 'react';
import { Decision, DecisionStatus } from '../decisionTypes';
import { decisionService } from '../decisionService';
import {
  Search,
  Scale,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  GitBranch,
  FolderGit2,
  Target,
  Sparkles,
  ArrowRight,
  Filter,
  Plus,
} from 'lucide-react';

interface DecisionsTabProps {
  decisions: Decision[];
  onSelectDecision: (decision: Decision) => void;
  onNewDecision: () => void;
}

export const DecisionsTab: React.FC<DecisionsTabProps> = ({
  decisions,
  onSelectDecision,
  onNewDecision,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const domains = useMemo(() => {
    const set = new Set<string>();
    decisions.forEach((d) => {
      if (d.domain) set.add(d.domain);
    });
    return Array.from(set);
  }, [decisions]);

  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      const matchesSearch =
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.context && d.context.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.rationale && d.rationale.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      const today = new Date().toISOString().slice(0, 10);

      if (statusFilter === 'considering') {
        matchesStatus = d.status === 'considering' || d.status === 'draft';
      } else if (statusFilter === 'decided') {
        matchesStatus = d.status === 'decided';
      } else if (statusFilter === 'review_due') {
        matchesStatus = Boolean(d.reviewDate && d.reviewDate <= today && d.status !== 'reviewed');
      } else if (statusFilter === 'reversed_superseded') {
        matchesStatus = d.status === 'reversed' || d.status === 'superseded';
      } else if (statusFilter !== 'all') {
        matchesStatus = d.status === statusFilter;
      }

      const matchesDomain = selectedDomain === 'all' || d.domain === selectedDomain;

      return matchesSearch && matchesStatus && matchesDomain;
    });
  }, [decisions, searchQuery, statusFilter, selectedDomain]);

  const getStatusBadge = (status: DecisionStatus) => {
    switch (status) {
      case 'decided':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Decided
          </span>
        );
      case 'considering':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Considering
          </span>
        );
      case 'superseded':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <GitBranch className="w-3 h-3" />
            Superseded
          </span>
        );
      case 'reversed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Reversed
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Sparkles className="w-3 h-3" />
            Reviewed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20">
            <HelpCircle className="w-3 h-3" />
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
            placeholder="Search decisions, context, rationale..."
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
            All ({decisions.length})
          </button>
          <button
            onClick={() => setStatusFilter('considering')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'considering'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Considering
          </button>
          <button
            onClick={() => setStatusFilter('decided')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'decided'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Decided
          </button>
          <button
            onClick={() => setStatusFilter('review_due')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'review_due'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Review Due
          </button>
          <button
            onClick={() => setStatusFilter('reversed_superseded')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'reversed_superseded'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Reversals & Lineage
          </button>
        </div>

        {/* Domain selector & New button */}
        <div className="flex items-center gap-2">
          {domains.length > 0 && (
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Domains</option>
              {domains.map((dom) => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
          )}

          <button
            id="btn-new-decision-tab"
            onClick={onNewDecision}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Decision
          </button>
        </div>
      </div>

      {/* Decision Cards or Empty */}
      {filteredDecisions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
          <Scale className="w-12 h-12 mx-auto text-stone-400 dark:text-stone-600 mb-3 stroke-[1.5]" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200 mb-1">
            No Decisions Matching Filter
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
            Preserve reasoning, compare alternatives, and track predictions to learn from your choices over time.
          </p>
          <button
            onClick={onNewDecision}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-500 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Record a Meaningful Decision
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecisions.map((dec) => {
            const options = decisionService.getOptionsForDecision(dec.id);
            const selectedOpt = options.find((o) => o.status === 'selected');
            const assumptions = decisionService.getAssumptionsForDecision(dec.id);
            const predictions = decisionService.getPredictionsForDecision(dec.id);

            const isReviewDue =
              dec.reviewDate &&
              dec.reviewDate <= new Date().toISOString().slice(0, 10) &&
              dec.status !== 'reviewed';

            return (
              <div
                key={dec.id}
                id={`decision-card-${dec.id}`}
                onClick={() => onSelectDecision(dec)}
                className="group cursor-pointer flex flex-col justify-between p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-md transition-all relative overflow-hidden"
              >
                <div>
                  {/* Header badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(dec.status)}
                      {dec.domain && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                          {dec.domain}
                        </span>
                      )}
                    </div>
                    {dec.confidence !== undefined && (
                      <span className="text-[11px] font-mono font-medium text-stone-500 dark:text-stone-400">
                        {dec.confidence}% Conf.
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 mb-2">
                    {dec.title}
                  </h4>

                  {/* Selected Option or Options summary */}
                  {selectedOpt ? (
                    <div className="mb-3 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
                        Selected Choice
                      </span>
                      <p className="text-xs font-medium text-stone-800 dark:text-stone-200 line-clamp-1">
                        {selectedOpt.title}
                      </p>
                    </div>
                  ) : options.length > 0 ? (
                    <div className="mb-3 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/50">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block mb-0.5">
                        {options.length} Option{options.length > 1 ? 's' : ''} Considered
                      </span>
                      <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-1">
                        {options.map((o) => o.title).join(' · ')}
                      </p>
                    </div>
                  ) : null}

                  {/* Context excerpt */}
                  {dec.context && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mb-3">
                      {dec.context}
                    </p>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                  <div className="flex items-center gap-3">
                    {dec.decisionDate ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {dec.decisionDate}
                      </span>
                    ) : dec.deadlineDate ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <Clock className="w-3 h-3" />
                        Due {dec.deadlineDate}
                      </span>
                    ) : (
                      <span>{dec.createdAt.slice(0, 10)}</span>
                    )}

                    {assumptions.length > 0 && (
                      <span>{assumptions.length} assumption{assumptions.length > 1 ? 's' : ''}</span>
                    )}

                    {predictions.length > 0 && (
                      <span>{predictions.length} pred.</span>
                    )}
                  </div>

                  {isReviewDue && (
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded text-[10px]">
                      <AlertCircle className="w-3 h-3" />
                      Review Due
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
