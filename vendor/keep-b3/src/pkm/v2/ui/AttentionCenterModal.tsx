import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  Clock,
  Check,
  BellOff,
  ChevronRight,
  HelpCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  AttentionItemV2,
  AttentionSeverityV2,
  AttentionCategoryV2,
  globalAttentionEngine,
} from '../attention';

interface AttentionCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResource?: (resourceId: string, resourceType?: string) => void;
  onTriggerAction?: (actionId: string, resourceId?: string) => void;
}

export const AttentionCenterModal: React.FC<AttentionCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenResource,
  onTriggerAction,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AttentionCategoryV2 | 'all'>('all');
  const [snoozeOpenKey, setSnoozeOpenKey] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!isOpen) return null;

  const items: AttentionItemV2[] = globalAttentionEngine.evaluate({
    filter: {
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    },
  });

  const handleAcknowledge = (dedupeKey: string) => {
    globalAttentionEngine.acknowledgeItem(dedupeKey);
    setRefreshTrigger(t => t + 1);
  };

  const handleSnooze = (dedupeKey: string, hours: number) => {
    const snoozeUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    globalAttentionEngine.snoozeItem(dedupeKey, snoozeUntil);
    setSnoozeOpenKey(null);
    setRefreshTrigger(t => t + 1);
  };

  const renderSeverityBadge = (sev: AttentionSeverityV2) => {

    switch (sev) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
            <ShieldAlert className="w-3 h-3" /> Critical
          </span>
        );
      case 'important':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" /> Important
          </span>
        );
      case 'needs_attention':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <AlertCircle className="w-3 h-3" /> Needs Attention
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Info className="w-3 h-3" /> Info
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Attention Center</h2>
              <p className="text-xs text-zinc-400">
                Factual items requiring your awareness or explicit decision
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center gap-2 text-xs">
          {(['all', 'planning', 'domain', 'system'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat === 'all' ? 'All Conditions' : cat}
            </button>
          ))}
        </div>

        {/* Attention Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 space-y-2">
              <Check className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-sm font-medium text-zinc-300">No active attention conditions</p>
              <p className="text-xs text-zinc-500">All tasks, reviews, and systems are running normally.</p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  item.severity === 'critical'
                    ? 'bg-red-950/20 border-red-900/40'
                    : item.severity === 'important'
                    ? 'bg-amber-950/15 border-amber-900/30'
                    : 'bg-zinc-950/40 border-zinc-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {renderSeverityBadge(item.severity)}
                      {item.childItemCount && item.childItemCount > 1 && (
                        <span className="text-[11px] text-zinc-400 font-medium">
                          ({item.childItemCount} items grouped)
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-zinc-100">{item.title}</h3>
                  </div>

                  {item.acknowledgedAt && (
                    <span className="text-[10px] text-zinc-500 px-2 py-0.5 rounded bg-zinc-800/60">
                      Seen
                    </span>
                  )}
                </div>

                {/* Plain-English Factual Reason */}
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-300">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item.whyExplanation}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    {item.resource && (
                      <button
                        onClick={() => {
                          onOpenResource?.(item.resource!.id, item.resource!.type);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span>{item.suggestedActionLabel || 'Open Resource'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}

                    {item.actionId && !item.resource && (
                      <button
                        onClick={() => {
                          onTriggerAction?.(item.actionId!);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span>{item.suggestedActionLabel || 'Resolve'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 relative">
                    {!item.acknowledgedAt && (
                      <button
                        onClick={() => handleAcknowledge(item.dedupeKey)}
                        className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors inline-flex items-center gap-1"
                        title="Mark as Seen"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSnoozeOpenKey(snoozeOpenKey === item.dedupeKey ? null : item.dedupeKey)}
                      className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors inline-flex items-center gap-1"
                      title="Snooze presentation (does not change task due dates)"
                    >
                      <BellOff className="w-3.5 h-3.5" />
                      <span>Snooze</span>
                    </button>

                    {/* Snooze Options Popup */}
                    {snoozeOpenKey === item.dedupeKey && (
                      <div className="absolute right-0 top-8 z-10 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-1 space-y-0.5 text-xs text-zinc-200">
                        <button
                          onClick={() => handleSnooze(item.dedupeKey, 4)}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-700 transition-colors"
                        >
                          Later Today (4h)
                        </button>
                        <button
                          onClick={() => handleSnooze(item.dedupeKey, 24)}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-700 transition-colors"
                        >
                          Tomorrow (24h)
                        </button>
                        <button
                          onClick={() => handleSnooze(item.dedupeKey, 168)}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-700 transition-colors"
                        >
                          Next Week (7d)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
