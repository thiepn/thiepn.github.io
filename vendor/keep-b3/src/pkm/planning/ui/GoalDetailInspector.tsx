import React from 'react';
import {
  Target,
  Calendar,
  Layers,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Tag,
  Clock,
  Plus,
} from 'lucide-react';
import { GoalRecord } from '../planningTypes';
import { Note } from '../../../types';

interface GoalDetailInspectorProps {
  goal: GoalRecord;
  onOpenNote: (noteId: string) => void;
  onUpdateProperty?: (property: string, value: any) => void;
  onCreateSupportingProject?: (goal: GoalRecord) => void;
  onClose?: () => void;
}

export const GoalDetailInspector: React.FC<GoalDetailInspectorProps> = ({
  goal,
  onOpenNote,
  onUpdateProperty,
  onCreateSupportingProject,
  onClose,
}) => {
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    planned: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    achieved: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    abandoned: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 text-sm overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-0.5">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-snug truncate">
              {goal.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  statusColors[goal.status] || 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                {goal.status}
              </span>
              {goal.priority && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {goal.priority} priority
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onOpenNote(goal.noteId)}
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Open Goal Note"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Progress section if configured */}
      {goal.progressPercent !== undefined && (
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              Progress ({goal.progressMode || 'calculated'})
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {goal.progressPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent))}%` }}
            />
          </div>
          {goal.progressMode === 'numeric' && goal.progressTarget !== undefined && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
              Current: {goal.progressCurrent ?? 0} / Target: {goal.progressTarget} {goal.progressUnit || ''}
            </p>
          )}
        </div>
      )}

      {/* Metadata properties */}
      <div className="p-4 space-y-3.5 border-b border-zinc-200 dark:border-zinc-800">
        {/* Target Date */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Target Date
          </span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {goal.targetDate || 'Not set'}
          </span>
        </div>

        {/* Area */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Area
          </span>
          {goal.areaId ? (
            <button
              onClick={() => onOpenNote(goal.areaId!)}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              {goal.areaTitle}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 italic">None</span>
          )}
        </div>

        {/* Parent Goal */}
        {goal.parentGoalTitle && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              Parent Goal
            </span>
            {goal.parentGoalId ? (
              <button
                onClick={() => onOpenNote(goal.parentGoalId!)}
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                {goal.parentGoalTitle}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-zinc-700 dark:text-zinc-300">{goal.parentGoalTitle}</span>
            )}
          </div>
        )}

        {/* Tags */}
        {goal.tags && goal.tags.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              Tags
            </span>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {goal.tags.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Supporting Projects */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-zinc-500" />
            Supporting Projects ({goal.supportingProjectIds.length})
          </h4>
          {onCreateSupportingProject && (
            <button
              onClick={() => onCreateSupportingProject(goal)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Project
            </button>
          )}
        </div>

        {goal.supportingProjectIds.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto text-amber-500 mb-1.5" />
            No active supporting projects linked to this goal.
          </div>
        ) : (
          <div className="space-y-2">
            {goal.supportingProjectIds.map((pId, idx) => {
              const pTitle = goal.supportingProjectTitles[idx] || 'Project';
              return (
                <button
                  key={pId}
                  onClick={() => onOpenNote(pId)}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 bg-white dark:bg-zinc-800/60 text-left transition-colors flex items-center justify-between group"
                >
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                    {pTitle}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Note Action footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <button
          onClick={() => onOpenNote(goal.noteId)}
          className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          Open Canonical Note
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
