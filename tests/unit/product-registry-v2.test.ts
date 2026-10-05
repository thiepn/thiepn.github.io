import { describe, expect, it } from 'vitest';
import {
  PRODUCT_REGISTRY_V2,
  aliasesForModuleV2,
  modulesForProductV2,
  productByIdV2,
  productModuleByRefV2,
  resolveProductAliasV2,
} from '../../src/lib/product-registry';

describe('product registry v2', () => {
  it('exposes the frozen first-class product set', () => {
    expect(PRODUCT_REGISTRY_V2.products.map((product) => product.id)).toEqual([
      'hub',
      'folio',
      'bible',
      'games',
      'study',
      'diet',
      'french',
      'pdf',
      'orrery',
    ]);
  });

  it('resolves legacy identities without replacing them', () => {
    expect(resolveProductAliasV2('knowledge')?.canonicalRef).toBe('folio/knowledge');
    expect(resolveProductAliasV2('library')?.canonicalRef).toBe('folio/library');
    expect(resolveProductAliasV2('manuscript')?.canonicalRef).toBe('folio/write');
    expect(resolveProductAliasV2('notes')?.canonicalRef).toBe('folio/notes');
    expect(resolveProductAliasV2('tms60')?.canonicalRef).toBe('bible/tms60');
    expect(resolveProductAliasV2('mdd')?.canonicalRef).toBe('bible/devotion');
  });

  it('resolves canonical refs and rejects unknown refs', () => {
    expect(productModuleByRefV2('pdf/studio')?.module.name).toBe('PDF Studio');
    expect(resolveProductAliasV2('pdf/studio')?.alias).toBeNull();
    expect(resolveProductAliasV2('missing')).toBeNull();
  });

  it('supports product and reverse-alias lookups', () => {
    expect(productByIdV2('folio')?.name).toBe('Folio');
    expect(modulesForProductV2('bible').map((module) => module.id)).toContain('tms60');
    expect(aliasesForModuleV2('folio/write')).toContain('manuscript');
  });
});
