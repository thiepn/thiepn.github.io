import { Note, Folder, NoteColorKey, NotePriority, NoteStatus } from '../types';
import {
  KanbanBoardDef,
  KanbanColumnDef,
  KanbanFilters,
  DEFAULT_KANBAN_BOARDS,
  UNASSIGNED_COLUMN_ID,
} from './kanbanTypes';

const STORAGE_BOARDS_KEY = 'pkm_kanban_boards_v1';
const STORAGE_ACTIVE_BOARD_KEY = 'pkm_kanban_active_board_v1';

/**
 * Loads stored Kanban boards from localStorage with safe fallback
 */
export function loadStoredKanbanBoards(): KanbanBoardDef[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_KANBAN_BOARDS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_BOARDS_KEY);
    if (!raw) return DEFAULT_KANBAN_BOARDS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all boards have valid structure
      return parsed.map((b) => ({
        ...b,
        columns: Array.isArray(b.columns) ? b.columns : [],
        customOrder: b.customOrder || {},
        includeUnassigned: b.includeUnassigned ?? true,
      }));
    }
  } catch (err) {
    console.warn('Failed to parse stored kanban boards, using defaults:', err);
  }

  return DEFAULT_KANBAN_BOARDS;
}

/**
 * Saves Kanban boards to localStorage
 */
export function saveStoredKanbanBoards(boards: KanbanBoardDef[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_BOARDS_KEY, JSON.stringify(boards));
  } catch (err) {
    console.error('Failed to save kanban boards to localStorage:', err);
  }
}

/**
 * Loads the active board ID from localStorage
 */
export function loadActiveBoardId(availableBoards: KanbanBoardDef[]): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return availableBoards[0]?.id || 'board-task-pipeline';
  }

  try {
    const active = localStorage.getItem(STORAGE_ACTIVE_BOARD_KEY);
    if (active && availableBoards.some((b) => b.id === active)) {
      return active;
    }
  } catch {
    // Ignore
  }

  return availableBoards[0]?.id || 'board-task-pipeline';
}

/**
 * Saves the active board ID to localStorage
 */
export function saveActiveBoardId(boardId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_ACTIVE_BOARD_KEY, boardId);
  } catch {
    // Ignore
  }
}

/**
 * Resolves all active columns for a board, dynamically populating folder columns if source is folder
 */
export function resolveBoardColumns(board: KanbanBoardDef, folders: Folder[]): KanbanColumnDef[] {
  if (board.sourceType === 'folder') {
    // If the board has explicitly defined folder columns, use them while updating names;
    // otherwise dynamically generate a column for every user folder
    if (board.columns && board.columns.length > 0) {
      return board.columns.map((col) => {
        const folder = folders.find((f) => f.id === col.value);
        return {
          ...col,
          title: folder ? folder.name : col.title,
          color: folder?.color || col.color || '#6366f1',
        };
      });
    } else {
      return folders.map((f) => ({
        id: `col-folder-${f.id}`,
        title: f.name,
        value: f.id,
        color: f.color || '#6366f1',
      }));
    }
  }

  return board.columns || [];
}

/**
 * Determines which column a note belongs to on a specific board
 */
export function getNoteColumnAssignment(
  note: Note,
  board: KanbanBoardDef,
  columns: KanbanColumnDef[]
): string {
  if (!note || note.trashed) return UNASSIGNED_COLUMN_ID;

  switch (board.sourceType) {
    case 'tag': {
      // Find the first column whose tag value is present in note.tags (case-insensitive)
      const noteTagsNormalized = (note.tags || []).map((t) => t.toLowerCase().replace(/^#/, ''));
      for (const col of columns) {
        const colTagNorm = (col.value || '').toLowerCase().replace(/^#/, '');
        if (colTagNorm && noteTagsNormalized.includes(colTagNorm)) {
          return col.id;
        }
      }
      return UNASSIGNED_COLUMN_ID;
    }

    case 'folder': {
      if (!note.folderId) return UNASSIGNED_COLUMN_ID;
      const matchedCol = columns.find((col) => col.value === note.folderId);
      return matchedCol ? matchedCol.id : UNASSIGNED_COLUMN_ID;
    }

    case 'priority': {
      if (!note.priority) return UNASSIGNED_COLUMN_ID;
      const matchedCol = columns.find((col) => col.value.toLowerCase() === note.priority?.toLowerCase());
      return matchedCol ? matchedCol.id : UNASSIGNED_COLUMN_ID;
    }

    case 'status': {
      if (!note.status) return UNASSIGNED_COLUMN_ID;
      const matchedCol = columns.find((col) => col.value.toLowerCase() === note.status?.toLowerCase());
      return matchedCol ? matchedCol.id : UNASSIGNED_COLUMN_ID;
    }

    case 'color': {
      if (!note.color || note.color === 'default') return UNASSIGNED_COLUMN_ID;
      const matchedCol = columns.find((col) => col.value.toLowerCase() === note.color.toLowerCase());
      return matchedCol ? matchedCol.id : UNASSIGNED_COLUMN_ID;
    }

    default:
      return UNASSIGNED_COLUMN_ID;
  }
}

/**
 * Atomically updates a note when moved into a target column on a board.
 * In a Tag Pipeline:
 * - Removes any pipeline tag associated with this board
 * - Adds the target column tag (if not moving to unassigned)
 * - Preserves ALL other unrelated tags on the note
 * - Updates any matching inline markdown tags in note.content
 */
export function moveNoteInBoard(
  note: Note,
  board: KanbanBoardDef,
  targetColumnId: string,
  columns: KanbanColumnDef[]
): Note {
  const updatedNote: Note = {
    ...note,
    updatedAt: new Date().toISOString(),
  };

  const isMovingToUnassigned = targetColumnId === UNASSIGNED_COLUMN_ID;
  const targetCol = columns.find((c) => c.id === targetColumnId);

  switch (board.sourceType) {
    case 'tag': {
      // Gather all pipeline tags configured across all columns of this board
      const pipelineTags = columns
        .map((c) => (c.value || '').toLowerCase().replace(/^#/, ''))
        .filter(Boolean);

      const targetTag = isMovingToUnassigned
        ? null
        : (targetCol?.value || '').toLowerCase().replace(/^#/, '');

      // 1. Filter out all pipeline tags from note.tags while preserving unrelated tags
      const preservedTags = (note.tags || []).filter((t) => {
        const norm = t.toLowerCase().replace(/^#/, '');
        return !pipelineTags.includes(norm);
      });

      // 2. Add target tag if applicable
      if (targetTag && !preservedTags.some((t) => t.toLowerCase() === targetTag)) {
        preservedTags.push(targetTag);
      }
      updatedNote.tags = preservedTags;

      // 3. Keep inline markdown tags in note.content in sync
      if (note.content) {
        let content = note.content;
        for (const pTag of pipelineTags) {
          // Regex to find #tag (whole word, not followed by word chars or slash unless end of tag)
          const regex = new RegExp(`(^|\\s)#${pTag}\\b`, 'gi');
          if (targetTag) {
            content = content.replace(regex, `$1#${targetTag}`);
          } else {
            // If moved to unassigned, cleanly remove the hashtag
            content = content.replace(regex, '$1').replace(/\s{2,}/g, ' ');
          }
        }
        updatedNote.content = content;
      }
      break;
    }

    case 'folder': {
      if (isMovingToUnassigned || !targetCol) {
        updatedNote.folderId = null;
      } else {
        updatedNote.folderId = targetCol.value;
      }
      break;
    }

    case 'priority': {
      if (isMovingToUnassigned || !targetCol) {
        updatedNote.priority = undefined;
      } else {
        updatedNote.priority = targetCol.value as NotePriority;
      }
      break;
    }

    case 'status': {
      if (isMovingToUnassigned || !targetCol) {
        updatedNote.status = undefined;
      } else {
        updatedNote.status = targetCol.value as NoteStatus;
      }
      break;
    }

    case 'color': {
      if (isMovingToUnassigned || !targetCol) {
        updatedNote.color = 'default';
      } else {
        updatedNote.color = targetCol.value as NoteColorKey;
      }
      break;
    }
  }

  return updatedNote;
}

/**
 * Orders notes within a column according to customOrder (if defined), then by updatedAt descending
 */
export function getOrderedNotesForColumn(
  notesInCol: Note[],
  columnId: string,
  customOrder?: Record<string, string[]>
): Note[] {
  const colOrder = customOrder?.[columnId];
  if (!colOrder || colOrder.length === 0) {
    // Default deterministic order: Pinned first, then newest updated first
    return [...notesInCol].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }

  const orderMap = new Map<string, number>();
  colOrder.forEach((id, idx) => orderMap.set(id, idx));

  return [...notesInCol].sort((a, b) => {
    const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
    const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
    if (idxA !== idxB) return idxA - idxB;
    // Tie-breaker: pinned notes first, then updated timestamp
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });
}

/**
 * Reorders or moves cards between columns in the board's customOrder state
 */
export function updateBoardCustomOrder(
  board: KanbanBoardDef,
  movedNoteId: string,
  targetColumnId: string,
  targetIndex: number,
  allColumns: KanbanColumnDef[]
): KanbanBoardDef {
  const newCustomOrder = { ...(board.customOrder || {}) };

  // Remove movedNoteId from all columns in customOrder
  Object.keys(newCustomOrder).forEach((colId) => {
    newCustomOrder[colId] = (newCustomOrder[colId] || []).filter((id) => id !== movedNoteId);
  });

  // Get current order of target column or create one
  const targetColOrder = [...(newCustomOrder[targetColumnId] || [])];
  if (targetIndex >= 0 && targetIndex <= targetColOrder.length) {
    targetColOrder.splice(targetIndex, 0, movedNoteId);
  } else {
    targetColOrder.push(movedNoteId);
  }
  newCustomOrder[targetColumnId] = targetColOrder;

  return {
    ...board,
    customOrder: newCustomOrder,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Filters notes based on board filters and live query string
 */
export function filterBoardNotes(
  notes: Note[],
  boardFilters?: KanbanFilters,
  liveSearchQuery?: string
): Note[] {
  const query = (liveSearchQuery || boardFilters?.query || '').trim().toLowerCase();
  const includeArchived = boardFilters?.includeArchived ?? false;
  const filterTag = boardFilters?.tags && boardFilters.tags.length > 0 ? boardFilters.tags : null;
  const filterFolderId = boardFilters?.folderId;
  const filterPriority = boardFilters?.priority;
  const filterColor = boardFilters?.color;

  return notes.filter((note) => {
    // Trash filter: Never show trashed notes in Kanban
    if (note.trashed) return false;

    // Archived filter
    if (!includeArchived && note.archived) return false;

    // Folder filter
    if (filterFolderId !== undefined && filterFolderId !== null) {
      if (filterFolderId === 'unorganized' && note.folderId !== null) return false;
      if (filterFolderId !== 'unorganized' && note.folderId !== filterFolderId) return false;
    }

    // Priority filter
    if (filterPriority && note.priority !== filterPriority) return false;

    // Color filter
    if (filterColor && note.color !== filterColor) return false;

    // Tags filter
    if (filterTag && filterTag.length > 0) {
      const noteTags = (note.tags || []).map((t) => t.toLowerCase());
      const hasAllTags = filterTag.every((ft) => noteTags.includes(ft.toLowerCase().replace(/^#/, '')));
      if (!hasAllTags) return false;
    }

    // Search query
    if (query) {
      const titleMatch = (note.title || '').toLowerCase().includes(query);
      const contentMatch = (note.content || '').toLowerCase().includes(query);
      const tagMatch = (note.tags || []).some((t) => t.toLowerCase().includes(query));
      const checklistMatch = (note.checklist || []).some((c) => c.text.toLowerCase().includes(query));
      if (!titleMatch && !contentMatch && !tagMatch && !checklistMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extracts checklist stats from a note (either checklist type or markdown task lists [ ] / [x])
 */
export function extractCardChecklistStats(
  note: Note
): { total: number; completed: number; percent: number } | null {
  if (note.type === 'checklist' && note.checklist && note.checklist.length > 0) {
    const total = note.checklist.length;
    const completed = note.checklist.filter((i) => i.completed).length;
    const percent = Math.round((completed / total) * 100);
    return { total, completed, percent };
  }

  // Check for markdown task items in content
  if (note.content) {
    const lines = note.content.split('\n');
    let total = 0;
    let completed = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^-\s*\[([ xX])\]/.test(trimmed)) {
        total++;
        if (/^-\s*\[[xX]\]/.test(trimmed)) {
          completed++;
        }
      }
    }
    if (total > 0) {
      const percent = Math.round((completed / total) * 100);
      return { total, completed, percent };
    }
  }

  return null;
}
