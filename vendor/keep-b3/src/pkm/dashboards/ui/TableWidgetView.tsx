import React from 'react';
import { AggregationResult, DashboardWidget, TableRowItem } from '../dashboardTypes';
import { Table, ExternalLink, Calendar, Tag } from 'lucide-react';

interface TableWidgetViewProps {
  widget: DashboardWidget;
  result: AggregationResult;
  onOpenResource: (id: string, title: string) => void;
}

export const TableWidgetView: React.FC<TableWidgetViewProps> = ({
  widget,
  result,
  onOpenResource,
}) => {
  const rows = result.tableRows || [];

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-36 text-stone-400 dark:text-stone-500 text-xs">
        <Table className="w-6 h-6 mb-1.5 opacity-40 stroke-1" />
        No records found matching this table criteria
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-72 rounded-lg border border-stone-200/80 dark:border-stone-800/80 divide-y divide-stone-100 dark:divide-stone-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 sticky top-0 backdrop-blur-xs">
          <tr>
            <th className="p-2.5 font-medium">Record</th>
            <th className="p-2.5 font-medium">Context</th>
            <th className="p-2.5 font-medium text-right">Value / Due</th>
            <th className="p-2.5 font-medium text-right">Open</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 bg-white dark:bg-stone-900">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onOpenResource(row.id, row.title)}
              className="group hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer transition-colors"
            >
              <td className="p-2.5 font-medium text-stone-900 dark:text-stone-100 max-w-[180px] truncate">
                {row.title}
              </td>
              <td className="p-2.5 text-stone-500 dark:text-stone-400 max-w-[140px] truncate">
                {row.subtitle || (row.tags && row.tags.length > 0 ? `#${row.tags[0]}` : '—')}
              </td>
              <td className="p-2.5 text-right text-stone-600 dark:text-stone-300 font-mono text-[11px]">
                {row.value || row.date || '—'}
              </td>
              <td className="p-2.5 text-right">
                <button
                  type="button"
                  className="text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 p-1"
                  title="Open Note"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
