import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Target,
  Folder,
  Compass,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Play,
  Plus,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import { todayEngineV2, TodayDerivedState } from '../../temporal/todayEngineV2';
import { agendaEngineV2 } from '../../temporal/agendaEngineV2';
import { temporalIndexV2 } from '../../temporal/temporalIndex';
import { getTodayDateOnly } from '../../temporal/recurrenceEngineV2';
import { PlanTodayModal } from './PlanTodayModal';
import { ReviewWorkspaceModal } from './ReviewWorkspaceModal';
import { BUILTIN_REVIEW_TEMPLATES_V2 } from '../../review/reviewEngineV2';
import { ReviewTemplateV2 } from '../../review/reviewTypesV2';
import { ProjectV2, GoalV2 } from '../../planning/planningTypes';

export const PlanLandingPage: React.FC = () => {
  const [todayState, setTodayState] = useState<TodayDerivedState>(() =>
    todayEngineV2.evaluateToday(temporalIndexV2)
  );

  const [activeTab, setActiveTab] = useState<'today' | 'agenda' | 'projects' | 'goals' | 'reviews'>('today');
  const [isPlanTodayOpen, setIsPlanTodayOpen] = useState(false);
  const [activeReviewTemplate, setActiveReviewTemplate] = useState<ReviewTemplateV2 | null>(null);

  // Sample planning state (stored as canonical notes / entities)
  const [projects] = useState<ProjectV2[]>([
    {
      id: 'proj_alpha',
      title: 'Project Antigravity Architecture',
      status: 'active',
      totalTasksCount: 8,
      completedTasksCount: 5,
      openTasksCount: 3,
      nextActionTaskId: 'task_action_menu',
      nextActionTitle: 'Finalize 6-tier canonical action menu order',
      hasNoNextAction: false,
    },
    {
      id: 'proj_infra',
      title: 'Decentralized Offline Sync Protocol',
      status: 'active',
      totalTasksCount: 4,
      completedTasksCount: 4,
      openTasksCount: 0,
      hasNoNextAction: true, // Needs next action alert!
    },
  ]);

  const [goals] = useState<GoalV2[]>([
    {
      id: 'goal_q3',
      title: 'Achieve Production-Grade Offline-First PKM Architecture',
      status: 'active',
      targetDate: '2026-10-01',
      supportingProjectIds: ['proj_alpha', 'proj_infra'],
    },
  ]);

  // Seed sample projections if empty
  useEffect(() => {
    const today = getTodayDateOnly();
    if (temporalIndexV2.getForDate(today).length === 0) {
      temporalIndexV2.indexProjection({
        id: 'proj-1',
        resourceId: 'task_action_menu',
        resourceType: 'task',
        title: 'Finalize 6-tier canonical action menu order',
        field: 'due',
        dateOnly: today,
        time: '14:00',
        isAllDay: false,
        completed: false,
        priority: 'high',
      });
      temporalIndexV2.indexProjection({
        id: 'proj-2',
        resourceId: 'task_sync_spec',
        resourceType: 'task',
        title: 'Draft multi-device CRDT synchronization benchmark',
        field: 'scheduled',
        dateOnly: today,
        time: '10:00',
        isAllDay: false,
        completed: false,
      });
      setTodayState(todayEngineV2.evaluateToday(temporalIndexV2));
    }
  }, []);

  const handleToggleTask = (resourceId: string) => {
    const item = todayState.items.find((i) => i.resourceId === resourceId);
    if (!item) return;

    // Toggle completion in temporal index
    const projs = temporalIndexV2.getForDate(todayState.todayDate);
    for (const p of projs) {
      if (p.resourceId === resourceId) {
        p.completed = !p.completed;
      }
    }

    setTodayState(todayEngineV2.evaluateToday(temporalIndexV2));
  };

  const agendaDays = agendaEngineV2.generateAgenda(temporalIndexV2, { horizonDays: 14 });

  return (
    <div className="flex-1 flex flex-col bg-stone-50 dark:bg-stone-950 overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            Planning & Temporal Command
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Single view for today's focus, chronological agendas, active project health, and periodic reviews
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Plan Today CTA */}
          <button
            onClick={() => setIsPlanTodayOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sun className="w-4 h-4" /> Plan Today
          </button>

          {/* Sub Navigation */}
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'today'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Today ({todayState.stats.totalItems})
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'agenda'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Agenda (14d)
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'projects'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'goals'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Goals ({goals.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Reviews
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6 max-w-6xl w-full mx-auto">
        {/* TAB 1: TODAY */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            {/* Overdue Items Banner (if any) */}
            {todayState.overdueItems.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  Overdue Tasks ({todayState.overdueItems.length})
                </div>
                <div className="space-y-1.5">
                  {todayState.overdueItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-3 py-2 bg-white dark:bg-stone-900 rounded-lg border border-red-100 dark:border-red-900/30 text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-red-500 font-bold">OVERDUE</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Section Groups */}
            <div className="space-y-6">
              {/* NOW / FOCUS */}
              {todayState.grouped.now.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Right Now
                  </h3>
                  <div className="space-y-2">
                    {todayState.grouped.now.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleTask(item.resourceId)}
                        className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-amber-300 dark:border-amber-800/80 shadow-sm cursor-pointer flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          {item.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-amber-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-400" />
                          )}
                          <div>
                            <span
                              className={`text-sm font-semibold ${
                                item.completed ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'
                              }`}
                            >
                              {item.title}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {item.time && (
                                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                                  {item.time}
                                </span>
                              )}
                              {item.isDueToday && (
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded">
                                  Due Today
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SCHEDULED */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Scheduled & Time Blocks
                </h3>
                {todayState.grouped.scheduled.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No scheduled items for today.</p>
                ) : (
                  <div className="space-y-2">
                    {todayState.grouped.scheduled.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleTask(item.resourceId)}
                        className="p-3.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm cursor-pointer flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          {item.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-amber-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-400" />
                          )}
                          <span
                            className={`text-sm ${
                              item.completed ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-200'
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                        {item.time && (
                          <span className="text-xs font-mono text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                            {item.time}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AGENDA */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Chronological 14-day horizon projection derived from canonical tasks, events, and reviews.
            </p>

            <div className="space-y-3">
              {agendaDays.map((section) => (
                <div
                  key={section.date}
                  className={`p-4 rounded-2xl border transition-all ${
                    section.isToday
                      ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                    <span className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300">
                      {section.displayLabel}
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {section.items.length} item(s)
                    </span>
                  </div>

                  <div className="pt-2 space-y-1.5">
                    {section.items.length === 0 ? (
                      <span className="text-xs text-stone-400 italic">No scheduled items</span>
                    ) : (
                      section.items.map((item) => (
                        <div
                          key={item.id}
                          className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 rounded-lg text-xs flex items-center justify-between"
                        >
                          <span className="text-stone-800 dark:text-stone-200 font-medium">
                            {item.title}
                          </span>
                          <div className="flex items-center gap-2">
                            {item.time && (
                              <span className="text-[10px] font-mono text-stone-500">
                                {item.time}
                              </span>
                            )}
                            <span className="text-[9px] font-mono uppercase bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded">
                              {item.field}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Active Projects and next-action readiness indicators.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
                    proj.hasNoNextAction
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {proj.title}
                      </h3>
                      <span className="text-[11px] font-mono uppercase text-stone-400">
                        {proj.completedTasksCount}/{proj.totalTasksCount} Tasks
                      </span>
                    </div>

                    {proj.hasNoNextAction ? (
                      <div className="p-2.5 bg-amber-100/80 dark:bg-amber-900/40 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>No open next action defined. Project is stalled.</span>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-stone-50 dark:bg-stone-950 rounded-lg text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-stone-400">
                          Next Action
                        </span>
                        <p className="font-semibold text-stone-800 dark:text-stone-200">
                          {proj.nextActionTitle}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                    <button
                      onClick={() => {
                        const template = BUILTIN_REVIEW_TEMPLATES_V2.find((t) => t.type === 'project_review');
                        if (template) setActiveReviewTemplate(template);
                      }}
                      className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Compass className="w-3.5 h-3.5" /> Project Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: GOALS */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Long-term intentions and supporting active project linkages.
            </p>

            <div className="space-y-3">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {goal.title}
                    </h3>
                    {goal.targetDate && (
                      <span className="text-xs font-mono text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                        Target: {goal.targetDate}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Supporting Projects: {goal.supportingProjectIds.length} active projects linked
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Periodic reflection templates backed by factual query evidence panels.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BUILTIN_REVIEW_TEMPLATES_V2.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {tmpl.title}
                      </h3>
                      <span className="text-[11px] font-mono uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                        {tmpl.type}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {tmpl.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                    <button
                      onClick={() => setActiveReviewTemplate(tmpl)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Compass className="w-3.5 h-3.5" /> Start Reflection
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plan Today Modal */}
      {isPlanTodayOpen && (
        <PlanTodayModal
          isOpen={true}
          onClose={() => {
            setIsPlanTodayOpen(false);
            setTodayState(todayEngineV2.evaluateToday(temporalIndexV2));
          }}
        />
      )}

      {/* Review Workspace Modal */}
      {activeReviewTemplate && (
        <ReviewWorkspaceModal
          isOpen={true}
          onClose={() => setActiveReviewTemplate(null)}
          template={activeReviewTemplate}
        />
      )}
    </div>
  );
};
