import hubData from '../data/hub.json';
import { HUB_BADGES, HUB_CATEGORIES, type HubBadge, type HubCategory } from '../data/taxonomy';
import { getAllProjects, type ProjectEntry } from './catalogue';

export interface HubCategoryConfig {
  id: HubCategory;
  label: string;
}

export interface HubProjectConfig {
  slug: string;
  order: number;
  category: HubCategory;
  description: string;
  badge: HubBadge | null;
}

export interface HubProjectEntry {
  project: ProjectEntry;
  hub: HubProjectConfig;
}

export const HUB_EXPECTED_COUNT = hubData.expectedCount;
export const HUB_EXCLUDED_SLUGS = hubData.excluded as readonly string[];
export const HUB_CATEGORY_CONFIG = hubData.categories as HubCategoryConfig[];
export const HUB_PROJECT_CONFIG = hubData.projects as HubProjectConfig[];

const allowedCategories = new Set<string>(HUB_CATEGORIES);
const allowedBadges = new Set<string>(HUB_BADGES);

function assertHubRegistryShape() {
  if (hubData.schemaVersion !== 1) throw new Error(`Unsupported hub schema version: ${hubData.schemaVersion}.`);
  if (HUB_PROJECT_CONFIG.length !== HUB_EXPECTED_COUNT) {
    throw new Error(`Hub registry expected ${HUB_EXPECTED_COUNT} apps but contains ${HUB_PROJECT_CONFIG.length}.`);
  }

  const slugs = new Set<string>();
  const orders = new Set<number>();
  for (const entry of HUB_PROJECT_CONFIG) {
    if (slugs.has(entry.slug)) throw new Error(`Duplicate Hub slug: ${entry.slug}.`);
    if (orders.has(entry.order)) throw new Error(`Duplicate Hub order: ${entry.order}.`);
    if (!allowedCategories.has(entry.category)) throw new Error(`Unknown Hub category ${entry.category} for ${entry.slug}.`);
    if (entry.badge && !allowedBadges.has(entry.badge)) throw new Error(`Unknown Hub badge ${entry.badge} for ${entry.slug}.`);
    slugs.add(entry.slug);
    orders.add(entry.order);
  }

  for (let order = 1; order <= HUB_EXPECTED_COUNT; order += 1) {
    if (!orders.has(order)) throw new Error(`Hub order is not contiguous; missing position ${order}.`);
  }
}

assertHubRegistryShape();

export async function getHubProjects(): Promise<HubProjectEntry[]> {
  const projects = await getAllProjects();
  const bySlug = new Map(projects.map((entry) => [entry.data.slug, entry]));

  return HUB_PROJECT_CONFIG
    .map((hub) => {
      const project = bySlug.get(hub.slug);
      if (!project) throw new Error(`Hub references unknown project: ${hub.slug}.`);
      if (project.data.visibility !== 'listed') throw new Error(`Hub project ${hub.slug} must be listed.`);
      if (project.data.unavailable || !project.data.liveUrl) throw new Error(`Hub project ${hub.slug} must have an available live URL.`);
      return { project, hub };
    })
    .sort((a, b) => a.hub.order - b.hub.order);
}

export function getHubCategoryCounts(entries: readonly HubProjectEntry[]) {
  const counts = Object.fromEntries(HUB_CATEGORIES.map((category) => [category, 0])) as Record<HubCategory, number>;
  for (const entry of entries) counts[entry.hub.category] += 1;
  return counts;
}

export function getHubSearchText(entry: HubProjectEntry) {
  const { project, hub } = entry;
  const p = project.data;
  return [
    p.title,
    ...p.aliases,
    p.subtitle,
    p.summary,
    hub.description,
    hub.category,
    ...p.tags,
  ].join(' ').toLocaleLowerCase();
}
