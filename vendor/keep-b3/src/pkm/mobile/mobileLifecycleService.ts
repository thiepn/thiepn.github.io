/**
 * P47 — Mobile Lifecycle & App-Switcher Privacy Service
 * 
 * Manages mobile lifecycle transitions (foreground, background, pause, resume),
 * activates the App Switcher Privacy Screen when entering background,
 * and triggers vault locking on device screen lock or extended background periods.
 */

import { mobileCapabilityService } from './mobileCapabilityService';

class MobileLifecycleService {
  private isAppInBackground: boolean = false;
  private backgroundTimestamp: number = 0;
  private lockVaultCallback: (() => void) | null = null;
  private flushSaveCallback: (() => Promise<void>) | null = null;
  private privacyOverlayVisible: boolean = false;
  private listeners: Array<(overlayVisible: boolean) => void> = [];

  constructor() {
    this.initLifecycleListeners();
  }

  public registerCallbacks(options: {
    lockVault: () => void;
    flushSave?: () => Promise<void>;
  }): void {
    this.lockVaultCallback = options.lockVault;
    if (options.flushSave) {
      this.flushSaveCallback = options.flushSave;
    }
  }

  public initialize(options: {
    lockVault: () => void;
    isVaultLocked?: () => boolean;
    flushPendingSaves?: () => Promise<void>;
  }): void {
    this.lockVaultCallback = options.lockVault;
    if (options.flushPendingSaves) {
      this.flushSaveCallback = options.flushPendingSaves;
    }
  }

  public subscribeOverlay(listener: (overlayVisible: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private setPrivacyOverlay(visible: boolean): void {
    if (this.privacyOverlayVisible !== visible) {
      this.privacyOverlayVisible = visible;
      this.listeners.forEach((l) => l(visible));
    }
  }

  public isPrivacyOverlayActive(): boolean {
    return this.privacyOverlayVisible;
  }

  private initLifecycleListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Visibility change (background / foreground)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleEnterBackground();
      } else {
        this.handleEnterForeground();
      }
    });

    // Window blur / focus (app switcher preview)
    window.addEventListener('blur', () => {
      const settings = mobileCapabilityService.getSettings();
      if (settings.protectAppSwitcher) {
        this.setPrivacyOverlay(true);
      }
    });

    window.addEventListener('focus', () => {
      this.setPrivacyOverlay(false);
    });

    // Pagehide / beforeunload (best-effort flush)
    window.addEventListener('pagehide', () => {
      this.handleEnterBackground();
    });

    // Native screen lock event
    window.addEventListener('pkm-mobile-device-locked', () => {
      const settings = mobileCapabilityService.getSettings();
      if (settings.lockOnDeviceScreenLock && this.lockVaultCallback) {
        this.lockVaultCallback();
      }
    });
  }

  private async handleEnterBackground(): Promise<void> {
    this.isAppInBackground = true;
    this.backgroundTimestamp = Date.now();

    const settings = mobileCapabilityService.getSettings();

    // Show privacy overlay for task switcher
    if (settings.protectAppSwitcher) {
      this.setPrivacyOverlay(true);
    }

    // Flush any pending unsaved note changes to IndexedDB immediately
    if (this.flushSaveCallback) {
      try {
        await this.flushSaveCallback();
      } catch (err) {
        console.warn('[MobileLifecycleService] Error flushing save on background:', err);
      }
    }

    // Immediate lock if configured
    if (settings.lockOnAppBackground === 'immediately' && this.lockVaultCallback) {
      this.lockVaultCallback();
    }
  }

  private handleEnterForeground(): void {
    this.isAppInBackground = false;
    this.setPrivacyOverlay(false);

    const settings = mobileCapabilityService.getSettings();
    const elapsedMs = Date.now() - this.backgroundTimestamp;

    if (this.backgroundTimestamp > 0 && this.lockVaultCallback) {
      if (settings.lockOnAppBackground === '1min' && elapsedMs > 60_000) {
        this.lockVaultCallback();
      } else if (settings.lockOnAppBackground === '5min' && elapsedMs > 300_000) {
        this.lockVaultCallback();
      }
    }

    this.backgroundTimestamp = 0;
  }
}

export const mobileLifecycleService = new MobileLifecycleService();
