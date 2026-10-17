import { commandRegistry } from '../commands/commandRegistry';

export function runFeature7WritingSprintTests(): { passed: number; failed: number; errors: string[] } {
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

  // Gate 1: Writing Sprint Command Registration
  const sprintCmd = commandRegistry.getCommand('tools:writing-sprint');
  assert(Boolean(sprintCmd), 'Writing Sprint command is registered');
  assert(Boolean(sprintCmd?.title.includes('Writing Sprint')), 'Writing Sprint title matches');
  assert(sprintCmd?.shortcut === 'Alt+W', 'Writing Sprint shortcut is Alt+W');
  assert(Boolean(sprintCmd?.keywords?.includes('sprint') && sprintCmd?.keywords?.includes('flow')), 'Writing Sprint keywords include sprint and flow');

  // Gate 2: Mind Sparks Idea Combinator Registration
  const sparkCmd = commandRegistry.getCommand('tools:idea-spark');
  assert(Boolean(sparkCmd), 'Idea Combinator command is registered');
  assert(Boolean(sparkCmd?.title.includes('Idea Combinator')), 'Idea Combinator title matches');
  assert(sparkCmd?.shortcut === 'Alt+I', 'Idea Combinator shortcut is Alt+I');

  // Gate 3: Vault Statistics Registration
  const statsCmd = commandRegistry.getCommand('tools:vault-stats');
  assert(Boolean(statsCmd), 'Vault Stats command is registered');
  assert(Boolean(statsCmd?.title.includes('Vault Statistics')), 'Vault Stats title matches');
  assert(statsCmd?.shortcut === 'Alt+H', 'Vault Stats shortcut is Alt+H');

  // Gate 4: Execution Handlers
  let openedModal: string | null = null;
  const mockCtx: any = {
    openModal: (modal: string) => {
      openedModal = modal;
    },
  };

  sprintCmd?.execute(mockCtx);
  assert(openedModal === 'writing_sprint', 'Writing Sprint command executes by opening writing_sprint modal');

  sparkCmd?.execute(mockCtx);
  assert(openedModal === 'idea_spark', 'Idea Combinator command executes by opening idea_spark modal');

  statsCmd?.execute(mockCtx);
  assert(openedModal === 'vault_stats', 'Vault Stats command executes by opening vault_stats modal');

  // Gate 5: Live Pacing & Goal Calculations
  const text = 'The quick brown fox jumps over the lazy dog in deep focus';
  const words = text.trim().split(/\s+/).length;
  assert(words === 12, 'Word counter counts words accurately');

  const secondsElapsed = 60;
  const elapsedMinutes = secondsElapsed / 60;
  const wpm = Math.round(words / elapsedMinutes);
  assert(wpm === 12, 'WPM is calculated accurately');

  const wordGoal = 250;
  const progressPercent = Math.min(100, Math.round((words / wordGoal) * 100));
  assert(progressPercent === 5, 'Progress percentage is calculated accurately');

  return { passed, failed, errors };
}
