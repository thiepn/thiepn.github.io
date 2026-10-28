/**
 * Phase P59 - Personal OS Unified Home View
 * The primary unified landing surface for the entire PKM operating system.
 * Answers "What matters right now?", "What was I working on?", and "What needs attention today?"
 * Derived completely from authoritative canonical systems with strictly zero artificial scores.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  Star,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  Plus,
  ExternalLink,
  Users,
  ChevronRight,
  FolderKanban,
  Target,
  GraduationCap,
  Plane,
  Scale,
  Box,
  BookOpen,
  DollarSign,
  Heart,
  Inbox,
  Calendar,
  Flame,
  Pin,
  CheckSquare,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Note, Folder, AppSettings } from '../../../types';
import { ContextDescriptor, AttentionItem, ContextResumeState } from '../contextTypes';
import { contextEngine } from '../contextEngine';
import { contextStorage } from '../contextStorage';
import { attentionEngine } from '../attentionEngine';
import { planningService } from '../../planning/planningService';
import { focusManager } from '../../planning/focusManager';
import { dailyNotesService } from '../../dailyNotes/dailyNotesService';
import { getTodayDateString } from '../../temporal/dateUtils';
import { extractTasksFromNote } from '../../tasks/taskParser';
import { PKMTask } from '../../tasks/taskTypes';
import { universalInboxService } from '../../inbox/universalInboxService';
import { trackingService } from '../../tracking/trackingService';
import { RoutineRunnerModal } from '../../tracking/ui/RoutineRunnerModal';
import { CheckInModal } from '../../tracking/ui/CheckInModal';
import { RoutineDefinition, CheckInDefinition } from '../../tracking/trackingTypes';
import { homeCustomizer } from '../../personalization/homeCustomizer';
import { preferenceService } from '../../personalization/preferenceService';

interface PersonalOSHomeViewProps {
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
  onOpenLearning?: () => void;
  onOpenLibrary?: () => void;
  onOpenFinance?: () => void;
  onOpenHealth?: () => void;
  onOpenTravel?: () => void;
  onOpenAssets?: () => void;
  onOpenDecisions?: () => void;
  onOpenUniversalInbox?: () => void;
  onOpenContextSwitcher: () => void;
  onStartContext?: (descriptor: ContextDescriptor) => void;
  onOpenPersonalization?: () => void;
}

export const PersonalOSHomeView: React.FC<PersonalOSHomeViewProps> = ({
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
  onOpenLearning,
  onOpenLibrary,
  onOpenFinance,
  onOpenHealth,
  onOpenTravel,
  onOpenAssets,
  onOpenDecisions,
  onOpenUniversalInbox,
  onOpenContextSwitcher,
  onStartContext,
  onOpenPersonalization,
}) => {
  const [activeContext, setActiveContext] = useState<ContextDescriptor | null>(() => contextEngine.getActiveContext());
  const [attentionFilter, setAttentionFilter] = useState<'all' | 'tasks' | 'inbox' | 'system'>('all');
  const [activeRoutineModal, setActiveRoutineModal] = useState<RoutineDefinition | null>(null);
  const [activeCheckInModal, setActiveCheckInModal] = useState<CheckInDefinition | null>(null);
  const [, setTick] = useState(0);

  const today = getTodayDateString();

  // Subscribe to context engine and attention engine updates
  useEffect(() => {
    return contextEngine.subscribe(() => {
      setActiveContext(contextEngine.getActiveContext());
      setTick((t) => t + 1);
    });
  }, []);

  // Re-index planning & focus
  useEffect(() => {
    planningService.rebuild(notes, folders);
  }, [notes, folders]);

  // Focus items
  const focusItems = useMemo(() => {
    return planningService.getFocusItems(notes);
  }, [notes]);

  // Unified Attention queue
  const attentionItems = useMemo(() => {
    return attentionEngine.getAllAttention(notes);
  }, [notes]);

  const filteredAttention = useMemo(() => {
    if (attentionFilter === 'all') return attentionItems;
    if (attentionFilter === 'tasks') return attentionItems.filter((i) => i.sourceDomain === 'tasks');
    if (attentionFilter === 'inbox') return attentionItems.filter((i) => i.sourceDomain === 'inbox');
    return attentionItems.filter((i) => i.sourceDomain !== 'tasks' && i.sourceDomain !== 'inbox');
  }, [attentionItems, attentionFilter]);

  // Recent Resume Checkpoints (Workstreams)
  const recentResumes = useMemo(() => {
    return contextStorage.getRecentResumeStates(4);
  }, [notes]);

  // Today's Daily Note status (without creating it silently)
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
    return list;
  }, [notes, today]);

  // Unprocessed Inbox count
  const inboxUnprocessedCount = useMemo(() => {
    try {
      return universalInboxService.getUnprocessedCount();
    } catch (_) {
      return 0;
    }
  }, []);

  // Due routines
  const dueRoutines = useMemo(() => {
    try {
      return trackingService.getTodayDueSummaries(today);
    } catch (_) {
      return null;
    }
  }, [today]);

  const handleResumeWorkstream = (state: ContextResumeState) => {
    const descriptor: ContextDescriptor = {
      id: state.contextId,
      type: state.contextType,
      title: state.contextTitle,
      subtitle: state.previewText,
      explicit: true,
    };
    contextEngine.startContext(descriptor);
    if (onStartContext) {
      onStartContext(descriptor);
    }
  };

  const handleSnoozeAttention = (id: string) => {
    attentionEngine.snoozeItem(id, 1);
    setTick((t) => t + 1);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white pb-20">
      {/* Top Banner / Now Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Date & Greeting */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                <span>Personal OS</span>
                <span className="text-slate-600 font-normal">·</span>
                <span className="text-xs text-slate-400 font-normal">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {activeContext ? (
                  <span className="flex items-center space-x-1.5 text-blue-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Context: <strong>{activeContext.title}</strong></span>
                  </span>
                ) : (
                  <span>No active context set. System unified across all domains.</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Context Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenContextSwitcher}
              className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{activeContext ? 'Switch Context' : 'Select Context'}</span>
            </button>
            {activeContext && (
              <button
                onClick={() => contextEngine.leaveContext()}
                className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Leave
              </button>
            )}
            {onOpenQuickCapture && (
              <button
                onClick={onOpenQuickCapture}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 border border-slate-700/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Quick Capture</span>
              </button>
            )}
            {onOpenPersonalization && (
              <button
                onClick={onOpenPersonalization}
                className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 border border-slate-700/60 transition-colors"
                title="Personalization & Workflows Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Customize</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main OS Body */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* ROW 1: RESUME WORKSTREAMS ("Continue") */}
        {recentResumes.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Continue Where You Left Off</span>
              </div>
              <button
                onClick={onOpenContextSwitcher}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                All Contexts →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentResumes.map((res) => (
                <div
                  key={res.contextId}
                  onClick={() => handleResumeWorkstream(res)}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-blue-500/40 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-400 uppercase">
                        {res.contextType}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(res.lastWorkedOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-100 group-hover:text-blue-300 truncate">
                      {res.contextTitle}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {res.previewText || 'Resume workspace and continue current focus.'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-blue-400 font-medium">
                    <span>Resume</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROW 2: SPLIT - FOCUS & TODAY (Left) vs UNIFIED ATTENTION QUEUE (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: Today's Priorities & Temporal Pulse */}
          <div className="lg:col-span-7 space-y-6">
            {/* Focus Section */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>Today's Active Focus</span>
                </div>
                <button
                  onClick={onOpenFocusPicker}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  Manage Focus
                </button>
              </div>

              {focusItems.length === 0 ? (
                <div className="p-4 text-center text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800/40">
                  <p className="text-xs text-slate-400">No active focus set for today.</p>
                  <button
                    onClick={onOpenFocusPicker}
                    className="mt-2 text-xs text-blue-400 hover:underline"
                  >
                    + Choose high-priority goals or projects
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {focusItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        const desc: ContextDescriptor = {
                          id: item.id,
                          type: item.type === 'project' ? 'project' : item.type === 'goal' ? 'goal' : 'custom',
                          title: item.title,
                          explicit: true,
                        };
                        contextEngine.startContext(desc);
                        if (onStartContext) onStartContext(desc);
                      }}
                      className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase text-slate-500">{item.type}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400" />
                      </div>
                      <div className="font-medium text-xs text-slate-100 group-hover:text-blue-300 mt-1 truncate">
                        {item.title}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Tasks & Daily Note */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Today's Action Items</span>
                </div>
                <button
                  onClick={onOpenDailyNote}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  {todayDailyNote ? "Open Today's Log" : "+ Create Daily Log"}
                </button>
              </div>

              {todayTasks.length === 0 ? (
                <div className="p-4 text-center text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800/40 text-xs">
                  All scheduled tasks for today are completed.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {todayTasks.slice(0, 8).map((task) => (
                    <div
                      key={task.id}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between space-x-2"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <CheckSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-xs text-slate-200 truncate">{task.text}</span>
                      </div>
                      {task.noteId && (
                        <button
                          onClick={() => onOpenNote(task.noteId!)}
                          className="text-[10px] text-slate-500 hover:text-blue-400 font-mono shrink-0"
                        >
                          View Note →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Universal Inflow & Routines Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Inbox Pulse */}
              {onOpenUniversalInbox && (
                <div
                  onClick={onOpenUniversalInbox}
                  className="p-3 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-800/30">
                      <Inbox className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300">
                        Universal Inbox
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {inboxUnprocessedCount} unprocessed signals
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400" />
                </div>
              )}

              {/* Routines & Habits */}
              {onOpenRoutines && (
                <div
                  onClick={onOpenRoutines}
                  className="p-3 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                        Habits & Routines
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {dueRoutines ? `${dueRoutines.dueRoutinesCount} due routines` : 'Daily Tracker'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLS: UNIFIED ATTENTION QUEUE */}
          <div className="lg:col-span-5 space-y-3">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col h-full space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Unified Attention Queue</span>
                  <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                    {attentionItems.length}
                  </span>
                </div>
              </div>

              {/* Attention Category Tabs */}
              <div className="flex space-x-1 border-b border-slate-800/60 pb-2">
                <button
                  onClick={() => setAttentionFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    attentionFilter === 'all' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({attentionItems.length})
                </button>
                <button
                  onClick={() => setAttentionFilter('tasks')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    attentionFilter === 'tasks' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tasks
                </button>
                <button
                  onClick={() => setAttentionFilter('inbox')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    attentionFilter === 'inbox' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Inbox
                </button>
                <button
                  onClick={() => setAttentionFilter('system')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    attentionFilter === 'system' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  System & Life
                </button>
              </div>

              {/* Attention Item List */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[480px]">
                {filteredAttention.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">All attention conditions cleared.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">No overdue tasks, unprocessed signals, or maintenance due.</p>
                  </div>
                ) : (
                  filteredAttention.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg border text-xs transition-colors ${
                        item.severity === 'important'
                          ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="uppercase text-blue-400 font-semibold">{item.sourceDomain}</span>
                        {item.dueAt && <span className="text-amber-400">Due {item.dueAt}</span>}
                      </div>
                      <p className="text-xs text-slate-100 font-medium mt-1">{item.explanation}</p>
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/40 pt-2">
                        <button
                          onClick={() => handleSnoozeAttention(item.id)}
                          className="text-[10px] text-slate-500 hover:text-slate-300"
                        >
                          Snooze 1d
                        </button>
                        {item.actionTarget?.type === 'note' && (
                          <button
                            onClick={() => onOpenNote(item.actionTarget!.id)}
                            className="px-2 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
                          >
                            Open Note →
                          </button>
                        )}
                        {item.actionTarget?.type === 'universal-inbox' && onOpenUniversalInbox && (
                          <button
                            onClick={onOpenUniversalInbox}
                            className="px-2 py-0.5 text-[10px] bg-amber-600 hover:bg-amber-500 text-white rounded font-medium"
                          >
                            Triage Inbox →
                          </button>
                        )}
                        {item.actionTarget?.type === 'decisions' && onOpenDecisions && (
                          <button
                            onClick={onOpenDecisions}
                            className="px-2 py-0.5 text-[10px] bg-purple-600 hover:bg-purple-500 text-white rounded font-medium"
                          >
                            Review →
                          </button>
                        )}
                        {item.actionTarget?.type === 'assets' && onOpenAssets && (
                          <button
                            onClick={onOpenAssets}
                            className="px-2 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
                          >
                            Log Service →
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: DOMAIN SHORTCUTS (Canonical modules) */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Domain Workspaces
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            <button
              onClick={() => onOpenGoalsProjectsWorkspace('projects')}
              className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-left transition-colors flex items-center space-x-2"
            >
              <FolderKanban className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs font-medium text-slate-200 truncate">Projects & PARA</span>
            </button>

            {onOpenLearning && (
              <button
                onClick={onOpenLearning}
                className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-left transition-colors flex items-center space-x-2"
              >
                <GraduationCap className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">Learning</span>
              </button>
            )}

            {onOpenTravel && (
              <button
                onClick={onOpenTravel}
                className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-left transition-colors flex items-center space-x-2"
              >
                <Plane className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">Travel</span>
              </button>
            )}

            {onOpenDecisions && (
              <button
                onClick={onOpenDecisions}
                className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-left transition-colors flex items-center space-x-2"
              >
                <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">Decisions</span>
              </button>
            )}

            {onOpenAssets && (
              <button
                onClick={onOpenAssets}
                className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-left transition-colors flex items-center space-x-2"
              >
                <Box className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">Assets</span>
              </button>
            )}

            {onOpenLibrary && (
              <button
                onClick={onOpenLibrary}
                className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-left transition-colors flex items-center space-x-2"
              >
                <BookOpen className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">Library</span>
              </button>
            )}

            {onOpenPeopleWorkspace && (
              <button
                onClick={onOpenPeopleWorkspace}
                className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-left transition-colors flex items-center space-x-2"
              >
                <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">People</span>
              </button>
            )}

            {onOpenFinance && (
              <button
                onClick={onOpenFinance}
                className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-left transition-colors flex items-center space-x-2"
              >
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">Finance</span>
              </button>
            )}

            {onOpenHealth && (
              <button
                onClick={onOpenHealth}
                className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-left transition-colors flex items-center space-x-2"
              >
                <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">Health</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
