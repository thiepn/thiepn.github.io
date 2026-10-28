import React, { useState, useMemo } from 'react';
import {
  GitMerge,
  Split,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Folder as FolderIcon,
  Tag,
  Clock,
  FileText,
  X,
  Sparkles,
  Link2,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Note } from '../../types';
import { computeLineDiff, DiffOp } from '../mergeEngine';
import { repairMergeDuplicateNotes } from '../vaultDoctor';
import { formatShortDate } from '../../utils/date';

export interface NoteDiffMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteA: Note;
  noteB: Note;
  allNotes: Note[];
  similarityScore?: number;
  reason?: string;
  onMergeComplete: (survivingNote: Note, discardedNote: Note, updatedNotes: Note[]) => void;
}

export const NoteDiffMergeModal: React.FC<NoteDiffMergeModalProps> = ({
  isOpen,
  onClose,
  noteA,
  noteB,
  allNotes,
  similarityScore = 0.9,
  reason,
  onMergeComplete,
}) => {
  // Surviving note choice: default to older note or note with more content
  const [survivingChoice, setSurvivingChoice] = useState<'A' | 'B'>(() => {
    if ((noteA.content || '').length >= (noteB.content || '').length) return 'A';
    return 'B';
  });

  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified-diff' | 'preview'>('side-by-side');
  const [mergeStrategy, setMergeStrategy] = useState<'combine' | 'append' | 'surviving-only' | 'incoming-only'>('combine');
  const [customTitle, setCustomTitle] = useState(survivingChoice === 'A' ? noteA.title : noteB.title);
  const [editedDraft, setEditedDraft] = useState<string | null>(null);

  const survivingNote = survivingChoice === 'A' ? noteA : noteB;
  const discardedNote = survivingChoice === 'A' ? noteB : noteA;

  // Compute default merged content based on strategy
  const defaultMergedContent = useMemo(() => {
    const textA = noteA.content || '';
    const textB = noteB.content || '';

    if (textA === textB) return textA;

    if (mergeStrategy === 'surviving-only') {
      return survivingNote.content || '';
    }
    if (mergeStrategy === 'incoming-only') {
      return discardedNote.content || '';
    }
    if (mergeStrategy === 'append') {
      return `${survivingNote.content || ''}\n\n---\n### Merged from "${discardedNote.title || 'Note'}"\n\n${discardedNote.content || ''}`;
    }

    // Combine strategy: take surviving content and append unique lines/sections from discarded
    const linesA = textA.split('\n');
    const linesB = textB.split('\n');
    const setA = new Set(linesA.map((l) => l.trim()).filter(Boolean));
    const uniqueFromB = linesB.filter((l) => l.trim().length > 0 && !setA.has(l.trim()));

    if (uniqueFromB.length === 0) {
      return survivingNote.content || '';
    }

    return `${survivingNote.content || ''}\n\n---\n### Additional Notes from "${discardedNote.title || 'Duplicate'}"\n\n${uniqueFromB.join('\n')}`;
  }, [noteA, noteB, survivingChoice, mergeStrategy, survivingNote, discardedNote]);

  const activeContent = editedDraft !== null ? editedDraft : defaultMergedContent;

  // Compute Line Diffs
  const diffOps = useMemo<DiffOp[]>(() => {
    const linesA = (noteA.content || '').split('\n');
    const linesB = (noteB.content || '').split('\n');
    return computeLineDiff(linesA, linesB);
  }, [noteA.content, noteB.content]);

  // Backlink count for both notes
  const backlinksCountA = useMemo(() => {
    const titleA = noteA.title?.trim().toLowerCase();
    if (!titleA) return 0;
    return allNotes.filter(
      (n) => n.id !== noteA.id && (n.content || '').toLowerCase().includes(`[[${titleA}`)
    ).length;
  }, [noteA, allNotes]);

  const backlinksCountB = useMemo(() => {
    const titleB = noteB.title?.trim().toLowerCase();
    if (!titleB) return 0;
    return allNotes.filter(
      (n) => n.id !== noteB.id && (n.content || '').toLowerCase().includes(`[[${titleB}`)
    ).length;
  }, [noteB, allNotes]);

  if (!isOpen) return null;

  const handleExecuteMerge = () => {
    const result = repairMergeDuplicateNotes(
      allNotes,
      survivingNote.id,
      discardedNote.id,
      activeContent,
      customTitle || survivingNote.title
    );

    onMergeComplete(result.survivingNote, result.discardedNote, result.updatedNotes);
    onClose();
  };

  const pct = Math.round(similarityScore * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-modal-title"
    >
      <div className="w-full max-w-5xl h-[92vh] max-h-[850px] bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-98 duration-150">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <GitMerge className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="merge-modal-title" className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Smart Note Merging & De-duplication
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    pct >= 95
                      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  }`}
                >
                  {pct}% Similarity
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {reason || 'High content and structural overlap detected'} • Side-by-side diff with preserved backlinks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close merge assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher & Surviving Selection Bar */}
        <div className="px-5 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Surviving Note Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-stone-600 dark:text-stone-400">Surviving Note:</span>
            <div className="inline-flex rounded-lg border border-stone-200 dark:border-stone-700 p-0.5 bg-stone-100 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => {
                  setSurvivingChoice('A');
                  setCustomTitle(noteA.title);
                  setEditedDraft(null);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  survivingChoice === 'A'
                    ? 'bg-amber-500 text-white font-bold shadow-2xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                Keep Note A: "{noteA.title || 'Untitled'}"
              </button>
              <button
                type="button"
                onClick={() => {
                  setSurvivingChoice('B');
                  setCustomTitle(noteB.title);
                  setEditedDraft(null);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  survivingChoice === 'B'
                    ? 'bg-amber-500 text-white font-bold shadow-2xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                Keep Note B: "{noteB.title || 'Untitled'}"
              </button>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified-diff')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'unified-diff'
                  ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              Line Diff
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              Merged Preview
            </button>
          </div>
        </div>

        {/* Modal Center: Comparison / Diff / Preview Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* Note A Card */}
              <div
                className={`p-4 rounded-xl border flex flex-col h-full bg-stone-50/50 dark:bg-stone-950/40 ${
                  survivingChoice === 'A'
                    ? 'border-amber-400 dark:border-amber-700/80 ring-2 ring-amber-500/20'
                    : 'border-stone-200 dark:border-stone-800 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-[10px] font-bold font-mono">
                      Note A
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate max-w-[200px]">
                      {noteA.title || 'Untitled'}
                    </span>
                  </div>
                  {survivingChoice === 'A' && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Will Survive
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 mb-3 pb-2 border-b border-stone-200 dark:border-stone-800">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatShortDate(noteA.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> {backlinksCountA} backlinks
                  </span>
                  <span>{(noteA.content || '').split(/\s+/).filter(Boolean).length} words</span>
                  {(noteA.tags || []).length > 0 && (
                    <span className="text-stone-500 dark:text-stone-400 truncate max-w-[150px]">
                      {noteA.tags.map((t) => `#${t}`).join(' ')}
                    </span>
                  )}
                </div>

                <pre className="flex-1 font-mono text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap break-words bg-white dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-800 overflow-y-auto leading-relaxed">
                  {noteA.content || '(Empty content)'}
                </pre>
              </div>

              {/* Note B Card */}
              <div
                className={`p-4 rounded-xl border flex flex-col h-full bg-stone-50/50 dark:bg-stone-950/40 ${
                  survivingChoice === 'B'
                    ? 'border-amber-400 dark:border-amber-700/80 ring-2 ring-amber-500/20'
                    : 'border-stone-200 dark:border-stone-800 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-[10px] font-bold font-mono">
                      Note B
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate max-w-[200px]">
                      {noteB.title || 'Untitled'}
                    </span>
                  </div>
                  {survivingChoice === 'B' && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Will Survive
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 mb-3 pb-2 border-b border-stone-200 dark:border-stone-800">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatShortDate(noteB.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> {backlinksCountB} backlinks
                  </span>
                  <span>{(noteB.content || '').split(/\s+/).filter(Boolean).length} words</span>
                  {(noteB.tags || []).length > 0 && (
                    <span className="text-stone-500 dark:text-stone-400 truncate max-w-[150px]">
                      {noteB.tags.map((t) => `#${t}`).join(' ')}
                    </span>
                  )}
                </div>

                <pre className="flex-1 font-mono text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap break-words bg-white dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-800 overflow-y-auto leading-relaxed">
                  {noteB.content || '(Empty content)'}
                </pre>
              </div>
            </div>
          )}

          {viewMode === 'unified-diff' && (
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden font-mono text-xs bg-white dark:bg-stone-950">
              <div className="px-4 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-900 text-[11px] font-sans font-semibold text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span>Unified Line Diff: Note A (red) vs Note B (green)</span>
                <span className="font-mono text-[10px]">
                  {diffOps.reduce((acc, op) => acc + (op.type !== 'equal' ? op.lines.length : 0), 0)} changed lines
                </span>
              </div>
              <div className="p-3 divide-y divide-stone-100 dark:divide-stone-900/40 max-h-[50vh] overflow-y-auto leading-relaxed">
                {diffOps.map((op, idx) => (
                  <div
                    key={idx}
                    className={`py-1 px-2 rounded-xs whitespace-pre-wrap break-words ${
                      op.type === 'insert'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                        : op.type === 'delete'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                        : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {op.lines.map((line, lIdx) => (
                      <div key={lIdx} className="flex gap-2">
                        <span className="w-4 select-none font-bold text-stone-400">
                          {op.type === 'insert' ? '+' : op.type === 'delete' ? '-' : ' '}
                        </span>
                        <span className="flex-1">{line || ' '}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'preview' && (
            <div className="flex flex-col h-full space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                  Editable Merged Draft Preview:
                </span>
                <button
                  type="button"
                  onClick={() => setEditedDraft(null)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-[11px]"
                >
                  Reset to default template
                </button>
              </div>
              <textarea
                value={activeContent}
                onChange={(e) => setEditedDraft(e.target.value)}
                rows={16}
                className="w-full flex-1 p-4 font-mono text-xs leading-relaxed rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                placeholder="Merged markdown content..."
              />
            </div>
          )}
        </div>

        {/* Modal Bottom: Merge Strategy & Execution Bar */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Strategy radio / buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-stone-500 dark:text-stone-400">Strategy:</span>
            <div className="inline-flex rounded-lg border border-stone-200 dark:border-stone-700 p-0.5 bg-stone-100 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => {
                  setMergeStrategy('combine');
                  setEditedDraft(null);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  mergeStrategy === 'combine'
                    ? 'bg-amber-500 text-white font-bold'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
                title="Combines unique non-duplicate sections"
              >
                Smart Combine
              </button>
              <button
                type="button"
                onClick={() => {
                  setMergeStrategy('append');
                  setEditedDraft(null);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  mergeStrategy === 'append'
                    ? 'bg-amber-500 text-white font-bold'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
                title="Append discarded note underneath"
              >
                Append
              </button>
              <button
                type="button"
                onClick={() => {
                  setMergeStrategy('surviving-only');
                  setEditedDraft(null);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  mergeStrategy === 'surviving-only'
                    ? 'bg-amber-500 text-white font-bold'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
                title="Only keep surviving note text"
              >
                Surviving Text Only
              </button>
            </div>
          </div>

          {/* Action Execution */}
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hidden sm:flex mr-2">
              <Link2 className="w-3.5 h-3.5" />
              <span>Backlinks automatically preserved</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteMerge}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>1-Click Merge Notes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
