import registryData from '../data/products-v2.json';
import type {
  ProductModuleV2,
  ProductRegistryV2,
  ProductV2,
  ResolvedProductModuleV2,
} from '../types/product-registry';

export const PRODUCT_REGISTRY_V2 = registryData as ProductRegistryV2;

const productById = new Map<string, ProductV2>(
  PRODUCT_REGISTRY_V2.products.map((product) => [product.id, product]),
);

const moduleByRef = new Map<string, { product: ProductV2; module: ProductModuleV2 }>();
for (const product of PRODUCT_REGISTRY_V2.products) {
  for (const module of product.modules) {
    moduleByRef.set(`${product.id}/${module.id}`, { product, module });
  }
}

export function productByIdV2(id: string): ProductV2 | null {
  return productById.get(id) ?? null;
}

export function productModuleByRefV2(ref: string): ResolvedProductModuleV2 | null {
  const resolved = moduleByRef.get(ref);
  if (!resolved) return null;
  return { ...resolved, canonicalRef: ref, alias: null };
}

export function resolveProductAliasV2(aliasOrRef: string): ResolvedProductModuleV2 | null {
  const product = productById.get(aliasOrRef);
  const productDefault = product ? `${product.id}/${product.defaultModule}` : null;
  const target = PRODUCT_REGISTRY_V2.aliases[aliasOrRef] ?? productDefault ?? aliasOrRef;
  const resolved = moduleByRef.get(target);
  if (!resolved) return null;
  return {
    ...resolved,
    canonicalRef: target,
    alias: target === aliasOrRef ? null : aliasOrRef,
  };
}

export function modulesForProductV2(productId: string): readonly ProductModuleV2[] {
  return productById.get(productId)?.modules ?? [];
}

export function aliasesForModuleV2(ref: string): string[] {
  return Object.entries(PRODUCT_REGISTRY_V2.aliases)
    .filter(([, target]) => target === ref)
    .map(([alias]) => alias)
    .sort();
}
