import { CURATED_PROJECT_ORDER, FEATURED_PROJECTS } from '../data/curation';
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from '../data/taxonomy';
import type { ProjectCategory, ProjectStatus, ProjectVisibility } from '../data/taxonomy';
import type { CatalogueStats } from '../types/catalogue';

const curatedIndex = new Map<string, number>(CURATED_PROJECT_ORDER.map((slug, index) => [slug, index]));
const featuredIndex = new Map<string, number>(FEATURED_PROJECTS.map((slug, index) => [slug, index]));

export function isPublicProject(project: { visibility: ProjectVisibility }): boolean {
  return project.visibility === 'listed';
}

export function sortProjectsCurated<T extends { slug: string; title: string }>(projects: readonly T[]): T[] {
  return [...projects].sort((a, b) => {
    const ai = curatedIndex.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bi = curatedIndex.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi || a.title.localeCompare(b.title);
  });
}

export function sortFeaturedProjects<T extends { slug: string }>(projects: readonly T[]): T[] {
  return [...projects]
    .filter((project) => featuredIndex.has(project.slug))
    .sort((a, b) => (featuredIndex.get(a.slug) ?? 999) - (featuredIndex.get(b.slug) ?? 999));
}

export function filterProjectsByCategory<T extends { category: ProjectCategory }>(projects: readonly T[], category: ProjectCategory): T[] {
  return projects.filter((project) => project.category === category);
}

export function computeCatalogueStats<T extends {
  visibility: ProjectVisibility;
  status: ProjectStatus;
  category: ProjectCategory;
}>(projects: readonly T[]): CatalogueStats {
  const publicProjects = projects.filter(isPublicProject);
  const status = Object.fromEntries(PROJECT_STATUSES.map((value) => [value, 0])) as CatalogueStats['status'];
  const categories = Object.fromEntries(PROJECT_CATEGORIES.map((value) => [value, 0])) as CatalogueStats['categories'];

  for (const project of publicProjects) {
    status[project.status] += 1;
    categories[project.category] += 1;
  }

  return {
    totalRegistered: projects.length,
    totalListed: publicProjects.length,
    status,
    categories,
  };
}
