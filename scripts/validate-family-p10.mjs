import { readFile } from 'node:fs/promises';

const projection = JSON.parse(
  await readFile('src/data/family-projection-p10.json', 'utf8'),
);
const products = JSON.parse(
  await readFile('src/data/products-v2.json', 'utf8'),
);
const catalogue = JSON.parse(
  await readFile('src/generated/catalogue-public.json', 'utf8'),
);

const failures = [];
const productById = new Map(
  products.products.map((product) => [product.id, product]),
);
const catalogueBySlug = new Map(
  catalogue.projects.map((project) => [project.slug, project]),
);
const normalizeUrl = (value) =>
  typeof value === 'string' ? value.replace(/\/$/, '') : value;

if (
  projection.schemaVersion !== 1 ||
  projection.phase !== 'P10' ||
  projection.contractId !== 'bible-games-family-projection-v1'
)
  failures.push('Unexpected P10 family projection identity.');

for (const familyId of ['bible', 'games']) {
  const family = projection.families?.[familyId];
  const product = productById.get(familyId);
  if (!family || !product) {
    failures.push(`Missing family/product: ${familyId}`);
    continue;
  }
  if (family.state !== product.state)
    failures.push(`${familyId}: projection/product state mismatch.`);
  if (family.defaultModule !== `${familyId}/${product.defaultModule}`)
    failures.push(`${familyId}: default module mismatch.`);

  const moduleByRef = new Map(
    product.modules.map((module) => [
      `${familyId}/${module.id}`,
      module,
    ]),
  );

  for (const member of family.catalogueMembers ?? []) {
    const module = moduleByRef.get(member.moduleRef);
    const project = catalogueBySlug.get(member.catalogueSlug);
    if (!module)
      failures.push(`Unknown module: ${member.moduleRef}`);
    if (!project)
      failures.push(`Unknown catalogue project: ${member.catalogueSlug}`);
    if (member.preserveLiveUrl && !project?.liveUrl)
      failures.push(`${member.catalogueSlug}: existing live URL must remain.`);
    if (
      member.preserveLiveUrl &&
      module?.launchUrl &&
      project?.liveUrl &&
      normalizeUrl(module.launchUrl) !== normalizeUrl(project.liveUrl)
    )
      failures.push(
        `${member.catalogueSlug}: module and preserved catalogue URL diverged.`,
      );
  }
}

const bible = productById.get('bible');
const games = productById.get('games');

if (bible?.state !== 'staged' || bible?.launchUrl !== null)
  failures.push('Bible must remain staged without an invented family URL.');
if (
  bible?.modules.find((module) => module.id === 'devotion')?.repo !==
  'thiepn/my-daily-devotion'
)
  failures.push('Bible devotion must bind to My Daily Devotion.');

if (games?.state !== 'active')
  failures.push('Games must be active after P10.');
if (games?.launchUrl !== 'https://thiepn.dev/arcade/')
  failures.push('Games family launch URL must be the existing Arcade home.');
for (const id of ['home', 'arcade', 'gomoku', 'wordstrike']) {
  if (games?.modules.find((module) => module.id === id)?.state !== 'active')
    failures.push(`games/${id} must be active.`);
}

if (projection.rules?.createDuplicateFamilyCards !== false)
  failures.push('P10 must not create duplicate family cards.');
if (projection.rules?.removeLegacyCards !== false)
  failures.push('P10 must preserve legacy cards.');
if (projection.rules?.rewriteProjectRoutes !== false)
  failures.push('P10 must preserve project routes.');
if (projection.rules?.rewriteLiveUrls !== false)
  failures.push('P10 must preserve live URLs.');
if (projection.rules?.changeCatalogueCategories !== false)
  failures.push('P10 must not recategorize legacy catalogue cards.');

if (failures.length) {
  console.error('Platform P10 Hub family projection failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  'Platform P10 Hub family projection valid: Bible staged / Games active / legacy cards preserved.',
);
