import React, { useState } from 'react';
import { Decision, DecisionType, Reversibility, DecisionStatus } from '../decisionTypes';
import { decisionService } from '../decisionService';
import { X, Scale, Plus, GitBranch, Calendar } from 'lucide-react';

interface DecisionFormModalProps {
  initialDecision?: Decision;
  supersedingFromDecision?: Decision;
  onClose: () => void;
  onSaved: (decision: Decision) => void;
}

export const DecisionFormModal: React.FC<DecisionFormModalProps> = ({
  initialDecision,
  supersedingFromDecision,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState(
    initialDecision?.title ||
      (supersedingFromDecision ? `Superseding: ${supersedingFromDecision.title}` : '')
  );
  const [domain, setDomain] = useState(
    initialDecision?.domain || supersedingFromDecision?.domain || 'General'
  );
  const [decisionType, setDecisionType] = useState<DecisionType>(
    initialDecision?.decisionType || 'strategic'
  );
  const [reversibility, setReversibility] = useState<Reversibility>(
    initialDecision?.reversibility || 'partially'
  );
  const [costOfReversal, setCostOfReversal] = useState(
    initialDecision?.costOfReversal || ''
  );
  const [context, setContext] = useState(initialDecision?.context || '');
  const [confidence, setConfidence] = useState<number>(
    initialDecision?.confidence !== undefined ? initialDecision.confidence : 75
  );
  const [deadlineDate, setDeadlineDate] = useState(
    initialDecision?.deadlineDate || ''
  );
  const [reviewDate, setReviewDate] = useState(
    initialDecision?.reviewDate || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (supersedingFromDecision) {
      const res = decisionService.supersedeDecision(supersedingFromDecision.id, {
        title: title.trim(),
        domain: domain.trim(),
        decisionType,
        reversibility,
        costOfReversal: costOfReversal.trim() || undefined,
        context: context.trim() || undefined,
        confidence,
        deadlineDate: deadlineDate || undefined,
        reviewDate: reviewDate || undefined,
        status: 'considering',
      });

      if (res.success && res.newDecision) {
        onSaved(res.newDecision);
      } else {
        alert(res.error || 'Failed to supersede decision');
      }
      return;
    }

    const decision: Decision = {
      id: initialDecision?.id || `dec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      domain: domain.trim(),
      decisionType,
      reversibility,
      costOfReversal: costOfReversal.trim() || undefined,
      context: context.trim() || undefined,
      confidence,
      deadlineDate: deadlineDate || undefined,
      reviewDate: reviewDate || undefined,
      status: initialDecision?.status || 'considering',
      createdAt: initialDecision?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = decisionService.saveDecision(decision);
    onSaved(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 w-full max-w-xl rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {supersedingFromDecision
                ? 'Supersede Decision with New Reasoning'
                : initialDecision
                ? 'Edit Decision'
                : 'Record New Decision'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {supersedingFromDecision && (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Superseding <strong>"{supersedingFromDecision.title}"</strong>. The original decision will be marked superseded.
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Decision Title / Question *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Choose between Cloud Storage and Local-First CRDT"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Domain / Area
              </label>
              <input
                type="text"
                placeholder="e.g. Engineering, Finance, Health"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Decision Type
              </label>
              <select
                value={decisionType}
                onChange={(e) => setDecisionType(e.target.value as DecisionType)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="strategic">Strategic</option>
                <option value="purchase">Purchase</option>
                <option value="technical">Technical</option>
                <option value="personal">Personal</option>
                <option value="academic">Academic</option>
                <option value="travel">Travel</option>
                <option value="financial">Financial</option>
                <option value="health">Health</option>
                <option value="operational">Operational</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Reversibility
              </label>
              <select
                value={reversibility}
                onChange={(e) => setReversibility(e.target.value as Reversibility)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="easily">Easily Reversible (Two-way door)</option>
                <option value="partially">Partially Reversible with cost</option>
                <option value="hard">Hard / Irreversible (One-way door)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Initial Confidence (0-100%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Estimated Cost of Reversal
            </label>
            <input
              type="text"
              placeholder="e.g. 2 weeks engineering time, $200 restocking fee"
              value={costOfReversal}
              onChange={(e) => setCostOfReversal(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Background Context & Problem Framing
            </label>
            <textarea
              rows={3}
              placeholder="Why is this decision being made? What triggers it?"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Deadline Date
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Scheduled Review Date
              </label>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
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
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition shadow-xs"
            >
              Save Decision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
