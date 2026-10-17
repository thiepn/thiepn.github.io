/**
 * PKM V1.9: Central Bounded Cache Registry
 * 
 * Enforces strict memory bounds, LRU eviction policies, explicit subsystem ownership,
 * automatic purging of sensitive in-memory decrypted caches on vault lock, and
 * safe double-buffered rebuildable cache clearing.
 */

import { logger } from './logger';

export interface CacheMetadata {
  id: string;
  name: string;
  owner: string;
  maxEntries: number;
  currentEntries: number;
  isSensitive: boolean; // Cleared immediately on vault lock
  isRebuildable: boolean; // Safe to purge via 'Clear Rebuildable Data'
  hitCount: number;
  missCount: number;
  lastEvictedAt?: string;
}

export interface BoundedCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
  getMetadata(): CacheMetadata;
}

export class LRUCache<K, V> implements BoundedCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxEntries: number;
  private readonly id: string;
  private readonly name: string;
  private readonly owner: string;
  private readonly isSensitive: boolean;
  private readonly isRebuildable: boolean;
  private hitCount = 0;
  private missCount = 0;
  private lastEvictedAt?: string;

  constructor(options: {
    id: string;
    name: string;
    owner: string;
    maxEntries: number;
    isSensitive?: boolean;
    isRebuildable?: boolean;
  }) {
    this.id = options.id;
    this.name = options.name;
    this.owner = options.owner;
    this.maxEntries = Math.max(1, options.maxEntries);
    this.isSensitive = !!options.isSensitive;
    this.isRebuildable = options.isRebuildable !== false;
  }

  public get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      this.missCount++;
      return undefined;
    }
    this.hitCount++;
    const value = this.cache.get(key)!;
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  public set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict oldest item (first in Map iteration)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.lastEvictedAt = new Date().toISOString();
      }
    }
    this.cache.set(key, value);
  }

  public has(key: K): boolean {
    return this.cache.has(key);
  }

  public delete(key: K): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }

  public getMetadata(): CacheMetadata {
    return {
      id: this.id,
      name: this.name,
      owner: this.owner,
      maxEntries: this.maxEntries,
      currentEntries: this.cache.size,
      isSensitive: this.isSensitive,
      isRebuildable: this.isRebuildable,
      hitCount: this.hitCount,
      missCount: this.missCount,
      lastEvictedAt: this.lastEvictedAt,
    };
  }
}

class CentralCacheRegistry {
  private caches = new Map<string, BoundedCache<any, any>>();

  /**
   * Registers or retrieves a managed bounded cache
   */
  public register<K = string, V = any>(options: {
    id: string;
    name: string;
    owner: string;
    maxEntries: number;
    isSensitive?: boolean;
    isRebuildable?: boolean;
  }): BoundedCache<K, V> {
    if (this.caches.has(options.id)) {
      return this.caches.get(options.id)! as BoundedCache<K, V>;
    }
    const cache = new LRUCache<K, V>(options);
    this.caches.set(options.id, cache);
    logger.debug('cache', `Registered managed cache: ${options.id} (max: ${options.maxEntries})`);
    return cache;
  }

  public getCache<K = string, V = any>(id: string): BoundedCache<K, V> | undefined {
    return this.caches.get(id);
  }

  public get<K = string, V = any>(id: string): BoundedCache<K, V> | undefined {
    return this.caches.get(id);
  }

  /**
   * Called immediately on vault lock to zero out all sensitive in-memory decrypted stores
   */
  public onVaultLock(): void {
    let purged = 0;
    for (const [id, cache] of this.caches.entries()) {
      if (cache.getMetadata().isSensitive) {
        cache.clear();
        purged++;
      }
    }
    logger.info('cache', `Vault lock triggered: Cleared ${purged} sensitive in-memory caches`);
  }

  /**
   * Purges all rebuildable derived caches without modifying any canonical data
   */
  public clearAllRebuildableCaches(): { clearedCount: number; cacheIds: string[] } {
    const clearedIds: string[] = [];
    for (const [id, cache] of this.caches.entries()) {
      if (cache.getMetadata().isRebuildable) {
        cache.clear();
        clearedIds.push(id);
      }
    }
    logger.info('cache', `Cleared ${clearedIds.length} rebuildable caches safely`, { clearedIds });
    return { clearedCount: clearedIds.length, cacheIds: clearedIds };
  }

  public getAllMetadata(): CacheMetadata[] {
    return Array.from(this.caches.values()).map((c) => c.getMetadata());
  }

  public getTotalEntries(): number {
    let count = 0;
    for (const cache of this.caches.values()) {
      count += cache.size();
    }
    return count;
  }
}

export const cacheRegistry = new CentralCacheRegistry();

// Initialize standard core PKM bounded caches with verified limits
export const searchResultCache = cacheRegistry.register<string, any>({
  id: 'cache:search-results',
  name: 'Search Query Results Cache',
  owner: 'searchEngine',
  maxEntries: 100,
  isSensitive: true,
  isRebuildable: true,
});

export const thumbnailCache = cacheRegistry.register<string, string>({
  id: 'cache:thumbnails',
  name: 'Media Thumbnail Data URLs',
  owner: 'mediaManager',
  maxEntries: 50,
  isSensitive: false,
  isRebuildable: true,
});

export const parsedMathAstCache = cacheRegistry.register<string, string>({
  id: 'cache:katex-rendered-html',
  name: 'KaTeX Rendered HTML Cache',
  owner: 'mathEngine',
  maxEntries: 200,
  isSensitive: false,
  isRebuildable: true,
});

export const contextLensCache = cacheRegistry.register<string, any>({
  id: 'cache:context-lens-derived',
  name: 'Context Lens Aggregated Entities',
  owner: 'contextService',
  maxEntries: 50,
  isSensitive: true,
  isRebuildable: true,
});
