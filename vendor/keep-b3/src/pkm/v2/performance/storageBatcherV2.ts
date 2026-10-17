/**
 * PKM V2.7 — Storage I/O Batching & Write Amplification Guard
 *
 * Coalesces rapid sequential resource mutations, eliminates N+1 read patterns,
 * and tracks write amplification ratios to ensure localized updates
 * do not trigger full database re-writes.
 */

export interface MutationBatchItem<T = any> {
  key: string;
  payload: T;
  operation: 'put' | 'delete';
  timestamp: number;
}

export interface StorageMetrics {
  totalReads: number;
  batchedReads: number;
  totalWrites: number;
  batchedWrites: number;
  writeAmplificationRatio: number; // index writes / canonical writes
  avgBatchLatencyMs: number;
}

export class StorageBatcherV2 {
  private static instance: StorageBatcherV2;

  private pendingWrites = new Map<string, MutationBatchItem>();
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private batchDelayMs = 50;

  private totalCanonicalWrites = 0;
  private totalIndexWrites = 0;
  private totalReads = 0;
  private batchedReads = 0;
  private totalWrites = 0;
  private batchedWrites = 0;

  private onFlushHandler: ((batch: MutationBatchItem[]) => Promise<void>) | null = null;

  private constructor() {}

  public static getInstance(): StorageBatcherV2 {
    if (!StorageBatcherV2.instance) {
      StorageBatcherV2.instance = new StorageBatcherV2();
    }
    return StorageBatcherV2.instance;
  }

  public setFlushHandler(handler: (batch: MutationBatchItem[]) => Promise<void>) {
    this.onFlushHandler = handler;
  }

  /**
   * Queue a write/mutation to be batched
   */
  public stageWrite(key: string, payload: any, operation: 'put' | 'delete' = 'put'): void {
    this.pendingWrites.set(key, {
      key,
      payload,
      operation,
      timestamp: Date.now(),
    });

    this.totalCanonicalWrites++;

    if (!this.writeTimer) {
      this.writeTimer = setTimeout(() => {
        this.flush();
      }, this.batchDelayMs);
    }
  }

  public recordIndexWrite(deltaCount = 1): void {
    this.totalIndexWrites += deltaCount;
  }

  public recordRead(count = 1, isBatched = false): void {
    this.totalReads += count;
    if (isBatched) {
      this.batchedReads += count;
    }
  }

  /**
   * Flush all batched writes immediately
   */
  public async flush(): Promise<number> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }

    const items = Array.from(this.pendingWrites.values());
    if (items.length === 0) return 0;

    this.pendingWrites.clear();
    this.totalWrites += items.length;
    this.batchedWrites++;

    if (this.onFlushHandler) {
      try {
        await this.onFlushHandler(items);
      } catch (err) {
        console.error('Storage batch write error:', err);
      }
    }

    return items.length;
  }

  public getPendingCount(): number {
    return this.pendingWrites.size;
  }

  public getMetrics(): StorageMetrics {
    const ratio =
      this.totalCanonicalWrites > 0
        ? Math.round((this.totalIndexWrites / this.totalCanonicalWrites) * 100) / 100
        : 1.0;

    return {
      totalReads: this.totalReads,
      batchedReads: this.batchedReads,
      totalWrites: this.totalWrites,
      batchedWrites: this.batchedWrites,
      writeAmplificationRatio: ratio,
      avgBatchLatencyMs: this.batchDelayMs,
    };
  }

  public reset(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    this.pendingWrites.clear();
    this.totalCanonicalWrites = 0;
    this.totalIndexWrites = 0;
    this.totalReads = 0;
    this.batchedReads = 0;
    this.totalWrites = 0;
    this.batchedWrites = 0;
  }
}

export const storageBatcherV2 = StorageBatcherV2.getInstance();
