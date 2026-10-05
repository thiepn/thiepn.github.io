export interface ProductModuleV2 {
  id: string;
  name: string;
  repo: string | null;
  launchUrl: string | null;
  state: 'active' | 'staged';
  capabilities: readonly string[];
}

export interface ProductV2 {
  id: string;
  name: string;
  ownerRepos: readonly string[];
  launchUrl: string | null;
  defaultModule: string;
  state: 'active' | 'staged';
  capabilities: readonly string[];
  modules: readonly ProductModuleV2[];
}

export interface ProductRegistryV2 {
  schemaVersion: 2;
  contractId: 'thiepn-product-registry-v2';
  compatibility: {
    preserveLegacyAppIds: true;
    legacyRegistry: 'thiepn/core/registry/apps.json';
    aliasMode: 'resolve-only';
    removedIds: readonly string[];
  };
  products: readonly ProductV2[];
  aliases: Readonly<Record<string, string>>;
}

export interface ResolvedProductModuleV2 {
  product: ProductV2;
  module: ProductModuleV2;
  canonicalRef: string;
  alias: string | null;
}
