import React from 'react';
import {
  Layers,
  Target,
  FolderKanban,
  Users,
  Tag,
  ExternalLink,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { AreaRecord } from '../planningTypes';

interface AreaDetailInspectorProps {
  area: AreaRecord;
  onOpenNote: (noteId: string) => void;
  onCreateProjectInArea?: (area: AreaRecord) => void;
  onCreateGoalInArea?: (area: AreaRecord) => void;
  onClose?: () => void;
}

export const AreaDetailInspector: React.FC<AreaDetailInspectorProps> = ({
  area,
  onOpenNote,
  onCreateProjectInArea,
  onCreateGoalInArea,
  onClose,
}) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 text-sm overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-0.5">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-snug truncate">
              {area.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2 py-0.5 rounded text-xs font-medium border bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
                {area.status}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Area of Responsibility
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onOpenNote(area.noteId)}
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Open Area Note"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Active Goals in Area */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-indigo-500" />
            Active Goals ({area.goalIds.length})
          </h4>
          {onCreateGoalInArea && (
            <button
              onClick={() => onCreateGoalInArea(area)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Goal
            </button>
          )}
        </div>

        {area.goalIds.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No goals assigned to this area.</p>
        ) : (
          <div className="space-y-1.5">
            {area.goalIds.map((gId, idx) => (
              <button
                key={gId}
                onClick={() => onOpenNote(gId)}
                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/40 bg-zinc-50 dark:bg-zinc-800/50 text-left transition-colors flex items-center justify-between group"
              >
                <span className="font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                  {area.goalTitles[idx] || 'Goal'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Projects in Area */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-blue-500" />
            Active Projects ({area.projectIds.length})
          </h4>
          {onCreateProjectInArea && (
            <button
              onClick={() => onCreateProjectInArea(area)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Project
            </button>
          )}
        </div>

        {area.projectIds.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No projects assigned to this area.</p>
        ) : (
          <div className="space-y-1.5">
            {area.projectIds.map((pId, idx) => (
              <button
                key={pId}
                onClick={() => onOpenNote(pId)}
                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/40 bg-zinc-50 dark:bg-zinc-800/50 text-left transition-colors flex items-center justify-between group"
              >
                <span className="font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                  {area.projectTitles[idx] || 'Project'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* People */}
      {area.peopleIds && area.peopleIds.length > 0 && (
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-2">
            <Users className="w-4 h-4 text-zinc-500" />
            People & Contacts ({area.peopleIds.length})
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            {area.peopleIds.map((pId, idx) => (
              <button
                key={pId}
                onClick={() => onOpenNote(pId)}
                className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {area.peopleTitles[idx] || 'Person'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Note Action footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 mt-auto">
        <button
          onClick={() => onOpenNote(area.noteId)}
          className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          Open Area Note
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
