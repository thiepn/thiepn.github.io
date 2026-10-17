/**
 * PKM V2.3 — Comprehensive Workflow, Temporal & Planning Certification Test Suite
 */

import {
  computeNextOccurrenceDateV2,
  expandRecurrenceInstancesInWindow,
  addDaysDateOnly,
  isLeapYear,
  getDaysInMonth,
} from '../v2/temporal/recurrenceEngineV2';
import { generateOccurrenceId } from '../v2/temporal/temporalTypes';
import { TemporalIndexV2 } from '../v2/temporal/temporalIndex';
import { TodayEngineV2 } from '../v2/temporal/todayEngineV2';
import { AgendaEngineV2 } from '../v2/temporal/agendaEngineV2';
import { ActionSequenceExecutor } from '../v2/workflows/actionSequenceExecutor';
import { RoutineEngineV2 } from '../v2/workflows/routineEngineV2';
import { AutomationEngineV2 } from '../v2/workflows/automationEngineV2';
import { PlanTodayWorkflowEngine } from '../v2/planning/planTodayWorkflow';
import { AIPlanProposalEngine } from '../v2/planning/aiPlanProposal';
import { ReviewEngineV2 } from '../v2/review/reviewEngineV2';
import { ReminderEngineV2 } from '../v2/reminders/reminderEngineV2';
import { v2ActionRegistry } from '../v2/core/actions/actionSystem';

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

export async function runV2_3WorkflowCertificationTests(): Promise<TestResult> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
    }
  }

  // =========================================================================
  // SETUP ACTION REGISTRY DUMMIES FOR TEST
  // =========================================================================
  v2ActionRegistry.register({
    id: 'core:create-note',
    label: 'Create Note',
    description: 'Create a test note',
    category: 'edit',
    risk: 'safe',
    undoable: false,
    handler: async (payload: any) => ({
      success: true,
      actionId: 'core:create-note',
      timestamp: Date.now(),
      data: { id: 'note_test_1', title: payload?.title || 'Test Note' },
    }),
  });

  // =========================================================================
  // 1. RECURRENCE ENGINE V2 & RFC 5545 ALIGNMENT
  // =========================================================================
  try {
    // 1.1 Daily interval
    const d1 = computeNextOccurrenceDateV2('2026-09-12', { frequency: 'daily', interval: 1 });
    assert(d1 === '2026-09-13', `Daily interval 1 failed: expected 2026-09-13, got ${d1}`);

    const d2 = computeNextOccurrenceDateV2('2026-09-12', { frequency: 'daily', interval: 3 });
    assert(d2 === '2026-09-15', `Daily interval 3 failed: expected 2026-09-15, got ${d2}`);

    // 1.2 Weekdays only (skip Sat/Sun)
    // 2026-09-11 is Friday, next weekday must be Monday 2026-09-14
    const wd1 = computeNextOccurrenceDateV2('2026-09-11', { frequency: 'weekdays', interval: 1 });
    assert(wd1 === '2026-09-14', `Weekdays next from Friday failed: expected 2026-09-14, got ${wd1}`);

    // 1.3 Monthly with 31st clamp
    // Jan 31st + 1 month in 2026 (non-leap) -> Feb 28th
    const m1 = computeNextOccurrenceDateV2('2026-01-31', {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 31,
      monthEndPolicy: 'clamp_to_last_day',
    });
    assert(m1 === '2026-02-28', `Monthly 31st clamp in Feb failed: expected 2026-02-28, got ${m1}`);

    // Mar 31st + 1 month -> Apr 30th
    const m2 = computeNextOccurrenceDateV2('2026-03-31', {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 31,
      monthEndPolicy: 'clamp_to_last_day',
    });
    assert(m2 === '2026-04-30', `Monthly 31st clamp in Apr failed: expected 2026-04-30, got ${m2}`);

    // 1.4 Yearly with leap year Feb 29th
    assert(isLeapYear(2028), '2028 must be leap year');
    assert(!isLeapYear(2029), '2029 must NOT be leap year');
    const y1 = computeNextOccurrenceDateV2('2028-02-29', { frequency: 'yearly', interval: 1 });
    assert(y1 === '2029-02-28', `Yearly Feb 29 -> non-leap year clamp failed: expected 2029-02-28, got ${y1}`);

    // 1.5 Advancement policy: from_schedule vs from_completion
    const schedNext = computeNextOccurrenceDateV2(
      '2026-09-01',
      { frequency: 'weekly', interval: 1, advancePolicy: 'from_schedule' },
      { completionDate: '2026-09-10' }
    );
    assert(schedNext === '2026-09-08', `from_schedule advance failed: expected 2026-09-08, got ${schedNext}`);

    const compNext = computeNextOccurrenceDateV2(
      '2026-09-01',
      { frequency: 'weekly', interval: 1, advancePolicy: 'from_completion' },
      { completionDate: '2026-09-10' }
    );
    assert(compNext === '2026-09-17', `from_completion advance failed: expected 2026-09-17, got ${compNext}`);

    // 1.6 Bounded window expansion
    const instances = expandRecurrenceInstancesInWindow(
      'task_recurr_1',
      'task',
      'Weekly Team Sync',
      { frequency: 'weekly', interval: 1 },
      '2026-09-01',
      '2026-09-01',
      '2026-09-30'
    );
    assert(instances.length === 5, `Expected 5 weekly instances in Sep 2026, got ${instances.length}`);
    assert(instances[0].occurrenceId.includes('2026-09-01'), 'First instance occurrence ID mismatch');

    // 1.7 Stable Occurrence ID
    const occId = generateOccurrenceId('task_123', 2, '2026-09-15', '10:00');
    assert(occId === 'task_123_v2_2026-09-15_1000', `Occurrence ID mismatch: ${occId}`);
  } catch (err: any) {
    failed++;
    errors.push(`Recurrence Engine test failure: ${err.message}`);
  }

  // =========================================================================
  // 2. TEMPORAL INDEX V2
  // =========================================================================
  try {
    const tempIndex = new TemporalIndexV2();

    tempIndex.indexProjection({
      id: 'proj_t1_due',
      resourceId: 't1',
      resourceType: 'task',
      title: 'Finish Architecture Document',
      field: 'due',
      dateOnly: '2026-09-12',
      isAllDay: true,
      completed: false,
    });

    tempIndex.indexProjection({
      id: 'proj_t1_sched',
      resourceId: 't1',
      resourceType: 'task',
      title: 'Finish Architecture Document',
      field: 'scheduled',
      dateOnly: '2026-09-12',
      time: '14:00',
      isAllDay: false,
      completed: false,
    });

    tempIndex.indexProjection({
      id: 'proj_t2_overdue',
      resourceId: 't2',
      resourceType: 'task',
      title: 'Triage Old Security Bug',
      field: 'due',
      dateOnly: '2026-09-01',
      isAllDay: true,
      completed: false,
    });

    const todayItems = tempIndex.getForDate('2026-09-12');
    assert(todayItems.length === 2, `TemporalIndex getForDate failed: expected 2, got ${todayItems.length}`);

    const overdue = tempIndex.getOverdue('2026-09-12');
    assert(overdue.length === 1 && overdue[0].resourceId === 't2', 'Overdue query failed');

    // Resource invalidation
    tempIndex.invalidateResource('t1');
    assert(tempIndex.getForDate('2026-09-12').length === 0, 'Resource invalidation failed');
  } catch (err: any) {
    failed++;
    errors.push(`TemporalIndex test failure: ${err.message}`);
  }

  // =========================================================================
  // 3. TODAY & AGENDA DERIVED ENGINES
  // =========================================================================
  try {
    const tempIndex = new TemporalIndexV2();
    tempIndex.indexProjection({
      id: 'proj_t1_due',
      resourceId: 'task_alpha',
      resourceType: 'task',
      title: 'Dual Scheduled & Due Task',
      field: 'due',
      dateOnly: '2026-09-12',
      isAllDay: false,
      completed: false,
    });
    tempIndex.indexProjection({
      id: 'proj_t1_sched',
      resourceId: 'task_alpha',
      resourceType: 'task',
      title: 'Dual Scheduled & Due Task',
      field: 'scheduled',
      dateOnly: '2026-09-12',
      time: '11:00',
      isAllDay: false,
      completed: false,
    });

    const todayEngine = new TodayEngineV2();
    const todayState = todayEngine.evaluateToday(tempIndex, { todayDate: '2026-09-12' });

    // Deduplication check: task_alpha appears ONCE with both indicators true
    assert(todayState.items.length === 1, `Today deduplication failed: expected 1 item, got ${todayState.items.length}`);
    const item = todayState.items[0];
    assert(item.isDueToday === true, 'isDueToday indicator mismatch');
    assert(item.isScheduledToday === true, 'isScheduledToday indicator mismatch');
    assert(item.time === '11:00', 'Scheduled time preserved');

    // Agenda Engine check
    const agendaEngine = new AgendaEngineV2();
    const agendaDays = agendaEngine.generateAgenda(tempIndex, {
      startDate: '2026-09-12',
      todayDate: '2026-09-12',
      horizonDays: 7,
    });
    assert(agendaDays.length === 7, `Agenda horizon days count failed: expected 7, got ${agendaDays.length}`);
    assert(agendaDays[0].isToday === true, 'Agenda first day isToday mismatch');
  } catch (err: any) {
    failed++;
    errors.push(`Today & Agenda Engine test failure: ${err.message}`);
  }

  // =========================================================================
  // 4. ACTION SEQUENCES, ROUTINES & AUTOMATIONS
  // =========================================================================
  try {
    // 4.1 Action Sequence Executor bounds & safety
    const executor = new ActionSequenceExecutor();
    const stepRes = await executor.executeSequence('test_seq', 'Test Sequence', [
      { actionId: 'core:create-note', label: 'Create Note', args: { title: 'Test Note' } },
    ]);
    assert(stepRes.totalSteps === 1, 'Step count mismatch');

    // 4.2 Max steps enforcement
    const oversizedSteps = Array(15).fill({ actionId: 'core:create-note', label: 'Step' });
    const overRes = await executor.executeSequence('over_seq', 'Oversized', oversizedSteps);
    assert(overRes.success === false, 'Oversized step sequence must fail');

    // 4.3 Routine Engine
    const routineEngine = new RoutineEngineV2();
    const run = routineEngine.startRun('routine-morning-planning', '2026-09-12');
    assert(run.routineId === 'routine-morning-planning', 'Routine startRun mismatch');

    const updatedRun = await routineEngine.toggleStep(run.id, 'step-1');
    assert(updatedRun.stepStates['step-1'] === true, 'Routine step toggle failed');

    // 4.4 Automation Engine loop prevention & safe actions
    const autoEngine = new AutomationEngineV2();
    autoEngine.registerRule({
      id: 'auto_test_rule',
      name: 'Test Task Completed Handler',
      enabled: true,
      status: 'active',
      trigger: { type: 'task_completed' },
      conditionGroup: 'ALL',
      conditions: [{ id: 'c1', field: 'priority', operator: 'equals', value: 'High' }],
      actions: [
        {
          actionId: 'core:create-note',
          actionClass: 'create_note',
          params: { title: 'High Priority Finished' },
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Dispatch matching event
    const logs = await autoEngine.dispatchEvent({
      type: 'task_completed',
      resourceId: 'task_high_1',
      resourceType: 'task',
      propertyKey: 'priority',
      propertyValue: 'High',
      timestamp: Date.now(),
      executionChainDepth: 0,
    }, { priority: 'High' });

    assert(logs.length === 1, `Automation dispatch failed: expected 1 log, got ${logs.length}`);
    assert(logs[0].status === 'success', `Automation execution status: ${logs[0].status}`);

    // Loop prevention test (chain depth >= 3)
    const loopLogs = await autoEngine.dispatchEvent({
      type: 'task_completed',
      resourceId: 'task_high_1',
      timestamp: Date.now(),
      executionChainDepth: 3,
    }, { priority: 'High' });
    assert(loopLogs.length === 1 && loopLogs[0].status === 'loop_prevented', 'Loop prevention chain depth check failed');
  } catch (err: any) {
    failed++;
    errors.push(`Workflows & Automation test failure: ${err.message}`);
  }

  // =========================================================================
  // 5. PLANNING, REVIEWS & REMINDERS
  // =========================================================================
  try {
    // 5.1 Plan Today Workflow
    const planEngine = new PlanTodayWorkflowEngine();
    const plan = planEngine.addFocusItem('2026-09-12', {
      resourceId: 'proj_alpha',
      resourceType: 'project',
      title: 'Antigravity Architecture',
    });
    assert(plan.focusItems.length === 1, 'Focus item addition failed');

    // 5.2 AI Plan Proposal (Proposal-only verification)
    const aiEngine = new AIPlanProposalEngine();
    const proposal = aiEngine.generateProposal([
      { id: 't_top', title: 'Critical Bugfix', priority: 'urgent', due: '2026-09-12' },
    ], '2026-09-12');
    assert(proposal.proposedFocus.length === 1, 'AI proposal generation failed');
    assert(proposal.proposedFocus[0].resourceId === 't_top', 'AI proposed top priority task');

    // 5.3 Review Engine
    const reviewEngine = new ReviewEngineV2();
    const rev = reviewEngine.startReview('template-weekly-review', {
      periodStart: '2026-09-05',
      periodEnd: '2026-09-12',
    });
    assert(rev.type === 'weekly', 'Review type mismatch');
    const updatedRev = reviewEngine.updateResponse(rev.id, 'p1', 'Major milestone completed');
    assert(updatedRev.promptResponses['p1'] === 'Major milestone completed', 'Review prompt update failed');

    // 5.4 Reminder Engine: Snooze vs Reschedule separation
    const remEngine = new ReminderEngineV2();
    const rem = remEngine.setReminder('t_rem', 'task', 'Meeting', '2026-09-12', '10:00');
    assert(rem.triggerTime === '10:00', 'Reminder set failed');

    const snoozed = remEngine.snoozeReminder(rem.id, 15);
    assert(snoozed.status === 'snoozed' && !!snoozed.snoozedUntil, 'Reminder snooze failed');
  } catch (err: any) {
    failed++;
    errors.push(`Planning, Review & Reminders test failure: ${err.message}`);
  }

  return { passed, failed, errors };
}
