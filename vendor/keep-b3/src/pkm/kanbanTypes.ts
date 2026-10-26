import { Note, Folder, NoteColorKey, NotePriority, NoteStatus } from '../types';

export type KanbanSourceType = 'tag' | 'folder' | 'priority' | 'status' | 'color';

export interface KanbanColumnDef {
  id: string;
  title: string;
  value: string; // tag name (without #), folder ID, priority key, status key, or color key
  color?: string; // HEX or color descriptor for column accent
  limit?: number; // Optional WIP limit
}

export interface KanbanFilters {
  query?: string;
  tags?: string[];
  folderId?: string | null;
  includeArchived?: boolean;
  color?: NoteColorKey | null;
  priority?: NotePriority | null;
}

export interface KanbanBoardDef {
  id: string;
  name: string;
  description?: string;
  sourceType: KanbanSourceType;
  columns: KanbanColumnDef[];
  includeUnassigned: boolean;
  unassignedTitle?: string;
  customOrder?: Record<string, string[]>; // columnId -> noteId[]
  filters?: KanbanFilters;
  createdAt: string;
  updatedAt: string;
}

export const UNASSIGNED_COLUMN_ID = '__unassigned__';

export const DEFAULT_KANBAN_BOARDS: KanbanBoardDef[] = [
  {
    id: 'board-task-pipeline',
    name: 'Task Pipeline',
    description: 'Track note tasks by tag pipeline (#todo → #doing → #done)',
    sourceType: 'tag',
    columns: [
      { id: 'col-todo', title: 'To Do', value: 'todo', color: '#f59e0b', limit: 15 },
      { id: 'col-doing', title: 'In Progress', value: 'doing', color: '#3b82f6', limit: 5 },
      { id: 'col-done', title: 'Completed', value: 'done', color: '#10b981' },
    ],
    includeUnassigned: true,
    unassignedTitle: 'No Pipeline Tag',
    customOrder: {},
    filters: { includeArchived: false },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'board-priority-matrix',
    name: 'Priority Matrix',
    description: 'Organize notes by urgency and importance',
    sourceType: 'priority',
    columns: [
      { id: 'col-urgent', title: 'Urgent', value: 'urgent', color: '#ef4444', limit: 5 },
      { id: 'col-high', title: 'High Priority', value: 'high', color: '#f97316', limit: 10 },
      { id: 'col-medium', title: 'Medium Priority', value: 'medium', color: '#eab308' },
      { id: 'col-low', title: 'Low Priority', value: 'low', color: '#6b7280' },
    ],
    includeUnassigned: true,
    unassignedTitle: 'No Priority Set',
    customOrder: {},
    filters: { includeArchived: false },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'board-folders-workflow',
    name: 'Folders Workflow',
    description: 'View and triage notes across all folders',
    sourceType: 'folder',
    columns: [], // Dynamically populated or customized per folder
    includeUnassigned: true,
    unassignedTitle: 'Unorganized Notes',
    customOrder: {},
    filters: { includeArchived: false },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'board-status-flow',
    name: 'Status Workflow',
    description: 'Track note statuses from Backlog to Done',
    sourceType: 'status',
    columns: [
      { id: 'col-status-backlog', title: 'Backlog', value: 'backlog', color: '#8b5cf6' },
      { id: 'col-status-todo', title: 'To Do', value: 'todo', color: '#f59e0b' },
      { id: 'col-status-progress', title: 'In Progress', value: 'in_progress', color: '#3b82f6' },
      { id: 'col-status-review', title: 'Review', value: 'review', color: '#ec4899' },
      { id: 'col-status-done', title: 'Done', value: 'done', color: '#10b981' },
    ],
    includeUnassigned: true,
    unassignedTitle: 'Unassigned Status',
    customOrder: {},
    filters: { includeArchived: false },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
