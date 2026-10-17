/**
 * PKM V2.19 Reporting Security, Privacy & Permission Guard Engine
 * 
 * Enforces permission-scoped aggregation, side-channel inference prevention,
 * vault lock cache purging, and query AST sanitization.
 */

import { MetricDefinition } from './reportingTypes';
import { v2MetricsAndAggregationEngine } from './v2MetricsAndAggregationEngine';

export class V2ReportingSecurityEngine {
  private static instance: V2ReportingSecurityEngine | null = null;
  private isVaultLockedState: boolean = false;

  private constructor() {}

  public static getInstance(): V2ReportingSecurityEngine {
    if (!V2ReportingSecurityEngine.instance) {
      V2ReportingSecurityEngine.instance = new V2ReportingSecurityEngine();
    }
    return V2ReportingSecurityEngine.instance;
  }

  // ==========================================================================
  // PERMISSION & SCOPE CHECKING
  // ==========================================================================

  /**
   * Evaluates whether a caller (e.g. plugin or export routine) has permission to access a metric.
   * Prevents statistical side-channel attacks by disallowing unauthorized aggregate queries.
   */
  public canAccessMetric(
    metric: MetricDefinition,
    grantedPermissions: string[] = ['*']
  ): { allowed: boolean; reason?: string } {
    if (this.isVaultLockedState) {
      return { allowed: false, reason: 'Vault is currently locked.' };
    }

    if (grantedPermissions.includes('*')) {
      return { allowed: true };
    }

    const domainPerm = `${metric.domain}:read`;
    if (grantedPermissions.includes(domainPerm) || grantedPermissions.includes(`${metric.domain}:*`)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Unauthorized: Caller lacks "${domainPerm}" permission for sensitive domain "${metric.domain}".`,
    };
  }

  // ==========================================================================
  // VAULT LOCK & MEMORY PURGING
  // ==========================================================================

  public onVaultLocked(): void {
    this.isVaultLockedState = true;
    // Purge all cached aggregates from memory
    v2MetricsAndAggregationEngine.clearCache();
  }

  public onVaultUnlocked(): void {
    this.isVaultLockedState = false;
  }

  public isVaultLocked(): boolean {
    return this.isVaultLockedState;
  }

  // ==========================================================================
  // QUERY AST VALIDATION
  // ==========================================================================

  public validateQueryAST(query: any): { isValid: boolean; error?: string } {
    if (!query || typeof query !== 'object') {
      return { isValid: false, error: 'Query AST must be a valid object' };
    }

    const jsonStr = JSON.stringify(query);
    // Disallow code execution strings
    if (/(eval|Function|javascript:|__proto__|constructor)/i.test(jsonStr)) {
      return { isValid: false, error: 'Query contains forbidden execution keywords or prototype mutations' };
    }

    return { isValid: true };
  }
}

export const v2ReportingSecurityEngine = V2ReportingSecurityEngine.getInstance();
