/**
 * Phase P38 - Spaced Repetition, Active Recall & Knowledge Review System
 * Type Definitions
 */

export type CardType = 'question-answer' | 'cloze' | 'basic';

export type ReviewState = 'new' | 'learning' | 'review' | 'relearning';

export type ReviewRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface CardClozeDetail {
  index: number; // e.g. 1 for c1, 2 for c2
  answer: string;
  hint?: string;
}

export interface ReviewCard {
  id: string; // Stable card ID (e.g. "card-rank-nullity" or auto-generated stable ID)
  sourceNoteId: string;
  sourceNoteTitle: string;
  sourceBlockId?: string;
  sourceLine: number;
  sourceContentHash: string; // To detect significant modifications to source text

  type: CardType;
  prompt: string; // The question or masked sentence with [ ... ] for cloze
  answer: string; // The revealed answer text
  rawSource: string; // The exact raw Markdown block/line in the note

  clozeIndex?: number; // If cloze card, which cloze number (e.g. 1 for c1)
  clozeHint?: string;

  tags: string[];
  folderId: string | null;
  folderName?: string;
  isSiblingOf?: string; // Grouping ID for sibling clozes/cards in same block
}

/**
 * FSRS-4.5 Card Scheduling State
 */
export interface CardScheduleState {
  cardId: string;
  state: ReviewState;
  due: string; // ISO 8601 DateTime or Date YYYY-MM-DD
  stability: number; // S (days)
  difficulty: number; // D (1 to 10)
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  lastReviewedAt?: string; // ISO timestamp
  suspended?: boolean;
  buriedUntil?: string; // Date string YYYY-MM-DD
  sourceContentHash?: string;
  needsReviewResetWarning?: boolean; // If source content drastically changed
  schedulerVersion: string; // e.g. "FSRS-4.5"
}

/**
 * Append-only immutable Review Event Log record
 */
export interface ReviewLogEvent {
  id: string; // Unique event UUID
  cardId: string;
  rating: ReviewRating;
  state: ReviewState;
  previousState: ReviewState;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  reviewDurationMs?: number;
  timestamp: string; // ISO timestamp
  deviceId: string;
}

export interface ReviewSettings {
  scheduler: 'FSRS-4.5';
  desiredRetention: number; // Default 0.90 (90% target retention)
  dailyNewLimit: number; // Default 20
  dailyReviewLimit: number; // Default 0 (unlimited)
  burySiblings: boolean; // Default true
  reviewArchivedNotes: boolean; // Default true
  showPredictedIntervals: boolean; // Default true
  autoPlayAudio: boolean; // Default false
}

export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  scheduler: 'FSRS-4.5',
  desiredRetention: 0.9,
  dailyNewLimit: 20,
  dailyReviewLimit: 0,
  burySiblings: true,
  reviewArchivedNotes: true,
  showPredictedIntervals: true,
  autoPlayAudio: false,
};

export interface ReviewFilterScope {
  noteId?: string;
  folderId?: string;
  tag?: string;
  searchQuery?: string;
  practiceMode?: boolean; // If true, reviews do not modify FSRS schedules
}

export interface RatingPreview {
  rating: ReviewRating;
  label: 'Again' | 'Hard' | 'Good' | 'Easy';
  intervalDescription: string;
  nextScheduledDays: number;
  nextStability: number;
  nextDifficulty: number;
}

export interface ReviewQueueSummary {
  dueCount: number;
  newCount: number;
  learningCount: number;
  matureCount: number;
  suspendedCount: number;
  totalCards: number;
}

export interface ReviewAnalyticsData {
  cardsStudiedToday: number;
  reviewsCompletedToday: number;
  estimatedRetention: number;
  averageResponseTimeSec: number;
  stateBreakdown: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
    suspended: number;
  };
  maturityBreakdown: {
    young: number; // Interval < 21 days
    mature: number; // Interval >= 21 days
  };
}
