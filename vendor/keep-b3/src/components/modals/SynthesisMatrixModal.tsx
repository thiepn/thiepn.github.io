import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Scale,
  Columns,
  Split,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  FileText,
  Link2,
  Tag,
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Sliders,
  Quote,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  SynthesisTemplateType,
  getSharedTags,
  getSharedWikilinks,
  formatQuoteSnippet,
  generateComparativeOutline,
} from '../../pkm/matrix/synthesisMatrixTypes';
import { fireConfetti } from '../../utils/confetti';
import { soundscapeService } from '../../utils/soundscapes';

export interface SynthesisMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  initialNoteIds?: string[];
  onCreateSynthesisNote: (title: string, content: string, tags?: string[]) => Promise<void> | void;
  onOpenNote?: (noteId: string) => void;
}

export const SynthesisMatrixModal: React.FC<SynthesisMatrixModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  initialNoteIds = [],
  onCreateSynthesisNote,
  onOpenNote,
}) => {
  // Columns state (2 to 4 columns)
  const [columnCount, setColumnCount] = useState<2 | 3 | 4>(2);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(() => {
    const active = notes.filter((n) => !n.trashed);
    if (initialNoteIds.length >= 2) return initialNoteIds.slice(0, 4);
    if (active.length >= 2) return [active[0].id, active[1].id];
    if (active.length === 1) return [active[0].id, active[0].id];
    return ['', ''];
  });

  // Synchronized scrolling
  const [isSyncScroll, setIsSyncScroll] = useState<boolean>(false);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Synthesis Note Editor State
  const [showSynthesisPanel, setShowSynthesisPanel] = useState<boolean>(true);
  const [synthesisTitle, setSynthesisTitle] = useState<string>('Unified Synthesis & Comparative Matrix');
  const [synthesisContent, setSynthesisContent] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<SynthesisTemplateType>('synthesis');
  const [copiedState, setCopiedState] = useState(false);

  // Active notes being compared
  const comparedNotes = useMemo(() => {
    return selectedNoteIds
      .map((id) => notes.find((n) => n.id === id))
      .filter((n): n is Note => Boolean(n));
  }, [selectedNoteIds, notes]);

  // Shared tags and wikilinks
  const sharedTags = useMemo(() => getSharedTags(comparedNotes), [comparedNotes]);
  const sharedLinks = useMemo(() => getSharedWikilinks(comparedNotes), [comparedNotes]);

  // Initialize synthesis content when notes or template change
  useEffect(() => {
    if (comparedNotes.length >= 2 && !synthesisContent.trim()) {
      setSynthesisContent(generateComparativeOutline(comparedNotes, selectedTemplate));
    }
  }, [comparedNotes, selectedTemplate]);

  // Apply template
  const handleApplyTemplate = (tpl: SynthesisTemplateType) => {
    setSelectedTemplate(tpl);
    setSynthesisContent(generateComparativeOutline(comparedNotes, tpl));
  };

  // Adjust column count
  const handleSetColumnCount = (count: 2 | 3 | 4) => {
    setColumnCount(count);
    setSelectedNoteIds((prev) => {
      const active = notes.filter((n) => !n.trashed);
      const next = [...prev];
      while (next.length < count) {
        const unused = active.find((n) => !next.includes(n.id)) || active[0];
        next.push(unused ? unused.id : '');
      }
      return next.slice(0, count);
    });
  };

  // Select note for column
  const handleSelectNoteForColumn = (index: number, noteId: string) => {
    setSelectedNoteIds((prev) => {
      const copy = [...prev];
      copy[index] = noteId;
      return copy;
    });
  };

  // Synchronized Scroll Handler
  const handleColumnScroll = (scrolledIndex: number) => {
    if (!isSyncScroll) return;
    const sourceEl = columnRefs.current[scrolledIndex];
    if (!sourceEl) return;

    const scrollRatio =
      sourceEl.scrollTop / Math.max(1, sourceEl.scrollHeight - sourceEl.clientHeight);

    columnRefs.current.forEach((el, idx) => {
      if (idx !== scrolledIndex && el) {
        el.scrollTop = scrollRatio * (el.scrollHeight - el.clientHeight);
      }
    });
  };

  // Quote text to synthesis editor
  const handleQuoteSelection = (noteTitle: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.toString().trim()) return;
    const text = sel.toString().trim();
    const snippet = formatQuoteSnippet(noteTitle, text);

    setSynthesisContent((prev) => `${prev}\n${snippet}`);
    fireConfetti();
    soundscapeService.playCompletionChime();
  };

  // Save Synthesis Note
  const handleSaveSynthesis = async () => {
    if (!synthesisTitle.trim() || !synthesisContent.trim()) return;
    const tags = Array.from(new Set(['synthesis', 'comparison', ...sharedTags]));
    await onCreateSynthesisNote(synthesisTitle.trim(), synthesisContent.trim(), tags);
    fireConfetti();
    soundscapeService.playCompletionChime();
    onClose();
  };

  // Copy Markdown
  const handleCopy = async () => {
    if (!synthesisContent) return;
    try {
      await navigator.clipboard.writeText(synthesisContent);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Multi-Note Parallel Comparison & Synthesis Matrix (P4)"
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Parallel Comparison & Synthesis Matrix
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                  Tool P4
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Cross-examine multiple documents side-by-side and extract emergent insights into a unified synthesis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Column Count Switcher */}
            <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-semibold">
              {([2, 3, 4] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => handleSetColumnCount(cnt)}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    columnCount === cnt
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {cnt} Panes
                </button>
              ))}
            </div>

            {/* Sync Scroll Toggle */}
            <button
              type="button"
              onClick={() => setIsSyncScroll(!isSyncScroll)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                isSyncScroll
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
              title="Synchronize vertical scrolling across all panes"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Sync Scroll</span>
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

        {/* Commonality & Shared Links Banner */}
        {(sharedTags.length > 0 || sharedLinks.length > 0) && (
          <div className="px-6 py-2.5 bg-stone-100/70 dark:bg-stone-950/70 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                <span>Cross-Note Overlaps:</span>
              </span>

              {sharedTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-stone-400">Shared Tags:</span>
                  {sharedTags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {sharedLinks.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-stone-400">Co-Referenced:</span>
                  {sharedLinks.map((l) => (
                    <span
                      key={l}
                      className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"
                    >
                      [[{l}]]
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[11px] text-stone-400 font-mono">
              Highlight text & click "Quote" to synthesize
            </div>
          </div>
        )}

        {/* Main Body: Parallel Columns & Synthesis Drawer */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
          {/* Left / Center: Side-by-side reading panes */}
          <div
            className={`flex-1 overflow-hidden grid gap-2 p-3 bg-stone-100/40 dark:bg-stone-950/20`}
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columnCount }).map((_, colIdx) => {
              const activeNoteId = selectedNoteIds[colIdx] || '';
              const note = notes.find((n) => n.id === activeNoteId);

              return (
                <div
                  key={`col-${colIdx}`}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex flex-col overflow-hidden shadow-2xs"
                >
                  {/* Column Header & Note Selector */}
                  <div className="p-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 flex items-center justify-between gap-2 shrink-0">
                    <select
                      value={activeNoteId}
                      onChange={(e) => handleSelectNoteForColumn(colIdx, e.target.value)}
                      className="w-full text-xs font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 truncate text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">(Select a note...)</option>
                      {notes
                        .filter((n) => !n.trashed)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.title || 'Untitled Note'}
                          </option>
                        ))}
                    </select>

                    {note && (
                      <button
                        type="button"
                        onClick={() => handleQuoteSelection(note.title)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-600 hover:bg-teal-500 text-white shrink-0 shadow-2xs flex items-center gap-1"
                        title="Quote highlighted text to synthesis draft"
                      >
                        <Quote className="w-3 h-3" />
                        <span>Quote</span>
                      </button>
                    )}
                  </div>

                  {/* Column Text Content */}
                  <div
                    ref={(el) => {
                      columnRefs.current[colIdx] = el;
                    }}
                    onScroll={() => handleColumnScroll(colIdx)}
                    className="flex-1 overflow-y-auto p-4 text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-sans select-text whitespace-pre-wrap"
                  >
                    {note ? (
                      note.content || <span className="text-stone-400 italic">(Empty note)</span>
                    ) : (
                      <div className="h-full flex items-center justify-center text-center text-stone-400 p-4">
                        Select a note from the dropdown above to populate this comparison pane.
                      </div>
                    )}
                  </div>

                  {/* Column Footer */}
                  {note && (
                    <div className="px-3 py-1.5 border-t border-stone-100 dark:border-stone-800 text-[10px] text-stone-400 flex items-center justify-between bg-stone-50/50 dark:bg-stone-950/30 shrink-0">
                      <span>{(note.content || '').split(/\s+/).filter(Boolean).length} words</span>
                      <span>{(note.tags || []).length} tags</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right / Bottom: Live Synthesis Draft Studio */}
          <div
            className={`border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-800 flex flex-col bg-white dark:bg-stone-900 transition-all ${
              showSynthesisPanel ? 'w-full lg:w-[420px]' : 'h-10 lg:w-12 lg:h-auto'
            }`}
          >
            {/* Synthesis Panel Header */}
            <div className="p-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                  Synthesis Studio
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800"
                  title="Copy markdown synthesis"
                >
                  {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSynthesisPanel(!showSynthesisPanel)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800"
                  title="Toggle synthesis pane"
                >
                  {showSynthesisPanel ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {showSynthesisPanel && (
              <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto">
                {/* Synthesis Template Picker */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Synthesis Template
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { id: 'synthesis', label: '💡 Integrated' },
                      { id: 'tradeoff', label: '⚖️ Trade-off' },
                      { id: 'literature', label: '📚 Literature' },
                      { id: 'consensus', label: '🤝 Consensus' },
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl.id as any)}
                        className={`px-2.5 py-1.5 rounded-xl font-semibold text-left transition-all text-xs ${
                          selectedTemplate === tpl.id
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Synthesis Title */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Synthesis Note Title
                  </label>
                  <input
                    type="text"
                    value={synthesisTitle}
                    onChange={(e) => setSynthesisTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Synthesis Body Editor */}
                <div className="space-y-1 flex-1 flex flex-col min-h-[220px]">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Synthesized Body
                  </label>
                  <textarea
                    rows={12}
                    value={synthesisContent}
                    onChange={(e) => setSynthesisContent(e.target.value)}
                    placeholder="Quotes and synthesis points appear here..."
                    className="w-full flex-1 p-3 text-xs rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-sans leading-relaxed"
                  />
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSynthesis}
                    disabled={!synthesisTitle.trim() || !synthesisContent.trim()}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Synthesis Note to Vault</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-stone-50/70 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded text-[10px] font-mono">Alt + X</kbd>
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
