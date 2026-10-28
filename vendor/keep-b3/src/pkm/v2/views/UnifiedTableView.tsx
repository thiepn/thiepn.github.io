import React from 'react';
import { ResourceCore } from '../core/resource/resourceCore';
import {
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { getFieldMetadata, FieldMetadata } from '../core/query/fieldRegistry';
import { SortClause } from '../core/query/queryTypes';

export interface UnifiedTableViewProps {
  items: ResourceCore[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: () => void;
  onSelectResource: (id: string) => void;
  visibleColumns?: string[];
  sort?: SortClause[];
  onSortChange?: (sort: SortClause[]) => void;
  onUpdateResourceProperty?: (id: string, field: string, value: any) => void;
}

export const UnifiedTableView: React.FC<UnifiedTableViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
  onSelectResource,
  visibleColumns = ['title', 'type', 'status', 'priority', 'dueDate', 'updatedAt'],
  sort = [],
  onSortChange,
  onUpdateResourceProperty,
}) => {
  const allVisibleSelected = items.length > 0 && items.every((it) => selectedIds.has(it.id));

  const handleColumnSort = (field: string) => {
    if (!onSortChange) return;

    const currentSort = sort.find((s) => s.field === field);
    if (!currentSort) {
      onSortChange([{ field, direction: 'asc' }]);
    } else if (currentSort.direction === 'asc') {
      onSortChange([{ field, direction: 'desc' }]);
    } else {
      onSortChange(sort.filter((s) => s.field !== field));
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-neutral-500 text-sm">
        No resources match the table query.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-neutral-800 rounded-xl bg-neutral-950/60 shadow-sm">
      <table className="w-full text-left text-xs border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-neutral-800 bg-neutral-900/90 text-neutral-400 font-medium">
            {/* Bulk Select Header */}
            <th className="w-10 px-3 py-3 text-center">
              <button
                onClick={onSelectAllVisible}
                className="p-1 hover:text-white rounded transition-colors"
                title="Select all visible"
              >
                {allVisibleSelected ? (
                  <CheckSquare size={16} className="text-amber-400" />
                ) : (
                  <Square size={16} />
                )}
              </button>
            </th>

            {visibleColumns.map((colKey) => {
              const meta = getFieldMetadata(colKey);
              const label = meta?.label || colKey;
              const activeSort = sort.find((s) => s.field === colKey);

              return (
                <th
                  key={colKey}
                  className="px-3 py-3 font-semibold text-neutral-300 select-none hover:text-white transition-colors cursor-pointer"
                  onClick={() => handleColumnSort(colKey)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{label}</span>
                    {activeSort ? (
                      activeSort.direction === 'asc' ? (
                        <ArrowUp size={13} className="text-amber-400" />
                      ) : (
                        <ArrowDown size={13} className="text-amber-400" />
                      )
                    ) : (
                      <ArrowUpDown size={12} className="text-neutral-600 opacity-0 hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
              );
            })}

            <th className="w-12 px-3 py-3 text-right"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-800/80">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);

            return (
              <tr
                key={item.id}
                className={`hover:bg-neutral-900/60 transition-colors group cursor-pointer ${
                  isSelected ? 'bg-amber-500/5' : ''
                }`}
                onClick={() => onSelectResource(item.id)}
              >
                {/* Row Checkbox */}
                <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleSelect(item.id)}
                    className="p-1 text-neutral-500 hover:text-white rounded"
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-amber-400" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </td>

                {/* Data Columns */}
                {visibleColumns.map((colKey) => {
                  const meta = getFieldMetadata(colKey);
                  const rawVal = (item as any)[colKey] !== undefined ? (item as any)[colKey] : item.metadata?.[colKey];

                  if (colKey === 'title') {
                    return (
                      <td key={colKey} className="px-3 py-2.5 font-medium text-white max-w-xs truncate">
                        {item.title || 'Untitled'}
                      </td>
                    );
                  }

                  if (colKey === 'type') {
                    return (
                      <td key={colKey} className="px-3 py-2.5">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                          {item.type}
                        </span>
                      </td>
                    );
                  }

                  if (colKey === 'status') {
                    return (
                      <td key={colKey} className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={rawVal || 'todo'}
                          onChange={(e) => onUpdateResourceProperty?.(item.id, 'status', e.target.value)}
                          className="bg-neutral-900 border border-neutral-700/80 rounded px-2 py-0.5 text-neutral-200 text-xs capitalize focus:outline-none focus:border-amber-500"
                        >
                          {['todo', 'in_progress', 'done', 'active', 'completed', 'reading', 'queue'].map((st) => (
                            <option key={st} value={st}>
                              {st.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  if (colKey === 'priority') {
                    return (
                      <td key={colKey} className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={rawVal || 'medium'}
                          onChange={(e) => onUpdateResourceProperty?.(item.id, 'priority', e.target.value)}
                          className="bg-neutral-900 border border-neutral-700/80 rounded px-2 py-0.5 text-neutral-200 text-xs capitalize focus:outline-none focus:border-amber-500"
                        >
                          {['low', 'medium', 'high', 'urgent'].map((pr) => (
                            <option key={pr} value={pr}>
                              {pr}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  if (colKey === 'dueDate' || colKey === 'createdAt' || colKey === 'updatedAt' || colKey === 'followUpDate') {
                    const display = rawVal ? (typeof rawVal === 'number' ? new Date(rawVal).toISOString().split('T')[0] : String(rawVal)) : '—';
                    return (
                      <td key={colKey} className="px-3 py-2.5 font-mono text-neutral-400">
                        {display}
                      </td>
                    );
                  }

                  if (Array.isArray(rawVal)) {
                    return (
                      <td key={colKey} className="px-3 py-2.5 text-neutral-400">
                        {rawVal.join(', ') || '—'}
                      </td>
                    );
                  }

                  return (
                    <td key={colKey} className="px-3 py-2.5 text-neutral-300">
                      {rawVal !== undefined && rawVal !== null ? String(rawVal) : '—'}
                    </td>
                  );
                })}

                {/* Action Link */}
                <td className="px-3 py-2.5 text-right">
                  <ExternalLink size={13} className="text-neutral-600 group-hover:text-neutral-300 transition-colors ml-auto" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
