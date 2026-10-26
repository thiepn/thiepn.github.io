/**
 * V2.11 Runtime Change & Platform Resilience
 * 
 * Provides capability-based feature detection and graceful fallbacks
 * across Chromium, Firefox, WebKit/Safari, desktop shells, and mobile OS environments.
 * Handles dynamic OS permission revocations gracefully.
 */

export interface RuntimeCapabilities {
  supportsIndexedDb: boolean;
  supportsFileSystemAccess: boolean;
  supportsWebWorkers: boolean;
  supportsCryptoSubtle: boolean;
  supportsWebLocks: boolean;
  supportsPersistentStorage: boolean;
  platformName: string;
}

export class RuntimeChangeResilienceService {
  private static instance: RuntimeChangeResilienceService;

  public static getInstance(): RuntimeChangeResilienceService {
    if (!RuntimeChangeResilienceService.instance) {
      RuntimeChangeResilienceService.instance = new RuntimeChangeResilienceService();
    }
    return RuntimeChangeResilienceService.instance;
  }

  public detectCapabilities(): RuntimeCapabilities {
    const isBrowser = typeof window !== 'undefined';
    const isNav = typeof navigator !== 'undefined';

    return {
      supportsIndexedDb: isBrowser && 'indexedDB' in window,
      supportsFileSystemAccess: isBrowser && 'showOpenFilePicker' in window,
      supportsWebWorkers: isBrowser && 'Worker' in window,
      supportsCryptoSubtle: isBrowser && 'crypto' in window && 'subtle' in window.crypto,
      supportsWebLocks: isNav && 'locks' in navigator,
      supportsPersistentStorage: isNav && 'storage' in navigator && 'persist' in navigator.storage,
      platformName: isNav ? navigator.userAgent : 'Node/Test Runtime',
    };
  }

  public handlePermissionRevocation(permissionName: 'filesystem' | 'camera' | 'notifications'): {
    handled: boolean;
    fallbackActive: boolean;
    userMessage: string;
  } {
    switch (permissionName) {
      case 'filesystem':
        return {
          handled: true,
          fallbackActive: true,
          userMessage: 'Filesystem direct bridge revoked. Falling back to browser IndexedDB storage and standard file export.',
        };
      case 'notifications':
        return {
          handled: true,
          fallbackActive: true,
          userMessage: 'Notification permission revoked. In-app Attention badges will notify you of important events.',
        };
      default:
        return {
          handled: true,
          fallbackActive: true,
          userMessage: `${permissionName} permission is currently unavailable.`,
        };
    }
  }
}

export const runtimeChangeResilience = RuntimeChangeResilienceService.getInstance();
