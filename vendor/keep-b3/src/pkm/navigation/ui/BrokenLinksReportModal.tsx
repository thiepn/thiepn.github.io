import React, { useMemo } from 'react';
import {
  AlertTriangle,
  FilePlus,
  ArrowRight,
  FileText,
  Hash,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';
import { Note } from '../../../types';
import { BrokenLinkItem } from '../navigationTypes';
import { backlinkNavigationService } from '../backlinkNavigationService';

export interface BrokenLinksReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onCreateNote: (title: string) => void;
  onOpenNote: (noteId: string) => void;
}

export const BrokenLinksReportModal: React.FC<BrokenLinksReportModalProps> = ({
  isOpen,
  onClose,
  notes,
  onCreateNote,
  onOpenNote,
}) => {
  const brokenLinks = useMemo(() => {
    if (!isOpen) return [];
    return backlinkNavigationService.auditBrokenLinks(notes);
  }, [isOpen, notes]);

  if (!isOpen) return null;

  return (
    <div
      id="broken-links-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="broken-links-modal"
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Broken Links Report"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Broken Links & Missing Targets
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {brokenLinks.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="font-medium text-sm text-neutral-800 dark:text-neutral-200">
                All vault links are healthy!
              </p>
              <p className="text-2xs text-neutral-400 mt-1">
                Zero missing notes, broken headings, or detached block references found.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-2xs text-neutral-500 mb-2">
                Found {brokenLinks.length} broken reference(s) across your vault notes:
              </div>

              {brokenLinks.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/40 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                        <FileText className="w-3.5 h-3.5 text-neutral-400" />
                        <span>In "{item.sourceNoteTitle}"</span>
                        <span className="text-2xs text-neutral-400">· Line {item.lineIndex + 1}</span>
                      </div>
                      <p className="text-2xs font-mono text-neutral-500 dark:text-neutral-400 mt-1">
                        {item.contextExcerpt}
                      </p>
                    </div>

                    {item.brokenType === 'missing_note' && item.targetNoteTitle && (
                      <button
                        onClick={() => {
                          onCreateNote(item.targetNoteTitle!);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 hover:bg-primary-100 border border-primary-200 dark:border-primary-800/60 font-medium text-2xs flex items-center gap-1 shrink-0"
                      >
                        <FilePlus className="w-3 h-3" />
                        <span>Create Note</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-2xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>
                      {item.brokenType === 'missing_note'
                        ? `Target note "${item.rawTarget}" does not exist.`
                        : item.brokenType === 'missing_heading'
                        ? `Heading "${item.targetSubpath}" not found in target note.`
                        : `Block "${item.targetSubpath}" not found in target note.`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end bg-neutral-50 dark:bg-neutral-900">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
