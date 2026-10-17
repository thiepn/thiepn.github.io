import React, { useState } from 'react';
import { X, Plus, Trash2, Tag, Folder as FolderIcon, Flame, ListOrdered, Palette, Check } from 'lucide-react';
import { KanbanBoardDef, KanbanColumnDef, KanbanSourceType, DEFAULT_KANBAN_BOARDS } from '../../pkm/kanbanTypes';
import { Folder } from '../../types';

interface KanbanBoardModalProps {
  board: KanbanBoardDef | null;
  allBoards: KanbanBoardDef[];
  folders: Folder[];
  isOpen: boolean;
  onClose: () => void;
  onSaveBoard: (updatedBoard: KanbanBoardDef) => void;
  onDeleteBoard: (boardId: string) => void;
}

const PRESET_COLORS = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export const KanbanBoardModal: React.FC<KanbanBoardModalProps> = ({
  board,
  allBoards,
  folders,
  isOpen,
  onClose,
  onSaveBoard,
  onDeleteBoard,
}) => {
  if (!isOpen) return null;

  const isCreatingNew = !board;

  const [name, setName] = useState(board?.name || 'My New Board');
  const [description, setDescription] = useState(board?.description || '');
  const [sourceType, setSourceType] = useState<KanbanSourceType>(board?.sourceType || 'tag');
  const [columns, setColumns] = useState<KanbanColumnDef[]>(
    board?.columns
      ? [...board.columns]
      : [
          { id: `col-${Date.now()}-1`, title: 'To Do', value: 'todo', color: '#f59e0b' },
          { id: `col-${Date.now()}-2`, title: 'In Progress', value: 'doing', color: '#3b82f6' },
          { id: `col-${Date.now()}-3`, title: 'Completed', value: 'done', color: '#10b981' },
        ]
  );
  const [includeUnassigned, setIncludeUnassigned] = useState(board?.includeUnassigned ?? true);
  const [unassignedTitle, setUnassignedTitle] = useState(board?.unassignedTitle || 'Unassigned Notes');

  const isPresetBoard = DEFAULT_KANBAN_BOARDS.some((b) => b.id === board?.id);

  const handleAddColumn = () => {
    const newCol: KanbanColumnDef = {
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `Column ${columns.length + 1}`,
      value: sourceType === 'tag' ? `tag-${columns.length + 1}` : `value-${columns.length + 1}`,
      color: PRESET_COLORS[columns.length % PRESET_COLORS.length],
    };
    setColumns([...columns, newCol]);
  };

  const handleRemoveColumn = (colId: string) => {
    setColumns(columns.filter((c) => c.id !== colId));
  };

  const handleUpdateColumn = (colId: string, updates: Partial<KanbanColumnDef>) => {
    setColumns(columns.map((c) => (c.id === colId ? { ...c, ...updates } : c)));
  };

  const handleSave = () => {
    const targetId = board?.id || `board-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const saved: KanbanBoardDef = {
      id: targetId,
      name: name.trim() || 'Untitled Board',
      description: description.trim(),
      sourceType,
      columns,
      includeUnassigned,
      unassignedTitle: unassignedTitle.trim() || 'Unassigned Notes',
      customOrder: board?.customOrder || {},
      filters: board?.filters || { includeArchived: false },
      createdAt: board?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveBoard(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-[#18181c] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              {isCreatingNew ? 'Create Kanban Board' : `Customize "${name}"`}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Configure columns, metadata sources, and workflow pipelines
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
          {/* Board Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Board Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sprint Tasks, Project Pipeline"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of this board workflow"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Workflow Source Type */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Column Source Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'tag', label: 'Tags Pipeline', icon: <Tag className="w-4 h-4 text-amber-500" /> },
                { type: 'folder', label: 'Folders', icon: <FolderIcon className="w-4 h-4 text-indigo-500" /> },
                { type: 'priority', label: 'Priority Matrix', icon: <Flame className="w-4 h-4 text-red-500" /> },
                { type: 'status', label: 'Status Flow', icon: <ListOrdered className="w-4 h-4 text-purple-500" /> },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setSourceType(item.type as KanbanSourceType)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    sourceType === item.type
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 font-bold ring-1 ring-amber-500'
                      : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300'
                  }`}
                >
                  <div className="mb-1.5">{item.icon}</div>
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Columns Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-stone-700 dark:text-stone-300">
                Columns Configuration ({columns.length})
              </label>
              {sourceType !== 'folder' && (
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Column
                </button>
              )}
            </div>

            {sourceType === 'folder' ? (
              <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400">
                Folder columns are automatically generated from your active folders ({folders.length} folder{folders.length === 1 ? '' : 's'}). Moving cards across columns automatically moves notes between folders.
              </div>
            ) : (
              <div className="space-y-2">
                {columns.map((col, idx) => (
                  <div
                    key={col.id}
                    className="flex items-center gap-2 p-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl"
                  >
                    {/* Color dot */}
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow-2xs cursor-pointer"
                      style={{ backgroundColor: col.color || '#f59e0b' }}
                      title="Column accent color"
                    />

                    {/* Column Title */}
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => handleUpdateColumn(col.id, { title: e.target.value })}
                      placeholder="Column title"
                      className="flex-1 min-w-0 px-2 py-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                    />

                    {/* Tag / Value binding */}
                    <div className="flex items-center gap-1 shrink-0 w-28 sm:w-32">
                      <span className="text-stone-400 text-xs">{sourceType === 'tag' ? '#' : ''}</span>
                      <input
                        type="text"
                        value={col.value}
                        onChange={(e) => handleUpdateColumn(col.id, { value: e.target.value.replace(/^#/, '') })}
                        placeholder={sourceType === 'tag' ? 'tag-name' : 'value'}
                        className="w-full px-2 py-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono"
                      />
                    </div>

                    {/* WIP Limit */}
                    <input
                      type="number"
                      value={col.limit || ''}
                      onChange={(e) =>
                        handleUpdateColumn(col.id, {
                          limit: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                      placeholder="WIP"
                      title="WIP limit (optional)"
                      className="w-14 px-2 py-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs text-center"
                    />

                    {/* Delete Column button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(col.id)}
                      disabled={columns.length <= 1}
                      className="p-1 text-stone-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                      title="Remove column"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unassigned Column Settings */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeUnassigned}
                onChange={(e) => setIncludeUnassigned(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
              />
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                Include Unassigned / Unmatched Notes Column
              </span>
            </label>

            {includeUnassigned && (
              <div className="pl-6">
                <input
                  type="text"
                  value={unassignedTitle}
                  onChange={(e) => setUnassignedTitle(e.target.value)}
                  placeholder="Unassigned Column Title"
                  className="w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div>
            {!isCreatingNew && !isPresetBoard && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${name}"?`)) {
                    onDeleteBoard(board.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Board
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" /> Save Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
