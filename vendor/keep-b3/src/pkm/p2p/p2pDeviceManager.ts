/**
 * Phase P32: Paired Device Trust & Sync History Manager
 * Manages trusted peer device identities, user-friendly names, and session logs.
 */

import { P2PDevice, P2PSyncHistoryEntry } from './p2pTypes';
import { generateRandomToken } from './p2pCrypto';

const PAIRED_DEVICES_KEY = 'pkm_p2p_paired_devices_v1';
const SYNC_HISTORY_KEY = 'pkm_p2p_sync_history_v1';
const LOCAL_DEVICE_ID_KEY = 'pkm_p2p_local_device_id_v1';
const LOCAL_DEVICE_NAME_KEY = 'pkm_p2p_local_device_name_v1';
const MAX_HISTORY_ENTRIES = 50;

export class P2PDeviceManager {
  private devices: Map<string, P2PDevice> = new Map();
  private history: P2PSyncHistoryEntry[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (typeof localStorage === 'undefined') return;
      const devRaw = localStorage.getItem(PAIRED_DEVICES_KEY);
      if (devRaw) {
        const list = JSON.parse(devRaw) as P2PDevice[];
        for (const d of list) {
          this.devices.set(d.id, d);
        }
      }

      const histRaw = localStorage.getItem(SYNC_HISTORY_KEY);
      if (histRaw) {
        this.history = JSON.parse(histRaw) as P2PSyncHistoryEntry[];
      }
    } catch (e) {
      console.warn('Could not load P2P device state:', e);
    }
  }

  private saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        const devList = Array.from(this.devices.values());
        localStorage.setItem(PAIRED_DEVICES_KEY, JSON.stringify(devList));
        localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(this.history.slice(-MAX_HISTORY_ENTRIES)));
      }
      this.notify();
    } catch (e) {
      console.warn('Could not save P2P device state:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) {
      try {
        l();
      } catch {}
    }
  }

  /**
   * Gets or initializes local stable device ID
   */
  public getLocalDeviceId(): string {
    let id = localStorage.getItem(LOCAL_DEVICE_ID_KEY);
    if (!id) {
      id = `dev-${generateRandomToken(16)}`;
      localStorage.setItem(LOCAL_DEVICE_ID_KEY, id);
    }
    return id;
  }

  /**
   * Gets or initializes user-friendly local device display name
   */
  public getLocalDeviceName(): string {
    let name = localStorage.getItem(LOCAL_DEVICE_NAME_KEY);
    if (!name) {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMac = /Macintosh|Mac OS/i.test(navigator.userAgent);
      const isWindows = /Windows/i.test(navigator.userAgent);
      const isLinux = /Linux/i.test(navigator.userAgent);

      const os = isMobile ? 'Mobile Device' : isMac ? 'Mac' : isWindows ? 'PC' : isLinux ? 'Linux' : 'Device';
      name = `My ${os} (${generateRandomToken(4).toUpperCase()})`;
      localStorage.setItem(LOCAL_DEVICE_NAME_KEY, name);
    }
    return name;
  }

  public setLocalDeviceName(name: string) {
    localStorage.setItem(LOCAL_DEVICE_NAME_KEY, name.trim());
    this.notify();
  }

  /**
   * Returns all paired devices
   */
  public getPairedDevices(): P2PDevice[] {
    return Array.from(this.devices.values());
  }

  public getDevice(id: string): P2PDevice | undefined {
    return this.devices.get(id);
  }

  /**
   * Adds or updates a paired device
   */
  public registerDevice(device: Omit<P2PDevice, 'pairedAt'> & { pairedAt?: string }): P2PDevice {
    const existing = this.devices.get(device.id);
    const complete: P2PDevice = {
      ...device,
      pairedAt: existing?.pairedAt || device.pairedAt || new Date().toISOString(),
      lastSyncedAt: device.lastSyncedAt || existing?.lastSyncedAt,
      trustStatus: device.trustStatus || 'trusted',
    };

    this.devices.set(complete.id, complete);
    this.saveState();
    return complete;
  }

  /**
   * Renames a paired device
   */
  public renameDevice(id: string, newName: string): boolean {
    const dev = this.devices.get(id);
    if (!dev) return false;
    dev.name = newName.trim();
    this.saveState();
    return true;
  }

  /**
   * Forgets/revokes trust for a paired device
   */
  public forgetDevice(id: string): boolean {
    const existed = this.devices.delete(id);
    if (existed) {
      this.saveState();
    }
    return existed;
  }

  /**
   * Records a completed or failed sync history event
   */
  public recordSyncHistory(entry: Omit<P2PSyncHistoryEntry, 'id'>) {
    const id = `hist-${Date.now()}-${generateRandomToken(6)}`;
    const fullEntry: P2PSyncHistoryEntry = {
      id,
      ...entry,
    };

    this.history.unshift(fullEntry);
    this.history = this.history.slice(0, MAX_HISTORY_ENTRIES);

    // Update lastSyncedAt on device
    const dev = this.devices.get(entry.peerId);
    if (dev && entry.status === 'success') {
      dev.lastSyncedAt = entry.timestamp;
    }

    this.saveState();
  }

  public getSyncHistory(): P2PSyncHistoryEntry[] {
    return [...this.history];
  }

  public clearHistory() {
    this.history = [];
    this.saveState();
  }
}

export const p2pDeviceManager = new P2PDeviceManager();
