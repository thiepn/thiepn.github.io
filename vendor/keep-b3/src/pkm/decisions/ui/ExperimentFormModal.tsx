import React, { useState } from 'react';
import { Experiment, ExperimentStatus } from '../decisionTypes';
import { decisionService } from '../decisionService';
import { X, FlaskConical, Plus } from 'lucide-react';

interface ExperimentFormModalProps {
  initialExperiment?: Experiment;
  followUpToExperiment?: Experiment;
  onClose: () => void;
  onSaved: (experiment: Experiment) => void;
}

export const ExperimentFormModal: React.FC<ExperimentFormModalProps> = ({
  initialExperiment,
  followUpToExperiment,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState(
    initialExperiment?.title ||
      (followUpToExperiment ? `Follow-up: ${followUpToExperiment.title}` : '')
  );
  const [question, setQuestion] = useState(
    initialExperiment?.question || followUpToExperiment?.question || ''
  );
  const [hypothesis, setHypothesis] = useState(
    initialExperiment?.hypothesis || ''
  );
  const [intervention, setIntervention] = useState(
    initialExperiment?.intervention || ''
  );
  const [baseline, setBaseline] = useState(
    initialExperiment?.baseline ||
      (followUpToExperiment ? `Follow-up baseline from: "${followUpToExperiment.title}"` : '')
  );
  const [startDate, setStartDate] = useState(
    initialExperiment?.startDate || new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    initialExperiment?.endDate ||
      new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<ExperimentStatus>(
    initialExperiment?.status || 'planned'
  );
  const [resultsNotes, setResultsNotes] = useState(
    initialExperiment?.resultsNotes || ''
  );
  const [conclusionsNotes, setConclusionsNotes] = useState(
    initialExperiment?.conclusionsNotes || ''
  );
  const [limitationsNotes, setLimitationsNotes] = useState(
    initialExperiment?.limitationsNotes || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hypothesis.trim() || !intervention.trim()) return;

    if (followUpToExperiment) {
      const followUp = decisionService.createFollowUpExperiment(
        followUpToExperiment.id,
        title.trim(),
        hypothesis.trim(),
        intervention.trim()
      );
      if (followUp) {
        onSaved(followUp);
      }
      return;
    }

    const exp: Experiment = {
      id: initialExperiment?.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      question: question.trim(),
      hypothesis: hypothesis.trim(),
      intervention: intervention.trim(),
      baseline: baseline.trim() || undefined,
      startDate,
      endDate,
      status,
      resultsNotes: resultsNotes.trim() || undefined,
      conclusionsNotes: conclusionsNotes.trim() || undefined,
      limitationsNotes: limitationsNotes.trim() || undefined,
      createdAt: initialExperiment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = decisionService.saveExperiment(exp);
    onSaved(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 w-full max-w-xl rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {followUpToExperiment
                ? 'Design Follow-up Experiment'
                : initialExperiment
                ? 'Edit Experiment'
                : 'Design New Personal Experiment'}
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
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Experiment Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 50-Minute Notification-Free Study Blocks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Core Question & Motivation
            </label>
            <input
              type="text"
              placeholder="e.g. Does phone isolation increase completed deep focus sessions?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Falsifiable Hypothesis *
            </label>
            <textarea
              rows={2}
              required
              placeholder="If I [intervention], then [expected outcome] by [margin]."
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Specific Intervention Protocol *
            </label>
            <textarea
              rows={2}
              required
              placeholder="What concrete routine or habit will you follow during the experiment?"
              value={intervention}
              onChange={(e) => setIntervention(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
              Baseline Observation
            </label>
            <input
              type="text"
              placeholder="e.g. Averaged 1.8 focus blocks with frequent distraction"
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExperimentStatus)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="planned">Planned</option>
                <option value="running">Running</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="inconclusive">Inconclusive</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {(status === 'completed' || status === 'inconclusive' || resultsNotes) && (
            <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                  Findings & Results Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="What happened? Summarize the empirical data."
                  value={resultsNotes}
                  onChange={(e) => setResultsNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                  Conclusions & Lessons
                </label>
                <textarea
                  rows={2}
                  placeholder="Did the intervention work? What principle should be adopted?"
                  value={conclusionsNotes}
                  onChange={(e) => setConclusionsNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
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
              Save Experiment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
