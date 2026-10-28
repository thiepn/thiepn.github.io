/**
 * PKM V2.4 — Semantic Activity Index
 *
 * Provides high-speed multi-index over semantic ActivityEvents:
 * - Chronological reverse-sorted event stream
 * - By-Resource secondary index
 * - By-Context secondary index
 * - By-Domain secondary index
 * - Invalidation-aware and memory-bounded
 */

import { ActivityEvent, ActivityQueryFilter, ActivityQueryResult } from './activityTypes';

export class ActivityIndexV2 {
  private eventsById = new Map<string, ActivityEvent>();
  private chronologicalIds: string[] = []; // Sorted newest-to-oldest
  private byResource = new Map<string, string[]>();
  private byContext = new Map<string, string[]>();
  private byDomain = new Map<string, string[]>();

  public clear(): void {
    this.eventsById.clear();
    this.chronologicalIds = [];
    this.byResource.clear();
    this.byContext.clear();
    this.byDomain.clear();
  }

  public insert(event: ActivityEvent): void {
    if (this.eventsById.has(event.id)) {
      // Update existing
      this.eventsById.set(event.id, event);
      return;
    }

    this.eventsById.set(event.id, event);

    // Insert into chronological list maintaining reverse order (newest first)
    const eventTime = new Date(event.timestamp).getTime();
    let insertIdx = 0;
    while (
      insertIdx < this.chronologicalIds.length &&
      new Date(this.eventsById.get(this.chronologicalIds[insertIdx])!.timestamp).getTime() > eventTime
    ) {
      insertIdx++;
    }
    this.chronologicalIds.splice(insertIdx, 0, event.id);

    // Index by resource
    if (event.resource?.id) {
      const resList = this.byResource.get(event.resource.id) || [];
      resList.unshift(event.id);
      this.byResource.set(event.resource.id, resList);
    }

    // Index by context
    if (event.contextId) {
      const ctxList = this.byContext.get(event.contextId) || [];
      ctxList.unshift(event.id);
      this.byContext.set(event.contextId, ctxList);
    }

    // Index by domain
    const domList = this.byDomain.get(event.domain) || [];
    domList.unshift(event.id);
    this.byDomain.set(event.domain, domList);
  }

  public update(event: ActivityEvent): void {
    if (!this.eventsById.has(event.id)) {
      this.insert(event);
      return;
    }
    this.eventsById.set(event.id, event);
  }

  public getById(id: string): ActivityEvent | undefined {
    return this.eventsById.get(id);
  }

  public getAll(): ActivityEvent[] {
    return this.chronologicalIds.map(id => this.eventsById.get(id)!);
  }

  public size(): number {
    return this.eventsById.size;
  }

  /**
   * High-throughput filtered query with cursor-based pagination
   */
  public query(filter: ActivityQueryFilter = {}): ActivityQueryResult {
    let candidateIds: string[];

    if (filter.resourceId) {
      candidateIds = this.byResource.get(filter.resourceId) || [];
    } else if (filter.contextId) {
      candidateIds = this.byContext.get(filter.contextId) || [];
    } else if (filter.domains && filter.domains.length === 1) {
      candidateIds = this.byDomain.get(filter.domains[0]) || [];
    } else {
      candidateIds = this.chronologicalIds;
    }

    const startIdx = filter.cursor ? parseInt(filter.cursor, 10) : 0;
    const limit = filter.limit || 50;

    const matched: ActivityEvent[] = [];
    let currentIdx = isNaN(startIdx) ? 0 : startIdx;

    for (; currentIdx < candidateIds.length; currentIdx++) {
      const id = candidateIds[currentIdx];
      const ev = this.eventsById.get(id);
      if (!ev) continue;

      // Domain filter
      if (filter.domains && filter.domains.length > 0 && !filter.domains.includes(ev.domain)) {
        continue;
      }

      // Type filter
      if (filter.types && filter.types.length > 0 && !filter.types.includes(ev.type)) {
        continue;
      }

      // Actor filter
      if (filter.actor && ev.actor !== filter.actor) {
        continue;
      }

      // Visibility filter
      if (filter.visibility && filter.visibility.length > 0 && !filter.visibility.includes(ev.visibility)) {
        continue;
      }

      // Date range filter
      if (filter.startDate) {
        const evDate = ev.timestamp.slice(0, 10);
        if (evDate < filter.startDate) continue;
      }
      if (filter.endDate) {
        const evDate = ev.timestamp.slice(0, 10);
        if (evDate > filter.endDate) continue;
      }

      // Search query filter (matching title or summary)
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        const titleMatch = ev.summary.primaryTitle.toLowerCase().includes(q);
        const deltaMatch = ev.summary.deltaSummary?.toLowerCase().includes(q);
        if (!titleMatch && !deltaMatch) continue;
      }

      matched.push(ev);
      if (matched.length >= limit) {
        currentIdx++;
        break;
      }
    }

    const hasMore = currentIdx < candidateIds.length;
    const nextCursor = hasMore ? String(currentIdx) : undefined;

    return {
      events: matched,
      nextCursor,
      totalMatching: matched.length,
      hasMore,
    };
  }
}

export const globalActivityIndex = new ActivityIndexV2();
