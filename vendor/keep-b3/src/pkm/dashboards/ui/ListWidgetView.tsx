import React from 'react';
import { AggregationResult, DashboardWidget } from '../dashboardTypes';
import { List, ExternalLink } from 'lucide-react';

interface ListWidgetViewProps {
  widget: DashboardWidget;
  result: AggregationResult;
  onOpenResource: (id: string, title: string) => void;
}

export const ListWidgetView: React.FC<ListWidgetViewProps> = ({
  widget,
  result,
  onOpenResource,
}) => {
  const rows = result.tableRows || [];

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-stone-400 dark:text-stone-500 text-xs">
        <List className="w-5 h-5 mb-1.5 opacity-40 stroke-1" />
        No list items to display
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-stone-100 dark:divide-stone-800 text-xs">
      {rows.map((item, idx) => (
        <div
          key={item.id || idx}
          onClick={() => onOpenResource(item.id, item.title)}
          className="group flex items-center justify-between py-2 px-1 hover:bg-stone-50 dark:hover:bg-stone-800/40 rounded cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="text-[10px] font-mono text-stone-400 w-4">{idx + 1}.</span>
            <span className="font-medium text-stone-800 dark:text-stone-200 truncate">{item.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {item.value && <span className="text-[11px] font-mono text-stone-500">{item.value}</span>}
            <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ))}
    </div>
  );
};
