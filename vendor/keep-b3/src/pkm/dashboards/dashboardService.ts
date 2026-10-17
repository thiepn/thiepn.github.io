/**
 * Dashboard & Knowledge Analytics Service for Phase P44
 * 
 * Manages Dashboard configurations, templates, deterministic layout persistence,
 * CSV and Static Report generation, and Git-compatible serialization.
 * CRITICAL RULE: Deleting a dashboard or widget NEVER deletes canonical notes or collections.
 */

import {
  Dashboard,
  DashboardWidget,
  DashboardReportSnapshot,
  AggregationResult,
} from './dashboardTypes';
import { aggregationService, AggregationContext } from './aggregationService';

const DASHBOARDS_STORAGE_KEY = 'pkm_dashboards_v1';

export class DashboardService {
  private dashboards: Map<string, Dashboard> = new Map();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Loads dashboards from local storage, seeding default starter templates if empty
   */
  public loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(DASHBOARDS_STORAGE_KEY);
      if (raw) {
        const list: Dashboard[] = JSON.parse(raw);
        this.dashboards.clear();
        list.forEach((d) => this.dashboards.set(d.id, d));
        this.initialized = true;
        return;
      }
    } catch (e) {
      console.warn('Failed to parse saved dashboards, seeding defaults:', e);
    }

    // Seed defaults if no dashboards exist
    this.seedDefaultDashboards();
    this.saveToStorage();
    this.initialized = true;
  }

  /**
   * Persists dashboard configurations to local storage
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const list = Array.from(this.dashboards.values());
      localStorage.setItem(DASHBOARDS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save dashboards to localStorage:', e);
    }
  }

  /**
   * Returns all available dashboards
   */
  public getAllDashboards(): Dashboard[] {
    if (!this.initialized) this.loadFromStorage();
    return Array.from(this.dashboards.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /**
   * Retrieves a single dashboard by ID
   */
  public getDashboard(id: string): Dashboard | undefined {
    if (!this.initialized) this.loadFromStorage();
    return this.dashboards.get(id);
  }

  /**
   * Saves or updates a dashboard configuration
   */
  public saveDashboard(dashboard: Dashboard): void {
    dashboard.updatedAt = new Date().toISOString();
    this.dashboards.set(dashboard.id, dashboard);
    this.saveToStorage();
  }

  /**
   * Creates a new empty or templated dashboard
   */
  public createDashboard(name: string, description?: string, icon?: string): Dashboard {
    const newDash: Dashboard = {
      id: `dash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || 'New Dashboard',
      description: description || '',
      icon: icon || 'LayoutDashboard',
      widgets: [],
      globalFilters: [],
      layout: {
        columns: 12,
        widgetOrder: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveDashboard(newDash);
    return newDash;
  }

  /**
   * Duplicates a dashboard without duplicating any source notes
   */
  public duplicateDashboard(id: string): Dashboard | undefined {
    const orig = this.getDashboard(id);
    if (!orig) return undefined;

    const copy: Dashboard = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `dash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${orig.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Re-key widget IDs to prevent collisions
    copy.widgets.forEach((w) => {
      w.id = `widget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    });
    copy.layout.widgetOrder = copy.widgets.map((w) => w.id);

    this.saveDashboard(copy);
    return copy;
  }

  /**
   * Deletes a dashboard. Never deletes underlying canonical notes.
   */
  public deleteDashboard(id: string): boolean {
    const exists = this.dashboards.delete(id);
    if (exists) {
      this.saveToStorage();
    }
    return exists;
  }

  /**
   * Adds a widget to a dashboard
   */
  public addWidget(dashboardId: string, widget: DashboardWidget): void {
    const dash = this.getDashboard(dashboardId);
    if (!dash) return;

    dash.widgets.push(widget);
    if (!dash.layout.widgetOrder.includes(widget.id)) {
      dash.layout.widgetOrder.push(widget.id);
    }
    this.saveDashboard(dash);
  }

  /**
   * Updates an existing widget inside a dashboard
   */
  public updateWidget(dashboardId: string, widget: DashboardWidget): void {
    const dash = this.getDashboard(dashboardId);
    if (!dash) return;

    const idx = dash.widgets.findIndex((w) => w.id === widget.id);
    if (idx >= 0) {
      dash.widgets[idx] = widget;
      this.saveDashboard(dash);
    }
  }

  /**
   * Removes a widget from a dashboard
   */
  public deleteWidget(dashboardId: string, widgetId: string): void {
    const dash = this.getDashboard(dashboardId);
    if (!dash) return;

    dash.widgets = dash.widgets.filter((w) => w.id !== widgetId);
    dash.layout.widgetOrder = dash.layout.widgetOrder.filter((id) => id !== widgetId);
    this.saveDashboard(dash);
  }

  /**
   * Reorders widgets in a dashboard
   */
  public reorderWidgets(dashboardId: string, newOrder: string[]): void {
    const dash = this.getDashboard(dashboardId);
    if (!dash) return;

    dash.layout.widgetOrder = newOrder;
    this.saveDashboard(dash);
  }

  /**
   * Exports an individual widget's aggregated data to a standard CSV string
   */
  public exportWidgetDataToCSV(widget: DashboardWidget, result: AggregationResult): string {
    const lines: string[] = [];

    // Header line
    if (widget.type === 'metric') {
      lines.push('Metric,Value,Total Records');
      lines.push(`"${widget.title}","${result.formattedMetric || result.metricValue || 0}",${result.totalCount}`);
    } else if (result.series && result.series.length > 0) {
      lines.push('Label,Value,Percentage');
      result.series.forEach((dp) => {
        lines.push(`"${dp.label.replace(/"/g, '""')}",${dp.value},"${dp.percentage || 0}%"`);
      });
    } else if (result.tableRows && result.tableRows.length > 0) {
      lines.push('Title,Subtitle,Value,Date');
      result.tableRows.forEach((row) => {
        lines.push(
          `"${(row.title || '').replace(/"/g, '""')}","${(row.subtitle || '').replace(/"/g, '""')}","${(row.value || '').replace(/"/g, '""')}","${row.date || ''}"`
        );
      });
    } else {
      lines.push('Result');
      lines.push(`Total Count: ${result.totalCount}`);
    }

    return lines.join('\n');
  }

  /**
   * Generates a static printable / exportable Report Snapshot of a Dashboard
   */
  public async generateReportSnapshot(
    dashboard: Dashboard,
    ctx: AggregationContext
  ): Promise<DashboardReportSnapshot> {
    const widgetSnapshots = await Promise.all(
      dashboard.widgets.map(async (w) => {
        const res = await aggregationService.aggregateWidget(w, ctx);
        return {
          title: w.title,
          type: w.type,
          metric: w.type === 'metric' ? { value: res.formattedMetric || '0', trend: res.formattedTrend } : undefined,
          dataPoints: res.series.map((s) => ({
            label: s.label,
            value: s.formattedValue,
            percentage: s.percentage ? `${s.percentage}%` : undefined,
          })),
          tableRows: res.tableRows?.map((r) => ({
            title: r.title,
            subtitle: r.subtitle,
            value: r.value,
          })),
          textContent: w.textContent,
        };
      })
    );

    return {
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
      exportedAt: new Date().toLocaleString(),
      globalFiltersApplied: ctx.globalFilters || [],
      widgets: widgetSnapshots,
    };
  }

  /**
   * Seeds default starter templates
   */
  private seedDefaultDashboards(): void {
    const vaultOverview: Dashboard = {
      id: 'dash-vault-overview',
      name: 'Vault Overview & Knowledge Analytics',
      description: 'Comprehensive operational telemetry across your notes, storage, and links',
      icon: 'PieChart',
      widgets: [
        {
          id: 'w-vault-notes-count',
          type: 'metric',
          title: 'Total Canonical Notes',
          size: 'small',
          source: { type: 'vault_metadata' },
          visualization: {
            metricAggregation: 'count',
            format: 'integer',
            colorPalette: 'amber',
          },
        },
        {
          id: 'w-vault-storage',
          type: 'metric',
          title: 'Estimated Storage Footprint',
          size: 'small',
          source: { type: 'vault_metadata' },
          visualization: {
            metricAggregation: 'sum',
            measureField: 'bytes',
            format: 'bytes',
            colorPalette: 'teal',
          },
        },
        {
          id: 'w-vault-orphans',
          type: 'metric',
          title: 'Orphan Notes',
          size: 'small',
          source: { type: 'vault_metadata' },
          visualization: {
            metricAggregation: 'count',
            format: 'integer',
            colorPalette: 'rose',
          },
          filters: [
            {
              id: 'f-orphan',
              type: 'property',
              field: 'isOrphan',
              operator: 'equals',
              value: true,
            },
          ],
        },
        {
          id: 'w-vault-growth-line',
          type: 'chart',
          title: 'Note Creation Velocity',
          description: 'Chronological trend of note creation per month',
          size: 'medium',
          source: { type: 'temporal', activityType: 'created' },
          visualization: {
            chartType: 'line',
            dateBucket: 'month',
            fillEmptyBuckets: true,
            colorPalette: 'amber',
          },
        },
        {
          id: 'w-vault-folder-bar',
          type: 'chart',
          title: 'Notes Distribution by Folder',
          size: 'medium',
          source: { type: 'vault_metadata' },
          visualization: {
            chartType: 'bar',
            groupByField: 'folder',
            limit: 8,
            showOther: true,
            colorPalette: 'indigo',
          },
        },
      ],
      globalFilters: [],
      layout: {
        columns: 12,
        widgetOrder: [
          'w-vault-notes-count',
          'w-vault-storage',
          'w-vault-orphans',
          'w-vault-growth-line',
          'w-vault-folder-bar',
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const taskDashboard: Dashboard = {
      id: 'dash-task-operations',
      name: 'Task Operations & Execution',
      description: 'Open tasks, overdue items, and task completion metrics',
      icon: 'CheckSquare',
      widgets: [
        {
          id: 'w-tasks-open',
          type: 'metric',
          title: 'Open Tasks',
          size: 'small',
          source: { type: 'tasks', taskFilter: 'open' },
          visualization: {
            metricAggregation: 'count',
            format: 'integer',
            colorPalette: 'amber',
          },
        },
        {
          id: 'w-tasks-overdue',
          type: 'metric',
          title: 'Overdue Items',
          size: 'small',
          source: { type: 'tasks', taskFilter: 'overdue' },
          visualization: {
            metricAggregation: 'count',
            format: 'integer',
            colorPalette: 'rose',
          },
        },
        {
          id: 'w-tasks-completed-count',
          type: 'metric',
          title: 'Completed Tasks',
          size: 'small',
          source: { type: 'tasks', taskFilter: 'completed' },
          visualization: {
            metricAggregation: 'count',
            format: 'integer',
            colorPalette: 'emerald',
          },
        },
        {
          id: 'w-tasks-overdue-table',
          type: 'table',
          title: 'Overdue Task Queue',
          size: 'large',
          source: { type: 'tasks', taskFilter: 'overdue' },
          visualization: {
            limit: 10,
          },
        },
      ],
      globalFilters: [],
      layout: {
        columns: 12,
        widgetOrder: [
          'w-tasks-open',
          'w-tasks-overdue',
          'w-tasks-completed-count',
          'w-tasks-overdue-table',
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const researchDashboard: Dashboard = {
      id: 'dash-research-citations',
      name: 'Research & Literature Analytics',
      description: 'Citations, BibTeX bibliography breakdown, and PDF attachment ratios',
      icon: 'BookOpen',
      widgets: [
        {
          id: 'w-ref-total',
          type: 'metric',
          title: 'Cataloged References',
          size: 'small',
          source: { type: 'references', referenceFilter: 'all' },
          visualization: {
            metricAggregation: 'count',
            format: 'integer',
            colorPalette: 'indigo',
          },
        },
        {
          id: 'w-ref-pdf-ratio',
          type: 'metric',
          title: 'PDF Attachment Ratio',
          size: 'small',
          source: { type: 'references' },
          visualization: {
            metricAggregation: 'ratio',
            measureField: 'hasPdf',
            format: 'percentage',
            colorPalette: 'emerald',
          },
        },
        {
          id: 'w-ref-types-donut',
          type: 'chart',
          title: 'Literature by Type',
          size: 'medium',
          source: { type: 'references' },
          visualization: {
            chartType: 'donut',
            groupByField: 'type',
            limit: 6,
            colorPalette: 'indigo',
          },
        },
        {
          id: 'w-ref-missing-pdf-list',
          type: 'table',
          title: 'References Missing Attached PDFs',
          size: 'medium',
          source: { type: 'references', referenceFilter: 'missing_pdf' },
          visualization: {
            limit: 8,
          },
        },
      ],
      globalFilters: [],
      layout: {
        columns: 12,
        widgetOrder: [
          'w-ref-total',
          'w-ref-pdf-ratio',
          'w-ref-types-donut',
          'w-ref-missing-pdf-list',
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.dashboards.set(vaultOverview.id, vaultOverview);
    this.dashboards.set(taskDashboard.id, taskDashboard);
    this.dashboards.set(researchDashboard.id, researchDashboard);
  }
}

export const dashboardService = new DashboardService();
