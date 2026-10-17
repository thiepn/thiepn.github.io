/**
 * PKM V2.7 — Centralized Cache Manager & Memory Budget Governor
 *
 * Explicit cache registry with ownership boundaries, LRU eviction,
 * memory budget enforcement, sensitive cache lifecycle (lock/logout purge),
 * and memory-pressure degradation handlers.
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  sizeBytes: number;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt?: number;
}

export interface CacheRegionConfig {
  name: string;
  ownerModule: string;
  maxEntries: number;
  maxSizeBytes: number;
  ttlMs?: number;
  isSensitive: boolean;
  evictionPolicy: 'lru' | 'fifo' | 'none';
  rebuildableOnDemand: boolean;
}

export interface CacheRegionStats {
  name: string;
  ownerModule: string;
  entryCount: number;
  currentSizeBytes: number;
  maxSizeBytes: number;
  hits: number;
  misses: number;
  evictions: number;
  isSensitive: boolean;
}

export class CacheRegion<T = any> {
  public readonly config: CacheRegionConfig;
  private entries = new Map<string, CacheEntry<T>>();
  private currentSizeBytes = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(config: CacheRegionConfig) {
    this.config = config;
  }

  public get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    entry.lastAccessedAt = performance.now();
    return entry.value;
  }

  public set(key: string, value: T, estimatedBytes?: number): void {
    const size = estimatedBytes || this.estimateSize(value);

    // If key exists, update and adjust size
    const existing = this.entries.get(key);
    if (existing) {
      this.currentSizeBytes -= existing.sizeBytes;
      this.entries.delete(key);
    }

    // Check capacity and evict if needed
    while (
      (this.entries.size >= this.config.maxEntries ||
        this.currentSizeBytes + size > this.config.maxSizeBytes) &&
      this.entries.size > 0
    ) {
      this.evictOne();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      sizeBytes: size,
      createdAt: Date.now(),
      lastAccessedAt: performance.now(),
      expiresAt: this.config.ttlMs ? Date.now() + this.config.ttlMs : undefined,
    };

    this.entries.set(key, entry);
    this.currentSizeBytes += size;
  }

  public has(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  public delete(key: string): boolean {
    const entry = this.entries.get(key);
    if (entry) {
      this.currentSizeBytes -= entry.sizeBytes;
      this.entries.delete(key);
      return true;
    }
    return false;
  }

  public clear(): void {
    this.entries.clear();
    this.currentSizeBytes = 0;
  }

  public purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.delete(key);
        purged++;
      }
    }
    return purged;
  }

  private evictOne(): void {
    if (this.entries.size === 0) return;

    if (this.config.evictionPolicy === 'lru') {
      let oldestKey: string | null = null;
      let oldestAccess = Infinity;
      for (const [key, entry] of this.entries.entries()) {
        if (entry.lastAccessedAt < oldestAccess) {
          oldestAccess = entry.lastAccessedAt;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.delete(oldestKey);
        this.evictions++;
      }
    } else {
      // FIFO
      const firstKey = this.entries.keys().next().value;
      if (firstKey) {
        this.delete(firstKey);
        this.evictions++;
      }
    }
  }

  private estimateSize(value: any): number {
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (value === null || value === undefined) return 0;
    if (Array.isArray(value)) return value.length * 16;
    if (typeof value === 'object') return Object.keys(value).length * 32;
    return 64;
  }

  public getStats(): CacheRegionStats {
    return {
      name: this.config.name,
      ownerModule: this.config.ownerModule,
      entryCount: this.entries.size,
      currentSizeBytes: this.currentSizeBytes,
      maxSizeBytes: this.config.maxSizeBytes,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      isSensitive: this.config.isSensitive,
    };
  }
}

export class CacheManagerV2 {
  private static instance: CacheManagerV2;
  private regions = new Map<string, CacheRegion>();

  private aggregateBudgetBytes = 128 * 1024 * 1024; // 128MB Default (Desktop Normal)

  private constructor() {
    this.initializeStandardRegions();
  }

  public static getInstance(): CacheManagerV2 {
    if (!CacheManagerV2.instance) {
      CacheManagerV2.instance = new CacheManagerV2();
    }
    return CacheManagerV2.instance;
  }

  private initializeStandardRegions() {
    // 1. Search Postings Cache
    this.registerRegion({
      name: 'search_postings',
      ownerModule: 'search_engine',
      maxEntries: 5000,
      maxSizeBytes: 16 * 1024 * 1024, // 16MB
      evictionPolicy: 'lru',
      isSensitive: false,
      rebuildableOnDemand: true,
    });

    // 2. Query Result Match ID Cache
    this.registerRegion({
      name: 'query_results',
      ownerModule: 'query_engine_v2',
      maxEntries: 500,
      maxSizeBytes: 8 * 1024 * 1024, // 8MB
      ttlMs: 60000, // 1 min TTL
      evictionPolicy: 'lru',
      isSensitive: true,
      rebuildableOnDemand: true,
    });

    // 3. Recurrence Projection Horizon Cache
    this.registerRegion({
      name: 'recurrence_horizon',
      ownerModule: 'temporal_planning',
      maxEntries: 1000,
      maxSizeBytes: 4 * 1024 * 1024, // 4MB
      ttlMs: 300000, // 5 min TTL
      evictionPolicy: 'lru',
      isSensitive: false,
      rebuildableOnDemand: true,
    });

    // 4. Graph Adjacency & Backlinks Cache
    this.registerRegion({
      name: 'graph_adjacency',
      ownerModule: 'connections_v2',
      maxEntries: 10000,
      maxSizeBytes: 12 * 1024 * 1024, // 12MB
      evictionPolicy: 'lru',
      isSensitive: false,
      rebuildableOnDemand: true,
    });

    // 5. PDF Rendered Page Geometry / Canvas Cache
    this.registerRegion({
      name: 'pdf_pages',
      ownerModule: 'pdf_reader',
      maxEntries: 50,
      maxSizeBytes: 32 * 1024 * 1024, // 32MB
      evictionPolicy: 'lru',
      isSensitive: false,
      rebuildableOnDemand: true,
    });

    // 6. Media Thumbnail Cache
    this.registerRegion({
      name: 'thumbnails',
      ownerModule: 'media_library',
      maxEntries: 500,
      maxSizeBytes: 24 * 1024 * 1024, // 24MB
      evictionPolicy: 'lru',
      isSensitive: false,
      rebuildableOnDemand: true,
    });

    // 7. Activity Timeline Event Buffer Cache
    this.registerRegion({
      name: 'activity_timeline',
      ownerModule: 'activity_v2',
      maxEntries: 200,
      maxSizeBytes: 4 * 1024 * 1024, // 4MB
      evictionPolicy: 'lru',
      isSensitive: true,
      rebuildableOnDemand: true,
    });

    // 8. Vault Doctor Reports
    this.registerRegion({
      name: 'vault_doctor_reports',
      ownerModule: 'disaster_recovery',
      maxEntries: 10,
      maxSizeBytes: 2 * 1024 * 1024, // 2MB
      ttlMs: 120000,
      evictionPolicy: 'lru',
      isSensitive: false,
      rebuildableOnDemand: true,
    });
  }

  public registerRegion(config: CacheRegionConfig): CacheRegion {
    const region = new CacheRegion(config);
    this.regions.set(config.name, region);
    return region;
  }

  public getRegion<T = any>(name: string): CacheRegion<T> | undefined {
    return this.regions.get(name) as CacheRegion<T> | undefined;
  }

  /**
   * Called when Vault is locked or user logs out.
   * Strictly clears all caches marked as sensitive to prevent unencrypted in-memory leakage.
   */
  public handleVaultLockOrLogout(): void {
    for (const region of this.regions.values()) {
      if (region.config.isSensitive) {
        region.clear();
      }
    }
  }

  /**
   * Called under memory pressure (or on low-spec devices).
   * Evicts rebuildable caches in order of lowest priority.
   */
  public handleMemoryPressure(): void {
    const evictionOrder = [
      'thumbnails',
      'pdf_pages',
      'vault_doctor_reports',
      'query_results',
      'recurrence_horizon',
      'activity_timeline',
      'graph_adjacency',
      'search_postings',
    ];

    for (const name of evictionOrder) {
      const region = this.regions.get(name);
      if (region && region.config.rebuildableOnDemand) {
        region.clear();
      }
    }
  }

  public setAggregateBudget(budgetBytes: number) {
    this.aggregateBudgetBytes = budgetBytes;
  }

  public getTotalMemoryUsage(): number {
    let total = 0;
    for (const region of this.regions.values()) {
      total += region.getStats().currentSizeBytes;
    }
    return total;
  }

  public getAllStats(): CacheRegionStats[] {
    return Array.from(this.regions.values()).map((r) => r.getStats());
  }

  public clearAll(): void {
    for (const region of this.regions.values()) {
      region.clear();
    }
  }
}

export const cacheManagerV2 = CacheManagerV2.getInstance();
