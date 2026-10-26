import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen,
  ArrowLeft,
  Type,
  X,
  Maximize2,
  Minimize2,
  ListOrdered,
  CheckSquare,
  Clock,
  Folder as FolderIcon,
  Calendar,
  AlignLeft,
  Palette,
  Sun,
  Moon,
  Sparkles,
  Columns,
  ChevronDown,
} from 'lucide-react';
import { Note, Folder, ChecklistItem, NoteImage, NoteAudio } from '../../types';
import { NoteFoldState, parseMarkdownSections, DocumentSection } from '../../pkm/outliner';
import { PKMPreviewRenderer } from '../../pkm/PKMPreviewRenderer';
import { AudioRecorder } from '../AudioRecorder';
import { NoteImageLightbox } from './NoteImageLightbox';
import { extractNoteImages, NoteEmbeddedImage } from '../../pkm/images/noteImages';

export type ReadingFontFamily = 'serif' | 'sans' | 'mono';
export type ReadingFontSize = 'sm' | 'base' | 'lg' | 'xl';
export type ReadingWidth = 'narrow' | 'normal' | 'wide' | 'full';
export type ReadingLineHeight = 'normal' | 'relaxed' | 'spacious';
export type ReadingTheme = 'default' | 'sepia' | 'paper' | 'night';

interface ReadingPreferences {
  fontFamily: ReadingFontFamily;
  fontSize: ReadingFontSize;
  width: ReadingWidth;
  lineHeight: ReadingLineHeight;
  theme: ReadingTheme;
}

const DEFAULT_PREFERENCES: ReadingPreferences = {
  fontFamily: 'serif',
  fontSize: 'base',
  width: 'normal',
  lineHeight: 'relaxed',
  theme: 'default',
};

const STORAGE_KEY = 'pkm_reading_mode_preferences';

function loadReadingPreferences(): ReadingPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_PREFERENCES;
}

function saveReadingPreferences(prefs: ReadingPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

interface ReadingModeViewProps {
  note: Note;
  title: string;
  content: string;
  type: 'text' | 'checklist' | 'drawing' | 'audio';
  checklist: ChecklistItem[];
  images: NoteImage[];
  audios: NoteAudio[];
  allNotes: Note[];
  folders: Folder[];
  folderId: string | null;
  foldState: NoteFoldState;
  onToggleFold: (sectionId: string) => void;
  onOpenLinkedNote: (noteId: string) => void;
  onCreateNoteWithTitle?: (title: string) => void;
  onOpenPDF?: (pdfId: string, page?: number, highlightId?: string) => void;
  onContentChange: (newContent: string) => void;
  onToggleChecklistItem?: (id: string) => void;
  onExitReadingMode: () => void;
  onCloseModal: () => void;
}

export const ReadingModeView: React.FC<ReadingModeViewProps> = ({
  note,
  title,
  content,
  type,
  checklist,
  images,
  audios,
  allNotes,
  folders,
  folderId,
  foldState,
  onToggleFold,
  onOpenLinkedNote,
  onCreateNoteWithTitle,
  onOpenPDF,
  onContentChange,
  onToggleChecklistItem,
  onExitReadingMode,
  onCloseModal,
}) => {
  const [prefs, setPrefs] = useState<ReadingPreferences>(loadReadingPreferences);
  const [showTypographyMenu, setShowTypographyMenu] = useState(false);
  const [showOutlineMenu, setShowOutlineMenu] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allNoteImages = useMemo(() => {
    return extractNoteImages(content, images);
  }, [content, images]);

  // Update preferences helper
  const updatePref = <K extends keyof ReadingPreferences>(key: K, value: ReadingPreferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      saveReadingPreferences(next);
      return next;
    });
  };

  // Compute reading statistics
  const stats = useMemo(() => {
    const rawText = type === 'checklist' 
      ? checklist.map((i) => i.text).join(' ') 
      : content;
    const words = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
    const chars = rawText.length;
    const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readTimeMinutes };
  }, [content, checklist, type]);

  // Extract sections/TOC
  const sections: DocumentSection[] = useMemo(() => {
    if (type !== 'text' || !content) return [];
    return parseMarkdownSections(content);
  }, [content, type]);

  // Track scroll progress inside container
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const totalScroll = el.scrollHeight - el.clientHeight;
    if (totalScroll <= 0) {
      setScrollProgress(0);
    } else {
      const progress = Math.min(100, Math.max(0, (el.scrollTop / totalScroll) * 100));
      setScrollProgress(progress);
    }
  };

  // Fullscreen toggler
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Jump to heading
  const jumpToHeading = (headingText: string) => {
    setShowOutlineMenu(false);
    const el = scrollContainerRef.current;
    if (!el) return;
    
    // Find heading element by text content
    const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i] as HTMLElement;
      if (h.textContent?.trim().toLowerCase().includes(headingText.trim().toLowerCase())) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  };

  // Keyboard shortcut for exiting or toggling typography
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTypographyMenu) {
          setShowTypographyMenu(false);
        } else if (showOutlineMenu) {
          setShowOutlineMenu(false);
        } else {
          onExitReadingMode();
        }
      } else if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        onExitReadingMode();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showTypographyMenu, showOutlineMenu, onExitReadingMode]);

  // Typography class calculations
  const fontFamilyClass =
    prefs.fontFamily === 'serif'
      ? 'font-serif'
      : prefs.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const fontSizeClass =
    prefs.fontSize === 'sm'
      ? 'text-[15px]'
      : prefs.fontSize === 'base'
      ? 'text-[17px]'
      : prefs.fontSize === 'lg'
      ? 'text-[20px]'
      : 'text-[23px]';

  const lineHeightClass =
    prefs.lineHeight === 'normal'
      ? 'leading-normal'
      : prefs.lineHeight === 'relaxed'
      ? 'leading-relaxed'
      : 'leading-loose';

  const widthClass =
    prefs.width === 'narrow'
      ? 'max-w-xl'
      : prefs.width === 'normal'
      ? 'max-w-3xl'
      : prefs.width === 'wide'
      ? 'max-w-4xl'
      : 'max-w-6xl';

  // Theme styling overrides
  const themeClasses = useMemo(() => {
    switch (prefs.theme) {
      case 'sepia':
        return {
          wrapper: 'bg-[#fbf0d9] dark:bg-[#201a14] text-[#433422] dark:text-[#f0e4d0]',
          header: 'bg-[#f4e6c9]/90 dark:bg-[#1a1510]/90 border-[#e3d0ab] dark:border-[#382d23]',
          card: 'bg-[#fbf0d9] dark:bg-[#201a14]',
          accent: 'text-amber-800 dark:text-amber-300',
          border: 'border-[#e3d0ab] dark:border-[#382d23]',
        };
      case 'paper':
        return {
          wrapper: 'bg-[#fdfbf7] dark:bg-[#151515] text-[#1c1917] dark:text-[#f5f5f4]',
          header: 'bg-[#f7f4ee]/90 dark:bg-[#1a1a1a]/90 border-[#e7e3da] dark:border-[#2a2a2a]',
          card: 'bg-[#fdfbf7] dark:bg-[#151515]',
          accent: 'text-stone-900 dark:text-stone-100',
          border: 'border-[#e7e3da] dark:border-[#2a2a2a]',
        };
      case 'night':
        return {
          wrapper: 'bg-[#0f172a] text-[#e2e8f0]',
          header: 'bg-[#1e293b]/90 border-[#334155]',
          card: 'bg-[#0f172a]',
          accent: 'text-sky-400',
          border: 'border-[#334155]',
        };
      default:
        return {
          wrapper: 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100',
          header: 'bg-white/90 dark:bg-stone-900/90 border-stone-200 dark:border-stone-800',
          card: 'bg-white dark:bg-stone-900',
          accent: 'text-amber-600 dark:text-amber-400',
          border: 'border-stone-200 dark:border-stone-800',
        };
    }
  }, [prefs.theme]);

  const folderName = folderId ? folders.find((f) => f.id === folderId)?.name : null;
  const folderColor = folderId ? folders.find((f) => f.id === folderId)?.color : '#f59e0b';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`w-full max-w-5xl h-[88vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto transition-all ${themeClasses.wrapper} ${themeClasses.border}`}
    >
      {/* Scroll Progress Bar at Top Edge */}
      <div className="w-full h-1 bg-stone-200/50 dark:bg-stone-800/50 shrink-0 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Sleek Minimalist Reading Header */}
      <header
        className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-30 transition-colors ${themeClasses.header}`}
      >
        {/* Left: Back / Exit Reading Mode */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onExitReadingMode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200/70 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-xs font-semibold transition-colors shrink-0"
            title="Exit Reading Mode (Esc or Alt+R)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Reading</span>
            <span className="sm:hidden">Exit</span>
            <kbd className="hidden md:inline px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px] font-mono ml-0.5">
              Esc
            </kbd>
          </button>

          {/* Note Title & Breadcrumb */}
          <div className="min-w-0 flex items-center gap-2 pl-1">
            {folderName && (
              <span className="hidden md:inline-flex items-center gap-1 text-xs opacity-70 truncate shrink-0">
                <FolderIcon className="w-3 h-3" style={{ color: folderColor }} />
                <span>{folderName}</span>
                <span className="opacity-40">/</span>
              </span>
            )}
            <h2 className="text-sm sm:text-base font-bold truncate tracking-tight">
              {title.trim() || 'Untitled Note'}
            </h2>
          </div>
        </div>

        {/* Right: Quick Tools (Outline, Typography, Stats, Fullscreen, Close) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Reading Time Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs opacity-75 font-medium bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {stats.readTimeMinutes} min read ({stats.words} words)
            </span>
          </div>

          {/* Table of Contents / Outline Drawer Trigger */}
          {sections.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowOutlineMenu(!showOutlineMenu);
                  setShowTypographyMenu(false);
                }}
                className={`p-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${
                  showOutlineMenu
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                }`}
                title="Table of Contents & Headings"
              >
                <ListOrdered className="w-4 h-4" />
                <span className="hidden sm:inline">Outline</span>
              </button>

              {/* Outline Dropdown */}
              {showOutlineMenu && (
                <div
                  className={`absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto p-2 rounded-2xl shadow-2xl z-50 text-xs border backdrop-blur-xl ${themeClasses.card} ${themeClasses.border}`}
                >
                  <div className="px-2 py-1 font-bold uppercase text-[10px] tracking-wider opacity-60 flex items-center justify-between border-b pb-1.5 mb-1.5">
                    <span>Document Outline ({sections.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowOutlineMenu(false)}
                      className="p-1 hover:opacity-100 opacity-60"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {sections.map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => jumpToHeading(sec.title)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-500/15 transition-colors font-medium truncate flex items-center gap-1.5 ${
                          sec.level === 1
                            ? 'font-bold text-xs'
                            : sec.level === 2
                            ? 'pl-4 text-xs'
                            : 'pl-6 text-[11px] opacity-85'
                        }`}
                      >
                        <span className="opacity-40 font-mono text-[10px]">H{sec.level}</span>
                        <span className="truncate">{sec.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Typography & Appearance Control Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTypographyMenu(!showTypographyMenu);
                setShowOutlineMenu(false);
              }}
              className={`p-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${
                showTypographyMenu
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
              }`}
              title="Typography & Reading Settings"
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Typography</span>
            </button>

            {/* Typography Popover Panel */}
            {showTypographyMenu && (
              <div
                className={`absolute right-0 top-full mt-2 w-80 p-4 rounded-2xl shadow-2xl z-50 text-xs border backdrop-blur-xl space-y-4 ${themeClasses.card} ${themeClasses.border}`}
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-amber-500" /> Reading Typography
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTypographyMenu(false)}
                    className="p-1 hover:opacity-100 opacity-60"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Font Family Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold opacity-70 block">Font Family</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5">
                    <button
                      type="button"
                      onClick={() => updatePref('fontFamily', 'serif')}
                      className={`py-1.5 px-2 rounded-lg font-serif font-bold text-xs transition-all ${
                        prefs.fontFamily === 'serif'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      Serif
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePref('fontFamily', 'sans')}
                      className={`py-1.5 px-2 rounded-lg font-sans font-bold text-xs transition-all ${
                        prefs.fontFamily === 'sans'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      Sans
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePref('fontFamily', 'mono')}
                      className={`py-1.5 px-2 rounded-lg font-mono font-bold text-xs transition-all ${
                        prefs.fontFamily === 'mono'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      Mono
                    </button>
                  </div>
                </div>

                {/* Font Size Step Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold opacity-70">Font Size</label>
                    <span className="text-[10px] font-mono opacity-50 uppercase">
                      {prefs.fontSize}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                    {(['sm', 'base', 'lg', 'xl'] as ReadingFontSize[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => updatePref('fontSize', sz)}
                        className={`py-1 rounded-lg font-semibold text-xs transition-all ${
                          prefs.fontSize === sz
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {sz === 'sm' ? '15px' : sz === 'base' ? '17px' : sz === 'lg' ? '20px' : '23px'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Width / Reading Column */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold opacity-70 block">Column Width</label>
                  <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                    {(['narrow', 'normal', 'wide', 'full'] as ReadingWidth[]).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updatePref('width', w)}
                        className={`py-1 rounded-lg font-semibold text-xs capitalize transition-all ${
                          prefs.width === w
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Spacing */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold opacity-70 block">Line Spacing</label>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                    {(['normal', 'relaxed', 'spacious'] as ReadingLineHeight[]).map((lh) => (
                      <button
                        key={lh}
                        type="button"
                        onClick={() => updatePref('lineHeight', lh)}
                        className={`py-1 rounded-lg font-semibold text-xs capitalize transition-all ${
                          prefs.lineHeight === lh
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {lh}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reading Theme Tint */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold opacity-70 block">Reading Tone</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updatePref('theme', 'default')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        prefs.theme === 'default'
                          ? 'border-amber-500 ring-2 ring-amber-500/20 font-bold'
                          : 'opacity-70 hover:opacity-100 border-black/10 dark:border-white/10'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5 text-amber-500" />
                      <span>Default</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePref('theme', 'sepia')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 bg-[#fbf0d9] text-[#433422] transition-all ${
                        prefs.theme === 'sepia'
                          ? 'border-amber-600 ring-2 ring-amber-600/30 font-bold'
                          : 'opacity-85 hover:opacity-100 border-[#e3d0ab]'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-[#d7ba8d]" />
                      <span>Sepia Paper</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePref('theme', 'paper')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 bg-[#fdfbf7] text-[#1c1917] transition-all ${
                        prefs.theme === 'paper'
                          ? 'border-stone-800 ring-2 ring-stone-800/20 font-bold'
                          : 'opacity-85 hover:opacity-100 border-[#e7e3da]'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-[#e5e0d8]" />
                      <span>Clean Paper</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePref('theme', 'night')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 bg-[#0f172a] text-[#e2e8f0] transition-all ${
                        prefs.theme === 'night'
                          ? 'border-sky-500 ring-2 ring-sky-500/30 font-bold'
                          : 'opacity-85 hover:opacity-100 border-[#334155]'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-sky-400" />
                      <span>Night Slate</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Immersive Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal */}
          <button
            type="button"
            onClick={onCloseModal}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100 transition-colors"
            title="Close Note"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Reading Canvas Container */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-16 py-8 sm:py-12 select-text"
      >
        <article className={`${widthClass} mx-auto transition-all`}>
          {/* Article Header */}
          <header className="mb-8 sm:mb-12 border-b pb-6 border-black/10 dark:border-white/10">
            {/* Folder & Date Subtitle */}
            <div className="flex flex-wrap items-center gap-3 text-xs opacity-65 mb-3 font-medium">
              {folderName && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5">
                  <FolderIcon className="w-3.5 h-3.5" style={{ color: folderColor }} />
                  <span>{folderName}</span>
                </div>
              )}
              {note.updatedAt && (
                <div className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(note.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                </div>
              )}
              <div className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{stats.readTimeMinutes} min read</span>
              </div>
            </div>

            {/* Big Expressive Title */}
            <h1
              className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight ${fontFamilyClass} ${themeClasses.accent} leading-tight mb-3`}
            >
              {title.trim() || 'Untitled Note'}
            </h1>

            {/* Subtle Tags Pill List */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {note.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/5 dark:bg-white/5 opacity-75 font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Attached Images Gallery (Read-only) */}
          {images && images.length > 0 && (
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm"
                >
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="w-full h-auto max-h-96 object-cover hover:scale-[1.01] transition-transform"
                    loading="lazy"
                  />
                  {img.name && (
                    <div className="p-2 text-center text-xs opacity-60 bg-black/5 dark:bg-white/5 font-mono truncate">
                      {img.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Audio Players Section */}
          {audios && audios.length > 0 && (
            <div className="mb-8 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-2">
                Audio Recordings ({audios.length})
              </span>
              <AudioRecorder
                audios={audios}
                onAddAudio={() => {}}
                onRemoveAudio={() => {}}
                readOnly={true}
              />
            </div>
          )}

          {/* Note Content Renderer */}
          {type === 'text' ? (
            <div
              className={`prose-reading ${fontFamilyClass} ${fontSizeClass} ${lineHeightClass} space-y-4`}
            >
              <PKMPreviewRenderer
                content={content}
                sourceNoteId={note.id}
                allNotes={allNotes}
                folders={folders}
                onContentChange={onContentChange}
                externalFoldState={foldState}
                onToggleExternalFold={onToggleFold}
                onImageClick={(url) => {
                  const foundIdx = allNoteImages.findIndex((img) => img.url === url);
                  setLightboxIndex(foundIdx >= 0 ? foundIdx : 0);
                }}
                onOpenNote={(targetId) => {
                  onExitReadingMode();
                  onOpenLinkedNote(targetId);
                }}
                onCreateNote={(targetTitle) => {
                  onExitReadingMode();
                  if (onCreateNoteWithTitle) {
                    onCreateNoteWithTitle(targetTitle);
                  }
                }}
                onOpenPDF={(pdfId, page, highlightId) => {
                  onExitReadingMode();
                  if (onOpenPDF) {
                    onOpenPDF(pdfId, page, highlightId);
                  }
                }}
              />
            </div>
          ) : (
            /* Checklist Reading View */
            <div className={`space-y-4 ${fontFamilyClass} ${fontSizeClass}`}>
              {checklist.length > 0 ? (
                <div className="space-y-3">
                  {/* Checklist Completion Progress */}
                  <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                        <span>
                          {checklist.filter((i) => i.completed).length} of {checklist.length} completed
                        </span>
                      </div>
                      <span className="font-mono opacity-70">
                        {Math.round(
                          (checklist.filter((i) => i.completed).length / Math.max(1, checklist.length)) * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${(checklist.filter((i) => i.completed).length / Math.max(1, checklist.length)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onToggleChecklistItem && onToggleChecklistItem(item.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                          item.completed
                            ? 'opacity-60 line-through bg-black/3 dark:bg-white/3'
                            : 'hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => onToggleChecklistItem && onToggleChecklistItem(item.id)}
                          className="w-5 h-5 rounded text-amber-500 accent-amber-500 mt-0.5 shrink-0 cursor-pointer"
                        />
                        <span className={`${fontSizeClass} ${lineHeightClass} font-medium`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center opacity-50 italic">Empty checklist</div>
              )}
            </div>
          )}

          {/* Bottom End-of-Reading Marker */}
          <footer className="mt-16 pt-8 border-t border-black/10 dark:border-white/10 text-center text-xs opacity-50 space-y-1">
            <div className="w-8 h-1 bg-amber-500/40 rounded-full mx-auto mb-3" />
            <p>End of "{title.trim() || 'Untitled Note'}"</p>
            <p className="font-mono text-[10px]">
              {stats.words} words • {stats.chars} characters
            </p>
          </footer>
        </article>
      </main>

      {/* Note Image Lightbox Collection */}
      <NoteImageLightbox
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={allNoteImages}
        initialIndex={lightboxIndex ?? 0}
        noteTitle={title || 'Untitled Note'}
      />
    </div>
  );
};
