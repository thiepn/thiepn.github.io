import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  List,
  Highlighter,
  FileText,
  Settings2,
  Type,
  Sun,
  Moon,
  Coffee,
  Bookmark,
  Plus,
  Check,
} from 'lucide-react';
import JSZip from 'jszip';
import { LibraryItem, SourceHighlight, HighlightColor } from '../libraryTypes';
import { EpubParser } from '../epub/epubParser';
import { EpubParsedBook, EpubTocItem } from '../epub/epubTypes';
import { mediaService } from '../../media/mediaService';
import { libraryHighlightService } from '../libraryHighlightService';
import { libraryService } from '../libraryService';

export interface LibraryReaderModalProps {
  item: LibraryItem;
  isOpen: boolean;
  onClose: () => void;
  onOpenNote?: (noteId: string) => void;
}

export const LibraryReaderModal: React.FC<LibraryReaderModalProps> = ({
  item,
  isOpen,
  onClose,
  onOpenNote,
}) => {
  const [parsedBook, setParsedBook] = useState<EpubParsedBook | null>(null);
  const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [chapterHtml, setChapterHtml] = useState<string>('');
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reader Customization State
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('sepia');

  // Text selection highlight state
  const [selectedText, setSelectedText] = useState<string>('');
  const [highlightNote, setHighlightNote] = useState<string>('');
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('yellow');
  const [showHighlightPopup, setShowHighlightPopup] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);
  const [isHighlightSaved, setIsHighlightSaved] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Load EPUB file on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    const loadBook = async () => {
      try {
        if (!item.attachmentIds || item.attachmentIds.length === 0) {
          throw new Error('No EPUB file attachment found for this library item.');
        }

        const blob = await mediaService.getAttachmentBlob(item.attachmentIds[0]);
        if (!blob) {
          throw new Error('Could not retrieve EPUB attachment data.');
        }

        const arrayBuffer = await blob.arrayBuffer();
        const { book, zip } = await EpubParser.parseEpub(arrayBuffer);
        if (!isMounted) return;

        if (book.isDrmProtected) {
          setErrorMessage(
            'This EPUB is protected with Digital Rights Management (DRM). Protected ebooks cannot be rendered in this local viewer.'
          );
          setIsLoading(false);
          return;
        }

        setParsedBook(book);
        setZipInstance(zip);

        // Resume saved progress chapter if available
        let startChapter = 0;
        if (item.progress?.location && item.progress.location.startsWith('ch-')) {
          const parsedIdx = parseInt(item.progress.location.replace('ch-', ''), 10);
          if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < book.spine.length) {
            startChapter = parsedIdx;
          }
        }

        setCurrentChapterIdx(startChapter);
        await loadChapter(zip, book, startChapter);
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Failed to load EPUB book.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadBook();

    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  const loadChapter = async (zip: JSZip, book: EpubParsedBook, index: number) => {
    if (index < 0 || index >= book.spine.length) return;
    const href = book.spine[index];
    const tocMatch = book.toc.find((t) => t.href.includes(href) || href.includes(t.href));
    const title = tocMatch?.title || `Chapter ${index + 1}`;

    const content = await EpubParser.getChapterContent(zip, href, index, title);
    setChapterHtml(content.sanitizedHtml);
    setChapterTitle(content.title || `Chapter ${index + 1}`);

    // Update item reading progress location
    const percent = Math.round(((index + 1) / book.spine.length) * 100);
    libraryService.updateProgress(item.id, {
      mode: 'location',
      location: `ch-${index}`,
      percent,
    });
  };

  const handleNextChapter = () => {
    if (!parsedBook || !zipInstance || currentChapterIdx >= parsedBook.spine.length - 1) return;
    const nextIdx = currentChapterIdx + 1;
    setCurrentChapterIdx(nextIdx);
    loadChapter(zipInstance, parsedBook, nextIdx);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  const handlePrevChapter = () => {
    if (!parsedBook || !zipInstance || currentChapterIdx <= 0) return;
    const prevIdx = currentChapterIdx - 1;
    setCurrentChapterIdx(prevIdx);
    loadChapter(zipInstance, parsedBook, prevIdx);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  const handleSelectToc = (href: string) => {
    if (!parsedBook || !zipInstance) return;
    const spineIdx = parsedBook.spine.findIndex((s) => s.includes(href) || href.includes(s));
    if (spineIdx >= 0) {
      setCurrentChapterIdx(spineIdx);
      loadChapter(zipInstance, parsedBook, spineIdx);
      setIsTocOpen(false);
      if (contentRef.current) contentRef.current.scrollTop = 0;
    }
  };

  // Text selection handler for instant highlighting
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText(text);
    setSelectionCoords({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    setShowHighlightPopup(true);
    setIsHighlightSaved(false);
  };

  const handleSaveHighlight = () => {
    if (!selectedText) return;

    libraryHighlightService.addHighlight(
      item.id,
      selectedText,
      'epub',
      {
        chapter: chapterTitle,
        locationText: `${chapterTitle} (§${currentChapterIdx + 1})`,
      },
      highlightNote.trim() || undefined,
      highlightColor
    );

    setIsHighlightSaved(true);
    setTimeout(() => {
      setShowHighlightPopup(false);
      setSelectedText('');
      setHighlightNote('');
      setIsHighlightSaved(false);
      window.getSelection()?.removeAllRanges();
    }, 1200);
  };

  if (!isOpen) return null;

  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-stone-950 text-stone-200';
      case 'sepia':
        return 'bg-[#fbf0d9] text-[#433422]';
      case 'light':
      default:
        return 'bg-white text-stone-900';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Navbar */}
      <header className="h-14 px-4 bg-stone-900 text-stone-200 border-b border-stone-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTocOpen(!isTocOpen)}
            className="p-2 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
            title="Table of Contents"
          >
            <List className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Contents</span>
          </button>

          <div className="h-4 w-[1px] bg-stone-800" />

          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{item.title}</h1>
            <p className="text-[10px] text-stone-400 line-clamp-1">{chapterTitle}</p>
          </div>
        </div>

        {/* Reader Display Controls & Close */}
        <div className="flex items-center gap-2">
          {/* Font Family */}
          <div className="flex rounded-lg bg-stone-800 p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setFontFamily('serif')}
              className={`px-2 py-1 rounded ${
                fontFamily === 'serif' ? 'bg-amber-500 text-stone-900 font-bold' : 'text-stone-400'
              }`}
            >
              Serif
            </button>
            <button
              type="button"
              onClick={() => setFontFamily('sans')}
              className={`px-2 py-1 rounded ${
                fontFamily === 'sans' ? 'bg-amber-500 text-stone-900 font-bold' : 'text-stone-400'
              }`}
            >
              Sans
            </button>
          </div>

          {/* Font Size */}
          <div className="flex items-center gap-1 bg-stone-800 rounded-lg px-2 py-1 text-xs">
            <button
              type="button"
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              className="text-stone-300 hover:text-white font-bold"
            >
              A-
            </button>
            <span className="text-[10px] font-mono text-stone-400 px-1">{fontSize}px</span>
            <button
              type="button"
              onClick={() => setFontSize(Math.min(28, fontSize + 2))}
              className="text-stone-300 hover:text-white font-bold"
            >
              A+
            </button>
          </div>

          {/* Theme Toggles */}
          <div className="flex rounded-lg bg-stone-800 p-0.5">
            <button
              type="button"
              onClick={() => setTheme('sepia')}
              className={`p-1.5 rounded ${theme === 'sepia' ? 'bg-[#fbf0d9] text-[#433422]' : 'text-stone-400'}`}
              title="Sepia Mode"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded ${theme === 'light' ? 'bg-white text-stone-900' : 'text-stone-400'}`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded ${theme === 'dark' ? 'bg-stone-950 text-white' : 'text-stone-400'}`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-stone-800 mx-1" />

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Table of Contents Drawer */}
        {isTocOpen && (
          <aside className="w-72 bg-stone-900 border-r border-stone-800 p-4 overflow-y-auto flex flex-col justify-between shrink-0 z-20">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Chapters
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTocOpen(false)}
                  className="text-stone-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {parsedBook?.toc && parsedBook.toc.length > 0 ? (
                  parsedBook.toc.map((toc) => (
                    <button
                      key={toc.id}
                      type="button"
                      onClick={() => handleSelectToc(toc.href)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-300 hover:bg-stone-800 hover:text-amber-400 line-clamp-1 transition-colors"
                    >
                      {toc.title}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-stone-500 italic">No structured TOC detected.</p>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Reading Canvas */}
        <main
          ref={contentRef}
          onMouseUp={handleMouseUp}
          className={`flex-1 overflow-y-auto p-6 md:p-12 transition-colors duration-200 flex flex-col items-center select-text ${getThemeClasses()}`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center my-auto">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold">Opening ebook...</p>
            </div>
          ) : errorMessage ? (
            <div className="max-w-md p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-center my-auto">
              <p className="text-sm font-bold text-rose-800 dark:text-rose-200 mb-2">
                Unable to Display Ebook
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-300 mb-4">{errorMessage}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-bold text-xs"
              >
                Close Reader
              </button>
            </div>
          ) : (
            <div
              className="max-w-2xl w-full leading-relaxed transition-all"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily:
                  fontFamily === 'serif'
                    ? 'Charter, Georgia, "Times New Roman", serif'
                    : 'ui-sans-serif, system-ui, sans-serif',
              }}
            >
              <div
                className="prose dark:prose-invert max-w-none epub-content-body"
                dangerouslySetInnerHTML={{ __html: chapterHtml }}
              />
            </div>
          )}
        </main>

        {/* Floating Highlight / Excerpt Creation Popup */}
        {showHighlightPopup && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white rounded-2xl p-3 shadow-2xl border border-stone-700 w-full max-w-md animate-in slide-in-from-bottom-3 duration-150">
            {isHighlightSaved ? (
              <div className="flex items-center justify-center gap-2 py-2 text-emerald-400 text-xs font-bold">
                <Check className="w-4 h-4" />
                <span>Highlight & Quote Captured!</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Highlighter className="w-3.5 h-3.5" />
                    <span>Capture Highlight</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['yellow', 'green', 'blue', 'pink', 'purple'] as HighlightColor[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setHighlightColor(c)}
                        className={`w-4 h-4 rounded-full border ${
                          highlightColor === c ? 'ring-2 ring-white scale-110' : ''
                        }`}
                        style={{
                          backgroundColor:
                            c === 'yellow'
                              ? '#f59e0b'
                              : c === 'green'
                              ? '#10b981'
                              : c === 'blue'
                              ? '#0ea5e9'
                              : c === 'pink'
                              ? '#ec4899'
                              : '#a855f7',
                        }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowHighlightPopup(false)}
                      className="text-stone-400 hover:text-white ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-stone-300 italic line-clamp-2 bg-stone-800/80 p-2 rounded-lg">
                  "{selectedText}"
                </p>

                <input
                  type="text"
                  placeholder="Add note or reflection (optional)..."
                  value={highlightNote}
                  onChange={(e) => setHighlightNote(e.target.value)}
                  className="w-full bg-stone-800 border-none rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-stone-500 focus:ring-1 focus:ring-amber-500"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveHighlight}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs shadow"
                  >
                    Save Highlight
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Navigation */}
      {parsedBook && !isLoading && !errorMessage && (
        <footer className="h-12 px-4 bg-stone-900 text-stone-300 border-t border-stone-800 flex items-center justify-between shrink-0 text-xs">
          <button
            type="button"
            disabled={currentChapterIdx <= 0}
            onClick={handlePrevChapter}
            className="flex items-center gap-1 font-semibold hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="font-mono text-[11px] text-stone-400">
            Chapter {currentChapterIdx + 1} of {parsedBook.spine.length}
          </span>

          <button
            type="button"
            disabled={currentChapterIdx >= parsedBook.spine.length - 1}
            onClick={handleNextChapter}
            className="flex items-center gap-1 font-semibold hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      )}
    </div>
  );
};
