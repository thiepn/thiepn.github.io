/**
 * Property Type Definitions for Phase P25 - Typed Properties
 */

export type PropertyType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'raw';

export type PropertyValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>
  | null
  | undefined;

/**
 * Frontmatter AST Line Node to preserve exact comments, formatting, and unsupported structures
 */
export interface FrontmatterLineNode {
  type: 'kv' | 'array_header' | 'array_item' | 'comment' | 'empty' | 'raw_nested';
  raw: string;
  key?: string;
  value?: unknown;
  arrayItems?: string[];
  comments?: string;
  indent?: string;
}

export interface FrontmatterAST {
  hasFrontmatter: boolean;
  hasSyntaxError: boolean;
  errorMessage?: string;
  errorLine?: number;
  lines: FrontmatterLineNode[];
  rawYaml: string;
  properties: Record<string, unknown>;
  propertyTypes: Record<string, PropertyType>;
  duplicateKeys: string[];
}

/**
 * Global Property Definition derived from the Vault
 */
export interface PropertyDefinition {
  key: string;
  type: PropertyType;
  inferredTypes: PropertyType[];
  usageCount: number;
  commonValues: string[];
  options?: string[]; // Known select options
  hasTypeConflict: boolean;
}

export type PropertyDictionary = Record<string, PropertyDefinition>;

/**
 * Property Editor State for UI
 */
export interface PropertyItemState {
  key: string;
  type: PropertyType;
  value: PropertyValue;
  rawString: string;
  isCustomKey?: boolean;
  error?: string;
}

/**
 * Validation result for property values
 */
export interface PropertyValidationResult {
  isValid: boolean;
  value?: PropertyValue;
  error?: string;
}
