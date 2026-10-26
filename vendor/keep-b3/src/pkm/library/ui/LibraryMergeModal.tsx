import React, { useState } from 'react';
import { X, GitMerge, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import { LibraryDuplicateCandidate, LibraryItem } from '../libraryTypes';
import { libraryService } from '../libraryService';

export interface LibraryMergeModalProps {
  candidates: LibraryDuplicateCandidate[];
  isOpen: boolean;
  onClose: () => void;
  onMergeCompleted: () => void;
}

export const LibraryMergeModal: React.FC<LibraryMergeModalProps> = ({
  candidates,
  isOpen,
  onClose,
  onMergeCompleted,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!isOpen || candidates.length === 0) return null;

  const current = candidates[selectedIdx];
  const primary = libraryService.getItem(current?.primaryId);
  const duplicate = libraryService.getItem(current?.duplicateId);

  const handleMerge = () => {
    if (!current || !primary || !duplicate) return;
    libraryService.mergeItems(current.primaryId, current.duplicateId);
    onMergeCompleted();
    if (selectedIdx >= candidates.length - 1) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Resolve Duplicate Library Items ({selectedIdx + 1} / {candidates.length})
              </h2>
              <p className="text-xs text-stone-400">
                Matched by: <span className="font-semibold capitalize">{current.reason.replace('_', ' ')}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Body */}
        <div className="p-5 grid grid-cols-2 gap-4 text-xs">
          {/* Primary Item */}
          <div className="border border-emerald-300 dark:border-emerald-800 rounded-xl p-4 bg-emerald-50/20 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                Keep Primary Target
              </span>
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-2">
                {primary?.title || current.primaryTitle}
              </h3>
              <p className="text-stone-500 mt-1">
                Creators: {primary?.creators.map((c) => c.name).join(', ') || '—'}
              </p>
              <p className="text-stone-500">Status: {primary?.status}</p>
              <p className="text-stone-500">Format: {primary?.format || '—'}</p>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-3">
              ✓ All highlights, sessions, and files from duplicate will safely migrate here.
            </p>
          </div>

          {/* Duplicate Item */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 bg-stone-50/50 dark:bg-stone-800/30 flex flex-col justify-between">
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                Merge & Remove Duplicate
              </span>
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-2">
                {duplicate?.title || current.duplicateTitle}
              </h3>
              <p className="text-stone-500 mt-1">
                Creators: {duplicate?.creators.map((c) => c.name).join(', ') || '—'}
              </p>
              <p className="text-stone-500">Status: {duplicate?.status}</p>
              <p className="text-stone-500">Format: {duplicate?.format || '—'}</p>
            </div>
            <p className="text-[11px] text-stone-400 mt-3">
              Will be cleanly pruned after migrating content.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex gap-1">
            {selectedIdx > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIdx(selectedIdx - 1)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold"
              >
                Previous
              </button>
            )}
            {selectedIdx < candidates.length - 1 && (
              <button
                type="button"
                onClick={() => setSelectedIdx(selectedIdx + 1)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold"
              >
                Skip / Next
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMerge}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              <GitMerge className="w-4 h-4" />
              <span>Confirm Merge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
