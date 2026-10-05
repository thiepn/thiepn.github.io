import { readFile } from 'node:fs/promises';

const projection = JSON.parse(
  await readFile('src/data/folio-projection-p9.json', 'utf8'),
);
const products = JSON.parse(
  await readFile('src/data/products-v2.json', 'utf8'),
);
const catalogue = JSON.parse(
  await readFile('src/generated/catalogue-public.json', 'utf8'),
);

const failures = [];
const folio = products.products.find((product) => product.id === 'folio');
const modules = new Map(
  (folio?.modules ?? []).map((module) => [
    `folio/${module.id}`,
    module,
  ]),
);
const projects = new Map(
  catalogue.projects.map((project) => [project.slug, project]),
);

if (projection.phase !== 'P9' || projection.product !== 'folio')
  failures.push('Projection must identify Platform P9 / Folio.');
if (projection.presentation !== 'preserve-legacy-project-cards')
  failures.push('P9 must preserve legacy project-card presentation.');
if (projection.rules?.createNewTopLevelCards !== false)
  failures.push('P9 must not create duplicate top-level cards.');
if (projection.rules?.removeLegacyCards !== false)
  failures.push('P9 must not remove existing project cards.');
if (projection.rules?.rewriteProjectRoutes !== false)
  failures.push('P9 must not rewrite project routes.');
if (projection.rules?.rewriteLiveUrls !== false)
  failures.push('P9 must not rewrite live URLs.');

for (const member of projection.members ?? []) {
  const module = modules.get(member.moduleRef);
  const project = projects.get(member.catalogueSlug);
  if (!module)
    failures.push(`Unknown Folio module: ${member.moduleRef}`);
  if (!project)
    failures.push(`Unknown catalogue project: ${member.catalogueSlug}`);
  if (
    member.preserveLiveUrl &&
    module?.launchUrl &&
    project?.liveUrl !== module.launchUrl
  )
    failures.push(
      `${member.catalogueSlug}: catalogue/module live URLs must match during P9.`,
    );
}

if (folio?.state !== 'staged')
  failures.push('Folio family must remain staged in P9.');
const home = modules.get('folio/home');
if (home?.repo !== 'thiepn/folio')
  failures.push('Folio home must bind to thiepn/folio.');
if (home?.state !== 'staged')
  failures.push('Folio home remains staged until unified-UI certification.');
if (modules.get('folio/knowledge')?.state !== 'staged')
  failures.push('Knowledge must remain staged during P9.');

if (failures.length) {
  console.error('Platform P9 Hub Folio projection failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Platform P9 Hub Folio projection valid: ${projection.members.length} legacy cards mapped / ${projection.stagedModules.length} staged modules.`,
);
