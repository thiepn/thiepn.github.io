import { CollectionV2, ExpectedCollectionProperty } from './v2CollectionTypes';
import { SavedViewV2 } from '../views/savedViewTypes';

const STORAGE_KEY_COLLECTIONS_V2 = 'pkm_v2_collections';

export const BUILTIN_COLLECTIONS_V2: CollectionV2[] = [
  {
    id: 'col_projects',
    name: '🎯 Projects & Initiatives',
    description: 'Outcome-oriented projects with target outcomes and task backlogs',
    icon: 'Target',
    color: '#6366f1',
    targetResourceType: 'project',
    schema: {
      expectedProperties: [
        { id: 'status', name: 'Status', type: 'select', options: ['active', 'paused', 'completed'] },
        { id: 'priority', name: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'] },
        { id: 'dueDate', name: 'Target Date', type: 'date' },
        { id: 'lead', name: 'Lead', type: 'relation', relationTargetType: 'person' },
      ],
    },
    baseSource: { type: 'resource_type', resourceTypes: ['project'] },
    baseQuery: {
      version: 2,
      resourceTypes: ['project'],
    },
    defaultViewId: 'col_proj_active_table',
    views: [
      {
        id: 'col_proj_active_table',
        name: 'Active Projects',
        version: 2,
        source: { type: 'resource_type', resourceTypes: ['project'] },
        query: {
          version: 2,
          resourceTypes: ['project'],
          filter: {
            conjunction: 'AND',
            criteria: [{ field: 'status', operator: 'equals', value: 'active' }],
          },
          sort: [{ field: 'dueDate', direction: 'asc' }],
        },
        presentation: {
          viewType: 'table',
          visibleColumns: ['title', 'status', 'priority', 'dueDate'],
        },
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      },
      {
        id: 'col_proj_board_status',
        name: 'Board by Status',
        version: 2,
        source: { type: 'resource_type', resourceTypes: ['project'] },
        query: {
          version: 2,
          resourceTypes: ['project'],
          group: { field: 'status' },
        },
        presentation: {
          viewType: 'board',
          boardFieldMapping: 'status',
          visibleColumns: ['title', 'priority', 'dueDate'],
        },
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      },
    ],
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
  {
    id: 'col_reading_list',
    name: '📚 Reading Library',
    description: 'Books, technical papers, and reading queue',
    icon: 'BookOpen',
    color: '#8b5cf6',
    targetResourceType: 'book',
    schema: {
      expectedProperties: [
        { id: 'author', name: 'Author', type: 'text' },
        { id: 'status', name: 'Status', type: 'select', options: ['queue', 'reading', 'finished'] },
        { id: 'rating', name: 'Rating', type: 'number' },
        { id: 'progress', name: 'Progress (%)', type: 'number' },
      ],
    },
    baseSource: { type: 'resource_type', resourceTypes: ['book'] },
    baseQuery: {
      version: 2,
      resourceTypes: ['book'],
    },
    defaultViewId: 'col_lib_gallery',
    views: [
      {
        id: 'col_lib_gallery',
        name: 'Gallery',
        version: 2,
        source: { type: 'resource_type', resourceTypes: ['book'] },
        query: {
          version: 2,
          resourceTypes: ['book'],
          sort: [{ field: 'progress', direction: 'desc' }],
        },
        presentation: {
          viewType: 'gallery',
          visibleColumns: ['title', 'author', 'progress', 'rating'],
        },
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      },
      {
        id: 'col_lib_table',
        name: 'All Books Table',
        version: 2,
        source: { type: 'resource_type', resourceTypes: ['book'] },
        query: {
          version: 2,
          resourceTypes: ['book'],
          sort: [{ field: 'title', direction: 'asc' }],
        },
        presentation: {
          viewType: 'table',
          visibleColumns: ['title', 'author', 'status', 'rating', 'progress'],
        },
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      },
    ],
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
];

export class CollectionRegistryV2 {
  private collections: Map<string, CollectionV2> = new Map();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.initialized) return;

    for (const c of BUILTIN_COLLECTIONS_V2) {
      this.collections.set(c.id, { ...c });
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLLECTIONS_V2);
      if (raw) {
        const stored = JSON.parse(raw) as CollectionV2[];
        for (const item of stored) {
          if (item && item.id) {
            this.collections.set(item.id, item);
          }
        }
      }
    } catch {
      // Fallback
    }

    this.initialized = true;
  }

  public getAll(): CollectionV2[] {
    this.init();
    return Array.from(this.collections.values());
  }

  public getById(id: string): CollectionV2 | undefined {
    this.init();
    return this.collections.get(id);
  }

  public saveCollection(col: Omit<CollectionV2, 'id' | 'createdAt' | 'updatedAt'>): CollectionV2 {
    this.init();
    const id = `col_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();
    const fullCol: CollectionV2 = {
      ...col,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.collections.set(id, fullCol);
    this.persist();
    return fullCol;
  }

  public updateCollection(id: string, updates: Partial<CollectionV2>): CollectionV2 | undefined {
    this.init();
    const existing = this.collections.get(id);
    if (!existing) return undefined;

    const updated: CollectionV2 = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    };

    this.collections.set(id, updated);
    this.persist();
    return updated;
  }

  /**
   * CRITICAL GUARANTEE: Deleting a collection NEVER deletes underlying resources.
   * Only the collection schema/view wrapper is removed.
   */
  public deleteCollection(id: string): boolean {
    this.init();
    const success = this.collections.delete(id);
    if (success) {
      this.persist();
    }
    return success;
  }

  public addViewToCollection(collectionId: string, view: SavedViewV2): boolean {
    const col = this.getById(collectionId);
    if (!col) return false;

    col.views = [...col.views.filter((v) => v.id !== view.id), view];
    this.updateCollection(collectionId, { views: col.views });
    return true;
  }

  private persist(): void {
    try {
      const custom = Array.from(this.collections.values());
      localStorage.setItem(STORAGE_KEY_COLLECTIONS_V2, JSON.stringify(custom));
    } catch (err) {
      console.error('Failed to persist V2 Collections', err);
    }
  }
}

export const collectionRegistryV2 = new CollectionRegistryV2();
