/**
 * PKM V2.7 — Extreme-Scale Query Optimizer & Compact Projection Engine
 *
 * Operates across 100,000+ Notes and 500,000+ structured Resources without full-body
 * materialization. Uses compact indexed arrays, inverted tag postings, and
 * streaming top-K filters.
 */

export interface CompactResourceProjection {
  id: string;
  type: string;
  title: string;
  tags: string[];
  status?: string;
  modifiedAt: number; // epoch ms
  priority?: 'high' | 'medium' | 'low';
  folderId?: string | null;
  trashed?: boolean;
  archived?: boolean;
  amount?: number; // for financial queries
}

export interface CompactQueryFilter {
  types?: string[];
  tags?: string[];
  status?: string[];
  textQuery?: string;
  folderId?: string | null;
  modifiedAfter?: number;
  modifiedBefore?: number;
  trashed?: boolean;
  archived?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'modifiedAt' | 'title' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

export interface QueryExecutionResult {
  matchIds: string[];
  totalMatches: number;
  pageProjections: CompactResourceProjection[];
  executionTimeMs: number;
  usedIndexes: string[];
}

export class ExtremeQueryOptimizerV2 {
  private static instance: ExtremeQueryOptimizerV2;

  private projections = new Map<string, CompactResourceProjection>();
  private typeIndex = new Map<string, Set<string>>();
  private tagIndex = new Map<string, Set<string>>();
  private statusIndex = new Map<string, Set<string>>();

  private constructor() {}

  public static getInstance(): ExtremeQueryOptimizerV2 {
    if (!ExtremeQueryOptimizerV2.instance) {
      ExtremeQueryOptimizerV2.instance = new ExtremeQueryOptimizerV2();
    }
    return ExtremeQueryOptimizerV2.instance;
  }

  public indexProjections(items: CompactResourceProjection[]): void {
    for (const item of items) {
      this.projections.set(item.id, item);

      // Type index
      let typeSet = this.typeIndex.get(item.type);
      if (!typeSet) {
        typeSet = new Set();
        this.typeIndex.set(item.type, typeSet);
      }
      typeSet.add(item.id);

      // Tag index
      if (item.tags) {
        for (const tag of item.tags) {
          const lower = tag.toLowerCase();
          let tagSet = this.tagIndex.get(lower);
          if (!tagSet) {
            tagSet = new Set();
            this.tagIndex.set(lower, tagSet);
          }
          tagSet.add(item.id);
        }
      }

      // Status index
      if (item.status) {
        let statusSet = this.statusIndex.get(item.status);
        if (!statusSet) {
          statusSet = new Set();
          this.statusIndex.set(item.status, statusSet);
        }
        statusSet.add(item.id);
      }
    }
  }

  public updateSingleProjection(item: CompactResourceProjection): void {
    // Remove old index references if existing
    const existing = this.projections.get(item.id);
    if (existing) {
      this.typeIndex.get(existing.type)?.delete(item.id);
      if (existing.tags) {
        for (const t of existing.tags) {
          this.tagIndex.get(t.toLowerCase())?.delete(item.id);
        }
      }
      if (existing.status) {
        this.statusIndex.get(existing.status)?.delete(item.id);
      }
    }
    this.indexProjections([item]);
  }

  public removeProjection(id: string): void {
    const existing = this.projections.get(id);
    if (existing) {
      this.typeIndex.get(existing.type)?.delete(id);
      if (existing.tags) {
        for (const t of existing.tags) {
          this.tagIndex.get(t.toLowerCase())?.delete(id);
        }
      }
      if (existing.status) {
        this.statusIndex.get(existing.status)?.delete(id);
      }
      this.projections.delete(id);
    }
  }

  public clear(): void {
    this.projections.clear();
    this.typeIndex.clear();
    this.tagIndex.clear();
    this.statusIndex.clear();
  }

  public getCount(): number {
    return this.projections.size;
  }

  /**
   * Executes structured query without materializing unneeded fields
   */
  public executeQuery(filter: CompactQueryFilter): QueryExecutionResult {
    const startTime = performance.now();
    const usedIndexes: string[] = [];

    let candidateIds: Set<string> | null = null;

    // 1. Filter by Types (Set intersection)
    if (filter.types && filter.types.length > 0) {
      usedIndexes.push('type_index');
      candidateIds = new Set<string>();
      for (const t of filter.types) {
        const set = this.typeIndex.get(t);
        if (set) {
          for (const id of set) candidateIds.add(id);
        }
      }
    }

    // 2. Filter by Tags
    if (filter.tags && filter.tags.length > 0) {
      usedIndexes.push('tag_index');
      const tagCandidateSet = new Set<string>();
      for (const tag of filter.tags) {
        const set = this.tagIndex.get(tag.toLowerCase());
        if (set) {
          for (const id of set) tagCandidateSet.add(id);
        }
      }
      if (candidateIds === null) {
        candidateIds = tagCandidateSet;
      } else {
        // Intersect
        const intersected = new Set<string>();
        for (const id of candidateIds) {
          if (tagCandidateSet.has(id)) intersected.add(id);
        }
        candidateIds = intersected;
      }
    }

    // 3. Filter by Status
    if (filter.status && filter.status.length > 0) {
      usedIndexes.push('status_index');
      const statusCandidates = new Set<string>();
      for (const s of filter.status) {
        const set = this.statusIndex.get(s);
        if (set) {
          for (const id of set) statusCandidates.add(id);
        }
      }
      if (candidateIds === null) {
        candidateIds = statusCandidates;
      } else {
        const intersected = new Set<string>();
        for (const id of candidateIds) {
          if (statusCandidates.has(id)) intersected.add(id);
        }
        candidateIds = intersected;
      }
    }

    // If no indexed candidate sets were used, iterate projections
    const idList = candidateIds !== null ? Array.from(candidateIds) : Array.from(this.projections.keys());

    // 4. Evaluate secondary non-indexed / scalar predicates
    const matchingProjections: CompactResourceProjection[] = [];
    const textQueryLower = filter.textQuery ? filter.textQuery.toLowerCase() : null;

    for (const id of idList) {
      const p = this.projections.get(id);
      if (!p) continue;

      if (filter.trashed !== undefined && !!p.trashed !== filter.trashed) continue;
      if (filter.archived !== undefined && !!p.archived !== filter.archived) continue;
      if (filter.folderId !== undefined && p.folderId !== filter.folderId) continue;
      if (filter.modifiedAfter !== undefined && p.modifiedAt < filter.modifiedAfter) continue;
      if (filter.modifiedBefore !== undefined && p.modifiedAt > filter.modifiedBefore) continue;

      if (textQueryLower) {
        if (!p.title.toLowerCase().includes(textQueryLower)) {
          continue;
        }
      }

      matchingProjections.push(p);
    }

    // 5. Sorting
    const sortBy = filter.sortBy || 'modifiedAt';
    const sortOrder = filter.sortOrder || 'desc';
    matchingProjections.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    const totalMatches = matchingProjections.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const paged = matchingProjections.slice(offset, offset + limit);

    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      matchIds: matchingProjections.map((m) => m.id),
      totalMatches,
      pageProjections: paged,
      executionTimeMs,
      usedIndexes,
    };
  }
}

export const extremeQueryOptimizerV2 = ExtremeQueryOptimizerV2.getInstance();
