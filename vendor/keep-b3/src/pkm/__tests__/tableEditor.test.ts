import {
  parseMarkdownTable,
  extractMarkdownTables,
  serializeMarkdownTable,
  replaceTableInMarkdown,
  splitTableRow,
  escapeTableCell,
  unescapeTableCell,
  isDelimiterRow,
  parseAlignment,
  parseNumericValue,
  computeColumnStats,
} from '../tableParser';
import {
  createDefaultTable,
  addRow,
  deleteRow,
  moveRow,
  addColumn,
  deleteColumn,
  moveColumn,
  setColumnAlignment,
  updateCell,
  sortTable,
  convertCSVToMarkdownTable,
} from '../tableOperations';
import { MarkdownTable, TableHistoryEntry } from '../tableTypes';

export function runTableEditorTests(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Table Test Failed: ${msg}`);
      console.error(`  ✕ ${msg}`);
    }
  }

  // 1. Delimiter row validation
  assert(isDelimiterRow('| --- | --- |'), 'Simple delimiter is valid');
  assert(isDelimiterRow('|:---|:---:|---:|'), 'Aligned delimiter is valid');
  assert(isDelimiterRow('--- | :---: | ---:'), 'Delimiter without outer pipes is valid');
  assert(!isDelimiterRow('| abc | def |'), 'Non-delimiter text is rejected');
  assert(!isDelimiterRow('||||'), 'Empty pipes without dashes are rejected');
  assert(!isDelimiterRow(''), 'Empty string is not delimiter');

  // 2. Alignment parsing
  assert(parseAlignment(':---') === 'left', 'Parse left alignment');
  assert(parseAlignment(':---:') === 'center', 'Parse center alignment');
  assert(parseAlignment('---:') === 'right', 'Parse right alignment');
  assert(parseAlignment('---') === 'default', 'Parse default alignment');

  // 3. Escaping & unescaping
  assert(escapeTableCell('A | B') === 'A \\| B', 'Escape unescaped pipe');
  assert(escapeTableCell('A \\| B') === 'A \\| B', 'Do not double-escape existing escaped pipe');
  assert(unescapeTableCell('A \\| B') === 'A | B', 'Unescape pipe for visual editing');
  assert(escapeTableCell('Line 1\nLine 2') === 'Line 1<br>Line 2', 'Escape newline to <br>');
  assert(unescapeTableCell('Line 1<br>Line 2') === 'Line 1\nLine 2', 'Unescape <br> to newline');

  // 4. Split table row
  const cells1 = splitTableRow('| Col 1 | Col 2 \\| with pipe | `code | pipe` |');
  assert(cells1.length === 3, 'Split row into 3 cells');
  assert(cells1[0] === 'Col 1', 'Cell 0 matches');
  assert(cells1[1] === 'Col 2 \\| with pipe', 'Escaped pipe is preserved in cell');
  assert(cells1[2] === '`code | pipe`', 'Pipe in inline code is preserved in cell');

  // 5. Table detection & parsing
  const validMdTable = `
| Product | Price | Rating |
| :--- | ---: | :---: |
| Laptop | $1,200.00 | 4.8 |
| Mouse | $25.50 | 4.2 |
| Keyboard | $85.00 | 4.5 |
`.trim();

  const parsed = parseMarkdownTable(validMdTable);
  assert(parsed !== null, 'Parse valid markdown table');
  if (parsed) {
    assert(parsed.headers.length === 3, 'Table has 3 headers');
    assert(parsed.headers[0] === 'Product', 'Header 0 is Product');
    assert(parsed.alignments[0] === 'left', 'Col 0 is left aligned');
    assert(parsed.alignments[1] === 'right', 'Col 1 is right aligned');
    assert(parsed.alignments[2] === 'center', 'Col 2 is center aligned');
    assert(parsed.rows.length === 3, 'Table has 3 rows');
    assert(parsed.rows[0][0] === 'Laptop', 'Row 0 Col 0 is Laptop');
    assert(parsed.rows[1][1] === '$25.50', 'Row 1 Col 1 is $25.50');
  }

  // 6. Extraction from document (ignoring code fences and paragraphs)
  const docWithTableAndCode = `
# Project Plan

Here is a paragraph with a pipe | character that is not a table.

\`\`\`bash
cat file.txt | grep "test" | wc -l
\`\`\`

| Task | Status | Due |
| --- | :---: | ---: |
| Design | Done | 2026-09-01 |
| Build | In Progress | 2026-09-05 |

\`\`\`typescript
const a = 1 | 2;
\`\`\`
`.trim();

  const extractedTables = extractMarkdownTables(docWithTableAndCode);
  assert(extractedTables.length === 1, 'Only one valid table extracted');
  assert(extractedTables[0]?.headers[0] === 'Task', 'Extracted table header is Task');

  // 7. Malformed tables handling
  const malformedNoDelim = `| A | B |\n| C | D |`;
  assert(parseMarkdownTable(malformedNoDelim) === null, 'Table without delimiter returns null');

  const malformedSingleLine = `| A | B |`;
  assert(parseMarkdownTable(malformedSingleLine) === null, 'Single line table returns null');

  // Mismatched column count gracefully handled
  const mismatchedCols = `
| A | B | C |
| --- | --- |
| 1 | 2 |
| 1 | 2 | 3 | 4 |
`.trim();
  const parsedMismatched = parseMarkdownTable(mismatchedCols);
  assert(parsedMismatched !== null, 'Mismatched columns parsed gracefully');
  if (parsedMismatched) {
    assert(parsedMismatched.headers.length >= 3, 'Handles max column count');
    assert(parsedMismatched.rows[0].length === parsedMismatched.headers.length, 'Normalizes row lengths');
  }

  // 8. Empty values and blank cells
  const tableWithEmpties = `
| Name | Age | City |
| --- | --- | --- |
| Alice | | New York |
| | 30 | |
`.trim();
  const parsedEmpties = parseMarkdownTable(tableWithEmpties);
  assert(parsedEmpties !== null, 'Parse table with empty cells');
  if (parsedEmpties) {
    assert(parsedEmpties.rows[0][1] === '', 'Empty cell parsed as empty string');
    assert(parsedEmpties.rows[1][0] === '', 'Empty first cell parsed');
    assert(parsedEmpties.rows[1][2] === '', 'Empty last cell parsed');
  }

  // 9. Numeric parsing
  assert(parseNumericValue('123') === 123, 'Parse integer');
  assert(parseNumericValue('-45.67') === -45.67, 'Parse negative float');
  assert(parseNumericValue('$1,250.00') === 1250, 'Parse currency with commas');
  assert(parseNumericValue('€500') === 500, 'Parse Euro currency');
  assert(parseNumericValue('85.5%') === 85.5, 'Parse percentage');
  assert(parseNumericValue('(1,000)') === -1000, 'Parse accounting negative notation');
  assert(parseNumericValue('Not a number') === null, 'Reject non-numeric string');
  assert(parseNumericValue('') === null, 'Reject empty string');

  // 10. Column calculations (Sum, Avg, Count, Min, Max)
  if (parsed) {
    const priceStats = computeColumnStats(parsed, 1);
    assert(priceStats.isNumeric === true, 'Price column recognized as numeric');
    assert(priceStats.totalCount === 3, 'Total count is 3');
    assert(priceStats.sum === 1310.5, 'Sum of prices is 1310.5');
    assert(Math.round(priceStats.avg! * 100) / 100 === 436.83, 'Avg price is ~436.83');
    assert(priceStats.min === 25.5, 'Min price is 25.5');
    assert(priceStats.max === 1200, 'Max price is 1200');

    const productStats = computeColumnStats(parsed, 0);
    assert(productStats.isNumeric === false, 'Product column is not numeric');
    assert(productStats.nonEmptyCount === 3, 'Non-empty count is 3');
  }

  // 11. Table structural mutations: Add Row, Delete Row, Move Row
  let testTable = createDefaultTable(3, 3);
  testTable = updateCell(testTable, -1, 0, 'Item');
  testTable = updateCell(testTable, -1, 1, 'Qty');
  testTable = updateCell(testTable, -1, 2, 'Price');
  testTable = updateCell(testTable, 0, 0, 'Apples');
  testTable = updateCell(testTable, 0, 1, '10');
  testTable = updateCell(testTable, 0, 2, '$5.00');
  testTable = updateCell(testTable, 1, 0, 'Bananas');
  testTable = updateCell(testTable, 1, 1, '5');
  testTable = updateCell(testTable, 1, 2, '$3.00');
  testTable = updateCell(testTable, 2, 0, 'Cherries');
  testTable = updateCell(testTable, 2, 1, '20');
  testTable = updateCell(testTable, 2, 2, '$15.00');

  // Add row
  const withRow = addRow(testTable, 1, ['Oranges', '8', '$6.00']);
  assert(withRow.rows.length === 4, 'Added row increases row count to 4');
  assert(withRow.rows[1][0] === 'Oranges', 'Row inserted at index 1');

  // Move row
  const movedRow = moveRow(withRow, 1, 3);
  assert(movedRow.rows[3][0] === 'Oranges', 'Row moved to index 3');

  // Delete row
  const deletedRow = deleteRow(movedRow, 3);
  assert(deletedRow.rows.length === 3, 'Row deletion restores count to 3');
  assert(!deletedRow.rows.some((r) => r[0] === 'Oranges'), 'Deleted row is removed');

  // 12. Column mutations: Add Column, Delete Column, Move Column, Set Alignment
  const withCol = addColumn(testTable, 1, 'Category', 'center');
  assert(withCol.headers.length === 4, 'Added column increases header count to 4');
  assert(withCol.headers[1] === 'Category', 'Header added at index 1');
  assert(withCol.alignments[1] === 'center', 'Alignment set to center');
  assert(withCol.rows[0].length === 4, 'All rows updated with new column');

  const alignedCol = setColumnAlignment(withCol, 0, 'left');
  assert(alignedCol.alignments[0] === 'left', 'Column alignment updated');

  const movedCol = moveColumn(alignedCol, 1, 3);
  assert(movedCol.headers[3] === 'Category', 'Column moved to index 3');

  const deletedCol = deleteColumn(movedCol, 3);
  assert(deletedCol.headers.length === 3, 'Column deleted, back to 3 cols');

  // 13. Sorting (Numeric and Alphabetical)
  const sortedByQtyAsc = sortTable(testTable, 1, 'asc');
  assert(sortedByQtyAsc.rows[0][0] === 'Bananas', '5 Bananas first in numeric asc sort');
  assert(sortedByQtyAsc.rows[1][0] === 'Apples', '10 Apples second in numeric asc sort');
  assert(sortedByQtyAsc.rows[2][0] === 'Cherries', '20 Cherries third in numeric asc sort');

  const sortedByQtyDesc = sortTable(testTable, 1, 'desc');
  assert(sortedByQtyDesc.rows[0][0] === 'Cherries', '20 Cherries first in numeric desc sort');

  const sortedByNameDesc = sortTable(testTable, 0, 'desc');
  assert(sortedByNameDesc.rows[0][0] === 'Cherries', 'Cherries first in alpha desc sort');
  assert(sortedByNameDesc.rows[2][0] === 'Apples', 'Apples last in alpha desc sort');

  // 14. Serialization & Round-Trip Source Preservation
  const serialized = serializeMarkdownTable(testTable, { prettyAlign: true });
  assert(serialized.includes('Item') && serialized.includes('Qty') && serialized.includes('Price'), 'Serialized contains headers');
  assert(serialized.includes('Apples') && serialized.includes('10') && serialized.includes('$5.00'), 'Serialized contains row data');

  const compactSerialized = serializeMarkdownTable(testTable, { prettyAlign: false });
  assert(compactSerialized.includes('| Item | Qty | Price |'), 'Compact serialized matches exact header format');

  const roundTripped = parseMarkdownTable(serialized);
  assert(roundTripped !== null, 'Round-trip parsed successfully');
  if (roundTripped) {
    assert(roundTripped.headers.length === testTable.headers.length, 'Round-trip headers match');
    assert(roundTripped.rows.length === testTable.rows.length, 'Round-trip rows count match');
    assert(roundTripped.rows[0][0] === testTable.rows[0][0], 'Round-trip cell content match');
  }

  // 15. Document replacement (replaceTableInMarkdown)
  const originalDoc = `# Shopping List\n\n${serialized}\n\nNotes: buy fresh.`;
  const docTables = extractMarkdownTables(originalDoc);
  assert(docTables.length === 1, 'Extracted table from doc');
  const tableInDoc = docTables[0];
  const updatedTableData = updateCell(tableInDoc, 0, 0, 'Green Apples');
  const newTableMd = serializeMarkdownTable(updatedTableData);
  const replacedDoc = replaceTableInMarkdown(originalDoc, tableInDoc, newTableMd);

  assert(replacedDoc.includes('Green Apples'), 'Document updated with new table content');
  assert(replacedDoc.includes('# Shopping List'), 'Document header preserved');
  assert(replacedDoc.includes('Notes: buy fresh.'), 'Document footer preserved');

  // 16. CSV / TSV Import conversion
  const csvData = `City,Population,Country\nTokyo,37400068,Japan\nDelhi,30290936,India\nShanghai,27058480,China`;
  const csvTable = convertCSVToMarkdownTable(csvData);
  assert(csvTable !== null, 'CSV converted to MarkdownTable');
  if (csvTable) {
    assert(csvTable.headers.length === 3, 'CSV headers count is 3');
    assert(csvTable.rows.length === 3, 'CSV rows count is 3');
    assert(csvTable.rows[0][0] === 'Tokyo', 'First row City is Tokyo');
  }

  // 17. Undo / Redo History simulation
  const historyStack: TableHistoryEntry[] = [
    { table: testTable, timestamp: 1, description: 'Initial' },
  ];
  let hIndex = 0;

  // Step 1: Add row
  const step1 = addRow(testTable, undefined, ['Dates', '30', '$12.00']);
  historyStack.push({ table: step1, timestamp: 2, description: 'Add Dates' });
  hIndex++;

  // Step 2: Edit cell
  const step2 = updateCell(step1, 0, 1, '100');
  historyStack.push({ table: step2, timestamp: 3, description: 'Edit Qty' });
  hIndex++;

  assert(hIndex === 2, 'History stack has 3 items');
  assert(historyStack[hIndex].table.rows[0][1] === '100', 'Current state is step 2');

  // Undo to step 1
  hIndex--;
  assert(historyStack[hIndex].table.rows[0][1] === '10', 'Undone to step 1 value');

  // Undo to step 0
  hIndex--;
  assert(historyStack[hIndex].table.rows.length === 3, 'Undone to initial 3 rows');

  // Redo to step 1
  hIndex++;
  assert(historyStack[hIndex].table.rows.length === 4, 'Redone to 4 rows');

  // 18. Large Table (50 rows x 10 cols) Scale test
  const largeHeaders = Array.from({ length: 10 }, (_, i) => `Metric ${i + 1}`);
  let largeTable = createDefaultTable(50, 10, largeHeaders);
  for (let r = 0; r < 50; r++) {
    for (let c = 0; c < 10; c++) {
      largeTable = updateCell(largeTable, r, c, `$${(r + 1) * (c + 1) * 10}.00`);
    }
  }

  const startT = Date.now();
  const largeSerialized = serializeMarkdownTable(largeTable);
  const largeParsed = parseMarkdownTable(largeSerialized);
  const duration = Date.now() - startT;

  assert(largeParsed !== null, 'Large 50x10 table parsed');
  if (largeParsed) {
    assert(largeParsed.rows.length === 50, 'Large table has 50 rows');
    assert(largeParsed.headers.length === 10, 'Large table has 10 columns');
    const colStats = computeColumnStats(largeParsed, 0);
    assert(colStats.isNumeric === true, 'Large table column stats computed');
    assert(colStats.totalCount === 50, 'Large table column count is 50');
  }
  assert(duration < 50, `Large table processed fast (${duration}ms < 50ms)`);

  return { passed, failed, errors };
}
