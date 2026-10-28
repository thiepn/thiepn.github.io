import React from 'react';
import { AggregationResult, DashboardWidget } from '../dashboardTypes';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';

interface MetricWidgetViewProps {
  widget: DashboardWidget;
  result: AggregationResult;
  onDrillDown: (title: string, subtitle?: string, itemIds?: string[]) => void;
}

export const MetricWidgetView: React.FC<MetricWidgetViewProps> = ({
  widget,
  result,
  onDrillDown,
}) => {
  const vis = widget.visualization;
  const val = result.formattedMetric || String(result.metricValue ?? 0);
  const palette = vis.colorPalette || 'amber';

  const getPaletteClasses = () => {
    switch (palette) {
      case 'indigo':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40';
      case 'emerald':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40';
      case 'rose':
        return 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40';
      case 'teal':
        return 'text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40';
      case 'purple':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40';
      case 'amber':
      default:
        return 'text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40';
    }
  };

  const handleMetricClick = () => {
    const itemIds = result.series?.[0]?.sourceItemIds || [];
    onDrillDown(widget.title, `${val} contributing records`, itemIds);
  };

  return (
    <div
      onClick={handleMetricClick}
      className={`group relative flex flex-col justify-between p-5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${getPaletteClasses()}`}
      role="button"
      tabIndex={0}
      aria-label={`${widget.title}: ${val}. Click to inspect underlying records.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleMetricClick();
        }
      }}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {widget.title}
        </span>
        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity text-stone-400" />
      </div>

      <div className="my-2">
        <div className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {val}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-200/50 dark:border-stone-800/50">
        <span>{result.totalCount} records scoped</span>
        {vis.trendComparison && (
          <span className="flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            {vis.trendComparison.label || 'vs last period'}
          </span>
        )}
      </div>
    </div>
  );
};
