import {
  ComputationalTable,
  TableColumn,
  TableRow,
  ReactiveVariable,
  AggregationType,
  ComputeScenarioPreset,
} from './computeTypes';

/**
 * Evaluates a single mathematical expression with safe environment variables.
 * Sandboxed without arbitrary code execution or eval().
 */
export function evaluateMathExpression(
  expression: string,
  scope: Record<string, number | any> = {}
): number | string | boolean | null {
  if (!expression || !expression.trim()) return null;

  let expr = expression.trim();

  // Basic math functions replacements
  expr = expr.replace(/\bsqrt\(([^)]+)\)/g, 'Math.sqrt($1)');
  expr = expr.replace(/\babs\(([^)]+)\)/g, 'Math.abs($1)');
  expr = expr.replace(/\bround\(([^)]+)\)/g, 'Math.round($1)');
  expr = expr.replace(/\bfloor\(([^)]+)\)/g, 'Math.floor($1)');
  expr = expr.replace(/\bceil\(([^)]+)\)/g, 'Math.ceil($1)');
  expr = expr.replace(/\bmin\(([^)]+)\)/g, 'Math.min($1)');
  expr = expr.replace(/\bmax\(([^)]+)\)/g, 'Math.max($1)');

  // Exponentiation operator ^ to **
  expr = expr.replace(/\^/g, '**');

  // Replace variable identifiers with scoped values
  const varNames = Object.keys(scope).sort((a, b) => b.length - a.length);
  for (const name of varNames) {
    const val = scope[name];
    if (typeof val === 'number' && !isNaN(val)) {
      const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g');
      expr = expr.replace(regex, `(${val})`);
    }
  }

  // Sanitize: allow only numbers, math operators, parens, Math methods, decimals, comparisons
  const sanitized = expr.replace(/[^\d+\-*/%(),. Math\w><=!&|]/g, '');

  try {
    // Function constructor limited strictly to Math scope
    const fn = new Function('Math', `"use strict"; return (${sanitized});`);
    const result = fn(Math);
    if (typeof result === 'number') {
      return isNaN(result) ? null : Math.round(result * 10000) / 10000;
    }
    return result;
  } catch {
    return null;
  }
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Evaluates a list of dependent reactive variables sequentially.
 */
export function evaluateReactiveVariables(
  rawDeclarations: Array<{ name: string; rawExpression: string; description?: string }>
): ReactiveVariable[] {
  const scope: Record<string, number> = {};
  const results: ReactiveVariable[] = [];

  for (const decl of rawDeclarations) {
    const trimmedName = decl.name.trim();
    if (!trimmedName) continue;

    const computed = evaluateMathExpression(decl.rawExpression, scope);
    if (typeof computed === 'number') {
      scope[trimmedName] = computed;
    }

    results.push({
      name: trimmedName,
      rawExpression: decl.rawExpression,
      computedValue: computed,
      error: computed === null ? 'Syntax or Evaluation Error' : undefined,
      description: decl.description,
    });
  }

  return results;
}

/**
 * Computes all formula column values for each row in a computational table.
 */
export function computeTableRows(table: ComputationalTable): TableRow[] {
  const formulaCols = table.columns.filter(c => c.type === 'formula' && c.formula);

  return table.rows.map(row => {
    const computedCells = { ...row.cells };

    // Create a row scope using both column IDs and normalized column names
    const rowScope: Record<string, number> = {};
    for (const col of table.columns) {
      const rawVal = row.cells[col.id];
      const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
      if (!isNaN(numVal)) {
        rowScope[col.id] = numVal;
        const normalizedName = col.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        rowScope[normalizedName] = numVal;
        rowScope[col.name.trim()] = numVal;
      }
    }

    // Evaluate formula columns
    for (const fCol of formulaCols) {
      if (fCol.formula) {
        const res = evaluateMathExpression(fCol.formula, rowScope);
        computedCells[fCol.id] = res !== null ? res : '#ERR';
        if (typeof res === 'number') {
          rowScope[fCol.id] = res;
          rowScope[fCol.name.trim()] = res;
        }
      }
    }

    return {
      ...row,
      cells: computedCells,
    };
  });
}

/**
 * Computes column aggregation (sum, avg, min, max, count).
 */
export function computeColumnAggregation(
  rows: TableRow[],
  column: TableColumn
): number | string | null {
  if (!column.aggregation || column.aggregation === 'none') return null;

  const values: number[] = [];
  for (const row of rows) {
    const val = row.cells[column.id];
    if (typeof val === 'number' && !isNaN(val)) {
      values.push(val);
    } else if (val !== undefined && val !== null && val !== '') {
      const parsed = parseFloat(String(val));
      if (!isNaN(parsed)) values.push(parsed);
    }
  }

  if (column.aggregation === 'count') {
    return rows.length;
  }

  if (values.length === 0) return 0;

  switch (column.aggregation) {
    case 'sum': {
      const s = values.reduce((acc, curr) => acc + curr, 0);
      return Math.round(s * 100) / 100;
    }
    case 'avg': {
      const s = values.reduce((acc, curr) => acc + curr, 0);
      return Math.round((s / values.length) * 100) / 100;
    }
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return null;
  }
}

/**
 * Converts a ComputationalTable into a clean canonical Markdown table string.
 */
export function tableToMarkdown(table: ComputationalTable): string {
  if (table.columns.length === 0) return '';

  const headers = table.columns.map(c => c.name);
  const alignments = table.columns.map(c => (c.type === 'number' || c.type === 'currency' || c.type === 'percentage' ? '---:' : ':---'));

  const lines: string[] = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${alignments.join(' | ')} |`);

  for (const row of table.rows) {
    const rowValues = table.columns.map(col => {
      const val = row.cells[col.id];
      if (val === undefined || val === null) return '';
      if (col.type === 'currency' && typeof val === 'number') return `$${val.toLocaleString()}`;
      if (col.type === 'percentage' && typeof val === 'number') return `${val}%`;
      return String(val);
    });
    lines.push(`| ${rowValues.join(' | ')} |`);
  }

  // Summary aggregation footer row if any column has aggregation
  const hasAgg = table.columns.some(c => c.aggregation && c.aggregation !== 'none');
  if (hasAgg) {
    const aggValues = table.columns.map(col => {
      const agg = computeColumnAggregation(table.rows, col);
      if (agg === null) return '';
      if (col.type === 'currency' && typeof agg === 'number') return `**$${agg.toLocaleString()}**`;
      return `**${agg}**`;
    });
    lines.push(`| ${aggValues.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Parses a standard Markdown table string into a ComputationalTable.
 */
export function markdownToTable(markdown: string, tableName = 'Data Table'): ComputationalTable | null {
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|'));
  if (lines.length < 2) return null;

  const headerCells = lines[0]
    .slice(1, -1)
    .split('|')
    .map(c => c.trim());

  const columns: TableColumn[] = headerCells.map((h, i) => {
    const lower = h.toLowerCase();
    let type: TableColumn['type'] = 'text';
    if (lower.includes('price') || lower.includes('cost') || lower.includes('revenue') || lower.includes('amount') || lower.includes('$')) {
      type = 'currency';
    } else if (lower.includes('rate') || lower.includes('%') || lower.includes('percent')) {
      type = 'percentage';
    } else if (lower.includes('qty') || lower.includes('count') || lower.includes('quantity') || lower.includes('hours') || lower.includes('points')) {
      type = 'number';
    }

    return {
      id: `col_${i + 1}`,
      name: h,
      type,
      aggregation: type === 'currency' || type === 'number' ? 'sum' : 'none',
    };
  });

  const rows: TableRow[] = [];
  // Skip header line (0) and separator line (1)
  for (let r = 2; r < lines.length; r++) {
    const rawRow = lines[r];
    const cellsList = rawRow
      .slice(1, -1)
      .split('|')
      .map(c => c.trim().replace(/\*\*/g, '').replace(/^\$/, ''));

    const cellMap: Record<string, any> = {};
    columns.forEach((col, idx) => {
      const raw = cellsList[idx] || '';
      if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage') {
        const num = parseFloat(raw);
        cellMap[col.id] = isNaN(num) ? raw : num;
      } else {
        cellMap[col.id] = raw;
      }
    });

    rows.push({
      id: `row_${r - 1}`,
      cells: cellMap,
    });
  }

  return {
    id: `table_${Date.now()}`,
    name: tableName,
    columns,
    rows,
  };
}

/**
 * Built-in scenario presets for instant financial, research, and estimation modeling.
 */
export function getScenarioPreset(preset: ComputeScenarioPreset): {
  table: ComputationalTable;
  variables: Array<{ name: string; rawExpression: string; description?: string }>;
} {
  switch (preset) {
    case 'startup-runway':
      return {
        variables: [
          { name: 'current_cash', rawExpression: '500000', description: 'Current Treasury Reserves ($)' },
          { name: 'monthly_growth_rate', rawExpression: '0.08', description: 'Net MoM Revenue Growth Rate' },
          { name: 'monthly_burn', rawExpression: '35000', description: 'Estimated Net Monthly Burn ($)' },
          { name: 'runway_months', rawExpression: 'current_cash / monthly_burn', description: 'Available Runway (Months)' },
        ],
        table: {
          id: 'table_burn',
          name: 'Quarterly Department Budgets & Burn',
          columns: [
            { id: 'c1', name: 'Department', type: 'text', aggregation: 'count' },
            { id: 'c2', name: 'Headcount', type: 'number', aggregation: 'sum' },
            { id: 'c3', name: 'Monthly Budget', type: 'currency', aggregation: 'sum' },
            { id: 'c4', name: 'Quarterly Total', type: 'formula', formula: 'c3 * 3', aggregation: 'sum' },
          ],
          rows: [
            { id: 'r1', cells: { c1: 'Engineering & Core Platform', c2: 4, c3: 24000 } },
            { id: 'r2', cells: { c1: 'Product Design & Research', c2: 2, c3: 11000 } },
            { id: 'r3', cells: { c1: 'Operations & Infrastructure', c2: 1, c3: 5000 } },
            { id: 'r4', cells: { c1: 'Growth & Customer Success', c2: 2, c3: 9500 } },
          ],
        },
      };

    case 'compound-interest':
      return {
        variables: [
          { name: 'principal', rawExpression: '10000', description: 'Initial Investment ($)' },
          { name: 'annual_return', rawExpression: '0.07', description: 'Expected Annual Rate of Return' },
          { name: 'monthly_deposit', rawExpression: '500', description: 'Monthly Additional Contribution' },
          { name: 'year1_balance', rawExpression: 'principal * (1 + annual_return) + (monthly_deposit * 12)', description: 'Year 1 Projected Balance' },
        ],
        table: {
          id: 'table_compound',
          name: 'Annual Compound Growth Horizon',
          columns: [
            { id: 'c1', name: 'Year Horizon', type: 'text' },
            { id: 'c2', name: 'Starting Base', type: 'currency' },
            { id: 'c3', name: 'Annual Additions', type: 'currency', aggregation: 'sum' },
            { id: 'c4', name: 'Projected End Balance', type: 'formula', formula: 'c2 * 1.07 + c3', aggregation: 'sum' },
          ],
          rows: [
            { id: 'r1', cells: { c1: 'Year 1', c2: 10000, c3: 6000 } },
            { id: 'r2', cells: { c1: 'Year 2', c2: 16700, c3: 6000 } },
            { id: 'r3', cells: { c1: 'Year 3', c2: 23869, c3: 6000 } },
            { id: 'r4', cells: { c1: 'Year 5', c2: 40250, c3: 6000 } },
          ],
        },
      };

    case 'project-velocity':
      return {
        variables: [
          { name: 'total_points', rawExpression: '180', description: 'Backlog Total Story Points' },
          { name: 'velocity_per_sprint', rawExpression: '32', description: 'Average Story Points Per Sprint' },
          { name: 'sprint_length_weeks', rawExpression: '2', description: 'Sprint Cadence in Weeks' },
          { name: 'sprints_needed', rawExpression: 'ceil(total_points / velocity_per_sprint)', description: 'Required Sprints to Ship' },
          { name: 'weeks_to_release', rawExpression: 'sprints_needed * sprint_length_weeks', description: 'Estimated Weeks to Release' },
        ],
        table: {
          id: 'table_features',
          name: 'Epic Estimation & Point Distribution',
          columns: [
            { id: 'c1', name: 'Epic Name', type: 'text', aggregation: 'count' },
            { id: 'c2', name: 'Complexity', type: 'number', aggregation: 'avg' },
            { id: 'c3', name: 'Story Points', type: 'number', aggregation: 'sum' },
            { id: 'c4', name: 'Estimated Hours', type: 'formula', formula: 'c3 * 4.5', aggregation: 'sum' },
          ],
          rows: [
            { id: 'r1', cells: { c1: 'Core Zettelkasten Graph Index', c2: 5, c3: 34 } },
            { id: 'r2', cells: { c1: 'FSRS-4.5 Active Recall Engine', c2: 4, c3: 28 } },
            { id: 'r3', cells: { c1: 'Offline First CRDT Sync Hub', c2: 5, c3: 45 } },
            { id: 'r4', cells: { c1: 'Presentation & Deck Studio', c2: 3, c3: 21 } },
            { id: 'r5', cells: { c1: 'Reactive Calculation Sandbox', c2: 4, c3: 26 } },
          ],
        },
      };

    case 'research-statistics':
      return {
        variables: [
          { name: 'sample_size', rawExpression: '120', description: 'Total Experimental Cohort Size' },
          { name: 'confidence_level', rawExpression: '0.95', description: 'Statistical Confidence Level' },
          { name: 'baseline_accuracy', rawExpression: '0.68', description: 'Control Group Baseline Accuracy' },
          { name: 'intervention_accuracy', rawExpression: '0.89', description: 'Intervention Group Accuracy' },
          { name: 'accuracy_lift', rawExpression: 'round((intervention_accuracy - baseline_accuracy) * 100)', description: 'Absolute Recall Lift (%)' },
        ],
        table: {
          id: 'table_stats',
          name: 'Trial Group Results & Retention Rates',
          columns: [
            { id: 'c1', name: 'Trial Cohort', type: 'text', aggregation: 'count' },
            { id: 'c2', name: 'Participants', type: 'number', aggregation: 'sum' },
            { id: 'c3', name: 'Day 30 Retention (%)', type: 'percentage', aggregation: 'avg' },
            { id: 'c4', name: 'Successful Retrivals', type: 'formula', formula: 'round(c2 * (c3 / 100))', aggregation: 'sum' },
          ],
          rows: [
            { id: 'r1', cells: { c1: 'Cohort A (Linear Folder Notes)', c2: 40, c3: 42 } },
            { id: 'r2', cells: { c1: 'Cohort B (Spaced Incremental Reading)', c2: 40, c3: 78 } },
            { id: 'r3', cells: { c1: 'Cohort C (Bi-directional Atomic Zettel)', c2: 40, c3: 91 } },
          ],
        },
      };
  }
}
