import { MarkdownTable, TableAlignment, ColumnStats, TableCalculationType } from './tableTypes';

/**
 * Escapes pipe characters for Markdown table cell serialization
 */
export function escapeTableCell(cellText: string): string {
  if (!cellText) return '';
  // Replace newlines with <br> or space, and unescaped pipes with \|
  const withoutNewlines = cellText.replace(/\r?\n/g, '<br>');
  // Escape pipes that are not already preceded by a backslash
  return withoutNewlines.replace(/(?<!\\)\|/g, '\\|');
}

/**
 * Unescapes pipe characters and <br> for editing in visual table cells
 */
export function unescapeTableCell(cellText: string): string {
  if (!cellText) return '';
  return cellText
    .replace(/\\\|/g, '|')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();
}

/**
 * Splits a single Markdown table row into cell strings,
 * respecting escaped pipes (\|) and inline code (`...`).
 */
export function splitTableRow(rowLine: string): string[] {
  let line = rowLine.trim();

  // Strip leading and trailing pipe if present
  if (line.startsWith('|')) {
    line = line.slice(1);
  }
  if (line.endsWith('|') && !line.endsWith('\\|')) {
    line = line.slice(0, -1);
  }

  const cells: string[] = [];
  let current = '';
  let inCode = false;
  let isEscaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (isEscaped) {
      current += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      current += char;
      isEscaped = true;
      continue;
    }

    if (char === '`') {
      inCode = !inCode;
      current += char;
      continue;
    }

    if (char === '|' && !inCode) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

/**
 * Validates whether a line is a valid Markdown table delimiter row (e.g. |:---|:---:|---:|)
 */
export function isDelimiterRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Delimiter line must contain only |, -, :, and spaces
  if (!/^[|\-:\s]+$/.test(trimmed)) {
    return false;
  }

  const cells = splitTableRow(trimmed);
  if (cells.length === 0) return false;

  // Every cell must have at least one hyphen and only valid alignment chars
  return cells.every((cell) => {
    const c = cell.trim();
    if (!c.includes('-')) return false;
    return /^:?-+:?$/.test(c);
  });
}

/**
 * Parses alignment from a delimiter cell
 */
export function parseAlignment(cell: string): TableAlignment {
  const c = cell.trim();
  const leftColon = c.startsWith(':');
  const rightColon = c.endsWith(':');

  if (leftColon && rightColon) return 'center';
  if (leftColon) return 'left';
  if (rightColon) return 'right';
  return 'default';
}

/**
 * Serializes an alignment to delimiter representation
 */
export function serializeAlignment(align: TableAlignment, minWidth = 3): string {
  const width = Math.max(minWidth, 3);
  switch (align) {
    case 'left':
      return `:${'-'.repeat(Math.max(1, width - 1))}`;
    case 'center':
      return `:${'-'.repeat(Math.max(1, width - 2))}:`;
    case 'right':
      return `${'-'.repeat(Math.max(1, width - 1))}:`;
    case 'default':
    default:
      return '-'.repeat(width);
  }
}

/**
 * Parses a single Markdown table string into a structured MarkdownTable object
 */
export function parseMarkdownTable(
  tableMarkdown: string,
  startLine = 0
): MarkdownTable | null {
  const lines = tableMarkdown.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  // Line 0: Headers
  const headerLine = lines[0];
  if (!headerLine.includes('|')) return null;

  // Line 1: Delimiter
  const delimiterLine = lines[1];
  if (!isDelimiterRow(delimiterLine)) return null;

  const rawHeaders = splitTableRow(headerLine);
  const delimiterCells = splitTableRow(delimiterLine);

  const columnCount = Math.max(rawHeaders.length, delimiterCells.length);
  if (columnCount === 0) return null;

  const headers: string[] = [];
  const alignments: TableAlignment[] = [];

  for (let c = 0; c < columnCount; c++) {
    headers.push(unescapeTableCell(rawHeaders[c] || `Column ${c + 1}`));
    alignments.push(parseAlignment(delimiterCells[c] || '---'));
  }

  const rows: string[][] = [];
  for (let r = 2; r < lines.length; r++) {
    const rowLine = lines[r];
    const rowCells = splitTableRow(rowLine);
    const parsedRow: string[] = [];
    for (let c = 0; c < columnCount; c++) {
      parsedRow.push(unescapeTableCell(rowCells[c] || ''));
    }
    rows.push(parsedRow);
  }

  const endLine = startLine + lines.length - 1;
  const id = `table-${startLine}-${endLine}-${columnCount}x${rows.length}`;

  return {
    id,
    headers,
    alignments,
    rows,
    startLine,
    endLine,
    rawSource: lines.join('\n'),
  };
}

/**
 * Extracts all valid Markdown tables from a full markdown document,
 * skipping code fences, math blocks, and inline code.
 */
export function extractMarkdownTables(markdown: string): MarkdownTable[] {
  if (!markdown || typeof markdown !== 'string') return [];

  const lines = markdown.split(/\r?\n/);
  const tables: MarkdownTable[] = [];

  let inFencedCode = false;
  let inMathBlock = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check fenced code blocks (``` or ~~~)
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFencedCode = !inFencedCode;
      i++;
      continue;
    }
    if (inFencedCode) {
      i++;
      continue;
    }

    // Check math blocks ($$)
    if (trimmed.startsWith('$$')) {
      if (trimmed.length > 2 && trimmed.endsWith('$$')) {
        // single-line math block
      } else {
        inMathBlock = !inMathBlock;
      }
      i++;
      continue;
    }
    if (inMathBlock) {
      i++;
      continue;
    }

    // Check if current line could be the start of a table
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isDelimiterRow(lines[i + 1])
    ) {
      const startLine = i;
      const tableLines: string[] = [line, lines[i + 1]];
      i += 2;

      // Collect data rows
      while (i < lines.length) {
        const rowLine = lines[i];
        const rowTrim = rowLine.trim();

        if (!rowTrim || !rowTrim.includes('|') || isDelimiterRow(rowTrim)) {
          break;
        }
        tableLines.push(rowLine);
        i++;
      }

      const tableMd = tableLines.join('\n');
      const table = parseMarkdownTable(tableMd, startLine);
      if (table) {
        tables.push(table);
      }
      continue;
    }

    i++;
  }

  return tables;
}

/**
 * Serializes a MarkdownTable object back into canonical, clean Markdown format
 */
export function serializeMarkdownTable(
  table: MarkdownTable,
  options: { prettyAlign?: boolean } = { prettyAlign: true }
): string {
  const columnCount = table.headers.length;
  if (columnCount === 0) return '';

  // Calculate column widths for clean alignment
  const colWidths: number[] = [];
  for (let c = 0; c < columnCount; c++) {
    const headerEscaped = escapeTableCell(table.headers[c] || '');
    let maxW = Math.max(headerEscaped.length, 3);

    for (const row of table.rows) {
      const cellEscaped = escapeTableCell(row[c] || '');
      maxW = Math.max(maxW, cellEscaped.length);
    }
    colWidths.push(options.prettyAlign ? Math.max(maxW, 3) : 3);
  }

  const outputLines: string[] = [];

  // 1. Header row
  const headerCells = table.headers.map((h, c) => {
    const escaped = escapeTableCell(h);
    return options.prettyAlign
      ? formatCellWithPadding(escaped, colWidths[c], table.alignments[c] || 'default')
      : escaped;
  });
  outputLines.push(`| ${headerCells.join(' | ')} |`);

  // 2. Delimiter row
  const delimiterCells = table.alignments.map((align, c) => {
    return serializeAlignment(align || 'default', colWidths[c]);
  });
  outputLines.push(`| ${delimiterCells.join(' | ')} |`);

  // 3. Body rows
  for (const row of table.rows) {
    const cells = Array.from({ length: columnCount }, (_, c) => {
      const val = row[c] || '';
      const escaped = escapeTableCell(val);
      return options.prettyAlign
        ? formatCellWithPadding(escaped, colWidths[c], table.alignments[c] || 'default')
        : escaped;
    });
    outputLines.push(`| ${cells.join(' | ')} |`);
  }

  return outputLines.join('\n');
}

/**
 * Formats a cell string with whitespace padding according to alignment
 */
function formatCellWithPadding(
  text: string,
  width: number,
  align: TableAlignment
): string {
  const padNeeded = Math.max(0, width - text.length);
  switch (align) {
    case 'right':
      return ' '.repeat(padNeeded) + text;
    case 'center': {
      const leftPad = Math.floor(padNeeded / 2);
      const rightPad = padNeeded - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    }
    case 'left':
    case 'default':
    default:
      return text + ' '.repeat(padNeeded);
  }
}

/**
 * Replaces a table within the original markdown document by line ranges or source match
 */
export function replaceTableInMarkdown(
  originalMarkdown: string,
  table: MarkdownTable,
  newTableMarkdown: string
): string {
  if (!originalMarkdown || typeof originalMarkdown !== 'string') return '';
  const lines = originalMarkdown.split(/\r?\n/);

  // If startLine and endLine match and the source matches closely
  if (
    table.startLine >= 0 &&
    table.endLine < lines.length &&
    table.startLine <= table.endLine
  ) {
    const existingSlice = lines.slice(table.startLine, table.endLine + 1).join('\n');
    // Sanity check if it contains pipes
    if (existingSlice.includes('|')) {
      const before = lines.slice(0, table.startLine);
      const after = lines.slice(table.endLine + 1);
      const newLines = newTableMarkdown.split('\n');
      return [...before, ...newLines, ...after].join('\n');
    }
  }

  // Fallback: substring replacement with rawSource
  if (table.rawSource && originalMarkdown.includes(table.rawSource)) {
    return originalMarkdown.replace(table.rawSource, newTableMarkdown);
  }

  return originalMarkdown;
}

/**
 * Parses numeric value from cell text, handling currency, percentage, commas, and negative signs.
 * Returns null if not numeric.
 */
export function parseNumericValue(text: string): number | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Clean common currency symbols, commas, spaces, percentages
  // Handles "$1,234.50", "-€500", "85%", "(1,000)" [accounting negative], etc.
  let clean = trimmed
    .replace(/^[\$€£¥₹]/, '')
    .replace(/[\$€£¥₹%]/g, '')
    .replace(/,/g, '')
    .trim();

  // Accounting negative notation: (100) -> -100
  if (clean.startsWith('(') && clean.endsWith(')')) {
    clean = '-' + clean.slice(1, -1).trim();
  }

  // Check if valid numeric
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(clean)) {
    return null;
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Computes lightweight summary statistics for a given column
 */
export function computeColumnStats(
  table: MarkdownTable,
  colIndex: number
): ColumnStats {
  const header = table.headers[colIndex] || `Col ${colIndex + 1}`;
  const totalCount = table.rows.length;
  let nonEmptyCount = 0;
  let numericCount = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;

  for (const row of table.rows) {
    const val = (row[colIndex] || '').trim();
    if (val.length > 0) {
      nonEmptyCount++;
    }

    const num = parseNumericValue(val);
    if (num !== null) {
      numericCount++;
      sum += num;
      if (min === null || num < min) min = num;
      if (max === null || num > max) max = num;
    }
  }

  const isNumeric = numericCount > 0 && numericCount >= Math.ceil(nonEmptyCount * 0.6);
  const avg = numericCount > 0 ? sum / numericCount : null;

  return {
    columnIndex: colIndex,
    header,
    isNumeric,
    totalCount,
    nonEmptyCount,
    numericCount,
    sum: numericCount > 0 ? sum : null,
    avg,
    min,
    max,
  };
}

/**
 * Formats calculated stat for display
 */
export function formatCalculationValue(
  val: number | null,
  calcType: TableCalculationType
): string {
  if (val === null) return '—';
  if (calcType === 'count') return String(Math.round(val));

  // Format to clean decimal (up to 2 decimals if not integer)
  if (Number.isInteger(val)) {
    return val.toLocaleString();
  }
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
