import React from 'react';
import { ResourceCore } from '../core/resource/resourceCore';
import {
  CheckSquare,
  Square,
  Clock,
  Calendar,
  AlertCircle,
  Folder,
  Tag,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { getFieldMetadata } from '../core/query/fieldRegistry';

export interface UnifiedListViewProps {
  items: ResourceCore[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectResource: (id: string) => void;
  visibleColumns?: string[];
}

export const UnifiedListView: React.FC<UnifiedListViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onSelectResource,
  visibleColumns = ['title', 'type', 'status', 'dueDate', 'priority'],
}) => {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-neutral-500 text-sm">
        No resources match the current query and filters.
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-800/80 border-t border-b border-neutral-800 bg-neutral-950/40">
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        const priority = item.priority || item.metadata?.priority;
        const status = item.status || item.metadata?.status;
        const dueDate = item.dueDate || item.metadata?.dueDate;

        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-900/80 transition-colors group cursor-pointer ${
              isSelected ? 'bg-amber-500/5' : ''
            }`}
            onClick={() => onSelectResource(item.id)}
          >
            {/* Selection Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(item.id);
              }}
              className="p-1 text-neutral-500 hover:text-white rounded transition-colors"
            >
              {isSelected ? (
                <CheckSquare size={16} className="text-amber-400" />
              ) : (
                <Square size={16} />
              )}
            </button>

            {/* Type Badge */}
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/60 shrink-0">
              {item.type}
            </span>

            {/* Title */}
            <div className="grow min-w-0 flex items-center gap-2">
              <span className={`text-sm font-medium truncate ${status === 'done' ? 'line-through text-neutral-500' : 'text-neutral-100'}`}>
                {item.title || 'Untitled Resource'}
              </span>

              {item.tags && item.tags.length > 0 && (
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {item.tags.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800"
                    >
                      #{t}
                    </span>
                  ))}
                  {item.tags.length > 2 && (
                    <span className="text-[10px] text-neutral-500">
                      +{item.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Secondary Metadata Pillars */}
            <div className="flex items-center gap-2.5 shrink-0 text-xs text-neutral-400">
              {priority && (
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    priority === 'urgent'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : priority === 'high'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {priority}
                </span>
              )}

              {status && (
                <span className="capitalize px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/80 text-[11px]">
                  {String(status).replace('_', ' ')}
                </span>
              )}

              {dueDate && (
                <span className="hidden md:flex items-center gap-1 font-mono text-[11px] text-neutral-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                  <Calendar size={11} className="text-amber-400" />
                  {dueDate}
                </span>
              )}

              <ChevronRight size={14} className="text-neutral-600 group-hover:text-neutral-300 transition-colors" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
