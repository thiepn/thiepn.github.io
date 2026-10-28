/**
 * PKM V2.20 — Automation, Scheduling, Recurrence & Proactive Workflow Types
 * 
 * Formalizes the strict taxonomy of 7 distinct temporal & workflow concepts:
 * 1. Workflow Preset: One-off user-invoked macro / action sequence.
 * 2. Routine: Structured repeatable human process with trackable step checklist & run history.
 * 3. Habit: Atomic behavioral tracker with streak math, grace/freeze days, and milestone tracking.
 * 4. Recurring Task: Temporal work item with RFC 5545 recurrence rule, completion vs schedule advance.
 * 5. Reminder: Scheduled notification event with snooze presets, dismiss, and catch-up triggers.
 * 6. Automation Rule: Declarative (When trigger -> If condition -> Then safe actions) rule engine with
 *    loop prevention, max depth <= 3, circuit breaker, idempotency receipts, and dry-run simulation.
 * 7. Review: Cadenced reflection & audit snapshot over inbox, domains, goals, and tasks.
 */

import { ResourceType } from '../core/resource/resourceCore';
import { DateOnlyString, DateTimeString, RecurrenceRuleV2, Weekday, MonthEndPolicy, AdvancePolicy } from '../temporal/temporalTypes';

// ==========================================
// 1. SAFE ACTION DEFINITIONS & PERMISSIONS
// ==========================================

export type V2AutomationActionClass =
  | 'create_note'
  | 'create_task'
  | 'set_property'
  | 'append_markdown'
  | 'start_review'
  | 'archive_resource'
  | 'log_habit'
  | 'trigger_reminder'
  | 'add_tag'
  | 'remove_tag'
  | 'move_to_folder';

export interface V2AutomationActionStep {
  id: string;
  actionId: string;
  actionClass: V2AutomationActionClass;
  params: Record<string, any>;
  description?: string;
}

// ==========================================
// 2. TRIGGER DEFINITIONS & TIME SCHEDULES
// ==========================================

export type V2AutomationTriggerType =
  | 'resource_created'
  | 'resource_updated'
  | 'resource_archived'
  | 'task_completed'
  | 'habit_logged'
  | 'tag_added'
  | 'tag_removed'
  | 'property_changed'
  | 'schedule_time'
  | 'review_due'
  | 'routine_expected'
  | 'app_resumed';

export type V2CatchUpPolicy = 'run_latest_missed' | 'run_each_missed' | 'skip_missed';

export interface V2TimeScheduleTrigger {
  time: string; // "HH:mm" in local time
  recurrence: RecurrenceRuleV2;
  catchUpPolicy: V2CatchUpPolicy;
  timezone?: string;
  lastEvaluatedDate?: DateOnlyString;
}

export interface V2AutomationTrigger {
  type: V2AutomationTriggerType;
  resourceType?: ResourceType;
  propertyKey?: string;
  targetValue?: any;
  tag?: string;
  timeSchedule?: V2TimeScheduleTrigger;
}

// ==========================================
// 3. CONDITIONS & EXPRESSION TREE
// ==========================================

export type V2ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_today'
  | 'is_empty'
  | 'is_not_empty'
  | 'matches_tag'
  | 'in_context'
  | 'date_before'
  | 'date_after';

export interface V2AutomationCondition {
  id: string;
  field: string;
  operator: V2ConditionOperator;
  value: any;
  negate?: boolean;
}

export interface V2ConditionGroup {
  logicalOperator: 'AND' | 'OR';
  conditions: V2AutomationCondition[];
  subGroups?: V2ConditionGroup[];
}

// ==========================================
// 4. AUTOMATION RULE & EXECUTION TELEMETRY
// ==========================================

export type V2RuleStatus = 'active' | 'disabled' | 'error' | 'paused_circuit_breaker';

export interface V2AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  status: V2RuleStatus;
  statusReason?: string;
  trigger: V2AutomationTrigger;
  conditionTree: V2ConditionGroup;
  actions: V2AutomationActionStep[];
  maxChainDepth?: number; // default 3, max 3
  circuitBreakerThreshold?: number; // default 5 consecutive failures
  consecutiveFailures: number;
  lastExecutedAt?: number;
  lastOccurrenceId?: string;
  executionCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface V2AutomationExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  triggerType: V2AutomationTriggerType;
  timestamp: number;
  status: 'success' | 'failed' | 'skipped' | 'loop_prevented' | 'circuit_broken';
  durationMs: number;
  affectedResourceIds: string[];
  executionChainDepth: number;
  details?: string;
  error?: string;
  triggerPayloadSummary?: string;
}

export interface V2DryRunResult {
  ruleId: string;
  ruleName: string;
  triggerMatched: boolean;
  conditionsPassed: boolean;
  conditionEvaluations: Array<{
    field: string;
    operator: V2ConditionOperator;
    expected: any;
    actual: any;
    passed: boolean;
  }>;
  wouldExecuteActions: V2AutomationActionStep[];
  warnings: string[];
  simulatedEffects: string[];
}

// ==========================================
// 5. HABIT TYPES & STREAK MATH
// ==========================================

export type V2HabitFrequency = 'daily' | 'weekdays' | 'weekly_target' | 'specific_days';

export interface V2HabitDefinition {
  id: string;
  name: string;
  description?: string;
  iconName: string;
  color?: string;
  category?: string;
  frequency: V2HabitFrequency;
  targetPerPeriod?: number; // e.g., 3 times per week
  targetDays?: Weekday[]; // for 'specific_days'
  targetValue?: number; // numeric target (e.g. 2000 ml water)
  unit?: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface V2HabitLogEntry {
  id: string;
  habitId: string;
  date: DateOnlyString; // YYYY-MM-DD
  value: number; // default 1 (boolean completed) or numeric value
  notes?: string;
  isFreezeOrGrace?: boolean;
  isSkipped?: boolean;
  createdAt: number;
}

export interface V2HabitStreakStats {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate30d: number; // 0.0 to 1.0
  completionRate90d: number;
  lastCompletedDate?: DateOnlyString;
  freezeDaysUsed: number;
  milestonesAchieved: number[]; // e.g. [7, 30, 100, 365]
}

// ==========================================
// 6. ROUTINE TYPES
// ==========================================

export type V2RoutineStepKind = 'checklist' | 'safe_action' | 'resource_link';

export interface V2RoutineStep {
  id: string;
  kind: V2RoutineStepKind;
  label: string;
  note?: string;
  actionId?: string;
  actionParams?: Record<string, any>;
  resourceId?: string;
  order: number;
}

export interface V2RoutineDefinition {
  id: string;
  name: string;
  description?: string;
  iconName: string;
  color?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  estimatedMinutes?: number;
  schedule?: RecurrenceRuleV2;
  steps: V2RoutineStep[];
  status: 'active' | 'paused' | 'archived';
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface V2RoutineRun {
  id: string;
  routineId: string;
  routineName: string;
  date: DateOnlyString;
  startedAt: number;
  completedAt?: number;
  stepStates: Record<string, boolean>; // stepId -> completed
  notes?: string;
  durationSeconds?: number;
}

// ==========================================
// 7. REMINDER TYPES & SNOOZE PRESETS
// ==========================================

export type V2SnoozePreset =
  | '15_minutes'
  | '1_hour'
  | '3_hours'
  | 'tomorrow_morning'
  | 'tomorrow_afternoon'
  | 'next_week'
  | 'custom';

export interface V2ReminderItem {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  title: string;
  dueDateTimeIso: DateTimeString;
  dueDateOnly: DateOnlyString;
  time?: string;
  status: 'pending' | 'triggered' | 'snoozed' | 'dismissed' | 'completed';
  snoozedUntilIso?: DateTimeString;
  snoozeCount: number;
  lastTriggeredAt?: number;
  soundEnabled?: boolean;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
}
