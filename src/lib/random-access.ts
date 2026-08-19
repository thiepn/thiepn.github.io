import type { SearchableProject } from './search-core';

export function randomWeight(project: SearchableProject, featuredSlugs: readonly string[] = []): number {
  if (project.status === 'archived') return 0;
  let weight = featuredSlugs.includes(project.slug) ? 1.2 : 1;
  if (project.status === 'beta') weight *= 0.7;
  if (project.status === 'experiment') weight *= 0.8;
  return weight;
}

export function pickRandomProject(projects: readonly SearchableProject[], random = Math.random, featuredSlugs: readonly string[] = []): SearchableProject | undefined {
  const weighted = projects.map((project) => ({ project, weight: randomWeight(project, featuredSlugs) })).filter(({ weight }) => weight > 0);
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (!total) return undefined;
  let target = random() * total;
  for (const item of weighted) {
    target -= item.weight;
    if (target <= 0) return item.project;
  }
  return weighted.at(-1)?.project;
}
