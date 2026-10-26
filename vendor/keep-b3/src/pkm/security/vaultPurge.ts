import { hardenedTokenStorage } from './tokenStorage';
import { vaultManager } from '../indexer';

export interface PurgeReport {
  timestamp: string;
  clearedItemsCount: number;
  clearedCaches: string[];
}

type PurgeCallback = () => void;

/**
 * Vault Purge Manager responsible for coordinating memory zeroization
 * and in-memory cache destruction upon vault lock or auto-lock timeout.
 */
class VaultPurgeManager {
  private registeredPurgeListeners: Set<PurgeCallback> = new Set();

  /**
   * Register a component or subsystem callback to be called on vault lock.
   */
  registerPurgeCallback(cb: PurgeCallback): () => void {
    this.registeredPurgeListeners.add(cb);
    return () => {
      this.registeredPurgeListeners.delete(cb);
    };
  }

  /**
   * Performs an immediate, thorough purge of all in-memory decrypted data,
   * index structures, and credential tokens.
   */
  executeVaultPurge(): PurgeReport {
    const clearedCaches: string[] = [];

    // 1. Purge in-memory git tokens
    hardenedTokenStorage.clearSessionToken();
    clearedCaches.push('In-Memory Git Credentials');

    // 2. Purge Vault Index & Search Structures
    try {
      vaultManager.rebuildIndex([]);
      clearedCaches.push('Vault Index & Backlink Graph');
    } catch (err) {
      console.error('Error purging vault index:', err);
    }

    // 3. Notify all registered UI & service subscribers
    let callbackCount = 0;
    for (const listener of this.registeredPurgeListeners) {
      try {
        listener();
        callbackCount++;
      } catch (err) {
        console.error('Error in purge listener:', err);
      }
    }
    clearedCaches.push(`Notified ${callbackCount} Active UI Subscribers`);

    return {
      timestamp: new Date().toISOString(),
      clearedItemsCount: callbackCount + 2,
      clearedCaches,
    };
  }
}

export const vaultPurgeManager = new VaultPurgeManager();
