import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Flame,
  Sparkles,
  Trophy,
  X,
  Play,
  RotateCcw,
  Check,
  Copy,
  Plus,
  Volume2,
  VolumeX,
  Keyboard,
  Headphones,
} from 'lucide-react';
import { fireConfetti } from '../../utils/confetti';
import { soundscapeService } from '../../utils/soundscapes';

interface WritingSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAsNote: (title: string, content: string, tags: string[]) => void;
}

type SprintDuration = 3 | 5 | 10 | 15; // minutes
type WordGoal = 100 | 250 | 500 | 1000;

export const WritingSprintModal: React.FC<WritingSprintModalProps> = ({
  isOpen,
  onClose,
  onSaveAsNote,
}) => {
  const [stage, setStage] = useState<'setup' | 'running' | 'finished'>('setup');
  const [durationMinutes, setDurationMinutes] = useState<SprintDuration>(5);
  const [wordGoal, setWordGoal] = useState<WordGoal>(250);
  const [content, setContent] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [typewriterActive, setTypewriterActive] = useState(soundscapeService.isTypewriterEnabled());
  const [isFlowState, setIsFlowState] = useState(false);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastKeystrokeTimeRef = useRef<number>(Date.now());
  const flowCheckIntervalRef = useRef<number | null>(null);

  // Sync initial typewriter state
  useEffect(() => {
    if (isOpen) {
      setTypewriterActive(soundscapeService.isTypewriterEnabled());
    }
  }, [isOpen]);

  // Reset when opened
  useEffect(() => {
    if (isOpen && stage !== 'running') {
      setStage('setup');
      setContent('');
      setSecondsRemaining(durationMinutes * 60);
      setSecondsElapsed(0);
      setIsFlowState(false);
      setCopied(false);
    }
  }, [isOpen]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stage !== 'running') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stage, onClose]);

  // Main countdown timer
  useEffect(() => {
    if (stage === 'running') {
      timerRef.current = window.setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleCompleteSprint();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Flow State detector: checks if user typed within last 4 seconds
      flowCheckIntervalRef.current = window.setInterval(() => {
        const timeSinceKey = Date.now() - lastKeystrokeTimeRef.current;
        setIsFlowState(timeSinceKey < 4000);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (flowCheckIntervalRef.current) clearInterval(flowCheckIntervalRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (flowCheckIntervalRef.current) clearInterval(flowCheckIntervalRef.current);
    };
  }, [stage]);

  const handleStartSprint = () => {
    setContent('');
    setSecondsRemaining(durationMinutes * 60);
    setSecondsElapsed(0);
    setStage('running');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleCompleteSprint = () => {
    setStage('finished');
    fireConfetti();
  };

  const wordsCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const progressPercent = Math.min(100, Math.round((wordsCount / wordGoal) * 100));
  const elapsedMinutes = Math.max(0.1, secondsElapsed / 60);
  const currentWpm = Math.round(wordsCount / elapsedMinutes);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    lastKeystrokeTimeRef.current = Date.now();
    soundscapeService.playTypewriterClick();

    // Check if goal reached dynamically
    if (stage === 'running') {
      const nextWords = content.trim().split(/\s+/).length;
      if (nextWords >= wordGoal && !isFlowState) {
        // Goal reached early!
        setIsFlowState(true);
      }
    }
  };

  const handleSaveToVault = () => {
    const dateStr = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const title = `Writing Sprint (${wordsCount} words) - ${dateStr}`;
    const headerMeta = `> **Sprint Metrics**: ${wordsCount} words in ${formatTime(
      secondsElapsed
    )} · Pace: ${currentWpm} WPM · Goal: ${wordGoal} words\n\n`;
    onSaveAsNote(title, `${headerMeta}${content}`, ['sprint', 'writing']);
    onClose();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-writing-sprint"
      role="dialog"
      aria-modal="true"
      aria-label="Writing Sprint and Flow Arena"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isFlowState ? 'bg-amber-500 text-stone-950 border-amber-600 animate-pulse' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'}`}>
              <Flame className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Writing Sprint & Flow Arena
                {isFlowState && stage === 'running' && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 shadow-2xs">
                    Flow Active
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {stage === 'running'
                  ? 'Keep your hands moving. Free-write without editing.'
                  : stage === 'finished'
                  ? 'Sprint complete! Review your accomplishments below.'
                  : 'Fast-paced, distraction-free writing sprint to enter flow.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-typewriter"
              onClick={() => {
                const nextState = !typewriterActive;
                setTypewriterActive(nextState);
                soundscapeService.setTypewriterEnabled(nextState);
              }}
              className={`p-1.5 rounded-lg border transition-colors ${
                typewriterActive
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 border-stone-200 dark:border-stone-800'
              }`}
              title={typewriterActive ? 'Typewriter Audio: ON' : 'Typewriter Audio: OFF'}
              aria-label="Toggle typewriter sound"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              id="btn-close-writing-sprint"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close writing sprint"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {stage === 'setup' && (
            <div className="space-y-6 py-2">
              {/* Sprint Duration Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                  Sprint Duration
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {([3, 5, 10, 15] as SprintDuration[]).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-3 px-3 rounded-xl border text-center font-bold text-sm transition-all ${
                        durationMinutes === mins
                          ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-sm'
                          : 'bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Goal Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                  Target Word Goal
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {([100, 250, 500, 1000] as WordGoal[]).map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setWordGoal(goal)}
                      className={`py-3 px-3 rounded-xl border text-center font-bold text-sm transition-all ${
                        wordGoal === goal
                          ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-sm'
                          : 'bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700'
                      }`}
                    >
                      {goal} words
                    </button>
                  ))}
                </div>
              </div>

              {/* Flow Tips Box */}
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-stone-700 dark:text-stone-300 text-xs space-y-1.5 leading-relaxed">
                <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Sprint Golden Rule
                </div>
                <p>
                  Silence your inner editor. Do not stop to backspace, fix typos, or format. Pour
                  your raw stream of consciousness onto the page until the timer rings.
                </p>
              </div>

              <div className="pt-2">
                <button
                  id="btn-start-writing-sprint"
                  type="button"
                  onClick={handleStartSprint}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <Play className="w-4 h-4 fill-stone-950" />
                  Start {durationMinutes}-Minute Sprint
                </button>
              </div>
            </div>
          )}

          {stage === 'running' && (
            <div className="flex flex-col h-full space-y-3">
              {/* Live Status Bar */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-100/80 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700/80 shrink-0 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                    <Timer className="w-4 h-4 text-amber-500" />
                    <span>{formatTime(secondsRemaining)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-stone-600 dark:text-stone-300">
                    <span className="font-bold text-stone-900 dark:text-stone-100">{wordsCount}</span>
                    <span>/ {wordGoal} words</span>
                  </div>

                  <div className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
                    <span>Pace:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {currentWpm} WPM
                    </span>
                  </div>
                </div>

                <button
                  id="btn-finish-writing-sprint"
                  type="button"
                  onClick={handleCompleteSprint}
                  className="px-3 py-1 bg-stone-200 dark:bg-stone-700 hover:bg-amber-500 hover:text-stone-950 dark:hover:bg-amber-500 dark:hover:text-stone-950 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-bold transition-all"
                >
                  Finish Sprint
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden shrink-0">
                <div
                  className="h-full bg-amber-500 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Distraction-Free Textarea */}
              <textarea
                id="sprint-textarea"
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Let your thoughts flow freely. Don't look back..."
                className={`w-full flex-1 min-h-[320px] p-4 bg-transparent text-stone-900 dark:text-stone-100 text-base leading-relaxed placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none resize-none font-serif rounded-xl transition-all ${
                  isFlowState
                    ? 'ring-2 ring-amber-400/50 dark:ring-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10'
                    : ''
                }`}
              />
            </div>
          )}

          {stage === 'finished' && (
            <div className="space-y-6 py-2">
              {/* Celebration Hero */}
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 mb-1">
                  <Trophy className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                  Sprint Completed!
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {wordsCount >= wordGoal
                    ? `Incredible focus! You smashed your ${wordGoal}-word target.`
                    : `Great sprint! You captured ${wordsCount} words of raw momentum.`}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {wordsCount}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Words Written
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 text-center">
                  <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-mono">
                    {formatTime(secondsElapsed)}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Time Elapsed
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 text-center">
                  <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-mono">
                    {currentWpm}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Words / Min
                  </div>
                </div>
              </div>

              {/* Excerpt Preview */}
              {content.trim() && (
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 max-h-36 overflow-y-auto text-xs text-stone-700 dark:text-stone-300 font-serif leading-relaxed italic">
                  "{content.slice(0, 300)}{content.length > 300 ? '...' : ''}"
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  id="btn-save-sprint-note"
                  type="button"
                  onClick={handleSaveToVault}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Save as Note with #sprint Tag
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="py-3 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-sm rounded-xl border border-stone-200 dark:border-stone-700 transition-all flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>

                <button
                  type="button"
                  onClick={handleStartSprint}
                  className="py-3 px-4 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-bold text-xs rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Sprint Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
