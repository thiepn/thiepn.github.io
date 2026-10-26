import { commandRegistry } from '../commands/commandRegistry';
import {
  evaluateMathExpression,
  evaluateReactiveVariables,
  computeTableRows,
  computeColumnAggregation,
  tableToMarkdown,
  markdownToTable,
  getScenarioPreset,
} from '../compute/formulaEngine';
import { ComputationalTable, TableColumn } from '../compute/computeTypes';

export function runFeatureP10ReactiveSandboxTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const err = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(err);
      console.error(err);
    }
  }

  // Gate 1: Command Registration & Discovery
  const cmd = commandRegistry.getCommand('tools:reactive-sandbox');
  assert(Boolean(cmd), 'tools:reactive-sandbox command is registered in commandRegistry');
  assert(
    Boolean(cmd?.title.includes('Reactive Computational Sandbox')),
    'Command title mentions Reactive Computational Sandbox'
  );
  assert(cmd?.shortcut === 'Alt+Q', 'Command shortcut is Alt+Q');
  assert(Boolean(cmd?.keywords.includes('p10')), 'Keywords include p10');
  assert(Boolean(cmd?.keywords.includes('math')), 'Keywords include math');
  assert(Boolean(cmd?.keywords.includes('formula')), 'Keywords include formula');
  assert(Boolean(cmd?.keywords.includes('spreadsheet')), 'Keywords include spreadsheet');
  assert(cmd?.category === 'Tools & Diagnostics', 'Command category is Tools & Diagnostics');

  // Gate 2: Safe Mathematical Expression Evaluator
  const basicMath = evaluateMathExpression('10 * 5 + 2');
  assert(basicMath === 52, 'Basic arithmetic evaluation matches expected');

  const expMath = evaluateMathExpression('2 ^ 3 + sqrt(16)');
  assert(expMath === 12, 'Supports exponent operator ^ and sqrt()');

  const scopeMath = evaluateMathExpression('principal * (1 + rate)', { principal: 1000, rate: 0.1 });
  assert(scopeMath === 1100, 'Evaluates scoped variable parameters correctly');

  const roundMath = evaluateMathExpression('round(100.4567)');
  assert(roundMath === 100, 'Supports round() math function');

  // Gate 3: Dependent Reactive Variable Graph
  const declarations = [
    { name: 'current_cash', rawExpression: '100000', description: 'Bank balance' },
    { name: 'monthly_burn', rawExpression: '20000', description: 'Burn rate' },
    { name: 'runway', rawExpression: 'current_cash / monthly_burn', description: 'Runway months' },
  ];
  const evaluatedVars = evaluateReactiveVariables(declarations);
  assert(evaluatedVars.length === 3, 'Evaluates all 3 declared variables');
  assert(evaluatedVars[0].computedValue === 100000, 'Evaluates base variable');
  assert(evaluatedVars[2].computedValue === 5, 'Evaluates dependent variable runway = 5');
  assert(!evaluatedVars[2].error, 'Dependent variable has zero evaluation errors');

  // Gate 4: Dynamic Table Row Formula Computation
  const sampleTable: ComputationalTable = {
    id: 'test_table_1',
    name: 'Product Inventory',
    columns: [
      { id: 'item', name: 'Item Name', type: 'text' },
      { id: 'qty', name: 'Quantity', type: 'number' },
      { id: 'price', name: 'Unit Price', type: 'currency' },
      { id: 'total', name: 'Total Cost', type: 'formula', formula: 'qty * price', aggregation: 'sum' },
    ],
    rows: [
      { id: 'r1', cells: { item: 'Notebook', qty: 10, price: 5 } },
      { id: 'r2', cells: { item: 'Fountain Pen', qty: 2, price: 45 } },
    ],
  };

  const computed = computeTableRows(sampleTable);
  assert(computed[0].cells['total'] === 50, 'Row 1 formula column computes 10 * 5 = 50');
  assert(computed[1].cells['total'] === 90, 'Row 2 formula column computes 2 * 45 = 90');

  // Gate 5: Column Aggregation Calculation
  const totalCol = sampleTable.columns.find(c => c.id === 'total')!;
  const sumAgg = computeColumnAggregation(computed, totalCol);
  assert(sumAgg === 140, 'Computes accurate SUM aggregation: 50 + 90 = 140');

  const avgCol: TableColumn = { id: 'qty', name: 'Quantity', type: 'number', aggregation: 'avg' };
  const avgAgg = computeColumnAggregation(computed, avgCol);
  assert(avgAgg === 6, 'Computes accurate AVG aggregation: (10 + 2) / 2 = 6');

  // Gate 6: Bidirectional Markdown Table Conversion
  const md = tableToMarkdown({ ...sampleTable, rows: computed });
  assert(md.includes('| Item Name | Quantity | Unit Price | Total Cost |'), 'Markdown contains table header');
  assert(md.includes('| **140** |') || md.includes('**$140**') || md.includes('140'), 'Markdown includes aggregation footer');

  const parsedFromMd = markdownToTable(`
| Resource | Hours | Rate |
| :--- | ---: | ---: |
| Senior Engineer | 40 | 120 |
| UX Designer | 20 | 95 |
`);
  assert(Boolean(parsedFromMd), 'Parses markdown table into ComputationalTable');
  assert(parsedFromMd?.columns.length === 3, 'Extracts 3 columns from markdown table');
  assert(parsedFromMd?.rows.length === 2, 'Extracts 2 rows from markdown table');

  // Gate 7: Built-in Scenario Presets
  const runwayPreset = getScenarioPreset('startup-runway');
  assert(runwayPreset.variables.length >= 3, 'Startup Runway preset has valid parameters');
  assert(runwayPreset.table.columns.length >= 3, 'Startup Runway preset has table columns');

  const compoundPreset = getScenarioPreset('compound-interest');
  assert(compoundPreset.variables.some(v => v.name === 'annual_return'), 'Compound interest preset has annual_return');

  const velocityPreset = getScenarioPreset('project-velocity');
  assert(velocityPreset.variables.some(v => v.name === 'velocity_per_sprint'), 'Project velocity preset has velocity_per_sprint');

  const statsPreset = getScenarioPreset('research-statistics');
  assert(statsPreset.table.name.includes('Trial Group Results'), 'Research statistics preset has trial group table');

  return { passed, failed, errors };
}
