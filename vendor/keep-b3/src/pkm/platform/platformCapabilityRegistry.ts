/**
 * V1.3 — Centralized Platform Capability Registry
 * Detects, validates, and exposes available hardware, OS, and web capabilities.
 * Enforces unified capability-based UI rendering without scattered platform checks.
 */

import {
  PlatformCapabilities,
  PlatformType,
  DeviceClass,
  RuntimeEnvironment,
  SecureStorageBackend,
  PlatformError,
} from './platformTypes';

export class PlatformCapabilityRegistry {
  private static instance: PlatformCapabilityRegistry | null = null;
  private capabilities: PlatformCapabilities;
  private listeners: Set<(caps: PlatformCapabilities) => void> = new Set();

  private constructor() {
    this.capabilities = this.detect();
  }

  public static getInstance(): PlatformCapabilityRegistry {
    if (!PlatformCapabilityRegistry.instance) {
      PlatformCapabilityRegistry.instance = new PlatformCapabilityRegistry();
    }
    return PlatformCapabilityRegistry.instance;
  }

  /**
   * Complete platform capability detection across Browser, PWA, Desktop (Tauri/Electron), and Mobile (Capacitor/Tauri Mobile)
   */
  public detect(): PlatformCapabilities {
    const isBrowser = typeof window !== 'undefined';
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const ua = nav?.userAgent?.toLowerCase() || '';

    // 1. Determine Platform & Device Class
    let platform: PlatformType = 'web';
    let deviceClass: DeviceClass = 'web';
    let runtime: RuntimeEnvironment = 'browser';

    const isMac = ua.includes('macintosh') || (nav?.platform === 'MacIntel' && (nav?.maxTouchPoints || 0) > 1);
    const isWin = ua.includes('windows');
    const isLinux = ua.includes('linux') && !ua.includes('android');
    const isAndroid = ua.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(ua) || (isMac && (nav?.maxTouchPoints || 0) > 1);

    const isTauri = isBrowser && Boolean((window as unknown as { __TAURI__?: { core?: unknown } }).__TAURI__?.core);
    const isCapacitor = isBrowser && Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
    const isStandalonePWA = isBrowser && (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      Boolean((nav as unknown as { standalone?: boolean })?.standalone)
    );

    if (isTauri) {
      runtime = 'tauri';
      if (isAndroid) {
        platform = 'android';
        deviceClass = 'mobile';
      } else if (isIOS) {
        platform = 'ios';
        deviceClass = 'mobile';
      } else if (isMac) {
        platform = 'macos';
        deviceClass = 'desktop';
      } else if (isWin) {
        platform = 'windows';
        deviceClass = 'desktop';
      } else {
        platform = 'linux';
        deviceClass = 'desktop';
      }
    } else if (isCapacitor) {
      runtime = 'capacitor';
      platform = isAndroid ? 'android' : 'ios';
      deviceClass = 'mobile';
    } else if (isStandalonePWA) {
      runtime = 'pwa-standalone';
      platform = 'pwa';
      deviceClass = isAndroid || isIOS ? 'mobile' : 'desktop';
    } else {
      runtime = 'browser';
      platform = 'web';
      deviceClass = isAndroid || isIOS ? 'mobile' : 'web';
    }

    // Check for Tablet form factor
    if (isBrowser) {
      const width = window.innerWidth;
      const touch = (nav?.maxTouchPoints || 0) > 0;
      if (touch && width >= 600 && width <= 1280) {
        deviceClass = 'tablet';
      }
    }

    // 2. Filesystem Capabilities
    const hasFSA = isBrowser &&
      typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === 'function' &&
      typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';

    const hasOPFS = isBrowser &&
      Boolean(nav?.storage && typeof nav.storage.getDirectory === 'function');

    const isDesktopNative = runtime === 'tauri' || (runtime as string) === 'electron';

    const filesystem = {
      openFile: true,
      openDirectory: isDesktopNative || hasFSA,
      persistentDirectoryAccess: isDesktopNative || (hasFSA && !isIOS && !isAndroid),
      watchDirectory: isDesktopNative,
      openExternal: isDesktopNative,
      supportsOriginPrivateFs: hasOPFS,
    };

    // 3. Sharing & Media Capabilities
    const hasWebShare = isBrowser && typeof nav?.share === 'function';
    const sharing = {
      receiveShare: isDesktopNative || runtime === 'capacitor' || runtime === 'pwa-standalone',
      shareOut: isDesktopNative || hasWebShare,
      photoPicker: isBrowser && typeof document !== 'undefined',
      documentPicker: isBrowser && typeof document !== 'undefined',
      cameraCapture: isBrowser && Boolean(nav?.mediaDevices?.getUserMedia),
      audioRecord: isBrowser && typeof MediaRecorder !== 'undefined',
    };

    // 4. Notifications
    let notificationPermission: 'granted' | 'denied' | 'prompt' | 'unsupported' = 'unsupported';
    if (isBrowser && typeof Notification !== 'undefined') {
      notificationPermission = Notification.permission as 'granted' | 'denied' | 'prompt';
    } else if (isDesktopNative || runtime === 'capacitor') {
      notificationPermission = 'prompt';
    }

    const notifications = {
      local: isDesktopNative || runtime === 'capacitor' || (isBrowser && typeof Notification !== 'undefined'),
      scheduled: isDesktopNative || runtime === 'capacitor' || (isBrowser && 'serviceWorker' in (nav || {})),
      backgroundReliable: isDesktopNative,
      permissionState: notificationPermission,
      maxScheduledLimit: isIOS ? 64 : 256,
    };

    // 5. Secure Storage Backend Detection
    let secureStorageBackend: SecureStorageBackend = 'session_memory';
    let hardwareBacked = false;

    if (isDesktopNative) {
      if (platform === 'macos') {
        secureStorageBackend = 'macos_keychain';
        hardwareBacked = true;
      } else if (platform === 'windows') {
        secureStorageBackend = 'windows_credential_manager';
        hardwareBacked = true;
      } else {
        secureStorageBackend = 'linux_secret_service';
        hardwareBacked = false;
      }
    } else if (runtime === 'capacitor') {
      if (platform === 'android') {
        secureStorageBackend = 'android_keystore';
        hardwareBacked = true;
      } else {
        secureStorageBackend = 'ios_keychain';
        hardwareBacked = true;
      }
    } else if (isBrowser && typeof localStorage !== 'undefined') {
      secureStorageBackend = 'web_encrypted_local';
      hardwareBacked = false;
    }

    const secureStorage = {
      available: true,
      backend: secureStorageBackend,
      canStoreSecrets: true,
      hardwareBacked,
    };

    // 6. Biometrics
    const biometrics = {
      available: isDesktopNative || runtime === 'capacitor' || (isBrowser && Boolean(window.PublicKeyCredential)),
      type: (isIOS || platform === 'macos' ? 'face' : isAndroid ? 'fingerprint' : 'none') as 'fingerprint' | 'face' | 'iris' | 'none',
      hardwareProtected: isDesktopNative || runtime === 'capacitor',
      enrolled: false,
    };

    // 7. Lifecycle & OS
    const lifecycle = {
      backgroundFlushSupported: isBrowser && typeof window.addEventListener === 'function',
      appSwitcherPrivacySupported: isDesktopNative || runtime === 'capacitor',
      osLockDetectionSupported: isDesktopNative,
    };

    // 8. Deep Links
    const deepLinks = {
      customProtocol: isDesktopNative || runtime === 'capacitor',
      universalLinks: runtime === 'capacitor' || runtime === 'pwa-standalone',
      safeRouterActive: true,
    };

    // 9. Desktop Shell Extras
    const desktop = {
      systemTray: isDesktopNative,
      globalShortcuts: isDesktopNative,
      nativeAppMenu: isDesktopNative,
      multiWindow: isDesktopNative,
    };

    // 10. Mobile Shell Extras
    const mobile = {
      appShortcuts: isDesktopNative || runtime === 'capacitor' || (isBrowser && 'setAppBadges' in (nav || {})),
      widgets: isDesktopNative || runtime === 'capacitor',
      haptics: isBrowser && Boolean(nav?.vibrate),
      androidBackButton: platform === 'android' && (runtime === 'capacitor' || isBrowser),
    };

    // 11. Updates
    const updates = {
      autoUpdateAvailable: isDesktopNative || runtime === 'pwa-standalone' || runtime === 'browser',
      channel: 'stable' as const,
      supportsSilentBackgroundCheck: isDesktopNative || isBrowser,
    };

    return {
      platform,
      deviceClass,
      runtime,
      filesystem,
      sharing,
      notifications,
      secureStorage,
      biometrics,
      lifecycle,
      deepLinks,
      desktop,
      mobile,
      updates,
    };
  }

  public getCapabilities(): PlatformCapabilities {
    return this.capabilities;
  }

  public refresh(): PlatformCapabilities {
    this.capabilities = this.detect();
    this.notify();
    return this.capabilities;
  }

  public subscribe(listener: (caps: PlatformCapabilities) => void): () => void {
    this.listeners.add(listener);
    listener(this.capabilities);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.capabilities);
      } catch (err) {
        console.error('Error in platform capability listener:', err);
      }
    }
  }

  /**
   * Helper to format human-readable fallback message when a feature is unsupported on current platform
   */
  public getUnsupportedMessage(feature: string): string {
    const caps = this.capabilities;
    return `The feature "${feature}" is unavailable on ${caps.platform.toUpperCase()} (${caps.runtime}). A standard web/local fallback has been activated.`;
  }

  /**
   * Normalizes platform error into structured user-facing format
   */
  public normalizeError(code: PlatformError['code'], details?: string): PlatformError {
    const errorMap: Record<PlatformError['code'], { userFacing: string; recoverable: boolean; action?: PlatformError['actionRequired'] }> = {
      PERMISSION_DENIED: {
        userFacing: 'Permission was denied by the operating system.',
        recoverable: true,
        action: 'request_permission',
      },
      NOTIFICATION_PERMISSION_DENIED: {
        userFacing: 'Notification permission is required to deliver scheduled reminders.',
        recoverable: true,
        action: 'open_settings',
      },
      FILE_ACCESS_REVOKED: {
        userFacing: 'File access was revoked or the drive was disconnected.',
        recoverable: true,
        action: 'retry',
      },
      SECURE_STORAGE_UNAVAILABLE: {
        userFacing: 'Hardware secure storage is unavailable. Using encrypted local memory fallback.',
        recoverable: true,
      },
      CAPABILITY_UNAVAILABLE: {
        userFacing: 'This action is not supported by your current device/browser.',
        recoverable: false,
      },
      NATIVE_BRIDGE_ERROR: {
        userFacing: 'The desktop/mobile native bridge encountered an unexpected state.',
        recoverable: true,
        action: 'retry',
      },
      MALICIOUS_DEEP_LINK_REJECTED: {
        userFacing: 'Security Alert: A potentially unsafe or unauthorized deep link was rejected.',
        recoverable: false,
      },
      UPDATE_CHECK_FAILED: {
        userFacing: 'Could not check for application updates. Check network connectivity.',
        recoverable: true,
        action: 'retry',
      },
      BIOMETRIC_UNAVAILABLE: {
        userFacing: 'Biometric hardware is not configured or authentication failed. Please enter your password.',
        recoverable: true,
        action: 'reauthenticate',
      },
      DEVICE_STORAGE_LOW: {
        userFacing: 'Local storage space is critically low. Attachments will not be cached locally.',
        recoverable: true,
        action: 'open_settings',
      },
    };

    const entry = errorMap[code] || {
      userFacing: 'An unexpected platform error occurred.',
      recoverable: false,
    };

    return {
      code,
      message: details || entry.userFacing,
      userFacingMessage: entry.userFacing,
      recoverable: entry.recoverable,
      actionRequired: entry.action,
    };
  }
}

export const platformRegistry = PlatformCapabilityRegistry.getInstance();
