/**
 * V1.3 — Unified Platform Permission Manager
 * Centralizes permission checks, on-demand acquisition, and permission matrix auditing.
 * Strictly avoids prompt-spamming on cold start; requests permissions only on explicit user action.
 */

export type PlatformPermissionType =
  | 'notifications'
  | 'camera'
  | 'microphone'
  | 'filesystem_access'
  | 'persistent_storage'
  | 'biometrics';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface PermissionAuditEntry {
  permission: PlatformPermissionType;
  platformScope: string;
  triggerEvent: string;
  requiredFor: string;
  defaultState: PermissionState;
  currentState: PermissionState;
  explanation: string;
}

export class PermissionManager {
  private static instance: PermissionManager | null = null;
  private stateCache: Map<PlatformPermissionType, PermissionState> = new Map();

  private constructor() {
    this.refreshAll();
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  public async getPermissionState(perm: PlatformPermissionType): Promise<PermissionState> {
    if (typeof window === 'undefined') return 'unsupported';

    if (perm === 'notifications') {
      if (typeof Notification === 'undefined') return 'unsupported';
      return Notification.permission as PermissionState;
    }

    if (perm === 'persistent_storage') {
      if (navigator.storage && typeof navigator.storage.persisted === 'function') {
        const isPersisted = await navigator.storage.persisted();
        return isPersisted ? 'granted' : 'prompt';
      }
      return 'unsupported';
    }

    if (perm === 'camera' || perm === 'microphone') {
      if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
      return this.stateCache.get(perm) || 'prompt';
    }

    if (perm === 'filesystem_access') {
      const hasFsa = typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === 'function';
      return hasFsa ? 'prompt' : 'unsupported';
    }

    if (perm === 'biometrics') {
      const hasBio = Boolean(window.PublicKeyCredential);
      return hasBio ? 'prompt' : 'unsupported';
    }

    return 'prompt';
  }

  /**
   * On-demand permission request triggered explicitly by user action
   */
  public async requestPermission(perm: PlatformPermissionType): Promise<{ granted: boolean; state: PermissionState }> {
    if (typeof window === 'undefined') {
      return { granted: false, state: 'unsupported' };
    }

    try {
      if (perm === 'notifications') {
        if (typeof Notification === 'undefined') return { granted: false, state: 'unsupported' };
        const res = await Notification.requestPermission();
        const s = res as PermissionState;
        this.stateCache.set(perm, s);
        return { granted: s === 'granted', state: s };
      }

      if (perm === 'camera') {
        if (!navigator.mediaDevices?.getUserMedia) return { granted: false, state: 'unsupported' };
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop()); // Immediately stop after permission test
        this.stateCache.set(perm, 'granted');
        return { granted: true, state: 'granted' };
      }

      if (perm === 'microphone') {
        if (!navigator.mediaDevices?.getUserMedia) return { granted: false, state: 'unsupported' };
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        this.stateCache.set(perm, 'granted');
        return { granted: true, state: 'granted' };
      }

      if (perm === 'persistent_storage') {
        if (navigator.storage && typeof navigator.storage.persist === 'function') {
          const persisted = await navigator.storage.persist();
          const s = persisted ? 'granted' : 'denied';
          this.stateCache.set(perm, s);
          return { granted: persisted, state: s };
        }
        return { granted: false, state: 'unsupported' };
      }

      return { granted: true, state: 'granted' };
    } catch {
      this.stateCache.set(perm, 'denied');
      return { granted: false, state: 'denied' };
    }
  }

  public async getAuditMatrix(): Promise<PermissionAuditEntry[]> {
    const entries: PermissionAuditEntry[] = [
      {
        permission: 'notifications',
        platformScope: 'All Platforms',
        triggerEvent: 'User enables task/calendar reminder',
        requiredFor: 'Delivering scheduled local alarms & due notifications',
        defaultState: 'prompt',
        currentState: await this.getPermissionState('notifications'),
        explanation: 'Used strictly to fire local scheduled notifications for reminders.',
      },
      {
        permission: 'persistent_storage',
        platformScope: 'Web / PWA',
        triggerEvent: 'First vault creation or high data quota usage',
        requiredFor: 'Preventing browser automated cache eviction',
        defaultState: 'prompt',
        currentState: await this.getPermissionState('persistent_storage'),
        explanation: 'Ensures IndexedDB and local offline attachments are durable across browser storage pressure.',
      },
      {
        permission: 'camera',
        platformScope: 'Mobile / Tablet / Web',
        triggerEvent: 'User clicks Scan Document or Capture Image',
        requiredFor: 'Direct optical capture into notes/attachments',
        defaultState: 'prompt',
        currentState: await this.getPermissionState('camera'),
        explanation: 'Activated only during active media capture sessions; never runs in background.',
      },
      {
        permission: 'microphone',
        platformScope: 'All Platforms',
        triggerEvent: 'User clicks Record Audio Note',
        requiredFor: 'Recording voice memos and inline audio notes',
        defaultState: 'prompt',
        currentState: await this.getPermissionState('microphone'),
        explanation: 'Microphone is accessed solely while the user is explicitly recording an audio note.',
      },
      {
        permission: 'filesystem_access',
        platformScope: 'Desktop / Chromium Web',
        triggerEvent: 'User connects local folder or opens vault directory',
        requiredFor: 'Direct filesystem bidirectional sync and file export',
        defaultState: 'prompt',
        currentState: await this.getPermissionState('filesystem_access'),
        explanation: 'Restricted strictly to user-selected directories and explicitly chosen files.',
      },
      {
        permission: 'biometrics',
        platformScope: 'Mobile / macOS / Windows',
        triggerEvent: 'User toggles Biometric Convenience Unlock in Settings',
        requiredFor: 'Device-local key wrapping for fast app unlock',
        defaultState: 'prompt',
        currentState: await this.getPermissionState('biometrics'),
        explanation: 'Master password derives vault key; biometrics wrap the ephemeral session key locally.',
      },
    ];

    return entries;
  }

  private async refreshAll(): Promise<void> {
    const perms: PlatformPermissionType[] = [
      'notifications',
      'persistent_storage',
      'camera',
      'microphone',
      'filesystem_access',
      'biometrics',
    ];
    for (const p of perms) {
      const s = await this.getPermissionState(p);
      this.stateCache.set(p, s);
    }
  }
}

export const permissionManager = PermissionManager.getInstance();
