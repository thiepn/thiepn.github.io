import { commandRegistry } from '../commands/commandRegistry';
import {
  ChronoCapsule,
  IncrementalReadingItem,
  getDueReadingItems,
  advanceReadingItem,
  getDueCapsules,
  getUpcomingCapsules,
  formatTimeUntilUnlock,
} from '../chrono/chronoTypes';

export function runFeatureP3ChronoCapsuleTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const err = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(err);
      console.error(err);
    }
  }

  // Gate 1: Command Registration & Discovery
  const cmd = commandRegistry.getCommand('tools:chrono-capsule');
  assert(Boolean(cmd), 'tools:chrono-capsule command is registered in commandRegistry');
  assert(Boolean(cmd?.title.includes('Chrono Capsule')), 'Command title includes "Chrono Capsule"');
  assert(cmd?.shortcut === 'Alt+K', 'Command shortcut is Alt+K');
  assert(Boolean(cmd?.keywords.includes('incremental')), 'Keywords include incremental');
  assert(Boolean(cmd?.keywords.includes('p3')), 'Keywords include p3');

  // Gate 2: Capsule Time Horizon & Lock Boundary
  const now = new Date('2026-10-12T12:00:00Z');

  const pastCapsule: ChronoCapsule = {
    id: 'cap-1',
    title: 'Letter from 1 month ago',
    message: 'Remember our initial vision',
    sealedAt: '2026-09-12T12:00:00Z',
    unlockAt: '2026-10-12T10:00:00Z', // 2 hours ago (Ready!)
    isOpened: false,
    category: 'letter',
    tags: ['vision'],
  };

  const futureCapsule: ChronoCapsule = {
    id: 'cap-2',
    title: 'Prediction for Next Quarter',
    message: 'Will the system reach 10,000 notes?',
    sealedAt: '2026-10-12T12:00:00Z',
    unlockAt: '2026-11-12T12:00:00Z', // 31 days in future
    isOpened: false,
    category: 'prediction',
    tags: ['predictions'],
  };

  const dueCaps = getDueCapsules([pastCapsule, futureCapsule], now);
  assert(dueCaps.length === 1, 'Exactly 1 capsule is ready to unseal');
  assert(dueCaps[0].id === 'cap-1', 'Past capsule is detected as ready to unseal');

  const upcomingCaps = getUpcomingCapsules([pastCapsule, futureCapsule], now);
  assert(upcomingCaps.length === 1, 'Exactly 1 capsule is locked in the future');
  assert(upcomingCaps[0].id === 'cap-2', 'Future capsule is locked');

  // Gate 3: Unlock Time Remaining Formatter
  assert(formatTimeUntilUnlock('2026-10-12T10:00:00Z', now) === 'Ready to Unseal!', 'Past date returns Ready to Unseal!');
  assert(formatTimeUntilUnlock('2026-10-12T16:00:00Z', now) === '4 hours remaining', 'Hours remaining formatted correctly');
  assert(formatTimeUntilUnlock('2026-10-22T12:00:00Z', now) === '10 days remaining', 'Days remaining formatted correctly');
  assert(formatTimeUntilUnlock('2026-12-12T12:00:00Z', now).includes('months remaining') || formatTimeUntilUnlock('2026-12-12T12:00:00Z', now).includes('mo'), 'Months formatted cleanly');

  // Gate 4: Incremental Reading Spaced Intervals
  const readingItem: IncrementalReadingItem = {
    id: 'read-1',
    noteId: 'note-100',
    title: 'The Principles of Productive Thought',
    excerpt: 'Deep work requires structuring attentional residue.',
    currentIntervalDays: 1,
    nextReviewDate: '2026-10-12',
    reviewsCount: 1,
    priority: 4,
    isCompleted: false,
    tags: ['deep-work'],
  };

  // 4a: Advance "later" (1d -> 3d)
  const advancedLater = advanceReadingItem(readingItem, 'later', now);
  assert(advancedLater.currentIntervalDays === 3, 'Advances interval from 1 to 3 days on later');
  assert(advancedLater.reviewsCount === 2, 'Increments review count');
  assert(advancedLater.nextReviewDate === '2026-10-15', 'Next review date is 3 days ahead');

  // 4b: Advance "later" again (3d -> 7d)
  const advancedLater2 = advanceReadingItem(advancedLater, 'later', new Date('2026-10-15'));
  assert(advancedLater2.currentIntervalDays === 7, 'Advances interval from 3 to 7 days on later');

  // 4c: Advance "soon" (contracts interval)
  const advancedSoon = advanceReadingItem(advancedLater2, 'soon', new Date('2026-10-22'));
  assert(advancedSoon.currentIntervalDays <= 3, 'Contracts interval to <= 3 days on soon');

  // 4d: Mark "done" (completes item)
  const completedItem = advanceReadingItem(readingItem, 'done', now);
  assert(completedItem.isCompleted === true, 'Marks item completed on done');

  // Gate 5: Due Reading Items Filter
  const tomorrowStr = '2026-10-13';
  const notDueItem: IncrementalReadingItem = {
    ...readingItem,
    id: 'read-2',
    nextReviewDate: tomorrowStr,
  };

  const dueList = getDueReadingItems([readingItem, notDueItem, completedItem], now);
  assert(dueList.length === 1, 'Only non-completed item scheduled for today is due');
  assert(dueList[0].id === 'read-1', 'Correct due item selected');

  return { passed, failed, errors };
}
