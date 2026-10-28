import React, { useState, useEffect, useMemo } from 'react';
import {
  Kanban,
  Plus,
  SlidersHorizontal,
  Search,
  Tag,
  Flame,
  Folder as FolderIcon,
  ListOrdered,
  Palette,
  Archive,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { Note, Folder, AppSettings, NotePriority, NoteStatus, NoteColorKey } from '../../types';
import {
  KanbanBoardDef,
  KanbanColumnDef,
  UNASSIGNED_COLUMN_ID,
  DEFAULT_KANBAN_BOARDS,
} from '../../pkm/kanbanTypes';
import {
  loadStoredKanbanBoards,
  saveStoredKanbanBoards,
  loadActiveBoardId,
  saveActiveBoardId,
  resolveBoardColumns,
  getNoteColumnAssignment,
  moveNoteInBoard,
  getOrderedNotesForColumn,
  updateBoardCustomOrder,
  filterBoardNotes,
} from '../../pkm/kanban';
import { KanbanColumn } from './KanbanColumn';
import { KanbanBoardModal } from './KanbanBoardModal';

interface KanbanViewProps {
  notes: Note[];
  allNotes: Note[];
  folders: Folder[];
  settings: AppSettings;
  searchQuery?: string;
  onOpenNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenNewNoteWithAttributes?: (attrs: Partial<Note>) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  notes,
  allNotes,
  folders,
  settings,
  searchQuery = '',
  onOpenNote,
  onUpdateNote,
  onDeleteNote,
  onOpenNewNoteWithAttributes,
}) => {
  // 1. Board definitions state
  const [boards, setBoards] = useState<KanbanBoardDef[]>(() => loadStoredKanbanBoards());
  const [activeBoardId, setActiveBoardId] = useState<string>(() => loadActiveBoardId(boards));

  // 2. In-board live filters (transient unless saved)
  const [inBoardQuery, setInBoardQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [includeArchivedLocal, setIncludeArchivedLocal] = useState(false);

  // 3. Modal controls
  const [isEditingBoardModalOpen, setIsEditingBoardModalOpen] = useState(false);
  const [isCreatingBoardModalOpen, setIsCreatingBoardModalOpen] = useState(false);
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);

  // Synchronize boards with storage
  useEffect(() => {
    saveStoredKanbanBoards(boards);
  }, [boards]);

  // Synchronize active board ID with storage
  useEffect(() => {
    saveActiveBoardId(activeBoardId);
  }, [activeBoardId]);

  // Active board definition
  const activeBoard = useMemo(() => {
    return boards.find((b) => b.id === activeBoardId) || boards[0] || DEFAULT_KANBAN_BOARDS[0];
  }, [boards, activeBoardId]);

  // Resolved columns for active board
  const columns = useMemo(() => {
    return resolveBoardColumns(activeBoard, folders);
  }, [activeBoard, folders]);

  // Filtered notes for Kanban
  const visibleNotes = useMemo(() => {
    const combinedQuery = (inBoardQuery || searchQuery || '').trim();
    return filterBoardNotes(
      allNotes,
      {
        ...activeBoard.filters,
        includeArchived: includeArchivedLocal || activeBoard.filters?.includeArchived,
        tags: selectedTagFilter ? [selectedTagFilter] : undefined,
      },
      combinedQuery
    );
  }, [allNotes, activeBoard.filters, includeArchivedLocal, selectedTagFilter, inBoardQuery, searchQuery]);

  // Group notes by column ID
  const notesByColumn = useMemo(() => {
    const map = new Map<string, Note[]>();

    // Initialize all columns including unassigned
    columns.forEach((col) => map.set(col.id, []));
    map.set(UNASSIGNED_COLUMN_ID, []);

    visibleNotes.forEach((note) => {
      const colId = getNoteColumnAssignment(note, activeBoard, columns);
      const list = map.get(colId) || [];
      list.push(note);
      map.set(colId, list);
    });

    return map;
  }, [visibleNotes, activeBoard, columns]);

  // Handle Drag & Drop move
  const handleDropNote = (noteId: string, targetColId: string, insertIndex: number) => {
    const note = allNotes.find((n) => n.id === noteId);
    if (!note) return;

    // 1. Atomically update the note's underlying properties (pipeline tags, folder, priority, status)
    const updatedNote = moveNoteInBoard(note, activeBoard, targetColId, columns);
    onUpdateNote(updatedNote);

    // 2. Update the custom order on the board
    const updatedBoard = updateBoardCustomOrder(activeBoard, noteId, targetColId, insertIndex, columns);
    setBoards((prev) => prev.map((b) => (b.id === updatedBoard.id ? updatedBoard : b)));
  };

  // Handle direct 1-tap move menu action
  const handleMoveToColumn = (noteId: string, targetColId: string) => {
    handleDropNote(noteId, targetColId, 0);
  };

  // Handle Quick Add Note in specific column
  const handleQuickAddInColumn = (col: KanbanColumnDef, isUnassigned: boolean) => {
    const newAttrs: Partial<Note> = {
      title: '',
      content: '',
      color: settings.defaultColor || 'default',
    };

    if (!isUnassigned) {
      switch (activeBoard.sourceType) {
        case 'tag':
          newAttrs.tags = [col.value.toLowerCase().replace(/^#/, '')];
          break;
        case 'folder':
          newAttrs.folderId = col.value;
          break;
        case 'priority':
          newAttrs.priority = col.value as NotePriority;
          break;
        case 'status':
          newAttrs.status = col.value as NoteStatus;
          break;
        case 'color':
          newAttrs.color = col.value as NoteColorKey;
          break;
      }
    }

    if (onOpenNewNoteWithAttributes) {
      onOpenNewNoteWithAttributes(newAttrs);
    }
  };

  // Save board changes
  const handleSaveBoard = (savedBoard: KanbanBoardDef) => {
    setBoards((prev) => {
      const exists = prev.some((b) => b.id === savedBoard.id);
      if (exists) {
        return prev.map((b) => (b.id === savedBoard.id ? savedBoard : b));
      }
      return [...prev, savedBoard];
    });
    setActiveBoardId(savedBoard.id);
  };

  // Delete custom board
  const handleDeleteBoard = (boardId: string) => {
    const remaining = boards.filter((b) => b.id !== boardId);
    const safeRemaining = remaining.length > 0 ? remaining : DEFAULT_KANBAN_BOARDS;
    setBoards(safeRemaining);
    setActiveBoardId(safeRemaining[0].id);
  };

  // Reset to default boards
  const handleResetBoards = () => {
    if (confirm('Reset all Kanban boards to factory defaults?')) {
      setBoards(DEFAULT_KANBAN_BOARDS);
      setActiveBoardId(DEFAULT_KANBAN_BOARDS[0].id);
    }
  };

  // Source Type Icon
  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'tag':
        return <Tag className="w-3.5 h-3.5 text-amber-500" />;
      case 'folder':
        return <FolderIcon className="w-3.5 h-3.5 text-indigo-500" />;
      case 'priority':
        return <Flame className="w-3.5 h-3.5 text-red-500" />;
      case 'status':
        return <ListOrdered className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Kanban className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-210px)] max-w-full overflow-hidden">
      {/* Top Kanban View Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 mb-3 border-b border-stone-200/80 dark:border-stone-800/80 shrink-0">
        {/* Left: Board Selector Dropdown & Type Badge */}
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button
              id="btn-kanban-board-selector"
              onClick={() => setShowBoardDropdown(!showBoardDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#18181c] border border-stone-300 dark:border-stone-700 shadow-2xs hover:border-stone-400 font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {getSourceIcon(activeBoard.sourceType)}
                <span>{activeBoard.name}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {/* Board Selector Popover Menu */}
            {showBoardDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-64 p-1.5 bg-white dark:bg-[#18181c] border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-1">
                <span className="px-2.5 py-1 text-[10px] uppercase font-bold text-stone-400 block">
                  Select Workflow Board
                </span>

                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBoardId(b.id);
                      setShowBoardDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      b.id === activeBoard.id
                        ? 'bg-amber-500 text-white font-bold'
                        : 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getSourceIcon(b.sourceType)}
                      <span className="truncate">{b.name}</span>
                    </div>
                    {b.id === activeBoard.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}

                <div className="border-t border-stone-100 dark:border-stone-800 my-1 pt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setShowBoardDropdown(false);
                      setIsCreatingBoardModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create New Board
                  </button>

                  <button
                    onClick={() => {
                      setShowBoardDropdown(false);
                      handleResetBoards();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Factory Defaults
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Customize Active Board Button */}
          <button
            onClick={() => setIsEditingBoardModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-semibold text-xs transition-colors"
            title="Configure board columns and pipeline rules"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Customize Board</span>
          </button>
        </div>

        {/* Right: In-Board Filter & Search Input */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          {/* Quick Filter Input */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={inBoardQuery}
              onChange={(e) => setInBoardQuery(e.target.value)}
              placeholder="Filter board cards..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Include Archived Toggle */}
          <button
            onClick={() => setIncludeArchivedLocal(!includeArchivedLocal)}
            className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
              includeArchivedLocal
                ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 text-amber-900 dark:text-amber-200'
                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
            title={includeArchivedLocal ? 'Hiding archived notes' : 'Showing archived notes'}
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Horizontal Scroll Stream */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex items-start gap-4 h-full min-w-max">
          {/* Defined Pipeline / Category Columns */}
          {columns.map((col) => {
            const colNotes = notesByColumn.get(col.id) || [];
            const orderedNotes = getOrderedNotesForColumn(colNotes, col.id, activeBoard.customOrder);
            return (
              <KanbanColumn
                key={col.id}
                column={col}
                notes={orderedNotes}
                board={activeBoard}
                allColumns={columns}
                folders={folders}
                onOpenNote={onOpenNote}
                onUpdateNote={onUpdateNote}
                onDeleteNote={onDeleteNote}
                onMoveToColumn={handleMoveToColumn}
                onDropNote={handleDropNote}
                onQuickAddNote={(c) => handleQuickAddInColumn(c, false)}
              />
            );
          })}

          {/* Unassigned / Unmatched Notes Column */}
          {activeBoard.includeUnassigned && (
            <KanbanColumn
              key={UNASSIGNED_COLUMN_ID}
              column={{
                id: UNASSIGNED_COLUMN_ID,
                title: activeBoard.unassignedTitle || 'Unassigned Notes',
                value: UNASSIGNED_COLUMN_ID,
                color: '#94a3b8',
              }}
              notes={getOrderedNotesForColumn(
                notesByColumn.get(UNASSIGNED_COLUMN_ID) || [],
                UNASSIGNED_COLUMN_ID,
                activeBoard.customOrder
              )}
              board={activeBoard}
              allColumns={columns}
              folders={folders}
              isUnassigned={true}
              onOpenNote={onOpenNote}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              onMoveToColumn={handleMoveToColumn}
              onDropNote={handleDropNote}
              onQuickAddNote={(c) => handleQuickAddInColumn(c, true)}
            />
          )}
        </div>
      </div>

      {/* Board Customization Modal */}
      {isEditingBoardModalOpen && (
        <KanbanBoardModal
          board={activeBoard}
          allBoards={boards}
          folders={folders}
          isOpen={true}
          onClose={() => setIsEditingBoardModalOpen(false)}
          onSaveBoard={handleSaveBoard}
          onDeleteBoard={handleDeleteBoard}
        />
      )}

      {/* New Board Creation Modal */}
      {isCreatingBoardModalOpen && (
        <KanbanBoardModal
          board={null}
          allBoards={boards}
          folders={folders}
          isOpen={true}
          onClose={() => setIsCreatingBoardModalOpen(false)}
          onSaveBoard={handleSaveBoard}
          onDeleteBoard={handleDeleteBoard}
        />
      )}
    </div>
  );
};
