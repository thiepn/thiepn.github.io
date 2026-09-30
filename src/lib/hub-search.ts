import tasks from '../data/hub-tasks.json';
import { DEFAULT_HUB_PINS } from './hub-preferences';
import type { HubProjectEntry } from './hub';
import { searchCatalogue, type SearchableProject } from './search-core';

export function hubSearchProjects(entries: readonly HubProjectEntry[]): SearchableProject[] {
  return entries.map(({ project, hub }) => {
    const p = project.data;
    return {
      kind: 'project', code: p.code, slug: p.slug, title: p.title, subtitle: hub.description,
      summary: p.summary, aliases: [...p.aliases, ...(tasks[p.slug as keyof typeof tasks] ?? [])],
      category: hub.category, status: p.status, tags: p.tags, collections: [],
      accentLight: p.accent.light, accentDark: p.accent.dark, liveUrl: p.liveUrl!,
    };
  });
}

export function hubSearchPayload(entries: readonly HubProjectEntry[]) {
  const projects = hubSearchProjects(entries);
  return { projects, collections: [], featured: DEFAULT_HUB_PINS.filter(slug => projects.some(p => p.slug === slug)) };
}

export function findHubApps(projects: readonly SearchableProject[], query: string): SearchableProject[] {
  const boundedQuery = query.trim().slice(0, 200);
  return boundedQuery ? searchCatalogue(projects, boundedQuery, projects.length).map(result => result.item as SearchableProject) : [...projects];
}
