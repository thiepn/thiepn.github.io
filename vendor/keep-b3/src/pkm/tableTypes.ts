export type TableAlignment = 'left' | 'center' | 'right' | 'default';

export type TableCalculationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';

export interface ColumnStats {
  columnIndex: number;
  header: string;
  isNumeric: boolean;
  totalCount: number;
  nonEmptyCount: number;
  numericCount: number;
  sum: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
}

export interface MarkdownTable {
  id: string;
  headers: string[];
  alignments: TableAlignment[];
  rows: string[][];
  startLine: number;
  endLine: number;
  rawSource: string;
  calcMode?: Record<number, TableCalculationType>; // Column index -> Calculation type
}

export interface TableSortState {
  columnIndex: number | null;
  direction: 'asc' | 'desc' | null;
  isTemporary: boolean; // true = preview only, false = committed to source
}

export interface TableHistoryEntry {
  table: MarkdownTable;
  timestamp: number;
  description: string;
}
