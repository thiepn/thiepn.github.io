import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  Circle,
  Plus,
  Play,
  RotateCcw,
  CheckSquare,
  Calendar,
  Clock,
  Target,
  Sparkles,
  BarChart2,
  Filter,
  MoreVertical,
  Pause,
  Archive,
  Trash2,
  Edit2,
  FileSpreadsheet,
  ChevronRight,
  Sun,
  Moon,
  Coffee,
  Flame,
} from 'lucide-react';
import {
  TrackingDefinition,
  RoutineDefinition,
  CheckInDefinition,
  TrackingEntry,
  DailyTrackingSummary,
} from '../trackingTypes';
import { trackingService } from '../trackingService';
import { getTodayDateString, addDays } from '../../temporal/dateUtils';
import { RoutineRunnerModal } from './RoutineRunnerModal';
import { CheckInModal } from './CheckInModal';
import {
  EditTrackingDefinitionModal,
  DefinitionKind,
} from './EditTrackingDefinitionModal';
import { TrackingHistoryModal } from './TrackingHistoryModal';
import { useWorkspace } from '../../useWorkspace';

export type TrackingWorkspaceTab = 'today' | 'habits' | 'routines' | 'checkins' | 'history';

export const RoutinesWorkspaceView: React.FC = () => {
  const { openPlanningHome, openCalendar, openNote, openGoalsProjects } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TrackingWorkspaceTab>('today');
  const [todayStr, setTodayStr] = useState<string>(getTodayDateString());

  // Data states
  const [definitions, setDefinitions] = useState<TrackingDefinition[]>([]);
  const [routines, setRoutines] = useState<RoutineDefinition[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInDefinition[]>([]);
  const [todayData, setTodayData] = useState<ReturnType<typeof trackingService.getTodayDueSummaries>>({
    habits: [],
    routines: [],
    checkIns: [],
  });

  // Modal states
  const [activeRoutineToRun, setActiveRoutineToRun] = useState<RoutineDefinition | null>(null);
  const [activeCheckInToRun, setActiveCheckInToRun] = useState<CheckInDefinition | null>(null);
  const [editModalKind, setEditModalKind] = useState<DefinitionKind | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [historyDef, setHistoryDef] = useState<TrackingDefinition | null>(null);

  // Undo notice
  const [undoNotice, setUndoNotice] = useState<string | null>(null);

  const refreshData = () => {
    setDefinitions(trackingService.getDefinitions(true));
    setRoutines(trackingService.getRoutines(true));
    setCheckIns(trackingService.getCheckIns(true));
    setTodayData(trackingService.getTodayDueSummaries(todayStr));
  };

  useEffect(() => {
    refreshData();
  }, [todayStr]);

  const handleToggleHabit = (defId: string) => {
    trackingService.toggleCompletionHabit(defId, todayStr);
    refreshData();
    showUndo('Habit state updated');
  };

  const handleIncrementHabit = (defId: string, amount: number, unit?: string) => {
    trackingService.recordEntry({
      definitionId: defId,
      date: todayStr,
      value: amount,
      unit,
    });
    refreshData();
    showUndo(`Recorded +${amount} ${unit || ''}`);
  };

  const showUndo = (msg: string) => {
    setUndoNotice(msg);
    setTimeout(() => setUndoNotice(null), 4000);
  };

  const handleUndo = () => {
    const undone = trackingService.undoLastEntry();
    if (undone) {
      refreshData();
      setUndoNotice('Action undone');
      setTimeout(() => setUndoNotice(null), 2000);
    }
  };

  const handleTogglePause = (def: TrackingDefinition) => {
    const nextStatus = def.status === 'paused' ? 'active' : 'paused';
    trackingService.setDefinitionStatus(def.id, nextStatus);
    refreshData();
  };

  const handleToggleArchive = (def: TrackingDefinition) => {
    const nextStatus = def.status === 'archived' ? 'active' : 'archived';
    trackingService.setDefinitionStatus(def.id, nextStatus);
    refreshData();
  };

  const completedTodayCount = todayData.habits.filter((h) => h.isCompleted).length;
  const totalTodayHabits = todayData.habits.length;

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Routines & Tracking
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Deliberate habits, recurring routines, structured check-ins & metrics
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingItem(null);
              setEditModalKind('habit');
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Habit
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setEditModalKind('routine');
            }}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Routine
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setEditModalKind('checkin');
            }}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Check-In
          </button>
        </div>
      </div>

      {/* Workspace Tabs Bar */}
      <div className="px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 flex-shrink-0">
        {[
          { id: 'today', label: 'Today’s Routines', count: totalTodayHabits },
          { id: 'habits', label: 'Habits & Metrics', count: definitions.length },
          { id: 'routines', label: 'Routines', count: routines.length },
          { id: 'checkins', label: 'Check-Ins', count: checkIns.length },
          { id: 'history', label: 'History & Logs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TrackingWorkspaceTab)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Undo Toast */}
        {undoNotice && (
          <div className="fixed bottom-6 right-6 z-40 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2.5 rounded-lg shadow-xl border border-zinc-700 dark:border-zinc-300 flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2">
            <span>{undoNotice}</span>
            <button
              onClick={handleUndo}
              className="px-2 py-0.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded font-bold text-[11px] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </button>
          </div>
        )}

        {/* TAB 1: TODAY */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            {/* Quick stats banner */}
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Today’s Personal Operations
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {completedTodayCount} of {totalTodayHabits} habits recorded today ({todayStr})
                  </p>
                </div>
              </div>

              <button
                onClick={() => openPlanningHome()}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                Planning Hub
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Routines Due Today */}
            {todayData.routines.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-amber-500" />
                  Scheduled Routines
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todayData.routines.map(({ definition, activeRun }) => {
                    const isCompleted = !!activeRun?.completedAt;
                    return (
                      <div
                        key={definition.id}
                        className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            {definition.daypart === 'evening' ? (
                              <Moon className="w-4 h-4" />
                            ) : (
                              <Sun className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {definition.name}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {definition.items.length} steps •{' '}
                              {isCompleted ? 'Completed today' : activeRun ? 'In progress' : 'Ready'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveRoutineToRun(definition)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            isCompleted
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                              : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          {isCompleted ? 'Review Run' : activeRun ? 'Resume' : 'Start'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Check-Ins Due Today */}
            {todayData.checkIns.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  Structured Check-Ins
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todayData.checkIns.map(({ definition, entry }) => (
                    <div
                      key={definition.id}
                      className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {definition.name}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {entry ? 'Submitted for today' : 'Pending reflection'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveCheckInToRun(definition)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          entry
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        {entry ? 'View / Edit' : 'Check In'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Habits Due Today */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                Habits & Trackers
              </h3>

              {todayData.habits.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs">
                  No habits or trackers are scheduled for today.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayData.habits.map((h) => {
                    const def = definitions.find((d) => d.id === h.definitionId);
                    return (
                      <div
                        key={h.definitionId}
                        className={`p-4 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
                          h.isCompleted
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm'
                        }`}
                      >
                        {/* Title & target */}
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                          <button
                            type="button"
                            onClick={() => handleToggleHabit(h.definitionId)}
                            className="text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            {h.isCompleted ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <Circle className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4
                                className={`text-sm font-bold ${
                                  h.isCompleted
                                    ? 'line-through text-zinc-500 dark:text-zinc-400'
                                    : 'text-zinc-900 dark:text-zinc-100'
                                }`}
                              >
                                {h.definitionName}
                              </h4>
                              {h.daypart && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  {h.daypart}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {h.trackingType === 'duration' && (
                                <>
                                  Recorded: <span className="font-bold">{h.totalValue || 0} min</span>
                                  {h.target?.value && ` • Target: ${h.target.value} min`}
                                </>
                              )}
                              {(h.trackingType === 'count' || h.trackingType === 'number') && (
                                <>
                                  Recorded: <span className="font-bold">{h.totalValue || 0} {h.unit || ''}</span>
                                  {h.target?.value && ` • Target: ${h.target.value} ${h.unit || ''}`}
                                </>
                              )}
                              {h.trackingType === 'rating' && (
                                <>
                                  Recorded Rating: <span className="font-bold">{h.totalValue ? `${h.totalValue} / 5` : 'None'}</span>
                                </>
                              )}
                              {h.trackingType === 'completion' && (
                                <>
                                  Status: <span className="font-bold">{h.isCompleted ? 'Done' : 'Open'}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Fast Quick Record Buttons */}
                        <div className="flex items-center gap-2">
                          {h.trackingType === 'duration' && (
                            <>
                              <button
                                onClick={() => handleIncrementHabit(h.definitionId, 15, 'min')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                              >
                                +15m
                              </button>
                              <button
                                onClick={() => handleIncrementHabit(h.definitionId, 30, 'min')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                              >
                                +30m
                              </button>
                            </>
                          )}

                          {(h.trackingType === 'count' || h.trackingType === 'number') && (
                            <>
                              <button
                                onClick={() => handleIncrementHabit(h.definitionId, 1, h.unit)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => handleIncrementHabit(h.definitionId, 5, h.unit)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                              >
                                +5
                              </button>
                            </>
                          )}

                          {h.trackingType === 'rating' && (
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((r) => (
                                <button
                                  key={r}
                                  onClick={() => handleIncrementHabit(h.definitionId, r)}
                                  className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
                                    h.totalValue === r
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (def) setHistoryDef(def);
                            }}
                            title="View History & Logs"
                            className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HABITS & METRICS */}
        {activeTab === 'habits' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage user-defined habits and metrics definitions
              </p>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditModalKind('habit');
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Habit
              </button>
            </div>

            <div className="space-y-3">
              {definitions.map((def) => (
                <div
                  key={def.id}
                  className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {def.name}
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase">
                        {def.type} • {def.trackingType}
                      </span>
                      {def.status !== 'active' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 uppercase">
                          {def.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {def.description || 'No description'} •{' '}
                      {def.schedule ? `Recurrence: ${def.schedule.rawText}` : 'Ad-hoc tracker'}
                      {def.target?.value && ` • Target: ${def.target.value} ${def.unit || ''}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistoryDef(def)}
                      title="History & Logs"
                      className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleTogglePause(def)}
                      title={def.status === 'paused' ? 'Resume habit' : 'Pause habit'}
                      className="p-1.5 rounded text-zinc-400 hover:text-amber-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(def);
                        setEditModalKind(def.type === 'metric' ? 'metric' : 'habit');
                      }}
                      title="Edit definition"
                      className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(def)}
                      title="Archive definition"
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ROUTINES */}
        {activeTab === 'routines' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage ordered multi-step checklists and recurring execution flows
              </p>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditModalKind('routine');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Routine
              </button>
            </div>

            <div className="space-y-3">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {routine.name}
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        {routine.items.length} steps
                      </span>
                      {routine.daypart && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {routine.daypart}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {routine.description || 'No description'} •{' '}
                      {routine.schedule ? `Schedule: ${routine.schedule.rawText}` : 'Manual routine'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveRoutineToRun(routine)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(routine);
                        setEditModalKind('routine');
                      }}
                      className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CHECK-INS */}
        {activeTab === 'checkins' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage structured prompt questionnaires and evening reflections
              </p>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditModalKind('checkin');
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Check-In
              </button>
            </div>

            <div className="space-y-3">
              {checkIns.map((c) => (
                <div
                  key={c.id}
                  className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {c.name}
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        {c.fields.length} fields
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {c.description || 'No description'} •{' '}
                      {c.schedule ? `Schedule: ${c.schedule.rawText}` : 'Manual check-in'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveCheckInToRun(c)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Check In
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(c);
                        setEditModalKind('checkin');
                      }}
                      className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: HISTORY & LOGS */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select a habit or metric to inspect historical logs, trends, and CSV export
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {definitions.map((def) => (
                <div
                  key={def.id}
                  onClick={() => setHistoryDef(def)}
                  className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {def.name}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Type: {def.trackingType} • {def.schedule?.rawText || 'Metric'}
                    </p>
                  </div>
                  <BarChart2 className="w-5 h-5 text-zinc-400" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {activeRoutineToRun && (
        <RoutineRunnerModal
          routine={activeRoutineToRun}
          isOpen={!!activeRoutineToRun}
          onClose={() => setActiveRoutineToRun(null)}
          onCompleted={() => {
            setActiveRoutineToRun(null);
            refreshData();
          }}
        />
      )}

      {activeCheckInToRun && (
        <CheckInModal
          checkIn={activeCheckInToRun}
          isOpen={!!activeCheckInToRun}
          onClose={() => setActiveCheckInToRun(null)}
          onSubmitted={() => {
            setActiveCheckInToRun(null);
            refreshData();
          }}
        />
      )}

      {editModalKind && (
        <EditTrackingDefinitionModal
          isOpen={!!editModalKind}
          kind={editModalKind}
          initialDefinition={editingItem}
          onClose={() => {
            setEditModalKind(null);
            setEditingItem(null);
          }}
          onSaved={() => {
            setEditModalKind(null);
            setEditingItem(null);
            refreshData();
          }}
        />
      )}

      {historyDef && (
        <TrackingHistoryModal
          definition={historyDef}
          isOpen={!!historyDef}
          onClose={() => setHistoryDef(null)}
        />
      )}
    </div>
  );
};
