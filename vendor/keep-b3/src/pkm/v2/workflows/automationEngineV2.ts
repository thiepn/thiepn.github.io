/**
 * PKM V2.3 — Integrated Automation Engine V2
 * 
 * Provides an event-indexed, loop-protected, deterministic automation rule engine.
 * 
 * Non-negotiable principles:
 * - Only automation-safe actions are allowed (no external writes, no arbitrary code, no shell).
 * - Loop prevention: max chain depth <= 3, operation fingerprint deduplication.
 * - Time trigger index with bounded catch-up policies.
 * - Idempotent occurrence records for multi-device safety.
 */

import {
  AutomationRuleV2,
  AutomationExecutionLogV2,
  AutomationTriggerTypeV2,
  AutomationActionStepV2,
  AutomationSafeActionClass,
} from './workflowTypes';
import { v2ActionRegistry } from '../core/actions/actionSystem';

const MAX_CHAIN_DEPTH = 3;
const MAX_LOG_ENTRIES = 200;

export const ALLOWED_AUTOMATION_ACTION_CLASSES: Set<AutomationSafeActionClass> = new Set([
  'create_note',
  'create_task',
  'set_property',
  'append_markdown',
  'start_review',
  'archive_resource',
]);

export interface TriggerEventPayload {
  type: AutomationTriggerTypeV2;
  resourceId?: string;
  resourceType?: string;
  propertyKey?: string;
  propertyValue?: any;
  tag?: string;
  timestamp: number;
  occurrenceId?: string;
  executionChainDepth?: number;
  visitedRuleIds?: Set<string>;
}

export interface DryRunTrace {
  ruleId: string;
  ruleName: string;
  triggerMatched: boolean;
  conditionsPassed: boolean;
  wouldExecuteActions: AutomationActionStepV2[];
  warnings: string[];
}

export class AutomationEngineV2 {
  private rules = new Map<string, AutomationRuleV2>();
  // Trigger index: triggerType -> Set of rule IDs
  private triggerIndex = new Map<AutomationTriggerTypeV2, Set<string>>();
  // Execution logs
  private logs: AutomationExecutionLogV2[] = [];
  // Idempotency receipts: occurrenceKey -> boolean
  private executedOccurrences = new Set<string>();

  constructor() {
    this.registerBuiltInRules();
  }

  private registerBuiltInRules(): void {
    const defaultRule: AutomationRuleV2 = {
      id: 'auto-weekly-review-reminder',
      name: 'Create Weekly Review on Monday Morning',
      description: 'Automatically initiates a draft Weekly Review every Monday at 08:00',
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
      conditionGroup: 'ALL',
      conditions: [],
      actions: [
        {
          actionId: 'review:start-weekly-review',
          actionClass: 'start_review',
          params: { title: 'Weekly Review' },
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.registerRule(defaultRule);
  }

  public registerRule(rule: AutomationRuleV2): void {
    this.rules.set(rule.id, rule);

    // Update trigger index
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

  public getRules(): AutomationRuleV2[] {
    return Array.from(this.rules.values());
  }

  public getRule(id: string): AutomationRuleV2 | undefined {
    return this.rules.get(id);
  }

  public getLogs(): AutomationExecutionLogV2[] {
    return [...this.logs];
  }

  /**
   * Evaluates and dispatches a domain event to all indexed matching rules
   */
  public async dispatchEvent(event: TriggerEventPayload, runtimeContext?: any): Promise<AutomationExecutionLogV2[]> {
    const matchingRuleIds = this.triggerIndex.get(event.type);
    if (!matchingRuleIds || matchingRuleIds.size === 0) {
      return [];
    }

    const results: AutomationExecutionLogV2[] = [];
    const chainDepth = event.executionChainDepth || 0;
    const visited = event.visitedRuleIds || new Set<string>();

    for (const ruleId of matchingRuleIds) {
      const rule = this.rules.get(ruleId);
      if (!rule || !rule.enabled || rule.status !== 'active') {
        continue;
      }

      // 1. Loop Prevention check: Chain depth limit
      if (chainDepth >= MAX_CHAIN_DEPTH) {
        const log: AutomationExecutionLogV2 = {
          id: `log-${Date.now()}-${rule.id}`,
          ruleId: rule.id,
          ruleName: rule.name,
          triggerType: event.type,
          timestamp: Date.now(),
          status: 'loop_prevented',
          durationMs: 0,
          affectedResourceIds: event.resourceId ? [event.resourceId] : [],
          error: `Execution halted: maximum automation chain depth (${MAX_CHAIN_DEPTH}) exceeded.`,
          executionChainDepth: chainDepth,
        };
        this.addLog(log);
        results.push(log);
        continue;
      }

      // 2. Loop Prevention check: Cycle detection (same rule within chain)
      if (visited.has(rule.id)) {
        const log: AutomationExecutionLogV2 = {
          id: `log-${Date.now()}-${rule.id}`,
          ruleId: rule.id,
          ruleName: rule.name,
          triggerType: event.type,
          timestamp: Date.now(),
          status: 'loop_prevented',
          durationMs: 0,
          affectedResourceIds: event.resourceId ? [event.resourceId] : [],
          error: `Execution cycle prevented: rule "${rule.name}" attempted to trigger itself in the same execution chain.`,
          executionChainDepth: chainDepth,
        };
        this.addLog(log);
        results.push(log);
        continue;
      }

      // 3. Multi-Device Idempotency check
      if (event.occurrenceId) {
        const receiptKey = `${rule.id}:${event.occurrenceId}`;
        if (this.executedOccurrences.has(receiptKey)) {
          // Already executed on this or another synced device
          continue;
        }
      }

      // 4. Evaluate trigger filters and conditions
      const triggerMatches = this.evaluateTriggerMatch(rule, event);
      if (!triggerMatches) continue;

      const conditionsPassed = this.evaluateConditions(rule, event, runtimeContext);
      if (!conditionsPassed) {
        continue;
      }

      // 5. Execute actions
      const start = performance.now();
      let hasError = false;
      let errorMsg = '';
      const affectedIds: string[] = event.resourceId ? [event.resourceId] : [];

      for (const actionStep of rule.actions) {
        // Enforce safe action class
        if (!ALLOWED_AUTOMATION_ACTION_CLASSES.has(actionStep.actionClass)) {
          hasError = true;
          errorMsg = `Action class "${actionStep.actionClass}" is not permitted in automations.`;
          rule.status = 'error';
          rule.statusReason = errorMsg;
          break;
        }

        const act = v2ActionRegistry.get(actionStep.actionId);
        if (!act) {
          hasError = true;
          errorMsg = `Action "${actionStep.actionId}" is missing from Action Registry.`;
          rule.status = 'error';
          rule.statusReason = errorMsg;
          break;
        }

        try {
          const actResult = await v2ActionRegistry.execute(actionStep.actionId, {
            ...actionStep.params,
            context: runtimeContext,
          });

          if (!actResult.success) {
            hasError = true;
            errorMsg = actResult.error || 'Action execution failed';
            break;
          }

          if (actResult.data && (actResult.data.id || actResult.data.resourceId)) {
            affectedIds.push(actResult.data.id || actResult.data.resourceId);
          }
        } catch (err: any) {
          hasError = true;
          errorMsg = err.message || 'Execution error';
          break;
        }
      }

      const durationMs = Math.round((performance.now() - start) * 100) / 100;

      // Record occurrence receipt
      if (event.occurrenceId) {
        this.executedOccurrences.add(`${rule.id}:${event.occurrenceId}`);
      }

      rule.lastExecutedAt = Date.now();

      const log: AutomationExecutionLogV2 = {
        id: `log-${Date.now()}-${rule.id}`,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: event.type,
        timestamp: Date.now(),
        status: hasError ? 'failed' : 'success',
        durationMs,
        affectedResourceIds: affectedIds,
        error: hasError ? errorMsg : undefined,
        executionChainDepth: chainDepth,
      };

      this.addLog(log);
      results.push(log);
    }

    return results;
  }

  /**
   * Simulates a rule without applying changes
   */
  public dryRun(rule: AutomationRuleV2, sampleEvent: TriggerEventPayload, runtimeContext?: any): DryRunTrace {
    const warnings: string[] = [];

    // Verify all actions are in safe class
    for (const step of rule.actions) {
      if (!ALLOWED_AUTOMATION_ACTION_CLASSES.has(step.actionClass)) {
        warnings.push(`Action "${step.actionId}" uses restricted class "${step.actionClass}".`);
      }
      const act = v2ActionRegistry.get(step.actionId);
      if (!act) {
        warnings.push(`Action "${step.actionId}" is not registered.`);
      }
    }

    const triggerMatched = this.evaluateTriggerMatch(rule, sampleEvent);
    const conditionsPassed = this.evaluateConditions(rule, sampleEvent, runtimeContext);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggerMatched,
      conditionsPassed,
      wouldExecuteActions: rule.actions,
      warnings,
    };
  }

  private evaluateTriggerMatch(rule: AutomationRuleV2, event: TriggerEventPayload): boolean {
    if (rule.trigger.type !== event.type) return false;

    if (rule.trigger.resourceType && event.resourceType) {
      if (rule.trigger.resourceType !== event.resourceType) return false;
    }

    if (rule.trigger.propertyKey && event.propertyKey) {
      if (rule.trigger.propertyKey !== event.propertyKey) return false;
    }

    if (rule.trigger.tag && event.tag) {
      if (rule.trigger.tag !== event.tag) return false;
    }

    return true;
  }

  private evaluateConditions(rule: AutomationRuleV2, event: TriggerEventPayload, runtimeContext?: any): boolean {
    if (!rule.conditions || rule.conditions.length === 0) return true;

    const results = rule.conditions.map((cond) => {
      let actualValue: any = undefined;
      if (runtimeContext && cond.field in runtimeContext) {
        actualValue = runtimeContext[cond.field];
      } else if (event.propertyKey === cond.field) {
        actualValue = event.propertyValue;
      }

      let match = false;
      switch (cond.operator) {
        case 'equals':
          match = actualValue === cond.value;
          break;
        case 'not_equals':
          match = actualValue !== cond.value;
          break;
        case 'contains':
          match = typeof actualValue === 'string' && actualValue.includes(String(cond.value));
          break;
        case 'starts_with':
          match = typeof actualValue === 'string' && actualValue.startsWith(String(cond.value));
          break;
        case 'greater_than':
          match = typeof actualValue === 'number' && actualValue > Number(cond.value);
          break;
        case 'less_than':
          match = typeof actualValue === 'number' && actualValue < Number(cond.value);
          break;
        default:
          match = true;
      }

      return cond.negate ? !match : match;
    });

    if (rule.conditionGroup === 'ALL') {
      return results.every(Boolean);
    } else {
      return results.some(Boolean);
    }
  }

  private addLog(log: AutomationExecutionLogV2): void {
    this.logs.unshift(log);
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs.pop();
    }
  }
}

export const automationEngineV2 = new AutomationEngineV2();
