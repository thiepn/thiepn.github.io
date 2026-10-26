/**
 * PKM V2.5 — Device Identity & Management Engine
 *
 * Manages stable local device identity, known device registrations,
 * friendly naming, last sync timestamps, and safe device retirement.
 */

import { DeviceMetadataV2, DevicePlatformV2, DeviceStatusV2 } from '../syncTypes';

const DEVICE_STORAGE_KEY = 'keepnotes_v2_current_device';
const KNOWN_DEVICES_STORAGE_KEY = 'keepnotes_v2_known_devices';
const CURRENT_PROTOCOL_VERSION = 2;
const CURRENT_APP_VERSION = '2.5.0';

export class DeviceManagerV2 {
  private currentDevice: DeviceMetadataV2;
  private knownDevices: Map<string, DeviceMetadataV2> = new Map();

  constructor() {
    this.currentDevice = this.loadOrInitializeCurrentDevice();
    this.loadKnownDevices();
    this.registerDevice(this.currentDevice);
  }

  private detectPlatform(): DevicePlatformV2 {
    if (typeof window === 'undefined') return 'desktop_linux';
    const ua = navigator.userAgent.toLowerCase();
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;

    if (isPWA) return 'pwa';
    if (/iphone|ipad|ipod/.test(ua)) return 'mobile_ios';
    if (/android/.test(ua)) return 'mobile_android';
    if (/macintosh|mac os x/.test(ua)) return 'desktop_macos';
    if (/windows/.test(ua)) return 'desktop_windows';
    if (/linux/.test(ua)) return 'desktop_linux';
    return 'web';
  }

  private loadOrInitializeCurrentDevice(): DeviceMetadataV2 {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(DEVICE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.deviceId) {
            return {
              ...parsed,
              platform: this.detectPlatform(),
              appVersion: CURRENT_APP_VERSION,
              protocolVersion: CURRENT_PROTOCOL_VERSION,
              isCurrentDevice: true,
            };
          }
        }
      } catch (e) {
        // Fallback to fresh device
      }
    }

    const platform = this.detectPlatform();
    const platformLabel =
      platform === 'desktop_macos' ? 'Mac' :
      platform === 'desktop_windows' ? 'Windows PC' :
      platform === 'desktop_linux' ? 'Linux Workstation' :
      platform === 'mobile_ios' ? 'iPhone' :
      platform === 'mobile_android' ? 'Android Phone' :
      platform === 'pwa' ? 'Installed App' : 'Browser';

    const newDevice: DeviceMetadataV2 = {
      deviceId: `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`,
      deviceName: `My ${platformLabel}`,
      platform,
      appVersion: CURRENT_APP_VERSION,
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      firstSeenAt: new Date().toISOString(),
      lastSyncTimestamp: new Date().toISOString(),
      status: 'active',
      isCurrentDevice: true,
    };

    this.saveCurrentDevice(newDevice);
    return newDevice;
  }

  private saveCurrentDevice(device: DeviceMetadataV2): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(device));
      } catch (e) {
        // Ignore storage errors
      }
    }
    this.currentDevice = device;
  }

  private loadKnownDevices(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(KNOWN_DEVICES_STORAGE_KEY);
        if (raw) {
          const list: DeviceMetadataV2[] = JSON.parse(raw);
          for (const d of list) {
            this.knownDevices.set(d.deviceId, {
              ...d,
              isCurrentDevice: d.deviceId === this.currentDevice.deviceId,
            });
          }
        }
      } catch (e) {
        // Fallback
      }
    }
  }

  private persistKnownDevices(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const list = Array.from(this.knownDevices.values());
        localStorage.setItem(KNOWN_DEVICES_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  public getCurrentDevice(): DeviceMetadataV2 {
    return { ...this.currentDevice };
  }

  public setDeviceName(name: string): DeviceMetadataV2 {
    const trimmed = name.trim();
    if (!trimmed) return this.currentDevice;

    this.currentDevice.deviceName = trimmed;
    this.saveCurrentDevice(this.currentDevice);
    this.registerDevice(this.currentDevice);
    return { ...this.currentDevice };
  }

  public registerDevice(device: DeviceMetadataV2): void {
    const existing = this.knownDevices.get(device.deviceId);
    const updated: DeviceMetadataV2 = {
      ...device,
      isCurrentDevice: device.deviceId === this.currentDevice.deviceId,
      firstSeenAt: existing?.firstSeenAt || device.firstSeenAt || new Date().toISOString(),
      lastSyncTimestamp: device.lastSyncTimestamp || new Date().toISOString(),
      status: existing?.status === 'retired' ? 'retired' : device.status || 'active',
    };
    this.knownDevices.set(device.deviceId, updated);
    this.persistKnownDevices();
  }

  public recordSyncTimestamp(deviceId?: string, timestamp?: string): void {
    const targetId = deviceId || this.currentDevice.deviceId;
    const now = timestamp || new Date().toISOString();
    const dev = this.knownDevices.get(targetId) || (targetId === this.currentDevice.deviceId ? this.currentDevice : null);
    if (dev) {
      dev.lastSyncTimestamp = now;
      if (dev.status === 'stale') {
        dev.status = 'active';
      }
      this.knownDevices.set(targetId, dev);
      if (targetId === this.currentDevice.deviceId) {
        this.currentDevice.lastSyncTimestamp = now;
        this.saveCurrentDevice(this.currentDevice);
      }
      this.persistKnownDevices();
    }
  }

  public getKnownDevices(): DeviceMetadataV2[] {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return Array.from(this.knownDevices.values()).map(dev => {
      const isCurrent = dev.deviceId === this.currentDevice.deviceId;
      let status: DeviceStatusV2 = dev.status;

      if (status !== 'retired') {
        const lastSync = new Date(dev.lastSyncTimestamp).getTime();
        if (now - lastSync > thirtyDaysMs) {
          status = 'stale';
        }
      }

      return {
        ...dev,
        isCurrentDevice: isCurrent,
        status,
      };
    }).sort((a, b) => {
      if (a.isCurrentDevice) return -1;
      if (b.isCurrentDevice) return 1;
      return new Date(b.lastSyncTimestamp).getTime() - new Date(a.lastSyncTimestamp).getTime();
    });
  }

  public retireDevice(deviceId: string): { success: boolean; message: string } {
    if (deviceId === this.currentDevice.deviceId) {
      return {
        success: false,
        message: 'Cannot retire the current device from itself. Switch devices or reset local storage.',
      };
    }

    const dev = this.knownDevices.get(deviceId);
    if (!dev) {
      return { success: false, message: 'Device not found in known device registry.' };
    }

    dev.status = 'retired';
    dev.retiredAt = new Date().toISOString();
    this.knownDevices.set(deviceId, dev);
    this.persistKnownDevices();

    return {
      success: true,
      message: `Device "${dev.deviceName}" has been marked as retired. It will no longer participate in active sync coordination. Note: This does not remotely wipe the device.`,
    };
  }

  public unretireDevice(deviceId: string): { success: boolean } {
    const dev = this.knownDevices.get(deviceId);
    if (dev) {
      dev.status = 'active';
      dev.retiredAt = undefined;
      dev.lastSyncTimestamp = new Date().toISOString();
      this.knownDevices.set(deviceId, dev);
      this.persistKnownDevices();
      return { success: true };
    }
    return { success: false };
  }

  public getActiveDeviceCount(): number {
    return this.getKnownDevices().filter(d => d.status === 'active').length;
  }
}

export const globalDeviceManagerV2 = new DeviceManagerV2();
