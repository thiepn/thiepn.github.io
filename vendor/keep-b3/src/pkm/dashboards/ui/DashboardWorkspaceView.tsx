import React, { useState, useEffect } from 'react';
import {
  Dashboard,
  DashboardWidget,
  DashboardFilter,
  RelativeDatePreset,
} from '../dashboardTypes';
import { dashboardService } from '../dashboardService';
import { aggregationService, AggregationContext } from '../aggregationService';
import { collectionService } from '../../collections/collectionService';
import { Note, Folder } from '../../../types';
import { WidgetCard } from './WidgetCard';
import { WidgetConfigModal } from './WidgetConfigModal';
import { DashboardDrilldownModal } from './DashboardDrilldownModal';
import { DashboardCenterModal } from './DashboardCenterModal';
import { DashboardReportModal } from './DashboardReportModal';
import {
  LayoutDashboard,
  Plus,
  Edit3,
  Check,
  Calendar,
  RefreshCw,
  FileText,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface DashboardWorkspaceViewProps {
  dashboardId?: string;
  allNotes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onSwitchDashboard?: (id: string, name: string) => void;
}

export const DashboardWorkspaceView: React.FC<DashboardWorkspaceViewProps> = ({
  dashboardId,
  allNotes,
  folders,
  onOpenNote,
  onSwitchDashboard,
}) => {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeDatePreset, setActiveDatePreset] = useState<RelativeDatePreset>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Modals
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Drilldown state
  const [drilldownState, setDrilldownState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    itemIds: string[];
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    itemIds: [],
  });

  // Load active dashboard
  useEffect(() => {
    const list = dashboardService.getAllDashboards();
    if (dashboardId) {
      const found = dashboardService.getDashboard(dashboardId);
      if (found) {
        setDashboard(found);
        return;
      }
    }
    // Default to first dashboard or create default
    if (list.length > 0) {
      setDashboard(list[0]);
    } else {
      const newDash = dashboardService.createDashboard('Vault Overview & Analytics');
      setDashboard(newDash);
    }
  }, [dashboardId]);

  const reloadDashboard = () => {
    if (!dashboard) return;
    const fresh = dashboardService.getDashboard(dashboard.id);
    if (fresh) setDashboard({ ...fresh });
    aggregationService.clearCache();
  };

  // Build Global Filters Context
  const globalFilters: DashboardFilter[] = [];
  if (activeDatePreset !== 'all') {
    globalFilters.push({
      id: 'gf-date',
      type: 'date_range',
      dateRange: { relativePreset: activeDatePreset },
    });
  }
  if (selectedTag) {
    globalFilters.push({
      id: 'gf-tag',
      type: 'tag',
      value: selectedTag,
    });
  }

  const ctx: AggregationContext = {
    allNotes,
    folders,
    globalFilters,
  };

  const handleAddWidget = () => {
    setEditingWidget(null);
    setIsConfigOpen(true);
  };

  const handleEditWidget = (w: DashboardWidget) => {
    setEditingWidget(w);
    setIsConfigOpen(true);
  };

  const handleSaveWidget = (w: DashboardWidget) => {
    if (!dashboard) return;
    if (editingWidget) {
      dashboardService.updateWidget(dashboard.id, w);
    } else {
      dashboardService.addWidget(dashboard.id, w);
    }
    setIsConfigOpen(false);
    setEditingWidget(null);
    reloadDashboard();
  };

  const handleDeleteWidget = (widgetId: string) => {
    if (!dashboard) return;
    dashboardService.deleteWidget(dashboard.id, widgetId);
    reloadDashboard();
  };

  const handleDuplicateWidget = (w: DashboardWidget) => {
    if (!dashboard) return;
    const copy: DashboardWidget = {
      ...JSON.parse(JSON.stringify(w)),
      id: `widget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `${w.title} (Copy)`,
    };
    dashboardService.addWidget(dashboard.id, copy);
    reloadDashboard();
  };

  const handleMoveWidget = (widgetId: string, direction: 'up' | 'down') => {
    if (!dashboard) return;
    const order = [...dashboard.layout.widgetOrder];
    const idx = order.indexOf(widgetId);
    if (idx < 0) return;

    if (direction === 'up' && idx > 0) {
      const temp = order[idx - 1];
      order[idx - 1] = order[idx];
      order[idx] = temp;
      dashboardService.reorderWidgets(dashboard.id, order);
      reloadDashboard();
    } else if (direction === 'down' && idx < order.length - 1) {
      const temp = order[idx + 1];
      order[idx + 1] = order[idx];
      order[idx] = temp;
      dashboardService.reorderWidgets(dashboard.id, order);
      reloadDashboard();
    }
  };

  const handleChangeSize = (widgetId: string, size: any) => {
    if (!dashboard) return;
    const target = dashboard.widgets.find((w) => w.id === widgetId);
    if (target) {
      target.size = size;
      dashboardService.updateWidget(dashboard.id, target);
      reloadDashboard();
    }
  };

  const handleDrillDown = (title: string, subtitle?: string, itemIds?: string[]) => {
    setDrilldownState({
      isOpen: true,
      title,
      subtitle,
      itemIds: itemIds || [],
    });
  };

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-full text-stone-400 text-xs">
        Loading dashboard...
      </div>
    );
  }

  // Ordered list of widgets
  const orderedWidgets = (dashboard.layout.widgetOrder || [])
    .map((id) => dashboard.widgets.find((w) => w.id === id))
    .filter((w): w is DashboardWidget => Boolean(w));

  // Include any widgets not yet in widgetOrder
  dashboard.widgets.forEach((w) => {
    if (!orderedWidgets.some((ow) => ow.id === w.id)) {
      orderedWidgets.push(w);
    }
  });

  return (
    <div className="flex flex-col h-full bg-stone-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-xs shrink-0">
        {/* Left: Dashboard Picker */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCenterOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-xs font-semibold"
          >
            <LayoutDashboard className="w-4 h-4 text-amber-500" />
            <span>{dashboard.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>

        {/* Center: Global Filters */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 dark:bg-stone-800/80 rounded-lg text-stone-600 dark:text-stone-300">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={activeDatePreset}
              onChange={(e) => setActiveDatePreset(e.target.value as RelativeDatePreset)}
              className="bg-transparent border-none text-xs text-stone-800 dark:text-stone-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              aggregationService.clearCache();
              reloadDashboard();
            }}
            className="p-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Refresh Data"
            aria-label="Refresh Dashboard Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-xs font-medium transition-colors border border-stone-200 dark:border-stone-800"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Report Snapshot</span>
          </button>

          {isEditMode ? (
            <>
              <button
                type="button"
                onClick={handleAddWidget}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Widget</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 rounded-lg text-xs font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done Editing</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {orderedWidgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 text-center p-8">
            <LayoutDashboard className="w-12 h-12 text-stone-300 dark:text-stone-700 mb-3 stroke-1" />
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1">
              This dashboard is empty
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mb-4">
              Add metric KPI cards, charts, query tables, or ranked lists to visualize your knowledge base.
            </p>
            <button
              type="button"
              onClick={handleAddWidget}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-medium shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Widget</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-5 max-w-7xl mx-auto">
            {orderedWidgets.map((w) => (
              <WidgetCard
                key={w.id}
                widget={w}
                isEditMode={isEditMode}
                ctx={ctx}
                onEditWidget={handleEditWidget}
                onDeleteWidget={handleDeleteWidget}
                onDuplicateWidget={handleDuplicateWidget}
                onMoveWidget={handleMoveWidget}
                onChangeSize={handleChangeSize}
                onDrillDown={handleDrillDown}
                onOpenResource={onOpenNote}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <DashboardCenterModal
        isOpen={isCenterOpen}
        onClose={() => setIsCenterOpen(false)}
        onOpenDashboard={(id, name) => {
          const fresh = dashboardService.getDashboard(id);
          if (fresh) setDashboard(fresh);
          if (onSwitchDashboard) onSwitchDashboard(id, name);
        }}
      />

      <WidgetConfigModal
        isOpen={isConfigOpen}
        widget={editingWidget}
        collections={collectionService.loadCollections()}
        folders={folders}
        onClose={() => {
          setIsConfigOpen(false);
          setEditingWidget(null);
        }}
        onSave={handleSaveWidget}
      />

      <DashboardDrilldownModal
        isOpen={drilldownState.isOpen}
        title={drilldownState.title}
        subtitle={drilldownState.subtitle}
        itemIds={drilldownState.itemIds}
        allNotes={allNotes}
        onClose={() => setDrilldownState((prev) => ({ ...prev, isOpen: false }))}
        onOpenNote={onOpenNote}
      />

      <DashboardReportModal
        isOpen={isReportOpen}
        dashboard={dashboard}
        ctx={ctx}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};
