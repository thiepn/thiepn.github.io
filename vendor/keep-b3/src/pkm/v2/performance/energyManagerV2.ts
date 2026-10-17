/**
 * PKM V2.7 — Energy, Battery & Background Efficiency Manager
 *
 * Replaces recurring polling loops with event-driven reactivity.
 * Listens to Page Visibility API and pauses heavy animation loops,
 * Canvas/Graph simulation frames, and non-essential sync polls when hidden.
 */

export class EnergyManagerV2 {
  private static instance: EnergyManagerV2;

  private isTabVisible = true;
  private prefersReducedMotion = false;
  private visibilityListeners = new Set<(isVisible: boolean) => void>();
  private activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private constructor() {
    this.initVisibilityListeners();
    this.initMotionPreference();
  }

  public static getInstance(): EnergyManagerV2 {
    if (!EnergyManagerV2.instance) {
      EnergyManagerV2.instance = new EnergyManagerV2();
    }
    return EnergyManagerV2.instance;
  }

  private initVisibilityListeners() {
    if (typeof document !== 'undefined') {
      this.isTabVisible = !document.hidden;

      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        for (const listener of this.visibilityListeners) {
          try {
            listener(this.isTabVisible);
          } catch (err) {
            console.error('Visibility listener error:', err);
          }
        }
      });
    }
  }

  private initMotionPreference() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = media.matches;

      media.addEventListener?.('change', (e) => {
        this.prefersReducedMotion = e.matches;
      });
    }
  }

  public getIsVisible(): boolean {
    return this.isTabVisible;
  }

  public getPrefersReducedMotion(): boolean {
    return this.prefersReducedMotion;
  }

  public onVisibilityChange(listener: (isVisible: boolean) => void): () => void {
    this.visibilityListeners.add(listener);
    return () => this.visibilityListeners.delete(listener);
  }

  /**
   * Schedule a single event-driven callback with automatic cancellation safety
   */
  public scheduleTimeout(id: string, fn: () => void, delayMs: number): void {
    this.cancelTimeout(id);
    const timer = setTimeout(() => {
      this.activeTimers.delete(id);
      fn();
    }, delayMs);
    this.activeTimers.set(id, timer);
  }

  public cancelTimeout(id: string): void {
    const timer = this.activeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(id);
    }
  }

  public clearAllTimers(): void {
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  public getActiveTimerCount(): number {
    return this.activeTimers.size;
  }
}

export const energyManagerV2 = EnergyManagerV2.getInstance();
