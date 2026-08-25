import type { ProjectCategory } from './taxonomy';

export const PROJECT_INTENTS = [
  {
    key: 'play',
    label: 'Play',
    description: 'Games, quizzes, and interactive challenges.',
    categories: ['games'],
  },
  {
    key: 'use',
    label: 'Use',
    description: 'Practical tools and apps for real tasks.',
    categories: ['tools'],
  },
  {
    key: 'learn',
    label: 'Learn',
    description: 'Study systems, language tools, and guided learning.',
    categories: ['learning'],
  },
  {
    key: 'read',
    label: 'Read',
    description: 'Guides, references, and long-form resources.',
    categories: ['resources'],
  },
  {
    key: 'explore',
    label: 'Explore',
    description: 'Visualizations, prototypes, and experiments.',
    categories: ['visualizations', 'experiments'],
  },
] as const satisfies readonly {
  key: string;
  label: string;
  description: string;
  categories: readonly ProjectCategory[];
}[];

export type ProjectIntent = (typeof PROJECT_INTENTS)[number]['key'];

export const PROJECT_INTENT_KEYS = PROJECT_INTENTS.map((intent) => intent.key) as ProjectIntent[];

export function matchesProjectIntent(category: string, intent: ProjectIntent): boolean {
  const definition = PROJECT_INTENTS.find((candidate) => candidate.key === intent);
  return Boolean(definition?.categories.includes(category as ProjectCategory));
}

export function getIntentCounts(projects: readonly { category: string }[]): Record<ProjectIntent, number> {
  return Object.fromEntries(
    PROJECT_INTENTS.map((intent) => [intent.key, projects.filter((project) => matchesProjectIntent(project.category, intent.key)).length]),
  ) as Record<ProjectIntent, number>;
}
