import manifest from '../generated/launch-manifest.json';
import releaseRegistry from '../data/release-certificates.v1.json';
import releasePromotions from '../data/release-promotions.v1.json';
import { certifiedLaunchEntries } from './release-certificates.mjs';
const hubData = {schemaVersion:1,expectedCount:manifest.entries.length,categories:manifest.categories,excluded:manifest.excluded,projects:manifest.entries.map((entry,index)=>({slug:entry.id,order:index+1,category:entry.category,description:entry.description,badge:entry.badge}))};
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

  if (!Number.isInteger(HUB_EXPECTED_COUNT) || HUB_EXPECTED_COUNT < 0 || HUB_EXPECTED_COUNT > 250) throw new Error('Hub supports 0–250 reviewed apps.');
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
      const launch = manifest.entries.find(entry=>entry.id===hub.slug)!;
      const content = bySlug.get(launch.contentSlug ?? '');
      if (launch.contentSlug && !content) throw new Error(`Launch references unknown project: ${launch.contentSlug}.`);
      // Launch-only entries share the card/search contract, without inventing a project page or screenshot.
      const template = projects[0]!;
      const project: ProjectEntry = content ? {...content,data:{...content.data,title:launch.title,liveUrl:launch.url,aliases:[...content.data.aliases,...launch.aliases]}} : {
        ...template, id:launch.id,
        data:{...template.data,slug:launch.id,code:launch.id.toUpperCase(),title:launch.title,subtitle:launch.description,summary:launch.description,aliases:[...launch.aliases,...launch.keywords],liveUrl:launch.url,status:'live',visibility:'listed',unavailable:false,tags:[],repo:launch.ownerRepo,accent:{light:'#356142',dark:'#D6E6AB'},preview:{tier:'P0',type:'auto',provenance:'static'},actions:{primaryLabel:'Open',source:true}}
      };
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

/** Certified-only Apps listing. Legacy getHubProjects() remains unchanged until explicit publication. */
export async function getReleasedHubProjects(): Promise<HubProjectEntry[]> {
  const approvedIds = new Set(certifiedLaunchEntries(manifest, releaseRegistry, releasePromotions).map(entry => entry.id));
  const legacy = await getHubProjects();
  return legacy.filter(entry => approvedIds.has(entry.project.data.slug));
}
