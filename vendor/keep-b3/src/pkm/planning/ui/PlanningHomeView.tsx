import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Sparkles,
  Star,
  FolderKanban,
  Target,
  Layers,
  Inbox,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  Plus,
  ExternalLink,
  Users,
  ChevronRight,
  TrendingUp,
  Settings,
  Flame,
} from 'lucide-react';
import { Note, Folder, AppSettings } from '../../../types';
import {
  GoalRecord,
  ProjectRecord,
  AreaRecord,
  FocusItem,
  PlanningAttentionSignal,
} from '../planningTypes';
import { trackingService } from '../../tracking/trackingService';
import { RoutineDefinition, CheckInDefinition } from '../../tracking/trackingTypes';
import { RoutineRunnerModal } from '../../tracking/ui/RoutineRunnerModal';
import { CheckInModal } from '../../tracking/ui/CheckInModal';
import { planningService } from '../planningService';
import { focusManager } from '../focusManager';
import { dailyNotesService } from '../../dailyNotes/dailyNotesService';
import { peopleService } from '../../people/peopleService';
import { temporalIndex } from '../../temporal/temporalIndex';
import { getTodayDateString } from '../../temporal/dateUtils';
import { extractTasksFromNote } from '../../tasks/taskParser';
import { PKMTask } from '../../tasks/taskTypes';

interface PlanningHomeViewProps {
  notes: Note[];
  folders: Folder[];
  appSettings: AppSettings;
  onOpenNote: (noteId: string) => void;
  onOpenDailyNote: () => void;
  onOpenQuickCapture?: () => void;
  onOpenGoalsProjectsWorkspace: (initialTab?: 'projects' | 'goals' | 'areas' | 'reviews') => void;
  onOpenWeeklyReview: () => void;
  onOpenFocusPicker: () => void;
  onOpenNewResource: (type: 'project' | 'goal' | 'area') => void;
  onOpenPeopleWorkspace?: () => void;
  onOpenRoutines?: () => void;
}

export const PlanningHomeView: React.FC<PlanningHomeViewProps> = ({
  notes,
  folders,
  appSettings,
  onOpenNote,
  onOpenDailyNote,
  onOpenQuickCapture,
  onOpenGoalsProjectsWorkspace,
  onOpenWeeklyReview,
  onOpenFocusPicker,
  onOpenNewResource,
  onOpenPeopleWorkspace,
  onOpenRoutines,
}) => {
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [trackingData, setTrackingData] = useState(() => trackingService.getTodayDueSummaries());
  const [activeRoutineModal, setActiveRoutineModal] = useState<RoutineDefinition | null>(null);
  const [activeCheckInModal, setActiveCheckInModal] = useState<CheckInDefinition | null>(null);
  const today = getTodayDateString();

  const refreshTracking = () => {
    setTrackingData(trackingService.getTodayDueSummaries(today));
  };

  // Re-index planning service on notes change
  useEffect(() => {
    planningService.rebuild(notes, folders);
    setFocusItems(planningService.getFocusItems(notes));

    const unsubFocus = focusManager.subscribe(() => {
      setFocusItems(planningService.getFocusItems(notes));
    });

    const unsubPlan = planningService.subscribe(() => {
      setFocusItems(planningService.getFocusItems(notes));
    });

    return () => {
      unsubFocus();
      unsubPlan();
    };
  }, [notes, folders]);

  const projects = useMemo(() => planningService.getProjects() || [], [notes]);
  const goals = useMemo(() => planningService.getGoals() || [], [notes]);
  const areas = useMemo(() => planningService.getAreas() || [], [notes]);
  const attentionSignals = useMemo(() => planningService.getAttentionSignals() || [], [notes]);

  // Today's Daily Note status (without creating it silently!)
  const todayDailyNote = useMemo(() => {
    return dailyNotesService.findDailyNote(notes, new Date());
  }, [notes]);

  // Today's tasks from notes
  const todayTasks: PKMTask[] = useMemo(() => {
    const list: PKMTask[] = [];
    for (const note of notes) {
      if (note.trashed) continue;
      const tasks = extractTasksFromNote(note);
      for (const t of tasks) {
        if (!t.completed && t.noteDate && t.noteDate <= today) {
          list.push(t);
        }
      }
    }
    return list.slice(0, 8);
  }, [notes, today]);

  // Active Projects (limit 4 for home view)
  const activeProjects = useMemo(() => {
    return projects.filter((p) => p.status === 'active').slice(0, 5);
  }, [projects]);

  // Active Goals (limit 3 for home view)
  const activeGoals = useMemo(() => {
    return goals.filter((g) => g.status === 'active').slice(0, 4);
  }, [goals]);

  // Unprocessed Inbox Notes
  const inboxNotes = useMemo(() => {
    return notes.filter((n) => {
      if (n.trashed) return false;
      return n.tags?.includes('inbox') || n.title.toLowerCase().startsWith('inbox');
    });
  }, [notes]);

  // People Follow-up Queue from P48
  const followUpQueue = useMemo(() => {
    return peopleService.getFollowUpQueue().slice(0, 4);
  }, [notes]);

  // Today's formatted friendly date
  const friendlyDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  return (
    <div className="h-full w-full bg-zinc-50/70 dark:bg-zinc-950 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Greeting & Fast Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Personal Planning & Execution Hub
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {friendlyDate}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenDailyNote}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              title="Open or create today's daily note"
            >
              <Calendar className="w-4 h-4" />
              {todayDailyNote ? "Open Today's Note" : 'Plan Today'}
            </button>

            <button
              onClick={onOpenWeeklyReview}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Weekly Review
            </button>

            {onOpenQuickCapture && (
              <button
                onClick={onOpenQuickCapture}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-1.5 transition-colors"
                title="Quick Capture"
              >
                <Inbox className="w-4 h-4 text-purple-500" />
                Capture
              </button>
            )}
          </div>
        </div>

        {/* Attention Signals Banner (if any critical or high priority signals exist) */}
        {attentionSignals.length > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-semibold">Planning Attention:</span>{' '}
                {attentionSignals.slice(0, 2).map((s, idx) => (
                  <span key={s.id}>
                    {idx > 0 && ' • '}
                    <strong className="text-amber-950 dark:text-amber-100">{s.resourceTitle}</strong>:{' '}
                    {s.message}
                  </span>
                ))}
                {attentionSignals.length > 2 && (
                  <span className="ml-1 opacity-80">
                    (+{attentionSignals.length - 2} more items)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onOpenGoalsProjectsWorkspace('projects')}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 flex-shrink-0"
            >
              View All
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary 2-Column Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols on desktop): Focus & Today's Agenda */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. CURRENT FOCUS SECTION */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      Current Focus
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Key active projects & priorities emphasized now
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenFocusPicker}
                  className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  Manage Focus ({focusItems.length})
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {focusItems.length === 0 ? (
                <div className="p-6 text-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs">
                  <p>No active focus items selected.</p>
                  <button
                    onClick={onOpenFocusPicker}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Select Focus Projects
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {focusItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onOpenNote(item.resourceId)}
                      className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/40 dark:hover:border-amber-500/40 bg-zinc-50/60 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            {item.type}
                          </span>
                          <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 line-clamp-1">
                          {item.title}
                        </h3>
                        {item.nextAction && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                            <Circle className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            <span className="truncate">Next: {item.nextAction}</span>
                          </p>
                        )}
                      </div>

                      {item.progressPercent !== undefined && (
                        <div className="mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                            <span>Progress</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {item.progressText || `${item.progressPercent}%`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${item.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. TODAY & DUE TASKS SECTION */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      Today's Actionable Tasks
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Tasks due today or scheduled in canonical notes
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenDailyNote}
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Daily Note
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {todayTasks.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs">
                  No tasks due today. You're clear!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {todayTasks.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Circle className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {t.text}
                        </span>
                      </div>
                      <button
                        onClick={() => onOpenNote(t.noteId)}
                        className="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 text-[11px] flex-shrink-0"
                        title={`From note: ${t.noteTitle}`}
                      >
                        <span className="truncate max-w-[120px]">{t.noteTitle}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2.5 ROUTINES, HABITS & TRACKING (P50) */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      Today's Habits & Recurring Routines
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {trackingData.habits.filter((h) => h.isCompleted).length} of {trackingData.habits.length} habits recorded
                    </p>
                  </div>
                </div>
                {onOpenRoutines && (
                  <button
                    onClick={onOpenRoutines}
                    className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    All Routines
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Scheduled Routines */}
              {trackingData.routines.length > 0 && (
                <div className="mb-3 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Active Routines
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {trackingData.routines.map(({ definition, activeRun }) => (
                      <div
                        key={definition.id}
                        className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {definition.name}
                          </p>
                          <span className="text-[10px] text-zinc-500">
                            {definition.items.length} steps • {activeRun?.completedAt ? 'Completed' : activeRun ? 'In progress' : 'Ready'}
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveRoutineModal(definition)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 text-white hover:bg-amber-700 shadow-xs"
                        >
                          {activeRun?.completedAt ? 'Review' : activeRun ? 'Resume' : 'Run'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Habits List */}
              {trackingData.habits.length === 0 ? (
                <div className="p-3 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                  No habits scheduled for today.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {trackingData.habits.slice(0, 5).map((h) => (
                    <div
                      key={h.definitionId}
                      className={`p-2.5 rounded-lg border transition-colors flex items-center justify-between gap-3 text-xs ${
                        h.isCompleted
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                          : 'bg-zinc-50/50 dark:bg-zinc-950/30 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer flex-1"
                        onClick={() => {
                          trackingService.toggleCompletionHabit(h.definitionId, today);
                          refreshTracking();
                        }}
                      >
                        {h.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        )}
                        <span
                          className={`font-medium ${
                            h.isCompleted
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {h.definitionName}
                        </span>
                        {h.daypart && (
                          <span className="text-[9px] uppercase font-bold text-zinc-400 px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                            {h.daypart}
                          </span>
                        )}
                      </div>

                      {/* Quick record buttons */}
                      {h.trackingType === 'duration' && (
                        <button
                          onClick={() => {
                            trackingService.recordEntry({
                              definitionId: h.definitionId,
                              date: today,
                              value: 15,
                              unit: 'min',
                            });
                            refreshTracking();
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-300"
                        >
                          +15m
                        </button>
                      )}
                      {(h.trackingType === 'count' || h.trackingType === 'number') && (
                        <button
                          onClick={() => {
                            trackingService.recordEntry({
                              definitionId: h.definitionId,
                              date: today,
                              value: 1,
                              unit: h.unit,
                            });
                            refreshTracking();
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-300"
                        >
                          +1
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. ACTIVE PROJECTS LIST */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      Active Projects ({activeProjects.length})
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Ongoing deliverables with deadlines and next actions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenNewResource('project')}
                    className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="New Project"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onOpenGoalsProjectsWorkspace('projects')}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {activeProjects.length === 0 ? (
                <div className="p-6 text-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs">
                  No active projects currently configured.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onOpenNote(p.id)}
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/40 bg-zinc-50/40 dark:bg-zinc-800/30 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                            {p.title}
                          </h3>
                          {p.due && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
                              Due {p.due}
                            </span>
                          )}
                        </div>
                        {p.nextActionTask ? (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                            Next: {p.nextActionTask.title}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
                            No next action defined
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {p.progressText && (
                          <span className="text-xs text-zinc-500 font-medium">
                            {p.progressText}
                          </span>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1 Col on desktop): Goals, Inbox, Follow-ups */}
          <div className="space-y-6">
            {/* 4. LONG-TERM GOALS */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      Active Goals ({activeGoals.length})
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Outcome targets & areas
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenGoalsProjectsWorkspace('goals')}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeGoals.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic text-center py-3">
                  No active goals configured.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {activeGoals.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => onOpenNote(g.id)}
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/40 bg-zinc-50/40 dark:bg-zinc-800/30 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs truncate">
                        {g.title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        <span>{g.activeProjectsCount} active project(s)</span>
                        {g.targetDate && <span>Target: {g.targetDate}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. INBOX / QUICK CAPTURES */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      Inbox ({inboxNotes.length})
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Unprocessed quick captures
                    </p>
                  </div>
                </div>
                {onOpenQuickCapture && (
                  <button
                    onClick={onOpenQuickCapture}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Capture
                  </button>
                )}
              </div>

              {inboxNotes.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic text-center py-2">
                  Inbox is clear.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {inboxNotes.slice(0, 4).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onOpenNote(n.id)}
                      className="w-full p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate flex items-center justify-between group"
                    >
                      <span className="truncate">{n.title || 'Untitled Capture'}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 6. PEOPLE FOLLOW-UPS (P48 Integration) */}
            {followUpQueue.length > 0 && (
              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                        Follow-Up Queue
                      </h2>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Pending relationship check-ins
                      </p>
                    </div>
                  </div>
                  {onOpenPeopleWorkspace && (
                    <button
                      onClick={onOpenPeopleWorkspace}
                      className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                    >
                      People
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {followUpQueue.map((item) => (
                    <div
                      key={item.person.id}
                      onClick={() => onOpenNote(item.person.id)}
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-teal-500/40 bg-zinc-50/40 dark:bg-zinc-800/30 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs truncate">
                          {item.person.name}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {item.dueText || item.reason}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. AREAS OF RESPONSIBILITY SHORTCUT */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                    Areas of Responsibility ({areas.length})
                  </h2>
                </div>
                <button
                  onClick={() => onOpenGoalsProjectsWorkspace('areas')}
                  className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  Manage
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onOpenNote(a.id)}
                    className="px-2.5 py-1 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeRoutineModal && (
        <RoutineRunnerModal
          definition={activeRoutineModal}
          isOpen={true}
          onClose={() => {
            setActiveRoutineModal(null);
            refreshTracking();
          }}
          onCompleted={() => {
            setActiveRoutineModal(null);
            refreshTracking();
          }}
        />
      )}

      {activeCheckInModal && (
        <CheckInModal
          definition={activeCheckInModal}
          isOpen={true}
          onClose={() => {
            setActiveCheckInModal(null);
            refreshTracking();
          }}
          onSave={() => {
            setActiveCheckInModal(null);
            refreshTracking();
          }}
        />
      )}
    </div>
  );
};
