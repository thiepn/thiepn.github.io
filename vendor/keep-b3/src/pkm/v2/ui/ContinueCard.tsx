import React from 'react';
import {
  Play,
  Pin,
  Clock,
  Sparkles,
  ArrowRight,
  Layers,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { SemanticResumeCheckpoint, globalContinuityEngine } from '../continuity';

interface ContinueCardProps {
  contextId?: string;
  onOpenResource?: (resourceId: string, resourceType: string) => void;
}

export const ContinueCard: React.FC<ContinueCardProps> = ({
  contextId,
  onOpenResource,
}) => {
  const continueItems = globalContinuityEngine.getTopContinueItems({
    contextId,
    limit: 2,
  });

  if (continueItems.length === 0) return null;

  const renderConfidenceBadge = (item: SemanticResumeCheckpoint) => {
    if (item.isPinned) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Pin className="w-2.5 h-2.5" /> Pinned
        </span>
      );
    }
    if (item.confidence === 'active_session') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          <Sparkles className="w-2.5 h-2.5" /> In Progress
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
        <Clock className="w-2.5 h-2.5" /> Recent
      </span>
    );
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-zinc-900/40 border border-indigo-500/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-indigo-400 fill-indigo-400/30" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
            Resume Where You Left Off
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {continueItems.map(item => (
          <div
            key={item.id}
            onClick={() => onOpenResource?.(item.resourceRef.id, item.resourceRef.type)}
            className="group flex items-center justify-between p-3 rounded-lg bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-indigo-500/40 cursor-pointer transition-all"
          >
            <div className="space-y-1 min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2">
                {renderConfidenceBadge(item)}
                {item.contextTitle && (
                  <span className="text-[10px] text-zinc-400 truncate">
                    {item.contextTitle}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-zinc-100 group-hover:text-white truncate">
                {item.resourceRef.title}
              </p>
              {item.progressSummary && (
                <p className="text-xs text-indigo-300/80 font-medium">
                  {item.progressSummary}
                </p>
              )}
            </div>

            <div className="w-7 h-7 rounded-full bg-indigo-600/20 group-hover:bg-indigo-600 flex items-center justify-center text-indigo-300 group-hover:text-white transition-all flex-shrink-0">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
