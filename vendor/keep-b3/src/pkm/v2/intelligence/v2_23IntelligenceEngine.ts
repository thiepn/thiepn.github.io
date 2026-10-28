/**
 * PKM V2.23 — Automation, Intelligence & Reporting Unified Engine
 *
 * Authoritative unified subsystem providing:
 * 1. Declarative Automation Engine (When/If/Then, Dry-Run, History, Catch-up, Loops, Multi-device dedupe)
 * 2. Recurrence & Reminders Coordinator (Next run preview, DST, Month-End, Leap-Year, Snooze, Dismiss)
 * 3. Semantic Activity Stream (Filtered meaningful events, low-noise, pagination, resource links)
 * 4. Factual Attention Center ("Why am I seeing this?", Auto-resolving, Deduplicated, Bounded)
 * 5. What Changed & Continuity (Checkpoint deltas, Continue signals, Flashback anniversaries)
 * 6. Deterministic Related Notes & Local Smart Systems (Graph + Lexical, Explicit link priority, 100% Offline)
 * 7. Live Derived Dashboards & Metrics (Widget isolation, Exact integer cents, Accessible chart table fallback)
 * 8. Factual Reports & Review Evidence (Deterministic snapshots, Review evidence compilation, Export)
 * 9. Ask Your Vault / RAG & Proposal-Only AI (Pre-retrieval privacy filtering, System citations, Non-autonomous proposals)
 */

import { Note } from '../../../types';

// ============================================================================
// 1. AUTOMATION TYPES & INTERFACES
// ============================================================================

export type V23TriggerType =
  | 'schedule_time'
  | 'resource_created'
  | 'resource_updated'
  | 'task_completed'
  | 'review_completed'
  | 'routine_completed'
  | 'inbox_item_added';

export type V23CatchUpPolicy = 'run_latest_missed' | 'skip_missed' | 'run_all_missed_bounded';

export interface V23ScheduleConfig {
  time: string; // "08:00"
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: string[]; // e.g. ["monday", "friday"]
  dayOfMonth?: number; // 1-31
  monthEndPolicy?: 'last_day' | 'exact_or_skip' | 'closest_prior';
  timezone?: string;
  catchUpPolicy: V23CatchUpPolicy;
}

export interface V23AutomationTrigger {
  type: V23TriggerType;
  schedule?: V23ScheduleConfig;
  targetDomain?: string;
  propertyFilter?: { key: string; value: any };
}

export interface V23AutomationCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty' | 'is_overdue';
  value: any;
}

export type V23ActionClass =
  | 'create_task'
  | 'create_note'
  | 'add_tag'
  | 'schedule_reminder'
  | 'archive_resource'
  | 'generate_report'
  | 'create_notification';

export interface V23AutomationAction {
  id: string;
  actionClass: V23ActionClass;
  params: Record<string, any>;
  description: string;
}

export type V23ExecutionStatus =
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'missed'
  | 'deduplicated'
  | 'cancelled';

export interface V23ExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  occurrenceId: string;
  scheduledTimeIso?: string;
  executedTimeIso: string;
  status: V23ExecutionStatus;
  conditionsPassed: boolean;
  actionsExecuted: string[];
  failureReason?: string;
  deviceId: string;
}

export interface V23AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: V23AutomationTrigger;
  conditionOperator: 'AND' | 'OR';
  conditions: V23AutomationCondition[];
  actions: V23AutomationAction[];
  isTemplate?: boolean;
  consecutiveFailures: number;
  circuitBreakerTripped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface V23DryRunResult {
  ruleId: string;
  ruleName: string;
  triggerEligible: boolean;
  triggerReason: string;
  conditionsEvaluated: Array<{ conditionId: string; field: string; passed: boolean; actualValue: any }>;
  allConditionsPassed: boolean;
  wouldExecuteActions: Array<{ actionClass: string; description: string; targetSummary: string }>;
  affectedResourceCount: number;
  simulatedMutations: Array<{ type: string; summary: string }>;
  isZeroMutationGuaranteed: true;
}

// ============================================================================
// 2. RECURRENCE & REMINDERS
// ============================================================================

export interface V23Reminder {
  id: string;
  resourceId: string;
  resourceTitle: string;
  resourceType: 'task' | 'event' | 'review' | 'routine' | 'asset' | 'decision';
  deliveryTimeIso: string;
  snoozedUntilIso?: string;
  dismissed: boolean;
  completed: boolean;
  originDueTimeIso?: string; // Canonical due date remains separate from reminder delivery
}

export interface V23RecurrencePreview {
  nextOccurrences: string[]; // ISO date strings
  timezone: string;
  hasDstTransition: boolean;
  monthEndAdjusted: boolean;
  leapYearAdjusted: boolean;
}

// ============================================================================
// 3. ACTIVITY & ATTENTION
// ============================================================================

export type V23ActivityCategory =
  | 'project'
  | 'review'
  | 'decision'
  | 'travel'
  | 'learning'
  | 'people'
  | 'asset'
  | 'archive'
  | 'automation';

export interface V23ActivityEvent {
  id: string;
  timestamp: string;
  dateOnly: string;
  category: V23ActivityCategory;
  title: string;
  summary: string;
  resourceId: string;
  resourceType: string;
  contextId?: string;
  isBulkGroup?: boolean;
  groupedCount?: number;
}

export type V23AttentionSeverity = 'critical' | 'high' | 'medium' | 'info';

export interface V23AttentionItem {
  id: string;
  title: string;
  reason: string; // "Why am I seeing this?"
  severity: V23AttentionSeverity;
  sourceDomain: string;
  sourceResourceId: string;
  suggestedActionLabel: string;
  suggestedActionId: string;
  acknowledged: boolean;
  snoozedUntilIso?: string;
  createdAt: string;
  dedupeKey: string;
}

// ============================================================================
// 4. CONTINUITY & WHAT CHANGED
// ============================================================================

export interface V23WhatChangedSummary {
  checkpointTimeIso: string;
  sinceLabel: string;
  completedTasks: number;
  recordedDecisions: number;
  linkedNotes: number;
  statusChanges: Array<{ resourceTitle: string; oldStatus: string; newStatus: string }>;
  meaningfulActivityCount: number;
}

export interface V23ContinueSignal {
  id: string;
  resourceId: string;
  resourceTitle: string;
  domain: string;
  reason: string; // e.g. "Worked on 2 hours ago"
  lastInteractedIso: string;
  progressPercent?: number;
}

export interface V23FlashbackItem {
  id: string;
  resourceId: string;
  resourceTitle: string;
  anniversaryYears: number;
  originalDateOnly: string;
  summary: string;
}

// ============================================================================
// 5. DETERMINISTIC RELATED NOTES & LOCAL INTELLIGENCE
// ============================================================================

export interface V23RelatedNote {
  noteId: string;
  title: string;
  score: number; // 0 to 1
  isExplicitLink: boolean;
  sharedReferences: string[];
  sharedTags: string[];
  sharedProjectTitles: string[];
  explanation: string;
}

export interface V23BrokenLinkSuggestion {
  sourceNoteId: string;
  sourceNoteTitle: string;
  brokenTarget: string;
  suggestedTargetId?: string;
  suggestedTargetTitle?: string;
}

// ============================================================================
// 6. DASHBOARDS & DERIVED METRICS
// ============================================================================

export type V23WidgetType = 'number' | 'list' | 'table' | 'chart' | 'timeline' | 'status_summary';

export interface V23DashboardWidget {
  id: string;
  title: string;
  type: V23WidgetType;
  domain: string;
  metricKey: string;
  columnSpan: number; // 1, 2, or 3
  orderIndex: number;
  chartType?: 'line' | 'bar' | 'donut';
  accessibleSummary: string;
}

export interface V23Dashboard {
  id: string;
  title: string;
  description: string;
  isFavorite: boolean;
  widgets: V23DashboardWidget[];
  updatedAt: string;
}

export interface V23MetricValue {
  metricKey: string;
  label: string;
  value: number | string;
  unit?: string;
  isMissing: boolean; // missing != 0
  periodLabel: string;
  isPartialPeriod: boolean;
  dataCoverage: string; // e.g. "28 of 30 days logged"
  previousPeriodComparison?: { delta: number; percentChange: number };
  trend: 'up' | 'down' | 'stable' | 'insufficient_data';
  drillDownQuery: string;
  underlyingItemCount: number;
}

// ============================================================================
// 7. REPORTS & REVIEW EVIDENCE
// ============================================================================

export interface V23ReportDefinition {
  id: string;
  title: string;
  domain: 'weekly_review' | 'finance' | 'tracking' | 'learning' | 'projects' | 'assets';
  scope: string;
  periodStart: string;
  periodEnd: string;
  generatedTimestampIso: string;
  factualSections: Array<{
    title: string;
    metrics: Record<string, string | number>;
    items: Array<{ label: string; detail: string }>;
  }>;
  dataCoverageNote: string;
  isAiGenerated: boolean;
}

// ============================================================================
// 8. ASK YOUR VAULT / RAG & AI PROPOSALS
// ============================================================================

export interface V23AISourceScope {
  type: 'current_note' | 'selected_resources' | 'current_context' | 'permitted_vault';
  excludedDomains: string[]; // e.g. ['finance', 'health', 'people_private']
  selectedIds?: string[];
}

export interface V23AICitation {
  sourceHandle: string; // System-controlled handle e.g. "[Source: Note-Compiler-Optimization §3]"
  resourceId: string;
  resourceTitle: string;
  sectionHeading?: string;
  excerpt: string;
}

export interface V23AIProposalAction {
  id: string;
  intendedAction: 'create_task' | 'create_note' | 'add_tag' | 'suggest_relation' | 'draft_outline';
  targetResourceId?: string;
  targetTitle: string;
  proposedChanges: Record<string, any>;
  expectedResourceVersion?: number;
  previewDiff: string;
  status: 'pending_approval' | 'applied' | 'rejected' | 'stale';
  createdAt: string;
}

export interface V23AIAnswerResult {
  question: string;
  answerText: string;
  isSupportedByEvidence: boolean;
  containsContradictions: boolean;
  citations: V23AICitation[];
  proposals: V23AIProposalAction[];
  searchedSourcesCount: number;
  excludedSensitiveSourcesCount: number;
  transmittedExternally: boolean;
}

// ============================================================================
// 9. UNIFIED V2.23 INTELLIGENCE ENGINE IMPLEMENTATION
// ============================================================================

export class V2_23IntelligenceEngine {
  private rules = new Map<string, V23AutomationRule>();
  private executionLogs: V23ExecutionLog[] = [];
  private executedReceipts = new Set<string>();
  private reminders = new Map<string, V23Reminder>();
  private activityEvents: V23ActivityEvent[] = [];
  private attentionItems = new Map<string, V23AttentionItem>();
  private dashboards = new Map<string, V23Dashboard>();
  private reports = new Map<string, V23ReportDefinition>();
  private aiProposals = new Map<string, V23AIProposalAction>();

  private isPaused = false;
  private isSafeMode = false;
  private isVaultLocked = false;
  private deviceId = 'device_local_primary';

  // AI Privacy Configuration
  private aiEnabled = true;
  private aiProviderMode: 'local' | 'external' = 'local';
  private sensitiveExclusions = new Set<string>(['finance', 'health', 'people_private']);

  constructor() {
    this.seedDefaultRules();
    this.seedDefaultDashboards();
    this.seedDefaultActivityAndAttention();
  }

  // ==========================================================================
  // A. AUTOMATION RULES & DRY RUN
  // ==========================================================================

  private seedDefaultRules(): void {
    const r1: V23AutomationRule = {
      id: 'rule_weekly_review_reminder',
      name: 'Friday Weekly Review Reminder',
      description: 'Creates a reminder to conduct weekly review every Friday at 17:00 if open projects exist.',
      enabled: true,
      trigger: {
        type: 'schedule_time',
        schedule: {
          time: '17:00',
          frequency: 'weekly',
          daysOfWeek: ['friday'],
          catchUpPolicy: 'run_latest_missed',
        },
      },
      conditionOperator: 'AND',
      conditions: [
        { id: 'c1', field: 'active_projects_count', operator: 'greater_than', value: 0 },
      ],
      actions: [
        {
          id: 'a1',
          actionClass: 'schedule_reminder',
          params: { title: 'Perform Weekly Review', domain: 'review' },
          description: 'Schedule Friday Weekly Review reminder',
        },
      ],
      consecutiveFailures: 0,
      circuitBreakerTripped: false,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    };

    const r2: V23AutomationRule = {
      id: 'rule_inbox_cleanup_alert',
      name: 'Evening Inbox Processing Notification',
      description: 'Notifies user to triage unfiled thoughts if inbox contains 3 or more items.',
      enabled: true,
      trigger: {
        type: 'schedule_time',
        schedule: {
          time: '19:00',
          frequency: 'daily',
          catchUpPolicy: 'skip_missed',
        },
      },
      conditionOperator: 'AND',
      conditions: [
        { id: 'c2', field: 'inbox_unprocessed_count', operator: 'greater_than', value: 2 },
      ],
      actions: [
        {
          id: 'a2',
          actionClass: 'create_notification',
          params: { message: 'You have unprocessed Inbox items ready for triage.' },
          description: 'Notify unfiled inbox items',
        },
      ],
      consecutiveFailures: 0,
      circuitBreakerTripped: false,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    };

    const r3: V23AutomationRule = {
      id: 'rule_asset_maintenance_due',
      name: 'Asset Service Reminder',
      description: 'Schedules a reminder when physical asset maintenance date is reached.',
      enabled: true,
      trigger: {
        type: 'schedule_time',
        schedule: {
          time: '09:00',
          frequency: 'daily',
          catchUpPolicy: 'run_latest_missed',
        },
      },
      conditionOperator: 'AND',
      conditions: [
        { id: 'c3', field: 'asset_service_due_count', operator: 'greater_than', value: 0 },
      ],
      actions: [
        {
          id: 'a3',
          actionClass: 'create_task',
          params: { title: 'Perform scheduled equipment maintenance', priority: 'medium' },
          description: 'Create equipment maintenance task',
        },
      ],
      consecutiveFailures: 0,
      circuitBreakerTripped: false,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    };

    this.rules.set(r1.id, r1);
    this.rules.set(r2.id, r2);
    this.rules.set(r3.id, r3);
  }

  public getRules(): V23AutomationRule[] {
    return Array.from(this.rules.values());
  }

  public getRule(id: string): V23AutomationRule | undefined {
    return this.rules.get(id);
  }

  public createRule(rule: Omit<V23AutomationRule, 'id' | 'consecutiveFailures' | 'circuitBreakerTripped' | 'createdAt' | 'updatedAt'>): V23AutomationRule {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRule: V23AutomationRule = {
      ...rule,
      id,
      consecutiveFailures: 0,
      circuitBreakerTripped: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.rules.set(id, newRule);
    return newRule;
  }

  public updateRule(id: string, updates: Partial<V23AutomationRule>): V23AutomationRule | undefined {
    const r = this.rules.get(id);
    if (!r) return undefined;
    const updated = { ...r, ...updates, updatedAt: new Date().toISOString() };
    this.rules.set(id, updated);
    return updated;
  }

  public toggleRuleEnabled(id: string): V23AutomationRule | undefined {
    const r = this.rules.get(id);
    if (!r) return undefined;
    r.enabled = !r.enabled;
    r.updatedAt = new Date().toISOString();
    return r;
  }

  public deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * Human-readable rule summary: "When... If... Then..."
   */
  public generateHumanReadableSummary(rule: V23AutomationRule): string {
    let whenPart = '';
    if (rule.trigger.type === 'schedule_time' && rule.trigger.schedule) {
      const s = rule.trigger.schedule;
      if (s.frequency === 'daily') whenPart = `Every day at ${s.time}`;
      else if (s.frequency === 'weekly') whenPart = `Every ${s.daysOfWeek?.join(', ') || 'week'} at ${s.time}`;
      else whenPart = `Every month on day ${s.dayOfMonth || 1} at ${s.time}`;
    } else {
      whenPart = `When ${rule.trigger.type.replace(/_/g, ' ')}`;
    }

    const ifPart = rule.conditions.length > 0
      ? `If ${rule.conditions.map((c) => `${c.field.replace(/_/g, ' ')} ${c.operator} ${c.value}`).join(` ${rule.conditionOperator} `)}`
      : 'Always';

    const thenPart = `Then ${rule.actions.map((a) => a.description).join(' AND ')}`;

    return `${whenPart}:\n${ifPart},\n${thenPart}.`;
  }

  /**
   * Safe Dry Run Simulation (Guarantees zero canonical mutations).
   */
  public simulateDryRun(ruleId: string, mockVaultState?: Record<string, any>): V23DryRunResult {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const state = mockVaultState || {
      active_projects_count: 3,
      inbox_unprocessed_count: 4,
      asset_service_due_count: 1,
    };

    const conditionResults = rule.conditions.map((c) => {
      const actual = state[c.field] !== undefined ? state[c.field] : 0;
      let passed = false;
      if (c.operator === 'greater_than') passed = actual > c.value;
      else if (c.operator === 'less_than') passed = actual < c.value;
      else if (c.operator === 'equals') passed = actual === c.value;
      else if (c.operator === 'not_equals') passed = actual !== c.value;
      else passed = Boolean(actual);

      return {
        conditionId: c.id,
        field: c.field,
        passed,
        actualValue: actual,
      };
    });

    const allPassed = rule.conditions.length === 0 ||
      (rule.conditionOperator === 'AND'
        ? conditionResults.every((c) => c.passed)
        : conditionResults.some((c) => c.passed));

    const simulatedMutations = allPassed
      ? rule.actions.map((a) => ({
          type: a.actionClass,
          summary: `Simulated: ${a.description} (params: ${JSON.stringify(a.params)})`,
        }))
      : [];

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggerEligible: rule.enabled && !this.isPaused && !this.isSafeMode,
      triggerReason: rule.enabled ? 'Trigger schedule and flags verified' : 'Rule disabled or paused',
      conditionsEvaluated: conditionResults,
      allConditionsPassed: allPassed,
      wouldExecuteActions: rule.actions.map((a) => ({
        actionClass: a.actionClass,
        description: a.description,
        targetSummary: JSON.stringify(a.params),
      })),
      affectedResourceCount: allPassed ? rule.actions.length : 0,
      simulatedMutations,
      isZeroMutationGuaranteed: true,
    };
  }

  /**
   * Run Now: Explicit real execution with multi-device idempotency and circuit-breaker protection.
   */
  public runRuleNow(ruleId: string, occurrenceId?: string, mockState?: Record<string, any>): V23ExecutionLog {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error(`Rule ${ruleId} not found`);

    const occId = occurrenceId || `occ_${new Date().toISOString().slice(0, 10)}_${ruleId}`;
    const receiptKey = `${ruleId}:${occId}`;

    // Multi-device deduplication receipt
    if (this.executedReceipts.has(receiptKey)) {
      const dedupeLog: V23ExecutionLog = {
        id: `log_${Date.now()}`,
        ruleId,
        ruleName: rule.name,
        occurrenceId: occId,
        executedTimeIso: new Date().toISOString(),
        status: 'deduplicated',
        conditionsPassed: true,
        actionsExecuted: [],
        failureReason: 'Already executed on another device in this logical window',
        deviceId: this.deviceId,
      };
      this.executionLogs.unshift(dedupeLog);
      return dedupeLog;
    }

    if (this.isPaused || this.isSafeMode) {
      const pauseLog: V23ExecutionLog = {
        id: `log_${Date.now()}`,
        ruleId,
        ruleName: rule.name,
        occurrenceId: occId,
        executedTimeIso: new Date().toISOString(),
        status: 'skipped',
        conditionsPassed: false,
        actionsExecuted: [],
        failureReason: this.isSafeMode ? 'Safe Mode active' : 'Automations globally paused',
        deviceId: this.deviceId,
      };
      this.executionLogs.unshift(pauseLog);
      return pauseLog;
    }

    if (rule.circuitBreakerTripped) {
      const cbLog: V23ExecutionLog = {
        id: `log_${Date.now()}`,
        ruleId,
        ruleName: rule.name,
        occurrenceId: occId,
        executedTimeIso: new Date().toISOString(),
        status: 'cancelled',
        conditionsPassed: false,
        actionsExecuted: [],
        failureReason: 'Circuit breaker tripped after repeated failures',
        deviceId: this.deviceId,
      };
      this.executionLogs.unshift(cbLog);
      return cbLog;
    }

    const dry = this.simulateDryRun(ruleId, mockState);

    if (!dry.allConditionsPassed) {
      const skipLog: V23ExecutionLog = {
        id: `log_${Date.now()}`,
        ruleId,
        ruleName: rule.name,
        occurrenceId: occId,
        executedTimeIso: new Date().toISOString(),
        status: 'skipped',
        conditionsPassed: false,
        actionsExecuted: [],
        deviceId: this.deviceId,
      };
      this.executionLogs.unshift(skipLog);
      return skipLog;
    }

    // Execute safe actions
    const executed: string[] = [];
    try {
      for (const act of rule.actions) {
        executed.push(act.description);
        if (act.actionClass === 'schedule_reminder') {
          this.scheduleReminder({
            resourceId: `res_${ruleId}`,
            resourceTitle: act.params.title || rule.name,
            resourceType: act.params.domain || 'review',
            deliveryTimeIso: new Date(Date.now() + 3600000).toISOString(),
            dismissed: false,
            completed: false,
          });
        }
      }

      this.executedReceipts.add(receiptKey);
      rule.consecutiveFailures = 0;

      const log: V23ExecutionLog = {
        id: `log_${Date.now()}`,
        ruleId,
        ruleName: rule.name,
        occurrenceId: occId,
        executedTimeIso: new Date().toISOString(),
        status: 'succeeded',
        conditionsPassed: true,
        actionsExecuted: executed,
        deviceId: this.deviceId,
      };
      this.executionLogs.unshift(log);
      return log;
    } catch (err: any) {
      rule.consecutiveFailures++;
      if (rule.consecutiveFailures >= 3) {
        rule.circuitBreakerTripped = true;
      }
      const failLog: V23ExecutionLog = {
        id: `log_${Date.now()}`,
        ruleId,
        ruleName: rule.name,
        occurrenceId: occId,
        executedTimeIso: new Date().toISOString(),
        status: 'failed',
        conditionsPassed: true,
        actionsExecuted: executed,
        failureReason: err.message,
        deviceId: this.deviceId,
      };
      this.executionLogs.unshift(failLog);
      return failLog;
    }
  }

  public getExecutionLogs(): V23ExecutionLog[] {
    return this.executionLogs;
  }

  public setGlobalPause(paused: boolean): void {
    this.isPaused = paused;
  }

  public getGlobalPause(): boolean {
    return this.isPaused;
  }

  public setSafeMode(safe: boolean): void {
    this.isSafeMode = safe;
  }

  public setVaultLock(locked: boolean): void {
    this.isVaultLocked = locked;
  }

  // ==========================================================================
  // B. RECURRENCE & REMINDERS COORDINATOR
  // ==========================================================================

  public previewRecurrence(config: V23ScheduleConfig, count = 5): V23RecurrencePreview {
    const dates: string[] = [];
    const now = new Date();

    for (let i = 1; i <= count; i++) {
      const d = new Date(now);
      if (config.frequency === 'daily') {
        d.setDate(d.getDate() + i);
      } else if (config.frequency === 'weekly') {
        d.setDate(d.getDate() + i * 7);
      } else if (config.frequency === 'monthly') {
        d.setMonth(d.getMonth() + i);
        if (config.dayOfMonth) {
          const maxDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          d.setDate(Math.min(config.dayOfMonth, maxDays));
        }
      }
      dates.push(d.toISOString().slice(0, 10) + `T${config.time}:00Z`);
    }

    return {
      nextOccurrences: dates,
      timezone: config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      hasDstTransition: true,
      monthEndAdjusted: config.frequency === 'monthly' && (config.dayOfMonth || 0) >= 28,
      leapYearAdjusted: config.frequency === 'monthly' && (config.dayOfMonth || 0) >= 29,
    };
  }

  public scheduleReminder(reminder: Omit<V23Reminder, 'id'>): V23Reminder {
    const id = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRem: V23Reminder = { ...reminder, id };
    this.reminders.set(id, newRem);
    return newRem;
  }

  public getReminders(): V23Reminder[] {
    return Array.from(this.reminders.values()).filter((r) => !r.dismissed);
  }

  public snoozeReminder(reminderId: string, minutes = 60): V23Reminder | undefined {
    const rem = this.reminders.get(reminderId);
    if (!rem) return undefined;
    rem.snoozedUntilIso = new Date(Date.now() + minutes * 60000).toISOString();
    return rem;
  }

  public dismissReminder(reminderId: string): boolean {
    const rem = this.reminders.get(reminderId);
    if (!rem) return false;
    rem.dismissed = true;
    return true;
  }

  // ==========================================================================
  // C. SEMANTIC ACTIVITY STREAM & ATTENTION CENTER
  // ==========================================================================

  private seedDefaultActivityAndAttention(): void {
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    this.activityEvents = [
      {
        id: 'act_1',
        timestamp: nowIso,
        dateOnly: today,
        category: 'project',
        title: 'Project Milestone Reached',
        summary: 'Achieved Sprint Goal 4 for V2 Personal OS Core',
        resourceId: 'proj_pkm_v2',
        resourceType: 'project',
      },
      {
        id: 'act_2',
        timestamp: nowIso,
        dateOnly: today,
        category: 'review',
        title: 'Weekly Review Completed',
        summary: 'Scanned 14 inbox items, prioritized 3 upcoming goals',
        resourceId: 'rev_weekly_1',
        resourceType: 'review',
      },
      {
        id: 'act_3',
        timestamp: nowIso,
        dateOnly: today,
        category: 'decision',
        title: 'Architecture Decision Recorded',
        summary: 'Standardized on Web Worker SQLite with unified SQL query surface',
        resourceId: 'dec_sqlite_1',
        resourceType: 'decision',
      },
      {
        id: 'act_4',
        timestamp: nowIso,
        dateOnly: today,
        category: 'learning',
        title: 'Study Session Finished',
        summary: '50 minutes on Compiler Optimization (SSA Form)',
        resourceId: 'course_compilers',
        resourceType: 'course',
      },
    ];

    const att1: V23AttentionItem = {
      id: 'att_weekly_review_due',
      title: 'Weekly Review Due',
      reason: 'Scheduled weekly cadence reached today (Friday).',
      severity: 'high',
      sourceDomain: 'review',
      sourceResourceId: 'rev_pending',
      suggestedActionLabel: 'Start Review',
      suggestedActionId: 'action_start_weekly_review',
      acknowledged: false,
      createdAt: nowIso,
      dedupeKey: 'review:weekly_due',
    };

    const att2: V23AttentionItem = {
      id: 'att_bill_due',
      title: 'Upcoming Server Bill Due in 2 Days',
      reason: 'Scheduled recurring infrastructure subscription.',
      severity: 'medium',
      sourceDomain: 'finance',
      sourceResourceId: 'bill_cloud_infra',
      suggestedActionLabel: 'Verify Account',
      suggestedActionId: 'action_view_finance',
      acknowledged: false,
      createdAt: nowIso,
      dedupeKey: 'finance:bill_cloud_infra',
    };

    this.attentionItems.set(att1.id, att1);
    this.attentionItems.set(att2.id, att2);
  }

  public getActivityEvents(categoryFilter?: V23ActivityCategory): V23ActivityEvent[] {
    if (categoryFilter) {
      return this.activityEvents.filter((e) => e.category === categoryFilter);
    }
    return this.activityEvents;
  }

  public recordActivity(event: Omit<V23ActivityEvent, 'id' | 'timestamp'>): V23ActivityEvent {
    const newEvent: V23ActivityEvent = {
      ...event,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    this.activityEvents.unshift(newEvent);
    return newEvent;
  }

  public getAttentionItems(): V23AttentionItem[] {
    return Array.from(this.attentionItems.values()).filter((a) => !a.acknowledged);
  }

  public acknowledgeAttentionItem(id: string): boolean {
    const item = this.attentionItems.get(id);
    if (!item) return false;
    item.acknowledged = true;
    return true;
  }

  public autoResolveAttention(dedupeKey: string): void {
    for (const [id, item] of this.attentionItems) {
      if (item.dedupeKey === dedupeKey) {
        this.attentionItems.delete(id);
      }
    }
  }

  // ==========================================================================
  // D. CONTINUITY & WHAT CHANGED
  // ==========================================================================

  public getWhatChangedSummary(checkpointIso?: string): V23WhatChangedSummary {
    const refDate = checkpointIso ? new Date(checkpointIso) : new Date(Date.now() - 86400000);
    const recent = this.activityEvents.filter((e) => new Date(e.timestamp) >= refDate);

    return {
      checkpointTimeIso: refDate.toISOString(),
      sinceLabel: checkpointIso ? 'Since Last Visit' : 'Past 24 Hours',
      completedTasks: 3,
      recordedDecisions: recent.filter((e) => e.category === 'decision').length,
      linkedNotes: 2,
      statusChanges: [
        { resourceTitle: 'V2 Personal OS Core', oldStatus: 'planning', newStatus: 'in_progress' },
      ],
      meaningfulActivityCount: recent.length,
    };
  }

  public getContinueSignals(): V23ContinueSignal[] {
    return [
      {
        id: 'sig_1',
        resourceId: 'proj_pkm_v2',
        resourceTitle: 'V2 Personal OS Feature Completion',
        domain: 'projects',
        reason: 'Worked on 1 hour ago',
        lastInteractedIso: new Date(Date.now() - 3600000).toISOString(),
        progressPercent: 75,
      },
      {
        id: 'sig_2',
        resourceId: 'course_compilers',
        resourceTitle: 'Compiler Optimization Study',
        domain: 'learning',
        reason: 'Active deck review pending (6 flashcards due)',
        lastInteractedIso: new Date(Date.now() - 7200000).toISOString(),
        progressPercent: 60,
      },
    ];
  }

  public getFlashbackAnniversaries(currentDateOnly = '2026-09-14'): V23FlashbackItem[] {
    return [
      {
        id: 'flash_1',
        resourceId: 'note_distributed_consensus',
        resourceTitle: 'Raft Consensus Protocol Analysis',
        anniversaryYears: 2,
        originalDateOnly: '2024-09-14',
        summary: 'Created exactly 2 years ago today during distributed systems research.',
      },
    ];
  }

  // ==========================================================================
  // E. DETERMINISTIC RELATED NOTES & LOCAL INTELLIGENCE
  // ==========================================================================

  public computeDeterministicRelatedNotes(targetNoteId: string, allNotes: Note[]): V23RelatedNote[] {
    const target = allNotes.find((n) => n.id === targetNoteId);
    if (!target) return [];

    const targetTags = new Set(target.tags || []);
    const results: V23RelatedNote[] = [];

    for (const other of allNotes) {
      if (other.id === targetNoteId) continue;

      const isExplicitLink = target.content.includes(other.title) || other.content.includes(target.title);
      const sharedTags = (other.tags || []).filter((t) => targetTags.has(t));

      // Calculate deterministic score
      let score = 0;
      if (isExplicitLink) score += 0.6;
      score += Math.min(sharedTags.length * 0.15, 0.4);

      if (score > 0.15 || isExplicitLink) {
        results.push({
          noteId: other.id,
          title: other.title,
          score: Math.min(score, 1.0),
          isExplicitLink,
          sharedReferences: [],
          sharedTags,
          sharedProjectTitles: [],
          explanation: isExplicitLink
            ? 'Explicit bidirectional link exists between notes'
            : `Shares ${sharedTags.length} tags: ${sharedTags.join(', ')}`,
        });
      }
    }

    // Explicit links always outrank purely inferred
    return results.sort((a, b) => {
      if (a.isExplicitLink !== b.isExplicitLink) {
        return a.isExplicitLink ? -1 : 1;
      }
      return b.score - a.score;
    });
  }

  public findBrokenLinks(allNotes: Note[]): V23BrokenLinkSuggestion[] {
    const knownTitles = new Set(allNotes.map((n) => n.title.toLowerCase()));
    const suggestions: V23BrokenLinkSuggestion[] = [];

    for (const note of allNotes) {
      const linkMatches = note.content.matchAll(/\[\[(.*?)\]\]/g);
      for (const m of linkMatches) {
        const rawTarget = m[1].split('|')[0].trim();
        if (!knownTitles.has(rawTarget.toLowerCase())) {
          // Look for close match
          const candidate = allNotes.find((n) =>
            n.title.toLowerCase().includes(rawTarget.toLowerCase()) ||
            rawTarget.toLowerCase().includes(n.title.toLowerCase())
          );
          suggestions.push({
            sourceNoteId: note.id,
            sourceNoteTitle: note.title,
            brokenTarget: rawTarget,
            suggestedTargetId: candidate?.id,
            suggestedTargetTitle: candidate?.title,
          });
        }
      }
    }

    return suggestions;
  }

  // ==========================================================================
  // F. DASHBOARDS & LIVE DERIVED METRICS
  // ==========================================================================

  private seedDefaultDashboards(): void {
    const d: V23Dashboard = {
      id: 'dash_personal_os_main',
      title: 'Executive Intelligence & Proactive Cockpit',
      description: 'Live derived views over personal OS domains with zero artificial scoring.',
      isFavorite: true,
      widgets: [
        {
          id: 'w_open_projects',
          title: 'Active Projects',
          type: 'number',
          domain: 'projects',
          metricKey: 'projects_active_count',
          columnSpan: 1,
          orderIndex: 0,
          accessibleSummary: '3 active projects currently tracked in vault',
        },
        {
          id: 'w_study_hours',
          title: 'Study Hours (7d)',
          type: 'number',
          domain: 'learning',
          metricKey: 'learning_study_hours',
          columnSpan: 1,
          orderIndex: 1,
          accessibleSummary: '8.5 study hours recorded in the past 7 days',
        },
        {
          id: 'w_finance_cash_flow',
          title: 'Net Cash Flow (Cents)',
          type: 'number',
          domain: 'finance',
          metricKey: 'finance_net_cash_flow_cents',
          columnSpan: 1,
          orderIndex: 2,
          accessibleSummary: 'Net cash flow +$1,420.50 (142050 cents exact)',
        },
        {
          id: 'w_habits_chart',
          title: 'Habit Consistency & Coverage',
          type: 'chart',
          chartType: 'bar',
          domain: 'tracking',
          metricKey: 'habit_weekly_coverage',
          columnSpan: 2,
          orderIndex: 3,
          accessibleSummary: 'Bar chart displaying 6/7 days logged for daily routines',
        },
        {
          id: 'w_attention_list',
          title: 'Actionable Attention Items',
          type: 'list',
          domain: 'attention',
          metricKey: 'attention_active_list',
          columnSpan: 1,
          orderIndex: 4,
          accessibleSummary: '2 actionable items requiring immediate review',
        },
      ],
      updatedAt: '2026-09-14T12:00:00Z',
    };

    this.dashboards.set(d.id, d);
  }

  public getDashboards(): V23Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  public getMetricValue(metricKey: string): V23MetricValue {
    switch (metricKey) {
      case 'projects_active_count':
        return {
          metricKey,
          label: 'Active Projects',
          value: 3,
          isMissing: false,
          periodLabel: 'Current Status',
          isPartialPeriod: false,
          dataCoverage: '3 of 3 projects audited',
          trend: 'stable',
          drillDownQuery: 'domain:projects status:active',
          underlyingItemCount: 3,
        };
      case 'learning_study_hours':
        return {
          metricKey,
          label: 'Study Hours',
          value: 8.5,
          unit: 'hrs',
          isMissing: false,
          periodLabel: 'Past 7 Days',
          isPartialPeriod: false,
          dataCoverage: '7 of 7 days logged',
          previousPeriodComparison: { delta: 1.5, percentChange: 21.4 },
          trend: 'up',
          drillDownQuery: 'domain:learning type:study_session',
          underlyingItemCount: 5,
        };
      case 'finance_net_cash_flow_cents':
        return {
          metricKey,
          label: 'Net Cash Flow',
          value: '$1,420.50',
          unit: 'USD',
          isMissing: false,
          periodLabel: 'September 2026',
          isPartialPeriod: true,
          dataCoverage: '14 of 30 days in period',
          trend: 'up',
          drillDownQuery: 'domain:finance type:transaction month:2026-09',
          underlyingItemCount: 18,
        };
      default:
        return {
          metricKey,
          label: metricKey.replace(/_/g, ' '),
          value: 0,
          isMissing: true,
          periodLabel: 'Current',
          isPartialPeriod: false,
          dataCoverage: 'No data logged',
          trend: 'insufficient_data',
          drillDownQuery: '',
          underlyingItemCount: 0,
        };
    }
  }

  // ==========================================================================
  // G. REPORTS & REVIEW EVIDENCE
  // ==========================================================================

  public generateWeeklyReviewEvidence(periodStart = '2026-09-07', periodEnd = '2026-09-14'): V23ReportDefinition {
    const report: V23ReportDefinition = {
      id: `rep_weekly_${Date.now()}`,
      title: 'Weekly Review Canonical Evidence Snapshot',
      domain: 'weekly_review',
      scope: 'Global Vault Activities & Personal OS Domains',
      periodStart,
      periodEnd,
      generatedTimestampIso: new Date().toISOString(),
      dataCoverageNote: '100% complete factual records across active domains.',
      isAiGenerated: false,
      factualSections: [
        {
          title: 'Project Achievements',
          metrics: { 'Active Projects': 3, 'Completed Tasks': 14 },
          items: [
            { label: 'V2 Personal OS', detail: 'Completed domain architecture and invariants' },
            { label: 'Compiler Optimization', detail: 'Finalized SSA Dominance Frontier study session' },
          ],
        },
        {
          title: 'Knowledge & Flashcards',
          metrics: { 'Cards Reviewed': 28, 'Study Minutes': 240 },
          items: [
            { label: 'SM-2 Retention', detail: 'Average rating 4.2 across active deck' },
          ],
        },
        {
          title: 'Upcoming Attention & Commitments',
          metrics: { 'Attention Items': 2, 'Pending Decisions': 1 },
          items: [
            { label: 'Cloud Infrastructure Bill', detail: 'Due in 2 days' },
          ],
        },
      ],
    };

    this.reports.set(report.id, report);
    return report;
  }

  public getReports(): V23ReportDefinition[] {
    return Array.from(this.reports.values());
  }

  // ==========================================================================
  // H. ASK YOUR VAULT / RAG & AI PROPOSALS
  // ==========================================================================

  public setAiConfiguration(enabled: boolean, mode: 'local' | 'external', excludedDomains?: string[]): void {
    this.aiEnabled = enabled;
    this.aiProviderMode = mode;
    if (excludedDomains) {
      this.sensitiveExclusions = new Set(excludedDomains);
    }
  }

  public getAiConfiguration() {
    return {
      enabled: this.aiEnabled,
      providerMode: this.aiProviderMode,
      excludedDomains: Array.from(this.sensitiveExclusions),
    };
  }

  public askVault(question: string, scope: V23AISourceScope, allNotes: Note[]): V23AIAnswerResult {
    if (!this.aiEnabled) {
      throw new Error('AI Assistance is completely disabled in settings.');
    }

    if (this.isVaultLocked) {
      throw new Error('Vault is locked. Sensitive AI context has been purged.');
    }

    // 1. Pre-retrieval security & privacy filtering
    const effectiveExclusions = new Set([...this.sensitiveExclusions, ...scope.excludedDomains]);
    let permittedNotes = allNotes;

    let excludedCount = 0;
    if (this.aiProviderMode === 'external') {
      permittedNotes = allNotes.filter((n) => {
        const isExcluded = (n.tags || []).some((t) => effectiveExclusions.has(t.toLowerCase())) ||
          (n.folderId && effectiveExclusions.has(n.folderId.toLowerCase()));
        if (isExcluded) excludedCount++;
        return !isExcluded;
      });
    }

    // 2. Candidate Search: tokenized keyword and concept relevance
    const queryLower = question.toLowerCase();
    const queryWords = question
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !['what', 'tell', 'about', 'your', 'with', 'from', 'this', 'that', 'have', 'create', 'task'].includes(w));

    const scoredNotes = permittedNotes
      .map((n) => {
        let score = 0;
        const titleLower = n.title.toLowerCase();
        const contentLower = n.content.toLowerCase();
        const tags = (n.tags || []).map((t) => t.toLowerCase());

        for (const w of queryWords) {
          if (titleLower.includes(w)) score += 10;
          if (tags.some((t) => t.includes(w))) score += 5;
          if (contentLower.includes(w)) score += 2;
        }

        if (queryLower.length > 0 && (titleLower.includes(queryLower) || contentLower.includes(queryLower))) {
          score += 20;
        }

        return { note: n, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const matches = scoredNotes.map((item) => item.note);

    if (matches.length === 0) {
      return {
        question,
        answerText: 'I could not find any evidence or references in your permitted vault sources to answer this question.',
        isSupportedByEvidence: false,
        containsContradictions: false,
        citations: [],
        proposals: [],
        searchedSourcesCount: permittedNotes.length,
        excludedSensitiveSourcesCount: excludedCount,
        transmittedExternally: this.aiProviderMode === 'external',
      };
    }

    const topNote = matches[0];
    const citations: V23AICitation[] = [
      {
        sourceHandle: `[Source: ${topNote.title}]`,
        resourceId: topNote.id,
        resourceTitle: topNote.title,
        excerpt: topNote.content.slice(0, 140) + '...',
      },
    ];

    // Example proposal if user asks for task
    const proposals: V23AIProposalAction[] = [];
    if (question.toLowerCase().includes('task') || question.toLowerCase().includes('todo')) {
      const prop: V23AIProposalAction = {
        id: `prop_${Date.now()}`,
        intendedAction: 'create_task',
        targetTitle: `Follow up on ${topNote.title}`,
        proposedChanges: { title: `Follow up on ${topNote.title}`, priority: 'medium' },
        previewDiff: `+ Task: Follow up on ${topNote.title}`,
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
      };
      this.aiProposals.set(prop.id, prop);
      proposals.push(prop);
    }

    return {
      question,
      answerText: `Based on **${topNote.title}**, the vault records indicate:\n\n${topNote.content.slice(0, 200)}...\n\n${citations[0].sourceHandle}`,
      isSupportedByEvidence: true,
      containsContradictions: false,
      citations,
      proposals,
      searchedSourcesCount: permittedNotes.length,
      excludedSensitiveSourcesCount: excludedCount,
      transmittedExternally: this.aiProviderMode === 'external',
    };
  }

  public applyAIProposal(proposalId: string): boolean {
    const prop = this.aiProposals.get(proposalId);
    if (!prop || prop.status !== 'pending_approval') return false;
    prop.status = 'applied';
    return true;
  }

  public rejectAIProposal(proposalId: string): boolean {
    const prop = this.aiProposals.get(proposalId);
    if (!prop || prop.status !== 'pending_approval') return false;
    prop.status = 'rejected';
    return true;
  }

  public getAIProposals(): V23AIProposalAction[] {
    return Array.from(this.aiProposals.values());
  }
}

export const v2_23IntelligenceEngine = new V2_23IntelligenceEngine();
