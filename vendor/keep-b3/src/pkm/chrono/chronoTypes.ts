export interface ChronoCapsule {
  id: string;
  title: string;
  message: string;
  sourceNoteId?: string;
  sourceNoteTitle?: string;
  sealedAt: string; // ISO
  unlockAt: string; // ISO
  isOpened: boolean;
  openedAt?: string;
  category: 'prediction' | 'reflection' | 'goal' | 'letter' | 'literature';
  tags: string[];
}

export interface IncrementalReadingItem {
  id: string;
  noteId: string;
  title: string;
  excerpt: string;
  currentIntervalDays: number; // e.g. 1, 3, 7, 14, 30, 90
  nextReviewDate: string; // YYYY-MM-DD
  reviewsCount: number;
  priority: number; // 1 (lowest) to 5 (highest)
  isCompleted: boolean;
  lastReviewedAt?: string;
  tags: string[];
}

export const CHRONO_STORAGE_CAPSULES = 'pkm_chrono_capsules_v1';
export const CHRONO_STORAGE_READING = 'pkm_chrono_incremental_reading_v1';

/**
 * Returns reading items that are scheduled for review on or before today
 */
export function getDueReadingItems(
  items: IncrementalReadingItem[],
  currentDate: Date = new Date()
): IncrementalReadingItem[] {
  const todayStr = currentDate.toISOString().slice(0, 10);
  return items.filter(
    (item) => !item.isCompleted && item.nextReviewDate <= todayStr
  );
}

/**
 * Calculates next review interval based on spaced repetition grade
 */
export function advanceReadingItem(
  item: IncrementalReadingItem,
  grade: 'soon' | 'later' | 'done',
  currentDate: Date = new Date()
): IncrementalReadingItem {
  if (grade === 'done') {
    return {
      ...item,
      isCompleted: true,
      lastReviewedAt: currentDate.toISOString(),
      reviewsCount: item.reviewsCount + 1,
    };
  }

  let nextInterval: number;
  if (grade === 'soon') {
    // Review soon (1 to 3 days)
    nextInterval = Math.max(1, Math.min(3, Math.round(item.currentIntervalDays * 0.7)));
  } else {
    // Review later (expand interval: 1 -> 3 -> 7 -> 14 -> 30 -> 60 -> 90)
    if (item.currentIntervalDays <= 1) nextInterval = 3;
    else if (item.currentIntervalDays <= 3) nextInterval = 7;
    else if (item.currentIntervalDays <= 7) nextInterval = 14;
    else if (item.currentIntervalDays <= 14) nextInterval = 30;
    else if (item.currentIntervalDays <= 30) nextInterval = 60;
    else nextInterval = 90;
  }

  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + nextInterval);

  return {
    ...item,
    currentIntervalDays: nextInterval,
    nextReviewDate: nextDate.toISOString().slice(0, 10),
    reviewsCount: item.reviewsCount + 1,
    lastReviewedAt: currentDate.toISOString(),
  };
}

/**
 * Returns capsules that have reached or passed their unlock date
 */
export function getDueCapsules(
  capsules: ChronoCapsule[],
  currentDate: Date = new Date()
): ChronoCapsule[] {
  const nowIso = currentDate.toISOString();
  return capsules.filter((c) => c.unlockAt <= nowIso);
}

/**
 * Returns capsules that are still sealed in the future
 */
export function getUpcomingCapsules(
  capsules: ChronoCapsule[],
  currentDate: Date = new Date()
): ChronoCapsule[] {
  const nowIso = currentDate.toISOString();
  return capsules.filter((c) => c.unlockAt > nowIso);
}

/**
 * Formats a duration in days or hours until an unlock date
 */
export function formatTimeUntilUnlock(unlockIso: string, now: Date = new Date()): string {
  const unlock = new Date(unlockIso);
  const diffMs = unlock.getTime() - now.getTime();
  if (diffMs <= 0) return 'Ready to Unseal!';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours} hours remaining`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days remaining`;

  const months = Math.floor(days / 30);
  const remDays = days % 30;
  return remDays > 0 ? `${months} mo ${remDays} d remaining` : `${months} months remaining`;
}
