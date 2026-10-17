import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Presentation,
  Play,
  Tv,
  Edit3,
  Monitor,
  Copy,
  Download,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Moon,
  Sun,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  Share2,
  Layers,
  HelpCircle,
  X,
  Target,
  Eye,
  Check,
  BookOpen,
  ArrowRight,
  Split,
  Quote,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  SlideItem,
  SlideThemeId,
  PRESENTATION_THEMES,
  PresentationTemplateType,
} from '../../pkm/presentation/presentationTypes';
import {
  parseMarkdownToSlides,
  getPresentationTemplate,
  exportStandaloneHtmlPresentation,
} from '../../pkm/presentation/slideParser';

interface PresentationStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders?: Folder[];
  initialNoteId?: string | null;
  onCreateNote?: (note: Partial<Note>) => Promise<Note>;
  onOpenNote?: (id: string, title: string) => void;
}

type StudioViewMode = 'slides' | 'presenter' | 'editor';

export const PresentationStudioModal: React.FC<PresentationStudioModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders = [],
  initialNoteId,
  onCreateNote,
  onOpenNote,
}) => {
  // Selected note or internal custom presentation
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialNoteId || null);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [deckTitle, setDeckTitle] = useState<string>('Interactive Slide Deck');
  const [themeId, setThemeId] = useState<SlideThemeId>('obsidian-slate');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3'>('16:9');
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<StudioViewMode>('slides');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [laserActive, setLaserActive] = useState<boolean>(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [blackout, setBlackout] = useState<boolean>(false);
  const [whiteout, setWhiteout] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [showThumbnailDrawer, setShowThumbnailDrawer] = useState<boolean>(false);

  // Presenter timer
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load content when initial note changes
  useEffect(() => {
    if (initialNoteId) {
      const target = notes.find(n => n.id === initialNoteId);
      if (target) {
        setSelectedNoteId(target.id);
        setMarkdownContent(target.content);
        setDeckTitle(target.title || 'Untitled Presentation');
        return;
      }
    }

    if (notes.length > 0 && !selectedNoteId) {
      const first = notes[0];
      setSelectedNoteId(first.id);
      setMarkdownContent(first.content);
      setDeckTitle(first.title || 'Presentation Deck');
    } else if (!selectedNoteId) {
      // Default template
      const pitch = getPresentationTemplate('pitch-deck');
      setMarkdownContent(pitch);
      setDeckTitle('Nexus Knowledge Engine Pitch Deck');
    }
  }, [initialNoteId, notes]);

  // Handle note selection
  const handleSelectNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setSelectedNoteId(note.id);
      setMarkdownContent(note.content);
      setDeckTitle(note.title || 'Untitled Presentation');
      setCurrentSlideIndex(0);
    }
  };

  // Timer logic for Presenter Console
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Parse slides dynamically from markdown
  const slides: SlideItem[] = useMemo(() => {
    return parseMarkdownToSlides(markdownContent);
  }, [markdownContent]);

  // Ensure current slide index is valid
  useEffect(() => {
    if (currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentSlideIndex]);

  const currentSlide = slides[currentSlideIndex] || slides[0];
  const nextSlide = slides[currentSlideIndex + 1] || null;
  const currentTheme = PRESENTATION_THEMES[themeId];

  // Navigation handlers
  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(i => i + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(i => i - 1);
    }
  };

  // Laser pointer mouse move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!laserActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setLaserPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Global keydown handler inside presentation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if typing in editor text area or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {
        e.preventDefault();
        if (blackout || whiteout) {
          setBlackout(false);
          setWhiteout(false);
          return;
        }
        goToNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        if (blackout || whiteout) {
          setBlackout(false);
          setWhiteout(false);
          return;
        }
        goToPrevSlide();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIndex(Math.max(0, slides.length - 1));
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setWhiteout(false);
        setBlackout(b => !b);
      } else if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setBlackout(false);
        setWhiteout(w => !w);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLaserActive(l => !l);
      } else if (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setViewMode(m => (m === 'presenter' ? 'slides' : 'presenter'));
      } else if (e.key === 'Escape') {
        if (blackout || whiteout) {
          setBlackout(false);
          setWhiteout(false);
        } else if (isFullscreen) {
          toggleFullscreen();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length, blackout, whiteout, isFullscreen, viewMode]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Export handlers
  const handleDownloadHtml = () => {
    const html = exportStandaloneHtmlPresentation(deckTitle, slides, themeId);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-slides.html`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Downloaded Standalone HTML Presentation Deck!');
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    notify('Copied Slide Deck Markdown to clipboard!');
  };

  const handleSaveAsNote = async () => {
    if (onCreateNote) {
      const newNote = await onCreateNote({
        title: `📑 Presentation: ${deckTitle}`,
        content: markdownContent,
        tags: ['presentation', 'slides', 'p9'],
      });
      notify(`Saved presentation note: "${newNote.title}"`);
      if (onOpenNote) {
        onOpenNote(newNote.id, newNote.title);
      }
    }
  };

  const handleLoadTemplate = (type: PresentationTemplateType) => {
    const templateContent = getPresentationTemplate(type);
    setMarkdownContent(templateContent);
    setSelectedNoteId(null);
    setCurrentSlideIndex(0);
    notify(`Loaded ${type} template!`);
  };

  const notify = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-stone-950 text-stone-100 ${
        isFullscreen ? 'w-screen h-screen' : 'bg-black/80 backdrop-blur-md p-2 sm:p-4'
      }`}
    >
      <div
        className={`flex flex-col flex-1 overflow-hidden bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl relative ${
          isFullscreen ? 'rounded-none border-none' : ''
        }`}
      >
        {/* Top Studio Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-stone-800 bg-stone-950/90 select-none z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deckTitle}
                  onChange={e => setDeckTitle(e.target.value)}
                  className="font-bold text-base bg-transparent border-b border-transparent hover:border-stone-700 focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="Slide Deck Title"
                />
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800">
                  P9 Studio
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {slides.length} slides • {currentTheme.name} theme • {aspectRatio}
              </p>
            </div>
          </div>

          {/* Central View Switcher */}
          <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('slides')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'slides'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              Audience Slides
            </button>
            <button
              onClick={() => setViewMode('presenter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'presenter'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Presenter Console
            </button>
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'editor'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Markdown Editor
            </button>
          </div>

          {/* Controls & Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Note Selector */}
            <select
              value={selectedNoteId || ''}
              onChange={e => handleSelectNote(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:outline-none focus:border-purple-500 max-w-[150px] truncate"
            >
              <option value="" disabled>
                Select Note...
              </option>
              {notes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.title || 'Untitled Note'}
                </option>
              ))}
            </select>

            {/* Theme Selector */}
            <select
              value={themeId}
              onChange={e => setThemeId(e.target.value as SlideThemeId)}
              className="px-2.5 py-1.5 text-xs bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:outline-none focus:border-purple-500"
            >
              {Object.values(PRESENTATION_THEMES).map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Laser Pointer Toggle */}
            <button
              onClick={() => setLaserActive(l => !l)}
              title="Toggle Glowing Laser Pointer (L)"
              className={`p-2 rounded-lg border text-xs transition-colors ${
                laserActive
                  ? 'bg-red-950 text-red-400 border-red-700'
                  : 'bg-stone-900 text-stone-400 border-stone-700 hover:text-stone-200'
              }`}
            >
              <Target className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen (F)"
              className="p-2 rounded-lg border border-stone-700 bg-stone-900 text-stone-400 hover:text-stone-200 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Export & Save Menu */}
            <div className="relative group">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-medium text-stone-200 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
                Export
              </button>
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col bg-stone-900 border border-stone-700 rounded-xl shadow-xl w-56 p-1.5 z-30">
                <button
                  onClick={handleDownloadHtml}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg hover:bg-stone-800 text-stone-200"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <div className="font-semibold">Download Standalone HTML</div>
                    <div className="text-[10px] text-stone-400">Playable offline in any browser</div>
                  </div>
                </button>
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg hover:bg-stone-800 text-stone-200"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <div>
                    <div className="font-semibold">Copy Markdown Deck</div>
                    <div className="text-[10px] text-stone-400">Marp & Slide format</div>
                  </div>
                </button>
                {onCreateNote && (
                  <button
                    onClick={handleSaveAsNote}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg hover:bg-stone-800 text-stone-200"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <div className="font-semibold">Save as New Note</div>
                      <div className="text-[10px] text-stone-400">Store in current vault</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast feedback */}
        {copiedNotification && (
          <div className="absolute top-16 right-6 z-40 flex items-center gap-2 px-4 py-2 bg-emerald-950 border border-emerald-600 text-emerald-200 text-xs rounded-xl shadow-xl animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{copiedNotification}</span>
          </div>
        )}

        {/* Blackout / Whiteout Overlays */}
        {blackout && (
          <div
            onClick={() => setBlackout(false)}
            className="absolute inset-0 bg-black z-30 flex items-center justify-center cursor-pointer select-none"
          >
            <p className="text-stone-600 text-sm font-mono animate-pulse">Screen Blackout (Press B or Click to resume)</p>
          </div>
        )}
        {whiteout && (
          <div
            onClick={() => setWhiteout(false)}
            className="absolute inset-0 bg-white z-30 flex items-center justify-center cursor-pointer select-none"
          >
            <p className="text-stone-400 text-sm font-mono animate-pulse">Screen Whiteout (Press W or Click to resume)</p>
          </div>
        )}

        {/* View Mode 1: Audience Slides */}
        {viewMode === 'slides' && (
          <div
            className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden select-none"
            onMouseMove={handleMouseMove}
          >
            {/* Glowing Laser Pointer */}
            {laserActive && (
              <div
                className="absolute pointer-events-none rounded-full transform -translate-x-1/2 -translate-y-1/2 z-40 transition-transform duration-75"
                style={{
                  left: `${laserPos.x}px`,
                  top: `${laserPos.y}px`,
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#ef4444',
                  boxShadow: '0 0 16px 6px rgba(239, 68, 68, 0.9), 0 0 30px 10px rgba(239, 68, 68, 0.5)',
                }}
              />
            )}

            {/* Slide Stage Canvas */}
            <div
              className={`w-full max-w-5xl rounded-2xl shadow-2xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden border p-8 sm:p-14 ${
                aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-[4/3]'
              } ${currentTheme.bgClass} ${currentTheme.textClass} ${currentTheme.borderClass} ${currentTheme.fontFamily}`}
            >
              {/* Slide Content Render */}
              <div className="flex-1 flex flex-col justify-center">
                {currentSlide.layout === 'title' ? (
                  <div className="text-center space-y-6">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                      {currentSlide.title}
                    </h1>
                    <div className="text-xl sm:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed">
                      {currentSlide.body}
                    </div>
                  </div>
                ) : currentSlide.layout === 'quote' ? (
                  <div className="max-w-3xl mx-auto text-center space-y-6">
                    <Quote className="w-12 h-12 mx-auto opacity-30 text-purple-400" />
                    <blockquote className="text-2xl sm:text-3xl font-serif italic leading-relaxed">
                      "{currentSlide.body || currentSlide.title}"
                    </blockquote>
                    {currentSlide.quoteAuthor && (
                      <p className="text-lg font-bold opacity-80">— {currentSlide.quoteAuthor}</p>
                    )}
                  </div>
                ) : currentSlide.layout === 'split' && currentSlide.leftColumn && currentSlide.rightColumn ? (
                  <div className="space-y-6">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                      {currentSlide.title}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                      <div
                        className={`p-6 rounded-xl border ${currentTheme.cardBgClass} ${currentTheme.borderClass} space-y-3`}
                      >
                        {renderMarkdownContent(currentSlide.leftColumn)}
                      </div>
                      <div
                        className={`p-6 rounded-xl border ${currentTheme.cardBgClass} ${currentTheme.borderClass} space-y-3`}
                      >
                        {renderMarkdownContent(currentSlide.rightColumn)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                      {currentSlide.title}
                    </h2>
                    <div className="text-lg sm:text-xl space-y-4 leading-relaxed pt-2">
                      {renderMarkdownContent(currentSlide.body)}
                    </div>
                  </div>
                )}
              </div>

              {/* Slide Footer Metadata */}
              <div className="flex items-center justify-between pt-6 border-t border-current/10 text-xs opacity-60">
                <span>{deckTitle}</span>
                <span className="font-mono">
                  {currentSlideIndex + 1} / {slides.length}
                </span>
              </div>
            </div>

            {/* Bottom Floating Navigation Toolbar */}
            <div className="flex items-center gap-3 mt-4 bg-stone-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-stone-800 shadow-xl">
              <button
                onClick={goToPrevSlide}
                disabled={currentSlideIndex === 0}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 transition-colors"
                title="Previous Slide (Left Arrow)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-xs font-mono px-3 text-stone-300">
                {currentSlideIndex + 1} / {slides.length}
              </span>

              <button
                onClick={goToNextSlide}
                disabled={currentSlideIndex === slides.length - 1}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition-colors"
                title="Next Slide (Space or Right Arrow)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="h-4 w-px bg-stone-700 mx-1" />

              <button
                onClick={() => setShowThumbnailDrawer(d => !d)}
                className={`p-2 rounded-xl text-xs flex items-center gap-1.5 border transition-colors ${
                  showThumbnailDrawer
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
                }`}
                title="Show Slide Thumbnails Drawer"
              >
                <Layers className="w-4 h-4" />
                Slides
              </button>
            </div>
          </div>
        )}

        {/* View Mode 2: Presenter Console (Dual View with Timer & Speaker Notes) */}
        {viewMode === 'presenter' && (
          <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-hidden bg-stone-950">
            {/* Left Column: Current Slide Display */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-wider text-purple-400 font-bold">
                  Audience Screen (Current Slide)
                </span>
                <span className="text-xs font-mono text-stone-400">
                  Slide {currentSlideIndex + 1} of {slides.length}
                </span>
              </div>

              <div
                className={`flex-1 rounded-xl p-8 border flex flex-col justify-between shadow-lg overflow-y-auto ${currentTheme.bgClass} ${currentTheme.textClass} ${currentTheme.borderClass}`}
              >
                <div>
                  <h2 className="text-2xl font-bold mb-4">{currentSlide.title}</h2>
                  <div className="text-base space-y-3">{renderMarkdownContent(currentSlide.body)}</div>
                </div>
                <div className="text-xs opacity-50 pt-4 border-t border-current/10">
                  {deckTitle} • Slide {currentSlideIndex + 1}
                </div>
              </div>

              {/* Console Navigation Bar */}
              <div className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevSlide}
                    disabled={currentSlideIndex === 0}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-xs font-semibold"
                  >
                    ◀ Prev
                  </button>
                  <button
                    onClick={goToNextSlide}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-semibold text-white"
                  >
                    Next ▶
                  </button>
                </div>

                {/* Hotkey Guide */}
                <div className="text-[11px] text-stone-400 flex items-center gap-3">
                  <span>[B] Blackout</span>
                  <span>[W] Whiteout</span>
                  <span>[Space] Advance</span>
                </div>
              </div>
            </div>

            {/* Right Column: Next Slide Preview, Speaker Notes & Presenter Timer */}
            <div className="w-full md:w-96 flex flex-col gap-4">
              {/* Live Presenter Timer */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-stone-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    Presentation Timer
                  </div>
                  <div className="text-2xl font-mono font-bold text-purple-300 mt-1">
                    {formatTimer(timerSeconds)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTimerRunning(r => !r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      timerRunning
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {timerRunning ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(0);
                    }}
                    className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-stone-200"
                    title="Reset Timer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Next Slide Live Preview */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex-shrink-0">
                <div className="text-xs text-stone-400 mb-2 font-mono flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  Next Slide Preview
                </div>
                {nextSlide ? (
                  <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 min-h-[90px]">
                    <div className="font-bold text-sm text-stone-200">{nextSlide.title}</div>
                    <div className="text-xs text-stone-400 truncate mt-1">{nextSlide.body}</div>
                  </div>
                ) : (
                  <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 text-xs text-stone-500 text-center py-6">
                    End of Presentation Deck
                  </div>
                )}
              </div>

              {/* Speaker Notes Drawer */}
              <div className="flex-1 bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col overflow-hidden">
                <div className="text-xs text-stone-400 mb-2 font-mono flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Speaker Notes
                </div>
                <div className="flex-1 overflow-y-auto bg-stone-950 rounded-lg p-3 border border-stone-800 text-sm text-stone-300 leading-relaxed font-sans">
                  {currentSlide.speakerNotes ? (
                    <div className="whitespace-pre-wrap">{currentSlide.speakerNotes}</div>
                  ) : (
                    <div className="text-stone-500 italic text-xs py-4 text-center">
                      No speaker notes for this slide.<br />
                      Add notes in editor via <code>&lt;!-- note: your thoughts --&gt;</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Mode 3: Markdown Deck Editor */}
        {viewMode === 'editor' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left: Raw Markdown Editor */}
            <div className="flex-1 flex flex-col border-r border-stone-800 bg-stone-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-400 font-mono">
                  Markdown Source (Separate slides with <code>---</code>)
                </span>
                <div className="flex items-center gap-2">
                  <select
                    onChange={e => {
                      if (e.target.value) handleLoadTemplate(e.target.value as PresentationTemplateType);
                    }}
                    defaultValue=""
                    className="px-2 py-1 text-xs bg-stone-900 border border-stone-700 rounded text-stone-300"
                  >
                    <option value="" disabled>
                      Insert Starter Template...
                    </option>
                    <option value="pitch-deck">Pitch Deck</option>
                    <option value="research-talk">Research Conference Talk</option>
                    <option value="technical-architecture">Technical Architecture</option>
                    <option value="team-sync">Weekly Team Sync</option>
                  </select>
                  <button
                    onClick={() => {
                      setMarkdownContent(prev => prev + '\n\n---\n\n## New Slide Title\n- Bullet point\n\n<!-- note: Speaker note here -->');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-xs text-stone-200"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                    Add Slide
                  </button>
                </div>
              </div>
              <textarea
                value={markdownContent}
                onChange={e => setMarkdownContent(e.target.value)}
                className="flex-1 w-full bg-stone-900 border border-stone-800 rounded-xl p-4 text-sm font-mono text-stone-200 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                placeholder="# Slide Title&#10;&#10;---&#10;&#10;## Second Slide"
              />
            </div>

            {/* Right: Live Slide Preview */}
            <div className="w-full md:w-[480px] p-4 flex flex-col bg-stone-900/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-400 font-mono">
                  Live Preview: Slide {currentSlideIndex + 1} of {slides.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToPrevSlide}
                    disabled={currentSlideIndex === 0}
                    className="p-1 rounded bg-stone-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToNextSlide}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="p-1 rounded bg-stone-800 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                className={`flex-1 rounded-xl p-6 border shadow-inner flex flex-col justify-between overflow-y-auto ${currentTheme.bgClass} ${currentTheme.textClass} ${currentTheme.borderClass}`}
              >
                <div>
                  <h3 className="text-xl font-bold mb-3">{currentSlide.title}</h3>
                  <div className="text-sm space-y-2">{renderMarkdownContent(currentSlide.body)}</div>
                </div>
                {currentSlide.speakerNotes && (
                  <div className="mt-4 p-2 rounded bg-black/30 border border-current/10 text-xs">
                    <span className="font-bold opacity-70">Note: </span>
                    {currentSlide.speakerNotes}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Slide Thumbnail Drawer at bottom */}
        {showThumbnailDrawer && (
          <div className="border-t border-stone-800 bg-stone-950 p-3 flex gap-3 overflow-x-auto z-20">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`flex-shrink-0 w-36 h-24 rounded-lg p-2.5 border text-left flex flex-col justify-between transition-all ${
                  idx === currentSlideIndex
                    ? 'border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/50'
                    : 'border-stone-800 bg-stone-900 hover:border-stone-700'
                }`}
              >
                <div className="text-[11px] font-bold text-stone-200 truncate">{s.title}</div>
                <div className="text-[10px] text-stone-400 line-clamp-2">{s.body || 'Empty body'}</div>
                <div className="text-[9px] font-mono text-purple-400 text-right">{idx + 1}</div>
              </button>
            ))}
          </div>
        )}

        {/* Global Slide Progress Bar */}
        <div className="h-1 bg-stone-800 w-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{
              width: `${((currentSlideIndex + 1) / Math.max(1, slides.length)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Basic Markdown formatting renderer for slide body
 */
function renderMarkdownContent(content: string) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xl font-bold mt-2 mb-1">
              {trimmed.substring(4)}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-2xl font-bold mt-3 mb-1">
              {trimmed.substring(3)}
            </h3>
          );
        }

        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1">
              <span className="text-purple-400 text-base leading-snug">•</span>
              <span className="flex-1">{trimmed.substring(2)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1">
              <span className="font-mono text-purple-400 font-bold">{numMatch[1]}.</span>
              <span className="flex-1">{numMatch[2]}</span>
            </div>
          );
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-purple-500 pl-4 py-1 italic opacity-90 my-2"
            >
              {trimmed.substring(2)}
            </blockquote>
          );
        }

        // Code block
        if (trimmed.startsWith('```')) {
          return null; // Skip fence marker
        }

        return <p key={idx}>{trimmed}</p>;
      })}
    </>
  );
}
