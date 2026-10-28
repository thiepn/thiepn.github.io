/**
 * P46 — Native Desktop Background Task Coordinator
 * Coordinates background activities while the desktop application process is running
 * (including when the window is minimized or hidden in the system tray).
 *
 * Explicit Principle:
 * - Tasks run ONLY while the application process is alive.
 * - When the app is explicitly Quit, all background processing stops.
 * - Background work yields priority to active user typing and foreground interactions.
 */

export interface BackgroundServiceStatus {
  isRunning: boolean;
  isPaused: boolean;
  activeJobsCount: number;
  lastRunTimestamp: number | null;
  registeredJobNames: string[];
}

export type BackgroundJobFn = () => Promise<void> | void;

export class DesktopBackgroundService {
  private isPaused: boolean = false;
  private registeredJobs: Map<string, { intervalMs: number; lastRun: number; fn: BackgroundJobFn }> = new Map();
  private timer: any = null;
  private readonly TICK_INTERVAL_MS = 15000; // 15-second tick

  constructor() {
    this.startCoordinator();
  }

  public registerJob(name: string, intervalMs: number, fn: BackgroundJobFn): void {
    this.registeredJobs.set(name, {
      intervalMs: Math.max(intervalMs, 5000),
      lastRun: Date.now(),
      fn,
    });
  }

  public unregisterJob(name: string): void {
    this.registeredJobs.delete(name);
  }

  public pauseAll(): void {
    this.isPaused = true;
    console.log('[BACKGROUND] Desktop background activities paused');
  }

  public resumeAll(): void {
    this.isPaused = false;
    console.log('[BACKGROUND] Desktop background activities resumed');
  }

  public isActivityPaused(): boolean {
    return this.isPaused;
  }

  public getStatus(): BackgroundServiceStatus {
    return {
      isRunning: Boolean(this.timer),
      isPaused: this.isPaused,
      activeJobsCount: this.registeredJobs.size,
      lastRunTimestamp: Date.now(),
      registeredJobNames: Array.from(this.registeredJobs.keys()),
    };
  }

  private startCoordinator(): void {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(async () => {
      if (this.isPaused) return;

      const now = Date.now();
      for (const [name, job] of this.registeredJobs.entries()) {
        if (now - job.lastRun >= job.intervalMs) {
          job.lastRun = now;
          try {
            await job.fn();
          } catch (err) {
            console.error(`[BACKGROUND] Error executing job '${name}':`, err);
          }
        }
      }
    }, this.TICK_INTERVAL_MS);
  }

  public stopCoordinator(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const desktopBackgroundService = new DesktopBackgroundService();
