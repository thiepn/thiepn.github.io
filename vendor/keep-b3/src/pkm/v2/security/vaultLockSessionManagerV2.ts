/**
 * V2.8 Vault Lock Session Lifecycle & Memory Hygiene Manager
 * Coordinates session generation invalidation, memory purging, and brute-force backoff.
 */

import { authorizationGatewayV2 } from './authorizationGatewayV2';

export interface UnlockAttemptResult {
  success: boolean;
  blockedByRateLimit?: boolean;
  backoffMsRemaining?: number;
  sessionGenerationId?: number;
  error?: string;
}

export class VaultLockSessionManagerV2 {
  private static instance: VaultLockSessionManagerV2;

  private isLocked: boolean = true;
  private currentSessionGeneration: number = 100;
  private failedAttempts: number = 0;
  private nextAllowedAttemptTimestamp: number = 0;
  private sensitiveCachePurgeCallbacks: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): VaultLockSessionManagerV2 {
    if (!VaultLockSessionManagerV2.instance) {
      VaultLockSessionManagerV2.instance = new VaultLockSessionManagerV2();
    }
    return VaultLockSessionManagerV2.instance;
  }

  public registerSensitivePurgeCallback(cb: () => void): () => void {
    this.sensitiveCachePurgeCallbacks.push(cb);
    return () => {
      this.sensitiveCachePurgeCallbacks = this.sensitiveCachePurgeCallbacks.filter((c) => c !== cb);
    };
  }

  public getSessionGenerationId(): number {
    return this.currentSessionGeneration;
  }

  public getIsLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Locks the vault immediately:
   * 1. Increments session generation ID to invalidate in-flight async promises
   * 2. Sets AuthorizationGateway locked status
   * 3. Invokes all sensitive cache purge hooks
   */
  public lockVault(): void {
    this.isLocked = true;
    this.currentSessionGeneration += 1;
    authorizationGatewayV2.setVaultLockState(true);

    // Deep purge of sensitive memory caches
    for (const purge of this.sensitiveCachePurgeCallbacks) {
      try {
        purge();
      } catch (err) {
        console.error('Failed to purge sensitive cache during vault lock:', err);
      }
    }
  }

  /**
   * Validates if an asynchronous response should be accepted or rejected.
   * If session generation changed since request started, response is rejected.
   */
  public isAsyncOperationValid(scheduledSessionGenerationId: number): boolean {
    if (this.isLocked) return false;
    return scheduledSessionGenerationId === this.currentSessionGeneration;
  }

  /**
   * Unlock with defensive local rate-limiting (exponential backoff) to protect against UI brute-force.
   */
  public recordUnlockAttempt(
    isPasswordCorrect: boolean,
    mockTimeMs: number = Date.now()
  ): UnlockAttemptResult {
    if (mockTimeMs < this.nextAllowedAttemptTimestamp) {
      const remaining = this.nextAllowedAttemptTimestamp - mockTimeMs;
      return {
        success: false,
        blockedByRateLimit: true,
        backoffMsRemaining: remaining,
        error: `Too many failed attempts. Please wait ${Math.ceil(remaining / 1000)}s before retrying.`,
      };
    }

    if (!isPasswordCorrect) {
      this.failedAttempts += 1;
      // Exponential backoff starting at 3 failed attempts: 1s, 2s, 4s, 8s, capped at 30s
      if (this.failedAttempts >= 3) {
        const backoffSeconds = Math.min(30, Math.pow(2, this.failedAttempts - 3));
        this.nextAllowedAttemptTimestamp = mockTimeMs + backoffSeconds * 1000;
      }
      return {
        success: false,
        blockedByRateLimit: false,
        error: 'Incorrect vault password',
      };
    }

    // Success
    this.failedAttempts = 0;
    this.nextAllowedAttemptTimestamp = 0;
    this.isLocked = false;
    this.currentSessionGeneration += 1;
    authorizationGatewayV2.setVaultLockState(false);

    return {
      success: true,
      sessionGenerationId: this.currentSessionGeneration,
    };
  }

  public resetRateLimit(): void {
    this.failedAttempts = 0;
    this.nextAllowedAttemptTimestamp = 0;
  }
}

export const vaultLockSessionManagerV2 = VaultLockSessionManagerV2.getInstance();
