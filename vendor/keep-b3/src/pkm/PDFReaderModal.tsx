import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Search,
  Highlighter,
  FileText,
  Copy,
  Check,
  Download,
  Trash2,
  MessageSquare,
  BookOpen,
  Sidebar,
  Share2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { PDFAttachment, PDFAnnotation, PDFHighlightColor, PDFSearchMatch } from './pdfTypes';
import { pdfStorageService } from './pdfStorage';
import {
  loadPDFDocument,
  renderPDFPageToCanvas,
  searchInPDF,
  PDFDocumentProxyWrapper,
} from './pdfEngine';
import {
  formatHighlightCitation,
  exportHighlightsToMarkdown,
  generateLiteratureNoteContent,
} from './pdfCitation';
import { Note } from '../types';

interface PDFReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfAttachmentId: string;
  initialPage?: number;
  targetHighlightId?: string;
  highlightIdToFocus?: string;
  onAddHighlightToNote?: (markdownSnippet: string, highlight?: PDFAnnotation) => void;
  onCreateLiteratureNote?: (pdf: PDFAttachment, annotations: PDFAnnotation[]) => void;
  onOpenNote?: (noteId: string) => void;
  activeNote?: Note | null;
}

const HIGHLIGHT_COLORS: Array<{ key: PDFHighlightColor; name: string; bg: string; border: string; preview: string }> = [
  { key: 'yellow', name: 'Yellow', bg: 'rgba(254, 240, 138, 0.45)', border: '#eab308', preview: 'bg-yellow-300' },
  { key: 'green', name: 'Green', bg: 'rgba(187, 247, 208, 0.45)', border: '#22c55e', preview: 'bg-emerald-300' },
  { key: 'blue', name: 'Blue', bg: 'rgba(191, 219, 254, 0.45)', border: '#3b82f6', preview: 'bg-sky-300' },
  { key: 'pink', name: 'Pink', bg: 'rgba(251, 207, 232, 0.45)', border: '#ec4899', preview: 'bg-pink-300' },
  { key: 'purple', name: 'Purple', bg: 'rgba(233, 213, 255, 0.45)', border: '#a855f7', preview: 'bg-purple-300' },
];

export const PDFReaderModal: React.FC<PDFReaderModalProps> = ({
  isOpen,
  onClose,
  pdfAttachmentId,
  initialPage = 1,
  targetHighlightId,
  highlightIdToFocus,
  onAddHighlightToNote,
  onCreateLiteratureNote,
  onOpenNote,
  activeNote,
}) => {
  const [attachment, setAttachment] = useState<PDFAttachment | null>(null);
  const [docWrapper, setDocWrapper] = useState<PDFDocumentProxyWrapper | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Viewport & Zoom
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.2);
  const [fitMode, setFitMode] = useState<'custom' | 'width' | 'page'>('width');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Annotations / Highlights
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [selectedHighlight, setSelectedHighlight] = useState<PDFAnnotation | null>(null);
  const [highlightColor, setHighlightColor] = useState<PDFHighlightColor>('yellow');
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Selection popup toolbar
  const [selectionPopup, setSelectionPopup] = useState<{
    x: number;
    y: number;
    text: string;
    page: number;
    rects: Array<{ x: number; y: number; width: number; height: number }>;
  } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PDFSearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Feedback states
  const [copiedText, setCopiedText] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderAbortControllers = useRef<Map<number, AbortController>>(new Map());

  // Show temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Load PDF attachment and initialize doc
  useEffect(() => {
    if (!isOpen || !pdfAttachmentId) return;

    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    const loadData = async () => {
      try {
        const stored = await pdfStorageService.getPDFAttachment(pdfAttachmentId);
        if (!stored || !stored.blob) {
          if (isMounted) {
            setLoadError('PDF document not found or could not be loaded.');
            setLoading(false);
          }
          return;
        }

        if (!isMounted) return;
        setAttachment(stored.attachment);

        // Load annotations
        const loadedAnnotations = await pdfStorageService.getAnnotationsForPDF(pdfAttachmentId);
        if (isMounted) {
          setAnnotations(loadedAnnotations);
        }

        // Load PDF.js document
        const wrapper = await loadPDFDocument(stored.blob);
        if (!isMounted) {
          wrapper.cleanup();
          return;
        }

        setDocWrapper(wrapper);
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        if (isMounted) {
          setLoadError(err?.message || 'Failed to render PDF document.');
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      if (docWrapper) {
        docWrapper.cleanup();
      }
      renderAbortControllers.current.forEach((ctrl) => ctrl.abort());
      renderAbortControllers.current.clear();
    };
  }, [isOpen, pdfAttachmentId]);

  // Jump to initial page and focus highlight when loaded
  useEffect(() => {
    if (!loading && docWrapper && initialPage) {
      scrollToPage(initialPage);
      if (targetHighlightId) {
        const target = annotations.find((a) => a.id === targetHighlightId);
        if (target) {
          setSelectedHighlight(target);
          setTimeout(() => scrollToPage(target.page), 100);
        }
      }
    }
  }, [loading, docWrapper, initialPage, targetHighlightId]);

  // Scroll to a specific page
  const scrollToPage = useCallback((pageNum: number) => {
    if (!docWrapper || pageNum < 1 || pageNum > docWrapper.numPages) return;
    setCurrentPage(pageNum);
    const targetEl = pageRefs.current.get(pageNum);
    if (targetEl && containerRef.current) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [docWrapper]);

  // Fit Width calculation
  const handleFitWidth = useCallback(() => {
    if (!containerRef.current || !docWrapper) return;
    const containerWidth = containerRef.current.clientWidth - 48; // padding
    // Assuming standard letter width ~612pt
    const targetScale = Math.max(0.6, Math.min(2.5, containerWidth / 650));
    setScale(targetScale);
    setFitMode('width');
  }, [docWrapper]);

  // Fit Page calculation
  const handleFitPage = useCallback(() => {
    if (!containerRef.current || !docWrapper) return;
    const containerHeight = containerRef.current.clientHeight - 80;
    const targetScale = Math.max(0.5, Math.min(2.0, containerHeight / 800));
    setScale(targetScale);
    setFitMode('page');
  }, [docWrapper]);

  // Handle Search in PDF
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!docWrapper || !query.trim()) {
      setSearchResults([]);
      setCurrentMatchIndex(0);
      return;
    }

    setIsSearching(true);
    try {
      const matches = await searchInPDF(docWrapper.doc, query);
      setSearchResults(matches);
      setCurrentMatchIndex(0);
      if (matches.length > 0) {
        scrollToPage(matches[0].pageIndex);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleNextSearchMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchResults.length;
    setCurrentMatchIndex(nextIdx);
    scrollToPage(searchResults[nextIdx].pageIndex);
  };

  const handlePrevSearchMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentMatchIndex(prevIdx);
    scrollToPage(searchResults[prevIdx].pageIndex);
  };

  // Render individual page canvas lazily
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!docWrapper) return;

      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;

      // Abort prior in-flight render for this page
      const prevCtrl = renderAbortControllers.current.get(pageNum);
      if (prevCtrl) {
        prevCtrl.abort();
      }

      const abortCtrl = new AbortController();
      renderAbortControllers.current.set(pageNum, abortCtrl);

      try {
        await renderPDFPageToCanvas(docWrapper.doc, pageNum, canvas, scale, abortCtrl.signal);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Render error page ${pageNum}:`, err);
        }
      }
    },
    [docWrapper, scale]
  );

  // Lazy render visible pages
  useEffect(() => {
    if (!docWrapper || loading) return;

    // Render current page + adjacent buffer pages
    const buffer = 2;
    const minPage = Math.max(1, currentPage - buffer);
    const maxPage = Math.min(docWrapper.numPages, currentPage + buffer);

    for (let p = minPage; p <= maxPage; p++) {
      renderPage(p);
    }
  }, [docWrapper, currentPage, scale, loading, renderPage]);

  // Observer to track current visible page during scrolling
  useEffect(() => {
    if (!containerRef.current || !docWrapper) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number(entry.target.getAttribute('data-page-num'));
            if (pageNum) {
              setCurrentPage(pageNum);
            }
          }
        }
      },
      {
        root: containerRef.current,
        threshold: 0.3,
      }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [docWrapper]);

  // Handle Mouse Selection on PDF Pages for Text Highlighting
  const handleMouseUp = (pageNum: number, e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionPopup(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 2) return;

    const pageContainer = pageRefs.current.get(pageNum);
    if (!pageContainer) return;

    const pageRect = pageContainer.getBoundingClientRect();
    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());

    // Normalize bounding rects [0..1] relative to the page container
    const normalizedRects = clientRects.map((cr) => ({
      x: Math.max(0, (cr.left - pageRect.left) / pageRect.width),
      y: Math.max(0, (cr.top - pageRect.top) / pageRect.height),
      width: Math.min(1, cr.width / pageRect.width),
      height: Math.min(1, cr.height / pageRect.height),
    }));

    setSelectionPopup({
      x: e.clientX,
      y: e.clientY - 40,
      text: selectedText,
      page: pageNum,
      rects: normalizedRects,
    });
  };

  // Create & Save Persistent Highlight
  const handleCreateHighlight = async (color = highlightColor, comment?: string) => {
    if (!selectionPopup || !attachment) return;

    const newAnnotation: PDFAnnotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      pdfId: attachment.id,
      page: selectionPopup.page,
      text: selectionPopup.text,
      color,
      note: comment,
      anchor: {
        rects: selectionPopup.rects,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await pdfStorageService.savePDFAnnotation(newAnnotation);
    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectionPopup(null);
    setSelectedHighlight(newAnnotation);
    showToast('Highlight saved');

    // Deselect window text
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  };

  // Delete Highlight
  const handleDeleteHighlight = async (annId: string) => {
    await pdfStorageService.deletePDFAnnotation(annId);
    setAnnotations((prev) => prev.filter((a) => a.id !== annId));
    if (selectedHighlight?.id === annId) {
      setSelectedHighlight(null);
    }
    showToast('Highlight deleted');
  };

  // Copy Citation Snippet
  const handleCopyCitation = (ann: PDFAnnotation) => {
    if (!attachment) return;
    const citation = formatHighlightCitation(ann, attachment);
    navigator.clipboard.writeText(citation);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1500);
    showToast('Citation copied to clipboard');
  };

  // Add Highlight To Current Active Note
  const handleAddHighlightToActiveNote = (ann: PDFAnnotation) => {
    if (!attachment) return;
    const snippet = formatHighlightCitation(ann, attachment);
    if (onAddHighlightToNote) {
      onAddHighlightToNote(snippet);
      showToast('Added highlight quote to active note');
    } else {
      navigator.clipboard.writeText(snippet);
      showToast('Copied to clipboard (no active note opened)');
    }
  };

  // Extract All Highlights to Active Note or New Note
  const handleExtractAllHighlights = () => {
    if (!attachment) return;
    const md = exportHighlightsToMarkdown(attachment, annotations);
    if (onAddHighlightToNote) {
      onAddHighlightToNote(`\n\n${md}`);
      showToast(`Exported ${annotations.length} highlights to note`);
    } else {
      navigator.clipboard.writeText(md);
      showToast(`Copied ${annotations.length} highlights to clipboard`);
    }
  };

  // Create Dedicated Literature Note
  const handleCreateLiteratureNote = () => {
    if (!attachment || !onCreateLiteratureNote) return;
    onCreateLiteratureNote(attachment, annotations);
    showToast(`Created Literature Note for "${attachment.title || attachment.name}"`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-stone-900/90 backdrop-blur-xs select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-reader-title"
    >
      {/* Top Main Navigation Header */}
      <header className="h-14 px-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-stone-200 shrink-0">
        {/* Left: Document Info & Back */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Close PDF Reader (Esc)"
            aria-label="Close PDF Reader"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2
                id="pdf-reader-title"
                className="text-sm font-semibold text-stone-100 truncate max-w-xs md:max-w-md lg:max-w-lg"
                title={attachment?.title || attachment?.name || 'PDF Document'}
              >
                {attachment?.title || attachment?.name || 'Loading Document...'}
              </h2>
              {attachment && (
                <p className="text-[11px] text-stone-400 truncate">
                  {attachment.pageCount} pages • {(attachment.size / (1024 * 1024)).toFixed(1)} MB
                  {attachment.author ? ` • ${attachment.author}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center: Page Controls & Zoom */}
        <div className="hidden sm:flex items-center gap-2 bg-stone-950/80 px-3 py-1 rounded-xl border border-stone-800">
          {/* Page Navigator */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-1">
              <input
                type="number"
                min={1}
                max={docWrapper?.numPages || 1}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) scrollToPage(val);
                }}
                className="w-10 px-1 py-0.5 text-center bg-stone-800 border border-stone-700 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                aria-label="Current Page Number"
              />
              <span className="text-stone-400">/ {docWrapper?.numPages || 1}</span>
            </div>

            <button
              type="button"
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={!docWrapper || currentPage >= docWrapper.numPages}
              className="p-1 rounded hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-4 bg-stone-800 mx-1" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setScale((s) => Math.max(0.5, s - 0.15));
                setFitMode('custom');
              }}
              className="p-1 rounded hover:bg-stone-800 text-stone-300"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-mono text-stone-300 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={() => {
                setScale((s) => Math.min(2.5, s + 0.15));
                setFitMode('custom');
              }}
              className="p-1 rounded hover:bg-stone-800 text-stone-300"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleFitWidth}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                fitMode === 'width' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'hover:bg-stone-800 text-stone-400'
              }`}
              title="Fit Width"
            >
              Fit Width
            </button>

            <button
              type="button"
              onClick={handleFitPage}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                fitMode === 'page' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'hover:bg-stone-800 text-stone-400'
              }`}
              title="Fit Page"
            >
              Fit Page
            </button>
          </div>
        </div>

        {/* Right: Search, Highlights, Literature Note */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search PDF..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-28 sm:w-40 pl-8 pr-12 py-1 bg-stone-950/80 border border-stone-800 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
              aria-label="Search in PDF"
            />
            {searchResults.length > 0 && (
              <div className="absolute right-1 flex items-center text-[10px] text-stone-400 gap-0.5">
                <span>{currentMatchIndex + 1}/{searchResults.length}</span>
                <button
                  type="button"
                  onClick={handlePrevSearchMatch}
                  className="hover:text-white p-0.5"
                  title="Previous match"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSearchMatch}
                  className="hover:text-white p-0.5"
                  title="Next match"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Toggle Annotations Sidebar */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isSidebarOpen
                ? 'bg-amber-500 text-stone-950'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
            }`}
            title="Toggle Highlights Panel"
            aria-label="Toggle Highlights Panel"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Highlights</span>
            <span className="px-1.5 py-0.2 rounded-full bg-stone-950/40 text-[10px] font-bold">
              {annotations.length}
            </span>
          </button>

          {/* Create Reference Note Button */}
          {onCreateLiteratureNote && (
            <button
              type="button"
              onClick={handleCreateLiteratureNote}
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
              title="Create a structured literature note from this document"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reference Note</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body with Canvas Area and Highlights Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PDF Canvas Viewport */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-auto bg-stone-950 p-4 md:p-8 flex flex-col items-center gap-8 relative"
        >
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400 gap-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Rendering PDF pages...</p>
            </div>
          )}

          {loadError && (
            <div className="max-w-md p-6 bg-red-950/50 border border-red-800 rounded-xl text-center text-red-200 my-auto">
              <p className="font-semibold text-sm mb-1">Failed to load document</p>
              <p className="text-xs text-red-300/80 mb-4">{loadError}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-red-900/60 hover:bg-red-800 text-white rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !loadError && docWrapper && (
            <div className="flex flex-col items-center gap-6 w-full pb-16">
              {Array.from({ length: docWrapper.numPages }, (_, idx) => {
                const pageNum = idx + 1;
                const pageAnnotations = annotations.filter((a) => a.page === pageNum);
                const isCurrent = currentPage === pageNum;

                return (
                  <div
                    key={`page-${pageNum}`}
                    ref={(el) => {
                      if (el) pageRefs.current.set(pageNum, el);
                      else pageRefs.current.delete(pageNum);
                    }}
                    data-page-num={pageNum}
                    onMouseUp={(e) => handleMouseUp(pageNum, e)}
                    className={`relative bg-white shadow-2xl rounded-sm transition-shadow select-text ${
                      isCurrent ? 'ring-2 ring-amber-500/50' : ''
                    }`}
                  >
                    {/* Rendered Canvas */}
                    <canvas
                      ref={(el) => {
                        if (el) canvasRefs.current.set(pageNum, el);
                        else canvasRefs.current.delete(pageNum);
                      }}
                      className="block mx-auto pointer-events-none"
                    />

                    {/* Highlights Overlay on Top of Page */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {pageAnnotations.map((ann) => {
                        const isFocused = selectedHighlight?.id === ann.id;
                        const colorObj =
                          HIGHLIGHT_COLORS.find((c) => c.key === ann.color) || HIGHLIGHT_COLORS[0];

                        return (
                          <div key={ann.id} className="relative w-full h-full">
                            {ann.anchor.rects.map((rect, rIdx) => (
                              <div
                                key={`${ann.id}-${rIdx}`}
                                onClick={() => {
                                  setSelectedHighlight(ann);
                                  setIsSidebarOpen(true);
                                }}
                                className={`absolute pointer-events-auto cursor-pointer rounded-xs transition-all ${
                                  isFocused
                                    ? 'ring-2 ring-amber-500 animate-pulse'
                                    : 'hover:opacity-90'
                                }`}
                                style={{
                                  left: `${rect.x * 100}%`,
                                  top: `${rect.y * 100}%`,
                                  width: `${rect.width * 100}%`,
                                  height: `${rect.height * 100}%`,
                                  backgroundColor: colorObj.bg,
                                  borderBottom: `2px solid ${colorObj.border}`,
                                }}
                                title={`Highlight: "${ann.text.slice(0, 50)}..." (Click to inspect)`}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* Page Number Indicator */}
                    <div className="absolute bottom-2 right-3 text-[10px] font-mono text-stone-400/80 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs">
                      Page {pageNum}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Text Selection Popup Menu */}
        {selectionPopup && (
          <div
            className="fixed z-50 bg-stone-900 text-stone-100 p-2 rounded-xl shadow-2xl border border-stone-700 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${Math.min(window.innerWidth - 300, Math.max(16, selectionPopup.x - 140))}px`,
              top: `${Math.max(16, selectionPopup.y)}px`,
            }}
          >
            {/* Color Palette */}
            <div className="flex items-center gap-1 pr-1 border-r border-stone-800">
              {HIGHLIGHT_COLORS.map((col) => (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => handleCreateHighlight(col.key)}
                  className={`w-5 h-5 rounded-full ${col.preview} transition-transform hover:scale-110`}
                  title={`Highlight in ${col.name}`}
                  aria-label={`Highlight in ${col.name}`}
                />
              ))}
            </div>

            {/* Quick Actions */}
            <button
              type="button"
              onClick={() => {
                handleCreateHighlight('yellow');
              }}
              className="flex items-center gap-1 px-2 py-1 hover:bg-stone-800 rounded text-xs text-amber-400 font-medium"
              title="Highlight passage"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Highlight</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (attachment) {
                  const fakeAnn: PDFAnnotation = {
                    id: `temp-${Date.now()}`,
                    pdfId: attachment.id,
                    page: selectionPopup.page,
                    text: selectionPopup.text,
                    color: 'yellow',
                    anchor: { rects: selectionPopup.rects },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  handleCopyCitation(fakeAnn);
                }
                setSelectionPopup(null);
              }}
              className="flex items-center gap-1 px-2 py-1 hover:bg-stone-800 rounded text-xs text-stone-300"
              title="Copy quote & citation to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Cite</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectionPopup(null)}
              className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-white"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Highlights Drawer / Sidebar */}
        {isSidebarOpen && (
          <aside
            className="w-80 md:w-96 bg-stone-900 border-l border-stone-800 flex flex-col z-30 shrink-0 text-stone-200"
            aria-label="PDF Annotations and Highlights"
          >
            {/* Sidebar Header */}
            <div className="p-3 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Highlighter className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-xs">Document Highlights ({annotations.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleExtractAllHighlights}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-medium flex items-center gap-1"
                  title="Extract all highlights to note or clipboard"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Extract All</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-white"
                  title="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of Highlights */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {annotations.length === 0 ? (
                <div className="text-center py-12 px-4 text-stone-400 text-xs">
                  <Highlighter className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
                  <p className="font-medium text-stone-300 mb-1">No highlights yet</p>
                  <p className="text-stone-500">
                    Select text on any PDF page to create a persistent highlight, marginal note, or citation.
                  </p>
                </div>
              ) : (
                annotations.map((ann) => {
                  const isSelected = selectedHighlight?.id === ann.id;
                  const colorObj =
                    HIGHLIGHT_COLORS.find((c) => c.key === ann.color) || HIGHLIGHT_COLORS[0];

                  return (
                    <div
                      key={ann.id}
                      onClick={() => {
                        setSelectedHighlight(ann);
                        scrollToPage(ann.page);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-stone-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {/* Header info */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${colorObj.preview}`}
                            title={`Color: ${colorObj.name}`}
                          />
                          <span className="font-bold text-amber-400">Page {ann.page}</span>
                        </div>
                        <span className="text-[10px] text-stone-500">
                          {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Quoted Text */}
                      <blockquote className="italic text-stone-300 border-l-2 border-stone-700 pl-2 my-1.5 leading-relaxed line-clamp-4">
                        "{ann.text}"
                      </blockquote>

                      {/* Note / Marginalia */}
                      {ann.note && (
                        <div className="mt-2 p-2 bg-amber-950/40 border border-amber-900/50 rounded-lg text-amber-200 text-[11px] flex items-start gap-1.5">
                          <MessageSquare className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          <span className="flex-1">{ann.note}</span>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="mt-2.5 pt-2 border-t border-stone-800 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCitation(ann);
                            }}
                            className="p-1 hover:bg-stone-700 rounded text-stone-400 hover:text-white flex items-center gap-1 text-[10px]"
                            title="Copy Markdown Citation"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddHighlightToActiveNote(ann);
                            }}
                            className="p-1 hover:bg-amber-900/60 rounded text-amber-400 flex items-center gap-1 text-[10px]"
                            title="Add quote to currently active note"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add to Note</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHighlight(ann.id);
                          }}
                          className="p-1 hover:bg-red-950/60 rounded text-stone-500 hover:text-red-400"
                          title="Delete highlight"
                          aria-label="Delete highlight"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Bottom: Active Note Target Status */}
            {activeNote && (
              <div className="p-3 bg-stone-950 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                <div className="truncate">
                  <span className="text-stone-500">Target Note: </span>
                  <span className="font-semibold text-stone-200">{activeNote.title}</span>
                </div>
                <button
                  type="button"
                  onClick={handleExtractAllHighlights}
                  className="text-amber-400 hover:underline shrink-0 ml-2"
                >
                  Send all
                </button>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-stone-100 px-4 py-2 rounded-xl text-xs font-medium shadow-2xl border border-stone-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
