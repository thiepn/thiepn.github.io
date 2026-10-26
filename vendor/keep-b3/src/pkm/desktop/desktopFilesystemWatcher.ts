/**
 * P46 — Native Filesystem Watcher Adapter
 * Connects the desktop native watcher (notify / FSEvents / ReadDirectoryChangesW / inotify)
 * with the P45 Reconciliation Planner.
 *
 * Rules:
 * 1. Watcher is a trigger, not the single source of truth.
 * 2. Events are coalesced through a stabilization window (150ms-300ms) to accommodate atomic-write editors.
 * 3. Watcher overflow or system wake triggers full P45 metadata rescan.
 * 4. Path traversal and out-of-root access are blocked.
 */

import { NativeWatcherEvent, FilesystemWatcherStatus } from './desktopTypes';
import { DesktopSecurityGuard } from './desktopSecurityGuard';

export type WatcherEventCallback = (events: NativeWatcherEvent[]) => void;
export type WatcherStatusCallback = (status: FilesystemWatcherStatus, error?: string) => void;

export class DesktopFilesystemWatcher {
  private isNativeAvailable: boolean = false;
  private isWatching: boolean = false;
  private currentRootPath: string | null = null;
  private currentRootId: string | null = null;
  private status: FilesystemWatcherStatus = 'inactive';
  private unlistenFn: (() => void) | null = null;

  // Event coalescing queue
  private pendingEvents: Map<string, NativeWatcherEvent> = new Map();
  private debounceTimer: any = null;
  private readonly DEBOUNCE_WINDOW_MS = 250;

  private onEventsListeners: Set<WatcherEventCallback> = new Set();
  private onStatusListeners: Set<WatcherStatusCallback> = new Set();

  constructor() {
    this.detectCapabilities();
  }

  private detectCapabilities(): void {
    if (typeof window !== 'undefined' && (window as any).__TAURI__ && (window as any).__TAURI__.core) {
      this.isNativeAvailable = true;
    }
  }

  public isAvailable(): boolean {
    return this.isNativeAvailable;
  }

  public getStatus(): FilesystemWatcherStatus {
    return this.status;
  }

  public getActiveRootPath(): string | null {
    return this.currentRootPath;
  }

  public subscribeEvents(cb: WatcherEventCallback): () => void {
    this.onEventsListeners.add(cb);
    return () => this.onEventsListeners.delete(cb);
  }

  public subscribeStatus(cb: WatcherStatusCallback): () => void {
    this.onStatusListeners.add(cb);
    return () => this.onStatusListeners.delete(cb);
  }

  private updateStatus(status: FilesystemWatcherStatus, error?: string): void {
    this.status = status;
    this.onStatusListeners.forEach((cb) => cb(status, error));
  }

  /**
   * Starts native filesystem observation for an authorized root directory.
   */
  async startWatching(
    rootPath: string,
    rootId: string = 'default',
    callerContext: 'core_app' | 'plugin' | 'ai' = 'core_app'
  ): Promise<boolean> {
    if (!DesktopSecurityGuard.verifyCallerAuthorization(callerContext)) {
      throw new Error('Unauthorized filesystem watcher invocation');
    }

    if (!rootPath) {
      this.updateStatus('path_missing', 'Root path is empty');
      return false;
    }

    this.currentRootPath = rootPath;
    this.currentRootId = rootId;

    if (this.isNativeAvailable && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        this.updateStatus('scanning');
        // Register watcher in Tauri Rust backend
        await (window as any).__TAURI__.core.invoke('start_filesystem_watcher', {
          rootId,
          rootPath,
        });

        // Listen for native watcher events via Tauri event system
        const tauriEvent = (window as any).__TAURI__.event;
        if (tauriEvent && tauriEvent.listen) {
          const unlisten = await tauriEvent.listen('native-fs-event', (event: any) => {
            this.handleRawNativeEvent(event.payload);
          });
          this.unlistenFn = unlisten;
        }

        this.isWatching = true;
        this.updateStatus('watching');
        return true;
      } catch (err: any) {
        console.error('Failed to start native filesystem watcher:', err);
        this.updateStatus('error', err.message || 'Failed to initialize watcher');
        return false;
      }
    }

    // In web/PWA mode: watcher capability is simulated / inactive (relies on P45 periodic/focus scan)
    this.isWatching = false;
    this.updateStatus('inactive');
    return false;
  }

  /**
   * Stops native filesystem observation.
   */
  async stopWatching(callerContext: 'core_app' | 'plugin' | 'ai' = 'core_app'): Promise<void> {
    if (!DesktopSecurityGuard.verifyCallerAuthorization(callerContext)) return;

    if (this.unlistenFn) {
      this.unlistenFn();
      this.unlistenFn = null;
    }

    if (this.isNativeAvailable && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        await (window as any).__TAURI__.core.invoke('stop_filesystem_watcher', {
          rootId: this.currentRootId || 'default',
        });
      } catch (err) {
        console.warn('Error stopping native filesystem watcher:', err);
      }
    }

    this.isWatching = false;
    this.currentRootPath = null;
    this.currentRootId = null;
    this.updateStatus('inactive');
  }

  /**
   * Handles raw events emitted by the native OS watcher.
   * Performs path validation, coalesces burst events, and dispatches to listeners.
   */
  private handleRawNativeEvent(rawEvent: any): void {
    if (!rawEvent || !rawEvent.type) return;

    // Check for overflow / rescan signal
    if (rawEvent.type === 'overflow' || rawEvent.type === 'rescan_required') {
      this.dispatchEvents([
        {
          type: 'rescan_required',
          relativePath: '',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const validation = DesktopSecurityGuard.validateRelativePath(rawEvent.relativePath || '');
    if (!validation.isValid || !validation.sanitizedPath) {
      console.warn('[SECURITY] Ignored watcher event with invalid relative path:', rawEvent.relativePath);
      return;
    }

    const event: NativeWatcherEvent = {
      type: rawEvent.type,
      relativePath: validation.sanitizedPath,
      oldRelativePath: rawEvent.oldRelativePath ? DesktopSecurityGuard.validateRelativePath(rawEvent.oldRelativePath).sanitizedPath : undefined,
      timestamp: Date.now(),
    };

    // Coalesce into pending map by path
    this.pendingEvents.set(event.relativePath, event);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushPendingEvents();
    }, this.DEBOUNCE_WINDOW_MS);
  }

  private flushPendingEvents(): void {
    if (this.pendingEvents.size === 0) return;
    const events = Array.from(this.pendingEvents.values());
    this.pendingEvents.clear();
    this.dispatchEvents(events);
  }

  private dispatchEvents(events: NativeWatcherEvent[]): void {
    this.onEventsListeners.forEach((cb) => {
      try {
        cb(events);
      } catch (err) {
        console.error('Error in watcher event listener:', err);
      }
    });
  }

  /**
   * System wake / sleep handler to catch up on missed filesystem changes.
   */
  public handleSystemResume(): void {
    if (this.isWatching) {
      console.log('[WATCHER] System resumed from sleep, queuing catch-up metadata rescan...');
      this.dispatchEvents([
        {
          type: 'rescan_required',
          relativePath: '',
          timestamp: Date.now(),
        },
      ]);
    }
  }
}

export const desktopFilesystemWatcher = new DesktopFilesystemWatcher();
