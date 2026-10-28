/**
 * Phase P29: Storage Quota Monitoring & Safe Derived Cache Clearance
 */

import { StorageQuotaEstimate, StoragePressureLevel } from './resilienceTypes';
import { Note, Folder } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { formatByteSize } from '../media/mediaService';

export class StorageQuotaMonitorService {
  private currentEstimate: StorageQuotaEstimate | null = null;
  private listeners: Set<(est: StorageQuotaEstimate) => void> = new Set();

  public subscribe(listener: (est: StorageQuotaEstimate) => void): () => void {
    this.listeners.add(listener);
    this.refreshEstimate();
    return () => this.listeners.delete(listener);
  }

  private notify(est: StorageQuotaEstimate) {
    this.currentEstimate = est;
    for (const l of this.listeners) {
      try {
        l(est);
      } catch (err) {
        console.error('Error in quota listener:', err);
      }
    }
  }

  public async refreshEstimate(dataContext?: {
    notes?: Note[];
    folders?: Folder[];
    canvases?: CanvasBoard[];
  }): Promise<StorageQuotaEstimate> {
    let usageBytes = 0;
    let quotaBytes = 0;
    let isSupported = false;
    let hasPersist = false;

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        usageBytes = est.usage || 0;
        quotaBytes = est.quota || 0;
        isSupported = true;

        if (navigator.storage.persisted) {
          hasPersist = await navigator.storage.persisted();
        }
      } catch (e) {
        console.warn('Storage estimate failed:', e);
      }
    }

    const percentUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
    let pressureLevel: StoragePressureLevel = 'normal';
    if (percentUsed >= 95) pressureLevel = 'critical';
    else if (percentUsed >= 85) pressureLevel = 'high';
    else if (percentUsed >= 70) pressureLevel = 'elevated';

    // Approximate breakdown by data category
    const notesSize = (dataContext?.notes || []).reduce(
      (acc, n) => acc + (n.content?.length || 0) + (n.title?.length || 0),
      0
    );
    const canvasSize = (dataContext?.canvases || []).reduce(
      (acc, c) => acc + JSON.stringify(c).length,
      0
    );

    const estimateResult: StorageQuotaEstimate = {
      isSupported,
      usageBytes,
      quotaBytes,
      percentUsed: Math.round(percentUsed * 10) / 10,
      pressureLevel,
      humanUsage: formatByteSize(usageBytes),
      humanQuota: formatByteSize(quotaBytes),
      breakdown: {
        notesSizeBytes: notesSize,
        attachmentsSizeBytes: Math.max(0, usageBytes - notesSize - canvasSize),
        canvasSizeBytes: canvasSize,
        revisionsSizeBytes: 0,
        recoveryPointsSizeBytes: 0,
        derivedCachesSizeBytes: 0,
      },
      hasPersistentStoragePermission: hasPersist,
    };

    this.notify(estimateResult);
    return estimateResult;
  }

  /**
   * Request persistent storage permission to prevent browser auto-eviction
   */
  public async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isGranted = await navigator.storage.persist();
        await this.refreshEstimate();
        return isGranted;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Safely purges rebuildable derived caches without modifying any canonical data
   */
  public async clearDerivedDataCaches(): Promise<{
    success: boolean;
    clearedKeys: string[];
    reclaimedEstimateBytes: number;
  }> {
    const clearedKeys: string[] = [];

    // Purge known derived caches in localStorage
    if (typeof localStorage !== 'undefined') {
      const derivedPrefixes = [
        'keepnotes_semantic_',
        'keepnotes_embeddings_',
        'keepnotes_diagnostics_',
        'keepnotes_task_index_',
      ];

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && derivedPrefixes.some((p) => key.startsWith(p))) {
          localStorage.removeItem(key);
          clearedKeys.push(key);
        }
      }
    }

    await this.refreshEstimate();

    return {
      success: true,
      clearedKeys,
      reclaimedEstimateBytes: clearedKeys.length * 1024,
    };
  }
}

export const storageQuotaMonitor = new StorageQuotaMonitorService();
