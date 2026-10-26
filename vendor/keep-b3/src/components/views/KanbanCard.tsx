import React, { useState, useRef } from 'react';
import {
  GripVertical,
  CheckSquare,
  Image as ImageIcon,
  Mic,
  Lock,
  Pin,
  Star,
  Folder as FolderIcon,
  Clock,
  ArrowRight,
  MoreVertical,
  Trash2,
  Archive,
  Edit3,
} from 'lucide-react';
import { Note, Folder, NoteColorKey, NotePriority } from '../../types';
import { KanbanBoardDef, KanbanColumnDef, UNASSIGNED_COLUMN_ID } from '../../pkm/kanbanTypes';
import { extractCardChecklistStats } from '../../pkm/kanban';
import { formatRelativeTime } from '../../utils/date';

interface KanbanCardProps {
  note: Note;
  board: KanbanBoardDef;
  currentColumnId: string;
  allColumns: KanbanColumnDef[];
  folders: Folder[];
  onOpenNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveToColumn: (noteId: string, targetColId: string) => void;
  onDragStart: (e: React.DragEvent, noteId: string, sourceColId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  note,
  board,
  currentColumnId,
  allColumns,
  folders,
  onOpenNote,
  onUpdateNote,
  onDeleteNote,
  onMoveToColumn,
  onDragStart,
  onDragEnd,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Folder info
  const folder = folders.find((f) => f.id === note.folderId);

  // Checklist stats
  const checklistStats = extractCardChecklistStats(note);

  // Pipeline tags belonging to this board
  const boardPipelineTags = board.sourceType === 'tag'
    ? allColumns.map((c) => (c.value || '').toLowerCase().replace(/^#/, ''))
    : [];

  const priorityColors: Record<NotePriority, { bg: string; text: string; border: string }> = {
    urgent: {
      bg: 'bg-red-50 dark:bg-red-950/50',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
    },
    high: {
      bg: 'bg-orange-50 dark:bg-orange-950/50',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
    },
    medium: {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
    },
    low: {
      bg: 'bg-stone-50 dark:bg-stone-800/60',
      text: 'text-stone-600 dark:text-stone-400',
      border: 'border-stone-200 dark:border-stone-700',
    },
  };

  // Preview snippet
  const snippet = React.useMemo(() => {
    if (note.type === 'checklist' && note.checklist?.length) {
      return note.checklist.slice(0, 2).map((item) => `${item.completed ? '✓' : '○'} ${item.text}`).join(' · ');
    }
    if (note.content) {
      const clean = note.content.replace(/#+\s/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim();
      return clean.length > 90 ? clean.slice(0, 90) + '…' : clean;
    }
    return '';
  }, [note.content, note.type, note.checklist]);

  const handleDragStartInternal = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', note.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ noteId: note.id, sourceColId: currentColumnId }));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(e, note.id, currentColumnId);
  };

  const handleDragEndInternal = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragEnd(e);
  };

  return (
    <div
      id={`kanban-card-${note.id}`}
      draggable
      onDragStart={handleDragStartInternal}
      onDragEnd={handleDragEndInternal}
      onClick={() => onOpenNote(note)}
      className={`group relative bg-white dark:bg-[#1c1c22] border rounded-xl p-3 shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer select-none ${
        isDragging
          ? 'opacity-40 scale-95 border-amber-500 ring-2 ring-amber-400/40'
          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
      }`}
    >
      {/* Card Header: Drag Handle & Quick Actions */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="p-1 -ml-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
            title="Drag to reorder or move"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          <h4 className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
            {note.title.trim() || 'Untitled Note'}
          </h4>
        </div>

        {/* Right Header Status Indicators & Menu */}
        <div className="flex items-center gap-1 shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
          {note.pinned && (
            <span title="Pinned note" className="text-amber-500">
              <Pin className="w-3 h-3 fill-amber-500" />
            </span>
          )}
          {note.isFavorite && (
            <span title="Favorite note" className="text-amber-400">
              <Star className="w-3 h-3 fill-amber-400" />
            </span>
          )}
          {note.isLocked && (
            <span title="Protected Note" className="text-stone-400">
              <Lock className="w-3 h-3" />
            </span>
          )}

          {/* Card Context Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Card options"
              aria-label="Card options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 p-1 bg-white dark:bg-[#18181c] border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenNote(note);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-left font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5 text-stone-400" /> Open Note
                </button>

                {/* Move to Column Submenu */}
                <div className="border-t border-stone-100 dark:border-stone-800 my-1 pt-1">
                  <span className="px-2.5 py-1 text-[10px] uppercase font-bold text-stone-600 dark:text-stone-300 block">
                    Move to Column
                  </span>
                  {allColumns.map((col) => (
                    <button
                      key={col.id}
                      disabled={col.id === currentColumnId}
                      onClick={() => {
                        setShowMenu(false);
                        onMoveToColumn(note.id, col.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-left text-xs ${
                        col.id === currentColumnId
                          ? 'opacity-40 cursor-not-allowed text-stone-400'
                          : 'text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 font-medium'
                      }`}
                    >
                      <span className="truncate">{col.title}</span>
                      <ArrowRight className="w-3 h-3 ml-1 shrink-0" />
                    </button>
                  ))}
                  {board.includeUnassigned && currentColumnId !== UNASSIGNED_COLUMN_ID && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onMoveToColumn(note.id, UNASSIGNED_COLUMN_ID);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-left text-xs"
                    >
                      <span className="truncate">{board.unassignedTitle || 'Unassigned'}</span>
                      <ArrowRight className="w-3 h-3 ml-1 shrink-0" />
                    </button>
                  )}
                </div>

                <div className="border-t border-stone-100 dark:border-stone-800 my-1 pt-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onUpdateNote({ ...note, archived: !note.archived });
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-left"
                  >
                    <Archive className="w-3.5 h-3.5 text-stone-400" />
                    {note.archived ? 'Unarchive' : 'Archive'}
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteNote(note.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Move to Trash
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Snippet Preview */}
      {snippet && (
        <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed mb-2.5">
          {snippet}
        </p>
      )}

      {/* Checklist Progress Bar */}
      {checklistStats && (
        <div className="mb-2.5 p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] font-medium text-stone-600 dark:text-stone-300 mb-1">
            <span className="flex items-center gap-1 font-semibold text-stone-700 dark:text-stone-200">
              <CheckSquare className="w-3 h-3 text-amber-500" />
              Tasks
            </span>
            <span>
              {checklistStats.completed}/{checklistStats.total} ({checklistStats.percent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                checklistStats.percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${checklistStats.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Card Metadata Chips (Tags, Priority, Folder) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {/* Priority Badge */}
        {note.priority && priorityColors[note.priority] && (
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${priorityColors[note.priority].bg} ${priorityColors[note.priority].text} ${priorityColors[note.priority].border}`}
          >
            {note.priority}
          </span>
        )}

        {/* Folder Badge */}
        {folder && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 text-[10px] font-medium border border-stone-200 dark:border-stone-700 truncate max-w-[120px]">
            <FolderIcon className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{folder.name}</span>
          </span>
        )}

        {/* Tags */}
        {note.tags &&
          note.tags.map((tag) => {
            const isPipelineTag = boardPipelineTags.includes(tag.toLowerCase());
            return (
              <span
                key={tag}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                  isPipelineTag
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                }`}
              >
                #{tag}
              </span>
            );
          })}
      </div>

      {/* Card Footer: Timestamps and Media icons */}
      <div className="flex items-center justify-between text-[10px] text-stone-600 dark:text-stone-300 border-t border-stone-100 dark:border-stone-800/80 pt-1.5 mt-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-stone-400 dark:text-stone-300" />
          <span>{formatRelativeTime(note.updatedAt || note.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2 text-stone-400">
          {note.images && note.images.length > 0 && (
            <span className="flex items-center gap-0.5" title={`${note.images.length} image(s)`}>
              <ImageIcon className="w-3 h-3" />
              <span>{note.images.length}</span>
            </span>
          )}
          {note.audios && note.audios.length > 0 && (
            <span className="flex items-center gap-0.5" title={`${note.audios.length} audio clip(s)`}>
              <Mic className="w-3 h-3" />
              <span>{note.audios.length}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
