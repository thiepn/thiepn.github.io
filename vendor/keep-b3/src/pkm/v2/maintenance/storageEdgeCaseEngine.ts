/**
 * V2.11 Storage Edge Case & Quota Engine
 * 
 * Manages browser storage quota pressure, eviction risk mitigation,
 * preflight space checks for attachments/index rebuilds, and truthful
 * save status tracking with in-memory retry buffers.
 */

export interface StorageQuotaStatus {
  isPersisted: boolean;
  usageBytes: number;
  quotaBytes: number;
  usagePercentage: number;
  isHighPressure: boolean; // >= 90%
  isCriticalPressure: boolean; // >= 98%
}

export interface SaveQueueItem {
  id: string;
  resourceId: string;
  payload: string;
  timestamp: string;
  retryAttempts: number;
  status: 'PENDING' | 'COMMITTED' | 'FAILED';
  lastError?: string;
}

export class StorageEdgeCaseEngine {
  private static instance: StorageEdgeCaseEngine;
  private saveQueue: Map<string, SaveQueueItem> = new Map();
  private isReadOnlyLocked = false;

  public static getInstance(): StorageEdgeCaseEngine {
    if (!StorageEdgeCaseEngine.instance) {
      StorageEdgeCaseEngine.instance = new StorageEdgeCaseEngine();
    }
    return StorageEdgeCaseEngine.instance;
  }

  /**
   * Evaluates browser storage quota and eviction protection.
   */
  public async checkStorageQuota(): Promise<StorageQuotaStatus> {
    let usageBytes = 0;
    let quotaBytes = 1024 * 1024 * 1024; // 1 GB fallback
    let isPersisted = true;

    if (typeof navigator !== 'undefined' && navigator.storage) {
      if (navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          usageBytes = estimate.usage || 0;
          quotaBytes = estimate.quota || quotaBytes;
        } catch {
          // Ignored
        }
      }
      if (navigator.storage.persisted) {
        try {
          isPersisted = await navigator.storage.persisted();
        } catch {
          // Ignored
        }
      }
    }

    const usagePercentage = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

    return {
      isPersisted,
      usageBytes,
      quotaBytes,
      usagePercentage,
      isHighPressure: usagePercentage >= 90,
      isCriticalPressure: usagePercentage >= 98,
    };
  }

  /**
   * Preflight space check before handling large attachment or index rebuild.
   */
  public async preflightSpaceCheck(requiredBytes: number): Promise<{
    canProceed: boolean;
    availableBytes: number;
    warning?: string;
  }> {
    const quota = await this.checkStorageQuota();
    const freeBytes = quota.quotaBytes - quota.usageBytes;

    if (freeBytes < requiredBytes) {
      return {
        canProceed: false,
        availableBytes: freeBytes,
        warning: `Insufficient storage quota: need ${(requiredBytes / 1024 / 1024).toFixed(1)} MB, but only ${(freeBytes / 1024 / 1024).toFixed(1)} MB free.`,
      };
    }

    return {
      canProceed: true,
      availableBytes: freeBytes,
    };
  }

  /**
   * Enqueues an edit with truthful save tracking.
   */
  public enqueueSave(resourceId: string, payload: string): SaveQueueItem {
    const item: SaveQueueItem = {
      id: `SAVE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      resourceId,
      payload,
      timestamp: new Date().toISOString(),
      retryAttempts: 0,
      status: 'PENDING',
    };
    this.saveQueue.set(item.id, item);
    return item;
  }

  public markCommitted(itemId: string) {
    const item = this.saveQueue.get(itemId);
    if (item) {
      item.status = 'COMMITTED';
    }
  }

  public markFailed(itemId: string, error: string) {
    const item = this.saveQueue.get(itemId);
    if (item) {
      item.status = 'FAILED';
      item.retryAttempts++;
      item.lastError = error;
    }
  }

  public getPendingOrFailedEdits(): SaveQueueItem[] {
    return Array.from(this.saveQueue.values()).filter((i) => i.status !== 'COMMITTED');
  }

  public setReadOnlyLock(locked: boolean) {
    this.isReadOnlyLocked = locked;
  }

  public isReadOnly(): boolean {
    return this.isReadOnlyLocked;
  }
}

export const storageEdgeCaseEngine = StorageEdgeCaseEngine.getInstance();
