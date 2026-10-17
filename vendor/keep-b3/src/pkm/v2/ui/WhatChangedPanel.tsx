import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  FileText,
  GitCommit,
  Layers,
  ArrowRight,
  Check,
  RotateCcw,
  Clock,
  Layers as LayersIcon,
} from 'lucide-react';
import { globalWhatChangedEngine, WhatChangedGroupedDelta } from '../continuity';

interface WhatChangedPanelProps {
  scopeId?: string; // 'global' or context/project ID
  scopeTitle?: string;
  connectedResourceIds?: string[];
  onOpenResource?: (resourceId: string, resourceType: string) => void;
  onCaughtUp?: () => void;
}

export const WhatChangedPanel: React.FC<WhatChangedPanelProps> = ({
  scopeId = 'global',
  scopeTitle = 'Workspace',
  connectedResourceIds,
  onOpenResource,
  onCaughtUp,
}) => {
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const delta: WhatChangedGroupedDelta = useMemo(() => {
    return globalWhatChangedEngine.computeWhatChanged({
      scopeId,
      scopeTitle,
      connectedResourceIds,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId, scopeTitle, connectedResourceIds, lastUpdated]);

  const handleMarkCaughtUp = () => {
    globalWhatChangedEngine.markCaughtUp(scopeId);
    setLastUpdated(Date.now());
    setAiSummary(null);
    onCaughtUp?.();
  };

  const handleGenerateAiSummary = () => {
    if (delta.isEmpty) return;
    setIsSummarizing(true);
    // Grounded factual synthesis strictly based on delta bullets
    setTimeout(() => {
      const summaryText = `Since ${new Date(delta.sinceTimestamp).toLocaleDateString()}, ${delta.structuredBulletSummary.join(', ')}. Key focus was applied across ${delta.totalEventCount} distinct actions.`;
      setAiSummary(summaryText);
      setIsSummarizing(false);
    }, 400);
  };

  return (
    <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl overflow-hidden p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <LayersIcon className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              What Changed in {scopeTitle}
            </h3>
            {!delta.isEmpty && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {delta.totalEventCount} changes
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400">
            Since {new Date(delta.sinceTimestamp).toLocaleDateString()} at{' '}
            {new Date(delta.sinceTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!delta.isEmpty && (
            <button
              onClick={handleGenerateAiSummary}
              disabled={isSummarizing}
              className="px-2.5 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {isSummarizing ? 'Synthesizing...' : 'Summarize'}
            </button>
          )}

          <button
            onClick={handleMarkCaughtUp}
            className="px-3 py-1 text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Mark Caught Up
          </button>
        </div>
      </div>

      {/* AI Grounded Summary (if requested) */}
      {aiSummary && (
        <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
          <div className="flex items-center gap-1.5 font-medium text-indigo-300 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Factual Change Synthesis</span>
          </div>
          <p>{aiSummary}</p>
        </div>
      )}

      {/* Body Content */}
      {delta.isEmpty ? (
        <div className="text-center py-8 text-zinc-500 space-y-1.5">
          <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500/60" />
          <p className="text-xs font-medium text-zinc-300">You are all caught up</p>
          <p className="text-[11px] text-zinc-500">
            No meaningful changes have occurred in this scope since your last review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Quick Stats Bullets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {delta.tasksCompleted.length > 0 && (
              <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 font-medium">Tasks Completed</span>
                <p className="text-lg font-semibold text-emerald-400">{delta.tasksCompleted.length}</p>
              </div>
            )}
            {delta.notesCreated.length + delta.notesUpdated.length > 0 && (
              <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 font-medium">Notes Modified</span>
                <p className="text-lg font-semibold text-sky-400">
                  {delta.notesCreated.length + delta.notesUpdated.length}
                </p>
              </div>
            )}
            {delta.decisionsMade.length > 0 && (
              <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 font-medium">Decisions Logged</span>
                <p className="text-lg font-semibold text-purple-400">{delta.decisionsMade.length}</p>
              </div>
            )}
            {delta.routinesCompleted.length > 0 && (
              <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 font-medium">Routines Executed</span>
                <p className="text-lg font-semibold text-teal-400">{delta.routinesCompleted.length}</p>
              </div>
            )}
          </div>

          {/* Grouped Change Items */}
          <div className="space-y-2 pt-1">
            {delta.tasksCompleted.map(ev => (
              <div
                key={ev.id}
                onClick={() => ev.resource && onOpenResource?.(ev.resource.id, ev.resource.type)}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/30 hover:bg-zinc-800/40 border border-zinc-800/60 cursor-pointer text-xs group"
              >
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-zinc-200 group-hover:text-white truncate font-medium">
                    {ev.summary.primaryTitle}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 whitespace-nowrap pl-2">
                  {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {delta.notesUpdated.map(ev => (
              <div
                key={ev.id}
                onClick={() => ev.resource && onOpenResource?.(ev.resource.id, ev.resource.type)}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/30 hover:bg-zinc-800/40 border border-zinc-800/60 cursor-pointer text-xs group"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  <span className="text-zinc-200 group-hover:text-white truncate font-medium">
                    {ev.summary.primaryTitle}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 whitespace-nowrap pl-2">
                  {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
