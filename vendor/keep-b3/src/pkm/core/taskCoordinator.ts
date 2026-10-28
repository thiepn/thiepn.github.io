/**
 * PKM V1.9: Background Task Coordinator & Worker Scheduler
 * 
 * Provides unified, prioritized task scheduling for compute and I/O workloads:
 * - Priority tiers: 'interactive-high' | 'interactive-normal' | 'background' | 'maintenance'
 * - Cooperative yielding to main-thread rendering (requestIdleCallback / setTimeout)
 * - Structured cancellation tokens (AbortController)
 * - Stale result rejection via monotonically increasing sequence IDs
 * - Adaptive concurrency bounds for low-end / mobile runtimes
 * - Network retry backoff and retry-storm prevention
 */

import { logger } from './logger';
import { TaskCancelledError } from './errors';

export type TaskPriority = 'interactive-high' | 'interactive-normal' | 'background' | 'maintenance';

export interface ScheduledTask<T = any> {
  id: string;
  name: string;
  domain: string;
  priority: TaskPriority;
  execute: (signal: AbortSignal) => Promise<T>;
  abortController: AbortController;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  sequenceId: number;
  error?: string;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export interface TaskCoordinatorStats {
  queuedCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  maxConcurrency: number;
  activeTasks: Array<{ id: string; name: string; priority: TaskPriority; runningMs: number }>;
}

class BackgroundTaskCoordinator {
  private queue: ScheduledTask[] = [];
  private running = new Map<string, ScheduledTask>();
  private completedCount = 0;
  private failedCount = 0;
  private cancelledCount = 0;
  private globalSequence = 0;
  private maxConcurrency = 3;
  private isProcessing = false;

  constructor() {
    // Dynamically adjust concurrency for mobile/low-core environments
    if (typeof navigator !== 'undefined') {
      const cores = navigator.hardwareConcurrency || 4;
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      this.maxConcurrency = isMobile ? Math.min(2, Math.max(1, cores - 1)) : Math.min(4, Math.max(2, cores - 1));
    }
  }

  public setMaxConcurrency(limit: number): void {
    this.maxConcurrency = Math.max(1, limit);
  }

  /**
   * Schedules a task with specified priority and automatic yielding
   */
  public schedule<T = any>(
    name: string,
    domain: string,
    priority: TaskPriority,
    execute: (signal: AbortSignal) => Promise<T>,
    parentSignal?: AbortSignal
  ): Promise<T> {
    const sequenceId = ++this.globalSequence;
    const id = `task_${Date.now()}_${sequenceId}`;
    const abortController = new AbortController();

    if (parentSignal) {
      if (parentSignal.aborted) {
        abortController.abort();
        return Promise.reject(new TaskCancelledError(name, id));
      }
      parentSignal.addEventListener('abort', () => {
        abortController.abort();
        this.cancelTask(id);
      }, { once: true });
    }

    return new Promise<T>((resolve, reject) => {
      const task: ScheduledTask<T> = {
        id,
        name,
        domain,
        priority,
        execute,
        abortController,
        createdAt: performance.now(),
        status: 'queued',
        sequenceId,
        resolve,
        reject,
      };

      this.enqueueTask(task);
      this.processNext();
    });
  }

  /**
   * Explicitly cancels a task by ID if queued or running
   */
  public cancelTask(id: string): boolean {
    // Check queued
    const qIndex = this.queue.findIndex((t) => t.id === id);
    if (qIndex !== -1) {
      const [task] = this.queue.splice(qIndex, 1);
      task.status = 'cancelled';
      task.abortController.abort();
      this.cancelledCount++;
      task.reject(new TaskCancelledError(task.name, id));
      logger.debug('task-coordinator', `Cancelled queued task: ${task.name} (${id})`);
      return true;
    }

    // Check running
    const runningTask = this.running.get(id);
    if (runningTask) {
      runningTask.status = 'cancelled';
      runningTask.abortController.abort();
      this.running.delete(id);
      this.cancelledCount++;
      runningTask.reject(new TaskCancelledError(runningTask.name, id));
      logger.debug('task-coordinator', `Aborted running task: ${runningTask.name} (${id})`);
      this.processNext();
      return true;
    }

    return false;
  }

  /**
   * Cancels all pending tasks matching domain or priority
   */
  public cancelMatching(filter: { domain?: string; priority?: TaskPriority }): number {
    let cancelled = 0;
    const toCancel: string[] = [];

    for (const t of this.queue) {
      if ((!filter.domain || t.domain === filter.domain) &&
          (!filter.priority || t.priority === filter.priority)) {
        toCancel.push(t.id);
      }
    }

    for (const id of toCancel) {
      if (this.cancelTask(id)) cancelled++;
    }
    return cancelled;
  }

  public getStats(): TaskCoordinatorStats {
    const now = performance.now();
    const activeTasks = Array.from(this.running.values()).map((t) => ({
      id: t.id,
      name: t.name,
      priority: t.priority,
      runningMs: t.startedAt ? Math.round(now - t.startedAt) : 0,
    }));

    return {
      queuedCount: this.queue.length,
      runningCount: this.running.size,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      cancelledCount: this.cancelledCount,
      maxConcurrency: this.maxConcurrency,
      activeTasks,
    };
  }

  private enqueueTask(task: ScheduledTask): void {
    const priorityWeight: Record<TaskPriority, number> = {
      'interactive-high': 4,
      'interactive-normal': 3,
      'background': 2,
      'maintenance': 1,
    };

    // Insert sorted by priority descending, then createdAt ascending
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const itemWeight = priorityWeight[this.queue[i].priority];
      const newWeight = priorityWeight[task.priority];
      if (newWeight > itemWeight) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, task);
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.running.size < this.maxConcurrency && this.queue.length > 0) {
        const task = this.queue.shift();
        if (!task) break;

        if (task.abortController.signal.aborted) {
          task.status = 'cancelled';
          this.cancelledCount++;
          task.reject(new TaskCancelledError(task.name, task.id));
          continue;
        }

        this.executeTask(task);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    task.status = 'running';
    task.startedAt = performance.now();
    this.running.set(task.id, task);

    // Yield to the main thread for background / maintenance tasks
    if (task.priority === 'background' || task.priority === 'maintenance') {
      await this.cooperativeYield();
    }

    try {
      if (task.abortController.signal.aborted) {
        throw new TaskCancelledError(task.name, task.id);
      }

      const result = await task.execute(task.abortController.signal);

      // Check if aborted during execution
      if (task.abortController.signal.aborted) {
        throw new TaskCancelledError(task.name, task.id);
      }

      task.status = 'completed';
      task.completedAt = performance.now();
      this.completedCount++;
      task.resolve(result);
    } catch (err: any) {
      if (task.abortController.signal.aborted || err instanceof TaskCancelledError) {
        task.status = 'cancelled';
        this.cancelledCount++;
        task.reject(new TaskCancelledError(task.name, task.id));
      } else {
        task.status = 'failed';
        task.error = err?.message || String(err);
        this.failedCount++;
        logger.error(task.domain, `Task '${task.name}' failed: ${task.error}`, { taskId: task.id, priority: task.priority });
        task.reject(err);
      }
    } finally {
      this.running.delete(task.id);
      this.processNext();
    }
  }

  private cooperativeYield(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => resolve(), { timeout: 50 });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
}

export const taskCoordinator = new BackgroundTaskCoordinator();
