import { describe, expect, it } from 'vitest';
import catalogue from '../../src/generated/catalogue-public.json';
import products from '../../src/data/products-v2.json';
import {
  FOLIO_P9_PROJECTION,
  folioModuleForCatalogueSlug,
  isFolioCatalogueMember,
} from '../../src/lib/folio-consolidation';

describe('P9 Folio Hub projection', () => {
  it('maps existing catalogue identities to Folio modules without replacing them', () => {
    expect(folioModuleForCatalogueSlug('notes')).toBe('folio/notes');
    expect(folioModuleForCatalogueSlug('thiepn-library')).toBe('folio/library');
    expect(folioModuleForCatalogueSlug('manuscript')).toBe('folio/write');
    expect(folioModuleForCatalogueSlug('canvas')).toBe('folio/canvas');
    expect(folioModuleForCatalogueSlug('pdf-studio')).toBeNull();
  });

  it('preserves existing project cards and URLs in P9', () => {
    expect(FOLIO_P9_PROJECTION.rules.removeLegacyCards).toBe(false);
    expect(FOLIO_P9_PROJECTION.rules.rewriteProjectRoutes).toBe(false);
    expect(FOLIO_P9_PROJECTION.rules.rewriteLiveUrls).toBe(false);

    for (const member of FOLIO_P9_PROJECTION.members) {
      const project = catalogue.projects.find(
        (entry) => entry.slug === member.catalogueSlug,
      );
      expect(project).toBeDefined();
      expect(isFolioCatalogueMember(member.catalogueSlug)).toBe(true);
    }
  });

  it('keeps the unified home and Knowledge surfaces staged', () => {
    expect(FOLIO_P9_PROJECTION.stagedModules).toEqual([
      'folio/home',
      'folio/knowledge',
    ]);
    const folio = products.products.find((product) => product.id === 'folio');
    expect(folio?.state).toBe('staged');
    expect(
      folio?.modules.find((module) => module.id === 'knowledge')?.state,
    ).toBe('staged');
  });

  it('binds the real Folio workspace as the staged home provider', () => {
    const folio = products.products.find((product) => product.id === 'folio');
    const home = folio?.modules.find((module) => module.id === 'home');
    expect(home?.repo).toBe('thiepn/folio');
    expect(home?.launchUrl).toBe('https://thiepn.dev/folio/');
    expect(home?.capabilities).toEqual(
      expect.arrayContaining(['tasks', 'projects', 'planning']),
    );
  });
});
