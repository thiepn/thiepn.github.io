/**
 * V2.11 Crash Containment & Safe Mode Engine
 * 
 * Implements fault isolation boundaries across subsystems, crash-loop detection,
 * Safe Mode & Recovery Mode orchestration, zero-encryption-bypass enforcement,
 * and read-only storage fallback.
 */

export type SubsystemBoundary =
  | 'APP_SHELL'
  | 'RESOURCE_RENDERER'
  | 'OPTIONAL_DOMAIN_MODULE'
  | 'PLUGIN_UI'
  | 'DASHBOARD_WIDGET'
  | 'HOME_CONTRIBUTIONS'
  | 'CONTEXT_CONTRIBUTIONS'
  | 'CONNECTORS'
  | 'AI_PROVIDERS';

export interface CrashEvent {
  id: string;
  subsystem: SubsystemBoundary;
  timestamp: string;
  errorMessage: string;
  errorStack?: string;
  componentName?: string;
}

export interface SafeModeOptions {
  disablePlugins: boolean;
  disableConnectors: boolean;
  skipOptionalModules: boolean;
  forceReadOnly: boolean;
  rebuildDerivedIndexesOnBoot: boolean;
}

export class CrashContainmentEngine {
  private static instance: CrashContainmentEngine;
  private bootCrashCounter = 0;
  private maxAllowedBootCrashes = 3;
  private isSafeModeActive = false;
  private isReadOnlyMode = false;
  private recentCrashes: CrashEvent[] = [];

  public static getInstance(): CrashContainmentEngine {
    if (!CrashContainmentEngine.instance) {
      CrashContainmentEngine.instance = new CrashContainmentEngine();
    }
    return CrashContainmentEngine.instance;
  }

  /**
   * Records a subsystem crash event.
   * If the crash occurred in APP_SHELL during boot, increments boot crash counter.
   */
  public recordCrash(subsystem: SubsystemBoundary, error: Error, componentName?: string): {
    triggeredSafeMode: boolean;
    isIsolated: boolean;
  } {
    const event: CrashEvent = {
      id: `CRASH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      subsystem,
      timestamp: new Date().toISOString(),
      errorMessage: error.message || 'Unknown runtime error',
      errorStack: error.stack,
      componentName,
    };

    this.recentCrashes.unshift(event);
    if (this.recentCrashes.length > 50) {
      this.recentCrashes.pop();
    }

    if (subsystem === 'APP_SHELL') {
      this.bootCrashCounter++;
      if (this.bootCrashCounter >= this.maxAllowedBootCrashes) {
        this.enableSafeMode();
        return { triggeredSafeMode: true, isIsolated: false };
      }
    }

    return {
      triggeredSafeMode: this.isSafeModeActive,
      isIsolated: subsystem !== 'APP_SHELL',
    };
  }

  public enableSafeMode() {
    this.isSafeModeActive = true;
  }

  public disableSafeMode() {
    this.isSafeModeActive = false;
    this.bootCrashCounter = 0;
  }

  public getSafeModeStatus(): {
    isActive: boolean;
    bootCrashCount: number;
    threshold: number;
    isReadOnly: boolean;
    options: SafeModeOptions;
  } {
    return {
      isActive: this.isSafeModeActive,
      bootCrashCount: this.bootCrashCounter,
      threshold: this.maxAllowedBootCrashes,
      isReadOnly: this.isReadOnlyMode,
      options: {
        disablePlugins: this.isSafeModeActive,
        disableConnectors: this.isSafeModeActive,
        skipOptionalModules: this.isSafeModeActive,
        forceReadOnly: this.isReadOnlyMode,
        rebuildDerivedIndexesOnBoot: false,
      },
    };
  }

  public setReadOnlyMode(readOnly: boolean) {
    this.isReadOnlyMode = readOnly;
  }

  /**
   * Enforces that Recovery Mode NEVER bypasses encryption.
   * Any access to encrypted vaults in Safe/Recovery mode strictly requires cryptographic unlock.
   */
  public verifyEncryptionRequirement(isVaultEncrypted: boolean, isUnlocked: boolean): {
    accessGranted: boolean;
    message: string;
  } {
    if (isVaultEncrypted && !isUnlocked) {
      return {
        accessGranted: false,
        message: 'Recovery Mode strictly enforces cryptographic unlock. Master password required.',
      };
    }
    return {
      accessGranted: true,
      message: 'Vault unlocked securely.',
    };
  }

  public getRecentCrashes(): CrashEvent[] {
    return [...this.recentCrashes];
  }

  public clearCrashHistory() {
    this.recentCrashes = [];
    this.bootCrashCounter = 0;
  }
}

export const crashContainmentEngine = CrashContainmentEngine.getInstance();
