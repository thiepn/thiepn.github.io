import React, { useState, useEffect } from 'react';
import {
  DashboardWidget,
  AggregationResult,
  WidgetSize,
} from '../dashboardTypes';
import { aggregationService, AggregationContext } from '../aggregationService';
import { dashboardService } from '../dashboardService';
import { MetricWidgetView } from './MetricWidgetView';
import { ChartWidgetView } from './ChartWidgetView';
import { TableWidgetView } from './TableWidgetView';
import { ListWidgetView } from './ListWidgetView';
import {
  Download,
  Settings,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Maximize2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface WidgetCardProps {
  widget: DashboardWidget;
  isEditMode: boolean;
  ctx: AggregationContext;
  onEditWidget: (widget: DashboardWidget) => void;
  onDeleteWidget: (widgetId: string) => void;
  onDuplicateWidget: (widget: DashboardWidget) => void;
  onMoveWidget: (widgetId: string, direction: 'up' | 'down') => void;
  onChangeSize: (widgetId: string, size: WidgetSize) => void;
  onDrillDown: (title: string, subtitle?: string, itemIds?: string[]) => void;
  onOpenResource: (id: string, title: string) => void;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  widget,
  isEditMode,
  ctx,
  onEditWidget,
  onDeleteWidget,
  onDuplicateWidget,
  onMoveWidget,
  onChangeSize,
  onDrillDown,
  onOpenResource,
}) => {
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute aggregation when widget or ctx changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    aggregationService
      .aggregateWidget(widget, ctx)
      .then((res) => {
        if (!isMounted) return;
        setResult(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || 'Calculation error');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [widget, ctx.allNotes, ctx.folders, ctx.globalFilters]);

  // Size to CSS Grid Column Span
  const getSizeClass = () => {
    switch (widget.size) {
      case 'small':
        return 'col-span-12 sm:col-span-6 lg:col-span-3';
      case 'medium':
        return 'col-span-12 sm:col-span-6 lg:col-span-6';
      case 'large':
        return 'col-span-12 lg:col-span-8';
      case 'full':
      default:
        return 'col-span-12';
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const csvContent = dashboardService.exportWidgetDataToCSV(widget, result);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${widget.title.toLowerCase().replace(/\s+/g, '-')}-data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xs transition-all ${getSizeClass()} ${
        isEditMode ? 'ring-2 ring-amber-500/30' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex flex-col truncate pr-2">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
            {widget.title}
          </h3>
          {widget.description && (
            <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">
              {widget.description}
            </p>
          )}
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1 shrink-0">
          {!isEditMode && result && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Export CSV"
              aria-label="Export Data as CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {isEditMode && (
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => onMoveWidget(widget.id, 'up')}
                className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300"
                title="Move Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveWidget(widget.id, 'down')}
                className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300"
                title="Move Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <select
                value={widget.size}
                onChange={(e) => onChangeSize(widget.id, e.target.value as WidgetSize)}
                className="bg-transparent text-[11px] text-stone-700 dark:text-stone-300 border-none px-1 py-0.5 focus:outline-hidden"
              >
                <option value="small">Small (3 cols)</option>
                <option value="medium">Medium (6 cols)</option>
                <option value="large">Large (8 cols)</option>
                <option value="full">Full (12 cols)</option>
              </select>
              <button
                type="button"
                onClick={() => onEditWidget(widget)}
                className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300"
                title="Configure Widget"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDuplicateWidget(widget)}
                className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300"
                title="Duplicate Widget"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteWidget(widget.id)}
                className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded text-rose-600 dark:text-rose-400"
                title="Delete Widget"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-center min-h-[140px]">
        {loading ? (
          <div className="flex items-center justify-center h-28 text-stone-400 gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>Calculating analytics...</span>
          </div>
        ) : error || result?.error ? (
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error || result?.error}</span>
          </div>
        ) : widget.type === 'text' ? (
          <div className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
            {widget.textContent || 'No text content defined.'}
          </div>
        ) : result ? (
          widget.type === 'metric' ? (
            <MetricWidgetView widget={widget} result={result} onDrillDown={onDrillDown} />
          ) : widget.type === 'chart' ? (
            <ChartWidgetView widget={widget} result={result} onDrillDown={onDrillDown} />
          ) : widget.type === 'table' ? (
            <TableWidgetView widget={widget} result={result} onOpenResource={onOpenResource} />
          ) : widget.type === 'list' ? (
            <ListWidgetView widget={widget} result={result} onOpenResource={onOpenResource} />
          ) : null
        ) : null}
      </div>
    </div>
  );
};
