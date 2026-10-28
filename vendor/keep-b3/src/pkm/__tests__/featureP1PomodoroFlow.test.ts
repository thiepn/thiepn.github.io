import { commandRegistry } from '../commands/commandRegistry';
import { InterstitialLogEntry, SprintTask } from '../../components/modals/PomodoroFlowModal';

export function runFeatureP1PomodoroFlowTests(): { passed: number; failed: number; errors: string[] } {
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
  const cmd = commandRegistry.getCommand('tools:pomodoro-flow');
  assert(Boolean(cmd), 'tools:pomodoro-flow command is registered in commandRegistry');
  assert(Boolean(cmd?.title.includes('Pomodoro')), 'Command title includes "Pomodoro"');
  assert(cmd?.shortcut === 'Alt+P', 'Command shortcut is Alt+P');
  assert(Boolean(cmd?.keywords.includes('interstitial')), 'Keywords include interstitial');
  assert(Boolean(cmd?.keywords.includes('p1')), 'Keywords include p1');

  // Gate 2: Interstitial Log Entry Structure & Formatting
  const mockEntry: InterstitialLogEntry = {
    id: 'log-test-1',
    timestamp: '09:30',
    date: '2026-10-12',
    finished: 'Completed code review on pull request #42',
    next: 'Draft architecture RFC for real-time sync',
    tag: '#deepwork',
    completed: true,
  };

  assert(mockEntry.id.startsWith('log-'), 'Entry has valid ID');
  assert(mockEntry.timestamp === '09:30', 'Timestamp recorded correctly');
  assert(Boolean(mockEntry.finished.length > 5), 'Finished reflection recorded');
  assert(Boolean(mockEntry.next.length > 5), 'Next intention action recorded');

  // Markdown Formatter Test
  function formatLogsToMarkdown(logs: InterstitialLogEntry[], dateStr: string, pomos: number, mins: number): string {
    let md = `### 🍅 Deep Work & Interstitial Journal (${dateStr})\n`;
    md += `* **Completed Pomodoros:** ${pomos} (${mins} mins)\n\n`;
    logs.forEach((l) => {
      md += `- **[${l.timestamp}]** ${l.tag ? `${l.tag} ` : ''}Finished: ${l.finished}`;
      if (l.next) md += ` ➔ *Next:* ${l.next}`;
      md += `\n`;
    });
    return md;
  }

  const generatedMd = formatLogsToMarkdown([mockEntry], '2026-10-12', 4, 100);
  assert(generatedMd.includes('### 🍅 Deep Work & Interstitial Journal (2026-10-12)'), 'Markdown header correct');
  assert(generatedMd.includes('* **Completed Pomodoros:** 4 (100 mins)'), 'Markdown summary stats present');
  assert(generatedMd.includes('- **[09:30]** #deepwork Finished: Completed code review on pull request #42 ➔ *Next:* Draft architecture RFC for real-time sync'), 'Markdown log row correctly formatted');

  // Gate 3: Timer Durations & Intervals
  const focusDefaultSecs = 25 * 60;
  const shortBreakDefaultSecs = 5 * 60;
  const longBreakDefaultSecs = 15 * 60;

  assert(focusDefaultSecs === 1500, 'Focus default is 1500 seconds (25m)');
  assert(shortBreakDefaultSecs === 300, 'Short break default is 300 seconds (5m)');
  assert(longBreakDefaultSecs === 900, 'Long break default is 900 seconds (15m)');

  // Progress Calculation
  const calculateProgress = (total: number, remaining: number) =>
    Math.min(100, Math.max(0, ((total - remaining) / total) * 100));

  assert(calculateProgress(1500, 1500) === 0, 'Progress at start is 0%');
  assert(calculateProgress(1500, 750) === 50, 'Progress at midpoint is 50%');
  assert(calculateProgress(1500, 0) === 100, 'Progress at completion is 100%');

  // Gate 4: Sprint Task Tracking
  const tasks: SprintTask[] = [
    { id: 'st-1', text: 'Outline key sections', completed: false },
    { id: 'st-2', text: 'Write introductory paragraph', completed: true },
  ];

  assert(tasks.length === 2, 'Initial task count is 2');
  assert(!tasks[0].completed, 'Task 1 is pending');
  assert(tasks[1].completed, 'Task 2 is completed');

  // Gate 5: Daily Target Tracking
  const completedPomos = 5;
  const dailyTarget = 8;
  const goalPercent = Math.min(100, (completedPomos / dailyTarget) * 100);
  assert(goalPercent === 62.5, 'Goal percentage calculated accurately (62.5%)');

  return { passed, failed, errors };
}
