import React, { useState, useMemo } from 'react';
import {
  History,
  X,
  RotateCcw,
  Clock,
  FileText,
  CheckSquare,
  Sparkles,
  ArrowLeft,
  Check,
  SplitSquareVertical,
  Layers,
} from 'lucide-react';
import { Note, NoteRevision } from '../../types';
import { noteRevisionService } from '../../pkm/resilience';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  onRestoreRevision: (revision: NoteRevision) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  note,
  onRestoreRevision,
}) => {
  const revisions = note.revisions || [];
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>(
    revisions.length > 0 ? revisions[0].id : 'current'
  );
  const [viewMode, setViewMode] = useState<'content' | 'diff'>('content');

  if (!isOpen) return null;

  const currentRevision: NoteRevision = {
    id: 'current',
    timestamp: note.updatedAt || note.createdAt,
    title: note.title,
    content: note.content,
    checklist: note.checklist || [],
    wordCount: note.content ? note.content.trim().split(/\s+/).length : 0,
    summary: 'Current live draft',
  };

  const allRevisions = [currentRevision, ...revisions];
  const selectedRevision =
    allRevisions.find((r) => r.id === selectedRevisionId) || currentRevision;

  // Compute Diff against current version
  const diff = useMemo(() => {
    if (selectedRevision.id === 'current') return null;
    return noteRevisionService.computeDiff(
      selectedRevision.content || '',
      note.content || '',
      1,
      2
    );
  }, [selectedRevision, note.content]);

  const handleRestore = (rev: NoteRevision) => {
    onRestoreRevision(rev);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-history-title"
    >
      <div
        className="bg-white dark:bg-[#18181b] w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300/50 dark:border-amber-700/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 id="version-history-title" className="text-base font-bold">
                Version History & Revisions
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Inspect bounded revisions, view line diffs, and safely revert changes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view (Timeline list on left, Preview/Diff on right) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left: Revisions Timeline List */}
          <div className="w-full md:w-72 border-r border-stone-200 dark:border-stone-800 overflow-y-auto p-3 space-y-2 bg-stone-50/30 dark:bg-stone-900/20 shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1 px-1">
              Snapshots ({allRevisions.length})
            </div>

            {allRevisions.map((rev) => {
              const isSelected = rev.id === selectedRevisionId;
              const date = new Date(rev.timestamp);
              const formattedDate = date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <button
                  key={rev.id}
                  onClick={() => setSelectedRevisionId(rev.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400/60 dark:border-amber-700 shadow-xs'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {formattedDate}
                    </span>
                    {rev.id === 'current' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                        Live
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400 font-mono">
                        {rev.wordCount || 0}w
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                    {rev.title || 'Untitled'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Selected Revision Preview & Diff */}
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-stone-900 p-5 overflow-y-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="font-bold text-base">
                  {selectedRevision.title || 'Untitled Note'}
                </h3>
                <span className="text-xs text-stone-400">
                  {new Date(selectedRevision.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedRevision.id !== 'current' && (
                  <div className="flex rounded-lg border border-stone-200 dark:border-stone-700 p-0.5 bg-stone-100 dark:bg-stone-800 text-xs">
                    <button
                      onClick={() => setViewMode('content')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        viewMode === 'content'
                          ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                          : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                      }`}
                    >
                      Text
                    </button>
                    <button
                      onClick={() => setViewMode('diff')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        viewMode === 'diff'
                          ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                          : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                      }`}
                    >
                      Diff
                    </button>
                  </div>
                )}

                {selectedRevision.id !== 'current' && (
                  <button
                    onClick={() => handleRestore(selectedRevision)}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore Version
                  </button>
                )}
              </div>
            </div>

            {/* Content or Diff View */}
            {viewMode === 'diff' && diff ? (
              <div className="space-y-2">
                <div className="text-xs text-stone-500 flex gap-4">
                  <span className="text-emerald-600 font-semibold">+{diff.addedLines} added</span>
                  <span className="text-rose-600 font-semibold">-{diff.removedLines} removed</span>
                  <span>{diff.unchangedLines} unchanged</span>
                </div>
                <div className="font-mono text-xs rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                  {diff.diffChunks.map((chunk, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-1 flex items-start gap-2 ${
                        chunk.type === 'add'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300'
                          : chunk.type === 'remove'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300'
                          : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <span className="w-5 text-stone-400 select-none text-[10px]">
                        {chunk.type === 'add' ? '+' : chunk.type === 'remove' ? '-' : ' '}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap">{chunk.text || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto text-xs leading-relaxed">
                {selectedRevision.content && (
                  <pre className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 font-mono whitespace-pre-wrap text-stone-800 dark:text-stone-200">
                    {selectedRevision.content}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

