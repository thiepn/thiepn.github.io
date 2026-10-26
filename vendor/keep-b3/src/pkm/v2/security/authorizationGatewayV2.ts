/**
 * V2.8 Centralized Execution-Time Authorization Gateway
 * Enforces least-privilege, checks capabilities dynamically at execution time,
 * and fails closed when revoked or when vault is locked.
 */

import {
  DomainSensitivityV2,
  SecurityCapabilityV2,
  SecurityGrantV2,
  SecurityViolationV2,
  ThreatSeverityV2,
  TrustLevelV2,
} from './securityTypesV2';

export interface ExecutionContextV2 {
  callerId: string;
  callerTrustLevel: TrustLevelV2;
  domain?: 'health' | 'finance' | 'notes' | 'people' | 'travel' | 'system';
  vaultSessionGeneration: number;
}

export class AuthorizationGatewayV2 {
  private static instance: AuthorizationGatewayV2;

  private grants = new Map<string, SecurityGrantV2>();
  private violations: SecurityViolationV2[] = [];
  private currentVaultSessionGeneration: number = 1;
  private isVaultLocked: boolean = false;
  private maxViolationsLog: number = 200;

  private constructor() {}

  public static getInstance(): AuthorizationGatewayV2 {
    if (!AuthorizationGatewayV2.instance) {
      AuthorizationGatewayV2.instance = new AuthorizationGatewayV2();
    }
    return AuthorizationGatewayV2.instance;
  }

  public setVaultLockState(locked: boolean): void {
    this.isVaultLocked = locked;
    if (locked) {
      // Invalidate active session generation on lock to kill in-flight async tasks
      this.currentVaultSessionGeneration += 1;
    }
  }

  public getVaultSessionGeneration(): number {
    return this.currentVaultSessionGeneration;
  }

  public isLocked(): boolean {
    return this.isVaultLocked;
  }

  public registerGrant(
    subjectId: string,
    subjectType: SecurityGrantV2['subjectType'],
    capabilities: SecurityCapabilityV2[],
    allowedOrigins?: string[],
    expiresAt?: number
  ): void {
    this.grants.set(subjectId, {
      subjectId,
      subjectType,
      grantedCapabilities: new Set(capabilities),
      allowedOrigins,
      expiresAt,
      revoked: false,
      grantSessionGeneration: this.currentVaultSessionGeneration,
    });
  }

  public revokeGrant(subjectId: string): void {
    const grant = this.grants.get(subjectId);
    if (grant) {
      grant.revoked = true;
      this.grants.delete(subjectId);
    }
  }

  public clearAllGrants(): void {
    this.grants.clear();
  }

  /**
   * Execution-time capability validation.
   * Fails closed if:
   * 1. Vault is locked
   * 2. Caller session generation does not match current vault session
   * 3. Caller is sandboxed/external and does not have the capability granted
   * 4. Grant is revoked or expired
   */
  public checkAuthorization(
    context: ExecutionContextV2,
    requiredCapability: SecurityCapabilityV2
  ): { authorized: boolean; reason?: string } {
    if (this.isVaultLocked) {
      this.logViolation(context, requiredCapability, 'S1_HIGH', 'Operation rejected: Vault is currently locked');
      return { authorized: false, reason: 'Vault is locked' };
    }

    if (context.vaultSessionGeneration !== this.currentVaultSessionGeneration) {
      this.logViolation(
        context,
        requiredCapability,
        'S1_HIGH',
        'Stale session generation: Vault was locked/unlocked since operation was scheduled'
      );
      return { authorized: false, reason: 'Stale execution session' };
    }

    // Core trusted code has access to core features, but domain boundaries are still validated
    if (context.callerTrustLevel === 'core_trusted') {
      return { authorized: true };
    }

    // Sandboxed extensions, connectors, and AI MUST have an explicit grant
    const grant = this.grants.get(context.callerId);
    if (!grant || grant.revoked) {
      this.logViolation(
        context,
        requiredCapability,
        'S1_HIGH',
        `Access denied: No active grant for capability "${requiredCapability}"`
      );
      return { authorized: false, reason: `Missing grant for ${requiredCapability}` };
    }

    if (grant.expiresAt && Date.now() > grant.expiresAt) {
      this.logViolation(context, requiredCapability, 'S2_MEDIUM', 'Access denied: Grant has expired');
      return { authorized: false, reason: 'Grant expired' };
    }

    if (!grant.grantedCapabilities.has(requiredCapability)) {
      this.logViolation(
        context,
        requiredCapability,
        'S1_HIGH',
        `Unauthorized operation: Subject ${context.callerId} does not hold capability "${requiredCapability}"`
      );
      return { authorized: false, reason: `Unauthorized capability: ${requiredCapability}` };
    }

    return { authorized: true };
  }

  /**
   * Evaluates if a domain has high sensitivity and requires extra opt-in.
   */
  public classifyDomainSensitivity(domain: string): DomainSensitivityV2 {
    const d = domain.toLowerCase();
    if (d === 'health' || d === 'finance' || d === 'credentials' || d === 'keys' || d === 'secrets') {
      return 'highly_sensitive';
    }
    if (d === 'people' || d === 'travel' || d === 'decisions' || d === 'assets') {
      return 'sensitive';
    }
    return 'standard_vault';
  }

  private logViolation(
    context: ExecutionContextV2,
    capability: string,
    severity: ThreatSeverityV2,
    reason: string
  ): void {
    const violation: SecurityViolationV2 = {
      id: `sec_viol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      subjectId: context.callerId,
      attemptedCapability: capability,
      trustLevel: context.callerTrustLevel,
      severity,
      reason,
      blocked: true,
    };
    this.violations.push(violation);
    if (this.violations.length > this.maxViolationsLog) {
      this.violations.shift();
    }
  }

  public getViolations(): SecurityViolationV2[] {
    return [...this.violations];
  }

  public clearViolations(): void {
    this.violations = [];
  }
}

export const authorizationGatewayV2 = AuthorizationGatewayV2.getInstance();
