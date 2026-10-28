export type ColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'checkbox'
  | 'formula';

export type AggregationType = 'none' | 'sum' | 'avg' | 'min' | 'max' | 'count';

export interface TableColumn {
  id: string;
  name: string;
  type: ColumnType;
  formula?: string; // e.g. "price * quantity" or "revenue - expenses"
  aggregation?: AggregationType;
  width?: number;
}

export interface TableRow {
  id: string;
  cells: Record<string, any>;
}

export interface ComputationalTable {
  id: string;
  name: string;
  columns: TableColumn[];
  rows: TableRow[];
}

export interface ReactiveVariable {
  name: string;
  rawExpression: string;
  computedValue: number | string | boolean | null;
  error?: string;
  description?: string;
}

export type ComputeScenarioPreset =
  | 'startup-runway'
  | 'compound-interest'
  | 'project-velocity'
  | 'research-statistics';
