import React, { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { Note, Folder } from '../../types';
import { KanbanBoardDef, KanbanColumnDef, UNASSIGNED_COLUMN_ID } from '../../pkm/kanbanTypes';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  column: KanbanColumnDef;
  notes: Note[];
  board: KanbanBoardDef;
  allColumns: KanbanColumnDef[];
  folders: Folder[];
  isUnassigned?: boolean;
  onOpenNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveToColumn: (noteId: string, targetColId: string) => void;
  onDropNote: (noteId: string, targetColId: string, insertIndex: number) => void;
  onQuickAddNote: (column: KanbanColumnDef, isUnassigned: boolean) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  notes,
  board,
  allColumns,
  folders,
  isUnassigned = false,
  onOpenNote,
  onUpdateNote,
  onDeleteNote,
  onMoveToColumn,
  onDropNote,
  onQuickAddNote,
}) => {
  const [isOver, setIsOver] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isLimitExceeded = Boolean(column.limit && notes.length > column.limit);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if actually leaving this column container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOver(false);
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    setDragOverIndex(null);

    let noteId = e.dataTransfer.getData('text/plain');
    const jsonStr = e.dataTransfer.getData('application/json');
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.noteId) noteId = parsed.noteId;
      } catch {
        // Fallback to text/plain
      }
    }

    if (!noteId) return;

    // Calculate drop index based on mouse position relative to card elements
    const targetColId = column.id;
    const finalIndex = dragOverIndex !== null ? dragOverIndex : notes.length;
    onDropNote(noteId, targetColId, finalIndex);
  };

  return (
    <div
      id={`kanban-column-${column.id}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col flex-shrink-0 w-72 sm:w-80 max-h-full rounded-2xl border transition-all duration-150 ${
        isOver
          ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 ring-2 ring-amber-400/30'
          : 'bg-stone-100/80 dark:bg-[#141418] border-stone-200/90 dark:border-stone-800/90'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-stone-200/80 dark:border-stone-800/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Accent Color Pip */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
            style={{ backgroundColor: column.color || (isUnassigned ? '#a8a29e' : '#f59e0b') }}
          />

          <h3 className="font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-100 truncate">
            {column.title}
          </h3>

          {/* Counter Badge */}
          <span
            className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
              isLimitExceeded
                ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800'
                : 'bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {notes.length}
            {column.limit ? ` / ${column.limit}` : ''}
          </span>
        </div>

        {/* Header Quick Add Button */}
        <div className="flex items-center gap-1 shrink-0">
          {isLimitExceeded && (
            <span
              title={`WIP Limit Exceeded (${notes.length} / ${column.limit})`}
              className="text-red-500"
            >
              <AlertCircle className="w-4 h-4" />
            </span>
          )}

          <button
            onClick={() => onQuickAddNote(column, isUnassigned)}
            className="p-1 rounded-lg text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-700/80 transition-colors"
            title={`Add note to ${column.title}`}
            aria-label={`Add note to ${column.title}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Column Cards Stream (Vertical Scrollable) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[140px]">
        {notes.map((note, index) => (
          <div
            key={note.id}
            onDragOver={(e) => {
              e.stopPropagation();
              setDragOverIndex(index);
            }}
          >
            <KanbanCard
              note={note}
              board={board}
              currentColumnId={column.id}
              allColumns={allColumns}
              folders={folders}
              onOpenNote={onOpenNote}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              onMoveToColumn={onMoveToColumn}
              onDragStart={(e, nId, sId) => {
                // Pass through
              }}
              onDragEnd={() => {
                setIsOver(false);
                setDragOverIndex(null);
              }}
            />
          </div>
        ))}

        {/* Empty Drop Zone State */}
        {notes.length === 0 && (
          <div
            onClick={() => onQuickAddNote(column, isUnassigned)}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300/80 dark:border-stone-800 rounded-xl text-stone-400 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-500/5 transition-all cursor-pointer select-none text-center"
          >
            <Plus className="w-5 h-5 mb-1.5 stroke-[1.5] text-stone-400" />
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              No notes in this column
            </p>
            <span className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">
              Drop cards here or click to create
            </span>
          </div>
        )}
      </div>

      {/* Column Footer Quick Add */}
      <div className="p-2 border-t border-stone-200/80 dark:border-stone-800/80 shrink-0">
        <button
          onClick={() => onQuickAddNote(column, isUnassigned)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/70 dark:hover:bg-stone-800/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Note</span>
        </button>
      </div>
    </div>
  );
};
