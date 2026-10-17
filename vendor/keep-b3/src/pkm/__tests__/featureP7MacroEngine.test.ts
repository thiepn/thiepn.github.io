import { commandRegistry } from '../commands/commandRegistry';
import {
  MacroDefinition,
  DEFAULT_MACROS,
  MACRO_STORAGE_KEY,
  executeMacro,
  MacroExecutionContext,
} from '../macros/macroTypes';

export async function runFeatureP7MacroEngineTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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
  const cmd = commandRegistry.getCommand('tools:macro-automation');
  assert(Boolean(cmd), 'tools:macro-automation command is registered in commandRegistry');
  assert(Boolean(cmd?.title.includes('Macro')), 'Command title includes "Macro"');
  assert(cmd?.shortcut === 'Alt+Y', 'Command shortcut is Alt+Y');
  assert(Boolean(cmd?.keywords.includes('pipeline')), 'Keywords include pipeline');
  assert(Boolean(cmd?.keywords.includes('p7')), 'Keywords include p7');

  // Gate 2: Default Macros Invariant
  assert(DEFAULT_MACROS.length >= 4, 'Includes at least 4 default curated macros');
  assert(DEFAULT_MACROS.some((m) => m.id === 'macro-morning-ritual'), 'Includes morning startup ritual');
  assert(DEFAULT_MACROS.some((m) => m.id === 'macro-meeting-debrief'), 'Includes rapid meeting debrief');
  assert(DEFAULT_MACROS.some((m) => m.id === 'macro-zettel-extraction'), 'Includes zettelkasten launch');
  assert(DEFAULT_MACROS.some((m) => m.id === 'macro-evening-shutdown'), 'Includes evening shutdown reflection');

  // Gate 3: Sequential Execution Flow
  const executionOrder: string[] = [];
  const mockContext: MacroExecutionContext = {
    createNote: async (title, content, tags) => {
      executionOrder.push(`create_note:${title}`);
    },
    appendDailyNote: async (content) => {
      executionOrder.push('append_daily');
    },
    openModal: (modalName) => {
      executionOrder.push(`open_modal:${modalName}`);
    },
    playSound: () => {
      executionOrder.push('play_sound');
    },
    fireConfetti: () => {
      executionOrder.push('fire_confetti');
    },
  };

  const testMacro: MacroDefinition = {
    id: 'test-macro',
    name: 'Multi-Step Test Pipeline',
    description: 'Test sequence of actions',
    icon: 'Zap',
    createdAt: new Date().toISOString(),
    steps: [
      { id: 's1', action: 'append_daily', params: { content: 'test note log' } },
      { id: 's2', action: 'create_note', params: { title: 'Project Kickoff' } },
      { id: 's3', action: 'open_modal', params: { modalName: 'pomodoro_flow' } },
      { id: 's4', action: 'play_sound', params: {} },
    ],
  };

  const result = await executeMacro(testMacro, mockContext);
  assert(result.success === true, 'Macro executes successfully');
  assert(result.stepsExecuted === 4, 'All 4 steps executed');
  assert(executionOrder[0] === 'append_daily', 'Step 1 append_daily executed first');
  assert(executionOrder[1] === 'create_note:Project Kickoff', 'Step 2 create_note executed second');
  assert(executionOrder[2] === 'open_modal:pomodoro_flow', 'Step 3 open_modal executed third');
  assert(executionOrder[3] === 'play_sound', 'Step 4 play_sound executed fourth');

  // Gate 4: Fault Tolerance & Error Trapping
  const failingContext: MacroExecutionContext = {
    ...mockContext,
    createNote: async () => {
      throw new Error('Disk quota full');
    },
  };

  const failMacro: MacroDefinition = {
    id: 'fail-macro',
    name: 'Failing Pipeline',
    description: 'Test error trapping',
    icon: 'Zap',
    createdAt: new Date().toISOString(),
    steps: [
      { id: 'f1', action: 'create_note', params: { title: 'Broken' } },
      { id: 'f2', action: 'play_sound', params: {} },
    ],
  };

  const failResult = await executeMacro(failMacro, failingContext);
  assert(failResult.success === false, 'Detects error gracefully');
  assert(Boolean(failResult.error?.includes('Disk quota full')), 'Captures error message in execution result');
  assert(failResult.stepsExecuted === 0, 'Halts further execution upon step failure');

  // Gate 5: Storage Key Invariant
  assert(MACRO_STORAGE_KEY === 'pkm_user_macros_v1', 'Storage key matches constant');

  return { passed, failed, errors };
}
