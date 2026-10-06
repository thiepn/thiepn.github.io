import { readFile } from 'node:fs/promises';

const projection = JSON.parse(
  await readFile('src/data/runtime-ownership-p11.json', 'utf8'),
);
const products = JSON.parse(
  await readFile('src/data/products-v2.json', 'utf8'),
);
const platformHealth = await readFile(
  'supabase/functions/platform-health/index.ts',
  'utf8',
);

const failures = [];

if (
  projection.schemaVersion !== 1 ||
  projection.phase !== 'P11' ||
  projection.contractId !== 'hub-runtime-ownership-p11'
)
  failures.push('Unexpected P11 Hub runtime contract identity.');

if (projection.sharedNodeRuntime?.dependency !== false)
  failures.push('Hub must not depend on a shared Node/Vercel runtime.');
if (projection.sharedNodeRuntime?.project !== null)
  failures.push('No active shared Vercel project may be assigned.');
if (projection.sharedNodeRuntime?.domain !== null)
  failures.push('No active shared runtime domain may be assigned.');
if (projection.sharedNodeRuntime?.retiredProjectName !== 'thiepn-platform')
  failures.push('Retired project identity drifted.');
if (projection.sharedNodeRuntime?.retiredDomain !== 'platform.thiepn.dev')
  failures.push('Retired domain identity drifted.');

if (projection.hubRuntime?.ownerRepo !== 'thiepn/thiepn.github.io')
  failures.push('Hub runtime ownership drifted.');
if (projection.hubRuntime?.vercelProject !== 'thiepn-hub')
  failures.push('Hub Vercel project identity drifted.');
if (projection.hubRuntime?.productOwned !== true)
  failures.push('Hub runtime must remain product-owned.');

if (products.products.some((product) => product.id === 'platform'))
  failures.push('Product registry must not introduce a Platform product.');

for (const product of products.products) {
  if (product.launchUrl?.includes('platform.thiepn.dev'))
    failures.push(`${product.id}: launch URL uses retired platform domain.`);
  for (const module of product.modules) {
    if (module.launchUrl?.includes('platform.thiepn.dev'))
      failures.push(
        `${product.id}/${module.id}: launch URL uses retired platform domain.`,
      );
  }
}

if (
  projection.rules?.proxyProductSpecificServerWritesThroughSharedPlatform !==
  false
)
  failures.push('Hub must not proxy product writes through a shared platform.');
if (projection.rules?.routeHubAggregationThroughHubRuntime !== true)
  failures.push('Hub aggregation belongs to the Hub runtime.');
if (projection.rules?.preserveCoreGatewayBoundary !== true)
  failures.push('Core Gateway boundary must remain explicit.');
if (projection.rules?.preserveSupabaseDataAuthority !== true)
  failures.push('Supabase data authority must remain explicit.');

if (!platformHealth.includes('thiepn-account-platform'))
  failures.push('Historical platform-health classification changed.');
if (platformHealth.includes('platform.thiepn.dev'))
  failures.push('platform-health must not depend on the retired runtime domain.');

if (failures.length) {
  console.error('Platform P11 Hub runtime validation failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  'Platform P11 Hub runtime valid: Hub-owned Vercel runtime / no shared platform dependency.',
);
