/**
 * PKM V2.19 Dashboards, Reporting, Trends & Decision-Support Types
 */

import { UnifiedQueryAST as ResourceQuery } from '../core/query/queryTypes';

// ============================================================================
// WIDGET & DASHBOARD DEFINITIONS
// ============================================================================

export type V2DashboardWidgetType =
  | 'number_metric'
  | 'list'
  | 'table'
  | 'chart'
  | 'timeline'
  | 'progress_target'
  | 'status_summary'
  | 'saved_view'
  | 'text_explanation';

export type ChartType = 'line' | 'bar' | 'area' | 'stacked_bar';

export type V2MetricAggregationType =
  | 'count'
  | 'sum'
  | 'average'
  | 'minimum'
  | 'maximum'
  | 'median'
  | 'distinct_count';

export type TrendDirection = 'up' | 'down' | 'flat' | 'insufficient_data';

export type V2DateBucketUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DateRangeFilter {
  type: 'all' | 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'rolling_7d' | 'rolling_30d' | 'rolling_90d' | 'custom';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  timezone?: string;
}

export interface DashboardFilterContext {
  dateRange: DateRangeFilter;
  contextTag?: string;
  projectId?: string;
  courseId?: string;
  tripId?: string;
}

export interface MetricDefinition {
  id: string;
  name: string;
  domain: string;
  description: string;
  formulaDescription: string;
  aggregation: V2MetricAggregationType;
  targetProperty?: string;
  unit?: string;
  isExactCurrency?: boolean;
  currencyCode?: string;
  missingDataPolicy: 'ignore' | 'flag_missing' | 'strict';
  isSensitive: boolean;
  drillDownQuery: ResourceQuery;
}

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  type: V2DashboardWidgetType;
  metricId?: string;
  query?: ResourceQuery;
  chartType?: ChartType;
  dateRangeOverride?: DateRangeFilter;
  groupByProperty?: string;
  dateBucket?: V2DateBucketUnit;
  explicitTargetValue?: number; // Only for explicit measurable targets (e.g. 100 kg)
  customText?: string;
  columnSpan?: 1 | 2 | 3 | 4; // 1 to 4 columns in desktop grid
  orderIndex: number;
  ownerModule: 'core' | 'finance' | 'health' | 'tracking' | 'learning' | 'projects' | 'library' | 'travel' | 'assets' | 'decisions' | 'inbox' | 'plugin';
  pluginId?: string;
  ignoresGlobalFilters?: boolean;
}

export interface DashboardDefinition {
  id: string;
  title: string;
  description?: string;
  isFavorite?: boolean;
  defaultFilterContext: DashboardFilterContext;
  widgets: DashboardWidgetConfig[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ============================================================================
// AGGREGATE RESULTS & CHART DATA
// ============================================================================

export interface MetricCalculationResult {
  metricId: string;
  metricName: string;
  value: number | null;
  formattedValue: string;
  unit?: string;
  isExactCurrency: boolean;
  currencyCode?: string;
  coverage: {
    totalExpectedRecords: number;
    recordedRecords: number;
    missingRecords: number;
    isPartialPeriod: boolean;
  };
  comparison?: {
    previousValue: number | null;
    formattedPreviousValue: string;
    absoluteDifference: number | null;
    percentageDifference: number | null;
    isZeroBase: boolean;
    comparisonLabel: string;
  };
  trend?: {
    direction: TrendDirection;
    description: string;
  };
  contributingResourceIds: string[];
  calculatedAt: string;
}

export interface MultiCurrencyAggregateResult {
  currencies: Array<{
    currencyCode: string;
    totalAmountCents: number;
    formattedAmount: string;
    transactionCount: number;
  }>;
  hasMultipleCurrencies: boolean;
  message?: string;
}

export interface ChartSeriesPoint {
  label: string;
  dateOnly?: string;
  value: number | null;
  isMissing?: boolean;
}

export interface ChartSeriesData {
  seriesId: string;
  seriesName: string;
  unit?: string;
  points: ChartSeriesPoint[];
  accessibleSummary: string;
  min: number | null;
  max: number | null;
  average: number | null;
}

// ============================================================================
// REPORT DEFINITIONS & SNAPSHOTS
// ============================================================================

export interface ReportSectionConfig {
  title: string;
  description?: string;
  metricIds: string[];
  chartConfigs?: Array<{
    title: string;
    chartType: ChartType;
    metricId: string;
    dateBucket: V2DateBucketUnit;
  }>;
  includeResourceList?: boolean;
  listQuery?: ResourceQuery;
}

export interface ReportTemplate {
  id: string;
  title: string;
  domain: string;
  scopeDescription: string;
  defaultDateRange: DateRangeFilter;
  sections: ReportSectionConfig[];
}

export interface FrozenReportSnapshot {
  id: string;
  templateId: string;
  title: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  locale: string;
  deterministicSummary: string;
  metrics: MetricCalculationResult[];
  charts: ChartSeriesData[];
  includedResourcesSummary: Array<{
    resourceId: string;
    title: string;
    type: string;
    date?: string;
  }>;
  provenance: {
    systemVersion: string;
    schemaVersion: number;
    totalRecordsEvaluated: number;
    isFrozen: true;
  };
}

// ============================================================================
// CERTIFICATION TYPES
// ============================================================================

export interface V2_19CertificationGate {
  gateId: string;
  name: string;
  severity: 'S0_CRITICAL' | 'S1_HIGH' | 'S2_MEDIUM';
  description: string;
  passed: boolean;
  evidence: string;
}

export interface V2_19CertificationReport {
  overallPassed: boolean;
  totalGates: number;
  passedGates: number;
  failedGates: number;
  classification:
    | 'V2.19 — DASHBOARDS, REPORTING & TRENDS READY'
    | 'V2.19 — READY WITH ANALYTICS / SCALE LIMITATIONS'
    | 'V2.19 — NOT READY';
  timestamp: string;
  executionDurationMs: number;
  gates: V2_19CertificationGate[];
  benchmarkSummary: {
    simpleDashboardRenderMs: number;
    tenWidgetDashboardRenderMs: number;
    tracking1YearChartMs: number;
    financeMonthlyReportMs: number;
    drillDownQueryMs: number;
    largeHistory100kAggregationOpsSec: number;
  };
}
