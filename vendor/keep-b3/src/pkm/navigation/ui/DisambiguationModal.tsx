import React from 'react';
import { HelpCircle, FileText, ArrowRight, X } from 'lucide-react';
import { Note } from '../../../types';

export interface DisambiguationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRaw: string;
  candidates: Array<{ noteId: string; title: string; folderPath?: string }>;
  onSelectCandidate: (noteId: string) => void;
}

export const DisambiguationModal: React.FC<DisambiguationModalProps> = ({
  isOpen,
  onClose,
  targetRaw,
  candidates,
  onSelectCandidate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="disambiguation-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="disambiguation-modal"
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Link Disambiguation"
      >
        <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Multiple Notes Match Target
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <p className="text-neutral-600 dark:text-neutral-400">
            The link target <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">[[{targetRaw}]]</span> matches multiple notes in your vault. Choose which note to open:
          </p>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {candidates.map((cand) => (
              <div
                key={cand.noteId}
                onClick={() => {
                  onSelectCandidate(cand.noteId);
                  onClose();
                }}
                className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-primary-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {cand.title}
                  </span>
                  {cand.folderPath && (
                    <span className="text-2xs text-neutral-400 truncate">
                      ({cand.folderPath})
                    </span>
                  )}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end bg-neutral-50 dark:bg-neutral-900">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
