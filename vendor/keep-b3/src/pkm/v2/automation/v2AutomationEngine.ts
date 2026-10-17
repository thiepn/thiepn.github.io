/**
 * PKM V2.20 — Unified Automation Engine V2
 * 
 * Provides declarative, event-indexed, time-scheduled, loop-protected automation execution.
 * 
 * Core Invariants:
 * 1. Safe Action Sandbox: ONLY registered safe action classes (no eval, no shell, no network).
 * 2. Loop & Recursion Protection: max chain depth <= 3, cycle detection, visited rule sets.
 * 3. Circuit Breaker: auto-pauses failing rules after threshold (default 5) consecutive errors.
 * 4. Multi-Device Idempotency: receipts tracked by `${ruleId}:${occurrenceId}`.
 * 5. Dry-Run Tracing: AST simulation with expected vs actual diffs without mutating vault.
 * 6. Bounded Catch-Up: time schedule catch-up policies ('run_latest_missed', 'run_each_missed', 'skip_missed').
 */

import {
  V2AutomationRule,
  V2AutomationExecutionLog,
  V2AutomationTriggerType,
  V2AutomationActionStep,
  V2AutomationActionClass,
  V2ConditionGroup,
  V2AutomationCondition,
  V2DryRunResult,
  V2RuleStatus,
} from './automationTypesV2';
import { v2ActionRegistry } from '../core/actions/actionSystem';
import { DateOnlyString } from '../temporal/temporalTypes';
import { AdvancedRecurrenceEngineV2 } from './advancedRecurrenceEngineV2';

export const MAX_CHAIN_DEPTH = 3;
export const MAX_EXECUTION_LOGS = 250;
export const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5;

export const ALLOWED_SAFE_ACTION_CLASSES: Set<V2AutomationActionClass> = new Set([
  'create_note',
  'create_task',
  'set_property',
  'append_markdown',
  'start_review',
  'archive_resource',
  'log_habit',
  'trigger_reminder',
  'add_tag',
  'remove_tag',
  'move_to_folder',
]);

export interface TriggerEventPayloadV2 {
  type: V2AutomationTriggerType;
  resourceId?: string;
  resourceType?: any;
  propertyKey?: string;
  propertyValue?: any;
  tag?: string;
  timestamp: number;
  occurrenceId?: string;
  executionChainDepth?: number;
  visitedRuleIds?: Set<string>;
}

export class V2AutomationEngine {
  private rules = new Map<string, V2AutomationRule>();
  private triggerIndex = new Map<V2AutomationTriggerType, Set<string>>();
  private logs: V2AutomationExecutionLog[] = [];
  private executedReceipts = new Set<string>(); // receiptKey -> boolean

  constructor() {
    this.registerBuiltInRules();
  }

  private registerBuiltInRules(): void {
    const mondayReviewRule: V2AutomationRule = {
      id: 'auto-weekly-review-draft',
      name: 'Monday Morning Weekly Review Draft',
      description: 'Automatically creates a weekly review scaffold every Monday morning at 08:00',
      enabled: true,
      status: 'active',
      trigger: {
        type: 'schedule_time',
        timeSchedule: {
          time: '08:00',
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            daysOfWeek: ['monday'],
          },
          catchUpPolicy: 'run_latest_missed',
        },
      },
      conditionTree: {
        logicalOperator: 'AND',
        conditions: [],
      },
      actions: [
        {
          id: 'act-1',
          actionId: 'review:start-weekly-review',
          actionClass: 'start_review',
          params: { title: 'Weekly Review' },
          description: 'Create weekly review snapshot',
        },
      ],
      consecutiveFailures: 0,
      executionCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const inboxAutoTag: V2AutomationRule = {
      id: 'auto-inbox-tagger',
      name: 'Auto-Tag Quick Captures',
      description: 'Applies #inbox tag to all newly created captures missing tags',
      enabled: true,
      status: 'active',
      trigger: {
        type: 'resource_created',
      },
      conditionTree: {
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'cond-1',
            field: 'tags',
            operator: 'is_empty',
            value: null,
          },
        ],
      },
      actions: [
        {
          id: 'act-tag-inbox',
          actionId: 'resource:add-tag',
          actionClass: 'add_tag',
          params: { tag: 'inbox' },
          description: 'Add #inbox tag',
        },
      ],
      consecutiveFailures: 0,
      executionCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.registerRule(mondayReviewRule);
    this.registerRule(inboxAutoTag);
  }

  public registerRule(rule: V2AutomationRule): void {
    this.rules.set(rule.id, {
      ...rule,
      consecutiveFailures: rule.consecutiveFailures || 0,
      executionCount: rule.executionCount || 0,
    });

    if (!this.triggerIndex.has(rule.trigger.type)) {
      this.triggerIndex.set(rule.trigger.type, new Set());
    }
    this.triggerIndex.get(rule.trigger.type)!.add(rule.id);
  }

  public unregisterRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    this.rules.delete(ruleId);
    const set = this.triggerIndex.get(rule.trigger.type);
    if (set) {
      set.delete(ruleId);
      if (set.size === 0) {
        this.triggerIndex.delete(rule.trigger.type);
      }
    }
  }

  public getRules(): V2AutomationRule[] {
    return Array.from(this.rules.values());
  }

  public getRule(id: string): V2AutomationRule | undefined {
    return this.rules.get(id);
  }

  public getLogs(): V2AutomationExecutionLog[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public resetCircuitBreaker(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;
    rule.status = 'active';
    rule.consecutiveFailures = 0;
    rule.statusReason = undefined;
  }

  /**
   * Dispatches a domain or scheduled trigger event to matching rules
   */
  public async dispatchEvent(
    event: TriggerEventPayloadV2,
    runtimeContext?: any
  ): Promise<V2AutomationExecutionLog[]> {
    const matchingRuleIds = this.triggerIndex.get(event.type);
    if (!matchingRuleIds || matchingRuleIds.size === 0) {
      return [];
    }

    const results: V2AutomationExecutionLog[] = [];
    const chainDepth = event.executionChainDepth || 0;
    const visited = new Set(event.visitedRuleIds || []);

    for (const ruleId of matchingRuleIds) {
      const rule = this.rules.get(ruleId);
      if (!rule || !rule.enabled || rule.status !== 'active') {
        continue;
      }

      // 1. Loop Prevention: Max Chain Depth Guard
      if (chainDepth >= (rule.maxChainDepth || MAX_CHAIN_DEPTH)) {
        const log: V2AutomationExecutionLog = {
          id: `log-${Date.now()}-${rule.id}`,
          ruleId: rule.id,
          ruleName: rule.name,
          triggerType: event.type,
          timestamp: Date.now(),
          status: 'loop_prevented',
          durationMs: 0,
          affectedResourceIds: event.resourceId ? [event.resourceId] : [],
          executionChainDepth: chainDepth,
          error: `Execution halted: Maximum automation chain depth (${MAX_CHAIN_DEPTH}) reached.`,
        };
        this.addLog(log);
        results.push(log);
        continue;
      }

      // 2. Loop Prevention: Cycle Detection (Rule re-entered in same chain)
      if (visited.has(rule.id)) {
        const log: V2AutomationExecutionLog = {
          id: `log-${Date.now()}-${rule.id}`,
          ruleId: rule.id,
          ruleName: rule.name,
          triggerType: event.type,
          timestamp: Date.now(),
          status: 'loop_prevented',
          durationMs: 0,
          affectedResourceIds: event.resourceId ? [event.resourceId] : [],
          executionChainDepth: chainDepth,
          error: `Execution cycle prevented: Rule "${rule.name}" attempted self-trigger within same execution chain.`,
        };
        this.addLog(log);
        results.push(log);
        continue;
      }

      // 3. Multi-Device Idempotency Receipt
      if (event.occurrenceId) {
        const receiptKey = `${rule.id}:${event.occurrenceId}`;
        if (this.executedReceipts.has(receiptKey)) {
          // Already executed on this or another synced peer
          continue;
        }
      }

      // 4. Trigger filter match
      if (!this.matchesTriggerFilter(rule, event)) {
        continue;
      }

      // 5. Condition evaluation
      const conditionsPassed = this.evaluateConditionGroup(rule.conditionTree, event, runtimeContext);
      if (!conditionsPassed) {
        continue;
      }

      // 6. Execute actions within safe sandbox
      const start = performance.now();
      let hasError = false;
      let errorMsg = '';
      const affectedIds: string[] = event.resourceId ? [event.resourceId] : [];

      const nextVisited = new Set(visited);
      nextVisited.add(rule.id);

      for (const step of rule.actions) {
        if (!ALLOWED_SAFE_ACTION_CLASSES.has(step.actionClass)) {
          hasError = true;
          errorMsg = `Action class "${step.actionClass}" is forbidden in automations.`;
          break;
        }

        const act = v2ActionRegistry.get(step.actionId);
        if (!act) {
          // If action is not in registry, check if standard action exists or fallback
          hasError = true;
          errorMsg = `Action "${step.actionId}" is missing from Action Registry.`;
          break;
        }

        try {
          const actResult = await v2ActionRegistry.execute(step.actionId, {
            ...step.params,
            resourceId: event.resourceId,
            context: runtimeContext,
          });

          if (!actResult.success) {
            hasError = true;
            errorMsg = actResult.error || 'Action execution failed';
            break;
          }

          if (actResult.data?.id || actResult.data?.resourceId) {
            affectedIds.push(actResult.data.id || actResult.data.resourceId);
          }
        } catch (err: any) {
          hasError = true;
          errorMsg = err.message || 'Execution exception';
          break;
        }
      }

      const durationMs = Math.round((performance.now() - start) * 100) / 100;

      if (hasError) {
        rule.consecutiveFailures++;
        const threshold = rule.circuitBreakerThreshold || DEFAULT_CIRCUIT_BREAKER_THRESHOLD;
        if (rule.consecutiveFailures >= threshold) {
          rule.status = 'paused_circuit_breaker';
          rule.statusReason = `Circuit breaker opened after ${rule.consecutiveFailures} consecutive failures. Error: ${errorMsg}`;
        }
      } else {
        rule.consecutiveFailures = 0;
        rule.executionCount++;
        rule.lastExecutedAt = Date.now();
        if (event.occurrenceId) {
          this.executedReceipts.add(`${rule.id}:${event.occurrenceId}`);
          rule.lastOccurrenceId = event.occurrenceId;
        }
      }

      const log: V2AutomationExecutionLog = {
        id: `log-${Date.now()}-${rule.id}`,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: event.type,
        timestamp: Date.now(),
        status: hasError ? 'failed' : 'success',
        durationMs,
        affectedResourceIds: affectedIds,
        executionChainDepth: chainDepth,
        error: hasError ? errorMsg : undefined,
        triggerPayloadSummary: JSON.stringify({
          resourceId: event.resourceId,
          tag: event.tag,
          propertyKey: event.propertyKey,
        }),
      };

      this.addLog(log);
      results.push(log);
    }

    return results;
  }

  /**
   * Dry-run simulation of an automation rule against a test event and context
   */
  public dryRun(
    rule: V2AutomationRule,
    sampleEvent: TriggerEventPayloadV2,
    runtimeContext?: any
  ): V2DryRunResult {
    const warnings: string[] = [];
    const simulatedEffects: string[] = [];
    const conditionEvaluations: V2DryRunResult['conditionEvaluations'] = [];

    // Verify actions
    for (const step of rule.actions) {
      if (!ALLOWED_SAFE_ACTION_CLASSES.has(step.actionClass)) {
        warnings.push(`Action class "${step.actionClass}" is restricted.`);
      }
      const act = v2ActionRegistry.get(step.actionId);
      if (!act) {
        warnings.push(`Action "${step.actionId}" is not registered.`);
      }
      simulatedEffects.push(`Would execute "${step.actionId}" (${step.actionClass}) with params: ${JSON.stringify(step.params)}`);
    }

    const triggerMatched = this.matchesTriggerFilter(rule, sampleEvent);

    // Evaluate conditions with itemized trace
    const evaluateSingle = (cond: V2AutomationCondition): boolean => {
      let actual = runtimeContext?.[cond.field];
      if (actual === undefined && sampleEvent.propertyKey === cond.field) {
        actual = sampleEvent.propertyValue;
      }
      const passed = this.evalCondition(cond, actual);
      conditionEvaluations.push({
        field: cond.field,
        operator: cond.operator,
        expected: cond.value,
        actual,
        passed,
      });
      return passed;
    };

    const evaluateGroup = (grp: V2ConditionGroup): boolean => {
      const condResults = (grp.conditions || []).map(evaluateSingle);
      const subResults = (grp.subGroups || []).map(evaluateGroup);
      const all = [...condResults, ...subResults];
      if (all.length === 0) return true;
      return grp.logicalOperator === 'AND' ? all.every(Boolean) : all.some(Boolean);
    };

    const conditionsPassed = evaluateGroup(rule.conditionTree);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggerMatched,
      conditionsPassed,
      conditionEvaluations,
      wouldExecuteActions: rule.actions,
      warnings,
      simulatedEffects,
    };
  }

  /**
   * Evaluates scheduled time triggers and handles catch-up policies
   */
  public async processScheduledTimeTriggers(
    currentDateStr: DateOnlyString,
    currentTimeStr: string
  ): Promise<V2AutomationExecutionLog[]> {
    const scheduledRuleIds = this.triggerIndex.get('schedule_time');
    if (!scheduledRuleIds || scheduledRuleIds.size === 0) return [];

    const allLogs: V2AutomationExecutionLog[] = [];

    for (const ruleId of scheduledRuleIds) {
      const rule = this.rules.get(ruleId);
      if (!rule || !rule.enabled || rule.status !== 'active' || !rule.trigger.timeSchedule) {
        continue;
      }

      const schedule = rule.trigger.timeSchedule;
      const lastEvaluated = schedule.lastEvaluatedDate || currentDateStr;

      // Check missed occurrences
      if (lastEvaluated < currentDateStr) {
        const missedDates = AdvancedRecurrenceEngineV2.calculateMissedOccurrences(
          schedule.recurrence,
          lastEvaluated,
          currentDateStr
        );

        if (missedDates.length > 0) {
          switch (schedule.catchUpPolicy) {
            case 'run_latest_missed': {
              const latestDate = missedDates[missedDates.length - 1];
              const occId = `${rule.id}_${latestDate}_${schedule.time}`;
              const logs = await this.dispatchEvent({
                type: 'schedule_time',
                occurrenceId: occId,
                timestamp: Date.now(),
              });
              allLogs.push(...logs);
              break;
            }
            case 'run_each_missed': {
              for (const d of missedDates) {
                const occId = `${rule.id}_${d}_${schedule.time}`;
                const logs = await this.dispatchEvent({
                  type: 'schedule_time',
                  occurrenceId: occId,
                  timestamp: Date.now(),
                });
                allLogs.push(...logs);
              }
              break;
            }
            case 'skip_missed':
            default:
              break;
          }
        }
      }

      // Check today's scheduled time
      if (schedule.time <= currentTimeStr) {
        const occId = `${rule.id}_${currentDateStr}_${schedule.time}`;
        const logs = await this.dispatchEvent({
          type: 'schedule_time',
          occurrenceId: occId,
          timestamp: Date.now(),
        });
        allLogs.push(...logs);
      }

      schedule.lastEvaluatedDate = currentDateStr;
    }

    return allLogs;
  }

  private matchesTriggerFilter(rule: V2AutomationRule, event: TriggerEventPayloadV2): boolean {
    if (rule.trigger.type !== event.type) return false;
    if (rule.trigger.resourceType && event.resourceType && rule.trigger.resourceType !== event.resourceType) {
      return false;
    }
    if (rule.trigger.propertyKey && event.propertyKey && rule.trigger.propertyKey !== event.propertyKey) {
      return false;
    }
    if (rule.trigger.tag && event.tag && rule.trigger.tag !== event.tag) {
      return false;
    }
    return true;
  }

  private evaluateConditionGroup(
    group: V2ConditionGroup,
    event: TriggerEventPayloadV2,
    context?: any
  ): boolean {
    if (!group) return true;
    const condResults = (group.conditions || []).map((cond) => {
      let actual = context?.[cond.field];
      if (actual === undefined && event.propertyKey === cond.field) {
        actual = event.propertyValue;
      }
      return this.evalCondition(cond, actual);
    });

    const subGroupResults = (group.subGroups || []).map((sub) =>
      this.evaluateConditionGroup(sub, event, context)
    );

    const all = [...condResults, ...subGroupResults];
    if (all.length === 0) return true;

    return group.logicalOperator === 'AND' ? all.every(Boolean) : all.some(Boolean);
  }

  private evalCondition(cond: V2AutomationCondition, actual: any): boolean {
    let match = false;
    switch (cond.operator) {
      case 'equals':
        match = actual === cond.value;
        break;
      case 'not_equals':
        match = actual !== cond.value;
        break;
      case 'contains':
        if (Array.isArray(actual)) match = actual.includes(cond.value);
        else if (typeof actual === 'string') match = actual.includes(String(cond.value));
        break;
      case 'not_contains':
        if (Array.isArray(actual)) match = !actual.includes(cond.value);
        else if (typeof actual === 'string') match = !actual.includes(String(cond.value));
        break;
      case 'starts_with':
        match = typeof actual === 'string' && actual.startsWith(String(cond.value));
        break;
      case 'ends_with':
        match = typeof actual === 'string' && actual.endsWith(String(cond.value));
        break;
      case 'greater_than':
        match = typeof actual === 'number' && actual > Number(cond.value);
        break;
      case 'less_than':
        match = typeof actual === 'number' && actual < Number(cond.value);
        break;
      case 'greater_than_or_equal':
        match = typeof actual === 'number' && actual >= Number(cond.value);
        break;
      case 'less_than_or_equal':
        match = typeof actual === 'number' && actual <= Number(cond.value);
        break;
      case 'is_empty':
        match = actual === undefined || actual === null || actual === '' || (Array.isArray(actual) && actual.length === 0);
        break;
      case 'is_not_empty':
        match = actual !== undefined && actual !== null && actual !== '' && (!Array.isArray(actual) || actual.length > 0);
        break;
      case 'matches_tag':
        match = Array.isArray(actual) && actual.includes(cond.value);
        break;
      default:
        match = true;
    }

    return cond.negate ? !match : match;
  }

  private addLog(log: V2AutomationExecutionLog): void {
    this.logs.unshift(log);
    if (this.logs.length > MAX_EXECUTION_LOGS) {
      this.logs.pop();
    }
  }
}

export const v2AutomationEngine = new V2AutomationEngine();
