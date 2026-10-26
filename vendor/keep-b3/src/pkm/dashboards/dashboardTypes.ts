/**
 * Dashboard & Knowledge Analytics Types for Phase P44
 * 
 * Defines the canonical configuration model for Dashboards, Widgets,
 * Data Sources, Aggregations, Visualizations, and Drill-down schemas.
 * Note: Dashboards are pure projection configurations; they never store duplicate copies of notes.
 */

export type DashboardWidgetType =
  | 'metric'
  | 'chart'
  | 'table'
  | 'list'
  | 'text'
  | 'note_embed';

export type DashboardChartType =
  | 'bar'
  | 'horizontal_bar'
  | 'line'
  | 'area'
  | 'donut'
  | 'pie'
  | 'histogram';

export type MetricAggregationType =
  | 'count'
  | 'sum'
  | 'average'
  | 'min'
  | 'max'
  | 'count_distinct'
  | 'ratio';

export type RelativeDatePreset =
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'all';

export type DateBucketUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export type ValueFormat =
  | 'number'
  | 'integer'
  | 'percentage'
  | 'currency'
  | 'date'
  | 'duration'
  | 'bytes';

export interface DashboardDataSource {
  type:
    | 'collection'
    | 'saved_view'
    | 'query'
    | 'folder'
    | 'tag'
    | 'tasks'
    | 'references'
    | 'temporal'
    | 'review'
    | 'vault_metadata';
  collectionId?: string;
  viewId?: string;
  query?: string;
  folderId?: string | null;
  tag?: string;
  taskFilter?: 'all' | 'open' | 'completed' | 'overdue';
  referenceFilter?: 'all' | 'with_pdf' | 'missing_pdf';
  activityType?: 'created' | 'edited' | 'tasks_completed' | 'captures';
  reviewMetric?: 'due_cards' | 'reviews_per_day' | 'card_states' | 'retention';
  metaField?: 'notes' | 'storage' | 'orphans' | 'attachments' | 'broken_links' | 'word_count';
}

export interface DashboardFilter {
  id: string;
  type: 'date_range' | 'property' | 'tag' | 'folder' | 'collection';
  field?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value?: any;
  dateRange?: {
    start?: string;
    end?: string;
    relativePreset?: RelativeDatePreset;
  };
}

export interface VisualizationDefinition {
  chartType?: DashboardChartType;
  metricAggregation?: MetricAggregationType;
  groupByField?: string; // Property ID or system field like 'folder', 'tag', 'status', 'created_month'
  dateBucket?: DateBucketUnit;
  measureField?: string; // Numeric property ID or count target
  denominatorMeasureField?: string; // For ratio calculation
  format?: ValueFormat;
  currencyCode?: string; // e.g. 'USD', 'EUR', 'GBP'
  decimalPlaces?: number;
  limit?: number; // Top N items
  showOther?: boolean; // Group remainder as 'Other'
  sortBy?: 'value_desc' | 'value_asc' | 'label_asc' | 'label_desc';
  cumulative?: boolean;
  fillEmptyBuckets?: boolean;
  colorPalette?: 'indigo' | 'amber' | 'emerald' | 'rose' | 'teal' | 'purple' | 'neutral';
  trendComparison?: {
    relativeWindow: 'last_week' | 'last_month' | 'last_year';
    label?: string;
  };
}

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  title: string;
  description?: string;
  size: WidgetSize;
  source: DashboardDataSource;
  visualization: VisualizationDefinition;
  filters?: DashboardFilter[];
  textContent?: string; // For static text notes
  noteEmbedId?: string; // For note transclusions
  options?: Record<string, unknown>;
}

export interface DashboardLayout {
  columns: number; // default 12
  widgetOrder: string[];
  widgetSizes?: Record<string, WidgetSize>;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  widgets: DashboardWidget[];
  globalFilters?: DashboardFilter[];
  layout: DashboardLayout;
  createdAt: string;
  updatedAt: string;
}

export interface AggregatedDataPoint {
  label: string;
  key: string;
  value: number;
  formattedValue: string;
  percentage?: number;
  color?: string;
  sourceItemIds: string[]; // Deterministic Note / task / reference IDs for 100% accurate drill-down
}

export interface TableRowItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  date?: string;
  tags?: string[];
  folderName?: string;
  rawItem?: any;
}

export interface AggregationResult {
  widgetId: string;
  metricValue?: number;
  formattedMetric?: string;
  trendValue?: number;
  formattedTrend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  series: AggregatedDataPoint[];
  tableRows?: TableRowItem[];
  totalCount: number;
  executionTimeMs: number;
  error?: string;
}

export interface DrillDownModalState {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  sourceType: string;
  items: TableRowItem[];
}

export interface DashboardReportSnapshot {
  dashboardId: string;
  dashboardName: string;
  exportedAt: string;
  globalFiltersApplied: DashboardFilter[];
  widgets: Array<{
    title: string;
    type: DashboardWidgetType;
    metric?: { value: string; trend?: string };
    dataPoints?: Array<{ label: string; value: string; percentage?: string }>;
    tableRows?: Array<{ title: string; subtitle?: string; value?: string }>;
    textContent?: string;
  }>;
}
