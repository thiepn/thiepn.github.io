import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  GitMerge,
  Split,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeftRight,
  Folder as FolderIcon,
  Tag,
  Clock,
  FileText,
  X,
  Sparkles,
  Link2,
  Trash2,
  Archive,
  Edit3,
  Search,
  Check,
  ChevronDown,
  Copy,
  Hash,
  Layers,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { computeLineDiff, DiffOp } from '../../pkm/mergeEngine';
import { repairMergeDuplicateNotes } from '../../pkm/vaultDoctor';
import { formatShortDate } from '../../utils/date';

export type CompareViewMode = 'side-by-side' | 'unified-diff' | 'preview' | 'editor';
export type MergeStrategy = 'combine' | 'append' | 'prepend' | 'surviving-only' | 'incoming-only';
export type DiscardedAction = 'trash' | 'archive' | 'keep';

export interface NoteCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  allNotes: Note[];
  folders: Folder[];
  initialNoteAId?: string | null;
  initialNoteBId?: string | null;
  onMergeComplete: (survivingNote: Note, discardedNote: Note, updatedNotes: Note[]) => void;
  onOpenNote?: (noteId: string) => void;
}

export const NoteCompareModal: React.FC<NoteCompareModalProps> = ({
  isOpen,
  onClose,
  allNotes,
  folders,
  initialNoteAId,
  initialNoteBId,
  onMergeComplete,
  onOpenNote,
}) => {
  const activeNotes = useMemo(() => allNotes.filter((n) => !n.trashed), [allNotes]);

  // Note A & Note B selection IDs
  const [noteAId, setNoteAId] = useState<string>(() => {
    if (initialNoteAId && activeNotes.some((n) => n.id === initialNoteAId)) {
      return initialNoteAId;
    }
    return activeNotes.length > 0 ? activeNotes[0].id : '';
  });

  const [noteBId, setNoteBId] = useState<string>(() => {
    if (initialNoteBId && activeNotes.some((n) => n.id === initialNoteBId)) {
      return initialNoteBId;
    }
    const second = activeNotes.find((n) => n.id !== initialNoteAId);
    return second ? second.id : activeNotes.length > 1 ? activeNotes[1].id : '';
  });

  // Pickers dropdown search states
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [isPickingA, setIsPickingA] = useState(false);
  const [isPickingB, setIsPickingB] = useState(false);

  // View & Merge States
  const [viewMode, setViewMode] = useState<CompareViewMode>('side-by-side');
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('combine');
  const [discardedAction, setDiscardedAction] = useState<DiscardedAction>('trash');
  const [customTitle, setCustomTitle] = useState('');
  const [editedDraft, setEditedDraft] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Sync initial note IDs if props change when opening
  useEffect(() => {
    if (initialNoteAId && activeNotes.some((n) => n.id === initialNoteAId)) {
      setNoteAId(initialNoteAId);
    }
    if (initialNoteBId && activeNotes.some((n) => n.id === initialNoteBId)) {
      setNoteBId(initialNoteBId);
    }
  }, [initialNoteAId, initialNoteBId, activeNotes]);

  // Resolve actual notes
  const noteA = useMemo(() => {
    return activeNotes.find((n) => n.id === noteAId) || activeNotes[0] || null;
  }, [activeNotes, noteAId]);

  const noteB = useMemo(() => {
    return activeNotes.find((n) => n.id === noteBId) || null;
  }, [activeNotes, noteBId]);

  // Synchronize customTitle whenever noteA changes
  useEffect(() => {
    if (noteA) {
      setCustomTitle(noteA.title || 'Untitled Note');
      setEditedDraft(null);
    }
  }, [noteA?.id]);

  // Suggest similar notes for Note A based on title tokens & tags
  const suggestedNotesForA = useMemo(() => {
    if (!noteA) return [];
    const titleTokens = (noteA.title || '')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const tagsSet = new Set((noteA.tags || []).map((t) => t.toLowerCase()));

    return activeNotes
      .filter((candidate) => candidate.id !== noteA.id)
      .map((candidate) => {
        let score = 0;
        const cTitle = (candidate.title || '').toLowerCase();
        for (const token of titleTokens) {
          if (cTitle.includes(token)) score += 3;
        }
        for (const t of candidate.tags || []) {
          if (tagsSet.has(t.toLowerCase())) score += 2;
        }
        if (candidate.folderId && candidate.folderId === noteA.folderId) {
          score += 1;
        }
        return { note: candidate, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.note);
  }, [noteA, activeNotes]);

  // Computed Default Merged Content
  const defaultMergedContent = useMemo(() => {
    if (!noteA) return '';
    if (!noteB) return noteA.content || '';

    const textA = noteA.content || '';
    const textB = noteB.content || '';

    if (textA === textB) return textA;

    if (mergeStrategy === 'surviving-only') {
      return textA;
    }
    if (mergeStrategy === 'incoming-only') {
      return textB;
    }
    if (mergeStrategy === 'append') {
      return `${textA}\n\n---\n### Merged from "${noteB.title || 'Note'}"\n\n${textB}`;
    }
    if (mergeStrategy === 'prepend') {
      return `### Notes from "${noteB.title || 'Note'}"\n\n${textB}\n\n---\n\n${textA}`;
    }

    // Combine Strategy: Deduplicate lines and checklists
    const linesA = textA.split('\n');
    const linesB = textB.split('\n');
    const setA = new Set(linesA.map((l) => l.trim()).filter(Boolean));
    const uniqueFromB = linesB.filter((l) => l.trim().length > 0 && !setA.has(l.trim()));

    if (uniqueFromB.length === 0) {
      return textA;
    }

    return `${textA}\n\n---\n### Additional Content from "${noteB.title || 'Merged Note'}"\n\n${uniqueFromB.join('\n')}`;
  }, [noteA, noteB, mergeStrategy]);

  const activeContent = editedDraft !== null ? editedDraft : defaultMergedContent;

  // Compute Line Diffs between Note A and Note B
  const diffOps = useMemo<DiffOp[]>(() => {
    if (!noteA || !noteB) return [];
    const linesA = (noteA.content || '').split('\n');
    const linesB = (noteB.content || '').split('\n');
    return computeLineDiff(linesA, linesB);
  }, [noteA?.content, noteB?.content]);

  // Metadata stats calculation
  const statsA = useMemo(() => {
    if (!noteA) return { words: 0, lines: 0, chars: 0 };
    const text = noteA.content || '';
    return {
      words: text.trim() ? text.trim().split(/\s+/).length : 0,
      lines: text.split('\n').length,
      chars: text.length,
    };
  }, [noteA]);

  const statsB = useMemo(() => {
    if (!noteB) return { words: 0, lines: 0, chars: 0 };
    const text = noteB.content || '';
    return {
      words: text.trim() ? text.trim().split(/\s+/).length : 0,
      lines: text.split('\n').length,
      chars: text.length,
    };
  }, [noteB]);

  // Backlink counts across all notes
  const backlinksCountA = useMemo(() => {
    if (!noteA) return 0;
    const title = (noteA.title || '').trim().toLowerCase();
    if (!title) return 0;
    return allNotes.filter(
      (n) => n.id !== noteA.id && (n.content || '').toLowerCase().includes(`[[${title}`)
    ).length;
  }, [noteA, allNotes]);

  const backlinksCountB = useMemo(() => {
    if (!noteB) return 0;
    const title = (noteB.title || '').trim().toLowerCase();
    if (!title) return 0;
    return allNotes.filter(
      (n) => n.id !== noteB.id && (n.content || '').toLowerCase().includes(`[[${title}`)
    ).length;
  }, [noteB, allNotes]);

  if (!isOpen) return null;

  // Quick swap Note A and Note B
  const handleSwapNotes = () => {
    const temp = noteAId;
    setNoteAId(noteBId);
    setNoteBId(temp);
  };

  // Helper to copy text to clipboard with notification
  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage(`Copied ${label} to clipboard!`);
      setTimeout(() => setToastMessage(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  // Cherry-pick a specific line from Note B into active draft
  const handleCherryPickLine = (line: string) => {
    const current = activeContent;
    const updated = current ? `${current}\n${line}` : line;
    setEditedDraft(updated);
    setToastMessage('Added line to merged draft');
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Append all unique lines from Note B into active draft
  const handleCherryPickAllB = () => {
    if (!noteB?.content) return;
    const textA = activeContent;
    const textB = noteB.content;
    const linesA = new Set(textA.split('\n').map((l) => l.trim()).filter(Boolean));
    const uniqueFromB = textB.split('\n').filter((l) => l.trim().length > 0 && !linesA.has(l.trim()));
    if (uniqueFromB.length === 0) {
      setToastMessage('All lines from Note B are already present in draft');
      setTimeout(() => setToastMessage(null), 2000);
      return;
    }
    const updated = `${textA}\n\n---\n### Cherry-picked from "${noteB.title || 'Note B'}"\n\n${uniqueFromB.join('\n')}`;
    setEditedDraft(updated);
    setToastMessage(`Added ${uniqueFromB.length} unique lines to draft`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Execute Merge Operation
  const handleExecuteMerge = useCallback(() => {
    if (!noteA || !noteB) return;

    // Use vaultDoctor's repairMergeDuplicateNotes to safely rewrite backlinks
    const result = repairMergeDuplicateNotes(
      allNotes,
      noteA.id,
      noteB.id,
      activeContent,
      customTitle || noteA.title
    );

    let finalDiscarded = result.discardedNote;
    let finalUpdated = result.updatedNotes;

    // Apply discardedAction
    if (discardedAction === 'archive') {
      finalDiscarded = {
        ...finalDiscarded,
        trashed: false,
        archived: true,
        updatedAt: new Date().toISOString(),
      };
      finalUpdated = finalUpdated.map((n) => (n.id === finalDiscarded.id ? finalDiscarded : n));
    } else if (discardedAction === 'keep') {
      finalDiscarded = {
        ...finalDiscarded,
        trashed: false,
        archived: false,
        title: `${finalDiscarded.title} (Merged into [[${customTitle || noteA.title}]])`,
        content: `> This note was consolidated into [[${customTitle || noteA.title}]].\n\n${finalDiscarded.content || ''}`,
        updatedAt: new Date().toISOString(),
      };
      finalUpdated = finalUpdated.map((n) => (n.id === finalDiscarded.id ? finalDiscarded : n));
    }

    onMergeComplete(result.survivingNote, finalDiscarded, finalUpdated);

    setToastMessage(
      `Successfully merged notes! Rewrote ${result.rewrittenLinksCount} backlinks across vault.`
    );
    setTimeout(() => {
      onClose();
    }, 400);
  }, [noteA, noteB, allNotes, activeContent, customTitle, discardedAction, onMergeComplete, onClose]);

  // Keyboard Escape and Mod+Enter listeners
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPickingA && !isPickingB) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecuteMerge();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isPickingA, isPickingB, handleExecuteMerge]);

  const folderMap = new Map<string, string>(folders.map((f) => [f.id, f.name]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-compare-title"
    >
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[880px] bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-98 duration-150">
        
        {/* 1. Top Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-xs">
              <GitMerge className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="note-compare-title" className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Note Compare & Merge Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  Visual Diff & Safe Consolidation
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Inspect side-by-side differences, synthesize unique sections, and automatically rewrite vault backlinks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Note Selectors & Suggestion Bar */}
        <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-2.5 items-center">
            
            {/* Note A Selector (Surviving / Target Note) */}
            <div className="md:col-span-5 relative">
              <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center justify-between">
                <span>Note A (Target / Surviving Master)</span>
                <span className="text-[10px] text-stone-400 font-normal">Retains ID & backlinks</span>
              </label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsPickingA(!isPickingA);
                    setIsPickingB(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-xs text-left font-medium text-stone-900 dark:text-stone-100 hover:border-indigo-400 transition-colors"
                >
                  <span className="truncate">{noteA ? noteA.title || 'Untitled Note' : 'Select Note A...'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-2" />
                </button>

                {isPickingA && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xl overflow-hidden max-h-60 flex flex-col">
                    <div className="p-2 border-b border-stone-100 dark:border-stone-700 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <input
                        type="text"
                        value={searchA}
                        onChange={(e) => setSearchA(e.target.value)}
                        placeholder="Search note..."
                        className="w-full text-xs bg-transparent focus:outline-none text-stone-800 dark:text-stone-200"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto p-1 space-y-0.5">
                      {activeNotes
                        .filter((n) => (n.title || '').toLowerCase().includes(searchA.toLowerCase()))
                        .map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNoteAId(n.id);
                              setIsPickingA(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              n.id === noteAId
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                                : 'hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            <span className="truncate">{n.title || 'Untitled'}</span>
                            <span className="text-[10px] text-stone-400 shrink-0 ml-2">
                              {n.folderId && folderMap.get(n.folderId) ? folderMap.get(n.folderId) : 'Root'}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Swap Button */}
            <div className="md:col-span-1 flex items-center justify-center pt-4 md:pt-4">
              <button
                type="button"
                onClick={handleSwapNotes}
                disabled={!noteB}
                className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300 border border-stone-200 dark:border-stone-700 transition-colors"
                title="Swap Note A and Note B"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Note B Selector (Incoming / Comparing Note) */}
            <div className="md:col-span-5 relative">
              <label className="block text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center justify-between">
                <span>Note B (Comparing / Source Note)</span>
                <span className="text-[10px] text-stone-400 font-normal">Content merged into Note A</span>
              </label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsPickingB(!isPickingB);
                    setIsPickingA(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-xs text-left font-medium text-stone-900 dark:text-stone-100 hover:border-amber-400 transition-colors"
                >
                  <span className="truncate">{noteB ? noteB.title || 'Untitled Note' : 'Select Note B...'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-2" />
                </button>

                {isPickingB && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xl overflow-hidden max-h-60 flex flex-col">
                    <div className="p-2 border-b border-stone-100 dark:border-stone-700 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <input
                        type="text"
                        value={searchB}
                        onChange={(e) => setSearchB(e.target.value)}
                        placeholder="Search note..."
                        className="w-full text-xs bg-transparent focus:outline-none text-stone-800 dark:text-stone-200"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto p-1 space-y-0.5">
                      {activeNotes
                        .filter((n) => n.id !== noteA?.id && (n.title || '').toLowerCase().includes(searchB.toLowerCase()))
                        .map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNoteBId(n.id);
                              setIsPickingB(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              n.id === noteBId
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold'
                                : 'hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            <span className="truncate">{n.title || 'Untitled'}</span>
                            <span className="text-[10px] text-stone-400 shrink-0 ml-2">
                              {n.folderId && folderMap.get(n.folderId) ? folderMap.get(n.folderId) : 'Root'}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Suggested Duplicate / Related Notes Bar */}
          {suggestedNotesForA.length > 0 && (
            <div className="flex items-center gap-2 text-xs flex-wrap pt-1">
              <span className="text-[11px] text-stone-400 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Related / Candidate Notes:
              </span>
              {suggestedNotesForA.map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => setNoteBId(cand.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                    noteBId === cand.id
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-400'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-300'
                  }`}
                >
                  {cand.title || 'Untitled'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Toolbar: View Mode Tabs & Merge Strategies */}
        <div className="px-5 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* View Mode Tabs */}
          <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'side-by-side'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-indigo-500" />
              <span>Side-by-Side Diff</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified-diff')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'unified-diff'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>Unified Diff</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-500" />
              <span>Result Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'editor'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-500" />
              <span>Live Editor</span>
            </button>
          </div>

          {/* Merge Strategy Presets */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 text-[11px] font-medium hidden sm:inline">Strategy:</span>
            <select
              value={mergeStrategy}
              onChange={(e) => {
                setMergeStrategy(e.target.value as MergeStrategy);
                setEditedDraft(null);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="combine">Combine Unique Content (Deduplicated)</option>
              <option value="append">Append Note B to Note A</option>
              <option value="prepend">Prepend Note B before Note A</option>
              <option value="surviving-only">Keep Note A Only (Discard B)</option>
              <option value="incoming-only">Overwrite with Note B</option>
            </select>
          </div>
        </div>

        {/* 4. Main Body: Diff & Comparison Area */}
        <div className="flex-1 overflow-hidden flex flex-col bg-stone-50/30 dark:bg-stone-950/20">
          
          {/* Metadata Cards Bar */}
          {noteA && noteB && (
            <div className="grid grid-cols-2 divide-x divide-stone-200 dark:divide-stone-800 border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/60 px-4 py-2 text-xs text-stone-600 dark:text-stone-400 shrink-0">
              <div className="pr-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">Target Note A</span>
                  <span>{statsA.words} words · {statsA.lines} lines</span>
                  {noteA.folderId && folderMap.get(noteA.folderId) && (
                    <span className="flex items-center gap-1 text-[11px] bg-stone-200 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                      <FolderIcon className="w-3 h-3" />
                      {folderMap.get(noteA.folderId)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  {backlinksCountA} incoming backlinks
                </span>
              </div>

              <div className="pl-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-amber-700 dark:text-amber-300">Source Note B</span>
                  <span>{statsB.words} words · {statsB.lines} lines</span>
                  {noteB.folderId && folderMap.get(noteB.folderId) && (
                    <span className="flex items-center gap-1 text-[11px] bg-stone-200 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                      <FolderIcon className="w-3 h-3" />
                      {folderMap.get(noteB.folderId)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  {backlinksCountB} incoming backlinks
                </span>
              </div>
            </div>
          )}

          {/* View Container */}
          <div className="flex-1 overflow-y-auto p-4">
            
            {/* View 1: Side-by-Side Diff */}
            {viewMode === 'side-by-side' && (
              <div className="grid grid-cols-2 gap-4 h-full">
                
                {/* Left Pane: Note A */}
                <div className="flex flex-col border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
                  <div className="px-3.5 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{noteA ? noteA.title || 'Untitled' : 'Note A'}</span>
                      <span className="text-[10px] text-stone-400 font-normal">Base Master</span>
                    </div>
                    {noteA?.content && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(noteA.content || '', 'Note A')}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors"
                        title="Copy Note A content to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="p-3 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-y-auto flex-1 select-text">
                    {noteA?.content ? (
                      noteA.content.split('\n').map((line, idx) => (
                        <div key={idx} className="hover:bg-stone-100 dark:hover:bg-stone-800/50 px-1 rounded flex">
                          <span className="w-8 select-none text-stone-300 dark:text-stone-600 text-right pr-3 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-stone-800 dark:text-stone-200">{line || '\u00A0'}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-stone-400 italic">Empty note</span>
                    )}
                  </div>
                </div>

                {/* Right Pane: Note B */}
                <div className="flex flex-col border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
                  <div className="px-3.5 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{noteB ? noteB.title || 'Untitled' : 'Note B'}</span>
                      <span className="text-[10px] text-stone-400 font-normal">Comparing Draft</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {noteB?.content && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyText(noteB.content || '', 'Note B')}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors"
                            title="Copy Note B content to clipboard"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCherryPickAllB}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 transition-colors flex items-center gap-1"
                            title="Append all unique lines from Note B to draft"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Unique</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-3 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-y-auto flex-1 select-text">
                    {noteB?.content ? (
                      noteB.content.split('\n').map((line, idx) => (
                        <div
                          key={idx}
                          className="group hover:bg-stone-100 dark:hover:bg-stone-800/50 px-1 rounded flex items-center justify-between"
                        >
                          <div className="flex items-center min-w-0 flex-1">
                            <span className="w-8 select-none text-stone-300 dark:text-stone-600 text-right pr-3 shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-stone-800 dark:text-stone-200 truncate">{line || '\u00A0'}</span>
                          </div>
                          {line.trim() && (
                            <button
                              type="button"
                              onClick={() => handleCherryPickLine(line)}
                              className="opacity-0 group-hover:opacity-100 ml-2 p-0.5 rounded text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 transition-opacity shrink-0 flex items-center gap-0.5"
                              title="Append this line to merged draft"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-stone-400 italic">Empty note</span>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* View 2: Unified Diff */}
            {viewMode === 'unified-diff' && (
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 overflow-hidden font-mono text-xs p-3 space-y-0.5 select-text shadow-xs">
                {diffOps.map((op, opIdx) => {
                  if (op.type === 'equal') {
                    return op.lines.map((line, lIdx) => (
                      <div key={`${opIdx}-${lIdx}`} className="flex text-stone-600 dark:text-stone-400 px-2 py-0.5">
                        <span className="w-6 select-none text-stone-300 dark:text-stone-600"> </span>
                        <span>{line || '\u00A0'}</span>
                      </div>
                    ));
                  }
                  if (op.type === 'delete') {
                    return op.lines.map((line, lIdx) => (
                      <div
                        key={`${opIdx}-${lIdx}`}
                        className="flex bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded"
                      >
                        <span className="w-6 select-none font-bold text-rose-500">-</span>
                        <span className="line-through">{line || '\u00A0'}</span>
                      </div>
                    ));
                  }
                  if (op.type === 'insert') {
                    return op.lines.map((line, lIdx) => (
                      <div
                        key={`${opIdx}-${lIdx}`}
                        className="group flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded"
                      >
                        <div className="flex items-center min-w-0 flex-1">
                          <span className="w-6 select-none font-bold text-emerald-500 shrink-0">+</span>
                          <span className="truncate">{line || '\u00A0'}</span>
                        </div>
                        {line.trim() && (
                          <button
                            type="button"
                            onClick={() => handleCherryPickLine(line)}
                            className="opacity-0 group-hover:opacity-100 ml-2 p-0.5 rounded text-[10px] font-semibold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 transition-opacity shrink-0 flex items-center gap-0.5"
                            title="Cherry-pick this inserted line into draft"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ));
                  }
                  return null;
                })}
              </div>
            )}

            {/* View 3: Live Preview of Merged Note */}
            {viewMode === 'preview' && (
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 p-6 shadow-xs max-w-4xl mx-auto space-y-4">
                <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
                  <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                    {customTitle || noteA?.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    {Array.from(new Set([...(noteA?.tags || []), ...(noteB?.tags || [])])).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="prose dark:prose-invert max-w-none text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                  {activeContent}
                </div>
              </div>
            )}

            {/* View 4: Live Editor */}
            {viewMode === 'editor' && (
              <div className="flex flex-col h-full space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Edit the final consolidated markdown draft before committing merge:</span>
                  {editedDraft !== null && (
                    <button
                      type="button"
                      onClick={() => setEditedDraft(null)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Reset to strategy template
                    </button>
                  )}
                </div>
                <textarea
                  value={activeContent}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  className="flex-1 w-full p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-xs"
                  placeholder="Merged markdown content..."
                />
              </div>
            )}

          </div>
        </div>

        {/* 5. Footer & Execution Bar */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Post-Merge Options */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">After merge:</span>
              <select
                value={discardedAction}
                onChange={(e) => setDiscardedAction(e.target.value as DiscardedAction)}
                className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-none"
              >
                <option value="trash">Move Note B to Trash (Safe & Recoverable)</option>
                <option value="archive">Archive Note B</option>
                <option value="keep">Keep Note B with Link to Note A</option>
              </select>
            </div>

            <span className="text-stone-400 hidden lg:inline">
              All <code className="text-indigo-600 dark:text-indigo-400">[[{noteB?.title || 'Note B'}]]</code> backlinks in vault will be updated to <code className="text-indigo-600 dark:text-indigo-400">[[{customTitle || noteA?.title}]]</code>.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteMerge}
              disabled={!noteA || !noteB}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Commit & Merge Notes</span>
            </button>
          </div>

        </div>

        {/* Floating Notification Toast */}
        {toastMessage && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-stone-900/95 dark:bg-stone-100/95 text-white dark:text-stone-900 shadow-xl border border-stone-700 dark:border-stone-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
};
