import {
  parseTaskTemporalMetadata,
  updateTaskTemporalLine,
  cleanTaskTemporalTokens,
  computeNextOccurrenceDate,
  completeRecurringTaskLine,
  temporalIndex,
  generateICSContent,
  createLocalDate,
  formatLocalDateOnly,
  TemporalIndex,
} from '../temporal';
import { Note } from '../../types';

export function runTemporalTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
      console.error(`  ✕ FAIL: ${msg}`);
    }
  }

  // 1. Task Temporal Parser Tests
  try {
    const line1 = '- [ ] Submit quarterly report 📅 2026-09-30 ⏳ 2026-09-25 🔁 every week';
    const parsed1 = parseTaskTemporalMetadata(line1);

    assert(parsed1.dueDate === '2026-09-30', `Expected dueDate 2026-09-30, got ${parsed1.dueDate}`);
    assert(parsed1.scheduledDate === '2026-09-25', `Expected scheduledDate 2026-09-25, got ${parsed1.scheduledDate}`);
    assert(parsed1.recurrence !== undefined, 'Expected recurrence to be defined');
    assert(parsed1.recurrenceRule !== undefined, 'Expected recurrenceRule to be parsed');
    assert(parsed1.recurrenceRule?.type === 'weekly', `Expected weekly recurrence, got ${parsed1.recurrenceRule?.type}`);
    assert(parsed1.recurrenceRule?.interval === 1, `Expected interval 1, got ${parsed1.recurrenceRule?.interval}`);
    assert(parsed1.cleanText === 'Submit quarterly report', `Expected clean text 'Submit quarterly report', got '${parsed1.cleanText}'`);

    // Alternative token syntax with due date and scheduled date
    const line2 = '- [ ] Prepare presentation 📅 2026-10-01 ⏳ 2026-09-28';
    const parsed2 = parseTaskTemporalMetadata(line2);
    assert(parsed2.dueDate === '2026-10-01', `Expected dueDate 2026-10-01, got ${parsed2.dueDate}`);
    assert(parsed2.scheduledDate === '2026-09-28', `Expected scheduledDate 2026-09-28, got ${parsed2.scheduledDate}`);

    // Update tokens in line
    const updatedLine = updateTaskTemporalLine(line1, {
      dueDate: '2026-10-15',
      scheduledDate: '2026-10-10',
      recurrence: 'every 2 months',
    });
    assert(updatedLine.includes('📅 2026-10-15'), `Expected updated dueDate token in '${updatedLine}'`);
    assert(updatedLine.includes('⏳ 2026-10-10'), `Expected updated scheduledDate token in '${updatedLine}'`);
    assert(updatedLine.includes('🔁 every 2 months'), `Expected updated recurrence token in '${updatedLine}'`);

    // Clean tokens test
    const cleaned = cleanTaskTemporalTokens(line1);
    assert(cleaned === 'Submit quarterly report', `Expected clean string 'Submit quarterly report', got '${cleaned}'`);
  } catch (err: any) {
    failed++;
    errors.push(`Task parser exception: ${err.message}`);
  }

  // 2. Recurrence Engine Tests
  try {
    // Daily interval 1
    const nextDaily = computeNextOccurrenceDate(
      '2026-09-15',
      { type: 'daily', interval: 1, unit: 'day', rawText: 'every day' },
      { todayStr: '2026-09-15', catchUpPastDates: false }
    );
    assert(nextDaily === '2026-09-16', `Expected next daily 2026-09-16, got ${nextDaily}`);

    // Daily interval 3
    const nextDaily3 = computeNextOccurrenceDate(
      '2026-09-15',
      { type: 'interval', interval: 3, unit: 'day', rawText: 'every 3 days' },
      { todayStr: '2026-09-15', catchUpPastDates: false }
    );
    assert(nextDaily3 === '2026-09-18', `Expected next daily (3) 2026-09-18, got ${nextDaily3}`);

    // Weekly interval 1
    const nextWeekly = computeNextOccurrenceDate(
      '2026-09-15',
      { type: 'weekly', interval: 1, unit: 'week', rawText: 'every week' },
      { todayStr: '2026-09-15', catchUpPastDates: false }
    );
    assert(nextWeekly === '2026-09-22', `Expected next weekly 2026-09-22, got ${nextWeekly}`);

    // Monthly interval 1
    const nextMonthly = computeNextOccurrenceDate(
      '2026-09-15',
      { type: 'monthly', interval: 1, unit: 'month', rawText: 'every month' },
      { todayStr: '2026-09-15', catchUpPastDates: false }
    );
    assert(nextMonthly === '2026-10-15', `Expected next monthly 2026-10-15, got ${nextMonthly}`);

    // Complete recurring task line produces completed current + new next
    const origTask = '- [ ] Review metrics 📅 2026-09-15 🔁 every week';
    const completedResult = completeRecurringTaskLine(origTask, { todayStr: '2026-09-15' });
    assert(completedResult !== null, 'Expected completeRecurringTaskLine to return result');
    assert(completedResult?.completedLine.startsWith('- [x] Review metrics') === true, 'Expected completed line with - [x]');
    assert(completedResult?.nextOccurrenceLine !== undefined, 'Expected nextOccurrenceLine to be generated');
    assert(completedResult?.nextOccurrenceLine.includes('📅 2026-09-22') === true, `Expected next instance 2026-09-22, got '${completedResult?.nextOccurrenceLine}'`);
  } catch (err: any) {
    failed++;
    errors.push(`Recurrence engine exception: ${err.message}`);
  }

  // 3. Temporal Index & Search Tests
  try {
    const testIndex = new TemporalIndex();
    const mockNotes: Note[] = [
      {
        id: 'note-1',
        title: 'Project Roadmap',
        content: `---
due: 2026-10-01
---

# Project Roadmap

## Milestones
- [ ] Finalize Architecture 📅 2026-09-20 ⏳ 2026-09-15
- [ ] Conduct User Testing 📅 2026-09-28
- [x] Initial Wireframes 📅 2026-09-10
`,
        type: 'text',
        checklist: [],
        tags: ['project', 'roadmap'],
        color: 'default',
        pinned: false,
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-12T14:30:00.000Z',
        folderId: null,
      },
      {
        id: 'note-daily',
        title: '2026-09-15',
        content: '# 2026-09-15 Daily Note\n- [ ] Morning standup ⏳ 2026-09-15',
        type: 'text',
        checklist: [],
        tags: ['daily-notes'],
        color: 'yellow',
        pinned: false,
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        createdAt: '2026-09-15T08:00:00.000Z',
        updatedAt: '2026-09-15T09:00:00.000Z',
        folderId: null,
      },
    ];

    testIndex.rebuild(mockNotes);
    const rangeResults = testIndex.getEntriesForRange('2026-09-14', '2026-09-21');

    assert(rangeResults.length > 0, `Expected range results for 2026-09-14..2026-09-21, got ${rangeResults.length}`);

    // Check specific task presence
    const dueOcc = rangeResults.find((o) => o.title.includes('Finalize Architecture') && o.temporalRole === 'due');
    assert(dueOcc !== undefined, 'Expected Finalize Architecture due entry to be indexed');
    assert(dueOcc?.date === '2026-09-20', `Expected due entry date 2026-09-20, got ${dueOcc?.date}`);

    const schedOcc = rangeResults.find((o) => o.title.includes('Finalize Architecture') && o.temporalRole === 'scheduled');
    assert(schedOcc !== undefined, 'Expected Finalize Architecture scheduled entry to be indexed');
    assert(schedOcc?.date === '2026-09-15', `Expected scheduled entry date 2026-09-15, got ${schedOcc?.date}`);

    // Check daily note occurrence
    const dailyOcc = rangeResults.find((o) => o.resourceType === 'daily-note' && o.date === '2026-09-15');
    assert(dailyOcc !== undefined, 'Expected daily note 2026-09-15 to be indexed');

    // Check ICS Export
    const icsText = generateICSContent(rangeResults, 'Test Vault');
    assert(icsText.startsWith('BEGIN:VCALENDAR'), 'Expected ICS export to start with BEGIN:VCALENDAR');
    assert(icsText.includes('END:VCALENDAR'), 'Expected ICS export to end with END:VCALENDAR');
    assert(icsText.includes('Finalize Architecture'), 'Expected ICS export to contain task title');
  } catch (err: any) {
    failed++;
    errors.push(`Temporal index exception: ${err.message}`);
  }

  return { passed, failed, errors };
}
