import { MarkdownTable, TableAlignment } from './tableTypes';
import { parseNumericValue } from './tableParser';

/**
 * Creates a brand new default MarkdownTable (e.g. 3 rows x 3 columns)
 */
export function createDefaultTable(
  rowCount = 3,
  colCount = 3,
  headers?: string[]
): MarkdownTable {
  const finalHeaders: string[] = [];
  const alignments: TableAlignment[] = [];
  for (let c = 0; c < colCount; c++) {
    finalHeaders.push(headers?.[c] || `Header ${c + 1}`);
    alignments.push('default');
  }

  const rows: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const row: string[] = [];
    for (let c = 0; c < colCount; c++) {
      row.push('');
    }
    rows.push(row);
  }

  return {
    id: `table-new-${Date.now()}-${colCount}x${rowCount}`,
    headers: finalHeaders,
    alignments,
    rows,
    startLine: 0,
    endLine: rowCount + 1,
    rawSource: '',
  };
}

/**
 * Updates a cell value in a MarkdownTable.
 * Pass rowIndex = -1 to update the header of colIndex.
 */
export function updateCell(
  table: MarkdownTable,
  rowIndex: number,
  colIndex: number,
  value: string
): MarkdownTable {
  if (colIndex < 0 || colIndex >= table.headers.length) {
    return table;
  }

  // Header update
  if (rowIndex === -1) {
    const newHeaders = [...table.headers];
    newHeaders[colIndex] = value;
    return {
      ...table,
      headers: newHeaders,
    };
  }

  if (rowIndex < 0 || rowIndex >= table.rows.length) {
    return table;
  }

  const newRows = table.rows.map((row, r) => {
    if (r !== rowIndex) return row;
    const newRow = [...row];
    newRow[colIndex] = value;
    return newRow;
  });

  return {
    ...table,
    rows: newRows,
  };
}

/**
 * Adds a new row at the given index (or at the end if omitted)
 */
export function addRow(
  table: MarkdownTable,
  atIndex?: number,
  initialValues?: string[]
): MarkdownTable {
  const colCount = table.headers.length;
  const newRow: string[] = Array.from(
    { length: colCount },
    (_, i) => initialValues?.[i] || ''
  );

  const insertIndex =
    atIndex === undefined || atIndex < 0 || atIndex > table.rows.length
      ? table.rows.length
      : atIndex;

  const newRows = [
    ...table.rows.slice(0, insertIndex),
    newRow,
    ...table.rows.slice(insertIndex),
  ];

  return {
    ...table,
    rows: newRows,
  };
}

/**
 * Deletes a row at the given index
 */
export function deleteRow(
  table: MarkdownTable,
  rowIndex: number
): MarkdownTable {
  if (rowIndex < 0 || rowIndex >= table.rows.length) {
    return table;
  }

  const newRows = table.rows.filter((_, r) => r !== rowIndex);

  return {
    ...table,
    rows: newRows,
  };
}

/**
 * Moves a row from one index to another
 */
export function moveRow(
  table: MarkdownTable,
  fromIndex: number,
  toIndex: number
): MarkdownTable {
  if (
    fromIndex < 0 ||
    fromIndex >= table.rows.length ||
    toIndex < 0 ||
    toIndex >= table.rows.length ||
    fromIndex === toIndex
  ) {
    return table;
  }

  const newRows = [...table.rows];
  const [moved] = newRows.splice(fromIndex, 1);
  newRows.splice(toIndex, 0, moved);

  return {
    ...table,
    rows: newRows,
  };
}

/**
 * Adds a new column at the given index (or at the end if omitted)
 */
export function addColumn(
  table: MarkdownTable,
  atIndex?: number,
  headerName?: string,
  alignment: TableAlignment = 'default'
): MarkdownTable {
  const insertIndex =
    atIndex === undefined || atIndex < 0 || atIndex > table.headers.length
      ? table.headers.length
      : atIndex;

  const newColName = headerName || `Col ${table.headers.length + 1}`;

  const newHeaders = [
    ...table.headers.slice(0, insertIndex),
    newColName,
    ...table.headers.slice(insertIndex),
  ];

  const newAlignments = [
    ...table.alignments.slice(0, insertIndex),
    alignment,
    ...table.alignments.slice(insertIndex),
  ];

  const newRows = table.rows.map((row) => [
    ...row.slice(0, insertIndex),
    '',
    ...row.slice(insertIndex),
  ]);

  // Adjust calcMode map if present
  let newCalcMode = table.calcMode;
  if (newCalcMode) {
    const updated: Record<number, any> = {};
    for (const [k, v] of Object.entries(newCalcMode)) {
      const col = parseInt(k, 10);
      if (col < insertIndex) {
        updated[col] = v;
      } else {
        updated[col + 1] = v;
      }
    }
    newCalcMode = updated;
  }

  return {
    ...table,
    headers: newHeaders,
    alignments: newAlignments,
    rows: newRows,
    calcMode: newCalcMode,
  };
}

/**
 * Deletes a column at the given index (minimum 1 column preserved)
 */
export function deleteColumn(
  table: MarkdownTable,
  colIndex: number
): MarkdownTable {
  if (
    colIndex < 0 ||
    colIndex >= table.headers.length ||
    table.headers.length <= 1
  ) {
    return table;
  }

  const newHeaders = table.headers.filter((_, c) => c !== colIndex);
  const newAlignments = table.alignments.filter((_, c) => c !== colIndex);
  const newRows = table.rows.map((row) => row.filter((_, c) => c !== colIndex));

  // Adjust calcMode map
  let newCalcMode = table.calcMode;
  if (newCalcMode) {
    const updated: Record<number, any> = {};
    for (const [k, v] of Object.entries(newCalcMode)) {
      const col = parseInt(k, 10);
      if (col < colIndex) {
        updated[col] = v;
      } else if (col > colIndex) {
        updated[col - 1] = v;
      }
    }
    newCalcMode = updated;
  }

  return {
    ...table,
    headers: newHeaders,
    alignments: newAlignments,
    rows: newRows,
    calcMode: newCalcMode,
  };
}

/**
 * Moves a column from one index to another
 */
export function moveColumn(
  table: MarkdownTable,
  fromIndex: number,
  toIndex: number
): MarkdownTable {
  if (
    fromIndex < 0 ||
    fromIndex >= table.headers.length ||
    toIndex < 0 ||
    toIndex >= table.headers.length ||
    fromIndex === toIndex
  ) {
    return table;
  }

  const newHeaders = [...table.headers];
  const [movedHeader] = newHeaders.splice(fromIndex, 1);
  newHeaders.splice(toIndex, 0, movedHeader);

  const newAlignments = [...table.alignments];
  const [movedAlign] = newAlignments.splice(fromIndex, 1);
  newAlignments.splice(toIndex, 0, movedAlign);

  const newRows = table.rows.map((row) => {
    const copy = [...row];
    const [movedCell] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, movedCell);
    return copy;
  });

  return {
    ...table,
    headers: newHeaders,
    alignments: newAlignments,
    rows: newRows,
  };
}

/**
 * Sets alignment for a specific column
 */
export function setColumnAlignment(
  table: MarkdownTable,
  colIndex: number,
  alignment: TableAlignment
): MarkdownTable {
  if (colIndex < 0 || colIndex >= table.headers.length) {
    return table;
  }

  const newAlignments = [...table.alignments];
  newAlignments[colIndex] = alignment;

  return {
    ...table,
    alignments: newAlignments,
  };
}

/**
 * Sorts table rows by a given column index in ascending or descending order.
 * Intelligently distinguishes numeric vs alphabetical comparison.
 */
export function sortTable(
  table: MarkdownTable,
  colIndex: number,
  direction: 'asc' | 'desc'
): MarkdownTable {
  if (colIndex < 0 || colIndex >= table.headers.length) {
    return table;
  }

  // Check if column is predominantly numeric
  const numericValues = table.rows.map((row) => parseNumericValue(row[colIndex] || ''));
  const numericCount = numericValues.filter((v) => v !== null).length;
  const isNumeric = numericCount > 0 && numericCount >= Math.ceil(table.rows.length * 0.5);

  const indexedRows = table.rows.map((row, index) => ({ row, index }));

  indexedRows.sort((a, b) => {
    const valA = (a.row[colIndex] || '').trim();
    const valB = (b.row[colIndex] || '').trim();

    // Empty values always go to bottom regardless of direction
    if (!valA && valB) return 1;
    if (valA && !valB) return -1;
    if (!valA && !valB) return a.index - b.index;

    if (isNumeric) {
      const numA = parseNumericValue(valA);
      const numB = parseNumericValue(valB);

      if (numA !== null && numB !== null) {
        if (numA < numB) return direction === 'asc' ? -1 : 1;
        if (numA > numB) return direction === 'asc' ? 1 : -1;
        return a.index - b.index;
      }
    }

    // Alphabetical comparison (case-insensitive, localized)
    const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) {
      return direction === 'asc' ? cmp : -cmp;
    }

    return a.index - b.index;
  });

  return {
    ...table,
    rows: indexedRows.map((item) => item.row),
  };
}

/**
 * Robust CSV/TSV parser supporting RFC 4180 quoted strings, commas/tabs, escaped quotes (""), and multiline records
 */
export function parseCSVText(csvText: string): { headers: string[]; rows: string[][] } {
  const clean = csvText.trim();
  if (!clean) return { headers: [], rows: [] };

  // Detect delimiter: tab or comma by analyzing first non-empty line
  const firstLine = clean.split(/\r?\n/)[0] || '';
  const delimiter = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }

      if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      }

      if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }

      if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }

      currentField += char;
      i++;
    }
  }

  // Push remaining field & row
  currentRow.push(currentField.trim());
  if (currentRow.some((c) => c.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const maxCols = Math.max(...rows.map((r) => r.length));
  if (maxCols === 0) return { headers: [], rows: [] };

  // Pad all rows to maxCols
  const padded = rows.map((r) => {
    if (r.length < maxCols) {
      return [...r, ...Array(maxCols - r.length).fill('')];
    }
    return r;
  });

  const rawHeaders = padded[0] || [];
  const headers = rawHeaders.map((h, idx) => (h && h.length > 0 ? h : `Header ${idx + 1}`));
  const bodyRows = padded.slice(1);

  return { headers, rows: bodyRows };
}

/**
 * Converts CSV or TSV text into a MarkdownTable
 */
export function convertCSVToMarkdownTable(csvText: string): MarkdownTable | null {
  const parsed = parseCSVText(csvText);
  if (parsed.headers.length === 0) return null;

  const alignments: TableAlignment[] = Array.from(
    { length: parsed.headers.length },
    () => 'default'
  );

  return {
    id: `table-imported-${Date.now()}`,
    headers: parsed.headers,
    alignments,
    rows: parsed.rows.length > 0 ? parsed.rows : [Array.from({ length: parsed.headers.length }, () => '')],
    startLine: 0,
    endLine: parsed.rows.length + 1,
    rawSource: '',
  };
}

/**
 * Appends rows from a CSV/TSV text to an existing MarkdownTable.
 * Matches columns by width or pads/truncates as necessary.
 */
export function appendRowsFromCSV(
  table: MarkdownTable,
  csvText: string,
  hasHeaderRow = true
): MarkdownTable | null {
  const parsed = parseCSVText(csvText);
  if (parsed.headers.length === 0) return null;

  const rowsToAppend = hasHeaderRow ? parsed.rows : [parsed.headers, ...parsed.rows];
  if (rowsToAppend.length === 0) return table;

  const colCount = table.headers.length;
  const normalizedNewRows: string[][] = rowsToAppend.map((r) => {
    return Array.from({ length: colCount }, (_, c) => r[c] || '');
  });

  return {
    ...table,
    rows: [...table.rows, ...normalizedNewRows],
  };
}

/**
 * Serializes a MarkdownTable into RFC 4180 CSV string
 */
export function serializeTableToCSV(table: MarkdownTable): string {
  const escapeField = (val: string): string => {
    const str = val || '';
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = table.headers.map(escapeField).join(',');
  const bodyLines = table.rows.map((r) =>
    Array.from({ length: table.headers.length }, (_, c) => escapeField(r[c] || '')).join(',')
  );

  return [headerLine, ...bodyLines].join('\n');
}

/**
 * Initiates a browser file download of the table in CSV format
 */
export function downloadTableAsCSV(table: MarkdownTable, filename = 'table.csv'): void {
  const csvContent = serializeTableToCSV(table);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
