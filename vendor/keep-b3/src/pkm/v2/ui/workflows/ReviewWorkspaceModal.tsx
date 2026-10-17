import React, { useState } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Compass,
  FileText,
  CheckCheck,
  ChevronRight,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { ReviewTemplateV2, ReviewRecordV2, ReviewEvidenceSummary } from '../../review/reviewTypesV2';
import { reviewEngineV2 } from '../../review/reviewEngineV2';
import { getTodayDateOnly, addDaysDateOnly } from '../../temporal/recurrenceEngineV2';

interface ReviewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ReviewTemplateV2;
  projectId?: string;
}

export const ReviewWorkspaceModal: React.FC<ReviewWorkspaceModalProps> = ({
  isOpen,
  onClose,
  template,
  projectId,
}) => {
  const today = getTodayDateOnly();
  const [review, setReview] = useState<ReviewRecordV2>(() =>
    reviewEngineV2.startReview(template.id, {
      projectId,
      periodStart: addDaysDateOnly(today, -7),
      periodEnd: today,
    })
  );

  const [evidence] = useState<ReviewEvidenceSummary>(() =>
    reviewEngineV2.collectEvidence(review.periodStart, review.periodEnd, projectId)
  );

  const [activeTab, setActiveTab] = useState<'prompts' | 'evidence'>('prompts');

  if (!isOpen) return null;

  const handleUpdatePromptResponse = (promptId: string, text: string) => {
    const updated = reviewEngineV2.updateResponse(review.id, promptId, text);
    setReview(updated);
  };

  const handleCompleteReview = () => {
    const updated = reviewEngineV2.completeReview(review.id, evidence);
    setReview(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {template.title}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Period: {review.periodStart} to {review.periodEnd}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-stone-200 dark:bg-stone-800 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab('prompts')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'prompts'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Reflection Prompts
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'evidence'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Evidence Panel ({evidence.completedTasks.length + evidence.overdueTasks.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'prompts' ? (
            <div className="space-y-6">
              {template.prompts.map((p, idx) => (
                <div key={p.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-mono text-[11px]">
                        {idx + 1}
                      </span>
                      {p.question}
                    </label>
                    <span className="text-[11px] font-mono uppercase text-stone-400">
                      {p.category}
                    </span>
                  </div>

                  <textarea
                    value={review.promptResponses[p.id] || ''}
                    onChange={(e) => handleUpdatePromptResponse(p.id, e.target.value)}
                    rows={3}
                    placeholder="Write thoughtful reflections and concrete actions..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Completed Tasks Box */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Completed This Period ({evidence.completedTasks.length})
                  </h3>
                </div>

                {evidence.completedTasks.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No tasks completed in this window.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {evidence.completedTasks.map((t) => (
                      <div
                        key={t.id}
                        className="px-2.5 py-1.5 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between"
                      >
                        <span className="text-stone-800 dark:text-stone-200 font-medium">
                          {t.title}
                        </span>
                        {t.completedDate && (
                          <span className="text-[10px] font-mono text-stone-400">
                            {t.completedDate}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Overdue Tasks Box */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Overdue Items ({evidence.overdueTasks.length})
                  </h3>
                </div>

                {evidence.overdueTasks.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No overdue items.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {evidence.overdueTasks.map((t) => (
                      <div
                        key={t.id}
                        className="px-2.5 py-1.5 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between"
                      >
                        <span className="text-stone-800 dark:text-stone-200 font-medium">
                          {t.title}
                        </span>
                        <span className="text-[10px] font-mono text-red-500 font-semibold">
                          Due {t.dueDate}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Horizons */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    Upcoming Next 7 Days ({evidence.upcomingItems.length})
                  </h3>
                </div>

                {evidence.upcomingItems.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No upcoming scheduled deadlines.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {evidence.upcomingItems.map((item) => (
                      <div
                        key={item.id}
                        className="px-2.5 py-1.5 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between"
                      >
                        <span className="text-stone-800 dark:text-stone-200 font-medium truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-500 shrink-0 ml-2">
                          {item.date}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex justify-between items-center">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Review will be saved as a permanent reflection record.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              Save Draft & Close
            </button>
            <button
              type="button"
              onClick={handleCompleteReview}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" /> Complete & Archive Snapshot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
