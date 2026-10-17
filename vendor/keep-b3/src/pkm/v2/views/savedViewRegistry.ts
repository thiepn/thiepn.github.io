import { SavedViewV2, BUILTIN_SAVED_VIEWS_V2 } from './savedViewTypes';
import { unifiedQueryEngineV2 } from '../core/query/unifiedQueryEngine';

const STORAGE_KEY_V2 = 'pkm_v2_saved_views';
const LEGACY_STORAGE_KEY = 'pkm_saved_smart_views';

export class SavedViewRegistryV2 {
  private views: Map<string, SavedViewV2> = new Map();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.initialized) return;

    // Load built-in views
    for (const v of BUILTIN_SAVED_VIEWS_V2) {
      this.views.set(v.id, { ...v });
    }

    // Load saved views from localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY_V2);
      if (raw) {
        const stored = JSON.parse(raw) as SavedViewV2[];
        for (const item of stored) {
          if (item && item.id) {
            this.views.set(item.id, item);
          }
        }
      } else {
        // Attempt V1 Migration if V1 saved views exist
        this.migrateLegacyV1Views();
      }
    } catch {
      // Fallback to built-in views
    }

    this.initialized = true;
  }

  public getAll(): SavedViewV2[] {
    this.init();
    return Array.from(this.views.values()).sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  public getById(id: string): SavedViewV2 | undefined {
    this.init();
    return this.views.get(id);
  }

  public getForResourceType(type: string): SavedViewV2[] {
    return this.getAll().filter((v) => {
      if (v.source.type === 'all') return true;
      if (v.source.resourceTypes && v.source.resourceTypes.includes(type as any)) return true;
      if (v.query.resourceTypes && v.query.resourceTypes.includes(type as any)) return true;
      return false;
    });
  }

  public saveView(view: Omit<SavedViewV2, 'id' | 'createdAt' | 'updatedAt' | 'version'>): SavedViewV2 {
    this.init();
    const id = `view_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();
    const fullView: SavedViewV2 = {
      ...view,
      id,
      version: 2,
      createdAt: now,
      updatedAt: now,
    };

    this.views.set(id, fullView);
    this.persist();
    return fullView;
  }

  public updateView(id: string, updates: Partial<SavedViewV2>): SavedViewV2 | undefined {
    this.init();
    const existing = this.views.get(id);
    if (!existing) return undefined;

    const updated: SavedViewV2 = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    };

    this.views.set(id, updated);
    this.persist();
    return updated;
  }

  public deleteView(id: string): boolean {
    this.init();
    const view = this.views.get(id);
    if (!view || view.isBuiltIn) return false;

    const success = this.views.delete(id);
    if (success) {
      this.persist();
    }
    return success;
  }

  public duplicateView(id: string): SavedViewV2 | undefined {
    this.init();
    const existing = this.views.get(id);
    if (!existing) return undefined;

    return this.saveView({
      ...existing,
      name: `${existing.name} (Copy)`,
      isBuiltIn: false,
    });
  }

  public toggleFavorite(id: string): boolean {
    const view = this.getById(id);
    if (!view) return false;
    this.updateView(id, { favorite: !view.favorite });
    return true;
  }

  private persist(): void {
    try {
      const customViews = Array.from(this.views.values()).filter((v) => !v.isBuiltIn);
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(customViews));
    } catch (err) {
      console.error('Failed to persist V2 Saved Views to localStorage', err);
    }
  }

  public migrateLegacyV1Views(): number {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return 0;

      const legacyViews = JSON.parse(raw);
      if (!Array.isArray(legacyViews)) return 0;

      let count = 0;
      for (const legacy of legacyViews) {
        if (!legacy.id || this.views.has(`v1_migrated_${legacy.id}`)) continue;

        const ast = unifiedQueryEngineV2.parseLegacyQuery(legacy.query || '');
        const migrated: SavedViewV2 = {
          id: `v1_migrated_${legacy.id}`,
          name: legacy.name || 'Migrated View',
          description: legacy.description || 'Migrated from V1 Smart Views',
          icon: legacy.icon || 'Bookmark',
          color: legacy.color || '#64748b',
          version: 2,
          isBuiltIn: Boolean(legacy.isBuiltIn),
          source: { type: 'all' },
          query: ast,
          presentation: {
            viewType: 'list',
            visibleColumns: ['title', 'status', 'updatedAt'],
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        this.views.set(migrated.id, migrated);
        count++;
      }

      if (count > 0) {
        this.persist();
      }
      return count;
    } catch {
      return 0;
    }
  }

  public exportViewsConfig(): string {
    const list = this.getAll();
    return JSON.stringify(list, null, 2);
  }

  public importViewsConfig(json: string): { imported: number; errors: string[] } {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        return { imported: 0, errors: ['Invalid views configuration: root must be an array'] };
      }

      let count = 0;
      const errors: string[] = [];

      for (const item of parsed) {
        if (!item.name || !item.query) {
          errors.push(`Skipped item missing name or query: ${JSON.stringify(item)}`);
          continue;
        }

        this.saveView({
          name: item.name,
          description: item.description,
          icon: item.icon || 'Folder',
          color: item.color || '#3b82f6',
          favorite: Boolean(item.favorite),
          source: item.source || { type: 'all' },
          query: item.query,
          presentation: item.presentation || { viewType: 'list' },
        });
        count++;
      }

      return { imported: count, errors };
    } catch (e: any) {
      return { imported: 0, errors: [e.message || 'Malformed JSON'] };
    }
  }
}

export const savedViewRegistryV2 = new SavedViewRegistryV2();
