/**
 * Phase P45: Filesystem Capabilities & Platform Detection
 */

import { FilesystemPermissionState } from './filesystemTypes';

const HANDLE_DB_NAME = 'KeepNotes_Filesystem_Handles_DB';
const HANDLE_STORE_NAME = 'handles';
const HANDLE_KEY = 'active_vault_root_handle';

export type PlatformShippingClassification =
  | 'LIVE_FILESYSTEM_BRIDGE_SUPPORTED'
  | 'CHROMIUM_LIVE_BRIDGE_MANUAL_FALLBACK_ELSEWHERE'
  | 'MANUAL_FILESYSTEM_MIRROR_ONLY';

export interface PlatformFilesystemCapability {
  supportsFileAccessApi: boolean;
  supportsDirectoryPicker: boolean;
  supportsHandlePersistence: boolean;
  supportsWebLocks: boolean;
  browserFamily: 'chromium' | 'firefox' | 'safari' | 'other';
  isPwaInstalled: boolean;
  classification: PlatformShippingClassification;
  description: string;
}

/**
 * Detects native File System Access API capabilities
 */
export function getPlatformFilesystemCapabilities(): PlatformFilesystemCapability {
  if (typeof window === 'undefined') {
    return {
      supportsFileAccessApi: false,
      supportsDirectoryPicker: false,
      supportsHandlePersistence: false,
      supportsWebLocks: false,
      browserFamily: 'other',
      isPwaInstalled: false,
      classification: 'MANUAL_FILESYSTEM_MIRROR_ONLY',
      description: 'Server environment - filesystem bridge unavailable.',
    };
  }

  const supportsDirPicker = typeof (window as any).showDirectoryPicker === 'function';
  const supportsLocks = typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function';
  const isPwa =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  let browserFamily: 'chromium' | 'firefox' | 'safari' | 'other' = 'other';
  const ua = navigator.userAgent || '';
  if (ua.includes('Firefox')) {
    browserFamily = 'firefox';
  } else if (ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')) {
    browserFamily = 'safari';
  } else if (ua.includes('Chrome') || ua.includes('Chromium') || ua.includes('Edg')) {
    browserFamily = 'chromium';
  }

  let classification: PlatformShippingClassification;
  let description: string;

  if (supportsDirPicker) {
    classification = 'LIVE_FILESYSTEM_BRIDGE_SUPPORTED';
    description =
      'Native File System Access API is active. Full live folder mirroring, external change detection, and bidirectional 3-way synchronization are supported.';
  } else if (browserFamily === 'firefox') {
    classification = 'CHROMIUM_LIVE_BRIDGE_MANUAL_FALLBACK_ELSEWHERE';
    description =
      'Firefox does not yet support the File System Access directory picker. Automatic ZIP export snapshots and structured folder re-import fallbacks are active.';
  } else if (browserFamily === 'safari') {
    classification = 'CHROMIUM_LIVE_BRIDGE_MANUAL_FALLBACK_ELSEWHERE';
    description =
      'Safari / WebKit does not currently support the File System Access directory picker. Automatic ZIP export snapshots and structured folder re-import fallbacks are active.';
  } else {
    classification = 'MANUAL_FILESYSTEM_MIRROR_ONLY';
    description =
      'Live directory handle API is not available on this platform. Manual export & import fallbacks are enabled.';
  }

  return {
    supportsFileAccessApi: supportsDirPicker,
    supportsDirectoryPicker: supportsDirPicker,
    supportsHandlePersistence: supportsDirPicker && typeof indexedDB !== 'undefined',
    supportsWebLocks: supportsLocks,
    browserFamily,
    isPwaInstalled: isPwa,
    classification,
    description,
  };
}

/**
 * Opens IndexedDB database for persisting directory handles
 */
async function getHandlesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(HANDLE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Persists a FileSystemDirectoryHandle to IndexedDB
 */
export async function persistDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await getHandlesDB();
    const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE_NAME);
    store.put(handle, HANDLE_KEY);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not persist directory handle to IndexedDB:', err);
  }
}

/**
 * Retrieves persisted directory handle from IndexedDB
 */
export async function getPersistedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getHandlesDB();
    const tx = db.transaction(HANDLE_STORE_NAME, 'readonly');
    const store = tx.objectStore(HANDLE_STORE_NAME);
    const req = store.get(HANDLE_KEY);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const handle = req.result as FileSystemDirectoryHandle | undefined;
        resolve(handle || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Removes persisted directory handle
 */
export async function clearPersistedDirectoryHandle(): Promise<void> {
  try {
    const db = await getHandlesDB();
    const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE_NAME);
    store.delete(HANDLE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Checks and requests readwrite permission on a stored handle
 */
export async function verifyHandlePermission(
  handle: FileSystemDirectoryHandle,
  promptIfNecessary = false
): Promise<FilesystemPermissionState> {
  if (!handle || typeof (handle as any).queryPermission !== 'function') {
    return 'unsupported';
  }

  try {
    const current = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (current === 'granted') {
      return 'granted';
    }

    if (promptIfNecessary && typeof (handle as any).requestPermission === 'function') {
      const requested = await (handle as any).requestPermission({ mode: 'readwrite' });
      return requested === 'granted' ? 'granted' : requested === 'denied' ? 'denied' : 'prompt';
    }

    return current === 'denied' ? 'denied' : 'prompt';
  } catch (err) {
    console.warn('Error querying directory handle permission:', err);
    return 'denied';
  }
}

/**
 * Prompts user with native OS directory picker
 */
export async function pickUserVaultDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const caps = getPlatformFilesystemCapabilities();
  if (!caps.supportsDirectoryPicker) {
    throw new Error(
      'The File System Access API is not supported in this browser. Please use the Fallback Snapshot Export/Import tools.'
    );
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    });
    return handle;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}
