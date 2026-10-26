/**
 * P46 — Native Desktop Capability Service
 * Central typed adapter exposing native desktop capabilities to the React application.
 *
 * Implements capability detection:
 * - If running in Tauri desktop shell: connects to typed native commands & events.
 * - If running in Browser / PWA: gracefully degrades to safe browser fallbacks.
 */

import {
  DesktopPlatform,
  DesktopRuntimeEnvironment,
  DesktopSettingsConfig,
  NativeFilesystemCapability,
  NativeNotificationOptions,
  NativeNotificationCapability,
  NativeCredentialCapability,
  NativeShortcutCapability,
  NativeTrayCapability,
  NativeProtocolCapability,
  NativeLifecycleCapability,
} from './desktopTypes';
import { desktopCredentialStore } from './desktopCredentialStore';
import { desktopFilesystemWatcher } from './desktopFilesystemWatcher';
import { desktopProtocolService } from './desktopProtocolService';
import { desktopBackgroundService } from './desktopBackgroundService';
import { DesktopSecurityGuard } from './desktopSecurityGuard';

const DESKTOP_SETTINGS_STORAGE_KEY = 'keepnotes_desktop_settings_v1';

export class DesktopCapabilityService {
  private platform: DesktopPlatform = 'web';
  private runtime: DesktopRuntimeEnvironment = 'browser';
  private isDesktop: boolean = false;

  private settings: DesktopSettingsConfig = {
    startAtLogin: false,
    closeToTray: true,
    launchMinimized: false,
    globalQuickCaptureEnabled: true,
    globalQuickCaptureShortcut: 'CmdOrCtrl+Shift+Space',
    lockOnOsSessionLock: true,
    pauseBackgroundActivity: false,
    nativeWatcherEnabled: true,
    nativeNotificationsEnabled: true,
    useOsCredentialStore: true,
  };

  private onQuickCaptureListeners: Set<() => void> = new Set();
  private onSessionLockListeners: Set<() => void> = new Set();

  constructor() {
    this.detectEnvironment();
    this.loadSettings();
    this.initNativeListeners();
  }

  private detectEnvironment(): void {
    if (typeof window === 'undefined') {
      this.platform = 'web';
      this.runtime = 'browser';
      this.isDesktop = false;
      return;
    }

    if ((window as any).__TAURI__ && (window as any).__TAURI__.core) {
      this.isDesktop = true;
      this.runtime = 'tauri';
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mac')) {
        this.platform = 'macos';
      } else if (ua.includes('win')) {
        this.platform = 'windows';
      } else {
        this.platform = 'linux';
      }
    } else if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      this.isDesktop = false;
      this.runtime = 'pwa';
      this.platform = 'web';
    } else {
      this.isDesktop = false;
      this.runtime = 'browser';
      this.platform = 'web';
    }
  }

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(DESKTOP_SETTINGS_STORAGE_KEY);
      if (raw) {
        this.settings = { ...this.settings, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('Failed to parse desktop settings:', err);
    }
  }

  public saveSettings(newSettings: Partial<DesktopSettingsConfig>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DESKTOP_SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    }

    // Apply changes to background coordinator
    if (this.settings.pauseBackgroundActivity) {
      desktopBackgroundService.pauseAll();
    } else {
      desktopBackgroundService.resumeAll();
    }

    // Update native shortcut if changed
    if (this.isDesktop && this.settings.globalQuickCaptureEnabled) {
      this.registerGlobalShortcut(this.settings.globalQuickCaptureShortcut);
    }
  }

  public getSettings(): DesktopSettingsConfig {
    return { ...this.settings };
  }

  public getPlatform(): DesktopPlatform {
    return this.platform;
  }

  public getRuntime(): DesktopRuntimeEnvironment {
    return this.runtime;
  }

  public isDesktopApp(): boolean {
    return this.isDesktop;
  }

  public subscribeQuickCapture(cb: () => void): () => void {
    this.onQuickCaptureListeners.add(cb);
    return () => this.onQuickCaptureListeners.delete(cb);
  }

  public subscribeSessionLock(cb: () => void): () => void {
    this.onSessionLockListeners.add(cb);
    return () => this.onSessionLockListeners.delete(cb);
  }

  /**
   * Initializes native listeners for shortcuts, tray actions, and OS session lock.
   */
  private async initNativeListeners(): Promise<void> {
    if (!this.isDesktop || typeof window === 'undefined' || !(window as any).__TAURI__) return;

    const tauriEvent = (window as any).__TAURI__.event;
    if (!tauriEvent || !tauriEvent.listen) return;

    try {
      // Global Quick Capture trigger from native shortcut
      await tauriEvent.listen('global-quick-capture-triggered', () => {
        this.triggerQuickCapture();
      });

      // OS Session Lock event (Windows Lock, macOS Lock Screen)
      await tauriEvent.listen('os-session-locked', () => {
        if (this.settings.lockOnOsSessionLock) {
          console.log('[SECURITY] OS Session locked, triggering vault lock...');
          this.onSessionLockListeners.forEach((cb) => cb());
        }
      });

      // Register initial global shortcut
      if (this.settings.globalQuickCaptureEnabled) {
        await this.registerGlobalShortcut(this.settings.globalQuickCaptureShortcut);
      }
    } catch (err) {
      console.warn('Failed to bind native desktop event listeners:', err);
    }
  }

  public triggerQuickCapture(): void {
    this.onQuickCaptureListeners.forEach((cb) => cb());
  }

  // --- Native Notifications ---

  /**
   * Dispatches a native OS notification.
   * If isVaultLocked is true, the title and content are redacted to protect user privacy.
   */
  async sendNotification(
    options: NativeNotificationOptions,
    isVaultLocked: boolean = false,
    callerContext: 'core_app' | 'plugin' | 'ai' = 'core_app'
  ): Promise<boolean> {
    if (!DesktopSecurityGuard.verifyCallerAuthorization(callerContext)) {
      return false;
    }

    if (!this.settings.nativeNotificationsEnabled) {
      return false;
    }

    // Privacy Redaction when vault is locked
    const title = isVaultLocked ? 'KeepNotes Reminder' : options.title;
    const body = isVaultLocked ? 'You have a PKM reminder. Open the app to view.' : options.body;

    if (this.isDesktop && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        await (window as any).__TAURI__.core.invoke('send_native_notification', {
          title,
          body,
        });
        return true;
      } catch (err) {
        console.warn('Native notification failed, falling back to Web Notification API:', err);
      }
    }

    // Fallback: Web Notification API
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: options.icon });
        return true;
      } catch (err) {
        console.warn('Web Notification failed:', err);
      }
    }

    return false;
  }

  // --- Global Shortcuts ---

  async registerGlobalShortcut(shortcut: string): Promise<boolean> {
    if (!this.isDesktop || typeof window === 'undefined' || !(window as any).__TAURI__) {
      return false;
    }

    try {
      await (window as any).__TAURI__.core.invoke('register_global_shortcut', {
        action: 'quick_capture',
        shortcut,
      });
      return true;
    } catch (err) {
      console.warn(`Failed to register global shortcut '${shortcut}':`, err);
      return false;
    }
  }

  // --- Shell Open & Reveal ---

  /**
   * Safely reveals a mirrored file in the operating system's file manager (Finder / Explorer).
   */
  async revealInFileManager(
    relativePath: string,
    rootPath: string,
    callerContext: 'core_app' | 'plugin' | 'ai' = 'core_app'
  ): Promise<boolean> {
    if (!DesktopSecurityGuard.verifyCallerAuthorization(callerContext)) return false;

    const validation = DesktopSecurityGuard.validateRelativePath(relativePath);
    if (!validation.isValid || !validation.sanitizedPath) {
      console.error('[SECURITY] Blocked reveal request for unsafe path:', relativePath);
      return false;
    }

    if (this.isDesktop && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        await (window as any).__TAURI__.core.invoke('reveal_file_in_explorer', {
          rootPath,
          relativePath: validation.sanitizedPath,
        });
        return true;
      } catch (err) {
        console.error('Failed to reveal file in native file manager:', err);
      }
    }
    return false;
  }

  /**
   * Safely opens a user-owned attachment in the OS default application.
   */
  async openExternally(
    relativePath: string,
    rootPath: string,
    callerContext: 'core_app' | 'plugin' | 'ai' = 'core_app'
  ): Promise<boolean> {
    if (!DesktopSecurityGuard.verifyCallerAuthorization(callerContext)) return false;

    const validation = DesktopSecurityGuard.validateRelativePath(relativePath);
    if (!validation.isValid || !validation.sanitizedPath) {
      console.error('[SECURITY] Blocked external open request for unsafe path:', relativePath);
      return false;
    }

    if (this.isDesktop && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        await (window as any).__TAURI__.core.invoke('open_file_in_default_app', {
          rootPath,
          relativePath: validation.sanitizedPath,
        });
        return true;
      } catch (err) {
        console.error('Failed to open file externally:', err);
      }
    }
    return false;
  }

  // --- Window & Lifecycle Controls ---

  async minimizeWindow(): Promise<void> {
    if (this.isDesktop && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        await (window as any).__TAURI__.core.invoke('minimize_main_window');
      } catch (err) {
        console.warn('Error minimizing window:', err);
      }
    }
  }

  async closeWindow(): Promise<void> {
    if (this.isDesktop && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        if (this.settings.closeToTray) {
          await (window as any).__TAURI__.core.invoke('hide_to_tray');
        } else {
          await (window as any).__TAURI__.core.invoke('quit_application');
        }
      } catch (err) {
        console.warn('Error closing window:', err);
      }
    }
  }
}

export const desktopCapabilityService = new DesktopCapabilityService();
