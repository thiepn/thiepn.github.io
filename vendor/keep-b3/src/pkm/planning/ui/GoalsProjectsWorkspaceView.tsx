import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  Target,
  Layers,
  Sparkles,
  Calendar,
  Table as TableIcon,
  LayoutGrid,
  Kanban,
  Plus,
  Search,
  Filter,
  Star,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
  Tag,
  Users,
  MoreVertical,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import {
  ProjectRecord,
  GoalRecord,
  AreaRecord,
  ReviewRecord,
  ProjectStatus,
  GoalStatus,
} from '../planningTypes';
import { planningService } from '../planningService';
import { focusManager } from '../focusManager';
import { GoalDetailInspector } from './GoalDetailInspector';
import { ProjectDetailInspector } from './ProjectDetailInspector';
import { AreaDetailInspector } from './AreaDetailInspector';
import { updatePropertyInFrontmatter } from '../../properties/frontmatterEngine';

interface GoalsProjectsWorkspaceViewProps {
  initialTab?: 'projects' | 'goals' | 'areas' | 'reviews';
  notes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onSaveNote: (updatedNote: Note) => Promise<void>;
  onOpenNewResource: (type: 'project' | 'goal' | 'area') => void;
  onOpenWeeklyReview: () => void;
}

export const GoalsProjectsWorkspaceView: React.FC<GoalsProjectsWorkspaceViewProps> = ({
  initialTab = 'projects',
  notes,
  folders,
  onOpenNote,
  onSaveNote,
  onOpenNewResource,
  onOpenWeeklyReview,
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'goals' | 'areas' | 'reviews'>(initialTab);
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  // Sync index on notes changes
  useEffect(() => {
    planningService.rebuild(notes, folders);
  }, [notes, folders]);

  const projects = useMemo(() => planningService.getProjects() || [], [notes]);
  const goals = useMemo(() => planningService.getGoals() || [], [notes]);
  const areas = useMemo(() => planningService.getAreas() || [], [notes]);
  const reviews = useMemo(() => planningService.getReviews() || [], [notes]);
  const attentionSignals = useMemo(() => planningService.getAttentionSignals() || [], [notes]);

  // Filtered lists
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.title.toLowerCase().includes(q) ||
          p.areaTitle?.toLowerCase().includes(q) ||
          p.goalTitles.some((g) => g.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return g.title.toLowerCase().includes(q) || g.areaTitle?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [goals, statusFilter, searchQuery]);

  const filteredAreas = useMemo(() => {
    return areas.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        return a.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }
      return true;
    });
  }, [areas, statusFilter, searchQuery]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedResourceId),
    [projects, selectedResourceId]
  );
  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === selectedResourceId),
    [goals, selectedResourceId]
  );
  const selectedArea = useMemo(
    () => areas.find((a) => a.id === selectedResourceId),
    [areas, selectedResourceId]
  );

  const handleUpdateProjectStatus = async (projectId: string, newStatus: ProjectStatus) => {
    const note = notes.find((n) => n.id === projectId);
    if (!note) return;
    const updatedContent = updatePropertyInFrontmatter(note.content || '', 'status', newStatus);
    await onSaveNote({ ...note, content: updatedContent });
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    planned: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    waiting: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    paused: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
    completed: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    cancelled: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    achieved: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  };

  return (
    <div className="flex h-full w-full bg-zinc-50/50 dark:bg-zinc-950 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Workspace Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Goals, Projects & Areas
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Structured views over canonical planning notes
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenNewResource(activeTab === 'goals' ? 'goal' : activeTab === 'areas' ? 'area' : 'project')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New {activeTab === 'goals' ? 'Goal' : activeTab === 'areas' ? 'Area' : 'Project'}
            </button>
            <button
              onClick={onOpenWeeklyReview}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Review
            </button>
          </div>
        </div>

        {/* Tab & View Switcher Bar */}
        <div className="px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex items-center justify-between gap-4 flex-shrink-0 flex-wrap">
          {/* Main Domain Tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveTab('projects');
                setSelectedResourceId(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'projects'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
              Projects ({projects.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('goals');
                setSelectedResourceId(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'goals'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              Goals ({goals.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('areas');
                setSelectedResourceId(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'areas'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-500" />
              Areas ({areas.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('reviews');
                setSelectedResourceId(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Reviews ({reviews.length})
            </button>
          </div>

          {/* View Modes */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Cards Gallery"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              {activeTab === 'projects' && (
                <button
                  onClick={() => setViewMode('board')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'board'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title="Status Board"
                >
                  <Kanban className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="px-6 py-2.5 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, area, or tag..."
              className="w-full pl-9 pr-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="planned">Planned</option>
              <option value="waiting">Waiting</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* View Surface Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ================= PROJECTS TAB ================= */}
          {activeTab === 'projects' && (
            <div>
              {viewMode === 'table' && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Project Title</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Deadline</th>
                        <th className="py-3 px-4">Next Action</th>
                        <th className="py-3 px-4">Progress</th>
                        <th className="py-3 px-4">Area / Goal</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filteredProjects.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-zinc-400 italic">
                            No projects matching criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredProjects.map((p) => (
                          <tr
                            key={p.id}
                            onClick={() => setSelectedResourceId(p.id)}
                            className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors ${
                              selectedResourceId === p.id
                                ? 'bg-blue-50/50 dark:bg-blue-950/20'
                                : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                              <div className="flex items-center gap-2">
                                <FolderKanban className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <span className="truncate max-w-xs">{p.title}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  statusColors[p.status] || 'bg-zinc-100 dark:bg-zinc-800'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                              {p.due || '—'}
                            </td>
                            <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                              {p.nextActionTask?.title || (
                                <span className="italic text-zinc-400">No action</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                              {p.progressText || '—'}
                            </td>
                            <td className="py-3 px-4 text-zinc-500 max-w-[150px] truncate">
                              {p.areaTitle || p.goalTitles.join(', ') || '—'}
                            </td>
                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onOpenNote(p.noteId)}
                                className="p-1 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
                                title="Open Canonical Note"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {viewMode === 'cards' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedResourceId(p.id)}
                      className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 hover:border-blue-500/40 cursor-pointer transition-all flex flex-col justify-between ${
                        selectedResourceId === p.id
                          ? 'border-blue-500 ring-1 ring-blue-500'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                              statusColors[p.status] || 'bg-zinc-100'
                            }`}
                          >
                            {p.status}
                          </span>
                          {p.due && (
                            <span className="text-[11px] font-mono text-zinc-500">Due: {p.due}</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1.5">
                          {p.title}
                        </h3>
                        {p.nextActionTask && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1">
                            Next: {p.nextActionTask.title}
                          </p>
                        )}
                      </div>

                      {p.progressPercent !== null && (
                        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                            <span>Progress</span>
                            <span>{p.progressText}</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${p.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'board' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
                  {(['planned', 'active', 'waiting', 'completed'] as ProjectStatus[]).map((col) => (
                    <div
                      key={col}
                      className="bg-zinc-100/60 dark:bg-zinc-900/60 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 flex flex-col min-w-[260px]"
                    >
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          {col}
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {projects.filter((p) => p.status === col).length}
                        </span>
                      </div>

                      <div className="space-y-2.5 overflow-y-auto flex-1">
                        {projects
                          .filter((p) => p.status === col)
                          .map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setSelectedResourceId(p.id)}
                              className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/40 cursor-pointer transition-colors shadow-sm"
                            >
                              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs mb-1">
                                {p.title}
                              </h4>
                              {p.due && (
                                <p className="text-[11px] text-zinc-500 font-mono">Due: {p.due}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= GOALS TAB ================= */}
          {activeTab === 'goals' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGoals.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setSelectedResourceId(g.id)}
                  className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 hover:border-indigo-500/40 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedResourceId === g.id
                      ? 'border-indigo-500 ring-1 ring-indigo-500'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                          statusColors[g.status] || 'bg-zinc-100'
                        }`}
                      >
                        {g.status}
                      </span>
                      {g.targetDate && (
                        <span className="text-[11px] font-mono text-zinc-500">
                          Target: {g.targetDate}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1.5">
                      {g.title}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {g.activeProjectsCount} active supporting project(s)
                    </p>
                  </div>

                  {g.progressPercent !== undefined && (
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                        <span>Progress</span>
                        <span>{g.progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${g.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ================= AREAS TAB ================= */}
          {activeTab === 'areas' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAreas.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedResourceId(a.id)}
                  className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 hover:border-teal-500/40 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedResourceId === a.id
                      ? 'border-teal-500 ring-1 ring-teal-500'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                        <Layers className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                        {a.title}
                      </h3>
                    </div>
                    <div className="space-y-1 text-xs text-zinc-500 mt-2">
                      <p>• {a.activeGoalsCount} Active Goals</p>
                      <p>• {a.activeProjectsCount} Active Projects</p>
                      <p>• {a.peopleIds.length} Linked People</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNote(a.noteId);
                      }}
                      className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline flex items-center gap-1"
                    >
                      Open Note
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ================= REVIEWS TAB ================= */}
          {activeTab === 'reviews' && (
            <div className="space-y-4 max-w-2xl">
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">
                    Periodic Review Companion
                  </h3>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400">
                    Conduct your weekly, monthly, or quarterly reflections
                  </p>
                </div>
                <button
                  onClick={onOpenWeeklyReview}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Launch Review Workspace
                </button>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                {reviews.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-xs italic">
                    No historical review notes recorded yet.
                  </div>
                ) : (
                  reviews.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => onOpenNote(r.noteId)}
                      className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {r.title}
                        </h4>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">
                          {r.periodStart} to {r.periodEnd}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-400" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Detail Inspector Panel (if item selected) */}
      {selectedResourceId && (
        <div className="w-80 lg:w-96 flex-shrink-0">
          {selectedProject && (
            <ProjectDetailInspector
              project={selectedProject}
              onOpenNote={onOpenNote}
              onUpdateStatus={(st) => handleUpdateProjectStatus(selectedProject.id, st)}
              onClose={() => setSelectedResourceId(null)}
            />
          )}
          {selectedGoal && (
            <GoalDetailInspector
              goal={selectedGoal}
              onOpenNote={onOpenNote}
              onClose={() => setSelectedResourceId(null)}
            />
          )}
          {selectedArea && (
            <AreaDetailInspector
              area={selectedArea}
              onOpenNote={onOpenNote}
              onClose={() => setSelectedResourceId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
};
