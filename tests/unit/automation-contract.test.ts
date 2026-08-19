import { describe, expect, it } from 'vitest';
import searchIndex from '../../src/generated/search-index.json';
import catalogue from '../../src/generated/catalogue-public.json';
import routes from '../../src/generated/route-manifest.json';

describe('Phase 10 generated catalogue contract', () => {
  it('keeps public project outputs in sync', () => {
    expect(searchIndex.projects.length).toBe(catalogue.projects.length);
    for (const project of catalogue.projects) {
      expect(searchIndex.projects.some((entry) => entry.slug === project.slug)).toBe(true);
      expect(routes.routes).toContain(`/project/${project.slug}/`);
    }
  });

  it('does not publish dev diagnostics in the route manifest', () => {
    expect(routes.routes.some((route) => route.startsWith('/dev/'))).toBe(false);
  });
});
