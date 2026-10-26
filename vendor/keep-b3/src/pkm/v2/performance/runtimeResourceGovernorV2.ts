/**
 * PKM V2.7 — Centralized Runtime Resource Governor & Worker Scheduler
 *
 * Coordinates asynchronous execution across Search, Queries, Sync, Backup,
 * Graph layout, and Vault Doctor maintenance.
 *
 * Enforces strict priority hierarchy, preemption of maintenance tasks by
 * user-blocking interactions, bounded concurrency per device profile,
 * fair yielding to prevent background starvation, and cancellation of stale requests.
 */

export type GovernorTaskPriority =
  | 'user_blocking'   // 1: Search keystroke, Quick Switcher, Note Open, Active Editor
  | 'interactive'     // 2: Backlinks inspector, Context resolution, Saved View switch
  | 'background'      // 3: Incremental delta index, Sync diff, Attachment hashing
  | 'maintenance';    // 4: Full Backup, Vault Doctor scan, Embeddings rebuild, Compaction

export type ResourceCostHint = 'cpu_heavy' | 'memory_heavy' | 'io_heavy' | 'lightweight';

export type DeviceHardwareProfile = 'low' | 'normal' | 'high';

export interface GovernorTask<T = any> {
  id: string;
  name: string;
  priority: GovernorTaskPriority;
  costHint: ResourceCostHint;
  cancellable: boolean;
  createdAt: number;
  startedAt?: number;
  execute: (signal: AbortSignal) => Promise<T>;
  abortController: AbortController;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
}

export interface GovernorMetrics {
  deviceProfile: DeviceHardwareProfile;
  maxConcurrency: number;
  activeCount: number;
  queuedCount: {
    user_blocking: number;
    interactive: number;
    background: number;
    maintenance: number;
  };
  totalCompleted: number;
  totalCancelled: number;
  totalPreempted: number;
  avgQueueLatencyMs: number;
  avgExecutionLatencyMs: number;
}

export class RuntimeResourceGovernorV2 {
  private static instance: RuntimeResourceGovernorV2;

  private queue: GovernorTask[] = [];
  private activeTasks = new Map<string, GovernorTask>();
  private taskIdCounter = 0;

  private deviceProfile: DeviceHardwareProfile = 'normal';
  private maxConcurrency = 4;

  private totalCompleted = 0;
  private totalCancelled = 0;
  private totalPreempted = 0;
  private queueLatencies: number[] = [];
  private execLatencies: number[] = [];

  private constructor() {
    this.detectHardwareProfile();
  }

  public static getInstance(): RuntimeResourceGovernorV2 {
    if (!RuntimeResourceGovernorV2.instance) {
      RuntimeResourceGovernorV2.instance = new RuntimeResourceGovernorV2();
    }
    return RuntimeResourceGovernorV2.instance;
  }

  private detectHardwareProfile() {
    if (typeof navigator !== 'undefined') {
      const cores = navigator.hardwareConcurrency || 4;
      const mem = (navigator as any).deviceMemory || 4;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      if (isMobile || cores <= 2 || mem <= 2) {
        this.deviceProfile = 'low';
        this.maxConcurrency = 2;
      } else if (cores >= 8 && mem >= 8) {
        this.deviceProfile = 'high';
        this.maxConcurrency = 8;
      } else {
        this.deviceProfile = 'normal';
        this.maxConcurrency = 4;
      }
    }
  }

  public setDeviceProfile(profile: DeviceHardwareProfile) {
    this.deviceProfile = profile;
    this.maxConcurrency = profile === 'low' ? 2 : profile === 'high' ? 8 : 4;
    this.pumpQueue();
  }

  public getDeviceProfile(): DeviceHardwareProfile {
    return this.deviceProfile;
  }

  public getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  /**
   * Schedule a task through the Governor with explicit priority and resource hints
   */
  public schedule<T>(
    name: string,
    priority: GovernorTaskPriority,
    execute: (signal: AbortSignal) => Promise<T>,
    options?: {
      costHint?: ResourceCostHint;
      cancellable?: boolean;
    }
  ): { promise: Promise<T>; cancel: () => void; taskId: string } {
    const id = `gov-task-${++this.taskIdCounter}-${Date.now()}`;
    const abortController = new AbortController();

    let resolveFn!: (value: T) => void;
    let rejectFn!: (reason: any) => void;

    const promise = new Promise<T>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    const task: GovernorTask<T> = {
      id,
      name,
      priority,
      costHint: options?.costHint || 'lightweight',
      cancellable: options?.cancellable !== false,
      createdAt: performance.now(),
      execute,
      abortController,
      resolve: resolveFn,
      reject: rejectFn,
    };

    // If a user_blocking task arrives and the active set is full of maintenance tasks,
    // preempt maintenance tasks so user interaction is never blocked
    if (priority === 'user_blocking' && this.activeTasks.size >= this.maxConcurrency) {
      this.preemptLowerPriorityTasks();
    }

    this.enqueueTask(task);
    this.pumpQueue();

    return {
      promise,
      cancel: () => this.cancelTask(id),
      taskId: id,
    };
  }

  private enqueueTask(task: GovernorTask) {
    const priorityWeight: Record<GovernorTaskPriority, number> = {
      user_blocking: 4,
      interactive: 3,
      background: 2,
      maintenance: 1,
    };

    // Priority queue insertion: highest weight first; ties broken by FIFO
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityWeight[task.priority] > priorityWeight[this.queue[i].priority]) {
        this.queue.splice(i, 0, task);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.queue.push(task);
    }
  }

  private preemptLowerPriorityTasks() {
    for (const [id, active] of this.activeTasks.entries()) {
      if (active.priority === 'maintenance' && active.cancellable) {
        // Abort the maintenance task to yield main thread / worker slots
        active.abortController.abort(new Error('Preempted by user-blocking task'));
        this.activeTasks.delete(id);
        this.totalPreempted++;
        // Re-enqueue the maintenance task for later execution
        const requeued: GovernorTask = {
          ...active,
          abortController: new AbortController(),
          startedAt: undefined,
        };
        this.enqueueTask(requeued);
        break;
      }
    }
  }

  public cancelTask(id: string) {
    // Check if task is queued
    const queueIdx = this.queue.findIndex((t) => t.id === id);
    if (queueIdx !== -1) {
      const [task] = this.queue.splice(queueIdx, 1);
      task.abortController.abort(new Error('Task cancelled in queue'));
      task.reject(new Error('Task cancelled in queue'));
      this.totalCancelled++;
      return;
    }

    // Check if task is active
    const active = this.activeTasks.get(id);
    if (active && active.cancellable) {
      active.abortController.abort(new Error('Task cancelled during execution'));
      this.activeTasks.delete(id);
      active.reject(new Error('Task cancelled during execution'));
      this.totalCancelled++;
      this.pumpQueue();
    }
  }

  private async pumpQueue() {
    if (this.activeTasks.size >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    // Starvation prevention: promote long-waiting background tasks if queued > 2000ms
    const now = performance.now();
    for (const task of this.queue) {
      if (task.priority === 'background' && now - task.createdAt > 2000) {
        task.priority = 'interactive';
      }
    }

    while (this.activeTasks.size < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      task.startedAt = performance.now();
      const queueWait = task.startedAt - task.createdAt;
      this.queueLatencies.push(queueWait);
      if (this.queueLatencies.length > 50) this.queueLatencies.shift();

      this.activeTasks.set(task.id, task);

      this.runTask(task);
    }
  }

  private async runTask(task: GovernorTask) {
    try {
      const result = await task.execute(task.abortController.signal);
      if (!task.abortController.signal.aborted) {
        task.resolve(result);
        this.totalCompleted++;
      }
    } catch (err) {
      if (!task.abortController.signal.aborted) {
        task.reject(err);
      }
    } finally {
      const duration = performance.now() - (task.startedAt || performance.now());
      this.execLatencies.push(duration);
      if (this.execLatencies.length > 50) this.execLatencies.shift();

      this.activeTasks.delete(task.id);
      this.pumpQueue();
    }
  }

  public getMetrics(): GovernorMetrics {
    const queuedCount = {
      user_blocking: 0,
      interactive: 0,
      background: 0,
      maintenance: 0,
    };
    for (const t of this.queue) {
      queuedCount[t.priority]++;
    }

    const avgQueueLatencyMs =
      this.queueLatencies.length > 0
        ? this.queueLatencies.reduce((a, b) => a + b, 0) / this.queueLatencies.length
        : 0;

    const avgExecutionLatencyMs =
      this.execLatencies.length > 0
        ? this.execLatencies.reduce((a, b) => a + b, 0) / this.execLatencies.length
        : 0;

    return {
      deviceProfile: this.deviceProfile,
      maxConcurrency: this.maxConcurrency,
      activeCount: this.activeTasks.size,
      queuedCount,
      totalCompleted: this.totalCompleted,
      totalCancelled: this.totalCancelled,
      totalPreempted: this.totalPreempted,
      avgQueueLatencyMs: Math.round(avgQueueLatencyMs * 100) / 100,
      avgExecutionLatencyMs: Math.round(avgExecutionLatencyMs * 100) / 100,
    };
  }

  public reset() {
    for (const task of this.queue) {
      task.abortController.abort(new Error('Governor reset'));
    }
    for (const task of this.activeTasks.values()) {
      task.abortController.abort(new Error('Governor reset'));
    }
    this.queue = [];
    this.activeTasks.clear();
    this.totalCompleted = 0;
    this.totalCancelled = 0;
    this.totalPreempted = 0;
    this.queueLatencies = [];
    this.execLatencies = [];
  }
}

export const runtimeResourceGovernorV2 = RuntimeResourceGovernorV2.getInstance();
