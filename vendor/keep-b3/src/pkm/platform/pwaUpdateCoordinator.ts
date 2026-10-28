/**
 * V1.3 — Safe PWA & Desktop Update Coordinator
 * Manages service worker lifecycle, user notification of updates, safe-point reloading
 * (never clobbering active editor changes), multi-tab synchronization, and locked share staging.
 */

export interface UpdateStatus {
  hasUpdate: boolean;
  version?: string;
  isDownloading: boolean;
  isReadyToInstall: boolean;
  lastCheckedIso: string;
}

export interface SharedItemPayload {
  id: string;
  title?: string;
  text?: string;
  url?: string;
  files?: Array<{ name: string; type: string; size: number; base64Content?: string }>;
  timestampIso: string;
  idempotencyKey: string;
  stagedWhileLocked: boolean;
}

const UPDATE_CHANNEL_NAME = 'pkm_app_update_channel_v1';
const STAGED_SHARES_STORAGE_KEY = 'pkm_staged_locked_shares_v1';

export class PwaUpdateCoordinator {
  private static instance: PwaUpdateCoordinator | null = null;
  private status: UpdateStatus = {
    hasUpdate: false,
    isDownloading: false,
    isReadyToInstall: false,
    lastCheckedIso: new Date().toISOString(),
  };
  private isEditorDirty: boolean = false;
  private listeners: Set<(status: UpdateStatus) => void> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private stagedShares: Map<string, SharedItemPayload> = new Map();
  private processedShareKeys: Set<string> = new Set();

  private constructor() {
    this.initBroadcast();
    this.initServiceWorkerListener();
    this.loadStagedShares();
  }

  public static getInstance(): PwaUpdateCoordinator {
    if (!PwaUpdateCoordinator.instance) {
      PwaUpdateCoordinator.instance = new PwaUpdateCoordinator();
    }
    return PwaUpdateCoordinator.instance;
  }

  public setEditorDirtyState(isDirty: boolean): void {
    this.isEditorDirty = isDirty;
  }

  public getStatus(): UpdateStatus {
    return { ...this.status };
  }

  public subscribe(listener: (status: UpdateStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  /**
   * Safe Update Reload: If editor is dirty, defers reload or prompts user.
   */
  public applyUpdateNow(force = false): boolean {
    if (this.isEditorDirty && !force) {
      return false;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'RELOAD_FOR_UPDATE' });
    }

    if (typeof window !== 'undefined') {
      window.location.reload();
      return true;
    }
    return false;
  }

  /**
   * Ingests a share payload from Web Share Target or Native Share Sheet.
   * Enforces idempotency via idempotencyKey and stages safely if vault is locked.
   */
  public ingestSharedItem(payload: Omit<SharedItemPayload, 'timestampIso' | 'stagedWhileLocked'>, isVaultLocked: boolean): { success: boolean; staged: boolean; duplicate: boolean } {
    if (this.processedShareKeys.has(payload.idempotencyKey)) {
      return { success: true, staged: false, duplicate: true };
    }

    const fullPayload: SharedItemPayload = {
      ...payload,
      timestampIso: new Date().toISOString(),
      stagedWhileLocked: isVaultLocked,
    };

    this.processedShareKeys.add(payload.idempotencyKey);

    if (isVaultLocked) {
      // Stage in secure memory/local store without exposing to main UI
      this.stagedShares.set(payload.id, fullPayload);
      this.persistStagedShares();
      return { success: true, staged: true, duplicate: false };
    }

    return { success: true, staged: false, duplicate: false };
  }

  /**
   * Ingests and drains all staged shares after user unlocks vault
   */
  public drainStagedShares(): SharedItemPayload[] {
    const items = Array.from(this.stagedShares.values());
    this.stagedShares.clear();
    this.persistStagedShares();
    return items;
  }

  public getStagedSharesCount(): number {
    return this.stagedShares.size;
  }

  private initBroadcast(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'UPDATE_AVAILABLE') {
            this.status = {
              ...this.status,
              hasUpdate: true,
              isReadyToInstall: true,
              version: event.data.version || '1.3.0',
            };
            this.notify();
          } else if (event.data?.type === 'RELOAD_FOR_UPDATE') {
            if (!this.isEditorDirty && typeof window !== 'undefined') {
              window.location.reload();
            }
          }
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }

  private initServiceWorkerListener(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker activated
        this.status = {
          ...this.status,
          hasUpdate: true,
          isReadyToInstall: true,
        };
        this.notify();
      });
    } catch {
      // Service worker listener error
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.status);
      } catch (err) {
        console.error('Error in update listener:', err);
      }
    }
  }

  private loadStagedShares(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STAGED_SHARES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SharedItemPayload[];
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            this.stagedShares.set(item.id, item);
            this.processedShareKeys.add(item.idempotencyKey);
          }
        }
      }
    } catch {
      // Storage error
    }
  }

  private persistStagedShares(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const arr = Array.from(this.stagedShares.values());
      localStorage.setItem(STAGED_SHARES_STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // Write error
    }
  }
}

export const pwaUpdateCoordinator = PwaUpdateCoordinator.getInstance();
