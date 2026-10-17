import React, { useState, useEffect, useRef } from 'react';
import {
  Minimize2,
  Type,
  AlignLeft,
  BookOpen,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Volume2,
  VolumeX,
  Keyboard,
  CloudRain,
} from 'lucide-react';
import { Note } from '../../types';
import { soundscapeService } from '../../utils/soundscapes';
import { fireConfetti } from '../../utils/confetti';

export interface ZenModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note;
  title?: string;
  content?: string;
  onChangeTitle?: (title: string) => void;
  onChangeContent?: (content: string) => void;
  onUpdateContent?: (title: string, content: string) => void;
}

export const ZenModeModal: React.FC<ZenModeModalProps> = ({
  isOpen,
  onClose,
  note,
  title: initialTitle,
  content: initialContent,
  onChangeTitle,
  onChangeContent,
  onUpdateContent,
}) => {
  const [title, setTitle] = useState(note?.title ?? initialTitle ?? '');
  const [content, setContent] = useState(note?.content ?? initialContent ?? '');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('serif');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [theme, setTheme] = useState<'paper' | 'dark' | 'clean'>('paper');
  const [isPlayingAudio, setIsPlayingAudio] = useState(() => soundscapeService.getIsPlaying());
  const [typewriterOn, setTypewriterOn] = useState(() => soundscapeService.isTypewriterEnabled());

  useEffect(() => {
    return soundscapeService.subscribe(() => {
      setIsPlayingAudio(soundscapeService.getIsPlaying());
      setTypewriterOn(soundscapeService.isTypewriterEnabled());
    });
  }, []);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    } else {
      if (initialTitle !== undefined) setTitle(initialTitle);
      if (initialContent !== undefined) setContent(initialContent);
    }
  }, [note, initialTitle, initialContent]);

  // Sync changes upward with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onUpdateContent) {
        onUpdateContent(title, content);
      }
      if (onChangeTitle) {
        onChangeTitle(title);
      }
      if (onChangeContent) {
        onChangeContent(content);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [title, content, onUpdateContent, onChangeTitle, onChangeContent]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const readingTimeMins = Math.max(1, Math.ceil(words / 200));

  const reachedMilestonesRef = useRef<Set<number>>(new Set());

  // Check milestones (100, 250, 500, 1000)
  useEffect(() => {
    const milestones = [100, 250, 500, 1000];
    for (const m of milestones) {
      if (words >= m && !reachedMilestonesRef.current.has(m)) {
        reachedMilestonesRef.current.add(m);
        fireConfetti();
      }
    }
  }, [words]);

  const fontClass =
    fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const sizeClass =
    fontSize === 'sm'
      ? 'text-base'
      : fontSize === 'lg'
      ? 'text-xl'
      : 'text-lg';

  const themeClass =
    theme === 'dark'
      ? 'bg-[#121214] text-stone-200'
      : theme === 'paper'
      ? 'bg-[#fbf9f5] text-[#2c2925]'
      : 'bg-white text-stone-900';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-between p-6 md:p-12 overflow-hidden transition-colors ${themeClass} animate-in fade-in duration-300`}>
      {/* Top Controls Bar (Discreet & auto-dimmed) */}
      <div className="flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity max-w-4xl mx-auto w-full mb-6">
        <div className="flex items-center gap-3 text-xs">
          {/* Font Selector */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setFontFamily('sans')}
              className={`px-2.5 py-1 rounded-lg text-xs font-sans ${
                fontFamily === 'sans' ? 'bg-black/10 dark:bg-white/15 font-bold' : ''
              }`}
            >
              Sans
            </button>
            <button
              onClick={() => setFontFamily('serif')}
              className={`px-2.5 py-1 rounded-lg text-xs font-serif ${
                fontFamily === 'serif' ? 'bg-black/10 dark:bg-white/15 font-bold' : ''
              }`}
            >
              Serif
            </button>
            <button
              onClick={() => setFontFamily('mono')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono ${
                fontFamily === 'mono' ? 'bg-black/10 dark:bg-white/15 font-bold' : ''
              }`}
            >
              Mono
            </button>
          </div>

          {/* Size Selector */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 rounded-lg text-xs ${
                fontSize === 'sm' ? 'bg-black/10 dark:bg-white/15 font-bold' : ''
              }`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('md')}
              className={`px-2 py-1 rounded-lg text-xs ${
                fontSize === 'md' ? 'bg-black/10 dark:bg-white/15 font-bold' : ''
              }`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 rounded-lg text-xs ${
                fontSize === 'lg' ? 'bg-black/10 dark:bg-white/15 font-bold' : ''
              }`}
            >
              A+
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setTheme('paper')}
              className={`px-2.5 py-1 rounded-lg text-xs ${
                theme === 'paper' ? 'bg-black/10 dark:bg-white/15 font-bold' : ''
              }`}
            >
              Warm Paper
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-2.5 py-1 rounded-lg text-xs ${
                theme === 'dark' ? 'bg-black/10 dark:bg-white/15 font-bold' : ''
              }`}
            >
              Obsidian
            </button>
            <button
              onClick={() => setTheme('clean')}
              className={`px-2.5 py-1 rounded-lg text-xs ${
                theme === 'clean' ? 'bg-black/10 dark:bg-white/15 font-bold' : ''
              }`}
            >
              Minimal
            </button>
          </div>
        </div>

        {/* Audio & Exit Controls */}
        <div className="flex items-center gap-2">
          {/* Ambient Rain Soundscape Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isPlayingAudio) {
                soundscapeService.stop();
              } else {
                soundscapeService.start('rain');
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isPlayingAudio
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300'
            }`}
            title={isPlayingAudio ? 'Pause ambient rain soundscape' : 'Play ambient rain soundscape'}
          >
            {isPlayingAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 opacity-60" />}
            <span className="hidden sm:inline">{isPlayingAudio ? 'Rain Audio' : 'Mute'}</span>
          </button>

          {/* Typewriter Audio Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !typewriterOn;
              soundscapeService.setTypewriterEnabled(next);
              if (next) soundscapeService.playTypewriterClick();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              typewriterOn
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60'
                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300'
            }`}
            title={typewriterOn ? 'Disable typewriter sounds' : 'Enable typewriter sounds'}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Typewriter</span>
          </button>

          {/* Exit Zen Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold transition-colors"
            title="Exit Zen Mode (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Zen Mode (Esc)</span>
          </button>
        </div>
      </div>

      {/* Writing Area */}
      <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col min-h-0 overflow-y-auto">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={() => soundscapeService.playTypewriterClick()}
          placeholder="Untitled note..."
          className={`w-full bg-transparent text-2xl md:text-3xl font-bold tracking-tight mb-4 focus:outline-hidden ${fontClass}`}
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={() => soundscapeService.playTypewriterClick()}
          placeholder="Start writing freely..."
          autoFocus
          className={`flex-1 w-full bg-transparent resize-none focus:outline-hidden leading-relaxed ${fontClass} ${sizeClass}`}
        />
      </div>

      {/* Bottom Subtle Status Bar */}
      <div className="max-w-4xl mx-auto w-full pt-4 flex items-center justify-between text-xs opacity-50 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-4">
          <span>{words} {words === 1 ? 'word' : 'words'}</span>
          <span>{chars} characters</span>
          <span>{readingTimeMins} min read</span>
        </div>
        <div>
          <span>Auto-saved locally</span>
        </div>
      </div>
    </div>
  );
};
