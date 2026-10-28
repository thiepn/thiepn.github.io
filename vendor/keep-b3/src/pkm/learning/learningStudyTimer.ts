/**
 * Phase P51 — Lightweight Foreground Study Timer
 *
 * Provides start, pause, resume, stop, wall-clock elapsed calculation,
 * and duration correction for study sessions without background battery drain
 * or surveillance daemons.
 */

export interface StudyTimerState {
  isRunning: boolean;
  isPaused: boolean;
  courseId?: string;
  courseTitle?: string;
  activityType?: string;
  startedAt?: number;
  pausedAt?: number;
  accumulatedMs: number;
}

class StudyTimerService {
  private state: StudyTimerState = {
    isRunning: false,
    isPaused: false,
    accumulatedMs: 0,
  };

  private listeners: Set<(state: StudyTimerState) => void> = new Set();
  private intervalId: any = null;

  constructor() {
    this.restoreTimer();
  }

  private restoreTimer() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('pkm_study_timer_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = parsed;
        if (this.state.isRunning && !this.state.isPaused) {
          this.startTicker();
        }
      }
    } catch (e) {
      console.warn('Failed to restore study timer', e);
    }
  }

  private persistTimer() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('pkm_study_timer_v1', JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to persist study timer', e);
    }
  }

  public subscribe(listener: (state: StudyTimerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const current = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(current);
      } catch (err) {
        console.error('Error in study timer listener:', err);
      }
    }
  }

  private startTicker() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.notify();
    }, 1000);
  }

  private stopTicker() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public getState(): StudyTimerState {
    return { ...this.state };
  }

  public getElapsedMinutes(): number {
    let ms = this.state.accumulatedMs;
    if (this.state.isRunning && !this.state.isPaused && this.state.startedAt) {
      ms += Date.now() - this.state.startedAt;
    }
    return Math.max(1, Math.round(ms / 60000));
  }

  public getElapsedSeconds(): number {
    let ms = this.state.accumulatedMs;
    if (this.state.isRunning && !this.state.isPaused && this.state.startedAt) {
      ms += Date.now() - this.state.startedAt;
    }
    return Math.floor(ms / 1000);
  }

  public start(courseId?: string, courseTitle?: string, activityType: string = 'Reading'): void {
    this.state = {
      isRunning: true,
      isPaused: false,
      courseId,
      courseTitle,
      activityType,
      startedAt: Date.now(),
      accumulatedMs: 0,
    };
    this.persistTimer();
    this.startTicker();
    this.notify();
  }

  public pause(): void {
    if (!this.state.isRunning || this.state.isPaused) return;
    const now = Date.now();
    const elapsedSinceStart = this.state.startedAt ? now - this.state.startedAt : 0;

    this.state.accumulatedMs += elapsedSinceStart;
    this.state.isPaused = true;
    this.state.pausedAt = now;
    this.state.startedAt = undefined;

    this.persistTimer();
    this.stopTicker();
    this.notify();
  }

  public resume(): void {
    if (!this.state.isRunning || !this.state.isPaused) return;

    this.state.isPaused = false;
    this.state.startedAt = Date.now();
    this.state.pausedAt = undefined;

    this.persistTimer();
    this.startTicker();
    this.notify();
  }

  public stop(): { durationMinutes: number; courseId?: string; courseTitle?: string; activityType?: string } {
    const durationMinutes = this.getElapsedMinutes();
    const { courseId, courseTitle, activityType } = this.state;

    this.reset();
    return {
      durationMinutes,
      courseId,
      courseTitle,
      activityType,
    };
  }

  public reset(): void {
    this.stopTicker();
    this.state = {
      isRunning: false,
      isPaused: false,
      accumulatedMs: 0,
    };
    this.persistTimer();
    this.notify();
  }
}

export const studyTimerService = new StudyTimerService();
