import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS, ROOT, readJson, readProjects } from './lib/catalogue-files.mjs';

const required = [
  'scripts/add-project.mjs', 'scripts/discover-projects.mjs', 'scripts/sync-github.mjs',
  'scripts/capture-previews.mjs', 'scripts/optimize-media.mjs', 'scripts/validate-media.mjs',
  'scripts/validate-links.mjs', 'scripts/generate-search-index.mjs', 'scripts/generate-public-catalogue.mjs',
  'scripts/generate-route-manifest.mjs', 'scripts/generate-og.mjs', 'scripts/refresh-catalogue.mjs',
  'scripts/test-phase10-fixture.mjs', 'src/pages/catalogue.json.ts', 'src/pages/sitemap.xml.ts',
  'src/pages/dev/catalogue/index.astro', 'src/pages/dev/design-system/index.astro',
  'src/generated/search-index.json', 'src/generated/catalogue-public.json', 'src/generated/route-manifest.json',
  'src/generated/github.json', 'src/generated/github-discovery.json',
  '.github/workflows/link-health.yml', '.github/workflows/media-audit.yml',
  'tests/e2e/phase10.spec.ts', 'tests/unit/automation-contract.test.ts',
  'tests/fixtures/github-repositories.json', 'tests/fixtures/github-metadata.json',
];
const missing = [];
for (const relative of required) {
  try { await fs.access(path.join(ROOT, relative)); } catch { missing.push(relative); }
}
if (missing.length) throw new Error(`Phase 10 missing required files:\n${missing.map((item) => `- ${item}`).join('\n')}`);

const search = await readJson(path.join(PATHS.generated, 'search-index.json'));
const publicCatalogue = await readJson(path.join(PATHS.generated, 'catalogue-public.json'));
const routes = await readJson(path.join(PATHS.generated, 'route-manifest.json'));
const projects = await readProjects();
const listed = projects.filter(({ data }) => data.visibility === 'listed');
if (search.projects.length !== listed.length) throw new Error('Generated search index does not match listed-project count.');
if (publicCatalogue.projects.length !== listed.length) throw new Error('Generated public catalogue does not match listed-project count.');
for (const { data } of listed) {
  if (!search.projects.some((project) => project.slug === data.slug)) throw new Error(`Search index missing ${data.slug}.`);
  if (!routes.routes.includes(`/project/${data.slug}/`)) throw new Error(`Route manifest missing ${data.slug}.`);
}
const baseLayout = await fs.readFile(path.join(ROOT, 'src/layouts/BaseLayout.astro'), 'utf8');
if (!baseLayout.includes('og:image')) throw new Error('BaseLayout must publish generated Open Graph images.');
const searchComponent = await fs.readFile(path.join(ROOT, 'src/components/search/CatalogueSearch.astro'), 'utf8');
const searchRuntime = await fs.readFile(path.join(ROOT, 'src/scripts/catalogue-search.ts'), 'utf8');
const searchEndpointPath = path.join(ROOT, 'src/pages/search-index.json.ts');
let searchEndpoint = '';
try { searchEndpoint = await fs.readFile(searchEndpointPath, 'utf8'); } catch {}
if (!(searchComponent.includes('search-index.json') || searchRuntime.includes('/search-index.json') || searchEndpoint.includes('search-index.json'))) {
  throw new Error('Catalogue Search must consume generated search-index.json directly or through the Phase 11 static endpoint.');
}
const homepage = await fs.readFile(path.join(ROOT, 'src/pages/index.astro'), 'utf8');
if (!homepage.includes('getPublicProjects') || !homepage.includes('data-project-directory') || !homepage.includes('projects.map')) {
  throw new Error('Homepage project directory must remain driven by the public project collection.');
}
if (homepage.includes('<ProjectArchive')) throw new Error('Homepage must not duplicate the full interactive archive; /projects/ owns that workflow.');
const projectArchive = await fs.readFile(path.join(ROOT, 'src/pages/projects/index.astro'), 'utf8');
if (!projectArchive.includes('getPublicProjects')) throw new Error('Dedicated project archive must remain data-driven.');
const packageText = await fs.readFile(path.join(ROOT, 'package.json'), 'utf8');
for (const command of ['project:add', 'projects:discover', 'github:sync', 'preview:capture', 'media:optimize', 'generated:check']) {
  if (!packageText.includes(`"${command}"`)) throw new Error(`package.json missing ${command}.`);
}
console.log(`Phase 10 automation validation passed: ${listed.length} listed projects / ${routes.routes.length} generated routes.`);
