import { describe, expect, it } from 'vitest';
import catalogue from '../../src/generated/catalogue-public.json';
import products from '../../src/data/products-v2.json';
import {
  P10_FAMILY_PROJECTION,
  familyModuleForCatalogueSlug,
  isP10FamilyCatalogueMember,
} from '../../src/lib/family-consolidation-p10';

describe('P10 Bible + Games Hub projection', () => {
  it('maps existing Bible catalogue cards without replacing them', () => {
    expect(familyModuleForCatalogueSlug('tms60')).toBe('bible/tms60');
    expect(familyModuleForCatalogueSlug('biblical-greek')).toBe('bible/greek');
    expect(P10_FAMILY_PROJECTION.families.bible.stagedModules).toEqual([
      'bible/study',
      'bible/devotion',
    ]);
  });

  it('maps the active Games family to existing live game cards', () => {
    expect(familyModuleForCatalogueSlug('micro-arcade')).toBe('games/arcade');
    expect(familyModuleForCatalogueSlug('gomoku')).toBe('games/gomoku');
    expect(familyModuleForCatalogueSlug('wordstrike')).toBe(
      'games/wordstrike',
    );
    expect(P10_FAMILY_PROJECTION.families.games.launchUrl).toBe(
      'https://thiepn.dev/arcade/',
    );
  });

  it('preserves every mapped legacy catalogue entry', () => {
    const members = [
      ...P10_FAMILY_PROJECTION.families.bible.catalogueMembers,
      ...P10_FAMILY_PROJECTION.families.games.catalogueMembers,
    ];
    for (const member of members) {
      expect(
        catalogue.projects.find(
          (project) => project.slug === member.catalogueSlug,
        ),
      ).toBeDefined();
      expect(isP10FamilyCatalogueMember(member.catalogueSlug)).toBe(true);
    }
  });

  it('keeps Bible staged and Games active in the product registry', () => {
    const bible = products.products.find((product) => product.id === 'bible');
    const games = products.products.find((product) => product.id === 'games');

    expect(bible?.state).toBe('staged');
    expect(
      bible?.modules.find((module) => module.id === 'devotion')?.repo,
    ).toBe('thiepn/my-daily-devotion');

    expect(games?.state).toBe('active');
    expect(games?.launchUrl).toBe('https://thiepn.dev/arcade/');
    expect(games?.modules.map((module) => module.id)).toEqual([
      'home',
      'arcade',
      'gomoku',
      'wordstrike',
    ]);
  });

  it('does not map unrelated catalogue projects into P10 families', () => {
    expect(familyModuleForCatalogueSlug('the-bible-challenge')).toBeNull();
    expect(familyModuleForCatalogueSlug('pdf-studio')).toBeNull();
  });
});
