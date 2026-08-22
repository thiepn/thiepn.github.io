import { describe, expect, it } from 'vitest';
import { computeCatalogueStats, isPublicProject, sortFeaturedProjects, sortProjectsCurated } from '../../src/lib/catalogue-core';
import type { CatalogueProject } from '../../src/types/catalogue';

const base = {
  subtitle: 'Test project',
  type: 'tool',
  summary: 'A sufficiently descriptive test project summary.',
  yearAdded: 2026,
  tags: ['productivity'],
  accent: { light: '#123456', dark: '#ABCDEF' },
  preview: { tier: 'P3', type: 'static' },
} as const;

function project(overrides: Partial<CatalogueProject> & Pick<CatalogueProject, 'code' | 'slug' | 'title' | 'category' | 'status' | 'visibility'>): CatalogueProject {
  return { ...base, ...overrides } as CatalogueProject;
}

describe('catalogue helpers', () => {
  it('exposes only listed projects publicly', () => {
    expect(isPublicProject({ visibility: 'listed' })).toBe(true);
    expect(isPublicProject({ visibility: 'hold' })).toBe(false);
    expect(isPublicProject({ visibility: 'hidden' })).toBe(false);
  });

  it('computes public counts without including hold projects', () => {
    const stats = computeCatalogueStats([
      project({ code: 'T-001', slug: 'pdf-studio', title: 'PDF Studio', category: 'tools', status: 'live', visibility: 'listed' }),
      project({ code: 'G-007', slug: 'echoframe-last-signal', title: 'ECHOFRAME', category: 'games', status: 'beta', visibility: 'listed' }),
      project({ code: 'R-001', slug: 'markdown-guide', title: 'Markdown Guide', category: 'resources', status: 'live', visibility: 'hold' }),
    ]);
    expect(stats.totalRegistered).toBe(3);
    expect(stats.totalListed).toBe(2);
    expect(stats.status.live).toBe(1);
    expect(stats.status.beta).toBe(1);
    expect(stats.categories.resources).toBe(0);
  });

  it('uses the manual curation order instead of alphabetical order', () => {
    const input = [
      project({ code: 'G-002', slug: 'wordfall', title: 'Wordfall', category: 'games', status: 'live', visibility: 'listed' }),
      project({ code: 'T-001', slug: 'pdf-studio', title: 'PDF Studio', category: 'tools', status: 'live', visibility: 'listed' }),
    ];
    expect(sortProjectsCurated(input).map((entry) => entry.slug)).toEqual(['pdf-studio', 'wordfall']);
  });

  it('returns featured projects in intentional featured order', () => {
    const input = [
      project({ code: 'G-001', slug: 'wordstrike', title: 'WORDSTRIKE', category: 'games', status: 'live', visibility: 'listed' }),
      project({ code: 'T-002', slug: 'manuscript', title: 'Manuscript', category: 'tools', status: 'live', visibility: 'listed' }),
      project({ code: 'T-001', slug: 'pdf-studio', title: 'PDF Studio', category: 'tools', status: 'live', visibility: 'listed' }),
    ];
    expect(sortFeaturedProjects(input).map((entry) => entry.slug)).toEqual(['pdf-studio', 'wordstrike', 'manuscript']);
  });
});
