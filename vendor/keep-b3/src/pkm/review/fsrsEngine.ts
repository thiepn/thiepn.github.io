/**
 * Phase P38 - Deterministic FSRS-4.5 Spaced Repetition Engine
 *
 * Implements the Free Spaced Repetition Scheduler (FSRS-4.5) algorithm.
 * Provides deterministic state transitions, stability/difficulty calculations,
 * interval predictions, and retrievability estimation.
 */

import {
  CardScheduleState,
  ReviewRating,
  ReviewState,
  RatingPreview,
  ReviewSettings,
  DEFAULT_REVIEW_SETTINGS,
} from './reviewTypes';

export const SCHEDULER_VERSION = 'FSRS-4.5';

/**
 * Standard default FSRS-4.5 weight vector (17 parameters)
 */
export const DEFAULT_FSRS_WEIGHTS = [
  0.4,   // w[0]: S_0(Again)
  0.6,   // w[1]: S_0(Hard)
  2.4,   // w[2]: S_0(Good)
  5.8,   // w[3]: S_0(Easy)
  4.93,  // w[4]: D_0 intercept
  0.94,  // w[5]: D_0 slope
  0.86,  // w[6]: D update factor
  0.01,  // w[7]: D mean-reversion weight
  1.49,  // w[8]: S_review multiplier exponent
  0.14,  // w[9]: S_review stability power
  0.94,  // w[10]: S_review retrievability power
  2.18,  // w[11]: S_lapse base
  0.05,  // w[12]: S_lapse difficulty power
  0.34,  // w[13]: S_lapse stability power
  1.26,  // w[14]: S_lapse retrievability power
  0.29,  // w[15]: Hard penalty factor
  2.61,  // w[16]: Easy bonus factor
];

const FACTOR = 19 / 81; // ~0.2345679

/**
 * Clamps a number between min and max
 */
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Calculate Retrievability R(t, S)
 * @param elapsedDays Days since last review
 * @param stability Memory stability in days
 */
export function calculateRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1.0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, -0.5);
}

/**
 * Calculate interval (in days) given stability and desired retention
 */
export function calculateInterval(
  stability: number,
  desiredRetention = 0.9,
  w = DEFAULT_FSRS_WEIGHTS
): number {
  const retention = clamp(desiredRetention, 0.7, 0.98);
  const rawInterval = (stability / FACTOR) * (Math.pow(retention, -1 / 0.5) - 1);
  return Math.max(1, Math.round(rawInterval));
}

/**
 * Initial Stability S_0(r) for rating 1..4 on a new card
 */
export function initStability(rating: ReviewRating, w = DEFAULT_FSRS_WEIGHTS): number {
  return Math.max(0.1, w[rating - 1]);
}

/**
 * Initial Difficulty D_0(r) for rating 1..4 on a new card
 */
export function initDifficulty(rating: ReviewRating, w = DEFAULT_FSRS_WEIGHTS): number {
  return clamp(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1, 10);
}

/**
 * Update Difficulty D'(D, r) with mean-reversion towards D_0(3)
 */
export function nextDifficulty(
  d: number,
  rating: ReviewRating,
  w = DEFAULT_FSRS_WEIGHTS
): number {
  const d0Good = initDifficulty(3, w);
  const nextD = w[7] * d0Good + (1 - w[7]) * (d - w[6] * (rating - 3));
  return clamp(nextD, 1, 10);
}

/**
 * Calculate next stability on successful recall (r > 1)
 */
export function nextRecallStability(
  d: number,
  s: number,
  r: number,
  rating: ReviewRating,
  w = DEFAULT_FSRS_WEIGHTS
): number {
  const hardPenalty = rating === 2 ? w[15] : 1.0;
  const easyBonus = rating === 4 ? w[16] : 1.0;
  const newS =
    s *
    (1 +
      Math.exp(w[8]) *
        (11 - d) *
        Math.pow(s, -w[9]) *
        (Math.exp(w[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus);
  return Math.max(0.1, Number(newS.toFixed(4)));
}

/**
 * Calculate next stability on lapse / forgotten (r = 1)
 */
export function nextLapseStability(
  d: number,
  s: number,
  r: number,
  w = DEFAULT_FSRS_WEIGHTS
): number {
  const newS =
    w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp(w[14] * (1 - r));
  return Math.max(0.1, Math.min(s, Number(newS.toFixed(4))));
}

/**
 * Creates default initial schedule state for a new card
 */
export function createInitialCardScheduleState(cardId: string): CardScheduleState {
  const now = new Date();
  return {
    cardId,
    state: 'new',
    due: now.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    schedulerVersion: SCHEDULER_VERSION,
  };
}

/**
 * Formats a duration (in days or fractions) into human-readable shorthand
 */
export function formatInterval(days: number): string {
  if (days <= 0) return '<10m';
  if (days < 1) {
    const hours = Math.round(days * 24);
    return hours <= 1 ? '<1h' : `${hours}h`;
  }
  if (days < 30) {
    return `${Math.round(days)}d`;
  }
  if (days < 365) {
    const months = (days / 30.4375).toFixed(1);
    return `${months}mo`;
  }
  const years = (days / 365.25).toFixed(1);
  return `${years}y`;
}

/**
 * Calculates the next schedule state after applying a review rating
 */
export function applyReviewRating(
  currentState: CardScheduleState,
  rating: ReviewRating,
  reviewTimestamp = new Date().toISOString(),
  settings: ReviewSettings = DEFAULT_REVIEW_SETTINGS,
  w = DEFAULT_FSRS_WEIGHTS
): { nextState: CardScheduleState; intervalDays: number } {
  const now = new Date(reviewTimestamp);
  const state = currentState.state;

  // Compute elapsed days since last review
  let elapsedDays = 0;
  if (currentState.lastReviewedAt) {
    const lastRev = new Date(currentState.lastReviewedAt);
    const diffMs = Math.max(0, now.getTime() - lastRev.getTime());
    elapsedDays = diffMs / (1000 * 60 * 60 * 24);
  }

  let nextS: number;
  let nextD: number;
  let nextReviewState: ReviewState;
  let intervalDays = 0;

  if (state === 'new') {
    nextS = initStability(rating, w);
    nextD = initDifficulty(rating, w);

    if (rating === 1) {
      // Again on new card -> Learning
      nextReviewState = 'learning';
      intervalDays = 0; // due same day (<10 min)
    } else {
      nextReviewState = 'review';
      intervalDays = calculateInterval(nextS, settings.desiredRetention, w);
      if (rating === 2) intervalDays = Math.max(1, Math.round(intervalDays * 0.6));
      if (rating === 4) intervalDays = Math.max(2, Math.round(intervalDays * 1.3));
    }
  } else if (state === 'learning' || state === 'relearning') {
    nextD = nextDifficulty(currentState.difficulty || initDifficulty(3, w), rating, w);

    if (rating === 1) {
      nextS = initStability(1, w);
      nextReviewState = state;
      intervalDays = 0;
    } else {
      nextS = initStability(rating, w);
      nextReviewState = 'review';
      intervalDays = calculateInterval(nextS, settings.desiredRetention, w);
      if (rating === 2) intervalDays = Math.max(1, Math.round(intervalDays * 0.6));
      if (rating === 4) intervalDays = Math.max(2, Math.round(intervalDays * 1.3));
    }
  } else {
    // Current state is 'review'
    const curS = Math.max(0.1, currentState.stability);
    const curD = Math.max(1, currentState.difficulty || 5);
    const retrievability = calculateRetrievability(elapsedDays, curS);

    nextD = nextDifficulty(curD, rating, w);

    if (rating === 1) {
      nextS = nextLapseStability(curD, curS, retrievability, w);
      nextReviewState = 'relearning';
      intervalDays = 0;
    } else {
      nextS = nextRecallStability(curD, curS, retrievability, rating, w);
      nextReviewState = 'review';
      intervalDays = calculateInterval(nextS, settings.desiredRetention, w);
      if (rating === 2) intervalDays = Math.max(1, Math.round(intervalDays * 0.6));
      if (rating === 4) intervalDays = Math.max(2, Math.round(intervalDays * 1.3));
    }
  }

  // Calculate next due date
  const nextDueDate = new Date(now.getTime());
  if (intervalDays === 0) {
    // Due in 10 minutes for immediate re-learning
    nextDueDate.setMinutes(nextDueDate.getMinutes() + 10);
  } else {
    nextDueDate.setDate(nextDueDate.getDate() + intervalDays);
  }

  const nextState: CardScheduleState = {
    ...currentState,
    state: nextReviewState,
    stability: Number(nextS.toFixed(4)),
    difficulty: Number(nextD.toFixed(4)),
    elapsedDays: Number(elapsedDays.toFixed(2)),
    scheduledDays: intervalDays,
    reps: (currentState.reps || 0) + 1,
    lapses: rating === 1 ? (currentState.lapses || 0) + 1 : currentState.lapses || 0,
    lastReviewedAt: now.toISOString(),
    due: nextDueDate.toISOString(),
    schedulerVersion: SCHEDULER_VERSION,
  };

  return { nextState, intervalDays };
}

/**
 * Returns rating previews for all 4 buttons (Again, Hard, Good, Easy)
 */
export function getRatingPreviews(
  currentState: CardScheduleState,
  nowIso = new Date().toISOString(),
  settings: ReviewSettings = DEFAULT_REVIEW_SETTINGS,
  w = DEFAULT_FSRS_WEIGHTS
): RatingPreview[] {
  const ratings: Array<{ rating: ReviewRating; label: RatingPreview['label'] }> = [
    { rating: 1, label: 'Again' },
    { rating: 2, label: 'Hard' },
    { rating: 3, label: 'Good' },
    { rating: 4, label: 'Easy' },
  ];

  return ratings.map(({ rating, label }) => {
    const { nextState, intervalDays } = applyReviewRating(
      currentState,
      rating,
      nowIso,
      settings,
      w
    );

    return {
      rating,
      label,
      intervalDescription: formatInterval(intervalDays),
      nextScheduledDays: intervalDays,
      nextStability: nextState.stability,
      nextDifficulty: nextState.difficulty,
    };
  });
}
