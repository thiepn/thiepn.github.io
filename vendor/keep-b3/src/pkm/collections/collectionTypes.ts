import { Note, Folder } from '../../types';
import { PropertyType, PropertyValue } from '../properties/propertyTypes';

export type { PropertyType, PropertyValue };

/**
 * Collection Source Definition
 * Notes dynamically match this source without duplicating content.
 */
export type CollectionSourceType = 'folder' | 'tag' | 'query' | 'notes';

export interface FolderCollectionSource {
  type: 'folder';
  folderId: string | null; // null represents Root or unorganized
  recursive?: boolean;
}

export interface TagCollectionSource {
  type: 'tag';
  tag: string; // e.g. "project" or "book"
}

export interface QueryCollectionSource {
  type: 'query';
  query: string; // Structured query AST expression
}

export interface ExplicitNotesCollectionSource {
  type: 'notes';
  noteIds: string[];
}

export type CollectionSource =
  | FolderCollectionSource
  | TagCollectionSource
  | QueryCollectionSource
  | ExplicitNotesCollectionSource;

/**
 * Property Types Supported within Collections
 * Seamlessly extends P25 Canonical Property Types with Relations, Formulas, Rollups, and System Columns.
 */
export type CollectionPropertyType =
  | 'title' // Canonical note title
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'relation' // References another canonical note
  | 'formula' // Computed same-record deterministic formula
  | 'rollup' // Aggregated value calculated through a relation
  | 'created' // System: note createdAt
  | 'updated' // System: note updatedAt
  | 'folder' // System: note folder
  | 'tags' // System: note tags array
  | 'taskCount' // System: total checklist items
  | 'openTaskCount' // System: unchecked checklist items
  | 'backlinkCount'; // System: incoming backlink references

/**
 * Relation Configuration
 */
export interface RelationConfig {
  targetCollectionId?: string; // Optional constraint to target Collection
  targetFolderId?: string; // Optional constraint to folder
  cardinality: 'single' | 'many';
  inverseName?: string; // Suggested label for reverse relationship (e.g. 'projects')
}

/**
 * Rollup Aggregation Operations
 */
export type RollupOperation =
  | 'count'
  | 'count_non_empty'
  | 'sum'
  | 'average'
  | 'min'
  | 'max'
  | 'earliest'
  | 'latest'
  | 'any'
  | 'all'
  | 'unique_values'
  | 'join';

/**
 * Rollup Configuration
 */
export interface RollupConfig {
  relationPropertyId: string; // The property key of the relation on this note, or '__inverse:<sourcePropKey>'
  targetPropertyId: string; // The property key on the related note to aggregate (or 'title', 'createdAt', etc.)
  operation: RollupOperation;
  delimiter?: string; // for 'join'
  format?: 'plain' | 'currency' | 'percent' | 'decimal';
  precision?: number;
}

/**
 * Formula Configuration
 */
export interface FormulaConfig {
  expression: string; // e.g. `prop("budget") - prop("spent")`
  outputType?: 'number' | 'text' | 'boolean' | 'date';
  format?: 'plain' | 'currency' | 'percent' | 'decimal';
  precision?: number;
}

/**
 * Property Schema Definition within a Collection
 */
export interface CollectionPropertyDefinition {
  id: string; // Property key in YAML (e.g. 'status', 'due', 'client') or system key
  name: string; // Human-friendly display label (e.g. 'Status', 'Due Date', 'Client')
  type: CollectionPropertyType;
  description?: string;
  required?: boolean; // Recommended/data-quality flag (does not block raw markdown save)
  defaultValue?: PropertyValue;
  options?: string[]; // Allowed/suggested select options with colors
  optionColors?: Record<string, string>; // option name -> hex / color class
  relationConfig?: RelationConfig;
  formulaConfig?: FormulaConfig;
  rollupConfig?: RollupConfig;
  isSystem?: boolean; // Read-only derived system property
}

/**
 * Collection Filter Rule
 */
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_before'
  | 'is_after'
  | 'is_checked'
  | 'is_not_checked';

export interface CollectionFilterRule {
  id: string;
  field: string; // Property ID / key
  operator: FilterOperator;
  value?: any;
}

export interface CollectionFilterGroup {
  conjunction: 'and' | 'or';
  rules: CollectionFilterRule[];
  rawQuery?: string; // Optional raw structured query string override
}

/**
 * Collection Sort Rule
 */
export interface CollectionSortRule {
  field: string; // Property ID / key
  direction: 'asc' | 'desc';
}

/**
 * View Types Supported
 */
export type CollectionViewType = 'table' | 'board' | 'gallery' | 'calendar';

/**
 * Collection View Configuration
 */
export interface CollectionView {
  id: string;
  name: string;
  type: CollectionViewType;
  isDefault?: boolean;
  filters: CollectionFilterGroup;
  sorts: CollectionSortRule[];
  visiblePropertyIds: string[]; // Order and visibility of columns
  columnWidths?: Record<string, number>; // propertyId -> width in px
  columnOrder?: string[];

  // Board View Specific Settings
  groupByPropertyId?: string; // Property used for board columns (select, boolean, tag, folder)
  boardCollapsedColumns?: string[]; // Column keys collapsed in UI
  customOrder?: Record<string, string[]>; // columnValue -> noteId[]

  // Gallery View Specific Settings
  galleryCoverProperty?: 'first_image' | 'attachment' | 'none';
  galleryCardSize?: 'small' | 'medium' | 'large';
  galleryVisibleProperties?: string[];

  // Calendar View Specific Settings
  datePropertyId?: string; // Property key used for calendar events (e.g. 'due', 'date')
  calendarMode?: 'month' | 'week';

  // Table Display Settings
  rowHeight?: 'compact' | 'standard' | 'expanded';
  wrapCellText?: boolean;
}

/**
 * Canonical Collection Resource
 */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  source: CollectionSource;
  schema: CollectionPropertyDefinition[];
  views: CollectionView[];
  defaultTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Evaluated Collection Record (Projection of Note for View Rendering)
 * Does NOT duplicate note bodies. Contains note reference and cached derived values.
 */
export interface CollectionRecord {
  note: Note;
  canonicalProperties: Record<string, PropertyValue>;
  derivedValues: Record<string, { value: any; error?: string }>;
  systemValues: {
    createdAtFormatted: string;
    updatedAtFormatted: string;
    folderName: string;
    wordCount: number;
    taskCount: number;
    openTaskCount: number;
    backlinkCount: number;
  };
}

/**
 * Collection Diagnostic / Validation Result
 */
export interface CollectionHealthReport {
  collectionId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  incompatibleProperties: { propertyId: string; message: string }[];
  formulaErrors: { propertyId: string; error: string }[];
  rollupErrors: { propertyId: string; error: string }[];
  danglingRelationsCount: number;
}
