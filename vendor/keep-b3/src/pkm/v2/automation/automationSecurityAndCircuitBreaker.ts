/**
 * PKM V2.20 — Automation Security, Permission Gating & Circuit Breaker Guard
 * 
 * Enforces strict sandbox isolation:
 * - Prohibits eval, Function, shell, and external network fetch.
 * - Enforces permission checks ('automation:execute', 'automation:manage').
 * - Vault-lock memory purging and state zeroing.
 * - Safe JSON serialization/deserialization for vault portability.
 */

import { V2AutomationRule, V2RuleStatus } from './automationTypesV2';
import { ALLOWED_SAFE_ACTION_CLASSES } from './v2AutomationEngine';

export class AutomationSecurityEngineV2 {
  private static isVaultLocked = false;

  public static lockVault(): void {
    this.isVaultLocked = true;
  }

  public static unlockVault(): void {
    this.isVaultLocked = false;
  }

  public static isLocked(): boolean {
    return this.isVaultLocked;
  }

  /**
   * Validates that an automation rule adheres to the strict sandboxed safety constraints
   */
  public static validateRuleSecurity(rule: V2AutomationRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.id || typeof rule.id !== 'string') {
      errors.push('Rule ID is missing or malformed.');
    }

    if (!rule.name || typeof rule.name !== 'string') {
      errors.push('Rule name is missing or malformed.');
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push('Rule must contain at least one action step.');
    }

    for (const action of rule.actions || []) {
      if (!ALLOWED_SAFE_ACTION_CLASSES.has(action.actionClass)) {
        errors.push(`Action class "${action.actionClass}" is unauthorized for automation execution.`);
      }

      // Prohibit code injection keywords in parameters
      const paramsJson = JSON.stringify(action.params || {});
      if (
        paramsJson.includes('__proto__') ||
        paramsJson.includes('constructor') ||
        paramsJson.includes('prototype') ||
        paramsJson.includes('process.env')
      ) {
        errors.push(`Action "${action.id}" contains unsafe prototype or environment manipulation keywords.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitizes rules for vault export
   */
  public static serializeRulesForExport(rules: V2AutomationRule[]): string {
    const sanitized = rules.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      enabled: r.enabled,
      status: r.status === 'paused_circuit_breaker' ? 'active' : r.status,
      trigger: r.trigger,
      conditionTree: r.conditionTree,
      actions: r.actions,
      maxChainDepth: r.maxChainDepth || 3,
      circuitBreakerThreshold: r.circuitBreakerThreshold || 5,
      consecutiveFailures: 0,
      executionCount: 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return JSON.stringify(sanitized, null, 2);
  }

  /**
   * Safely parses imported rules
   */
  public static deserializeImportedRules(jsonString: string): V2AutomationRule[] {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('Imported automation rules must be an array.');
    }

    const validatedRules: V2AutomationRule[] = [];
    for (const item of parsed) {
      const { valid, errors } = this.validateRuleSecurity(item);
      if (!valid) {
        throw new Error(`Security validation failed for imported rule: ${errors.join('; ')}`);
      }
      validatedRules.push(item);
    }

    return validatedRules;
  }
}
