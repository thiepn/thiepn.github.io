/**
 * P47 — Mobile Capability & Platform Service
 * 
 * Manages mobile platform detection, capabilities query, quick actions registration,
 * and mobile user settings persistence.
 */

import {
  MobileCapabilities,
  MobilePlatform,
  MobileRuntimeEnvironment,
  MobileAppSettings,
  MobileQuickAction,
  MobileQuickActionType,
} from './mobileTypes';
import { mobileSecurityGuard } from './mobileSecurityGuard';

const STORAGE_KEY = 'pkm_mobile_settings_v1';

export const DEFAULT_MOBILE_SETTINGS: MobileAppSettings = {
  defaultShareDestination: 'inbox',
  autoIngestSharesOnUnlock: true,
  widgetPrivacyLevel: 'sanitized',
  protectAppSwitcher: true,
  lockOnAppBackground: '5min',
  lockOnDeviceScreenLock: true,
  biometricUnlockEnabled: false,
  enableNativeNotifications: true,
  hapticsEnabled: true,
  syncLargeAttachmentsOnWifiOnly: false,
};

class MobileCapabilityService {
  private capabilities: MobileCapabilities;
  private settings: MobileAppSettings = DEFAULT_MOBILE_SETTINGS;
  private quickActionListeners: Array<(action: MobileQuickActionType) => void> = [];
  private settingsListeners: Array<(settings: MobileAppSettings) => void> = [];
  private urlLaunchListeners: Array<(url: string) => void> = [];

  constructor() {
    this.capabilities = this.detectCapabilities();
    this.loadSettings();
    this.initNativeBridgeListeners();
  }

  /**
   * Detects available mobile capabilities
   */
  private detectCapabilities(): MobileCapabilities {
    if (typeof window === 'undefined') {
      return {
        platform: 'web',
        runtime: 'browser',
        isNative: false,
        isAndroid: false,
        isIOS: false,
        hasShareSheet: false,
        hasWidgets: false,
        hasQuickActions: false,
        hasNativeNotifications: false,
        hasCamera: false,
        hasPhotoPicker: false,
        hasDocumentPicker: false,
        hasSecureStorage: false,
        hasBiometrics: false,
        hasAppSwitcherProtection: false,
        hasDeviceScreenLockDetection: false,
        hasBackgroundRefresh: false,
      };
    }

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Check if running inside Capacitor or Tauri Mobile container
    const isCapacitor = Boolean((window as any).Capacitor?.isNativePlatform?.());
    const isTauriMobile = Boolean((window as any).__TAURI__ && (isAndroid || isIOS));
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    const platform: MobilePlatform = isAndroid ? 'android' : isIOS ? 'ios' : 'web';
    const runtime: MobileRuntimeEnvironment = isCapacitor
      ? 'capacitor'
      : isTauriMobile
      ? 'tauri-mobile'
      : isPWA
      ? 'pwa'
      : 'browser';

    const isNative = isCapacitor || isTauriMobile;

    return {
      platform,
      runtime,
      isNative,
      isAndroid,
      isIOS,
      hasShareSheet: isNative || Boolean((navigator as any).share),
      hasWidgets: isNative,
      hasQuickActions: isNative || 'setAppBadges' in navigator,
      hasNativeNotifications: isNative || 'Notification' in window,
      hasCamera: 'mediaDevices' in navigator || isNative,
      hasPhotoPicker: true,
      hasDocumentPicker: true,
      hasSecureStorage: isNative || ('crypto' in window && 'subtle' in window.crypto),
      hasBiometrics: isNative || ('PublicKeyCredential' in window),
      hasAppSwitcherProtection: isNative || isPWA,
      hasDeviceScreenLockDetection: isNative,
      hasBackgroundRefresh: isNative,
    };
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.settings = { ...DEFAULT_MOBILE_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      this.settings = DEFAULT_MOBILE_SETTINGS;
    }
  }

  public getSettings(): MobileAppSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<MobileAppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore
    }
    this.settingsListeners.forEach((l) => l(this.settings));
  }

  public subscribeSettings(listener: (settings: MobileAppSettings) => void): () => void {
    this.settingsListeners.push(listener);
    return () => {
      this.settingsListeners = this.settingsListeners.filter((l) => l !== listener);
    };
  }

  public getCapabilities(): MobileCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Initializes native bridge message listeners
   */
  private initNativeBridgeListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for Quick Actions emitted by native bridge
    window.addEventListener('pkm-mobile-quick-action', (event: any) => {
      if (!mobileSecurityGuard.verifyCallerContext({ callerType: 'app_core' })) return;
      const actionType = event.detail?.action as MobileQuickActionType;
      if (actionType) {
        this.notifyQuickAction(actionType);
      }
    });

    // Listen for deep link URL events
    window.addEventListener('pkm-mobile-url-launch', (event: any) => {
      if (!mobileSecurityGuard.verifyCallerContext({ callerType: 'app_core' })) return;
      const url = event.detail?.url;
      if (url && typeof url === 'string') {
        this.urlLaunchListeners.forEach((l) => l(url));
      }
    });
  }

  public subscribeUrlLaunch(listener: (url: string) => void): () => void {
    this.urlLaunchListeners.push(listener);
    return () => {
      this.urlLaunchListeners = this.urlLaunchListeners.filter((l) => l !== listener);
    };
  }

  public subscribeQuickAction(listener: (action: MobileQuickActionType) => void): () => void {
    this.quickActionListeners.push(listener);
    return () => {
      this.quickActionListeners = this.quickActionListeners.filter((l) => l !== listener);
    };
  }

  public notifyQuickAction(action: MobileQuickActionType): void {
    this.quickActionListeners.forEach((l) => l(action));
  }

  /**
   * Triggers a subtle tactile haptic feedback on mobile devices
   */
  public triggerHaptic(type: 'selection' | 'success' | 'warning' | 'error' = 'selection'): void {
    if (!this.settings.hapticsEnabled || typeof navigator === 'undefined') return;

    try {
      if ('vibrate' in navigator) {
        if (type === 'selection') navigator.vibrate(12);
        else if (type === 'success') navigator.vibrate([10, 30, 20]);
        else if (type === 'warning') navigator.vibrate([30, 40, 30]);
        else if (type === 'error') navigator.vibrate([50, 50, 50]);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Returns list of configured App Shortcuts / Quick Actions
   */
  public getAppShortcuts(): MobileQuickAction[] {
    return [
      { id: 'qa-quick-capture', type: 'quick_capture', title: 'Quick Capture', subtitle: 'Rapid fleeting note', icon: 'Zap' },
      { id: 'qa-new-note', type: 'new_note', title: 'New Note', subtitle: 'Create blank note', icon: 'FilePlus' },
      { id: 'qa-today', type: 'today', title: "Today's Note", subtitle: 'Open daily log', icon: 'Calendar' },
      { id: 'qa-review', type: 'review', title: 'Spaced Review', subtitle: 'Practice flashcards', icon: 'Brain' },
      { id: 'qa-scan', type: 'scan_document', title: 'Scan / Import File', subtitle: 'Capture photo or document', icon: 'Camera' },
    ];
  }
}

export const mobileCapabilityService = new MobileCapabilityService();
