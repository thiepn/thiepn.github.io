/**
 * P46 — Native OS Credential Storage Adapter
 * Integrates with OS Keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service).
 *
 * Rules:
 * - Master vault password and raw encryption keys are NEVER automatically stored in the OS Keychain.
 * - Eligible credentials: Git provider tokens, external AI API keys.
 * - When in browser/PWA, safely falls back to P30 Hardened Token Storage (AES-256-GCM vault-encrypted storage or session memory).
 * - Plaintext credentials are NEVER persisted to localStorage.
 */

import { hardenedTokenStorage } from '../security/tokenStorage';
import { DesktopSecurityGuard } from './desktopSecurityGuard';

export interface StoredCredentialRecord {
  service: string;
  account: string;
  updatedAt: string;
}

export class DesktopCredentialStore {
  private isNativeAvailable: boolean = false;
  private backendName: 'Windows Credential Manager' | 'macOS Keychain' | 'Linux Secret Service' | 'Encrypted Vault Fallback' | 'Session Memory' = 'Session Memory';

  constructor() {
    this.detectCapabilities();
  }

  private detectCapabilities(): void {
    if (typeof window !== 'undefined' && (window as any).__TAURI__ && (window as any).__TAURI__.core) {
      this.isNativeAvailable = true;
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mac')) {
        this.backendName = 'macOS Keychain';
      } else if (ua.includes('win')) {
        this.backendName = 'Windows Credential Manager';
      } else {
        this.backendName = 'Linux Secret Service';
      }
    } else {
      this.isNativeAvailable = false;
      this.backendName = hardenedTokenStorage.hasEncryptedToken() ? 'Encrypted Vault Fallback' : 'Session Memory';
    }
  }

  public getBackendName(): string {
    return this.backendName;
  }

  public isNativeStoreAvailable(): boolean {
    return this.isNativeAvailable;
  }

  /**
   * Stores a service credential securely.
   */
  async storeCredential(
    service: string,
    account: string,
    secret: string,
    vaultKey?: CryptoKey | null,
    callerContext: 'core_app' | 'plugin' | 'ai' = 'core_app'
  ): Promise<boolean> {
    if (!DesktopSecurityGuard.verifyCallerAuthorization(callerContext)) {
      throw new Error('Unauthorized credential store access');
    }

    if (!service || !account || !secret) {
      throw new Error('Service, account, and secret are required');
    }

    // Never allow storing master encryption password in native keychain
    if (service.toLowerCase().includes('master_password') || service.toLowerCase().includes('vault_key')) {
      throw new Error('Master vault password and raw encryption keys cannot be stored in OS credential store');
    }

    if (this.isNativeAvailable && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        await (window as any).__TAURI__.core.invoke('store_os_credential', {
          service,
          account,
          secret,
        });
        return true;
      } catch (err) {
        console.warn('Native keychain write failed, falling back to P30 encrypted storage:', err);
      }
    }

    // Fallback to P30 hardened token storage if vaultKey is provided
    if (vaultKey) {
      await hardenedTokenStorage.saveEncryptedToken(secret, vaultKey);
      return true;
    }

    // Fallback to session memory
    hardenedTokenStorage.setSessionToken(secret);
    return true;
  }

  /**
   * Reads a stored service credential.
   */
  async readCredential(
    service: string,
    account: string,
    vaultKey?: CryptoKey | null,
    callerContext: 'core_app' | 'plugin' | 'ai' = 'core_app'
  ): Promise<string | null> {
    if (!DesktopSecurityGuard.verifyCallerAuthorization(callerContext)) {
      throw new Error('Unauthorized credential store access');
    }

    if (this.isNativeAvailable && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const result = await (window as any).__TAURI__.core.invoke('read_os_credential', {
          service,
          account,
        });
        if (result && typeof result === 'string') {
          return result;
        }
      } catch (err) {
        console.warn('Native keychain read failed, attempting P30 fallback:', err);
      }
    }

    // Fallback: Check P30 vault-encrypted storage
    if (vaultKey) {
      const decrypted = await hardenedTokenStorage.loadEncryptedToken(vaultKey);
      if (decrypted) return decrypted;
    }

    // Fallback: Check in-memory session token
    return hardenedTokenStorage.getSessionToken();
  }

  /**
   * Deletes a stored service credential.
   */
  async deleteCredential(
    service: string,
    account: string,
    callerContext: 'core_app' | 'plugin' | 'ai' = 'core_app'
  ): Promise<boolean> {
    if (!DesktopSecurityGuard.verifyCallerAuthorization(callerContext)) {
      throw new Error('Unauthorized credential store access');
    }

    if (this.isNativeAvailable && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        await (window as any).__TAURI__.core.invoke('delete_os_credential', {
          service,
          account,
        });
      } catch (err) {
        console.warn('Native keychain delete failed:', err);
      }
    }

    hardenedTokenStorage.deleteEncryptedToken();
    hardenedTokenStorage.clearSessionToken();
    return true;
  }
}

export const desktopCredentialStore = new DesktopCredentialStore();
