/**
 * V1.2 Universal Tombstone Service
 * 
 * Ensures consistent deletion tracking across canonical notes and all structured domain resources.
 * Prevents deleted items from being resurrected during sync, backup restore, or filesystem reconciliation.
 */

export interface DeletionTombstone {
  resourceType: 'note' | 'folder' | 'saved_search' | 'canvas' | 'pdf' | 'person' | 'project' | 'tracking_event' | 'curriculum' | 'finance_transaction' | 'health_record' | 'travel_entry' | 'asset' | 'decision' | 'custom_context';
  resourceId: string;
  deletedAt: number;
  deletionVersion: number;
  originDeviceId?: string;
  metadata?: Record<string, any>;
}

const TOMBSTONE_STORAGE_KEY = 'keepnotes_tombstones_v1_2';
const DEFAULT_TTL_DAYS = 90; // 90 days retention for sync divergence window

export class TombstoneService {
  private tombstones: Map<string, DeletionTombstone> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private getCompositeKey(resourceType: string, resourceId: string): string {
    return `${resourceType}:${resourceId}`;
  }

  private loadFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(TOMBSTONE_STORAGE_KEY);
        if (raw) {
          const parsed: DeletionTombstone[] = JSON.parse(raw);
          for (const item of parsed) {
            this.tombstones.set(this.getCompositeKey(item.resourceType, item.resourceId), item);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load tombstones from storage:', err);
    }
  }

  private persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        const array = Array.from(this.tombstones.values());
        localStorage.setItem(TOMBSTONE_STORAGE_KEY, JSON.stringify(array));
      }
    } catch (err) {
      console.warn('Failed to persist tombstones to storage:', err);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) {
      try {
        l();
      } catch (err) {
        console.error('Error in tombstone listener:', err);
      }
    }
  }

  /**
   * Records a tombstone when a resource is permanently deleted
   */
  public recordTombstone(
    resourceType: DeletionTombstone['resourceType'],
    resourceId: string,
    version = 1,
    originDeviceId?: string,
    metadata?: Record<string, any>
  ): DeletionTombstone {
    const key = this.getCompositeKey(resourceType, resourceId);
    const existing = this.tombstones.get(key);

    const tombstone: DeletionTombstone = {
      resourceType,
      resourceId,
      deletedAt: Date.now(),
      deletionVersion: existing ? Math.max(existing.deletionVersion + 1, version) : version,
      originDeviceId,
      metadata,
    };

    this.tombstones.set(key, tombstone);
    this.persist();
    return tombstone;
  }

  /**
   * Checks if a resource has been tombstoned
   */
  public isTombstoned(resourceType: DeletionTombstone['resourceType'], resourceId: string): boolean {
    return this.tombstones.has(this.getCompositeKey(resourceType, resourceId));
  }

  /**
   * Returns tombstone details if present
   */
  public getTombstone(resourceType: DeletionTombstone['resourceType'], resourceId: string): DeletionTombstone | undefined {
    return this.tombstones.get(this.getCompositeKey(resourceType, resourceId));
  }

  /**
   * Clears a tombstone (e.g., if a resource is explicitly recreated by the user with fresh state)
   */
  public clearTombstone(resourceType: DeletionTombstone['resourceType'], resourceId: string): boolean {
    const key = this.getCompositeKey(resourceType, resourceId);
    const deleted = this.tombstones.delete(key);
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  /**
   * Filters incoming list of records to remove any tombstoned items
   */
  public filterOutTombstoned<T extends { id: string }>(
    resourceType: DeletionTombstone['resourceType'],
    items: T[]
  ): T[] {
    return items.filter((item) => !this.isTombstoned(resourceType, item.id));
  }

  /**
   * Prunes tombstones older than the retention threshold
   */
  public pruneExpiredTombstones(ttlDays = DEFAULT_TTL_DAYS): number {
    const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000;
    let prunedCount = 0;

    for (const [key, tombstone] of this.tombstones.entries()) {
      if (tombstone.deletedAt < cutoff) {
        this.tombstones.delete(key);
        prunedCount++;
      }
    }

    if (prunedCount > 0) {
      this.persist();
    }
    return prunedCount;
  }

  /**
   * Alias for pruneExpiredTombstones
   */
  public pruneOldTombstones(ttlDays = DEFAULT_TTL_DAYS): number {
    return this.pruneExpiredTombstones(ttlDays);
  }

  /**
   * Alias for recordTombstone
   */
  public recordDeletion(
    resourceType: DeletionTombstone['resourceType'],
    resourceId: string,
    originDeviceId?: string,
    reason?: string
  ): DeletionTombstone {
    return this.recordTombstone(resourceType, resourceId, 1, originDeviceId, { reason });
  }

  /**
   * Clears all tombstones
   */
  public clearAll() {
    this.tombstones.clear();
    this.persist();
  }

  /**
   * Returns all active tombstones
   */
  public getAllTombstones(): DeletionTombstone[] {
    return Array.from(this.tombstones.values());
  }

  /**
   * Merges tombstones from a remote peer or imported backup
   */
  public mergeTombstones(incoming: DeletionTombstone[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

    for (const tomb of incoming) {
      const key = this.getCompositeKey(tomb.resourceType, tomb.resourceId);
      const existing = this.tombstones.get(key);

      if (!existing) {
        this.tombstones.set(key, tomb);
        added++;
      } else if (tomb.deletedAt > existing.deletedAt || tomb.deletionVersion > existing.deletionVersion) {
        this.tombstones.set(key, tomb);
        updated++;
      }
    }

    if (added > 0 || updated > 0) {
      this.persist();
    }
    return { added, updated };
  }
}

export const tombstoneService = new TombstoneService();
