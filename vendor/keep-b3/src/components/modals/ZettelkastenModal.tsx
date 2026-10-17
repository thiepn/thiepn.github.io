import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Boxes,
  Scissors,
  FileText,
  Search,
  Plus,
  ArrowRight,
  Sparkles,
  Link2,
  ExternalLink,
  Tag,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  BookOpen,
  Split,
  FolderTree,
  GitBranch,
  RefreshCw,
  Compass,
  Layers,
  ChevronRight,
  Hash,
  Eye,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  ZettelType,
  generateZettelId,
  classifyNote,
  findRelatedZettels,
  findOrphanZettels,
} from '../../pkm/zettelkasten/zettelTypes';
import { fireConfetti } from '../../utils/confetti';

export interface ZettelkastenModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  initialSourceNote?: Note | null;
  onCreateAtomicNote: (
    title: string,
    content: string,
    tags: string[],
    sourceNoteId?: string,
    updatedSourceContent?: string
  ) => Promise<void> | void;
  onOpenNote?: (noteId: string) => void;
}

type StudioTab = 'extract' | 'slipbox' | 'hierarchy' | 'orphans';

export const ZettelkastenModal: React.FC<ZettelkastenModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  initialSourceNote,
  onCreateAtomicNote,
  onOpenNote,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('extract');

  // Source Note Selection
  const [selectedSourceNoteId, setSelectedSourceNoteId] = useState<string>(() => {
    if (initialSourceNote) return initialSourceNote.id;
    const firstActive = notes.find((n) => !n.trashed);
    return firstActive ? firstActive.id : '';
  });
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');

  const currentSourceNote = useMemo(() => {
    return notes.find((n) => n.id === selectedSourceNoteId);
  }, [notes, selectedSourceNoteId]);

  // Text selection in source note
  const [selectedText, setSelectedText] = useState('');
  const sourceTextRef = useRef<HTMLDivElement>(null);

  // Atomic Zettel Composer State
  const [zettelType, setZettelType] = useState<ZettelType>('permanent');
  const [zettelId, setZettelId] = useState<string>(() => generateZettelId());
  const [zettelTitle, setZettelTitle] = useState('');
  const [zettelContent, setZettelContent] = useState('');
  const [zettelTags, setZettelTags] = useState<string[]>(['zettel', 'permanent']);
  const [tagInput, setTagInput] = useState('');
  const [replaceInSource, setReplaceInSource] = useState(true);
  const [createdSuccessTitle, setCreatedSuccessTitle] = useState<string | null>(null);

  // Slip-box Explorer filter
  const [slipboxFilter, setSlipboxFilter] = useState<'all' | ZettelType>('all');
  const [slipboxSearch, setSlipboxSearch] = useState('');

  // When source note changes or opens, set default
  useEffect(() => {
    if (initialSourceNote) {
      setSelectedSourceNoteId(initialSourceNote.id);
    }
  }, [initialSourceNote]);

  // Capture mouseup / text selection in source text
  const handleSourceMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
    }
  };

  // Populate composer from highlighted text
  const handleExtractSelection = (textToExtract = selectedText) => {
    if (!textToExtract.trim()) return;

    // Generate a title proposal: first 5-8 words or up to 60 chars
    const firstLine = textToExtract.split('\n')[0].trim().replace(/^#+\s*/, '');
    const proposedTitle =
      firstLine.length > 55
        ? `${firstLine.slice(0, 50).trim()}...`
        : firstLine || 'Atomic Concept';

    setZettelTitle(proposedTitle);

    // Build canonical atomic zettel content
    const sourceRef = currentSourceNote ? `\n\n---\n**Origin:** [[${currentSourceNote.title}]]` : '';
    setZettelContent(`${textToExtract.trim()}${sourceRef}`);
    setZettelId(generateZettelId());

    if (zettelType === 'permanent') {
      setZettelTags(['zettel', 'permanent']);
    }
  };

  // Related Zettels suggestions for the composer
  const relatedZettels = useMemo(() => {
    if (!zettelContent && !zettelTitle) return [];
    const keywords = (zettelTitle + ' ' + zettelContent).split(/\s+/).slice(0, 10);
    return findRelatedZettels(selectedSourceNoteId, notes, zettelTags, keywords);
  }, [selectedSourceNoteId, notes, zettelTags, zettelTitle, zettelContent]);

  // Word count & atomicity check
  const wordCount = useMemo(() => {
    if (!zettelContent) return 0;
    return zettelContent.trim().split(/\s+/).filter(Boolean).length;
  }, [zettelContent]);

  const atomicityStatus = useMemo(() => {
    if (wordCount === 0) return { label: 'Empty', color: 'text-stone-400' };
    if (wordCount <= 180) return { label: '💎 Perfectly Atomic (< 180 words)', color: 'text-emerald-500' };
    if (wordCount <= 300) return { label: '⚠️ Moderate Length (180-300 words)', color: 'text-amber-500' };
    return { label: '🚨 Too Broad (> 300 words) — Split further', color: 'text-rose-500' };
  }, [wordCount]);

  // Submit Atomic Note
  const handleCreateZettel = async () => {
    if (!zettelTitle.trim() || !zettelContent.trim()) return;

    let updatedSource: string | undefined = undefined;

    // If replaceInSource is checked and we have selectedText in the source note
    if (replaceInSource && selectedText && currentSourceNote) {
      if (currentSourceNote.content.includes(selectedText)) {
        updatedSource = currentSourceNote.content.replace(
          selectedText,
          `[[${zettelTitle.trim()}]]`
        );
      }
    }

    const finalTags = Array.from(new Set([...zettelTags, zettelType]));
    const finalContent = `# ${zettelTitle.trim()}\n\n${zettelContent.trim()}`;

    await onCreateAtomicNote(
      zettelTitle.trim(),
      finalContent,
      finalTags,
      currentSourceNote?.id,
      updatedSource
    );

    fireConfetti();
    setCreatedSuccessTitle(zettelTitle.trim());
    setTimeout(() => setCreatedSuccessTitle(null), 3000);

    // Reset composer
    setSelectedText('');
    setZettelTitle('');
    setZettelContent('');
    setZettelId(generateZettelId());
  };

  // Classified Vault Notes
  const classifiedNotes = useMemo(() => {
    return notes
      .filter((n) => !n.trashed)
      .map((n) => ({
        note: n,
        zettelType: classifyNote(n),
      }));
  }, [notes]);

  // Orphan Notes
  const orphanNotes = useMemo(() => {
    return findOrphanZettels(notes);
  }, [notes]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zettelkasten Atomic Slip-Box & Concept Extraction Studio (P2)"
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Zettelkasten Atomic Slip-Box Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Tool P2
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Decompose source literature into autonomous atomic ideas linked in a permanent slip-box web
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-stone-100/60 dark:bg-stone-950/40 border-b border-stone-200 dark:border-stone-800 text-xs shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('extract')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'extract'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Atomic Extraction Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('slipbox')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'slipbox'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Slip-Box Explorer ({classifiedNotes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orphans')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'orphans'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Orphan Resurfacing ({orphanNotes.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-500 font-mono">
            <span>Shortcut: Alt + Z</span>
          </div>
        </div>

        {/* Tab 1: Atomic Extraction Studio */}
        {activeTab === 'extract' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-[480px]">
            {/* Left Pane: Source Note Viewer */}
            <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 flex flex-col min-h-0 bg-stone-50/40 dark:bg-stone-950/20">
              {/* Source Note Selector */}
              <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <select
                    value={selectedSourceNoteId}
                    onChange={(e) => {
                      setSelectedSourceNoteId(e.target.value);
                      setSelectedText('');
                    }}
                    className="w-full text-xs font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-2.5 py-1.5 truncate text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  >
                    {notes
                      .filter((n) => !n.trashed)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.title || 'Untitled Note'}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Source Text Reading & Highlighting Area */}
              <div
                ref={sourceTextRef}
                onMouseUp={handleSourceMouseUp}
                className="flex-1 overflow-y-auto p-5 text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-sans select-text whitespace-pre-wrap"
              >
                {currentSourceNote ? (
                  currentSourceNote.content || '(This note has no text content)'
                ) : (
                  <p className="text-stone-400 italic">Select a source note to begin atomic extraction.</p>
                )}
              </div>

              {/* Source Footer with Highlight Action Prompt */}
              <div className="p-3 bg-stone-100/70 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500">
                    {selectedText
                      ? `Selected: ${selectedText.length} chars (${selectedText.split(/\s+/).length} words)`
                      : 'Highlight any text to extract'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!selectedText.trim()}
                  onClick={() => handleExtractSelection()}
                  className="px-3 py-1.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Extract to Zettel</span>
                </button>
              </div>
            </div>

            {/* Right Pane: Atomic Zettel Composer */}
            <div className="w-full md:w-1/2 flex flex-col min-h-0 bg-white dark:bg-stone-900 p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Atomic Zettel Composer</span>
                  </span>
                  <span className="font-mono text-[10px] bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md text-stone-500 border border-stone-200 dark:border-stone-700">
                    ID: {zettelId}
                  </span>
                </div>

                {/* Zettel Type Selector */}
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700">
                  {(['permanent', 'literature', 'fleeting'] as ZettelType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setZettelType(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                        zettelType === t
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Concept Title (Clear & Distinct)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cognitive Load Theory in Note Retrieval"
                  value={zettelTitle}
                  onChange={(e) => setZettelTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Content Editor */}
              <div className="space-y-1 flex-1 flex flex-col min-h-[160px]">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-bold text-stone-500 uppercase tracking-wider">
                    Autonomous Note Body
                  </label>
                  <span className={`font-medium ${atomicityStatus.color}`}>
                    {atomicityStatus.label}
                  </span>
                </div>
                <textarea
                  rows={8}
                  placeholder="Write the core idea in your own words. It should be autonomous and make sense completely without context."
                  value={zettelContent}
                  onChange={(e) => setZettelContent(e.target.value)}
                  className="w-full flex-1 p-3 text-xs rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed"
                />
              </div>

              {/* Related Note Links Suggestion Chips */}
              {relatedZettels.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Suggested Connections in Vault:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedZettels.map((rn) => (
                      <button
                        key={rn.id}
                        type="button"
                        onClick={() => {
                          setZettelContent((prev) => `${prev}\n\nRelated: [[${rn.title}]]`);
                        }}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-700 dark:text-stone-300 hover:text-amber-700 transition-colors border border-stone-200 dark:border-stone-700"
                        title={`Click to link [[${rn.title}]]`}
                      >
                        + [[{rn.title}]]
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Replace in source checkbox & Create button */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 dark:text-stone-400">
                  <input
                    type="checkbox"
                    checked={replaceInSource}
                    onChange={(e) => setReplaceInSource(e.target.checked)}
                    className="rounded accent-amber-600"
                  />
                  <span>Replace selected text in source with `[[link]]`</span>
                </label>

                <div className="flex items-center gap-2">
                  {createdSuccessTitle && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Created!
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!zettelTitle.trim() || !zettelContent.trim()}
                    onClick={handleCreateZettel}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save to Slip-Box</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Slip-Box Explorer */}
        {activeTab === 'slipbox' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {(['all', 'permanent', 'literature', 'fleeting', 'structure'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSlipboxFilter(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      slipboxFilter === type
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {type === 'all' ? `All (${classifiedNotes.length})` : type}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter slip-box..."
                  value={slipboxSearch}
                  onChange={(e) => setSlipboxSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Note Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
              {classifiedNotes
                .filter(({ note, zettelType }) => {
                  if (slipboxFilter !== 'all' && zettelType !== slipboxFilter) return false;
                  if (!slipboxSearch.trim()) return true;
                  const q = slipboxSearch.toLowerCase();
                  return (
                    note.title.toLowerCase().includes(q) ||
                    (note.content || '').toLowerCase().includes(q)
                  );
                })
                .map(({ note, zettelType }) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex flex-col justify-between space-y-2.5 hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer"
                    onClick={() => onOpenNote?.(note.id)}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            zettelType === 'permanent'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                              : zettelType === 'literature'
                              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                              : zettelType === 'structure'
                              ? 'bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {zettelType}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {(note.content || '').split(/\s+/).filter(Boolean).length} w
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {note.title || 'Untitled'}
                      </h4>
                      <p className="text-[11px] text-stone-500 line-clamp-3 mt-1 leading-relaxed">
                        {note.content || '(Empty)'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-800/60 text-[10px] text-stone-400">
                      <span>{(note.tags || []).length} tags</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        Open <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 3: Orphan Notes Resurface */}
        {activeTab === 'orphans' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-stone-700 dark:text-stone-300 flex items-start gap-3">
              <Compass className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100">
                  Niklas Luhmann's Core Slip-Box Axiom
                </h4>
                <p className="mt-0.5 text-stone-600 dark:text-stone-400">
                  "A note that is not linked to any other note is lost." The following notes currently have 0 incoming backlinks and 0 outgoing links. Connect them to integrate them into your knowledge web.
                </p>
              </div>
            </div>

            {orphanNotes.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs">
                🎉 Congratulations! Zero orphan notes detected. Every note in your vault is connected!
              </div>
            ) : (
              <div className="space-y-2">
                {orphanNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 truncate">
                        {note.title || 'Untitled'}
                      </h4>
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">
                        {note.content?.slice(0, 80) || '(No preview)'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSourceNoteId(note.id);
                        setActiveTab('extract');
                      }}
                      className="px-3 py-1.5 rounded-xl font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-amber-600 hover:text-white transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Extract Concepts</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-stone-50/70 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded text-[10px] font-mono">Alt + Z</kbd>
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
