import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Flame,
  Sparkles,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Copy,
  Check,
  FileText,
  Calendar,
  Volume2,
  VolumeX,
  Sliders,
  X,
  ChevronRight,
  Clock,
  Target,
  Award,
  BookOpen,
  ArrowRight,
  FastForward,
  Headphones,
  CheckSquare,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { soundscapeService, SoundscapeType } from '../../utils/soundscapes';
import { fireConfetti } from '../../utils/confetti';
import { dailyNotesService } from '../../pkm/dailyNotes/dailyNotesService';

export interface InterstitialLogEntry {
  id: string;
  timestamp: string; // e.g. "09:45"
  date: string; // YYYY-MM-DD
  finished: string;
  next: string;
  tag?: string;
  completed?: boolean;
}

export interface SprintTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface PomodoroFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes?: Note[];
  folders?: Folder[];
  currentNote?: Note | null;
  onAppendToNote?: (noteId: string, appendContent: string) => Promise<void> | void;
  onCreateSessionNote?: (title: string, content: string, tags?: string[]) => Promise<void> | void;
}

type TimerMode = 'focus' | 'short_break' | 'long_break';

const DEFAULT_FOCUS_MINS = 25;
const DEFAULT_SHORT_BREAK_MINS = 5;
const DEFAULT_LONG_BREAK_MINS = 15;

const STORAGE_KEY_LOGS = 'pkm_pomodoro_interstitial_logs_v1';
const STORAGE_KEY_STATS = 'pkm_pomodoro_stats_v1';
const STORAGE_KEY_TASKS = 'pkm_pomodoro_sprint_tasks_v1';

export const PomodoroFlowModal: React.FC<PomodoroFlowModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  currentNote,
  onAppendToNote,
  onCreateSessionNote,
}) => {
  // Timer State
  const [mode, setMode] = useState<TimerMode>('focus');
  const [focusDuration, setFocusDuration] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('pkm_pomodoro_custom_focus') || '25', 10);
    } catch {
      return DEFAULT_FOCUS_MINS;
    }
  });
  const [shortBreakDuration, setShortBreakDuration] = useState<number>(DEFAULT_SHORT_BREAK_MINS);
  const [longBreakDuration, setLongBreakDuration] = useState<number>(DEFAULT_LONG_BREAK_MINS);

  const getDurationForMode = useCallback(
    (m: TimerMode) => {
      switch (m) {
        case 'focus':
          return focusDuration * 60;
        case 'short_break':
          return shortBreakDuration * 60;
        case 'long_break':
          return longBreakDuration * 60;
      }
    },
    [focusDuration, shortBreakDuration, longBreakDuration]
  );

  const [timeLeft, setTimeLeft] = useState<number>(() => focusDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [loggedToDaily, setLoggedToDaily] = useState<boolean>(false);

  // Soundscape State
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType>('none');
  const [soundVolume, setSoundVolume] = useState<number>(0.4);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Interstitial Journaling State
  const [finishedInput, setFinishedInput] = useState<string>('');
  const [nextInput, setNextInput] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('#deepwork');
  const [logs, setLogs] = useState<InterstitialLogEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LOGS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Sprint Micro-Tasks State
  const [sprintTasks, setSprintTasks] = useState<SprintTask[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TASKS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      { id: 'st-1', text: 'Define 1 primary objective for this session', completed: false },
      { id: 'st-2', text: 'Eliminate browser tabs & notifications', completed: false },
    ];
  });
  const [newTaskInput, setNewTaskInput] = useState<string>('');

  // Daily Stats State
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [stats, setStats] = useState<{
    date: string;
    completedCount: number;
    totalMinutes: number;
    dailyTarget: number;
  }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === new Date().toISOString().slice(0, 10)) {
          return parsed;
        }
      }
    } catch {}
    return {
      date: new Date().toISOString().slice(0, 10),
      completedCount: 0,
      totalMinutes: 0,
      dailyTarget: 6,
    };
  });

  // Save logs to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
    } catch {}
  }, [logs]);

  // Save stats to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch {}
  }, [stats]);

  // Save sprint tasks to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(sprintTasks));
    } catch {}
  }, [sprintTasks]);

  // Reset timer on mode change
  useEffect(() => {
    setTimeLeft(getDurationForMode(mode));
    setIsRunning(false);
  }, [mode, getDurationForMode]);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      // Timer finished!
      setIsRunning(false);
      soundscapeService.playCompletionChime();

      if (mode === 'focus') {
        fireConfetti();
        // Update stats
        setStats((prev) => ({
          ...prev,
          completedCount: prev.completedCount + 1,
          totalMinutes: prev.totalMinutes + focusDuration,
        }));
        // Switch to short break
        setMode('short_break');
      } else {
        // Break finished, ready to focus
        setMode('focus');
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, focusDuration]);

  // Manage Soundscapes when timer runs
  useEffect(() => {
    if (isRunning && soundEnabled && activeSoundscape !== 'none') {
      soundscapeService.setVolume(soundVolume);
      soundscapeService.start(activeSoundscape);
    } else {
      soundscapeService.stop();
    }

    return () => {
      soundscapeService.stop();
    };
  }, [isRunning, soundEnabled, activeSoundscape, soundVolume]);

  const handleToggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getDurationForMode(mode));
  };

  const handleSkipTimer = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      setMode('short_break');
    } else {
      setMode('focus');
    }
  };

  const handleAddFiveMinutes = () => {
    setTimeLeft((prev) => prev + 300);
  };

  // Interstitial Log Submission
  const handleAddInterstitialLog = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!finishedInput.trim() && !nextInput.trim()) return;

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newEntry: InterstitialLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: timeFormatted,
      date: todayStr,
      finished: finishedInput.trim() || 'Focus interval completed',
      next: nextInput.trim(),
      tag: selectedTag,
      completed: true,
    };

    setLogs((prev) => [newEntry, ...prev]);
    setFinishedInput('');
    setNextInput('');
    setLoggedToDaily(false);
  };

  const handleDeleteLog = (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  // Sprint Tasks handlers
  const handleAddSprintTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    setSprintTasks((prev) => [
      ...prev,
      { id: `st-${Date.now()}`, text: newTaskInput.trim(), completed: false },
    ]);
    setNewTaskInput('');
  };

  const handleToggleSprintTask = (id: string) => {
    setSprintTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = !t.completed;
          if (next) {
            // Populate finished input for ease of interstitial logging!
            setFinishedInput((curr) => (curr ? `${curr}; ${t.text}` : t.text));
          }
          return { ...t, completed: next };
        }
        return t;
      })
    );
  };

  const handleDeleteSprintTask = (id: string) => {
    setSprintTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Format logs as Markdown
  const markdownFormattedLogs = useMemo(() => {
    const todayLogs = logs.filter((l) => l.date === todayStr);
    if (todayLogs.length === 0) return '';

    let md = `### 🍅 Deep Work & Interstitial Journal (${todayStr})\n`;
    md += `* **Completed Pomodoros:** ${stats.completedCount} (${stats.totalMinutes} mins)\n\n`;

    todayLogs.forEach((l) => {
      md += `- **[${l.timestamp}]** ${l.tag ? `${l.tag} ` : ''}Finished: ${l.finished}`;
      if (l.next) {
        md += ` ➔ *Next:* ${l.next}`;
      }
      md += `\n`;
    });

    return md;
  }, [logs, todayStr, stats]);

  // Copy Logs to Clipboard
  const handleCopyLogs = async () => {
    if (!markdownFormattedLogs) return;
    try {
      await navigator.clipboard.writeText(markdownFormattedLogs);
      setCopiedState('logs');
      setTimeout(() => setCopiedState(null), 2000);
    } catch {}
  };

  // Log to Daily Note
  const handleLogToDailyNote = async () => {
    if (!markdownFormattedLogs) return;

    // Look for today's daily note in vault
    const dailyNote = dailyNotesService.findDailyNote(notes, new Date());
    if (dailyNote && onAppendToNote) {
      await onAppendToNote(dailyNote.id, `\n\n${markdownFormattedLogs}\n`);
      setLoggedToDaily(true);
      fireConfetti();
      setTimeout(() => setLoggedToDaily(false), 3000);
    } else if (onCreateSessionNote) {
      // Create new session note
      await onCreateSessionNote(
        `🍅 Deep Work & Interstitial Log - ${todayStr}`,
        markdownFormattedLogs,
        ['deepwork', 'pomodoro', 'productivity']
      );
      setLoggedToDaily(true);
      fireConfetti();
      setTimeout(() => setLoggedToDaily(false), 3000);
    }
  };

  // Time calculations for display
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalModeDuration = getDurationForMode(mode);
  const progressPercent = Math.min(100, Math.max(0, ((totalModeDuration - timeLeft) / totalModeDuration) * 100));

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pomodoro Deep Work Flow & Interstitial Journaling Hub (P1)"
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Pomodoro Deep Work & Interstitial Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  Tool P1
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Scientifically minimize context-switching friction through high-focus sprints & rapid journaling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-colors ${
                showSettings
                  ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                  : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title="Timer Durations & Ambient Audio Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Tray (Collapsible) */}
        {showSettings && (
          <div className="px-6 py-4 bg-stone-100/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 text-xs space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-rose-500" />
              <span>Interval Lengths & Soundscape Preferences</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">Focus Sprint (minutes)</label>
                <div className="flex items-center gap-1.5">
                  {[15, 25, 45, 50].map((m) => (
                    <button
                      key={`focus-${m}`}
                      type="button"
                      onClick={() => {
                        setFocusDuration(m);
                        if (mode === 'focus') setTimeLeft(m * 60);
                        try {
                          localStorage.setItem('pkm_pomodoro_custom_focus', m.toString());
                        } catch {}
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        focusDuration === m
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-stone-500 mb-1">Short Break (minutes)</label>
                <div className="flex items-center gap-1.5">
                  {[3, 5, 10].map((m) => (
                    <button
                      key={`short-${m}`}
                      type="button"
                      onClick={() => {
                        setShortBreakDuration(m);
                        if (mode === 'short_break') setTimeLeft(m * 60);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        shortBreakDuration === m
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-stone-500 mb-1">Daily Sprint Target</label>
                <div className="flex items-center gap-1.5">
                  {[4, 6, 8, 10].map((t) => (
                    <button
                      key={`target-${t}`}
                      type="button"
                      onClick={() => setStats((prev) => ({ ...prev, dailyTarget: t }))}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        stats.dailyTarget === t
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {t} Pomos
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Soundscape Selector */}
            <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Headphones className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300">Ambient Sound:</span>
                <select
                  value={activeSoundscape}
                  onChange={(e) => setActiveSoundscape(e.target.value as SoundscapeType)}
                  className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs rounded-lg px-2 py-1 text-stone-800 dark:text-stone-200"
                >
                  <option value="none">Mute (Silent)</option>
                  <option value="rain">Rain Ambience</option>
                  <option value="forest_stream">Forest Stream</option>
                  <option value="brown_noise">Deep Brown Noise</option>
                  <option value="white_noise">White Noise</option>
                  <option value="waves">Ocean Waves</option>
                  <option value="campfire">Campfire Glow</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-stone-400" />
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                  className="w-24 accent-rose-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top Section: Timer Card + Daily Target Progress */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Timer Left Card */}
            <div className="md:col-span-7 bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 sm:p-6 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-xs">
              {/* Mode Tabs */}
              <div className="flex items-center rounded-2xl bg-stone-200/80 dark:bg-stone-800/80 p-1 border border-stone-300/60 dark:border-stone-700/60">
                <button
                  type="button"
                  onClick={() => setMode('focus')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    mode === 'focus'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Focus ({focusDuration}m)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('short_break')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    mode === 'short_break'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Short Break ({shortBreakDuration}m)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('long_break')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    mode === 'long_break'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Long Break ({longBreakDuration}m)</span>
                </button>
              </div>

              {/* Huge Timer Digits */}
              <div className="my-5 flex flex-col items-center">
                <div className="text-6xl sm:text-7xl font-mono font-black tracking-tight text-stone-900 dark:text-stone-50 select-none">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      isRunning
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-stone-300 dark:bg-stone-700'
                    }`}
                  />
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {isRunning ? `${mode.replace('_', ' ')} in progress` : 'Timer Paused'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden mb-5">
                <div
                  className={`h-full transition-all duration-300 ${
                    mode === 'focus'
                      ? 'bg-rose-500'
                      : mode === 'short_break'
                      ? 'bg-emerald-500'
                      : 'bg-sky-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="p-3 rounded-2xl bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors shadow-xs"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleTimer}
                  className={`px-8 py-3 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${
                    mode === 'focus'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25'
                      : mode === 'short_break'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25'
                      : 'bg-sky-600 hover:bg-sky-500 shadow-sky-500/25'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Focus</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleAddFiveMinutes}
                  className="px-3 py-3 rounded-2xl bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 font-semibold text-xs transition-colors"
                  title="Add 5 Minutes"
                >
                  +5m
                </button>

                <button
                  type="button"
                  onClick={handleSkipTimer}
                  className="p-3 rounded-2xl bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors shadow-xs"
                  title="Skip to next interval"
                >
                  <FastForward className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Card: Focus Metrics & Sprint Micro-Tasks */}
            <div className="md:col-span-5 bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 flex flex-col justify-between space-y-4">
              {/* Daily Focus Goal Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-rose-500" />
                    <span>Daily Goal: {stats.completedCount} / {stats.dailyTarget} Pomodoros</span>
                  </span>
                  <span className="text-stone-500 font-mono text-[11px]">
                    {stats.totalMinutes} mins focus today
                  </span>
                </div>
                <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (stats.completedCount / stats.dailyTarget) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Sprint Checklist */}
              <div className="flex-1 min-h-[140px] flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sprint Micro-Tasks</span>
                  </span>
                  <span className="text-[10px] text-stone-400">Checking finishes auto-logs reflection</span>
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-36 pr-1">
                  {sprintTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs shadow-2xs hover:border-stone-300 dark:hover:border-stone-700"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSprintTask(task.id)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-stone-300 dark:text-stone-600 shrink-0" />
                        )}
                        <span
                          className={`truncate ${
                            task.completed
                              ? 'line-through text-stone-400 dark:text-stone-500'
                              : 'text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          {task.text}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSprintTask(task.id)}
                        className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add micro-task */}
                <form onSubmit={handleAddSprintTask} className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Add a single sprint task..."
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Interstitial Journaling Engine */}
          <div className="bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 dark:border-stone-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-rose-500" />
                  <span>Interstitial Journaling Log</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Reflect on what you just completed, then set your single next action before starting your sprint
                </p>
              </div>

              {/* Actions: Log to Daily Note & Copy */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  disabled={logs.length === 0}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 disabled:opacity-40 text-stone-700 dark:text-stone-300 transition-colors flex items-center gap-1.5"
                  title="Copy formatted markdown to clipboard"
                >
                  {copiedState === 'logs' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Log</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleLogToDailyNote}
                  disabled={logs.length === 0}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  title="Append today's interstitial logs directly to your Daily Note"
                >
                  {loggedToDaily ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Logged to Note!</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Log to Daily Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Interstitial Input Form */}
            <form onSubmit={handleAddInterstitialLog} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. What did you just finish? */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>What did you just finish? (Reflection)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Completed initial draft of database schema"
                    value={finishedInput}
                    onChange={(e) => setFinishedInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                {/* 2. What is your next focus intention? */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    <span>What is your next action? (Intention)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Write integration test suite for resolver"
                    value={nextInput}
                    onChange={(e) => setNextInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>
              </div>

              {/* Tag selector chips & Submit Button */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {['#deepwork', '#writing', '#coding', '#research', '#planning', '#review'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                        selectedTag === tag
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          : 'bg-white dark:bg-stone-900 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 border border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!finishedInput.trim() && !nextInput.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:pointer-events-none shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Entry</span>
                </button>
              </div>
            </form>

            {/* Interstitial Timeline Feed */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Today's Log Timeline ({logs.filter((l) => l.date === todayStr).length} entries)
              </span>

              {logs.filter((l) => l.date === todayStr).length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs">
                  No interstitial logs recorded today yet. Type what you just finished above to start your log!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {logs
                    .filter((l) => l.date === todayStr)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="group flex items-start justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="font-mono text-[11px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-200/60 dark:border-rose-900/60 shrink-0">
                            {log.timestamp}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <p className="text-stone-800 dark:text-stone-200 font-medium break-words">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold mr-1">Done:</span>
                              {log.finished}
                            </p>
                            {log.next && (
                              <p className="text-stone-500 dark:text-stone-400 flex items-center gap-1 text-[11px]">
                                <ArrowRight className="w-3 h-3 text-rose-500 shrink-0" />
                                <span className="font-semibold text-stone-600 dark:text-stone-300">Next:</span>
                                <span className="truncate">{log.next}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {log.tag && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500">
                              {log.tag}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Delete log entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-stone-50/70 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded text-[10px] font-mono">Alt + P</kbd>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
