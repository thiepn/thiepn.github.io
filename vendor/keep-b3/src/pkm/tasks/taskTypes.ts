import { NotePriority, NoteStatus } from '../../types';

export interface PKMTask {
  id: string; // Stable unique ID: task-${noteId}-${line}-${hash}
  noteId: string;
  noteTitle: string;
  folderId: string | null;
  folderName?: string;
  tags: string[];
  text: string; // The sanitized task label text without the checkbox prefix
  completed: boolean;
  line: number; // 0-indexed line in note.content
  rawLine: string; // Exact line from markdown
  charOffset: number;
  bulletType: '-' | '*' | '+';
  parentHeading?: string; // Nearest preceding heading (e.g. "Action Items")
  blockId?: string; // e.g. "task-1" if line ends with ^task-1
  indentLevel: number; // Indentation space count or tab level
  notePriority?: NotePriority;
  noteStatus?: NoteStatus;
  noteDate?: string; // from frontmatter due / date
  dueDate?: string; // Inline @due(YYYY-MM-DD) or noteDate
  priority?: NotePriority; // Inline !priority or notePriority
  updatedAt: string;
}

export type TaskStatusFilter = 'open' | 'completed' | 'all';
export type TaskGroupBy = 'none' | 'note' | 'folder' | 'tag' | 'status' | 'priority' | 'due_date';
export type TaskSortBy = 'source' | 'title' | 'updated' | 'date' | 'priority';
export type TaskSortOrder = 'asc' | 'desc';

export interface TaskFilterState {
  status: TaskStatusFilter;
  searchQuery: string;
  selectedFolderId: string | null;
  selectedTag: string | null;
  selectedNoteId: string | null;
  selectedPriority: string | null;
  groupBy: TaskGroupBy;
  sortBy: TaskSortBy;
  sortOrder: TaskSortOrder;
}

export interface TaskGroup {
  id: string;
  title: string;
  icon?: string;
  tasks: PKMTask[];
  openCount: number;
  completedCount: number;
}
