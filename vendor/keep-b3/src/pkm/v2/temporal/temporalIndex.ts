/**
 * PKM V2.3 — High Performance Unified Temporal Index V2
 * 
 * Provides an in-memory, index-backed query cache for all time-aware resources
 * across all domains without duplicating underlying canonical bodies.
 */

import {
  TemporalProjection,
  TemporalFieldType,
  DateOnlyString,
  TemporalIndexFilter,
} from './temporalTypes';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { getTodayDateOnly } from './recurrenceEngineV2';

export class TemporalIndexV2 {
  // Primary index: DateOnlyString -> Map of projectionId -> TemporalProjection
  private dateIndex = new Map<DateOnlyString, Map<string, TemporalProjection>>();
  // Secondary index: ResourceId -> Set of projectionIds
  private resourceIndex = new Map<string, Set<string>>();
  // Projection lookup: projectionId -> TemporalProjection
  private projectionMap = new Map<string, TemporalProjection>();

  /**
   * Clears the entire index
   */
  public clear(): void {
    this.dateIndex.clear();
    this.resourceIndex.clear();
    this.projectionMap.clear();
  }

  /**
   * Registers or updates a temporal projection
   */
  public indexProjection(projection: TemporalProjection): void {
    // Remove existing projection with this ID if it changed dates
    const existing = this.projectionMap.get(projection.id);
    if (existing && existing.dateOnly !== projection.dateOnly) {
      this.removeProjection(existing.id);
    }

    this.projectionMap.set(projection.id, projection);

    // Date index mapping
    if (!this.dateIndex.has(projection.dateOnly)) {
      this.dateIndex.set(projection.dateOnly, new Map());
    }
    this.dateIndex.get(projection.dateOnly)!.set(projection.id, projection);

    // Resource index mapping
    if (!this.resourceIndex.has(projection.resourceId)) {
      this.resourceIndex.set(projection.resourceId, new Set());
    }
    this.resourceIndex.get(projection.resourceId)!.add(projection.id);
  }

  /**
   * Removes a projection by projection ID
   */
  public removeProjection(projectionId: string): void {
    const proj = this.projectionMap.get(projectionId);
    if (!proj) return;

    this.projectionMap.delete(projectionId);

    const dateBucket = this.dateIndex.get(proj.dateOnly);
    if (dateBucket) {
      dateBucket.delete(projectionId);
      if (dateBucket.size === 0) {
        this.dateIndex.delete(proj.dateOnly);
      }
    }

    const resBucket = this.resourceIndex.get(proj.resourceId);
    if (resBucket) {
      resBucket.delete(projectionId);
      if (resBucket.size === 0) {
        this.resourceIndex.delete(proj.resourceId);
      }
    }
  }

  /**
   * Removes all projections for a specific canonical resource (e.g. on deletion/update)
   */
  public invalidateResource(resourceId: string): void {
    const projIds = this.resourceIndex.get(resourceId);
    if (!projIds) return;

    for (const id of Array.from(projIds)) {
      this.removeProjection(id);
    }
  }

  /**
   * Queries projections matching a date range and optional filters
   */
  public query(filter: TemporalIndexFilter = {}): TemporalProjection[] {
    const results: TemporalProjection[] = [];
    const today = getTodayDateOnly();
    const startDate = filter.startDate || '1970-01-01';
    const endDate = filter.endDate || '2099-12-31';

    // Iterate across matching dates
    for (const [dateStr, bucket] of this.dateIndex.entries()) {
      if (dateStr < startDate || dateStr > endDate) {
        continue;
      }

      for (const proj of bucket.values()) {
        // Filter by resource type
        if (filter.resourceTypes && filter.resourceTypes.length > 0) {
          if (!filter.resourceTypes.includes(proj.resourceType)) continue;
        }

        // Filter by field type
        if (filter.fields && filter.fields.length > 0) {
          if (!filter.fields.includes(proj.field)) continue;
        }

        // Filter by completion
        if (filter.includeCompleted === false && proj.completed) {
          continue;
        }

        // Filter by context
        if (filter.contextId && (!proj.contextIds || !proj.contextIds.includes(filter.contextId))) {
          continue;
        }

        // Filter by tag
        if (filter.tag && (!proj.tags || !proj.tags.includes(filter.tag))) {
          continue;
        }

        // Search text
        if (filter.searchQuery) {
          const q = filter.searchQuery.toLowerCase();
          if (!proj.title.toLowerCase().includes(q)) continue;
        }

        results.push(proj);
      }
    }

    // Sort deterministically: date ASC, time ASC (all-day first or last), title ASC
    return results.sort((a, b) => {
      if (a.dateOnly !== b.dateOnly) return a.dateOnly.localeCompare(b.dateOnly);
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time && !b.time) return 1;
      if (!a.time && b.time) return -1;
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Retrieves all items strictly for today
   */
  public getForDate(dateOnly: DateOnlyString, includeCompleted = true): TemporalProjection[] {
    const bucket = this.dateIndex.get(dateOnly);
    if (!bucket) return [];

    const items: TemporalProjection[] = [];
    for (const proj of bucket.values()) {
      if (!includeCompleted && proj.completed) continue;
      items.push(proj);
    }

    return items.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time && !b.time) return 1;
      if (!a.time && b.time) return -1;
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Retrieves overdue items (due date < today and not completed)
   */
  public getOverdue(todayStr = getTodayDateOnly()): TemporalProjection[] {
    const overdue: TemporalProjection[] = [];

    for (const [dateStr, bucket] of this.dateIndex.entries()) {
      if (dateStr >= todayStr) continue;

      for (const proj of bucket.values()) {
        if (proj.field === 'due' && !proj.completed) {
          overdue.push(proj);
        }
      }
    }

    return overdue.sort((a, b) => a.dateOnly.localeCompare(b.dateOnly));
  }

  /**
   * Returns stats for observatory and diagnostics
   */
  public getStats(): {
    totalProjections: number;
    indexedDatesCount: number;
    indexedResourcesCount: number;
  } {
    return {
      totalProjections: this.projectionMap.size,
      indexedDatesCount: this.dateIndex.size,
      indexedResourcesCount: this.resourceIndex.size,
    };
  }
}

export const temporalIndexV2 = new TemporalIndexV2();
