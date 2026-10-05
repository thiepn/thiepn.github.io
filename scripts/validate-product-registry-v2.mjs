import { readFile } from 'node:fs/promises';

const registry = JSON.parse(await readFile('src/data/products-v2.json', 'utf8'));
const failures = [];

const id = /^[a-z][a-z0-9-]{0,62}$/;
const capability = /^[a-z][a-z0-9-]{0,62}$/;
const repo = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ref = /^[a-z][a-z0-9-]{0,62}\/[a-z][a-z0-9-]{0,62}$/;

if (registry.schemaVersion !== 2) failures.push('schemaVersion must be 2.');
if (registry.contractId !== 'thiepn-product-registry-v2') failures.push('Unexpected contractId.');
if (registry.compatibility?.preserveLegacyAppIds !== true) failures.push('Legacy app IDs must be preserved.');
if (registry.compatibility?.aliasMode !== 'resolve-only') failures.push('Compatibility aliases must be resolve-only.');
if (!Array.isArray(registry.products) || registry.products.length < 1 || registry.products.length > 30) {
  failures.push('Registry must contain 1–30 first-class products.');
}

const products = new Map();
for (const product of registry.products ?? []) {
  if (!id.test(product.id ?? '')) failures.push(`Invalid product id: ${product.id}`);
  if (products.has(product.id)) failures.push(`Duplicate product id: ${product.id}`);
  if (!Array.isArray(product.ownerRepos) || !product.ownerRepos.length || product.ownerRepos.some((value) => !repo.test(value))) {
    failures.push(`${product.id}: ownerRepos must be non-empty owner/repo values.`);
  }
  if (product.launchUrl !== null) {
    try {
      const url = new URL(product.launchUrl);
      if (url.protocol !== 'https:') throw new Error();
    } catch {
      failures.push(`${product.id}: launchUrl must be HTTPS or null.`);
    }
  }
  if (!Array.isArray(product.capabilities) || !product.capabilities.length || product.capabilities.some((value) => !capability.test(value))) {
    failures.push(`${product.id}: invalid product capabilities.`);
  }

  const modules = new Map();
  for (const module of product.modules ?? []) {
    if (!id.test(module.id ?? '')) failures.push(`${product.id}: invalid module id ${module.id}`);
    if (modules.has(module.id)) failures.push(`${product.id}: duplicate module id ${module.id}`);
    if (module.repo !== null && !repo.test(module.repo ?? '')) failures.push(`${product.id}/${module.id}: invalid repo.`);
    if (module.launchUrl !== null) {
      try {
        const url = new URL(module.launchUrl);
        if (url.protocol !== 'https:') throw new Error();
      } catch {
        failures.push(`${product.id}/${module.id}: launchUrl must be HTTPS or null.`);
      }
    }
    if (!Array.isArray(module.capabilities) || !module.capabilities.length || module.capabilities.some((value) => !capability.test(value))) {
      failures.push(`${product.id}/${module.id}: invalid capabilities.`);
    }
    modules.set(module.id, module);
  }
  if (!modules.size) failures.push(`${product.id}: at least one module is required.`);
  products.set(product.id, modules);
}

for (const [alias, target] of Object.entries(registry.aliases ?? {})) {
  if (!id.test(alias)) failures.push(`Invalid alias: ${alias}`);
  if (!ref.test(String(target))) {
    failures.push(`Invalid alias target: ${alias} → ${target}`);
    continue;
  }
  const [productId, moduleId] = String(target).split('/');
  if (!products.get(productId)?.has(moduleId)) failures.push(`Unknown alias target: ${alias} → ${target}`);
}

const requiredMappings = {
  knowledge: 'folio/knowledge',
  library: 'folio/library',
  manuscript: 'folio/write',
  notes: 'folio/notes',
  tms60: 'bible/tms60',
  mdd: 'bible/devotion',
};
for (const [alias, target] of Object.entries(requiredMappings)) {
  if (registry.aliases?.[alias] !== target) failures.push(`Frozen mapping changed: ${alias} must resolve to ${target}`);
}

const expectedProducts = ['hub', 'folio', 'bible', 'games', 'study', 'diet', 'french', 'pdf', 'orrery'];
const actualProducts = (registry.products ?? []).map((product) => product.id);
if (JSON.stringify(actualProducts) !== JSON.stringify(expectedProducts)) {
  failures.push(`First-class product set changed: expected ${expectedProducts.join(', ')}.`);
}

if (failures.length) {
  console.error('Product registry v2 validation failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Product registry v2 valid: ${registry.products.length} products / ${Object.keys(registry.aliases).length} compatibility aliases.`,
);
