import { Note, NotePriority, NoteStatus, NoteColorKey, Folder } from '../types';
import { VaultIndex } from './types';

export type SmartQueryViewMode = 'list' | 'table' | 'cards';

export type QuerySortField =
  | 'title'
  | 'updated'
  | 'created'
  | 'priority'
  | 'status'
  | 'links'
  | 'backlinks'
  | 'folder'
  | 'checklist';

export type QuerySortOrder = 'asc' | 'desc';

export type QueryFieldKey =
  | 'folder'
  | 'tag'
  | 'title'
  | 'status'
  | 'priority'
  | 'created'
  | 'updated'
  | 'has'
  | 'text'
  | 'type'
  | 'color'
  | 'is';

export interface DateComparison {
  operator: '>' | '<' | '>=' | '<=' | '=';
  date: Date;
  rawSpec: string;
}

export type QueryLeafClause =
  | {
      type: 'field';
      field: QueryFieldKey;
      value: string;
      negated?: boolean;
      dateComparison?: DateComparison;
    }
  | {
      type: 'text';
      value: string;
      negated?: boolean;
    };

export type QueryClause =
  | QueryLeafClause
  | {
      type: 'and';
      clauses: QueryClause[];
    }
  | {
      type: 'or';
      clauses: QueryClause[];
    }
  | {
      type: 'not';
      clause: QueryClause;
    };

export interface QueryModifiers {
  sort?: QuerySortField;
  order?: QuerySortOrder;
  limit?: number;
  view?: SmartQueryViewMode;
}

export interface QueryAST {
  rootClause: QueryClause | null;
  modifiers: QueryModifiers;
  rawQuery: string;
}

export interface QuerySyntaxError {
  message: string;
  line: number;
  column: number;
  offset: number;
  token?: string;
  suggestion?: string;
}

export interface ParseQueryResult {
  ast: QueryAST | null;
  error: QuerySyntaxError | null;
}

export interface QueryItemResult {
  note: Note;
  folderName: string | null;
  backlinkCount: number;
  forwardLinkCount: number;
  matchedSnippet?: string;
  checklistStats?: {
    total: number;
    completed: number;
    percent: number;
  };
}

export interface QueryEvaluationResult {
  items: QueryItemResult[];
  totalMatches: number;
  modifiers: QueryModifiers;
  executionTimeMs: number;
  error?: string;
}

export interface SavedSmartView {
  id: string;
  name: string;
  query: string;
  icon?: string;
  color?: string;
  description?: string;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt?: string;
}
