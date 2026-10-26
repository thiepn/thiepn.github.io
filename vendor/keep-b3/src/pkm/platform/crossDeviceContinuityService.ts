/**
 * V1.3 — Cross-Device Continuity & Settings Locality Service
 * Manages semantic continuation across devices ("Continue on this device")
 * while strictly preserving device-local settings (window geometry, tray, shortcuts).
 */

import {
  ContinuationState,
  DeviceLocalSettings,
  DeviceClass,
} from './platformTypes';
import { platformRegistry } from './platformCapabilityRegistry';

const DEVICE_SETTINGS_STORAGE_KEY = 'pkm_device_local_settings_v1';
const CONTINUATION_STORAGE_KEY = 'pkm_cross_device_continuation_v1';

export const DEFAULT_DEVICE_SETTINGS: DeviceLocalSettings = {
  closeToTray: true,
  startAtLogin: false,
  globalQuickCaptureShortcut: 'CmdOrCtrl+Shift+Space',
  protectAppSwitcher: true,
  biometricUnlockEnabled: false,
  hapticsEnabled: true,
  lockOnBackgroundMinutes: 5,
  notificationsEnabled: true,
  notificationPrivacy: 'sanitized',
  offlineDownloadAllAttachments: false,
  maxLocalAttachmentCacheMb: 500,
  enableCrossDeviceResume: true,
};

export class CrossDeviceContinuityService {
  private static instance: CrossDeviceContinuityService | null = null;
  private deviceSettings: DeviceLocalSettings = DEFAULT_DEVICE_SETTINGS;
  private deviceId: string = '';
  private continuationState: ContinuationState | null = null;

  private constructor() {
    this.initDeviceId();
    this.loadDeviceSettings();
    this.loadContinuationState();
  }

  public static getInstance(): CrossDeviceContinuityService {
    if (!CrossDeviceContinuityService.instance) {
      CrossDeviceContinuityService.instance = new CrossDeviceContinuityService();
    }
    return CrossDeviceContinuityService.instance;
  }

  private initDeviceId(): void {
    if (typeof localStorage === 'undefined') {
      this.deviceId = 'dev_mem_session';
      return;
    }
    let id = localStorage.getItem('pkm_device_unique_id');
    if (!id) {
      id = `dev_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      localStorage.setItem('pkm_device_unique_id', id);
    }
    this.deviceId = id;
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getDeviceSettings(): DeviceLocalSettings {
    return { ...this.deviceSettings };
  }

  public updateDeviceSettings(patch: Partial<DeviceLocalSettings>): DeviceLocalSettings {
    this.deviceSettings = {
      ...this.deviceSettings,
      ...patch,
    };
    this.persistDeviceSettings();
    return this.deviceSettings;
  }

  /**
   * Records semantic state for cross-device continuation (e.g. active context or project)
   */
  public recordContinuation(activeContextId?: string, activeContextName?: string, resourceId?: string): void {
    if (!this.deviceSettings.enableCrossDeviceResume) return;

    const caps = platformRegistry.getCapabilities();
    const existingRecent = this.continuationState?.recentResourceIds || [];
    const updatedRecent = resourceId ? [resourceId, ...existingRecent.filter((id) => id !== resourceId)].slice(0, 10) : existingRecent;

    this.continuationState = {
      deviceId: this.deviceId,
      deviceName: `${caps.platform.toUpperCase()} (${caps.deviceClass})`,
      deviceClass: caps.deviceClass,
      activeContextId,
      activeContextName,
      recentResourceIds: updatedRecent,
      timestamp: new Date().toISOString(),
    };

    this.persistContinuationState();
  }

  public getContinuationState(): ContinuationState | null {
    return this.continuationState;
  }

  /**
   * Evaluates offline availability for a given asset/attachment ID
   */
  public getOfflineAvailability(assetId: string, cachedLocally: boolean): { status: 'available_offline' | 'not_available_offline'; label: string } {
    if (cachedLocally || this.deviceSettings.offlineDownloadAllAttachments) {
      return {
        status: 'available_offline',
        label: 'Available Offline',
      };
    }
    return {
      status: 'not_available_offline',
      label: 'Not Available Offline (Sync on Connect)',
    };
  }

  private loadDeviceSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(DEVICE_SETTINGS_STORAGE_KEY);
      if (raw) {
        this.deviceSettings = {
          ...DEFAULT_DEVICE_SETTINGS,
          ...JSON.parse(raw),
        };
      }
    } catch {
      // Storage error fallback
    }
  }

  private persistDeviceSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(DEVICE_SETTINGS_STORAGE_KEY, JSON.stringify(this.deviceSettings));
    } catch {
      // Write error
    }
  }

  private loadContinuationState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(CONTINUATION_STORAGE_KEY);
      if (raw) {
        this.continuationState = JSON.parse(raw) as ContinuationState;
      }
    } catch {
      // Parse error
    }
  }

  private persistContinuationState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      if (this.continuationState) {
        localStorage.setItem(CONTINUATION_STORAGE_KEY, JSON.stringify(this.continuationState));
      }
    } catch {
      // Write error
    }
  }
}

export const crossDeviceContinuityService = CrossDeviceContinuityService.getInstance();
