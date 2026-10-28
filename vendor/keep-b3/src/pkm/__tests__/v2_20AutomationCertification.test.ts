/**
 * PKM V2.20 — Automation, Scheduling, Recurrence & Proactive Workflow Certification Test Suite
 */

import {
  AutomationCertificationEngineV2,
  AdvancedRecurrenceEngineV2,
  v2AutomationEngine,
  V2AutomationEngine,
  habitEngineV2,
  routineCoordinatorV2,
  reminderCoordinatorV2,
  AutomationSecurityEngineV2,
  V2AutomationRule,
} from '../v2';
import { v2ActionRegistry } from '../v2/core/actions/actionSystem';

export function runV220AutomationCertificationTests(): boolean {
  console.log('--- Starting V2.20 Automation & Temporal Certification Tests ---');

  let allTestsPassed = true;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      allTestsPassed = false;
    }
  }

  // 1. Recurrence RFC 5545 calculation
  const nextMonthEnd = AdvancedRecurrenceEngineV2.computeNextOccurrence('2026-01-31', {
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: 31,
    monthEndPolicy: 'clamp_to_last_day',
  });
  assert(nextMonthEnd === '2026-02-28', 'Month-end clamping Jan 31 -> Feb 28', nextMonthEnd);

  const nextLeap = AdvancedRecurrenceEngineV2.computeNextOccurrence('2024-02-29', {
    frequency: 'yearly',
    interval: 1,
  });
  assert(nextLeap === '2025-02-28', 'Yearly leap Feb 29 on non-leap year -> Feb 28', nextLeap);

  // 2. Safe Date Noon Peeking
  const dSafe = AdvancedRecurrenceEngineV2.createSafeDate('2026-09-14');
  assert(dSafe.getHours() === 12, 'Safe date noon construction', `${dSafe.getHours()} hrs`);

  // 3. Advance policies
  const fromSched = AdvancedRecurrenceEngineV2.computeNextOccurrence('2026-09-01', {
    frequency: 'weekly',
    interval: 1,
    advancePolicy: 'from_schedule',
  }, { completionDate: '2026-09-05', policyOverride: 'from_schedule' });
  assert(fromSched === '2026-09-08', 'Weekly from_schedule cadence', fromSched);

  const fromComp = AdvancedRecurrenceEngineV2.computeNextOccurrence('2026-09-01', {
    frequency: 'weekly',
    interval: 1,
    advancePolicy: 'from_completion',
  }, { completionDate: '2026-09-05', policyOverride: 'from_completion' });
  assert(fromComp === '2026-09-12', 'Weekly from_completion cadence', fromComp);

  // 4. Bounded Window Occurrences
  const instances = AdvancedRecurrenceEngineV2.expandOccurrencesInWindow(
    'task-bound',
    'task',
    'Morning Routine',
    { frequency: 'daily', interval: 1 },
    '2026-09-01',
    '2026-09-01',
    '2026-09-05'
  );
  assert(instances.length === 5, 'Bounded window generates exactly 5 occurrences', `count=${instances.length}`);

  // 5. Habit Streaks with Freeze Days
  habitEngineV2.registerHabit({
    id: 'habit-cert-test',
    name: 'Cert Test Habit',
    frequency: 'daily',
    iconName: 'Activity',
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  habitEngineV2.logHabit('habit-cert-test', '2026-09-01', 1);
  habitEngineV2.logHabit('habit-cert-test', '2026-09-02', 1);
  habitEngineV2.logHabit('habit-cert-test', '2026-09-03', 0, { isFreezeOrGrace: true });
  habitEngineV2.logHabit('habit-cert-test', '2026-09-04', 1);
  const habitStats = habitEngineV2.calculateStats('habit-cert-test', '2026-09-04');
  assert(habitStats.currentStreak === 4, 'Habit streak maintains across freeze day', `streak=${habitStats.currentStreak}`);

  // 6. Routine Interactive Run
  const rRun = routineCoordinatorV2.startRun('routine-morning-kickoff', '2026-09-14');
  assert(rRun.routineId === 'routine-morning-kickoff', 'Routine run session initialized', rRun.id);
  const rStep1 = routineCoordinatorV2.toggleStep(rRun.id, 'step-1', true);
  assert(rStep1.stepStates['step-1'] === true, 'Routine step 1 checked');

  // 7. Reminder Snooze
  reminderCoordinatorV2.registerReminder({
    id: 'rem-cert-1',
    resourceId: 't-1',
    resourceType: 'task',
    title: 'Reminder Test',
    dueDateOnly: '2026-09-14',
    dueDateTimeIso: new Date().toISOString(),
    status: 'pending',
    snoozeCount: 0,
  });
  const snoozed = reminderCoordinatorV2.snoozeReminder('rem-cert-1', '15_minutes');
  assert(snoozed.status === 'snoozed' && snoozed.snoozeCount === 1, 'Reminder snoozed 15 mins');

  // 8. Security Rule Validation
  const badRule: V2AutomationRule = {
    id: 'bad-1',
    name: 'Bad Shell Rule',
    enabled: true,
    status: 'active',
    trigger: { type: 'resource_created' },
    conditionTree: { logicalOperator: 'AND', conditions: [] },
    actions: [{ id: 'a1', actionId: 'sys:exec', actionClass: 'exec_eval' as any, params: {} }],
    consecutiveFailures: 0,
    executionCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const sec = AutomationSecurityEngineV2.validateRuleSecurity(badRule);
  assert(!sec.valid, 'Security engine rejects illegal action classes');

  // 9. Run the 18 Full Automation Certification Quality Gates
  console.log('--- Executing All 18 Quality Gates ---');
  AutomationCertificationEngineV2.runAllGates().then((report) => {
    assert(report.allPassed, 'All 18 Quality Gates Passed for V2.20 Certification', `${report.passedGates}/${report.totalGates} passing`);
  });

  return allTestsPassed;
}
