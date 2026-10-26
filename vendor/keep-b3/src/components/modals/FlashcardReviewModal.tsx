import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  X,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { ReviewWorkspaceView } from '../../pkm/review/ui/ReviewWorkspaceView';
import { cardIndex } from '../../pkm/review/cardIndex';
import { reviewService } from '../../pkm/review/reviewService';

interface FlashcardReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  initialNoteId?: string;
  onOpenNote: (noteId: string, line?: number) => void;
  onUpdateNoteContent?: (noteId: string, updatedContent: string) => void;
}

export const FlashcardReviewModal: React.FC<FlashcardReviewModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  initialNoteId,
  onOpenNote,
  onUpdateNoteContent,
}) => {
  // Sync notes on mount/open
  useEffect(() => {
    if (isOpen) {
      reviewService.syncNotes(notes);
    }
  }, [isOpen, notes]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const queueSummary = useMemo(() => {
    return reviewService.getQueueSummary();
  }, [notes, isOpen]);

  const totalCardsCount = useMemo(() => {
    return cardIndex.getAllCards().length;
  }, [notes, isOpen]);

  const specificNote = useMemo(() => {
    if (!initialNoteId) return null;
    return notes.find((n) => n.id === initialNoteId);
  }, [initialNoteId, notes]);

  const specificNoteCardCount = useMemo(() => {
    if (!initialNoteId) return 0;
    return cardIndex.getCardsForNote(initialNoteId).length;
  }, [initialNoteId, notes]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flashcard-modal-title"
    >
      <div className="w-full max-w-5xl h-[92vh] max-h-[850px] bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-98 duration-150">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <GraduationCap className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="flashcard-modal-title"
                  className="text-sm font-bold text-stone-900 dark:text-stone-100"
                >
                  Active Recall & Spaced Repetition (SRS)
                </h2>
                {queueSummary.totalDue > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80">
                    {queueSummary.totalDue} Due Today
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                    Up to date
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                SM-2 / FSRS memory engine • {totalCardsCount} flashcards in vault
                {specificNote && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">
                    • Focusing on "{specificNote.title || 'Untitled'}" ({specificNoteCardCount} cards)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close flashcard modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body: Review Workspace with Session, Deck Browser, Analytics */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ReviewWorkspaceView
            notes={notes}
            folders={folders}
            activeNoteId={initialNoteId}
            onUpdateNoteContent={onUpdateNoteContent}
            onOpenNote={(noteId, line) => {
              onClose();
              onOpenNote(noteId, line);
            }}
          />
        </div>
      </div>
    </div>
  );
};
