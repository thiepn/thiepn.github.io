import config from '../data/showcase.json';
import type { ProjectEntry } from './catalogue';
export interface Presentation {
  tier: string; line: string; summary: string; media: string;
  caption: string; tone: string; action: string; note?: string;
}
export const showcase = config;
export function presentation(project: ProjectEntry): Presentation {
  const p = project.data;
  const custom = (config.projects as Record<string, Presentation>)[p.slug];
  if (custom) return custom;
  return {
    tier: 'archive', line: p.subtitle, summary: p.summary,
    media: p.preview.provenance === 'captured' && p.preview.poster ? p.preview.poster : `/projects/${p.slug}/capture.jpg`,
    caption: `${p.title} — captured project interface.`, tone: 'paper',
    action: `${p.actions.primaryLabel} ${p.title}`,
  };
}
export function selectProjects(projects: ProjectEntry[], slugs: string[]) {
  const bySlug = new Map(projects.map(p => [p.data.slug, p]));
  return slugs.map(slug => {
    const project = bySlug.get(slug);
    if (!project) throw new Error(`Showcase references a non-public project: ${slug}`);
    return project;
  });
}
export const typeLabels: Record<string, string> = {
  games: 'Games', tools: 'Tools', learning: 'Learning', visualizations: 'Visualizations',
  resources: 'Resources', experiments: 'Experiments',
};
