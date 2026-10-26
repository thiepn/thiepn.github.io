import { ResourceType } from '../resource/resourceCore';

export type UnifiedQueryFilterOperator =
  // Text
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  // Number
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'between'
  // Boolean
  | 'is_true'
  | 'is_false'
  // Date & Time (DateOnly / DateTime aware)
  | 'before'
  | 'after'
  | 'is_on'
  | 'is_on_or_before'
  | 'is_on_or_after'
  | 'is_between'
  | 'is_today'
  | 'is_this_week'
  | 'is_this_month'
  | 'in_next_days'
  | 'in_past_days'
  // Select & Multi-select / Tags
  | 'in'
  | 'not_in'
  | 'contains_any'
  | 'contains_all'
  | 'contains_none'
  | 'has_tag'
  // Relations (stable resource IDs via ConnectionIndexV2)
  | 'is_related_to'
  | 'is_not_related_to'
  | 'has_relation'
  | 'has_no_relation'
  // Wikilinks
  | 'links_to'
  | 'linked_from'
  // Regex
  | 'matches_regex';

export type V2FilterOperator = UnifiedQueryFilterOperator;

export type RelativeDateExpression =
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | 'this_week'
  | 'next_week'
  | 'this_month'
  | 'past_7_days'
  | 'next_30_days';

export interface FilterCriterion {
  field: string;
  operator: UnifiedQueryFilterOperator;
  value?: any;
  relativeDate?: RelativeDateExpression;
  dateRange?: [string | number, string | number];
  error?: string; // Broken field/operator warning indicator
}

export interface FilterGroup {
  conjunction: 'AND' | 'OR';
  criteria: Array<FilterCriterion | FilterGroup>;
}

export interface SortClause {
  field: string;
  direction: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

export interface GroupClause {
  field: string;
  granularity?: 'day' | 'week' | 'month' | 'year' | 'raw';
}

export type ResourceQuerySourceType =
  | 'all'
  | 'resource_type'
  | 'module'
  | 'collection'
  | 'current_context'
  | 'explicit_set'
  | 'folder'
  | 'tag'
  | 'saved_view';

export interface ResourceQuerySource {
  type: ResourceQuerySourceType;
  resourceTypes?: ResourceType[];
  moduleId?: string;
  collectionId?: string;
  contextResourceId?: string;
  explicitIds?: string[];
  folderId?: string;
  tag?: string;
  savedViewId?: string;
}

export interface UnifiedQueryAST {
  version: 2;
  source?: ResourceQuerySource;
  resourceTypes?: ResourceType[];
  filter?: FilterGroup;
  textSearch?: string;
  sort?: SortClause[];
  group?: GroupClause;
  limit?: number;
  offset?: number;
  parameters?: Record<string, any>; // Dynamic placeholders like {{current_context}}
}

export interface QueryExecutionOptions {
  includeArchived?: boolean;
  includeTrashed?: boolean;
  limit?: number;
  offset?: number;
  contextResourceId?: string;
  userTimezone?: string;
  bypassCache?: boolean;
  signal?: AbortSignal;
}

export interface QueryExplainPlan {
  sourceType: ResourceQuerySourceType;
  indexesUsed: string[];
  candidateCount: number;
  postFilterCount: number;
  postSortCount: number;
  executionTimeMs: number;
  cacheHit: boolean;
  warnings?: string[];
}

export interface QueryResult<T = any> {
  items: T[];
  totalMatches: number;
  executionTimeMs: number;
  hasMore: boolean;
  explain?: QueryExplainPlan;
  groupedItems?: Record<string, T[]>;
}
