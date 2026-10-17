import React from 'react';
import { ResourceCore } from '../core/resource/resourceCore';
import {
  CheckSquare,
  Square,
  Plus,
  Calendar,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';

export interface UnifiedBoardViewProps {
  items: ResourceCore[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectResource: (id: string) => void;
  boardField?: string;
  onUpdateResourceProperty?: (id: string, field: string, value: any) => void;
  onCreateResourceInGroup?: (groupValue: string) => void;
}

export const UnifiedBoardView: React.FC<UnifiedBoardViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onSelectResource,
  boardField = 'status',
  onUpdateResourceProperty,
  onCreateResourceInGroup,
}) => {
  // Determine Columns based on board field
  const defaultColumns =
    boardField === 'priority'
      ? ['urgent', 'high', 'medium', 'low']
      : boardField === 'status'
      ? ['todo', 'in_progress', 'done']
      : ['active', 'paused', 'completed'];

  // Group items
  const grouped: Record<string, ResourceCore[]> = {};
  for (const col of defaultColumns) {
    grouped[col] = [];
  }
  grouped['other'] = [];

  for (const item of items) {
    const val = (item as any)[boardField] || item.metadata?.[boardField];
    const key = val && grouped[val] !== undefined ? val : 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    const resourceId = e.dataTransfer.getData('text/plain');
    if (resourceId && onUpdateResourceProperty) {
      onUpdateResourceProperty(resourceId, boardField, targetCol);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 min-h-[500px]">
      {defaultColumns.map((colKey) => {
        const colItems = grouped[colKey] || [];

        return (
          <div
            key={colKey}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, colKey)}
            className="flex-1 min-w-[280px] max-w-sm bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col max-h-[750px] shadow-sm"
          >
            {/* Column Header */}
            <div className="px-3.5 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200 capitalize">
                  {colKey.replace('_', ' ')}
                </span>
                <span className="text-[11px] font-mono bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-700">
                  {colItems.length}
                </span>
              </div>

              {onCreateResourceInGroup && (
                <button
                  onClick={() => onCreateResourceInGroup(colKey)}
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                  title={`Add item to ${colKey}`}
                >
                  <Plus size={14} />
                </button>
              )}
            </div>

            {/* Column Cards */}
            <div className="p-2.5 space-y-2.5 overflow-y-auto grow">
              {colItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-600 italic border border-dashed border-neutral-800/80 rounded-lg">
                  Drop items here
                </div>
              ) : (
                colItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const priority = (item as any).priority || item.metadata?.priority;
                  const dueDate = (item as any).dueDate || item.metadata?.dueDate;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                      onClick={() => onSelectResource(item.id)}
                      className={`p-3 bg-neutral-950 border border-neutral-800 rounded-lg shadow-sm hover:border-neutral-700 transition-all cursor-grab active:cursor-grabbing group ${
                        isSelected ? 'ring-2 ring-amber-500/80 bg-amber-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-neutral-100 group-hover:text-amber-400 transition-colors line-clamp-2">
                          {item.title || 'Untitled'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(item.id);
                          }}
                          className="text-neutral-500 hover:text-white p-0.5 rounded"
                        >
                          {isSelected ? (
                            <CheckSquare size={14} className="text-amber-400" />
                          ) : (
                            <Square size={14} />
                          )}
                        </button>
                      </div>

                      {/* Card Tags / Metadata */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                        <span className="uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                          {item.type}
                        </span>

                        {priority && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-medium border ${
                              priority === 'urgent'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : priority === 'high'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                            }`}
                          >
                            {priority}
                          </span>
                        )}

                        {dueDate && (
                          <span className="flex items-center gap-1 font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 ml-auto">
                            <Calendar size={10} className="text-amber-400" />
                            {dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
