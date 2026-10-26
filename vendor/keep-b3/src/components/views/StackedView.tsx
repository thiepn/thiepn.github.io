import React, { useState, useCallback } from 'react';
import { Calendar, GripVertical, ChevronUp, ChevronDown, ArrowUpDown, Check } from 'lucide-react';
import { Note, Folder, AppSettings } from '../../types';
import { NoteCard } from '../NoteCard';
import { groupNotesByMonth } from '../../utils/search';

interface StackedViewProps {
  notes: Note[];
  allNotes: Note[];
  folders: Folder[];
  settings: AppSettings;
  searchQuery?: string;
  selectedNoteIds?: string[];
  onToggleSelect?: (noteId: string, shiftKey?: boolean) => void;
  onOpenNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote?: (noteId: string) => void;
  onDeleteForever?: (noteId: string) => void;
  onDuplicateNote?: (note: Note) => void;
  onFilterTag?: (tag: string) => void;
  onFilterFolder?: (folderId: string) => void;
  onOpenLinkedNote?: (noteId: string) => void;
  focusedNoteId?: string;
  onReorderNotes?: (reorderedNotes: Note[]) => void | Promise<void>;
  onSortChange?: (sortBy: 'manual' | 'updatedAt' | 'createdAt' | 'title' | 'reminder') => void;
  onSaveAsTemplate?: (note: Note) => void;
  onCompareNote?: (note: Note) => void;
}

export const StackedView: React.FC<StackedViewProps> = ({
  notes,
  allNotes,
  folders,
  settings,
  searchQuery,
  selectedNoteIds = [],
  onToggleSelect,
  onOpenNote,
  onUpdateNote,
  onDeleteNote,
  onRestoreNote,
  onDeleteForever,
  onDuplicateNote,
  onFilterTag,
  onFilterFolder,
  onOpenLinkedNote,
  focusedNoteId,
  onReorderNotes,
  onSortChange,
  onSaveAsTemplate,
  onCompareNote,
}) => {
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    noteId: string;
    position: 'before' | 'after';
  } | null>(null);

  const monthGroups = settings.showMonthDividers ? groupNotesByMonth(notes) : null;
  const isCompact = Boolean(settings.compactMode);
  const isManualSort = settings.sortBy === 'manual';

  // Helper to reorder notes list
  const reorderNotesList = useCallback(
    (sourceId: string, targetId: string, position: 'before' | 'after') => {
      if (sourceId === targetId) return;

      const sourceIndex = notes.findIndex((n) => n.id === sourceId);
      if (sourceIndex === -1) return;

      const updated = [...notes];
      const [movedNote] = updated.splice(sourceIndex, 1);

      let targetIndex = updated.findIndex((n) => n.id === targetId);
      if (targetIndex === -1) {
        updated.push(movedNote);
      } else {
        if (position === 'after') {
          targetIndex += 1;
        }
        updated.splice(targetIndex, 0, movedNote);
      }

      onReorderNotes?.(updated);
    },
    [notes, onReorderNotes]
  );

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.setData('application/json', JSON.stringify({ noteId }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingNoteId(noteId);
  };

  const handleDragOver = (e: React.DragEvent, noteId: string) => {
    if (draggingNoteId === noteId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';

    setDropTarget({ noteId, position });
  };

  const handleDragLeave = (e: React.DragEvent, noteId: string) => {
    // Only clear if pointer completely leaves this card container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dropTarget?.noteId === noteId) {
        setDropTarget(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetNoteId: string) => {
    e.preventDefault();
    let sourceId = draggingNoteId || e.dataTransfer.getData('text/plain');

    const jsonStr = e.dataTransfer.getData('application/json');
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.noteId) sourceId = parsed.noteId;
      } catch {
        // Fallback to text/plain
      }
    }

    if (sourceId && sourceId !== targetNoteId) {
      const position = dropTarget?.position || 'before';
      reorderNotesList(sourceId, targetNoteId, position);
    }

    setDraggingNoteId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggingNoteId(null);
    setDropTarget(null);
  };

  // Keyboard / Click step movement
  const handleMoveStep = (noteId: string, direction: 'up' | 'down') => {
    const currentIndex = notes.findIndex((n) => n.id === noteId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= notes.length) return;

    const updated = [...notes];
    const [movedNote] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, movedNote);

    onReorderNotes?.(updated);
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-20 text-stone-400 text-sm">
        No notes to display in stacked view.
      </div>
    );
  }

  const renderDraggableNoteCard = (note: Note, index: number, totalInGroup: number) => {
    const isDraggingThis = draggingNoteId === note.id;
    const isDropBefore = dropTarget?.noteId === note.id && dropTarget.position === 'before';
    const isDropAfter = dropTarget?.noteId === note.id && dropTarget.position === 'after';

    return (
      <div
        key={note.id}
        id={`stacked-card-wrapper-${note.id}`}
        onDragOver={(e) => handleDragOver(e, note.id)}
        onDragLeave={(e) => handleDragLeave(e, note.id)}
        onDrop={(e) => handleDrop(e, note.id)}
        className="relative group/stack transition-all duration-150"
      >
        {/* Drop Insertion Bar - Before */}
        {isDropBefore && (
          <div className="absolute -top-2 left-0 right-0 z-30 flex items-center pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-stone-900 shadow-sm shrink-0" />
            <div className="h-1 bg-amber-500 rounded-full flex-1 mx-1 shadow-sm ring-1 ring-amber-400/50 animate-pulse" />
          </div>
        )}

        <div
          draggable={true}
          onDragStart={(e) => handleDragStart(e, note.id)}
          onDragEnd={handleDragEnd}
          className={`relative flex items-stretch transition-all rounded-2xl ${
            isDraggingThis
              ? 'opacity-40 ring-2 ring-amber-500/70 border-dashed scale-[0.99] shadow-inner'
              : 'opacity-100 hover:shadow-xs'
          }`}
        >
          {/* Left Drag & Reorder Handle Bar */}
          <div
            id={`drag-handle-${note.id}`}
            aria-label={`Drag handle for note: ${note.title || 'Untitled'}`}
            className="flex flex-col items-center justify-center px-1 py-2 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 opacity-60 group-hover/stack:opacity-100 transition-opacity cursor-grab active:cursor-grabbing select-none shrink-0"
            title="Drag to reorder notes (or use arrows)"
          >
            <GripVertical className="w-4 h-4 stroke-[2.2]" />

            {/* Quick 1-click step buttons on hover/focus */}
            <div className="hidden sm:flex flex-col gap-0.5 mt-1 opacity-0 group-hover/stack:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveStep(note.id, 'up');
                }}
                disabled={index === 0}
                className="p-0.5 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                title="Move up in stack"
                aria-label={`Move note ${note.title || 'Untitled'} up`}
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveStep(note.id, 'down');
                }}
                disabled={index === totalInGroup - 1}
                className="p-0.5 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                title="Move down in stack"
                aria-label={`Move note ${note.title || 'Untitled'} down`}
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Core Note Card Component */}
          <div className="flex-1 min-w-0">
            <NoteCard
              note={note}
              allNotes={allNotes}
              folders={folders}
              searchQuery={searchQuery}
              isSelected={selectedNoteIds.includes(note.id)}
              onToggleSelect={onToggleSelect}
              isSelectionMode={selectedNoteIds.length > 0}
              onOpenNote={onOpenNote}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              onRestoreNote={onRestoreNote}
              onDeleteForever={onDeleteForever}
              onDuplicateNote={onDuplicateNote}
              onFilterTag={onFilterTag}
              onFilterFolder={onFilterFolder}
              onOpenLinkedNote={onOpenLinkedNote}
              cardDensity={isCompact ? 'compact' : 'spacious'}
              isFocused={focusedNoteId === note.id}
              onSaveAsTemplate={onSaveAsTemplate}
              onCompareNote={onCompareNote}
            />
          </div>
        </div>

        {/* Drop Insertion Bar - After */}
        {isDropAfter && (
          <div className="absolute -bottom-2 left-0 right-0 z-30 flex items-center pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-stone-900 shadow-sm shrink-0" />
            <div className="h-1 bg-amber-500 rounded-full flex-1 mx-1 shadow-sm ring-1 ring-amber-400/50 animate-pulse" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full max-w-2xl mx-auto ${isCompact ? 'space-y-3 pb-8' : 'space-y-6 pb-16'}`}>
      {/* Top Reorder Mode Info / Status Bar */}
      {notes.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {isManualSort ? (
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  Custom manual order active
                </span>
              ) : (
                <span>Drag notes by handle or use arrows to rearrange</span>
              )}
            </span>
          </div>
          {isManualSort ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-3 h-3 stroke-[2.5]" /> Saved
            </span>
          ) : (
            onSortChange && (
              <button
                type="button"
                onClick={() => onSortChange('manual')}
                className="text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1"
              >
                <ArrowUpDown className="w-3 h-3" /> Enable Custom Order
              </button>
            )
          )}
        </div>
      )}

      {/* Month-Grouped Stack or Flat Stack */}
      {settings.showMonthDividers && monthGroups ? (
        monthGroups.map((group) => (
          <div key={group.key} className={isCompact ? 'space-y-2' : 'space-y-4'}>
            <div className="sticky top-16 z-10 py-1.5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-2 rounded-xl">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  {group.label}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {group.notes.length} {group.notes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>

            <div className={isCompact ? 'space-y-2.5' : 'space-y-4'}>
              {group.notes.map((note, idx) =>
                renderDraggableNoteCard(note, idx, group.notes.length)
              )}
            </div>
          </div>
        ))
      ) : (
        <div className={isCompact ? 'space-y-2.5' : 'space-y-4'}>
          {notes.map((note, idx) =>
            renderDraggableNoteCard(note, idx, notes.length)
          )}
        </div>
      )}
    </div>
  );
};
