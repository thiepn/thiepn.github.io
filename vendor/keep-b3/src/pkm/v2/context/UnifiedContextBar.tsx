import React from 'react';
import { Target, X, ExternalLink, RefreshCw, Folder } from 'lucide-react';
import { ResourceType } from '../core/resource/resourceCore';
import { getResourceTypeIcon } from '../shell/ResourceHeaderV2';

export interface UnifiedContextBarProps {
  activeContext: { id: string; title: string; type: ResourceType } | null;
  onSwitchContext?: () => void;
  onOpenRootResource?: (id: string, type: ResourceType) => void;
  onLeaveContext?: () => void;
}

export const UnifiedContextBar: React.FC<UnifiedContextBarProps> = ({
  activeContext,
  onSwitchContext,
  onOpenRootResource,
  onLeaveContext,
}) => {
  if (!activeContext) return null;

  return (
    <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-between gap-2 text-xs select-none">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="p-1 rounded-md bg-amber-500 text-white shrink-0">
          <Target className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 shrink-0">
            Context:
          </span>
          <button
            type="button"
            onClick={() => onOpenRootResource && onOpenRootResource(activeContext.id, activeContext.type)}
            className="font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 truncate text-left transition-colors flex items-center gap-1"
          >
            <span>{activeContext.title}</span>
            <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onSwitchContext && (
          <button
            type="button"
            onClick={onSwitchContext}
            className="px-2 py-0.5 rounded-md hover:bg-amber-500/20 text-stone-700 dark:text-stone-300 text-[11px] font-medium transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Switch</span>
          </button>
        )}
        {onLeaveContext && (
          <button
            type="button"
            onClick={onLeaveContext}
            title="Leave focus context"
            className="p-1 rounded-md hover:bg-amber-500/20 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
