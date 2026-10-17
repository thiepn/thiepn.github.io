import {
  UnifiedQueryAST,
  FilterGroup,
  FilterCriterion,
  QueryResult,
  QueryExecutionOptions,
  QueryExplainPlan,
  SortClause,
  GroupClause,
} from './queryTypes';
import { evaluateCriterion, toDateTimestamp, getNestedFieldValue } from './filterOperators';
import { CANONICAL_FIELD_REGISTRY, getFieldMetadata } from './fieldRegistry';

export class UnifiedQueryEngineV2 {
  private queryCache = new Map<string, { result: QueryResult; timestamp: number }>();
  private readonly MAX_CACHE_ENTRIES = 100;
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  public execute<T = any>(
    items: T[],
    query: UnifiedQueryAST,
    options: QueryExecutionOptions = {}
  ): QueryResult<T> {
    const startTime = performance.now();
    const indexesUsed: string[] = [];
    const candidateCount = items.length;

    // Check query cache
    const cacheKey = this.computeCacheKey(query, options, items.length);
    if (!options.bypassCache && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return {
          ...cached.result,
          explain: {
            ...cached.result.explain!,
            cacheHit: true,
          },
        };
      }
    }

    // Step 1: Source / Scope Reduction
    let filtered = items;

    if (query.source) {
      if (query.source.type === 'explicit_set' && query.source.explicitIds) {
        const idSet = new Set(query.source.explicitIds);
        filtered = filtered.filter((it: any) => idSet.has(it.id));
        indexesUsed.push('explicit_id_set');
      } else if (query.source.type === 'resource_type' && query.source.resourceTypes) {
        const typeSet = new Set(query.source.resourceTypes);
        filtered = filtered.filter((it: any) => typeSet.has(it.type));
        indexesUsed.push('type_index');
      }
    }

    // Resource Type filter
    if (query.resourceTypes && query.resourceTypes.length > 0) {
      const typeSet = new Set(query.resourceTypes);
      filtered = filtered.filter((item: any) => typeSet.has(item.type || 'note'));
      if (!indexesUsed.includes('type_index')) indexesUsed.push('type_index');
    }

    // Archived / Trashed status filters
    filtered = filtered.filter((item: any) => {
      if (options.signal?.aborted) return false;
      if (!options.includeArchived && item.archived) return false;
      if (!options.includeTrashed && item.trashed) return false;
      return true;
    });

    // Step 2: Lexical candidate search (Title + Content)
    if (query.textSearch && query.textSearch.trim()) {
      indexesUsed.push('lexical_search');
      const term = query.textSearch.toLowerCase().trim();
      filtered = filtered.filter((item: any) => {
        const titleMatch = typeof item.title === 'string' && item.title.toLowerCase().includes(term);
        const contentMatch =
          typeof item.content === 'string'
            ? item.content.toLowerCase().includes(term)
            : typeof item.metadata?.content === 'string'
            ? item.metadata.content.toLowerCase().includes(term)
            : false;
        const tagMatch = Array.isArray(item.tags)
          ? item.tags.some((t: string) => t.toLowerCase().includes(term))
          : false;
        return titleMatch || contentMatch || tagMatch;
      });
    }

    // Step 3: Structured Filter group evaluation
    if (query.filter && query.filter.criteria.length > 0) {
      indexesUsed.push('filter_predicates');
      filtered = filtered.filter((item: any) => {
        if (options.signal?.aborted) return false;
        return this.evaluateGroup(item, query.filter!, options.contextResourceId);
      });
    }

    const postFilterCount = filtered.length;

    // Step 4: Multi-Sort with Deterministic Tiebreaker
    if (query.sort && query.sort.length > 0) {
      indexesUsed.push('multi_sort');
      filtered.sort((a: any, b: any) => {
        for (const clause of query.sort!) {
          const res = this.compareField(a, b, clause);
          if (res !== 0) return res;
        }
        // Deterministic Tiebreaker: id or title
        const idA = String(a.id || a.title || '');
        const idB = String(b.id || b.title || '');
        return idA.localeCompare(idB);
      });
    }

    // Step 5: Grouping (if requested)
    let groupedItems: Record<string, T[]> | undefined = undefined;
    if (query.group && query.group.field) {
      indexesUsed.push('grouping');
      groupedItems = this.applyGrouping(filtered, query.group);
    }

    // Step 6: Offset & Limit (Pagination)
    const offset = query.offset || options.offset || 0;
    const limit = query.limit || options.limit || filtered.length;
    const pagedItems = filtered.slice(offset, offset + limit);

    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

    const explain: QueryExplainPlan = {
      sourceType: query.source?.type || 'all',
      indexesUsed,
      candidateCount,
      postFilterCount,
      postSortCount: filtered.length,
      executionTimeMs,
      cacheHit: false,
    };

    const finalResult: QueryResult<T> = {
      items: pagedItems,
      totalMatches: postFilterCount,
      executionTimeMs,
      hasMore: offset + limit < postFilterCount,
      explain,
      groupedItems,
    };

    // Store in bounded LRU cache
    if (!options.bypassCache) {
      this.putCache(cacheKey, finalResult);
    }

    return finalResult;
  }

  private evaluateGroup(item: any, group: FilterGroup, contextResourceId?: string): boolean {
    if (!group.criteria || group.criteria.length === 0) return true;

    if (group.conjunction === 'OR') {
      return group.criteria.some((crit) =>
        'conjunction' in crit
          ? this.evaluateGroup(item, crit, contextResourceId)
          : evaluateCriterion(item, crit, contextResourceId)
      );
    }

    // Default AND
    return group.criteria.every((crit) =>
      'conjunction' in crit
        ? this.evaluateGroup(item, crit, contextResourceId)
        : evaluateCriterion(item, crit, contextResourceId)
    );
  }

  private compareField(a: any, b: any, clause: SortClause): number {
    const valA = getNestedFieldValue(a, clause.field);
    const valB = getNestedFieldValue(b, clause.field);

    if (valA === valB) return 0;

    // Missing / Null handling
    if (valA === undefined || valA === null) {
      return clause.nulls === 'first' ? (clause.direction === 'asc' ? -1 : 1) : clause.direction === 'asc' ? 1 : -1;
    }
    if (valB === undefined || valB === null) {
      return clause.nulls === 'first' ? (clause.direction === 'asc' ? 1 : -1) : clause.direction === 'asc' ? -1 : 1;
    }

    // Number comparison
    if (typeof valA === 'number' && typeof valB === 'number') {
      return clause.direction === 'asc' ? valA - valB : valB - valA;
    }

    // Date comparison
    const timeA = toDateTimestamp(valA);
    const timeB = toDateTimestamp(valB);
    if (timeA !== null && timeB !== null) {
      return clause.direction === 'asc' ? timeA - timeB : timeB - timeA;
    }

    // String locale comparison
    const strA = String(valA);
    const strB = String(valB);
    const cmp = strA.localeCompare(strB);
    return clause.direction === 'asc' ? cmp : -cmp;
  }

  private applyGrouping<T = any>(items: T[], group: GroupClause): Record<string, T[]> {
    const groups: Record<string, T[]> = {};

    for (const item of items) {
      const val = getNestedFieldValue(item, group.field);
      let groupKey = 'Uncategorized';

      if (val !== undefined && val !== null) {
        if (group.granularity && group.granularity !== 'raw') {
          const ts = toDateTimestamp(val);
          if (ts !== null) {
            const d = new Date(ts);
            if (group.granularity === 'day') {
              groupKey = d.toISOString().split('T')[0];
            } else if (group.granularity === 'month') {
              groupKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            } else if (group.granularity === 'year') {
              groupKey = String(d.getFullYear());
            } else if (group.granularity === 'week') {
              const startOfWeek = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
              groupKey = `Week of ${startOfWeek.toISOString().split('T')[0]}`;
            }
          } else {
            groupKey = String(val);
          }
        } else if (Array.isArray(val)) {
          groupKey = val.length > 0 ? String(val[0]) : 'None';
        } else {
          groupKey = String(val);
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    }

    return groups;
  }

  public invalidateCache(): void {
    this.queryCache.clear();
  }

  private computeCacheKey(query: UnifiedQueryAST, options: QueryExecutionOptions, count: number): string {
    return `${JSON.stringify(query)}_${options.includeArchived}_${options.includeTrashed}_${options.contextResourceId}_${count}`;
  }

  private putCache(key: string, result: QueryResult): void {
    if (this.queryCache.size >= this.MAX_CACHE_ENTRIES) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) this.queryCache.delete(oldestKey);
    }
    this.queryCache.set(key, { result, timestamp: Date.now() });
  }

  /**
   * Helper to parse legacy filter strings or saved searches into UnifiedQueryAST
   */
  public parseLegacyQuery(queryString: string): UnifiedQueryAST {
    const ast: UnifiedQueryAST = {
      version: 2,
      filter: {
        conjunction: 'AND',
        criteria: [],
      },
    };

    const tokens = queryString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const textTerms: string[] = [];

    for (const token of tokens) {
      if (token.startsWith('#')) {
        const tag = token.substring(1).replace(/"/g, '');
        ast.filter!.criteria.push({
          field: 'tags',
          operator: 'has_tag',
          value: tag,
        });
      } else if (token.startsWith('is:pinned') || token.startsWith('pinned:true')) {
        ast.filter!.criteria.push({
          field: 'pinned',
          operator: 'is_true',
        });
      } else if (token.startsWith('is:archived') || token.startsWith('archived:true')) {
        ast.filter!.criteria.push({
          field: 'archived',
          operator: 'is_true',
        });
      } else if (token.startsWith('is:locked') || token.startsWith('locked:true')) {
        ast.filter!.criteria.push({
          field: 'isLocked',
          operator: 'is_true',
        });
      } else if (token.startsWith('type:')) {
        const typeVal = token.split(':')[1].replace(/"/g, '') as any;
        ast.resourceTypes = [typeVal];
      } else if (token.startsWith('sort:')) {
        const field = token.split(':')[1].replace(/"/g, '');
        ast.sort = [{ field, direction: 'asc' }];
      } else if (token.startsWith('order:')) {
        const dir = token.split(':')[1].replace(/"/g, '').toLowerCase() as 'asc' | 'desc';
        if (ast.sort && ast.sort.length > 0) {
          ast.sort[0].direction = dir;
        }
      } else if (token.startsWith('limit:')) {
        ast.limit = parseInt(token.split(':')[1], 10) || undefined;
      } else if (token.includes(':')) {
        const [field, val] = token.split(':');
        const cleanVal = val.replace(/"/g, '');
        ast.filter!.criteria.push({
          field,
          operator: 'equals',
          value: cleanVal,
        });
      } else {
        textTerms.push(token.replace(/"/g, ''));
      }
    }

    if (textTerms.length > 0) {
      ast.textSearch = textTerms.join(' ');
    }

    return ast;
  }

  /**
   * AI Query Construction: Natural Language to Structured Query Proposal
   * Proposal-only: strictly returns validated AST for user review/approval before execution.
   */
  public proposeQueryFromNaturalLanguage(prompt: string): { ast: UnifiedQueryAST; explanation: string } {
    const lower = prompt.toLowerCase();
    const criteria: FilterCriterion[] = [];
    const resourceTypes: any[] = [];
    const explanations: string[] = [];

    // Target resource types
    if (lower.includes('task') || lower.includes('todo')) {
      resourceTypes.push('task');
      explanations.push('Type: Task');
    }
    if (lower.includes('project')) {
      resourceTypes.push('project');
      explanations.push('Type: Project');
    }
    if (lower.includes('book') || lower.includes('reading')) {
      resourceTypes.push('book');
      explanations.push('Type: Book');
    }
    if (lower.includes('asset') || lower.includes('equipment')) {
      resourceTypes.push('asset');
      explanations.push('Type: Asset');
    }
    if (lower.includes('decision')) {
      resourceTypes.push('decision');
      explanations.push('Type: Decision');
    }
    if (lower.includes('person') || lower.includes('people') || lower.includes('contact')) {
      resourceTypes.push('person');
      explanations.push('Type: Person');
    }

    // Status / Temporal conditions
    if (lower.includes('open') || lower.includes('active') || lower.includes('in progress')) {
      criteria.push({
        field: 'status',
        operator: 'in',
        value: ['todo', 'in_progress', 'active', 'open'],
      });
      explanations.push('Status: Active / Open / In Progress');
    }

    if (lower.includes('done') || lower.includes('completed') || lower.includes('resolved')) {
      criteria.push({
        field: 'status',
        operator: 'in',
        value: ['done', 'completed', 'resolved'],
      });
      explanations.push('Status: Completed / Done');
    }

    if (lower.includes('due this week') || lower.includes('this week')) {
      criteria.push({
        field: 'dueDate',
        operator: 'is_this_week',
      });
      explanations.push('Due Date: This Week');
    } else if (lower.includes('due today') || lower.includes('today')) {
      criteria.push({
        field: 'dueDate',
        operator: 'is_today',
      });
      explanations.push('Due Date: Today');
    }

    if (lower.includes('urgent') || lower.includes('high priority')) {
      criteria.push({
        field: 'priority',
        operator: 'in',
        value: ['high', 'urgent'],
      });
      explanations.push('Priority: High / Urgent');
    }

    if (lower.includes('maintenance due') || lower.includes('maintenance')) {
      criteria.push({
        field: 'maintenanceDueDate',
        operator: 'is_this_month',
      });
      explanations.push('Maintenance Due: This Month');
    }

    if (lower.includes('review due') || lower.includes('review')) {
      criteria.push({
        field: 'reviewDate',
        operator: 'is_on_or_before',
        relativeDate: 'today',
      });
      explanations.push('Review Date: On or before today');
    }

    const ast: UnifiedQueryAST = {
      version: 2,
      resourceTypes: resourceTypes.length > 0 ? resourceTypes : undefined,
      filter: {
        conjunction: 'AND',
        criteria,
      },
    };

    return {
      ast,
      explanation: explanations.length > 0 ? explanations.join(' AND ') : 'All matching items',
    };
  }
}

export const unifiedQueryEngineV2 = new UnifiedQueryEngineV2();
