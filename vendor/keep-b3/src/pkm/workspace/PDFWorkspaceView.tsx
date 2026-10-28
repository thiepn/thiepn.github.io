import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
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
  X,
  Upload,
  Link2,
  Info,
  Layers,
} from 'lucide-react';
import { PDFAttachment, PDFAnnotation, PDFHighlightColor, PDFSearchMatch } from '../pdfTypes';
import { pdfStorageService } from '../pdfStorage';
import {
  loadPDFDocument,
  renderPDFPageToCanvas,
  searchInPDF,
  PDFDocumentProxyWrapper,
} from '../pdfEngine';
import {
  formatHighlightCitation,
  exportHighlightsToMarkdown,
  generateLiteratureNoteContent,
} from '../pdfCitation';
import { mediaService } from '../media/mediaService';
import { vaultManager } from '../indexer';
import { Note } from '../../types';
import { useWorkspace } from '../useWorkspace';

export interface PDFWorkspaceViewProps {
  pdfAttachmentId?: string;
  initialPage?: number;
  targetHighlightId?: string;
  onAddHighlightToNote?: (markdownSnippet: string, highlight?: PDFAnnotation) => void;
  onCreateLiteratureNote?: (pdf: PDFAttachment, annotations: PDFAnnotation[]) => void;
  onOpenNote?: (noteId: string) => void;
  onOpenNoteBeside?: (noteId: string) => void;
  activeNote?: Note | null;
  allNotes?: Note[];
}

const HIGHLIGHT_COLORS: Array<{ key: PDFHighlightColor; name: string; bg: string; border: string; preview: string }> = [
  { key: 'yellow', name: 'Yellow', bg: 'rgba(254, 240, 138, 0.45)', border: '#eab308', preview: 'bg-yellow-300' },
  { key: 'green', name: 'Green', bg: 'rgba(187, 247, 208, 0.45)', border: '#22c55e', preview: 'bg-emerald-300' },
  { key: 'blue', name: 'Blue', bg: 'rgba(191, 219, 254, 0.45)', border: '#3b82f6', preview: 'bg-sky-300' },
  { key: 'pink', name: 'Pink', bg: 'rgba(251, 207, 232, 0.45)', border: '#ec4899', preview: 'bg-pink-300' },
  { key: 'purple', name: 'Purple', bg: 'rgba(233, 213, 255, 0.45)', border: '#a855f7', preview: 'bg-purple-300' },
];

export const PDFWorkspaceView: React.FC<PDFWorkspaceViewProps> = ({
  pdfAttachmentId,
  initialPage = 1,
  targetHighlightId,
  onAddHighlightToNote,
  onCreateLiteratureNote,
  onOpenNote,
  onOpenNoteBeside,
  activeNote,
  allNotes = [],
}) => {
  const { openNote } = useWorkspace();

  const [availablePdfs, setAvailablePdfs] = useState<PDFAttachment[]>([]);
  const [selectedPdfId, setSelectedPdfId] = useState<string | undefined>(pdfAttachmentId);
  const [attachment, setAttachment] = useState<PDFAttachment | null>(null);
  const [docWrapper, setDocWrapper] = useState<PDFDocumentProxyWrapper | null>(null);
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.1);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('width');
  const [activeColor, setActiveColor] = useState<PDFHighlightColor>('yellow');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'highlights' | 'references' | 'meta'>('highlights');
  const [selectedHighlight, setSelectedHighlight] = useState<PDFAnnotation | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PDFSearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Canvas and Container Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Referencing notes in the vault
  const pdfReferences = useMemo(() => {
    if (!selectedPdfId || !allNotes || allNotes.length === 0) return [];
    const index = vaultManager.getIndex();
    return mediaService.findAttachmentReferences(
      selectedPdfId,
      attachment?.name || attachment?.title || '',
      allNotes,
      index
    );
  }, [selectedPdfId, attachment, allNotes]);

  // Load all available PDFs from storage
  const reloadPdfs = useCallback(async () => {
    const list = await pdfStorageService.getAllPDFAttachments();
    setAvailablePdfs(list);
    if (!selectedPdfId && list.length > 0) {
      setSelectedPdfId(list[0].id);
    }
  }, [selectedPdfId]);

  useEffect(() => {
    reloadPdfs();
  }, [reloadPdfs]);

  useEffect(() => {
    if (pdfAttachmentId) {
      setSelectedPdfId(pdfAttachmentId);
    }
  }, [pdfAttachmentId]);

  // Load active PDF Document
  useEffect(() => {
    let isCancelled = false;

    async function loadPDF() {
      if (!selectedPdfId) {
        setAttachment(null);
        setDocWrapper(null);
        setAnnotations([]);
        return;
      }

      const pdfRes = await pdfStorageService.getPDFAttachment(selectedPdfId);
      if (isCancelled) return;

      if (!pdfRes) {
        showToast('PDF Document not found');
        return;
      }

      const pdf = pdfRes.attachment;
      setAttachment(pdf);
      const annList = await pdfStorageService.getAnnotationsForPDF(selectedPdfId);
      setAnnotations(annList || []);

      try {
        const loadedDoc = await loadPDFDocument(pdfRes.blob || pdf.dataBlob || new Blob());
        if (isCancelled) return;
        setDocWrapper(loadedDoc);
      } catch (err) {
        console.error('Failed to load PDF document proxy:', err);
        showToast('Could not load PDF document');
      }
    }

    loadPDF();

    return () => {
      isCancelled = true;
    };
  }, [selectedPdfId]);

  // Upload New PDF
  const handleUploadPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type || 'application/pdf' });
      const loaded = await loadPDFDocument(blob);
      const newPdf: PDFAttachment = {
        id: `pdf-${Date.now()}`,
        name: file.name,
        title: file.name.replace(/\.pdf$/i, ''),
        size: file.size,
        pageCount: loaded.numPages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pdfStorageService.savePDFAttachment(newPdf, blob);
      await reloadPdfs();
      setSelectedPdfId(newPdf.id);
      showToast(`Imported ${file.name}`);
    } catch (err) {
      console.error('Failed to upload and parse PDF:', err);
      showToast('Could not import PDF');
    }
    e.target.value = '';
  };

  // Render PDF pages on canvas
  const renderPages = useCallback(async () => {
    if (!docWrapper) return;

    for (let pNum = 1; pNum <= docWrapper.numPages; pNum++) {
      const canvas = canvasRefs.current.get(pNum);
      if (canvas) {
        try {
          await renderPDFPageToCanvas(docWrapper, pNum, canvas, scale);
        } catch (err) {
          console.warn(`Render error on page ${pNum}:`, err);
        }
      }
    }
  }, [docWrapper, scale]);

  useEffect(() => {
    if (docWrapper) {
      renderPages();
    }
  }, [docWrapper, scale, renderPages]);

  // Scroll to page
  const scrollToPage = useCallback((pageNum: number) => {
    const targetEl = pageRefs.current.get(pageNum);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  }, []);

  // Jump to specific highlight when targetHighlightId is passed
  useEffect(() => {
    if (targetHighlightId && annotations.length > 0) {
      const target = annotations.find((a) => a.id === targetHighlightId);
      if (target) {
        setSelectedHighlight(target);
        setIsSidebarOpen(true);
        setSidebarTab('highlights');
        scrollToPage(target.pageNum);
      }
    }
  }, [targetHighlightId, annotations, scrollToPage]);

  // Fit Width calculation
  const handleFitWidth = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 80;
    const standardPageWidth = 612; // Standard letter points
    const calculatedScale = Math.max(0.6, Math.min(2.5, containerWidth / standardPageWidth));
    setScale(calculatedScale);
    setFitMode('width');
  };

  // Fit Page calculation
  const handleFitPage = () => {
    if (!containerRef.current) return;
    const containerHeight = containerRef.current.clientHeight - 100;
    const standardPageHeight = 792;
    const calculatedScale = Math.max(0.5, Math.min(2.0, containerHeight / standardPageHeight));
    setScale(calculatedScale);
    setFitMode('page');
  };

  // Search in PDF
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!docWrapper || !query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const matches = await searchInPDF(docWrapper, query);
    setSearchResults(matches);
    setCurrentMatchIndex(0);
    if (matches.length > 0) {
      scrollToPage(matches[0].pageIndex + 1);
    }
  };

  const handleNextSearchMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchResults.length;
    setCurrentMatchIndex(nextIdx);
    scrollToPage(searchResults[nextIdx].pageIndex + 1);
  };

  const handlePrevSearchMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentMatchIndex(prevIdx);
    scrollToPage(searchResults[prevIdx].pageIndex + 1);
  };

  // Text selection & highlight creation
  const handleMouseUp = (pageNum: number, e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) return;

    const pageEl = pageRefs.current.get(pageNum);
    if (!pageEl) return;

    const pageRect = pageEl.getBoundingClientRect();
    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());

    if (clientRects.length === 0) return;

    const normalizedRects = clientRects.map((r) => ({
      x: (r.left - pageRect.left) / pageRect.width,
      y: (r.top - pageRect.top) / pageRect.height,
      width: r.width / pageRect.width,
      height: r.height / pageRect.height,
    }));

    const newAnnotation: PDFAnnotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pdfId: selectedPdfId || '',
      page: pageNum,
      color: activeColor,
      text: selectedText,
      anchor: {
        rects: normalizedRects,
        textExact: selectedText,
        pageIndex: pageNum - 1,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedAnnotations = [...annotations, newAnnotation];
    setAnnotations(updatedAnnotations);
    setSelectedHighlight(newAnnotation);
    setIsSidebarOpen(true);

    // Save to storage
    if (selectedPdfId) {
      pdfStorageService.savePDFAnnotation(newAnnotation);
    }

    selection.removeAllRanges();
    showToast('Saved Highlight');
  };

  // Create Dedicated Literature Note
  const handleCreateLiteratureNote = () => {
    if (!attachment) return;
    if (onCreateLiteratureNote) {
      onCreateLiteratureNote(attachment, annotations);
    } else {
      const literatureNote = generateLiteratureNoteContent(attachment, annotations);
      showToast(`Created Literature Note for "${attachment.title || attachment.name}"`);
    }
  };

  if (availablePdfs.length === 0 && !attachment) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-stone-50 dark:bg-stone-900/60">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-800/60 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 shadow-xs">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-1">
          No PDF Documents in Vault
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mb-6 leading-relaxed">
          Import academic papers, books, or documentation PDFs directly into your vault for spatial highlighting and literature notes.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Upload className="w-4 h-4" /> Import PDF Document
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleUploadPDF}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-stone-900 text-stone-200 select-none">
      {/* Top Header Bar */}
      <header className="h-12 px-3 sm:px-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-2 shrink-0">
        {/* Left: Document Picker & Info */}
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="relative">
            <select
              value={selectedPdfId || ''}
              onChange={(e) => setSelectedPdfId(e.target.value)}
              className="bg-stone-800 text-xs font-semibold text-stone-100 rounded-lg px-2.5 py-1 border border-stone-700 focus:outline-hidden max-w-[180px] sm:max-w-[260px] truncate"
            >
              {availablePdfs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Import Another PDF"
            aria-label="Import PDF"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleUploadPDF}
            className="hidden"
          />
        </div>

        {/* Center: Page Controls & Zoom */}
        <div className="hidden md:flex items-center gap-2 bg-stone-950/80 px-2.5 py-0.5 rounded-xl border border-stone-800">
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-stone-800 disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono px-1">
              {currentPage} / {docWrapper?.numPages || 1}
            </span>
            <button
              type="button"
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={!docWrapper || currentPage >= docWrapper.numPages}
              className="p-1 rounded hover:bg-stone-800 disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-3.5 bg-stone-800 mx-0.5" />

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
              className="p-1 rounded hover:bg-stone-800 text-stone-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-stone-300 w-9 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              className="p-1 rounded hover:bg-stone-800 text-stone-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitWidth}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                fitMode === 'width' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-stone-400 hover:bg-stone-800'
              }`}
            >
              Fit
            </button>
          </div>
        </div>

        {/* Right: Highlighter Color, Search & Literature Note */}
        <div className="flex items-center gap-1.5">
          {/* Highlight Color Picker */}
          <div className="flex items-center gap-1 bg-stone-950/80 p-1 rounded-xl border border-stone-800">
            {HIGHLIGHT_COLORS.map((hc) => (
              <button
                key={hc.key}
                type="button"
                onClick={() => setActiveColor(hc.key)}
                className={`w-4 h-4 rounded-full ${hc.preview} transition-transform ${
                  activeColor === hc.key ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                }`}
                title={`Highlight in ${hc.name}`}
              />
            ))}
          </div>

          {/* Literature Note Creator */}
          <button
            type="button"
            onClick={handleCreateLiteratureNote}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors shrink-0"
            title="Generate Literature Note in Vault"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Literature Note</span>
          </button>

          {/* Toggle Sidebar */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isSidebarOpen ? 'bg-stone-800 text-white' : 'text-stone-400 hover:bg-stone-800'
            }`}
            title="Toggle Annotations Sidebar"
          >
            <Sidebar className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Scrollable PDF Pages View */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center gap-6 bg-stone-950/90"
        >
          {docWrapper ? (
            Array.from({ length: docWrapper.numPages }, (_, idx) => idx + 1).map((pageNum) => {
              const pageAnnotations = annotations.filter((a) => a.pageNum === pageNum);
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
                  className={`relative bg-white shadow-2xl rounded-xs transition-shadow select-text ${
                    isCurrent ? 'ring-2 ring-amber-500/50' : ''
                  }`}
                >
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current.set(pageNum, el);
                      else canvasRefs.current.delete(pageNum);
                    }}
                    className="block mx-auto pointer-events-none"
                  />

                  {/* Highlights Overlay */}
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
                                isFocused ? 'ring-2 ring-amber-500 animate-pulse' : 'hover:opacity-90'
                              }`}
                              style={{
                                left: `${rect.x * 100}%`,
                                top: `${rect.y * 100}%`,
                                width: `${rect.width * 100}%`,
                                height: `${rect.height * 100}%`,
                                backgroundColor: colorObj.bg,
                                borderBottom: `2px solid ${colorObj.border}`,
                              }}
                              title={`Highlight: "${ann.text.slice(0, 50)}..."`}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  <div className="absolute bottom-2 right-3 text-[10px] font-mono text-stone-400/80 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs">
                    Page {pageNum}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-24 text-center text-stone-400 text-xs">Loading PDF pages...</div>
          )}
        </div>

        {/* Right Annotations & Highlights Sidebar */}
        {isSidebarOpen && (
          <aside className="w-72 sm:w-84 bg-stone-900 border-l border-stone-800 flex flex-col shrink-0">
            {/* Sidebar Tab Header */}
            <div className="p-2 border-b border-stone-800 flex items-center justify-between gap-1 bg-stone-950/40">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSidebarTab('highlights')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    sidebarTab === 'highlights'
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span>Highlights ({annotations.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarTab('references')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    sidebarTab === 'references'
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Referenced ({pdfReferences.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarTab('meta')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    sidebarTab === 'meta'
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                  title="Document Metadata & Research"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Info</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded"
                title="Close Sidebar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tab: Highlights */}
            {sidebarTab === 'highlights' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {annotations.length === 0 ? (
                  <div className="py-12 text-center text-stone-500 text-xs">
                    Select any text in the PDF to create an instant highlight & citation.
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
                          scrollToPage(ann.pageNum);
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-800 border-amber-500/80 shadow-md'
                            : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${colorObj.preview}`} />
                            Page {ann.pageNum}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = annotations.filter((a) => a.id !== ann.id);
                              setAnnotations(updated);
                              if (selectedPdfId) {
                                pdfStorageService.deletePDFAnnotation(ann.id);
                              }
                            }}
                            className="text-stone-500 hover:text-red-400 p-0.5"
                            title="Delete highlight"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <p className="text-xs text-stone-200 line-clamp-3 italic leading-relaxed">
                          "{ann.text}"
                        </p>

                        <div className="mt-2 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (attachment) {
                                const citation = formatHighlightCitation(ann, attachment);
                                navigator.clipboard.writeText(citation);
                                showToast('Copied Citation to Clipboard');
                              }
                            }}
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>

                          {onAddHighlightToNote && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (attachment) {
                                  const citation = formatHighlightCitation(ann, attachment);
                                  onAddHighlightToNote(citation, ann);
                                  showToast('Added highlight to active note');
                                }
                              }}
                              className="text-stone-300 hover:text-white flex items-center gap-1 font-medium bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded"
                            >
                              <Plus className="w-3 h-3 text-amber-400" /> Insert in Note
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab: References */}
            {sidebarTab === 'references' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                <div className="text-[11px] text-stone-400 font-medium px-1">
                  Vault notes citing this document:
                </div>
                {pdfReferences.length === 0 ? (
                  <div className="py-12 text-center text-stone-500 text-xs">
                    No notes currently reference or cite this PDF. Copy a citation or highlight to reference it.
                  </div>
                ) : (
                  pdfReferences.map((ref) => (
                    <div
                      key={ref.noteId}
                      className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/60 hover:border-stone-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-stone-200 truncate flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {ref.noteTitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 line-clamp-2 italic mb-2 bg-stone-900/80 p-1.5 rounded">
                        {ref.snippet}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenNote) onOpenNote(ref.noteId);
                            else openNote(ref.noteId);
                          }}
                          className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-medium flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Open
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenNoteBeside) onOpenNoteBeside(ref.noteId);
                            else openNote(ref.noteId, ref.noteTitle, { split: true });
                          }}
                          className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded font-medium flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Open Beside
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Meta & Literature Notes */}
            {sidebarTab === 'meta' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
                {attachment ? (
                  <>
                    <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800 space-y-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Title</span>
                        <div className="text-stone-200 font-semibold">{attachment.title || attachment.name}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-stone-800/80">
                        <div>
                          <span className="text-stone-500">Pages</span>
                          <div className="text-stone-300 font-medium">{attachment.pageCount || docWrapper?.numPages || 1}</div>
                        </div>
                        <div>
                          <span className="text-stone-500">Size</span>
                          <div className="text-stone-300 font-medium">{Math.round((attachment.size || 0) / 1024)} KB</div>
                        </div>
                      </div>
                      {attachment.metadata && (
                        <div className="space-y-1 pt-1 border-t border-stone-800/80 text-[11px]">
                          {attachment.metadata.authors && (
                            <div>
                              <span className="text-stone-500">Authors: </span>
                              <span className="text-stone-300">{attachment.metadata.authors.join(', ')}</span>
                            </div>
                          )}
                          {attachment.metadata.year && (
                            <div>
                              <span className="text-stone-500">Year: </span>
                              <span className="text-stone-300">{attachment.metadata.year}</span>
                            </div>
                          )}
                          {attachment.metadata.doi && (
                            <div>
                              <span className="text-stone-500">DOI: </span>
                              <span className="text-amber-400 font-mono text-[10px]">{attachment.metadata.doi}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onCreateLiteratureNote && attachment) {
                            onCreateLiteratureNote(attachment, annotations);
                            showToast('Created Literature Note');
                          } else if (attachment) {
                            const litContent = generateLiteratureNoteContent(attachment, annotations);
                            navigator.clipboard.writeText(litContent);
                            showToast('Copied Literature Note Markdown');
                          }
                        }}
                        className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Create Literature Note</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (attachment) {
                            const md = exportHighlightsToMarkdown(annotations, attachment);
                            navigator.clipboard.writeText(md);
                            showToast('Copied All Highlights to Markdown');
                          }
                        }}
                        className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-stone-700"
                      >
                        <Copy className="w-4 h-4 text-amber-400" />
                        <span>Export Highlights ({annotations.length})</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-stone-500 py-8 text-center">No document metadata available</div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="absolute bottom-4 right-4 bg-amber-500 text-stone-950 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg animate-fade-in z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
