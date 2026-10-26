/**
 * Saved Views Manager
 * 
 * Manages reusable filtered & sorted cross-domain views:
 * - Supports Notes, Tasks, Collections, Library, Finance, Assets, Projects
 * - Defensively handles schema evolution: Flags broken filter properties
 *   rather than crashing when a tag, status, or custom field is modified/deleted.
 * - Seamlessly integrates with Favorites and Keyboard Shortcuts.
 */

import { SavedViewConfig, SavedViewDomain, SavedViewFilterRule } from './personalizationTypes';
import { preferenceService } from './preferenceService';

const SAVED_VIEWS_STORAGE_KEY = 'saved_views_v16';

export const BUILTIN_SAVED_VIEWS: SavedViewConfig[] = [
  {
    id: 'sv-urgent-tasks',
    name: 'High Priority Tasks',
    description: 'All pending tasks marked urgent or high priority',
    domain: 'tasks',
    iconName: 'AlertTriangle',
    filters: [
      { field: 'priority', operator: 'in', value: ['urgent', 'high'] },
      { field: 'completed', operator: 'equals', value: false },
    ],
    sort: { field: 'dueDate', direction: 'asc' },
    isFavorite: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sv-reading-inbox',
    name: 'Unread Library Items',
    description: 'Articles and books queued in library',
    domain: 'library',
    iconName: 'BookOpen',
    filters: [
      { field: 'status', operator: 'equals', value: 'to-read' },
    ],
    sort: { field: 'addedAt', direction: 'desc' },
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sv-active-projects',
    name: 'Active Sprint Projects',
    description: 'Current active projects under planning',
    domain: 'projects',
    iconName: 'Target',
    filters: [
      { field: 'status', operator: 'equals', value: 'active' },
    ],
    sort: { field: 'targetDate', direction: 'asc' },
    isFavorite: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export class SavedViewsManager {
  public getSavedViews(): SavedViewConfig[] {
    const userCustom = preferenceService.get<SavedViewConfig[]>(SAVED_VIEWS_STORAGE_KEY, [], 'global-synced');
    return [...BUILTIN_SAVED_VIEWS, ...userCustom];
  }

  public getSavedViewsByDomain(domain: SavedViewDomain): SavedViewConfig[] {
    return this.getSavedViews().filter((v) => v.domain === domain);
  }

  public getSavedViewById(id: string): SavedViewConfig | undefined {
    return this.getSavedViews().find((v) => v.id === id);
  }

  public async saveView(view: Omit<SavedViewConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedViewConfig> {
    const customViews = preferenceService.get<SavedViewConfig[]>(SAVED_VIEWS_STORAGE_KEY, [], 'global-synced');
    const now = new Date().toISOString();
    const newView: SavedViewConfig = {
      ...view,
      id: `sv-custom-${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [...customViews, newView];
    await preferenceService.set(SAVED_VIEWS_STORAGE_KEY, updated, 'global-synced');
    return newView;
  }


  /** Rehydrate a portable custom view under its ORIGINAL ID.
   * Never overwrite a conflicting saved view or silently regenerate the ID:
   * B2 pins reference the view's stable URI.
   */
  public async importView(input: unknown): Promise<'imported' | 'existing' | 'invalid'> {
    if (!input || typeof input !== 'object') return 'invalid';
    const view = input as Partial<SavedViewConfig>;
    if (typeof view.id !== 'string' || !/^sv-custom-[a-z0-9-]{1,100}$/iu.test(view.id) ||
        typeof view.name !== 'string' || !view.name.trim() || view.name.length > 80 ||
        !['notes', 'tasks', 'projects', 'keep-workspace', 'collection', 'library', 'finance', 'assets'].includes(String(view.domain)) ||
        !Array.isArray(view.filters) || view.filters.length > 16 ||
        view.filters.some(f => !f || typeof f.field !== 'string' || f.field.length > 80 ||
          !/^[a-zA-Z][a-zA-Z0-9_-]*$/u.test(f.field) ||
          !['equals','not-equals','contains','in','greater-than','less-than','is-empty'].includes(f.operator)) ||
        typeof view.createdAt !== 'string' || !Number.isFinite(Date.parse(view.createdAt)) ||
        typeof view.updatedAt !== 'string' || !Number.isFinite(Date.parse(view.updatedAt)) ||
        (view.sort !== undefined && (!view.sort || typeof view.sort.field !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]*$/u.test(view.sort.field) || !['asc','desc'].includes(view.sort.direction)))) return 'invalid';
    const existing = preferenceService.get<SavedViewConfig[]>(SAVED_VIEWS_STORAGE_KEY, [], 'global-synced');
    if (existing.some(v => v.id === view.id)) return 'existing';
    await preferenceService.set(SAVED_VIEWS_STORAGE_KEY, [...existing, view as SavedViewConfig], 'global-synced');
    return 'imported';
  }
  public async updateView(id: string, updates: Partial<SavedViewConfig>): Promise<SavedViewConfig | null> {
    const customViews = preferenceService.get<SavedViewConfig[]>(SAVED_VIEWS_STORAGE_KEY, [], 'global-synced');
    const index = customViews.findIndex((v) => v.id === id);
    if (index === -1) return null;

    const updatedView: SavedViewConfig = {
      ...customViews[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    customViews[index] = updatedView;
    await preferenceService.set(SAVED_VIEWS_STORAGE_KEY, customViews, 'global-synced');
    return updatedView;
  }

  public async deleteView(id: string): Promise<boolean> {
    const customViews = preferenceService.get<SavedViewConfig[]>(SAVED_VIEWS_STORAGE_KEY, [], 'global-synced');
    const filtered = customViews.filter((v) => v.id !== id);
    if (filtered.length === customViews.length) return false;

    await preferenceService.set(SAVED_VIEWS_STORAGE_KEY, filtered, 'global-synced');
    return true;
  }

  /**
   * Evaluates a record against a set of saved view filter rules defensively
   */
  public matchesFilters(record: Record<string, any>, filters: SavedViewFilterRule[]): boolean {
    if (!filters || filters.length === 0) return true;

    for (const filter of filters) {
      const val = record[filter.field];

      switch (filter.operator) {
        case 'equals':
          if (val !== filter.value) return false;
          break;
        case 'not-equals':
          if (val === filter.value) return false;
          break;
        case 'contains':
          if (typeof val === 'string' && typeof filter.value === 'string') {
            if (!val.toLowerCase().includes(filter.value.toLowerCase())) return false;
          } else if (Array.isArray(val)) {
            if (!val.includes(filter.value)) return false;
          } else {
            return false;
          }
          break;
        case 'in':
          if (Array.isArray(filter.value)) {
            if (!filter.value.includes(val)) return false;
          }
          break;
        case 'greater-than':
          if (val <= filter.value) return false;
          break;
        case 'less-than':
          if (val >= filter.value) return false;
          break;
        case 'is-empty':
          if (val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
            return false;
          }
          break;
      }
    }

    return true;
  }
}

export const savedViewsManager = new SavedViewsManager();
