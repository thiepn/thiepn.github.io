import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CloudRain,
  Flame,
  Waves,
  Radio,
  Sparkles,
  Keyboard,
  Timer,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Zap,
  X,
  Check,
  BellRing,
  Droplets,
  Wind,
  Plus,
  Minus,
  Coffee,
} from 'lucide-react';
import { soundscapeService, SoundscapeType } from '../utils/soundscapes';
import { fireConfetti } from '../utils/confetti';

interface ZenFocusBarProps {
  onOpenQuickCapture: () => void;
  onOpenWritingSprint?: () => void;
  className?: string;
}

const SOUNDSCAPE_PRESETS: { type: SoundscapeType; label: string; icon: React.ReactNode }[] = [
  { type: 'rain', label: 'Rain', icon: <CloudRain className="w-3.5 h-3.5 text-blue-500" /> },
  { type: 'campfire', label: 'Fire', icon: <Flame className="w-3.5 h-3.5 text-amber-500" /> },
  { type: 'waves', label: 'Waves', icon: <Waves className="w-3.5 h-3.5 text-cyan-500" /> },
  { type: 'forest_stream', label: 'Stream', icon: <Droplets className="w-3.5 h-3.5 text-emerald-500" /> },
  { type: 'white_noise', label: 'White', icon: <Wind className="w-3.5 h-3.5 text-indigo-400" /> },
  { type: 'brown_noise', label: 'Brown', icon: <Radio className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" /> },
  { type: 'none', label: 'Off', icon: <VolumeX className="w-3.5 h-3.5 text-stone-400" /> },
];

const SPRINT_DURATIONS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '50m', seconds: 50 * 60 },
];

export const ZenFocusBar: React.FC<ZenFocusBarProps> = ({
  onOpenQuickCapture,
  onOpenWritingSprint,
  className = '',
}) => {
  // Collapsed state (stored in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    // The 330px expanded floating dock blocks original note composition in
    // the embedded mobile Hub. Retain the user-toggleable collapsed control.
    if (typeof document !== 'undefined' && document.querySelector('[data-keep-native-host]')) return true;
    try {
      return localStorage.getItem('keepnotes_zen_dock_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isVisible, setIsVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem('keepnotes_zen_dock_hidden') !== 'true';
    } catch {
      return true;
    }
  });

  // Soundscape states
  const [currentSoundscape, setCurrentSoundscape] = useState<SoundscapeType>(soundscapeService.getCurrentType());
  const [isPlayingSoundscape, setIsPlayingSoundscape] = useState<boolean>(soundscapeService.getIsPlaying());
  const [volume, setVolume] = useState<number>(soundscapeService.getVolume());
  const [isTypewriterOn, setIsTypewriterOn] = useState<boolean>(soundscapeService.isTypewriterEnabled());

  // Sprint Timer states
  const [sprintDuration, setSprintDuration] = useState<number>(15 * 60); // default 15m
  const [sprintRemaining, setSprintRemaining] = useState<number>(15 * 60);
  const [isSprintRunning, setIsSprintRunning] = useState<boolean>(false);
  const [sprintCompletedNotice, setSprintCompletedNotice] = useState<boolean>(false);

  const timerIntervalRef = useRef<number | null>(null);

  // Sync state with soundscapeService subscriptions
  useEffect(() => {
    const unsubscribe = soundscapeService.subscribe(() => {
      setCurrentSoundscape(soundscapeService.getCurrentType());
      setIsPlayingSoundscape(soundscapeService.getIsPlaying());
      setVolume(soundscapeService.getVolume());
      setIsTypewriterOn(soundscapeService.isTypewriterEnabled());
    });

    const handleRestoreZen = () => {
      setIsVisible(true);
      setIsCollapsed(false);
      try {
        localStorage.removeItem('keepnotes_zen_dock_hidden');
        localStorage.setItem('keepnotes_zen_dock_collapsed', 'false');
      } catch {}
    };
    window.addEventListener('keepnotes_restore_zen_dock', handleRestoreZen);

    return () => {
      unsubscribe();
      window.removeEventListener('keepnotes_restore_zen_dock', handleRestoreZen);
    };
  }, []);

  // Save collapsed state
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('keepnotes_zen_dock_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Close / hide bar completely
  const handleHideBar = useCallback(() => {
    setIsVisible(false);
    try {
      localStorage.setItem('keepnotes_zen_dock_hidden', 'true');
    } catch {}
  }, []);

  // Soundscape toggles
  const handleSelectSoundscape = (type: SoundscapeType) => {
    if (type === 'none') {
      soundscapeService.stop();
    } else {
      soundscapeService.start(type);
    }
  };

  const handleToggleSoundscapePlay = () => {
    if (isPlayingSoundscape) {
      soundscapeService.stop();
    } else {
      const typeToStart = currentSoundscape === 'none' ? 'rain' : currentSoundscape;
      soundscapeService.start(typeToStart);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundscapeService.setVolume(val);
  };

  const handleToggleTypewriter = () => {
    const nextState = !isTypewriterOn;
    soundscapeService.setTypewriterEnabled(nextState);
    if (nextState) {
      soundscapeService.playTypewriterClick();
    }
  };

  // Sprint Timer logic
  useEffect(() => {
    if (isSprintRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setSprintRemaining((prev) => {
          if (prev <= 1) {
            // Sprint Complete!
            setIsSprintRunning(false);
            soundscapeService.playCompletionChime();
            fireConfetti();
            setSprintCompletedNotice(true);
            setTimeout(() => setSprintCompletedNotice(false), 5000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isSprintRunning]);

  const handleToggleSprintTimer = () => {
    if (sprintRemaining === 0) {
      setSprintRemaining(sprintDuration);
    }
    setIsSprintRunning((prev) => !prev);
  };

  const handleResetSprintTimer = () => {
    setIsSprintRunning(false);
    setSprintRemaining(sprintDuration);
    setSprintCompletedNotice(false);
  };

  const handleSelectSprintDuration = (seconds: number) => {
    setIsSprintRunning(false);
    setSprintDuration(seconds);
    setSprintRemaining(seconds);
    setSprintCompletedNotice(false);
  };

  const handleAdjustSprintTime = (deltaSeconds: number) => {
    setSprintRemaining((prev) => Math.max(60, prev + deltaSeconds));
  };

  // Formatter: mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Sprint percentage
  const sprintProgress = sprintDuration > 0
    ? Math.min(100, Math.max(0, Math.round(((sprintDuration - sprintRemaining) / sprintDuration) * 100)))
    : 0;

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Zen Focus Bar"
      className={`fixed bottom-20 right-3 sm:bottom-5 sm:right-5 z-40 transition-all duration-200 select-none ${className}`}
    >
      {/* 1. COLLAPSED MINI-BADGE */}
      {isCollapsed ? (
        <button
          type="button"
          onClick={toggleCollapse}
          className="group flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200/90 dark:border-stone-800/90 shadow-lg hover:shadow-xl hover:border-amber-400/80 dark:hover:border-amber-600/80 transition-all text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          title="Expand Zen Focus Bar (Soundscape, Typewriter, Sprint Timer)"
          aria-expanded="false"
        >
          {/* Zen Icon with active audio animation */}
          <div className="relative flex items-center justify-center">
            {isPlayingSoundscape ? (
              <div className="flex items-center gap-0.5 px-0.5">
                <span className="w-1 h-3.5 bg-amber-500 rounded-full animate-pulse" />
                <span className="w-1 h-2 bg-amber-500 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-1 h-4 bg-amber-500 rounded-full animate-pulse [animation-delay:300ms]" />
              </div>
            ) : (
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            )}
          </div>

          {/* Soundscape Status */}
          {isPlayingSoundscape && (
            <span className="font-semibold text-stone-800 dark:text-stone-200 capitalize">
              {currentSoundscape.replace('_', ' ')}
            </span>
          )}

          {/* Running Timer Badge */}
          {isSprintRunning ? (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-mono font-bold text-[11px] border border-amber-300/60 dark:border-amber-800/60 flex items-center gap-1">
              <Timer className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              {formatTime(sprintRemaining)}
            </span>
          ) : isTypewriterOn ? (
            <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1 font-medium">
              <Keyboard className="w-3 h-3 text-amber-500" /> Clicks On
            </span>
          ) : !isPlayingSoundscape ? (
            <span className="font-semibold text-stone-700 dark:text-stone-300">Zen Focus</span>
          ) : null}

          <ChevronUp className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors ml-0.5" />
        </button>
      ) : (
        /* 2. EXPANDED MICRO-DOCK CONSOLE */
        <div
          className="w-[330px] sm:w-[360px] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-200/90 dark:border-stone-800/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs"
          role="region"
          aria-label="Zen Focus Controller"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-50/90 dark:bg-stone-950/70 border-b border-stone-200/80 dark:border-stone-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-stone-900 dark:text-stone-100">Zen Focus Dock</span>
              {isPlayingSoundscape && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" title="Audio playing" />
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                title="Collapse dock"
                aria-label="Collapse Zen Focus Bar"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleHideBar}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                title="Hide Zen Focus Bar"
                aria-label="Hide Zen Focus Bar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3.5 space-y-3">
            {/* --- SECTION 1: PROCEDURAL SOUNDSCAPE MINI-PLAYER --- */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ambient Soundscape</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {isPlayingSoundscape && (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      title={`Volume: ${Math.round(volume * 100)}%`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleToggleSoundscapePlay}
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 ${
                      isPlayingSoundscape
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                    }`}
                  >
                    {isPlayingSoundscape ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                    <span>{isPlayingSoundscape ? 'Pause' : 'Play'}</span>
                  </button>
                </div>
              </div>

              {/* Soundscape Presets Tabs */}
              <div className="grid grid-cols-7 gap-1 p-1 bg-stone-100/90 dark:bg-stone-950/80 rounded-xl border border-stone-200/70 dark:border-stone-800/80">
                {SOUNDSCAPE_PRESETS.map((p) => {
                  const isCurrent = currentSoundscape === p.type && (p.type === 'none' || isPlayingSoundscape);
                  return (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => handleSelectSoundscape(p.type)}
                      className={`py-1.5 px-0.5 rounded-lg text-[9px] font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                        isCurrent
                          ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs font-bold border border-stone-200/70 dark:border-stone-700/70'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white/50 dark:hover:bg-stone-850'
                      }`}
                    >
                      {p.icon}
                      <span className="truncate max-w-[42px]">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- SECTION 2: MECHANICAL TYPEWRITER FX --- */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-stone-100/70 dark:bg-stone-950/50 border border-stone-200/70 dark:border-stone-800/70">
              <div className="flex items-center gap-2">
                <Keyboard className={`w-3.5 h-3.5 ${isTypewriterOn ? 'text-amber-500' : 'text-stone-400'}`} />
                <div>
                  <div className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                    Mechanical Typewriter
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">
                    Tactile audio clicks on keystrokes
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isTypewriterOn && (
                  <button
                    type="button"
                    onClick={() => soundscapeService.playTypewriterClick()}
                    className="px-1.5 py-0.5 text-[9px] rounded font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800"
                    title="Test click sound"
                  >
                    Test
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleTypewriter}
                  role="switch"
                  aria-checked={isTypewriterOn}
                  className={`w-9 h-5 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    isTypewriterOn ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                  title={isTypewriterOn ? 'Disable typewriter sounds' : 'Enable typewriter sounds'}
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform absolute top-0.5 ${
                      isTypewriterOn ? 'left-4.5' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* --- SECTION 3: SPRINT FOCUS TIMER --- */}
            <div className="space-y-1.5 p-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-950/50 border border-stone-200/70 dark:border-stone-800/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-200 text-[11px]">
                  <Timer className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sprint Timer</span>
                </div>

                {/* Duration Presets */}
                <div className="inline-flex rounded-lg border border-stone-200 dark:border-stone-800 p-0.5 bg-white dark:bg-stone-900">
                  {SPRINT_DURATIONS.map((d) => (
                    <button
                      key={d.seconds}
                      type="button"
                      disabled={isSprintRunning}
                      onClick={() => handleSelectSprintDuration(d.seconds)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors disabled:opacity-40 ${
                        sprintDuration === d.seconds
                          ? 'bg-amber-500 text-white font-bold'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Countdown Display & Controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                    {formatTime(sprintRemaining)}
                  </span>
                  {isSprintRunning && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold animate-pulse">
                      Focusing...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Quick Stepper Buttons */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleAdjustSprintTime(-5 * 60)}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors text-[10px] font-bold"
                      title="Subtract 5 minutes"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustSprintTime(5 * 60)}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors text-[10px] font-bold"
                      title="Add 5 minutes"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSprintTimer}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 shadow-2xs ${
                      isSprintRunning
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 text-white dark:text-stone-900'
                    }`}
                  >
                    {isSprintRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isSprintRunning ? 'Pause' : 'Start'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetSprintTimer}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                    title="Reset sprint timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {onOpenWritingSprint && (
                    <button
                      type="button"
                      onClick={onOpenWritingSprint}
                      className="p-1 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                      title="Launch Full Flow Arena (Writing Sprint Modal)"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${sprintProgress}%` }}
                />
              </div>

              {/* Completion notice & 5m Break Button */}
              {sprintCompletedNotice && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[10px] text-emerald-800 dark:text-emerald-200 font-semibold animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Sprint complete! Well done.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectSprintDuration(5 * 60);
                      setIsSprintRunning(true);
                      setSprintCompletedNotice(false);
                    }}
                    className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-colors"
                  >
                    <Coffee className="w-3 h-3" />
                    <span>5m Break</span>
                  </button>
                </div>
              )}
            </div>

            {/* --- SECTION 4: QUICK CAPTURE SHORTCUT BUTTON --- */}
            <div className="pt-1 border-t border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between">
              <button
                type="button"
                onClick={onOpenQuickCapture}
                className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer group"
                title="Open Quick Capture (Ctrl+Alt+C)"
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>Quick Capture</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-950/70 text-[10px] font-mono text-amber-800 dark:text-amber-300">
                  Ctrl+Alt+C
                </kbd>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
