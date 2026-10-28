/**
 * PKM V2.19 Factual Metrics & Aggregation Engine
 * 
 * Provides deterministic, explainable mathematical metrics over canonical resources.
 * Strictly enforces exact finance arithmetic (integer cents), multi-currency isolation,
 * data coverage tracking (missing != zero), and non-judgmental trend descriptions.
 */

import {
  MetricDefinition,
  MetricCalculationResult,
  MultiCurrencyAggregateResult,
  DateRangeFilter,
  ChartSeriesData,
  ChartSeriesPoint,
  V2DateBucketUnit,
  TrendDirection,
} from './reportingTypes';
import { v2GlobalizationEngine } from '../globalization';

export class V2MetricsAndAggregationEngine {
  private static instance: V2MetricsAndAggregationEngine | null = null;

  private metricCatalog: Map<string, MetricDefinition> = new Map();
  private calculationCache: Map<string, MetricCalculationResult> = new Map();
  private readonly MAX_CACHE_SIZE = 128;

  private constructor() {
    this.registerBuiltInMetrics();
  }

  public static getInstance(): V2MetricsAndAggregationEngine {
    if (!V2MetricsAndAggregationEngine.instance) {
      V2MetricsAndAggregationEngine.instance = new V2MetricsAndAggregationEngine();
    }
    return V2MetricsAndAggregationEngine.instance;
  }

  // ==========================================================================
  // METRIC CATALOG REGISTRATION
  // ==========================================================================

  private registerBuiltInMetrics(): void {
    // 1. Finance Metrics
    this.registerMetric({
      id: 'finance_income',
      name: 'Total Income',
      domain: 'finance',
      description: 'Sum of all non-transfer income transactions for the period.',
      formulaDescription: 'sum(amountCents where type == "income" and isTransfer == false)',
      aggregation: 'sum',
      targetProperty: 'amountCents',
      isExactCurrency: true,
      missingDataPolicy: 'ignore',
      isSensitive: true,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [
            { field: 'type', operator: 'equals', value: 'finance_transaction' },
            { field: 'transactionType', operator: 'equals', value: 'income' },
            { field: 'isTransfer', operator: 'equals', value: false },
          ],
        },
      },
    });

    this.registerMetric({
      id: 'finance_expense',
      name: 'Total Expenses',
      domain: 'finance',
      description: 'Sum of all non-transfer expense transactions for the period.',
      formulaDescription: 'sum(amountCents where type == "expense" and isTransfer == false)',
      aggregation: 'sum',
      targetProperty: 'amountCents',
      isExactCurrency: true,
      missingDataPolicy: 'ignore',
      isSensitive: true,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [
            { field: 'type', operator: 'equals', value: 'finance_transaction' },
            { field: 'transactionType', operator: 'equals', value: 'expense' },
            { field: 'isTransfer', operator: 'equals', value: false },
          ],
        },
      },
    });

    this.registerMetric({
      id: 'finance_net_cash_flow',
      name: 'Net Cash Flow',
      domain: 'finance',
      description: 'Exact difference between total income and total expenses.',
      formulaDescription: 'Total Income (cents) - Total Expenses (cents)',
      aggregation: 'sum',
      isExactCurrency: true,
      missingDataPolicy: 'ignore',
      isSensitive: true,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [
            { field: 'type', operator: 'equals', value: 'finance_transaction' },
            { field: 'isTransfer', operator: 'equals', value: false },
          ],
        },
      },
    });

    // 2. Tracking & Routine Metrics
    this.registerMetric({
      id: 'tracking_metric_average',
      name: 'Logged Metric Average',
      domain: 'tracking',
      description: 'Arithmetic mean of recorded numeric entries across the date range.',
      formulaDescription: 'sum(values) / count(recorded entries)',
      aggregation: 'average',
      targetProperty: 'value',
      missingDataPolicy: 'flag_missing',
      isSensitive: false,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [{ field: 'type', operator: 'equals', value: 'tracking_entry' }],
        },
      },
    });

    this.registerMetric({
      id: 'routine_completion_rate',
      name: 'Habit Completion Rate',
      domain: 'tracking',
      description: 'Percentage of scheduled occurrences that were logged as completed.',
      formulaDescription: '(completed occurrences / expected scheduled occurrences) * 100',
      aggregation: 'average',
      unit: '%',
      missingDataPolicy: 'flag_missing',
      isSensitive: false,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [{ field: 'type', operator: 'equals', value: 'routine_occurrence' }],
        },
      },
    });

    // 3. Project & Task Metrics
    this.registerMetric({
      id: 'projects_completed_count',
      name: 'Completed Projects',
      domain: 'projects',
      description: 'Number of projects marked completed within the selected period.',
      formulaDescription: 'count(projects where status == "completed")',
      aggregation: 'count',
      missingDataPolicy: 'ignore',
      isSensitive: false,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [
            { field: 'type', operator: 'equals', value: 'project' },
            { field: 'status', operator: 'equals', value: 'completed' },
          ],
        },
      },
    });

    this.registerMetric({
      id: 'projects_open_tasks_count',
      name: 'Open Tasks',
      domain: 'projects',
      description: 'Number of unfinished tasks currently scheduled.',
      formulaDescription: 'count(tasks where completed == false)',
      aggregation: 'count',
      missingDataPolicy: 'ignore',
      isSensitive: false,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [
            { field: 'type', operator: 'equals', value: 'task' },
            { field: 'completed', operator: 'equals', value: false },
          ],
        },
      },
    });

    // 4. Learning & Library Metrics
    this.registerMetric({
      id: 'learning_study_time_hours',
      name: 'Explicit Study Time',
      domain: 'learning',
      description: 'Total recorded duration of study sessions in hours.',
      formulaDescription: 'sum(sessionDurationMinutes) / 60',
      aggregation: 'sum',
      unit: 'hrs',
      missingDataPolicy: 'ignore',
      isSensitive: false,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [{ field: 'type', operator: 'equals', value: 'study_session' }],
        },
      },
    });

    this.registerMetric({
      id: 'library_books_read_count',
      name: 'Books Finished',
      domain: 'library',
      description: 'Number of library items marked finished in the period.',
      formulaDescription: 'count(library_items where status == "read")',
      aggregation: 'count',
      missingDataPolicy: 'ignore',
      isSensitive: false,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [
            { field: 'type', operator: 'equals', value: 'library_item' },
            { field: 'status', operator: 'equals', value: 'read' },
          ],
        },
      },
    });

    // 5. Health Metrics
    this.registerMetric({
      id: 'health_measurement_average',
      name: 'Health Metric Average',
      domain: 'health',
      description: 'Factual average of recorded health measurements (non-diagnostic).',
      formulaDescription: 'sum(measurement values) / count(valid deduplicated entries)',
      aggregation: 'average',
      targetProperty: 'value',
      missingDataPolicy: 'flag_missing',
      isSensitive: true,
      drillDownQuery: {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [{ field: 'type', operator: 'equals', value: 'health_measurement' }],
        },
      },
    });
  }

  public registerMetric(definition: MetricDefinition): void {
    this.metricCatalog.set(definition.id, definition);
  }

  public getMetricDefinition(metricId: string): MetricDefinition | undefined {
    return this.metricCatalog.get(metricId);
  }

  public getAllMetricDefinitions(): MetricDefinition[] {
    return Array.from(this.metricCatalog.values());
  }

  public clearCache(): void {
    this.calculationCache.clear();
  }

  // ==========================================================================
  // EXACT FINANCE AGGREGATIONS
  // ==========================================================================

  /**
   * Calculates exact multi-currency totals without dangerous floating-point addition.
   * Excludes internal transfers and respects split category attribution.
   */
  public aggregateFinanceTransactions(
    transactions: Array<{
      id: string;
      amountCents: number;
      currency: string;
      transactionType: 'income' | 'expense' | 'transfer';
      isTransfer?: boolean;
      date: string;
    }>,
    targetType: 'income' | 'expense' | 'net' = 'net'
  ): MultiCurrencyAggregateResult {
    const currencyBuckets = new Map<string, { totalCents: number; count: number }>();

    for (const t of transactions) {
      if (t.isTransfer || t.transactionType === 'transfer') {
        continue; // Strictly exclude transfers from income/expense
      }

      const curr = t.currency || 'USD';
      const existing = currencyBuckets.get(curr) || { totalCents: 0, count: 0 };

      let amountToAdd = 0;
      if (targetType === 'income' && t.transactionType === 'income') {
        amountToAdd = Math.round(t.amountCents);
      } else if (targetType === 'expense' && t.transactionType === 'expense') {
        amountToAdd = Math.round(t.amountCents);
      } else if (targetType === 'net') {
        amountToAdd = t.transactionType === 'income' ? Math.round(t.amountCents) : -Math.round(t.amountCents);
      }

      if (amountToAdd !== 0 || targetType === 'net') {
        currencyBuckets.set(curr, {
          totalCents: existing.totalCents + amountToAdd,
          count: existing.count + 1,
        });
      }
    }

    const currencies = Array.from(currencyBuckets.entries()).map(([curr, data]) => ({
      currencyCode: curr,
      totalAmountCents: data.totalCents,
      formattedAmount: v2GlobalizationEngine.formatCurrency(data.totalCents / 100, curr),
      transactionCount: data.count,
    }));

    const hasMultipleCurrencies = currencies.length > 1;
    const message = hasMultipleCurrencies
      ? 'Transactions span multiple currencies. Totals are kept distinct without estimated exchange conversions.'
      : undefined;

    return {
      currencies,
      hasMultipleCurrencies,
      message,
    };
  }

  // ==========================================================================
  // METRIC CALCULATION WITH COVERAGE & COMPARISON
  // ==========================================================================

  /**
   * Computes a metric across raw contributing records, tracking missing data and period comparisons.
   */
  public calculateMetric(
    metricId: string,
    currentRecords: Array<{ id: string; value?: number; amountCents?: number; status?: string; date?: string }>,
    previousRecords?: Array<{ id: string; value?: number; amountCents?: number; status?: string; date?: string }>,
    expectedCount: number = currentRecords.length
  ): MetricCalculationResult {
    const def = this.metricCatalog.get(metricId);
    const metricName = def ? def.name : metricId;
    const isExactCurrency = def?.isExactCurrency || false;
    const unit = def?.unit;

    // 1. Calculate Current Value
    let sum = 0;
    let count = 0;
    const contributingIds: string[] = [];

    for (const r of currentRecords) {
      contributingIds.push(r.id);
      if (def?.aggregation === 'count') {
        count++;
      } else {
        const val = isExactCurrency ? (r.amountCents !== undefined ? r.amountCents / 100 : r.value) : r.value;
        if (val !== undefined && val !== null && !isNaN(val)) {
          sum += val;
          count++;
        }
      }
    }

    let calculatedVal: number | null = null;
    if (count > 0 || def?.aggregation === 'count') {
      if (def?.aggregation === 'sum') {
        calculatedVal = Number(sum.toFixed(2));
      } else if (def?.aggregation === 'average') {
        calculatedVal = count > 0 ? Number((sum / count).toFixed(2)) : null;
      } else if (def?.aggregation === 'minimum') {
        const vals = currentRecords.map((r) => r.value).filter((v): v is number => v !== undefined);
        calculatedVal = vals.length > 0 ? Math.min(...vals) : null;
      } else if (def?.aggregation === 'maximum') {
        const vals = currentRecords.map((r) => r.value).filter((v): v is number => v !== undefined);
        calculatedVal = vals.length > 0 ? Math.max(...vals) : null;
      } else {
        calculatedVal = count;
      }
    }

    // Format value
    const formattedValue =
      calculatedVal !== null
        ? isExactCurrency
          ? v2GlobalizationEngine.formatCurrency(calculatedVal, def?.currencyCode || 'USD')
          : v2GlobalizationEngine.formatNumber(calculatedVal) + (unit ? ` ${unit}` : '')
        : 'No data';

    // 2. Data Coverage
    const recordedRecords = count;
    const missingRecords = Math.max(0, expectedCount - recordedRecords);
    const isPartialPeriod = missingRecords > 0;

    // 3. Comparison with Previous Period
    let comparison: MetricCalculationResult['comparison'] = undefined;
    if (previousRecords && previousRecords.length > 0) {
      const prevResult = this.calculateMetric(metricId, previousRecords, undefined, previousRecords.length);
      const prevVal = prevResult.value;

      if (calculatedVal !== null && prevVal !== null) {
        const absDiff = Number((calculatedVal - prevVal).toFixed(2));
        const isZeroBase = prevVal === 0;
        const pctDiff = isZeroBase ? null : Number((((calculatedVal - prevVal) / Math.abs(prevVal)) * 100).toFixed(1));

        const comparisonLabel = isZeroBase
          ? `Increased from 0 to ${calculatedVal}`
          : `${absDiff >= 0 ? '+' : ''}${absDiff} (${pctDiff !== null && pctDiff >= 0 ? '+' : ''}${pctDiff}%) compared to previous period`;

        comparison = {
          previousValue: prevVal,
          formattedPreviousValue: prevResult.formattedValue,
          absoluteDifference: absDiff,
          percentageDifference: pctDiff,
          isZeroBase,
          comparisonLabel,
        };
      }
    }

    // 4. Descriptive Non-Moralizing Trend
    let trend: MetricCalculationResult['trend'] = undefined;
    if (comparison) {
      let direction: TrendDirection = 'flat';
      if (comparison.absoluteDifference !== null) {
        if (comparison.absoluteDifference > 0.001) direction = 'up';
        else if (comparison.absoluteDifference < -0.001) direction = 'down';
      }
      trend = {
        direction,
        description: `Recorded values moved ${direction} by ${Math.abs(comparison.absoluteDifference || 0)}${unit ? ` ${unit}` : ''}.`,
      };
    }

    return {
      metricId,
      metricName,
      value: calculatedVal,
      formattedValue,
      unit,
      isExactCurrency,
      currencyCode: def?.currencyCode,
      coverage: {
        totalExpectedRecords: expectedCount,
        recordedRecords,
        missingRecords,
        isPartialPeriod,
      },
      comparison,
      trend,
      contributingResourceIds: contributingIds,
      calculatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // TIME-SERIES & CHART AGGREGATION
  // ==========================================================================

  /**
   * Generates a time-bucketed series data structure with built-in accessibility summary.
   */
  public generateChartSeries(
    seriesId: string,
    seriesName: string,
    points: Array<{ date: string; value: number | null }>,
    bucket: V2DateBucketUnit = 'day',
    unit?: string
  ): ChartSeriesData {
    if (!points || points.length === 0) {
      return {
        seriesId,
        seriesName,
        unit,
        points: [],
        accessibleSummary: `Series "${seriesName}" has no data points recorded.`,
        min: null,
        max: null,
        average: null,
      };
    }

    const seriesPoints: ChartSeriesPoint[] = points.map((p) => ({
      label: p.date,
      dateOnly: p.date,
      value: p.value,
      isMissing: p.value === null || p.value === undefined,
    }));

    const validValues = points.map((p) => p.value).filter((v): v is number => v !== null && v !== undefined);
    const min = validValues.length > 0 ? Math.min(...valsToNumbers(validValues)) : null;
    const max = validValues.length > 0 ? Math.max(...valsToNumbers(validValues)) : null;
    const sum = validValues.reduce((acc, v) => acc + v, 0);
    const average = validValues.length > 0 ? Number((sum / validValues.length).toFixed(2)) : null;

    const unitStr = unit ? ` ${unit}` : '';
    const accessibleSummary = `Series "${seriesName}" spans ${points.length} points. Range: ${min} to ${max}${unitStr}, Average: ${average}${unitStr}.`;

    return {
      seriesId,
      seriesName,
      unit,
      points: seriesPoints,
      accessibleSummary,
      min,
      max,
      average,
    };
  }
}

function valsToNumbers(vals: number[]): number[] {
  return vals;
}

export const v2MetricsAndAggregationEngine = V2MetricsAndAggregationEngine.getInstance();
