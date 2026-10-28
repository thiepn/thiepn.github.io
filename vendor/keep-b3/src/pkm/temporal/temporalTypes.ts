import { Note, Folder, NotePriority } from '../../types';
import { PKMTask } from '../tasks/taskTypes';

/**
 * Phase P37 - Temporal Entry Types & Model
 */

export type TemporalResourceType =
  | 'daily-note'
  | 'note'
  | 'task'
  | 'reference'
  | 'timeline-activity';

export type TemporalRole =
  | 'due'
  | 'scheduled'
  | 'start'
  | 'review'
  | 'completed'
  | 'created'
  | 'modified'
  | 'published'
  | 'reminder';

export interface TemporalEntry {
  id: string; // Unique entry ID
  resourceType: TemporalResourceType;
  resourceId: string; // noteId, taskId, referenceId
  title: string;
  date: string; // Strict YYYY-MM-DD format (no timezone shift)
  dueDate?: string;
  scheduledDate?: string;
  time?: string; // Optional HH:mm or HH:mm:ss
  dateTimeIso?: string; // Full ISO string if original source was DateTime
  temporalRole: TemporalRole;
  completed?: boolean;
  priority?: NotePriority;
  folderId?: string | null;
  folderName?: string;
  tags?: string[];
  noteId?: string; // For tasks or sub-items, the parent note ID
  noteTitle?: string;
  taskLine?: number;
  recurrence?: string;
  sourceSnippet?: string;
  metadata?: Record<string, unknown>;
}

export type CalendarViewMode = 'month' | 'week' | 'agenda' | 'timeline' | 'day';

export type AgendaSectionKey = 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'later' | 'completed';

export interface AgendaGroup {
  key: AgendaSectionKey;
  label: string;
  dateStr?: string;
  entries: TemporalEntry[];
  count: number;
}

export interface TemporalFilterState {
  showTasks: boolean;
  showNotes: boolean;
  showDailyNotes: boolean;
  showReferences: boolean;
  showCompleted: boolean;
  searchQuery: string;
  selectedFolderId: string | null;
  selectedTag: string | null;
  selectedRole?: TemporalRole | 'all';
}

export interface TemporalSettings {
  firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
  defaultView: CalendarViewMode;
  agendaHorizonDays: number; // 7, 14, 30, 90
  showCompletedInAgenda: boolean;
  autoAddCompletionDate: boolean;
  recognizedPropertyRoles: Record<string, TemporalRole>; // e.g. { 'due': 'due', 'scheduled': 'scheduled', 'review-date': 'review', 'start-date': 'start' }
  notificationsEnabled: boolean;
  notificationPrivacy: 'hide-content' | 'show-content';
}

export const DEFAULT_TEMPORAL_SETTINGS: TemporalSettings = {
  firstDayOfWeek: 1, // Monday default
  defaultView: 'month',
  agendaHorizonDays: 14,
  showCompletedInAgenda: false,
  autoAddCompletionDate: false,
  recognizedPropertyRoles: {
    due: 'due',
    deadline: 'due',
    date: 'due',
    scheduled: 'scheduled',
    'scheduled-date': 'scheduled',
    start: 'start',
    'start-date': 'start',
    review: 'review',
    'review-date': 'review',
    publish: 'published',
    published: 'published',
  },
  notificationsEnabled: false,
  notificationPrivacy: 'hide-content',
};

export interface TimelineActivityItem {
  id: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  resourceType: 'note' | 'task' | 'reference' | 'pdf' | 'canvas' | 'daily-note';
  resourceId: string;
  resourceTitle: string;
  action: 'created' | 'edited' | 'completed' | 'imported' | 'annotated' | 'synced';
  origin?: 'user' | 'capture' | 'import' | 'sync' | 'automation';
  summary?: string;
  editCount?: number;
  folderName?: string;
}

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays' | 'interval';
  interval: number; // e.g. every 2 weeks -> interval = 2, unit = 'week'
  unit?: 'day' | 'week' | 'month' | 'year';
  rawText: string;
}

export interface ICSCalendarEvent {
  uid: string;
  title: string;
  description?: string;
  startDate: string; // YYYYMMDD or YYYYMMDDTHHmmss
  endDate?: string;
  isAllDay: boolean;
  url?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}
