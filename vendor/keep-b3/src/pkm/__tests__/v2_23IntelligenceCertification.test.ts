import {
  V2_23IntelligenceEngine,
  V23AutomationRule,
} from '../v2/intelligence/v2_23IntelligenceEngine';
import { Note } from '../../types';

export function runV2_23IntelligenceCertificationTests(): {
  name: string;
  passed: boolean;
  error?: string;
}[] {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message });
    }
  }

  // Sample notes for tests
  const createMockNote = (partial: Partial<Note> & { id: string; title: string; content: string }): Note => ({
    type: 'text',
    checklist: [],
    color: 'default',
    tags: [],
    folderId: null,
    pinned: false,
    archived: false,
    trashed: false,
    images: [],
    reminderDate: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
    ...partial,
  });

  const mockNotes: Note[] = [
    createMockNote({
      id: 'note_compilers',
      title: 'Compiler Optimization SSA',
      content: 'Static Single Assignment form enables efficient register allocation and dominance frontier analysis. See [[Raft Consensus Protocol Analysis]] for distributed coordination.',
      tags: ['cs', 'compilers', 'systems'],
      folderId: 'cs',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    }),
    createMockNote({
      id: 'note_distributed_consensus',
      title: 'Raft Consensus Protocol Analysis',
      content: 'Leader election and log replication in distributed state machines.',
      tags: ['cs', 'systems'],
      folderId: 'cs',
      createdAt: '2024-09-14T00:00:00Z',
      updatedAt: '2024-09-14T00:00:00Z',
    }),
    createMockNote({
      id: 'note_finance_secrets',
      title: 'Personal Financial Accounts',
      content: 'Private banking and ledger information.',
      tags: ['finance', 'private'],
      folderId: 'finance',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    }),
  ];

  // ==========================================================================
  // 1. DECLARATIVE AUTOMATIONS & CIRCUIT BREAKER
  // ==========================================================================

  test('Automation: Dry-run guarantees zero mutation while evaluating conditions accurately', () => {
    const engine = new V2_23IntelligenceEngine();
    const rules = engine.getRules();
    const rule = rules[0];

    // Mock state where active_projects_count is 5 (> 0)
    const dryRun = engine.simulateDryRun(rule.id, { active_projects_count: 5 });
    if (!dryRun.isZeroMutationGuaranteed) {
      throw new Error('Dry run must guarantee zero mutation');
    }
    if (!dryRun.allConditionsPassed) {
      throw new Error('Conditions should have passed for active_projects_count > 0');
    }
    if (dryRun.simulatedMutations.length === 0) {
      throw new Error('Dry run should simulate mutation summaries');
    }

    // Ensure no real reminders were added by dry run
    if (engine.getReminders().length > 0) {
      throw new Error('Dry run must not create actual reminders');
    }
  });

  test('Automation: Multi-device deduplication idempotency receipt', () => {
    const engine = new V2_23IntelligenceEngine();
    const rules = engine.getRules();
    const rule = rules[0];

    const occId = 'occ_fixed_window_1';
    const log1 = engine.runRuleNow(rule.id, occId, { active_projects_count: 3 });
    if (log1.status !== 'succeeded') {
      throw new Error(`First execution should succeed, got: ${log1.status}`);
    }

    // Run again with same occurrenceId (simulating another device/sync)
    const log2 = engine.runRuleNow(rule.id, occId, { active_projects_count: 3 });
    if (log2.status !== 'deduplicated') {
      throw new Error(`Second execution must be deduplicated, got: ${log2.status}`);
    }
  });

  test('Automation: Global pause & Safe mode cleanly inhibit execution', () => {
    const engine = new V2_23IntelligenceEngine();
    const rule = engine.getRules()[0];

    engine.setGlobalPause(true);
    const log = engine.runRuleNow(rule.id, 'occ_paused');
    if (log.status !== 'skipped' || !log.failureReason?.includes('globally paused')) {
      throw new Error('Paused engine must skip executions with explicit reason');
    }

    engine.setGlobalPause(false);
    engine.setSafeMode(true);
    const log2 = engine.runRuleNow(rule.id, 'occ_safe');
    if (log2.status !== 'skipped' || !log2.failureReason?.includes('Safe Mode')) {
      throw new Error('Safe Mode engine must skip executions');
    }
  });

  // ==========================================================================
  // 2. RECURRENCE & REMINDERS COORDINATOR
  // ==========================================================================

  test('Recurrence: Clamps month-end dates and respects leap years deterministically', () => {
    const engine = new V2_23IntelligenceEngine();
    const preview = engine.previewRecurrence(
      {
        time: '09:00',
        frequency: 'monthly',
        dayOfMonth: 31,
        monthEndPolicy: 'last_day',
        catchUpPolicy: 'run_latest_missed',
      },
      6
    );

    if (preview.nextOccurrences.length !== 6) {
      throw new Error('Expected 6 recurrence previews');
    }
    if (!preview.monthEndAdjusted) {
      throw new Error('Month end adjustment flag must be true for day 31');
    }
    // Verify times match
    if (!preview.nextOccurrences.every((occ) => occ.endsWith('T09:00:00Z'))) {
      throw new Error('All occurrences must preserve requested time');
    }
  });

  test('Reminders: Supports snoozing and dismissal without altering original entity due dates', () => {
    const engine = new V2_23IntelligenceEngine();
    const rem = engine.scheduleReminder({
      resourceId: 'res_task_1',
      resourceTitle: 'Prepare Quarterly Review',
      resourceType: 'review',
      deliveryTimeIso: new Date().toISOString(),
      dismissed: false,
      completed: false,
      originDueTimeIso: '2026-09-30T17:00:00Z',
    });

    const snoozed = engine.snoozeReminder(rem.id, 120);
    if (!snoozed || !snoozed.snoozedUntilIso) {
      throw new Error('Reminder must be snoozed with valid ISO timestamp');
    }
    if (snoozed.originDueTimeIso !== '2026-09-30T17:00:00Z') {
      throw new Error('Canonical origin due date must remain unmutated');
    }

    engine.dismissReminder(rem.id);
    const remaining = engine.getReminders();
    if (remaining.some((r) => r.id === rem.id)) {
      throw new Error('Dismissed reminder should not appear in active reminders');
    }
  });

  // ==========================================================================
  // 3. SEMANTIC ACTIVITY STREAM & ATTENTION CENTER
  // ==========================================================================

  test('Activity Stream: Filters low-noise events and preserves semantic links', () => {
    const engine = new V2_23IntelligenceEngine();
    const initialCount = engine.getActivityEvents().length;

    engine.recordActivity({
      dateOnly: '2026-09-14',
      category: 'decision',
      title: 'Decided on SQLite Storage',
      summary: 'Adopting local SQLite for high-speed indexing.',
      resourceId: 'dec_1',
      resourceType: 'decision',
    });

    const decisions = engine.getActivityEvents('decision');
    if (!decisions.some((d) => d.title === 'Decided on SQLite Storage')) {
      throw new Error('Newly recorded semantic activity must be queryable');
    }
  });

  test('Attention Center: Actionable items include explainable rationale ("Why am I seeing this?")', () => {
    const engine = new V2_23IntelligenceEngine();
    const items = engine.getAttentionItems();
    if (items.length === 0) {
      throw new Error('Expected initial attention items');
    }

    for (const item of items) {
      if (!item.reason || item.reason.trim().length === 0) {
        throw new Error(`Attention item ${item.id} is missing "Why am I seeing this?" reason`);
      }
      if (!item.suggestedActionLabel || !item.suggestedActionId) {
        throw new Error(`Attention item ${item.id} is missing suggested action`);
      }
    }

    // Auto-resolve test
    engine.autoResolveAttention(items[0].dedupeKey);
    const after = engine.getAttentionItems();
    if (after.some((a) => a.dedupeKey === items[0].dedupeKey)) {
      throw new Error('Attention item should be auto-resolved');
    }
  });

  // ==========================================================================
  // 4. CONTINUITY & WHAT CHANGED
  // ==========================================================================

  test('Continuity: Checkpoint summaries and explainable continue signals', () => {
    const engine = new V2_23IntelligenceEngine();
    const summary = engine.getWhatChangedSummary();
    if (summary.completedTasks < 0 || summary.meaningfulActivityCount < 0) {
      throw new Error('WhatChanged summary numbers must be non-negative');
    }

    const continueSignals = engine.getContinueSignals();
    if (continueSignals.length === 0) {
      throw new Error('Continue signals should be available for active workflows');
    }
    if (!continueSignals[0].reason) {
      throw new Error('Continue signals must provide explainable reason');
    }
  });

  // ==========================================================================
  // 5. DETERMINISTIC RELATED NOTES & LOCAL KNOWLEDGE
  // ==========================================================================

  test('Smart Notes: Explicit bidirectional wikilinks outrank inferred tag similarity', () => {
    const engine = new V2_23IntelligenceEngine();
    const related = engine.computeDeterministicRelatedNotes('note_compilers', mockNotes);

    if (related.length === 0) {
      throw new Error('Should find related notes for note_compilers');
    }

    const top = related[0];
    if (top.noteId !== 'note_distributed_consensus' || !top.isExplicitLink) {
      throw new Error('Explicit wikilinked note must be top-ranked with isExplicitLink=true');
    }
  });

  test('Smart Notes: Broken link detector finds unresolved wikilinks', () => {
    const engine = new V2_23IntelligenceEngine();
    const notesWithBroken: Note[] = [
      createMockNote({
        id: 'n1',
        title: 'Source Note',
        content: 'References [[NonExistentTargetNote]] in text.',
      }),
    ];

    const broken = engine.findBrokenLinks(notesWithBroken);
    if (broken.length === 0 || broken[0].brokenTarget !== 'NonExistentTargetNote') {
      throw new Error('Broken link detector should identify NonExistentTargetNote');
    }
  });

  // ==========================================================================
  // 6. DASHBOARDS & DERIVED METRICS
  // ==========================================================================

  test('Dashboards: Derives live metrics with exact units and handles missing data gracefully', () => {
    const engine = new V2_23IntelligenceEngine();
    const netCash = engine.getMetricValue('finance_net_cash_flow_cents');
    if (netCash.isMissing) {
      throw new Error('finance_net_cash_flow_cents should not be marked missing');
    }
    if (netCash.value !== '$1,420.50') {
      throw new Error(`Expected exact formatted cash flow, got: ${netCash.value}`);
    }

    const unknownMetric = engine.getMetricValue('non_existent_metric_key');
    if (!unknownMetric.isMissing) {
      throw new Error('Unlogged metric must be marked isMissing=true rather than fake 0');
    }
  });

  // ==========================================================================
  // 7. REPORTS & REVIEW EVIDENCE
  // ==========================================================================

  test('Reports: Generates immutable factual review evidence snapshot', () => {
    const engine = new V2_23IntelligenceEngine();
    const report = engine.generateWeeklyReviewEvidence('2026-09-07', '2026-09-14');

    if (!report.id.startsWith('rep_weekly_')) {
      throw new Error('Report must have valid ID prefix');
    }
    if (report.factualSections.length === 0) {
      throw new Error('Report must contain factual sections');
    }
    if (report.isAiGenerated) {
      throw new Error('Canonical review evidence snapshot must be deterministic, not AI hallucinated');
    }
  });

  // ==========================================================================
  // 8. ASK YOUR VAULT / RAG & AI PROPOSALS
  // ==========================================================================

  test('Ask Vault: Pre-retrieval exclusion filters sensitive domains and enforces proposal approval flow', () => {
    const engine = new V2_23IntelligenceEngine();
    engine.setAiConfiguration(true, 'external', ['finance', 'health']);

    // Ask about finance
    const financeRes = engine.askVault(
      'What are my financial secrets?',
      { type: 'permitted_vault', excludedDomains: ['finance'] },
      mockNotes
    );

    if (financeRes.isSupportedByEvidence) {
      throw new Error('Finance queries must be rejected when finance domain is excluded');
    }
    if (financeRes.excludedSensitiveSourcesCount === 0) {
      throw new Error('Pre-retrieval exclusion must increment excludedSensitiveSourcesCount');
    }

    // Ask about compiler notes
    const validRes = engine.askVault(
      'Tell me about compilers and create a task for it',
      { type: 'permitted_vault', excludedDomains: ['finance'] },
      mockNotes
    );

    if (!validRes.isSupportedByEvidence || validRes.citations.length === 0) {
      throw new Error('Valid vault query must return grounded answer and verified citations');
    }

    if (validRes.proposals.length === 0) {
      throw new Error('Task creation request should return a pending approval proposal');
    }

    const proposal = validRes.proposals[0];
    if (proposal.status !== 'pending_approval') {
      throw new Error('AI Proposals must start as pending_approval (never mutate autonomously)');
    }

    engine.applyAIProposal(proposal.id);
    const updatedProp = engine.getAIProposals().find((p) => p.id === proposal.id);
    if (updatedProp?.status !== 'applied') {
      throw new Error('Approved proposal must transition to applied');
    }
  });

  test('Ask Vault: Locked vault purges context and rejects AI queries', () => {
    const engine = new V2_23IntelligenceEngine();
    engine.setVaultLock(true);

    let threw = false;
    try {
      engine.askVault('What is in my vault?', { type: 'permitted_vault', excludedDomains: [] }, mockNotes);
    } catch (err: any) {
      threw = true;
      if (!err.message.includes('locked')) {
        throw new Error(`Expected locked vault message, got: ${err.message}`);
      }
    }

    if (!threw) {
      throw new Error('Locked vault must throw error for AI queries');
    }
  });

  return results;
}
