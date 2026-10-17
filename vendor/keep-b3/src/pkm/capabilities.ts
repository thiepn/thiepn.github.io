import { BrowserCapabilities } from './types';

let cachedCapabilities: BrowserCapabilities | null = null;

/**
 * Detects browser capabilities available in the current runtime environment
 */
export async function detectCapabilities(forceRefresh = false): Promise<BrowserCapabilities> {
  if (cachedCapabilities && !forceRefresh) {
    return cachedCapabilities;
  }

  const isBrowser = typeof window !== 'undefined';

  // 1. File System Access API
  const fileSystemAccess =
    isBrowser &&
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      'function' &&
    typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker ===
      'function';

  // 2. OPFS (Origin Private File System)
  const originPrivateFileSystem =
    isBrowser &&
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage?.getDirectory === 'function';

  // 3. WebGPU
  const webGPU =
    isBrowser &&
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    Boolean((navigator as unknown as { gpu?: unknown }).gpu);

  // 4. Web Workers
  const webWorkers = typeof Worker !== 'undefined';

  // 5. Clipboard API
  const clipboardApi =
    isBrowser &&
    typeof navigator !== 'undefined' &&
    'clipboard' in navigator &&
    typeof navigator.clipboard?.readText === 'function' &&
    typeof navigator.clipboard?.writeText === 'function';

  // 6. Storage Quota Estimation
  const storageQuota =
    isBrowser &&
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage?.estimate === 'function';

  let quotaEstimated: BrowserCapabilities['quotaEstimated'] = undefined;

  if (storageQuota) {
    try {
      const est = await navigator.storage.estimate();
      if (est.quota !== undefined && est.usage !== undefined) {
        const usagePercent = est.quota > 0 ? (est.usage / est.quota) * 100 : 0;
        quotaEstimated = {
          quota: est.quota,
          usage: est.usage,
          usagePercent: Math.round(usagePercent * 100) / 100,
        };
      }
    } catch {
      // Ignore quota estimation failures in restrictive environments
    }
  }

  cachedCapabilities = {
    fileSystemAccess,
    originPrivateFileSystem,
    webGPU,
    webWorkers,
    clipboardApi,
    storageQuota,
    quotaEstimated,
  };

  return cachedCapabilities;
}

/**
 * Synchronous getter for previously detected capabilities
 */
export function getCachedCapabilities(): BrowserCapabilities {
  if (cachedCapabilities) return cachedCapabilities;

  const isBrowser = typeof window !== 'undefined';
  return {
    fileSystemAccess:
      isBrowser &&
      typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
        'function',
    originPrivateFileSystem:
      isBrowser &&
      typeof navigator !== 'undefined' &&
      'storage' in navigator &&
      typeof navigator.storage?.getDirectory === 'function',
    webGPU:
      isBrowser &&
      typeof navigator !== 'undefined' &&
      'gpu' in navigator &&
      Boolean((navigator as unknown as { gpu?: unknown }).gpu),
    webWorkers: typeof Worker !== 'undefined',
    clipboardApi:
      isBrowser &&
      typeof navigator !== 'undefined' &&
      'clipboard' in navigator,
    storageQuota:
      isBrowser &&
      typeof navigator !== 'undefined' &&
      'storage' in navigator &&
      typeof navigator.storage?.estimate === 'function',
  };
}
