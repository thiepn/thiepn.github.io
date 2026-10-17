import React from 'react';
import {
  Target,
  Pin,
  Link,
  Calendar,
  Clock,
  Sparkles,
  Plus,
  Play,
  CheckCircle,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { getResourceTypeIcon } from '../shell/ResourceHeaderV2';

export interface V2WorkingSetItem {
  id: string;
  title: string;
  type: ResourceType;
  category: 'pinned' | 'connected' | 'due' | 'recent' | 'suggested';
  detail?: string;
}

export type WorkingSetItem = V2WorkingSetItem;

export interface ContextQuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export interface UnifiedContextViewProps {
  contextResource: ResourceCore;
  workingSet: WorkingSetItem[];
  quickActions: ContextQuickAction[];
  onOpenResource: (id: string, type: ResourceType) => void;
  onLeaveContext: () => void;
  onAddResourceToContext?: () => void;
}

export const UnifiedContextView: React.FC<UnifiedContextViewProps> = ({
  contextResource,
  workingSet,
  quickActions,
  onOpenResource,
  onLeaveContext,
  onAddResourceToContext,
}) => {
  // Group working set by priority category
  const pinnedItems = workingSet.filter((i) => i.category === 'pinned');
  const connectedItems = workingSet.filter((i) => i.category === 'connected');
  const dueItems = workingSet.filter((i) => i.category === 'due');
  const recentItems = workingSet.filter((i) => i.category === 'recent');
  const suggestedItems = workingSet.filter((i) => i.category === 'suggested');

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50/50 dark:bg-stone-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Context Banner */}
        <div className="p-6 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500 text-white shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Focus Workspace
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {contextResource.title}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={onLeaveContext}
              className="px-3.5 py-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/20 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors"
            >
              Exit Focus Session
            </button>
          </div>

          {/* Module-Registered Context Quick Actions */}
          {quickActions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-amber-500/20">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {action.icon || <Play className="w-3.5 h-3.5" />}
                  <span>{action.label}</span>
                </button>
              ))}
              {onAddResourceToContext && (
                <button
                  type="button"
                  onClick={onAddResourceToContext}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Resource</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Working Set Prioritized Grid */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Prioritized Working Set ({workingSet.length})
            </h2>
          </div>

          {/* 1. Pinned in Context */}
          {pinnedItems.length > 0 && (
            <section className="space-y-2">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                Pinned Documents & Benchmarks
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pinnedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenResource(item.id, item.type)}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-500/50 text-left transition-all flex items-center justify-between gap-2 shadow-xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded bg-stone-100 dark:bg-stone-800 shrink-0">
                        {getResourceTypeIcon(item.type)}
                      </div>
                      <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {item.title}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 2. Explicitly Connected Resources */}
          {connectedItems.length > 0 && (
            <section className="space-y-2">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-indigo-500" />
                Connected Resources & References
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {connectedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenResource(item.id, item.type)}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-indigo-500/50 text-left transition-all flex items-center justify-between gap-2 shadow-xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded bg-stone-100 dark:bg-stone-800 shrink-0">
                        {getResourceTypeIcon(item.type)}
                      </div>
                      <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                        {item.title}
                      </span>
                    </div>
                    {item.detail && (
                      <span className="text-[10px] text-stone-400 font-mono shrink-0">
                        {item.detail}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 3. Due & In-Progress Tasks */}
          {dueItems.length > 0 && (
            <section className="space-y-2">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                Context Milestones & Tasks
              </span>
              <div className="space-y-1.5">
                {dueItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenResource(item.id, item.type)}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                        {item.title}
                      </span>
                    </div>
                    {item.detail && (
                      <span className="text-[10px] text-stone-400 font-mono shrink-0">
                        {item.detail}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Suggested Context Links */}
          {suggestedItems.length > 0 && (
            <section className="space-y-2">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Suggested Associations
              </span>
              <div className="space-y-1.5">
                {suggestedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenResource(item.id, item.type)}
                    className="p-2.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/60 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-600 shrink-0">
                        {getResourceTypeIcon(item.type)}
                      </div>
                      <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                        {item.title}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0">
                      Suggested
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
