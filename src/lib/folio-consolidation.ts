import projection from '../data/folio-projection-p9.json';

const bySlug = new Map(
  projection.members.map((member) => [member.catalogueSlug, member.moduleRef]),
);

export const FOLIO_P9_PROJECTION = projection;

export function folioModuleForCatalogueSlug(
  slug: string,
): string | null {
  return bySlug.get(slug) ?? null;
}

export function isFolioCatalogueMember(slug: string): boolean {
  return bySlug.has(slug);
}
