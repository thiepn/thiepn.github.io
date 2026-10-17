/**
 * V1.3 — Unified Platform Lifecycle & State Durability Service
 * Centralizes lifecycle listeners (foreground, background, process suspend, resume).
 * Enforces immediate flush of debounced writes upon backgrounding and manages
 * app-switcher privacy masking and session resume state.
 */

import { AppLifecycleState } from './platformTypes';

export type LifecycleStateListener = (state: AppLifecycleState) => void;
export type WriteFlushCallback = () => Promise<void> | void;

const SESSION_RESUME_STORAGE_KEY = 'pkm_session_resume_v1';

export interface SessionResumeState {
  lastActiveResourceId?: string;
  lastActiveResourceType?: 'note' | 'project' | 'task' | 'context' | 'view';
  lastActiveView?: string;
  activeContextId?: string;
  timestampIso: string;
}

export class PlatformLifecycleService {
  private static instance: PlatformLifecycleService | null = null;
  private currentState: AppLifecycleState = 'foreground';
  private listeners: Set<LifecycleStateListener> = new Set();
  private flushCallbacks: Set<WriteFlushCallback> = new Set();
  private isAppSwitcherObscured: boolean = false;

  private constructor() {
    this.initPlatformListeners();
  }

  public static getInstance(): PlatformLifecycleService {
    if (!PlatformLifecycleService.instance) {
      PlatformLifecycleService.instance = new PlatformLifecycleService();
    }
    return PlatformLifecycleService.instance;
  }

  public getCurrentState(): AppLifecycleState {
    return this.currentState;
  }

  public isObscured(): boolean {
    return this.isAppSwitcherObscured;
  }

  public subscribe(listener: LifecycleStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  /**
   * Registers a callback to be executed immediately before the app is backgrounded or suspended
   */
  public registerFlushCallback(cb: WriteFlushCallback): () => void {
    this.flushCallbacks.add(cb);
    return () => this.flushCallbacks.delete(cb);
  }

  /**
   * Triggers an immediate flush of all registered write queues
   */
  public async flushPendingWrites(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const cb of this.flushCallbacks) {
      try {
        const res = cb();
        if (res instanceof Promise) {
          promises.push(res);
        }
      } catch (err) {
        console.error('Error during lifecycle flush callback:', err);
      }
    }
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  /**
   * Records active resource state for seamless session resumption after cold launch or process kill
   */
  public saveResumeState(state: Omit<SessionResumeState, 'timestampIso'>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const fullState: SessionResumeState = {
        ...state,
        timestampIso: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_RESUME_STORAGE_KEY, JSON.stringify(fullState));
    } catch {
      // Storage error fallback
    }
  }

  /**
   * Retrieves saved resume state
   */
  public getResumeState(): SessionResumeState | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_RESUME_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as SessionResumeState;
      }
    } catch {
      // Parse error
    }
    return null;
  }

  public clearResumeState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(SESSION_RESUME_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  private setState(newState: AppLifecycleState): void {
    if (this.currentState === newState) return;
    this.currentState = newState;

    if (newState === 'background') {
      this.isAppSwitcherObscured = true;
      this.flushPendingWrites();
    } else if (newState === 'foreground' || newState === 'resumed') {
      this.isAppSwitcherObscured = false;
    }

    for (const listener of this.listeners) {
      try {
        listener(newState);
      } catch (err) {
        console.error('Error in lifecycle listener:', err);
      }
    }
  }

  private initPlatformListeners(): void {
    if (typeof window === 'undefined') return;

    // 1. Web Page Visibility API (Foreground / Background)
    if (typeof document !== 'undefined' && 'visibilityState' in document) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.setState('background');
        } else {
          this.setState('resumed');
        }
      });
    }

    // 2. Window Blur / Focus (App Switcher)
    window.addEventListener('blur', () => {
      if (this.currentState === 'foreground') {
        this.setState('background');
      }
    });

    window.addEventListener('focus', () => {
      if (this.currentState === 'background') {
        this.setState('foreground');
      }
    });

    // 3. BeforeUnload & PageHide (Emergency Flush)
    window.addEventListener('pagehide', () => {
      this.setState('terminating');
      this.flushPendingWrites();
    });

    window.addEventListener('beforeunload', () => {
      this.setState('terminating');
      this.flushPendingWrites();
    });

    // 4. Capacitor / Tauri Native Lifecycle Bridge
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'PKM_LIFECYCLE_EVENT') {
        const nativeState = event.data.state as AppLifecycleState;
        if (nativeState) {
          this.setState(nativeState);
        }
      }
    });
  }
}

export const platformLifecycleService = PlatformLifecycleService.getInstance();
