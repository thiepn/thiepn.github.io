import React from 'react';
import {
  FolderKanban,
  Calendar,
  Layers,
  Target,
  Users,
  Building2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Star,
  Clock,
  Sparkles,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { ProjectRecord, ProjectStatus } from '../planningTypes';
import { focusManager } from '../focusManager';

interface ProjectDetailInspectorProps {
  project: ProjectRecord;
  onOpenNote: (noteId: string) => void;
  onUpdateStatus?: (status: ProjectStatus) => void;
  onToggleTask?: (taskIndex: number) => void;
  onFocusChange?: () => void;
  onClose?: () => void;
}

export const ProjectDetailInspector: React.FC<ProjectDetailInspectorProps> = ({
  project,
  onOpenNote,
  onUpdateStatus,
  onToggleTask,
  onFocusChange,
  onClose,
}) => {
  const isFocused = focusManager.isFocused(project.id);

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    planned: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    waiting: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    paused: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    completed: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  const handleToggleFocus = () => {
    focusManager.toggleFocus(project.id);
    if (onFocusChange) onFocusChange();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 text-sm overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-snug truncate">
              {project.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {onUpdateStatus ? (
                <select
                  value={project.status}
                  onChange={(e) => onUpdateStatus(e.target.value as ProjectStatus)}
                  className={`px-2 py-0.5 rounded text-xs font-medium border bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    statusColors[project.status] || 'bg-zinc-100 dark:bg-zinc-800'
                  }`}
                >
                  <option value="active">active</option>
                  <option value="planned">planned</option>
                  <option value="waiting">waiting</option>
                  <option value="paused">paused</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    statusColors[project.status] || 'bg-zinc-100 dark:bg-zinc-800'
                  }`}
                >
                  {project.status}
                </span>
              )}

              {project.priority && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {project.priority} priority
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleFocus}
            className={`p-1.5 rounded-md transition-colors ${
              isFocused
                ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title={isFocused ? 'Remove from Current Focus' : 'Add to Current Focus'}
          >
            <Star className={`w-4 h-4 ${isFocused ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => onOpenNote(project.noteId)}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Open Project Note"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Completion Suggestion Banner if all tasks are complete */}
      {project.canSuggestCompletion && onUpdateStatus && (
        <div className="p-3 bg-purple-500/10 border-b border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="text-xs text-purple-900 dark:text-purple-200 font-medium truncate">
              All tasks complete! Mark project done?
            </span>
          </div>
          <button
            onClick={() => onUpdateStatus('completed')}
            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors flex-shrink-0"
          >
            Mark Completed
          </button>
        </div>
      )}

      {/* Progress section */}
      {project.progressPercent !== null && (
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              Progress
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {project.progressText || `${project.progressPercent}%`}
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, project.progressPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Next Action Highlight */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
          Next Action
        </h4>
        {project.nextActionTask ? (
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-start gap-2.5">
            <Circle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                {project.nextActionTask.title}
              </p>
              {project.nextActionTask.due && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due: {project.nextActionTask.due}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 text-xs text-center">
            {project.status === 'completed'
              ? 'Project completed.'
              : 'No open task found in note. Add a checklist item to define next action.'}
          </div>
        )}
      </div>

      {/* Metadata properties */}
      <div className="p-4 space-y-3.5 border-b border-zinc-200 dark:border-zinc-800">
        {/* Due Date */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Deadline (Due)
          </span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {project.due || 'Not scheduled'}
          </span>
        </div>

        {/* Goal */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            Goal
          </span>
          {project.goalIds && project.goalIds.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {project.goalIds.map((gId, idx) => (
                <button
                  key={gId}
                  onClick={() => onOpenNote(gId)}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  {project.goalTitles[idx] || 'Goal'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 italic">None</span>
          )}
        </div>

        {/* Area */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Area
          </span>
          {project.areaId ? (
            <button
              onClick={() => onOpenNote(project.areaId!)}
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {project.areaTitle}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 italic">None</span>
          )}
        </div>

        {/* People */}
        {project.peopleIds && project.peopleIds.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              People
            </span>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {project.peopleIds.map((pId, idx) => (
                <button
                  key={pId}
                  onClick={() => onOpenNote(pId)}
                  className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  {project.peopleTitles[idx] || 'Person'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Blocked By */}
        {project.blockedByIds && project.blockedByIds.length > 0 && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Blocked By
            </span>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {project.blockedByIds.map((bId, idx) => (
                <button
                  key={bId}
                  onClick={() => onOpenNote(bId)}
                  className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded text-xs hover:underline"
                >
                  {project.blockedByTitles[idx] || bId}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Note Action footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 mt-auto">
        <button
          onClick={() => onOpenNote(project.noteId)}
          className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          Open Project Note & Checklist
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
