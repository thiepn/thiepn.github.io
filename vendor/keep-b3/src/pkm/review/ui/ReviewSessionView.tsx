import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain,
  RotateCcw,
  Edit3,
  Volume2,
  ChevronRight,
  Eye,
  PauseCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  X,
  CheckCircle2,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { ReviewCard, ReviewRating, RatingPreview, CardScheduleState } from '../reviewTypes';
import { reviewService, ActiveReviewItem } from '../reviewService';
import { reviewStorageService } from '../reviewStorageService';

export interface ReviewSessionViewProps {
  queue: ActiveReviewItem[];
  practiceMode?: boolean;
  onFinishSession: () => void;
  onOpenNote: (noteId: string, line?: number) => void;
}

export const ReviewSessionView: React.FC<ReviewSessionViewProps> = ({
  queue: initialQueue,
  practiceMode = false,
  onFinishSession,
  onOpenNote,
}) => {
  const [items, setItems] = useState<ActiveReviewItem[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);
  const cardStartTimeRef = useRef<number>(Date.now());

  const currentItem = items[currentIndex];

  useEffect(() => {
    setIsRevealed(false);
    cardStartTimeRef.current = Date.now();
  }, [currentIndex]);

  const handleReveal = useCallback(() => {
    setIsRevealed(true);
  }, []);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!currentItem) return;

      const durationMs = Date.now() - cardStartTimeRef.current;
      await reviewService.submitRating(
        currentItem.card.id,
        rating,
        durationMs,
        practiceMode
      );

      setSessionCompletedCount((prev) => prev + 1);

      // If rating was 'Again' (1) and not in practice mode, re-insert card at end of session queue
      if (rating === 1 && !practiceMode) {
        setItems((prev) => [...prev, currentItem]);
      }

      if (currentIndex + 1 < items.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onFinishSession();
      }
    },
    [currentItem, currentIndex, items.length, onFinishSession, practiceMode]
  );

  const handleUndo = useCallback(async () => {
    const res = await reviewService.undoLastRating();
    if (res.success && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setSessionCompletedCount((prev) => Math.max(0, prev - 1));
      setIsRevealed(true);
    }
  }, [currentIndex]);

  const handleToggleSuspend = useCallback(async () => {
    if (!currentItem) return;
    await reviewService.toggleCardSuspension(currentItem.card.id);
    if (currentIndex + 1 < items.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onFinishSession();
    }
  }, [currentItem, currentIndex, items.length, onFinishSession]);

  const handleBury = useCallback(async () => {
    if (!currentItem) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await reviewStorageService.buryCard(currentItem.card.id, tomorrow.toISOString().slice(0, 10));
    if (currentIndex + 1 < items.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onFinishSession();
    }
  }, [currentItem, currentIndex, items.length, onFinishSession]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input / textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        if (!isRevealed) {
          e.preventDefault();
          handleReveal();
        }
      } else if (isRevealed) {
        if (e.key === '1') {
          e.preventDefault();
          handleRate(1);
        } else if (e.key === '2') {
          e.preventDefault();
          handleRate(2);
        } else if (e.key === '3') {
          e.preventDefault();
          handleRate(3);
        } else if (e.key === '4') {
          e.preventDefault();
          handleRate(4);
        }
      }

      if (e.key === 'u' || (e.ctrlKey && e.key === 'z') || (e.metaKey && e.key === 'z')) {
        e.preventDefault();
        handleUndo();
      }

      if (e.key === 'e') {
        if (currentItem) {
          onOpenNote(currentItem.card.sourceNoteId, currentItem.card.sourceLine);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, handleReveal, handleRate, handleUndo, currentItem, onOpenNote]);

  if (!currentItem || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mb-4" />
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Review Session Complete
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 mt-2 max-w-md">
          {sessionCompletedCount > 0
            ? `You reviewed ${sessionCompletedCount} card${sessionCompletedCount > 1 ? 's' : ''}. Knowledge is strengthened!`
            : 'No cards are currently due for review.'}
        </p>
        <button
          onClick={onFinishSession}
          className="mt-6 px-4 py-2 text-sm font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-md transition-colors"
        >
          Return to Review Center
        </button>
      </div>
    );
  }

  const { card, state, previews } = currentItem;
  const progressPercent = Math.round((currentIndex / items.length) * 100);

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-4 py-6 select-none">
      {/* Top Session Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onFinishSession}
            title="Exit review session"
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {practiceMode ? 'Practice Mode' : state.state.toUpperCase()}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Card {currentIndex + 1} of {items.length}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar & Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUndo}
            disabled={currentIndex === 0 && sessionCompletedCount === 0}
            title="Undo last rating (u or Ctrl+Z)"
            className="px-2.5 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 rounded border border-neutral-200 dark:border-neutral-800 flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            onClick={() => onOpenNote(card.sourceNoteId, card.sourceLine)}
            title="Edit card in source note (e)"
            className="px-2.5 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-800 flex items-center space-x-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Note</span>
          </button>
          <button
            onClick={handleBury}
            title="Bury card until tomorrow"
            className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
          >
            Bury
          </button>
          <button
            onClick={handleToggleSuspend}
            title="Suspend this card"
            className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
          >
            Suspend
          </button>
        </div>
      </div>

      {/* Main Flashcard Card Body */}
      <div className="flex-1 flex flex-col justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 shadow-sm">
        {/* Prompt Section */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-3 flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>{card.sourceNoteTitle}</span>
            {card.clozeIndex && (
              <span className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-[11px] text-neutral-600 dark:text-neutral-300">
                c{card.clozeIndex}
              </span>
            )}
          </div>

          <div
            id="review-card-prompt"
            className="text-lg md:text-xl font-medium text-neutral-900 dark:text-neutral-100 leading-relaxed whitespace-pre-wrap break-words"
          >
            {card.prompt}
          </div>

          {/* Revealed Answer Section */}
          {isRevealed && (
            <div
              id="review-card-answer"
              className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800"
              aria-live="polite"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
                Answer
              </div>
              <div className="text-lg md:text-xl text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal whitespace-pre-wrap break-words">
                {card.answer}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Area */}
        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          {!isRevealed ? (
            <button
              id="btn-show-answer"
              onClick={handleReveal}
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Show Answer</span>
              <kbd className="text-[11px] opacity-70 px-1.5 py-0.5 bg-neutral-800 dark:bg-neutral-200 rounded ml-2">
                Space
              </kbd>
            </button>
          ) : (
            <div>
              <div className="grid grid-cols-4 gap-2.5">
                {previews.map((p) => {
                  let colorClasses =
                    'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-neutral-50 dark:bg-neutral-800/60';
                  let labelColor = 'text-neutral-900 dark:text-neutral-100';

                  if (p.rating === 1) {
                    colorClasses =
                      'border-rose-200 dark:border-rose-900/60 hover:border-rose-400 bg-rose-50/50 dark:bg-rose-950/30';
                    labelColor = 'text-rose-700 dark:text-rose-400';
                  } else if (p.rating === 2) {
                    colorClasses =
                      'border-amber-200 dark:border-amber-900/60 hover:border-amber-400 bg-amber-50/50 dark:bg-amber-950/30';
                    labelColor = 'text-amber-700 dark:text-amber-400';
                  } else if (p.rating === 3) {
                    colorClasses =
                      'border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30';
                    labelColor = 'text-emerald-700 dark:text-emerald-400';
                  } else if (p.rating === 4) {
                    colorClasses =
                      'border-sky-200 dark:border-sky-900/60 hover:border-sky-400 bg-sky-50/50 dark:bg-sky-950/30';
                    labelColor = 'text-sky-700 dark:text-sky-400';
                  }

                  return (
                    <button
                      key={p.rating}
                      onClick={() => handleRate(p.rating)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${colorClasses}`}
                    >
                      <div className="flex items-center space-x-1 mb-0.5">
                        <span className={`text-sm font-semibold ${labelColor}`}>
                          {p.label}
                        </span>
                        <kbd className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          {p.rating}
                        </kbd>
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        {p.intervalDescription}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
