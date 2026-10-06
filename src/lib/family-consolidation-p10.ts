import projection from '../data/family-projection-p10.json';

const catalogueModulePairs = [
  ...projection.families.bible.catalogueMembers,
  ...projection.families.games.catalogueMembers,
] as const;

const bySlug = new Map(
  catalogueModulePairs.map((member) => [
    member.catalogueSlug,
    member.moduleRef,
  ]),
);

export const P10_FAMILY_PROJECTION = projection;

export function familyModuleForCatalogueSlug(
  slug: string,
): string | null {
  return bySlug.get(slug) ?? null;
}

export function isP10FamilyCatalogueMember(slug: string): boolean {
  return bySlug.has(slug);
}
