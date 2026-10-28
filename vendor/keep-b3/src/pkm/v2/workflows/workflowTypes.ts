/**
 * PKM V2.3 — Workflow, Routine & Automation Types
 * 
 * Establishes strict semantic separation:
 * 1. Workflow Preset: Run now (user-initiated sequence of actions).
 * 2. Routine: Repeatable process with steps and tracked run history.
 * 3. Automation: Trigger-driven rule (When trigger -> If condition -> Then action).
 */

import { ActionRisk } from '../core/actions/actionTypes';
import { RecurrenceRuleV2, DateOnlyString } from '../temporal/temporalTypes';

// ==========================================
// 1. WORKFLOW PRESETS
// ==========================================

export interface WorkflowPresetStep {
  actionId: string;
  label: string;
  args?: Record<string, any>;
  optional?: boolean;
}

export interface WorkflowPresetV2 {
  id: string;
  name: string;
  description?: string;
  iconName: string;
  category: 'productivity' | 'review' | 'learning' | 'travel' | 'custom';
  isBuiltIn: boolean;
  steps: WorkflowPresetStep[];
  order: number;
}

export interface WorkflowExecutionReport {
  presetId: string;
  presetName: string;
  startedAt: string;
  completedAt?: string;
  success: boolean;
  totalSteps: number;
  completedSteps: number;
  stoppedAtStep?: number;
  errorMessage?: string;
  stepResults: Array<{
    stepIndex: number;
    actionId: string;
    success: boolean;
    message?: string;
  }>;
}

// ==========================================
// 2. ROUTINES & ROUTINE RUNS
// ==========================================

export type RoutineStepType = 'checklist' | 'safe_action' | 'resource_link';

export interface RoutineStepV2 {
  id: string;
  type: RoutineStepType;
  label: string;
  note?: string;
  actionId?: string; // If safe_action
  actionArgs?: Record<string, any>;
  resourceId?: string; // If resource_link
  order: number;
}

export interface RoutineDefinitionV2 {
  id: string;
  name: string;
  description?: string;
  iconName: string;
  color?: string;
  schedule?: RecurrenceRuleV2;
  daypart?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  steps: RoutineStepV2[];
  status: 'active' | 'paused' | 'archived';
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface RoutineRunV2 {
  id: string;
  routineId: string;
  routineName: string;
  date: DateOnlyString; // YYYY-MM-DD
  startedAt: number;
  completedAt?: number;
  stepStates: Record<string, boolean>; // stepId -> completed
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// 3. AUTOMATIONS
// ==========================================

export type AutomationTriggerTypeV2 =
  | 'resource_created'
  | 'resource_updated'
  | 'task_completed'
  | 'tag_added'
  | 'property_changed'
  | 'schedule_time' // e.g. every Monday at 08:00
  | 'review_due'
  | 'routine_expected';

export interface AutomationTriggerV2 {
  type: AutomationTriggerTypeV2;
  resourceType?: string;
  propertyKey?: string;
  targetValue?: any;
  tag?: string;
  timeSchedule?: {
    time: string; // "08:00"
    recurrence: RecurrenceRuleV2;
    catchUpPolicy: 'run_latest_missed' | 'run_each_missed' | 'skip_missed';
  };
}

export interface AutomationConditionV2 {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'greater_than' | 'less_than' | 'is_today';
  value: any;
  negate?: boolean;
}

export type AutomationSafeActionClass =
  | 'create_note'
  | 'create_task'
  | 'set_property'
  | 'append_markdown'
  | 'start_review'
  | 'archive_resource';

export interface AutomationActionStepV2 {
  actionId: string;
  actionClass: AutomationSafeActionClass;
  params: Record<string, any>;
}

export interface AutomationRuleV2 {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  status: 'active' | 'disabled' | 'error' | 'paused';
  statusReason?: string;
  trigger: AutomationTriggerV2;
  conditionGroup: 'ALL' | 'ANY';
  conditions: AutomationConditionV2[];
  actions: AutomationActionStepV2[];
  maxChainDepth?: number; // default 3
  lastExecutedAt?: number;
  lastOccurrenceId?: string;
  consecutiveFailures?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AutomationExecutionLogV2 {
  id: string;
  ruleId: string;
  ruleName: string;
  triggerType: AutomationTriggerTypeV2;
  timestamp: number;
  status: 'success' | 'failed' | 'skipped' | 'loop_prevented';
  durationMs: number;
  affectedResourceIds: string[];
  details?: string;
  error?: string;
  executionChainDepth: number;
}
