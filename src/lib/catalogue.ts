import { getCollection } from 'astro:content';
import { CURATED_PROJECT_ORDER, FEATURED_PROJECTS } from '../data/curation';
import { PROJECT_RELATIONS } from '../data/project-relations';
import type { ProjectCategory } from '../data/taxonomy';
import { computeCatalogueStats, isPublicProject } from './catalogue-core';

const curatedIndex = new Map(CURATED_PROJECT_ORDER.map((slug, index) => [slug, index]));
const featuredIndex = new Map(FEATURED_PROJECTS.map((slug, index) => [slug, index]));

export async function getAllProjects() {
  return getCollection('projects');
}

export async function getPublicProjects() {
  const projects = await getAllProjects();
  return projects
    .filter((entry) => isPublicProject(entry.data))
    .sort((a, b) => {
      const ai = curatedIndex.get(a.data.slug) ?? Number.MAX_SAFE_INTEGER;
      const bi = curatedIndex.get(b.data.slug) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi || a.data.title.localeCompare(b.data.title);
    });
}

export async function getFeaturedProjects() {
  return (await getPublicProjects())
    .filter((entry) => featuredIndex.has(entry.data.slug))
    .sort((a, b) => (featuredIndex.get(a.data.slug) ?? 999) - (featuredIndex.get(b.data.slug) ?? 999));
}

export async function getProjectsByCategory(category: ProjectCategory) {
  return (await getPublicProjects()).filter((entry) => entry.data.category === category);
}

export async function getProjectBySlug(slug: string) {
  const projects = await getAllProjects();
  return projects.find((entry) => entry.data.slug === slug);
}

export async function getCollections() {
  return getCollection('collections');
}

export async function getCollectionBySlug(slug: string) {
  const collections = await getCollections();
  return collections.find((entry) => entry.data.slug === slug);
}

export async function getCatalogueStats() {
  const projects = await getAllProjects();
  return computeCatalogueStats(projects.map((entry) => entry.data));
}

export async function getRelatedProjects(slug: string, limit = 4) {
  const relations = PROJECT_RELATIONS[slug] ?? [];
  const projects = await getPublicProjects();
  const current = projects.find((entry) => entry.data.slug === slug);
  if (!current) return [];
  const bySlug = new Map(projects.map((entry) => [entry.data.slug, entry]));
  const selected = relations.map((relatedSlug) => bySlug.get(relatedSlug)).filter((entry) => entry !== undefined);
  const selectedSlugs = new Set([slug, ...selected.map((entry) => entry.data.slug)]);
  const inferred = projects
    .filter((entry) => !selectedSlugs.has(entry.data.slug))
    .map((entry) => {
      const sharedCollections = entry.data.collections.filter((value) => current.data.collections.includes(value)).length;
      const sharedTags = entry.data.tags.filter((value) => current.data.tags.includes(value)).length;
      const category = entry.data.category === current.data.category ? 1 : 0;
      return { entry, score: sharedCollections * 8 + sharedTags * 3 + category * 2 };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  for (const { entry } of inferred) {
    if (selected.length >= Math.max(3, limit)) break;
    selected.push(entry);
    selectedSlugs.add(entry.data.slug);
  }
  // Last-resort catalogue neighbors prevent sparse records without overriding manual/editorial relevance.
  if (selected.length < Math.max(3, limit)) {
    const currentIndex = projects.findIndex((entry) => entry.data.slug === slug);
    const fallback = projects
      .filter((entry) => !selectedSlugs.has(entry.data.slug))
      .map((entry) => ({ entry, distance: Math.abs(projects.findIndex((candidate) => candidate.data.slug === entry.data.slug) - currentIndex) }))
      .sort((a, b) => a.distance - b.distance);
    for (const { entry } of fallback) {
      if (selected.length >= Math.max(3, limit)) break;
      selected.push(entry);
      selectedSlugs.add(entry.data.slug);
    }
  }
  return selected.slice(0, Math.max(3, limit));
}

export async function getProjectNeighbors(slug: string) {
  const projects = await getPublicProjects();
  const index = projects.findIndex((entry) => entry.data.slug === slug);
  if (index < 0) return { previous: undefined, next: undefined };
  return {
    previous: index > 0 ? projects[index - 1] : undefined,
    next: index < projects.length - 1 ? projects[index + 1] : undefined,
  };
}
