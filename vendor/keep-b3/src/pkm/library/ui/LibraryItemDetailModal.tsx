import React, { useState, useMemo } from 'react';
import {
  X,
  Book,
  FileText,
  Clock,
  Highlighter,
  RotateCcw,
  CheckCircle2,
  Bookmark,
  Share2,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Copy,
  Check,
  FilePlus,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { LibraryItem, SourceHighlight, ReadingSession, HighlightColor } from '../libraryTypes';
import { libraryService } from '../libraryService';
import { libraryHighlightService } from '../libraryHighlightService';
import { LibraryExportService } from '../libraryExport';

export interface LibraryItemDetailModalProps {
  item: LibraryItem;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: LibraryItem) => void;
  onOpenReader?: (item: LibraryItem) => void;
  onOpenNote?: (noteId: string) => void;
  onCreateNote?: (title: string, content: string, tags?: string[]) => void;
  onDelete: (id: string) => void;
  onItemUpdated: (updatedItem: LibraryItem) => void;
}

export const LibraryItemDetailModal: React.FC<LibraryItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onOpenReader,
  onOpenNote,
  onCreateNote,
  onDelete,
  onItemUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'highlights' | 'sessions' | 'notes'>('overview');
  const [copiedHlId, setCopiedHlId] = useState<string | null>(null);

  // Manual highlight form state
  const [showAddHighlight, setShowAddHighlight] = useState(false);
  const [newHlText, setNewHlText] = useState('');
  const [newHlLocation, setNewHlLocation] = useState('');
  const [newHlAnnotation, setNewHlAnnotation] = useState('');
  const [newHlColor, setNewHlColor] = useState<HighlightColor>('yellow');

  // Manual session form state
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(30);
  const [sessionDate, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionDelta, setSessionDelta] = useState<number | undefined>(item.progress?.mode === 'page' ? 20 : undefined);
  const [sessionNote, setSessionNote] = useState('');

  // Local progress inputs
  const [inputCurrentPage, setInputCurrentPage] = useState<number>(item.progress?.currentPage || 0);

  const highlights = useMemo(() => {
    return libraryHighlightService.getHighlightsForItem(item);
  }, [item, showAddHighlight]);

  const sessions = useMemo(() => {
    return libraryService.getSessions(item.id);
  }, [item, showAddSession]);

  if (!isOpen) return null;

  const authorStr = item.creators.map((c) => c.name).join(', ') || 'Unknown Creator';

  const handleUpdatePageProgress = (newPage: number) => {
    setInputCurrentPage(newPage);
    const { item: updated } = libraryService.updateProgress(item.id, { currentPage: newPage });
    if (updated) onItemUpdated(updated);
  };

  const handleMarkFinished = () => {
    const updated = libraryService.markFinished(item.id);
    if (updated) onItemUpdated(updated);
  };

  const handleReadAgain = () => {
    const updated = libraryService.readAgain(item.id);
    if (updated) onItemUpdated(updated);
  };

  const handleCreateManualHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHlText.trim()) return;

    libraryHighlightService.addHighlight(
      item.id,
      newHlText.trim(),
      item.format === 'epub' ? 'epub' : item.format === 'pdf' ? 'pdf' : 'manual',
      { locationText: newHlLocation.trim() || undefined },
      newHlAnnotation.trim() || undefined,
      newHlColor
    );

    setNewHlText('');
    setNewHlLocation('');
    setNewHlAnnotation('');
    setShowAddHighlight(false);
    onItemUpdated({ ...item });
  };

  const handleLogSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionDuration <= 0) return;

    libraryService.logReadingSession({
      libraryItemId: item.id,
      durationMinutes: sessionDuration,
      date: sessionDate,
      progressDelta: sessionDelta,
      progressUnit: item.progress?.mode === 'page' ? 'pages' : 'minutes',
      note: sessionNote.trim() || undefined,
      courseId: item.relations?.courseIds?.[0],
    });

    const refreshed = libraryService.getItem(item.id);
    if (refreshed) onItemUpdated(refreshed);
    setShowAddSession(false);
    setSessionNote('');
  };

  const handleCopyQuote = (hl: SourceHighlight) => {
    const formatted = libraryHighlightService.formatQuoteWithProvenance(hl, item);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formatted);
      setCopiedHlId(hl.id);
      setTimeout(() => setCopiedHlId(null), 2000);
    }
  };

  const handleCreateCanonicalNote = () => {
    const { title, content } = libraryService.generateNoteTemplate(item);
    if (onCreateNote) {
      onCreateNote(title, content, ['library', item.type, ...(item.metadata?.tags || [])]);
    }
  };

  const handleExtractHighlightToNote = (hl: SourceHighlight) => {
    const { title, content, tags } = libraryHighlightService.generateAtomicNoteFromHighlight(hl, item);
    if (onCreateNote) {
      onCreateNote(title, content, tags);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between bg-stone-50/50 dark:bg-stone-800/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {item.type}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                {item.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">
              {item.title}
            </h2>
            {item.subtitle && (
              <p className="text-xs text-stone-500 italic mt-0.5">{item.subtitle}</p>
            )}
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 mt-1">
              {authorStr}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenReader && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReader(item);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 text-xs font-bold shadow-sm flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              title="Edit Item"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 px-6 bg-white dark:bg-stone-900 gap-6 text-xs font-semibold select-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            Overview & Metadata
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`py-3 border-b-2 ${
              activeTab === 'progress'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            Progress & Cycles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('highlights')}
            className={`py-3 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'highlights'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>Highlights & Quotes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800">
              {highlights.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`py-3 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'sessions'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>Sessions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800">
              {sessions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-3 border-b-2 ${
              activeTab === 'notes'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            Notes & Knowledge
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-stone-50 dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
                <div>
                  <span className="text-stone-400 font-medium">Format:</span>
                  <p className="font-bold text-stone-800 dark:text-stone-200 capitalize mt-0.5">
                    {item.format || 'Physical / Other'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">ISBN / DOI:</span>
                  <p className="font-mono text-stone-800 dark:text-stone-200 mt-0.5">
                    {item.metadata?.isbn || item.metadata?.doi || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">Publisher:</span>
                  <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                    {item.metadata?.publisher || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">Publication Date:</span>
                  <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                    {item.metadata?.publicationDate || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">Source URL:</span>
                  <p className="font-medium text-stone-800 dark:text-stone-200 mt-0.5 line-clamp-1">
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Visit Source</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">Total Pages:</span>
                  <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                    {item.progress?.totalPages ? `${item.progress.totalPages} pages` : '—'}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {item.metadata?.tags && item.metadata.tags.length > 0 && (
                <div>
                  <span className="text-stone-400 font-medium block mb-1.5">Tags:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.metadata.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. PROGRESS & CYCLES TAB */}
          {activeTab === 'progress' && (
            <div className="space-y-5">
              <div className="bg-stone-50 dark:bg-stone-800/40 p-5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Current Consumption Progress
                    </h3>
                    <p className="text-stone-400 text-[11px]">
                      Mode: <span className="font-semibold capitalize">{item.progress?.mode || 'None'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status !== 'finished' ? (
                      <button
                        type="button"
                        onClick={handleMarkFinished}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-stone-900 font-bold text-xs shadow-sm flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Finished</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleReadAgain}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs shadow-sm flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Read Again</span>
                      </button>
                    )}
                  </div>
                </div>

                {item.progress?.mode === 'page' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        max={item.progress.totalPages}
                        value={inputCurrentPage}
                        onChange={(e) => handleUpdatePageProgress(parseInt(e.target.value, 10) || 0)}
                        className="w-24 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-3 py-1.5 font-mono text-stone-900 dark:text-stone-100 font-bold"
                      />
                      <span className="text-stone-500">
                        of {item.progress.totalPages || '—'} pages ({item.progress.percent || 0}%)
                      </span>
                    </div>

                    <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, item.progress.percent || 0))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Consumption Cycles History */}
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs mb-2">
                  Reading & Review Cycles ({item.cycles?.length || 1})
                </h4>
                <div className="space-y-2">
                  {(item.cycles || [item.currentCycle || { id: 'c-1', cycleNumber: 1 }]).map((cycle) => (
                    <div
                      key={cycle.id}
                      className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          Cycle #{cycle.cycleNumber}
                        </span>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          Started: {cycle.startedAt || 'Not recorded'} • Finished:{' '}
                          {cycle.finishedAt || 'In Progress'}
                        </div>
                      </div>
                      {cycle.finishedAt && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Completed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. HIGHLIGHTS & QUOTES TAB */}
          {activeTab === 'highlights' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-stone-500 text-xs">
                  {highlights.length} quotes and excerpts recorded.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddHighlight(!showAddHighlight)}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Add Quote / Highlight</span>
                </button>
              </div>

              {/* Add Highlight Form */}
              {showAddHighlight && (
                <form
                  onSubmit={handleCreateManualHighlight}
                  className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/30 dark:bg-amber-950/20 space-y-3"
                >
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">
                    Add Manual Quote or Excerpt
                  </h4>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter verbatim quote..."
                    value={newHlText}
                    onChange={(e) => setNewHlText(e.target.value)}
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2.5 text-stone-900 dark:text-stone-100"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Locator (e.g. p. 142, Chapter 4)"
                      value={newHlLocation}
                      onChange={(e) => setNewHlLocation(e.target.value)}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-900 dark:text-stone-100"
                    />
                    <input
                      type="text"
                      placeholder="Reflection / Annotation (Optional)"
                      value={newHlAnnotation}
                      onChange={(e) => setNewHlAnnotation(e.target.value)}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddHighlight(false)}
                      className="px-3 py-1 text-stone-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold"
                    >
                      Save Quote
                    </button>
                  </div>
                </form>
              )}

              {/* Highlights List */}
              <div className="space-y-3">
                {highlights.map((hl) => (
                  <div
                    key={hl.id}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2"
                  >
                    <blockquote className="italic text-stone-900 dark:text-stone-100">
                      "{hl.text}"
                    </blockquote>
                    {hl.annotation && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg font-medium">
                        {hl.annotation}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                      <span>{hl.locator.locationText || (hl.locator.page ? `p. ${hl.locator.page}` : 'Excerpt')}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyQuote(hl)}
                          className="hover:text-stone-900 dark:hover:text-white flex items-center gap-1 font-semibold"
                        >
                          {copiedHlId === hl.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedHlId === hl.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExtractHighlightToNote(hl)}
                          className="text-amber-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <FilePlus className="w-3 h-3" />
                          <span>Extract Note</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. SESSIONS TAB */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-stone-500 text-xs">
                  {sessions.length} reading & media sessions logged.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddSession(!showAddSession)}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>Log Session</span>
                </button>
              </div>

              {/* Add Session Form */}
              {showAddSession && (
                <form
                  onSubmit={handleLogSession}
                  className="p-4 rounded-xl border border-sky-300 dark:border-sky-800/80 bg-sky-50/30 dark:bg-sky-950/20 space-y-3"
                >
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">
                    Log Reading / Media Session
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Duration (Minutes)"
                      value={sessionDuration}
                      onChange={(e) => setSessionDuration(parseInt(e.target.value, 10) || 0)}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-900 dark:text-stone-100"
                    />
                    <input
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  {item.progress?.mode === 'page' && (
                    <input
                      type="number"
                      placeholder="Pages read (+pages)"
                      value={sessionDelta || ''}
                      onChange={(e) => setSessionDelta(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-900 dark:text-stone-100"
                    />
                  )}
                  <input
                    type="text"
                    placeholder="Session reflection / notes"
                    value={sessionNote}
                    onChange={(e) => setSessionNote(e.target.value)}
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-900 dark:text-stone-100"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddSession(false)}
                      className="px-3 py-1 text-stone-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold"
                    >
                      Save Session
                    </button>
                  </div>
                </form>
              )}

              {/* Sessions List */}
              <div className="space-y-2">
                {sessions.map((ses) => (
                  <div
                    key={ses.id}
                    className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-stone-800 dark:text-stone-200">
                        {ses.durationMinutes} Minutes{' '}
                        {ses.progressDelta ? `(+${ses.progressDelta} ${ses.progressUnit || 'pages'})` : ''}
                      </div>
                      {ses.note && <p className="text-xs text-stone-500 italic mt-0.5">{ses.note}</p>}
                    </div>
                    <span className="text-[11px] font-mono text-stone-400">{ses.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. NOTES & KNOWLEDGE TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">
                    Canonical Markdown Note
                  </h4>
                  <p className="text-xs text-stone-500">
                    {item.noteId ? 'Linked to existing note in vault.' : 'No note linked yet.'}
                  </p>
                </div>
                {item.noteId && onOpenNote ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNote(item.noteId!);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold"
                  >
                    Open Note
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateCanonicalNote}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold"
                  >
                    Create Note from Template
                  </button>
                )}
              </div>

              {/* Export Highlights Markdown */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">
                    Export Highlights as Markdown
                  </h4>
                  <p className="text-xs text-stone-500">
                    Generates clean, cited Markdown containing all captured quotes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const md = LibraryExportService.exportHighlightsToMarkdown(item);
                    if (onCreateNote) {
                      onCreateNote(`Highlights: ${item.title}`, md, ['highlights', 'reading']);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
                >
                  Create Highlights Note
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Remove "${item.title}" from Library? (Files & Notes will be preserved)`)) {
                onDelete(item.id);
                onClose();
              }
            }}
            className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove from Library</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
