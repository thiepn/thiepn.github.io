/**
 * PKM V2.19 Unified Dashboard & Widget Engine
 * 
 * Provides layout management, widget isolation, filter propagation,
 * keyboard-friendly reordering, and configuration export/import.
 */

import {
  DashboardDefinition,
  DashboardWidgetConfig,
  DashboardFilterContext,
  DateRangeFilter,
} from './reportingTypes';

export class V2DashboardEngine {
  private static instance: V2DashboardEngine | null = null;
  private dashboards: Map<string, DashboardDefinition> = new Map();

  private constructor() {
    this.createDefaultDashboards();
  }

  public static getInstance(): V2DashboardEngine {
    if (!V2DashboardEngine.instance) {
      V2DashboardEngine.instance = new V2DashboardEngine();
    }
    return V2DashboardEngine.instance;
  }

  private createDefaultDashboards(): void {
    const defaultDash: DashboardDefinition = {
      id: 'dash-overview-main',
      title: 'Personal OS Overview',
      description: 'Unified cross-domain view of active tasks, projects, tracking, and learning.',
      isFavorite: true,
      defaultFilterContext: {
        dateRange: { type: 'this_week' },
      },
      widgets: [
        {
          id: 'w-tasks-open',
          title: 'Open Tasks',
          type: 'number_metric',
          metricId: 'projects_open_tasks_count',
          columnSpan: 1,
          orderIndex: 0,
          ownerModule: 'projects',
        },
        {
          id: 'w-projects-completed',
          title: 'Completed Projects',
          type: 'number_metric',
          metricId: 'projects_completed_count',
          columnSpan: 1,
          orderIndex: 1,
          ownerModule: 'projects',
        },
        {
          id: 'w-learning-time',
          title: 'Study Hours',
          type: 'number_metric',
          metricId: 'learning_study_time_hours',
          columnSpan: 1,
          orderIndex: 2,
          ownerModule: 'learning',
        },
        {
          id: 'w-habit-completion',
          title: 'Habit Completion',
          type: 'number_metric',
          metricId: 'routine_completion_rate',
          columnSpan: 1,
          orderIndex: 3,
          ownerModule: 'tracking',
        },
        {
          id: 'w-tracking-chart',
          title: 'Tracking Metric Trend',
          type: 'chart',
          metricId: 'tracking_metric_average',
          chartType: 'line',
          columnSpan: 2,
          orderIndex: 4,
          ownerModule: 'tracking',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    this.dashboards.set(defaultDash.id, defaultDash);
  }

  // ==========================================================================
  // DASHBOARD CRUD & LIFECYCLE
  // ==========================================================================

  public createDashboard(
    title: string,
    description?: string,
    widgets: DashboardWidgetConfig[] = [],
    filterContext?: DashboardFilterContext
  ): DashboardDefinition {
    const id = `dash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const newDash: DashboardDefinition = {
      id,
      title: title.trim() || 'Untitled Dashboard',
      description,
      defaultFilterContext: filterContext || { dateRange: { type: 'this_month' } },
      widgets,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.dashboards.set(id, newDash);
    return newDash;
  }

  public getDashboard(id: string): DashboardDefinition | undefined {
    return this.dashboards.get(id);
  }

  public getAllDashboards(): DashboardDefinition[] {
    return Array.from(this.dashboards.values());
  }

  public updateDashboard(id: string, updates: Partial<DashboardDefinition>): DashboardDefinition | null {
    const existing = this.dashboards.get(id);
    if (!existing) return null;

    const updated: DashboardDefinition = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };

    this.dashboards.set(id, updated);
    return updated;
  }

  /**
   * Strictly deletes only the derived dashboard arrangement.
   * NEVER deletes underlying canonical Resources or Notes.
   */
  public deleteDashboard(id: string): boolean {
    return this.dashboards.delete(id);
  }

  public duplicateDashboard(id: string): DashboardDefinition | null {
    const existing = this.dashboards.get(id);
    if (!existing) return null;

    const copyTitle = `${existing.title} (Copy)`;
    const newWidgets = existing.widgets.map((w, idx) => ({
      ...w,
      id: `w-${Date.now()}-${idx}`,
    }));

    return this.createDashboard(
      copyTitle,
      existing.description,
      newWidgets,
      { ...existing.defaultFilterContext }
    );
  }

  // ==========================================================================
  // WIDGET REORDERING (KEYBOARD & DRAG ALTERNATIVE)
  // ==========================================================================

  public reorderWidget(dashboardId: string, widgetId: string, direction: 'up' | 'down'): boolean {
    const dash = this.dashboards.get(dashboardId);
    if (!dash) return false;

    const sorted = [...dash.widgets].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = sorted.findIndex((w) => w.id === widgetId);
    if (index === -1) return false;

    if (direction === 'up' && index > 0) {
      const prev = sorted[index - 1];
      const curr = sorted[index];
      const tempOrder = prev.orderIndex;
      prev.orderIndex = curr.orderIndex;
      curr.orderIndex = tempOrder;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      const curr = sorted[index];
      const tempOrder = next.orderIndex;
      next.orderIndex = curr.orderIndex;
      curr.orderIndex = tempOrder;
    } else {
      return false;
    }

    dash.widgets = sorted;
    dash.updatedAt = new Date().toISOString();
    return true;
  }

  // ==========================================================================
  // CONFIGURATION IMPORT / EXPORT & VALIDATION
  // ==========================================================================

  public exportDashboardConfig(id: string): string | null {
    const dash = this.dashboards.get(id);
    if (!dash) return null;

    return JSON.stringify(
      {
        type: 'pkm_dashboard_config',
        version: 1,
        exportedAt: new Date().toISOString(),
        dashboard: dash,
      },
      null,
      2
    );
  }

  public importDashboardConfig(jsonString: string): { success: boolean; dashboard?: DashboardDefinition; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.type !== 'pkm_dashboard_config' || !parsed.dashboard?.title) {
        return { success: false, error: 'Invalid dashboard configuration payload' };
      }

      const d = parsed.dashboard;
      const imported = this.createDashboard(
        d.title,
        d.description,
        Array.isArray(d.widgets) ? d.widgets : [],
        d.defaultFilterContext
      );

      return { success: true, dashboard: imported };
    } catch (err: any) {
      return { success: false, error: `Failed to parse dashboard JSON: ${err?.message || err}` };
    }
  }
}

export const v2DashboardEngine = V2DashboardEngine.getInstance();
