import React from 'react';
import {
  Sparkles,
  Clock,
  AlertCircle,
  Calendar,
  Inbox,
  FileText,
  CheckSquare,
  Plus,
  ArrowRight,
  Target,
  Users,
  Compass,
} from 'lucide-react';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { getResourceTypeIcon } from '../shell/ResourceHeaderV2';
import { globalCrossDeviceContinuityEngineV2 } from '../sync';
import { Laptop } from 'lucide-react';

export interface UnifiedHomeViewProps {
  activeContext?: { id: string; title: string; type: ResourceType } | null;
  recentResources: ResourceCore[];
  attentionItems: { id: string; title: string; type: ResourceType; reason: string; severity: 'high' | 'medium' }[];
  todayItems: { id: string; title: string; type: ResourceType; timeOrStatus?: string; completed?: boolean }[];
  inboxCount: number;
  onOpenResource: (id: string, type: ResourceType) => void;
  onOpenInbox: () => void;
  onQuickCreateNote: () => void;
  onQuickCreateTask: () => void;
  onQuickCapture: () => void;
  onStartContextModal?: () => void;
}

export const UnifiedHomeView: React.FC<UnifiedHomeViewProps> = ({
  activeContext,
  recentResources,
  attentionItems,
  todayItems,
  inboxCount,
  onOpenResource,
  onOpenInbox,
  onQuickCreateNote,
  onQuickCreateTask,
  onQuickCapture,
  onStartContextModal,
}) => {
  const isFreshVault =
    recentResources.length === 0 &&
    attentionItems.length === 0 &&
    todayItems.length === 0 &&
    inboxCount === 0;

  const handoff = globalCrossDeviceContinuityEngineV2.getLatestRemoteHandoffSuggestion();

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50/50 dark:bg-stone-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header / Orientation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Home
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              Personal Operating System & Orientation
            </p>
          </div>

          {/* Quick Action Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onQuickCreateNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Note</span>
            </button>
            <button
              type="button"
              onClick={onQuickCreateTask}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Task</span>
            </button>
            <button
              type="button"
              onClick={onQuickCapture}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Capture</span>
            </button>
          </div>
        </div>

        {/* Fresh Vault Empty State */}
        {isFreshVault && (
          <div className="p-8 sm:p-12 text-center rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
            <Compass className="w-12 h-12 text-amber-500 mx-auto" />
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                Welcome to your Personal OS
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Start by capturing ideas, organizing daily tasks, or starting a focus context.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onQuickCreateNote}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
              >
                Create a Note
              </button>
              <button
                type="button"
                onClick={onQuickCreateTask}
                className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors"
              >
                Add a Task
              </button>
            </div>
          </div>
        )}

        {/* Cross-Device Continuity Handoff Banner */}
        {handoff && handoff.checkpoint.activeResourceId && (
          <section className="p-4 rounded-2xl bg-blue-500/10 dark:bg-blue-950/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Continue from {handoff.checkpoint.deviceName} ({handoff.timeAgoDescription})
                </span>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {handoff.checkpoint.activeResourceTitle || 'Active Working Resource'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenResource(handoff.checkpoint.activeResourceId!, handoff.checkpoint.activeResourceType || 'note')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors self-start sm:self-auto"
            >
              <span>Continue Working</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </section>
        )}

        {/* 1. NOW: Active Focus Context */}
        {activeContext && (
          <section className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Current Active Context
                </span>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {activeContext.title}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenResource(activeContext.id, activeContext.type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors self-start sm:self-auto"
            >
              <span>Resume Context</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </section>
        )}

        {/* Grid for 5 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 2. ATTENTION: Needs Awareness / Action */}
          <section className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  Attention ({attentionItems.length})
                </h2>
              </div>
            </div>

            {attentionItems.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No overdue or pending items requiring attention.</p>
            ) : (
              <div className="space-y-2">
                {attentionItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenResource(item.id, item.type)}
                    className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-800/30 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded bg-stone-200/60 dark:bg-stone-800 shrink-0">
                        {getResourceTypeIcon(item.type)}
                      </div>
                      <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                        {item.title}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 shrink-0">
                      {item.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. TODAY: Today's Tasks & Routines */}
          <section className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  Today ({todayItems.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={onQuickCreateTask}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" /> Add Task
              </button>
            </div>

            {todayItems.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No tasks scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {todayItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenResource(item.id, item.type)}
                    className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-800/30 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                        {item.title}
                      </span>
                    </div>
                    {item.timeOrStatus && (
                      <span className="text-[10px] text-stone-400 font-mono shrink-0">
                        {item.timeOrStatus}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. CONTINUE: Resume Meaningful Work */}
          <section className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                Continue ({recentResources.length})
              </h2>
            </div>

            {recentResources.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No recently edited items.</p>
            ) : (
              <div className="space-y-2">
                {recentResources.slice(0, 4).map((res) => (
                  <div
                    key={res.id}
                    onClick={() => onOpenResource(res.id, res.type)}
                    className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-800/30 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded bg-stone-200/60 dark:bg-stone-800 shrink-0">
                        {getResourceTypeIcon(res.type)}
                      </div>
                      <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                        {res.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider shrink-0">
                      {res.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. INBOX: Unprocessed Captures */}
          <section className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  Inbox ({inboxCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenInbox}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                Process <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {inboxCount === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">Inbox is clear. Zero pending captures.</p>
            ) : (
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
                    {inboxCount} {inboxCount === 1 ? 'item' : 'items'}
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400">
                    Awaiting triage and destination processing
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenInbox}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                >
                  Review
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
