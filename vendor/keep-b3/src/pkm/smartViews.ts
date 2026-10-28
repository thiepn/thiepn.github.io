import { SavedSmartView } from './queryTypes';

export const BUILTIN_SMART_VIEWS: SavedSmartView[] = [
  {
    id: 'view-urgent-tasks',
    name: '🔥 Urgent & High Priority',
    query: '(priority:urgent OR priority:high) -status:done sort:priority order:desc',
    description: 'All unresolved notes and tasks tagged with urgent or high priority',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'view-open-tasks',
    name: '📋 In-Flight Tasks & Todos',
    query: '(status:todo OR status:in_progress OR has:undone) -is:archived sort:updated order:desc',
    description: 'Notes with active checklist items or marked in progress',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'view-recent-week',
    name: '⚡ Modified This Week',
    query: 'updated:this-week -is:archived sort:updated order:desc limit:20',
    description: 'Notes created or updated in the past week',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'view-unorganized',
    name: '📂 Inbox & Unorganized',
    query: 'folder:none -is:archived sort:created order:desc',
    description: 'Notes not yet categorized into a folder',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'view-favorites',
    name: '⭐ Pinned & Favorites',
    query: 'is:pinned OR is:favorite sort:title order:asc',
    description: 'Bookmarked and pinned important notes',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'view-knowledge-hubs',
    name: '🔗 Knowledge Hubs (Most Linked)',
    query: 'has:links sort:links order:desc limit:15',
    description: 'Core index notes with the highest forward and backward connections',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'view-reminders',
    name: '🔔 Upcoming Reminders',
    query: 'has:reminder -is:archived sort:updated order:desc',
    description: 'Notes with scheduled alert dates',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const STORAGE_KEY = 'pkm_saved_smart_views';

export function loadSavedSmartViews(): SavedSmartView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...BUILTIN_SMART_VIEWS];
    const custom = JSON.parse(raw) as SavedSmartView[];
    // Merge built-in + custom
    const customMap = new Map(custom.map((v) => [v.id, v]));
    const list: SavedSmartView[] = [...BUILTIN_SMART_VIEWS];
    for (const c of custom) {
      if (!list.some((b) => b.id === c.id)) {
        list.push(c);
      }
    }
    return list;
  } catch {
    return [...BUILTIN_SMART_VIEWS];
  }
}

export function saveSmartView(view: Omit<SavedSmartView, 'id' | 'createdAt'> & { id?: string }): SavedSmartView {
  const current = loadSavedSmartViews();
  const id = view.id || `custom-view-${Date.now()}`;
  const now = new Date().toISOString();

  const existingIdx = current.findIndex((v) => v.id === id);
  let updatedView: SavedSmartView;

  if (existingIdx >= 0) {
    updatedView = {
      ...current[existingIdx],
      ...view,
      id,
      updatedAt: now,
    };
    current[existingIdx] = updatedView;
  } else {
    updatedView = {
      id,
      name: view.name,
      query: view.query,
      description: view.description,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    };
    current.push(updatedView);
  }

  // Save only non-built-in views to storage
  const customOnly = current.filter((v) => !v.isBuiltIn);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
  } catch (e) {
    console.error('Failed to save smart views to localStorage', e);
  }

  return updatedView;
}

export function deleteSavedSmartView(id: string): boolean {
  const current = loadSavedSmartViews();
  const filtered = current.filter((v) => v.id !== id && !v.isBuiltIn);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}
