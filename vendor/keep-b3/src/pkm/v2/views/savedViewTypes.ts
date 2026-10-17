import { UnifiedQueryAST, ResourceQuerySource, SortClause, GroupClause } from '../core/query/queryTypes';

export type UnifiedViewType = 'list' | 'table' | 'board' | 'calendar' | 'gallery';

export interface SavedViewPresentation {
  viewType: UnifiedViewType;
  visibleColumns?: string[];
  columnWidths?: Record<string, number>;
  groupBy?: GroupClause;
  sortBy?: SortClause[];
  dateFieldMapping?: string; // Field to use for calendar view (e.g. dueDate, reviewDate, createdAt)
  boardFieldMapping?: string; // Field to use for board columns (e.g. status, priority, category)
}

export interface SavedViewV2 {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  favorite?: boolean;
  shortcut?: string;
  isBuiltIn?: boolean;
  version: 2;
  source: ResourceQuerySource;
  query: UnifiedQueryAST;
  presentation: SavedViewPresentation;
  createdAt: number;
  updatedAt: number;
}

export const BUILTIN_SAVED_VIEWS_V2: SavedViewV2[] = [
  // Cross-Domain Views
  {
    id: 'view_everything_due_this_week',
    name: '📅 Everything Due This Week',
    description: 'All tasks, project deadlines, decision reviews, and maintenance due this week',
    icon: 'Calendar',
    color: '#3b82f6',
    favorite: true,
    isBuiltIn: true,
    version: 2,
    source: { type: 'all' },
    query: {
      version: 2,
      filter: {
        conjunction: 'AND',
        criteria: [
          {
            field: 'dueDate',
            operator: 'is_this_week',
          },
          {
            field: 'status',
            operator: 'not_equals',
            value: 'done',
          },
        ],
      },
      sort: [{ field: 'dueDate', direction: 'asc' }],
    },
    presentation: {
      viewType: 'list',
      visibleColumns: ['title', 'type', 'dueDate', 'priority', 'status'],
      dateFieldMapping: 'dueDate',
    },
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
  {
    id: 'view_today_focus',
    name: '⚡ Today Focus',
    description: 'Active tasks and focus items due or scheduled for today',
    icon: 'Zap',
    color: '#f59e0b',
    favorite: true,
    isBuiltIn: true,
    version: 2,
    source: { type: 'all' },
    query: {
      version: 2,
      filter: {
        conjunction: 'AND',
        criteria: [
          {
            field: 'dueDate',
            operator: 'is_today',
          },
          {
            field: 'status',
            operator: 'not_equals',
            value: 'done',
          },
        ],
      },
      sort: [{ field: 'priority', direction: 'desc' }],
    },
    presentation: {
      viewType: 'list',
      visibleColumns: ['title', 'type', 'priority', 'dueDate', 'status'],
    },
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },

  // Task Domain Views
  {
    id: 'view_tasks_board_by_status',
    name: '📋 Tasks by Status',
    description: 'Visual Kanban board of active and completed tasks',
    icon: 'Kanban',
    color: '#10b981',
    favorite: true,
    isBuiltIn: true,
    version: 2,
    source: { type: 'resource_type', resourceTypes: ['task'] },
    query: {
      version: 2,
      resourceTypes: ['task'],
      sort: [{ field: 'priority', direction: 'desc' }],
      group: { field: 'status' },
    },
    presentation: {
      viewType: 'board',
      boardFieldMapping: 'status',
      visibleColumns: ['title', 'priority', 'dueDate', 'project'],
    },
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
  {
    id: 'view_tasks_overdue',
    name: '🚨 Overdue Tasks',
    description: 'Uncompleted tasks with past due dates',
    icon: 'AlertCircle',
    color: '#ef4444',
    isBuiltIn: true,
    version: 2,
    source: { type: 'resource_type', resourceTypes: ['task'] },
    query: {
      version: 2,
      resourceTypes: ['task'],
      filter: {
        conjunction: 'AND',
        criteria: [
          {
            field: 'dueDate',
            operator: 'before',
            relativeDate: 'today',
          },
          {
            field: 'status',
            operator: 'not_equals',
            value: 'done',
          },
        ],
      },
      sort: [{ field: 'dueDate', direction: 'asc' }],
    },
    presentation: {
      viewType: 'table',
      visibleColumns: ['title', 'dueDate', 'priority', 'status'],
    },
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },

  // Project Domain Views
  {
    id: 'view_projects_active',
    name: '🚀 Active Projects',
    description: 'All in-flight projects and target outcomes',
    icon: 'Folder',
    color: '#6366f1',
    isBuiltIn: true,
    version: 2,
    source: { type: 'resource_type', resourceTypes: ['project'] },
    query: {
      version: 2,
      resourceTypes: ['project'],
      filter: {
        conjunction: 'AND',
        criteria: [
          {
            field: 'status',
            operator: 'equals',
            value: 'active',
          },
        ],
      },
      sort: [{ field: 'updatedAt', direction: 'desc' }],
    },
    presentation: {
      viewType: 'table',
      visibleColumns: ['title', 'status', 'priority', 'dueDate', 'updatedAt'],
    },
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },

  // People Domain Views
  {
    id: 'view_people_follow_up',
    name: '👥 Follow-Up Due',
    description: 'Contacts and colleagues with scheduled follow-ups',
    icon: 'Users',
    color: '#ec4899',
    isBuiltIn: true,
    version: 2,
    source: { type: 'resource_type', resourceTypes: ['person'] },
    query: {
      version: 2,
      resourceTypes: ['person'],
      filter: {
        conjunction: 'AND',
        criteria: [
          {
            field: 'followUpDate',
            operator: 'is_on_or_before',
            relativeDate: 'today',
          },
        ],
      },
      sort: [{ field: 'followUpDate', direction: 'asc' }],
    },
    presentation: {
      viewType: 'table',
      visibleColumns: ['title', 'organization', 'email', 'followUpDate'],
    },
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },

  // Library Views
  {
    id: 'view_library_currently_reading',
    name: '📖 Currently Reading',
    description: 'Books and study material actively in progress',
    icon: 'BookOpen',
    color: '#8b5cf6',
    isBuiltIn: true,
    version: 2,
    source: { type: 'resource_type', resourceTypes: ['book'] },
    query: {
      version: 2,
      resourceTypes: ['book'],
      filter: {
        conjunction: 'AND',
        criteria: [
          {
            field: 'status',
            operator: 'equals',
            value: 'reading',
          },
        ],
      },
      sort: [{ field: 'progress', direction: 'desc' }],
    },
    presentation: {
      viewType: 'gallery',
      visibleColumns: ['title', 'author', 'progress', 'rating'],
    },
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },

  // Assets Views
  {
    id: 'view_assets_maintenance_due',
    name: '🔧 Maintenance Due This Month',
    description: 'Equipment, vehicles, and assets scheduled for service',
    icon: 'Wrench',
    color: '#d97706',
    isBuiltIn: true,
    version: 2,
    source: { type: 'resource_type', resourceTypes: ['asset'] },
    query: {
      version: 2,
      resourceTypes: ['asset'],
      filter: {
        conjunction: 'AND',
        criteria: [
          {
            field: 'maintenanceDueDate',
            operator: 'is_this_month',
          },
        ],
      },
      sort: [{ field: 'maintenanceDueDate', direction: 'asc' }],
    },
    presentation: {
      viewType: 'table',
      visibleColumns: ['title', 'category', 'maintenanceDueDate', 'assetValue'],
    },
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },

  // Decisions Views
  {
    id: 'view_decisions_review_due',
    name: '⚖️ Decision Reviews Due',
    description: 'Major decisions and predictions awaiting outcome review',
    icon: 'Scale',
    color: '#06b6d4',
    isBuiltIn: true,
    version: 2,
    source: { type: 'resource_type', resourceTypes: ['decision'] },
    query: {
      version: 2,
      resourceTypes: ['decision'],
      filter: {
        conjunction: 'AND',
        criteria: [
          {
            field: 'reviewDate',
            operator: 'is_on_or_before',
            relativeDate: 'today',
          },
          {
            field: 'status',
            operator: 'not_equals',
            value: 'resolved',
          },
        ],
      },
      sort: [{ field: 'reviewDate', direction: 'asc' }],
    },
    presentation: {
      viewType: 'list',
      visibleColumns: ['title', 'status', 'reviewDate', 'outcome'],
      dateFieldMapping: 'reviewDate',
    },
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
];
