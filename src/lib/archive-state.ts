import type { SearchableProject } from './search-core';
import { matchesProjectQuery } from './search-core';

export type ArchiveSort = 'curated' | 'recent' | 'az';
export type ArchiveView = 'grid' | 'list';
export type ArchiveCategory = 'all' | 'tools' | 'learning' | 'games' | 'resources' | 'visualizations' | 'experiments';

export interface ArchiveState {
  query: string;
  category: ArchiveCategory;
  sort: ArchiveSort;
  view: ArchiveView;
}

export const DEFAULT_ARCHIVE_STATE: ArchiveState = {
  query: '',
  category: 'all',
  sort: 'curated',
  view: 'grid',
};

const categories = new Set<ArchiveCategory>(['all', 'tools', 'learning', 'games', 'resources', 'visualizations', 'experiments']);
const sorts = new Set<ArchiveSort>(['curated', 'recent', 'az']);
const views = new Set<ArchiveView>(['grid', 'list']);

export function parseArchiveState(url: URL, storedView?: string | null): ArchiveState {
  const category = url.searchParams.get('category') as ArchiveCategory | null;
  const sort = url.searchParams.get('sort') as ArchiveSort | null;
  const view = url.searchParams.get('view') as ArchiveView | null;
  return {
    query: url.searchParams.get('q')?.trim() ?? '',
    category: category && categories.has(category) ? category : 'all',
    sort: sort && sorts.has(sort) ? sort : 'curated',
    view: view && views.has(view) ? view : (storedView && views.has(storedView as ArchiveView) ? storedView as ArchiveView : 'grid'),
  };
}

export function serializeArchiveState(state: ArchiveState, url: URL): URL {
  const next = new URL(url);
  const setOrDelete = (key: string, value: string, defaultValue: string) => value && value !== defaultValue ? next.searchParams.set(key, value) : next.searchParams.delete(key);
  setOrDelete('q', state.query.trim(), '');
  setOrDelete('category', state.category, 'all');
  setOrDelete('sort', state.sort, 'curated');
  setOrDelete('view', state.view, 'grid');
  return next;
}

export function filterAndSortProjects(projects: readonly SearchableProject[], state: ArchiveState, curatedOrder: readonly string[]): SearchableProject[] {
  const curatedIndex = new Map(curatedOrder.map((slug, index) => [slug, index]));
  const filtered = projects.filter((project) => {
    if (state.category !== 'all' && project.category !== state.category) return false;
    return matchesProjectQuery(project, state.query);
  });

  return [...filtered].sort((a, b) => {
    if (state.sort === 'az') return a.title.localeCompare(b.title);
    if (state.sort === 'recent') {
      const aDate = Date.parse(a.updatedAt || '') || 0;
      const bDate = Date.parse(b.updatedAt || '') || 0;
      return bDate - aDate || a.title.localeCompare(b.title);
    }
    return (curatedIndex.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (curatedIndex.get(b.slug) ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title);
  });
}
