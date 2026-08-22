import fs from 'node:fs';
import path from 'node:path';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);
const exists = (file) => fs.existsSync(file);

const rc = readJson('release-candidate.json');
const pkg = readJson('package.json');
const publicCatalogue = readJson('src/generated/catalogue-public.json');
const searchIndex = readJson('src/generated/search-index.json');
const routeManifest = readJson('src/generated/route-manifest.json');
const stats = readJson('src/generated/catalogue-stats.json');
const curation = readJson('src/data/curation.json');

const siteSource = fs.readFileSync('src/data/site.ts', 'utf8');
const baseLayout = fs.readFileSync('src/layouts/BaseLayout.astro', 'utf8');
const mobileMenu = fs.readFileSync('src/components/shell/MobileMenu.astro', 'utf8');
const previewController = fs.readFileSync('src/scripts/preview-controller.ts', 'utf8');
const githubSync = fs.readFileSync('scripts/sync-github.mjs', 'utf8');
const sitemapSource = fs.readFileSync('src/pages/sitemap.xml.ts', 'utf8');

if (pkg.version !== rc.release) fail(`package version ${pkg.version} does not match RC ${rc.release}`);
const sitePhase = Number(/phase:\s*(\d+)/.exec(siteSource)?.[1] ?? 0);
if (sitePhase < rc.phase) fail(`SITE.phase ${sitePhase} must be at least certified RC phase ${rc.phase}`);
if (rc.featureFreeze !== true) fail('featureFreeze must be true');
if (rc.severityGate?.critical !== 0 || rc.severityGate?.high !== 0) fail('RC severity gate must require zero critical/high issues');

const projects = publicCatalogue.projects ?? [];
const collections = searchIndex.collections ?? [];
if (stats.totalRegistered !== rc.expected.registeredProjects) fail(`registered project count ${stats.totalRegistered} != ${rc.expected.registeredProjects}`);
if (projects.length !== rc.expected.listedProjects) fail(`listed project count ${projects.length} != ${rc.expected.listedProjects}`);
if (collections.length !== rc.expected.collections) fail(`collection count ${collections.length} != ${rc.expected.collections}`);
if ((curation.featured ?? []).length !== rc.expected.featuredProjects) fail(`featured count ${(curation.featured ?? []).length} != ${rc.expected.featuredProjects}`);

const unique = (values) => new Set(values).size === values.length;
for (const [label, values] of [
  ['project codes', projects.map((p) => p.code)],
  ['project slugs', projects.map((p) => p.slug)],
  ['project routes', projects.map((p) => p.route)],
  ['live URLs', projects.map((p) => p.liveUrl)],
]) if (!unique(values)) fail(`duplicate ${label}`);

const routes = new Set(routeManifest.routes ?? []);
for (const route of rc.requiredPublicRoutes) if (!routes.has(route)) fail(`missing required route ${route}`);
for (const project of projects) {
  if (!routes.has(project.route)) fail(`${project.code}: missing record route ${project.route}`);
  if (!/^https:\/\//.test(project.liveUrl ?? '')) fail(`${project.code}: live URL must use HTTPS`);
  if (!/^thiepn\/[A-Za-z0-9._-]+$/.test(project.repo ?? '')) fail(`${project.code}: invalid repository identifier`);
  const indexed = searchIndex.projects?.find((item) => item.slug === project.slug);
  if (!indexed) { fail(`${project.code}: missing from search index`); continue; }
  if (indexed.code !== project.code || indexed.title !== project.title) fail(`${project.code}: search index identity mismatch`);
  if (indexed.liveUrl !== project.liveUrl || indexed.repo !== project.repo) fail(`${project.code}: search launch metadata mismatch`);
}
for (const collection of collections) {
  const route = `/collection/${collection.slug}/`;
  if (!routes.has(route)) fail(`${collection.code}: missing collection route ${route}`);
}

if (projects.some((project) => project.slug === 'markdown-guide')) fail('HOLD project markdown-guide leaked into public catalogue');
if (searchIndex.projects?.some((project) => project.slug === 'markdown-guide')) fail('HOLD project markdown-guide leaked into search');
if ([...routes].some((route) => route.includes('markdown-guide'))) fail('HOLD project markdown-guide leaked into routes');
if ([...routes].some((route) => route.startsWith('/dev/'))) fail('development route leaked into public route manifest');

if (!baseLayout.includes('data-catalogue-search-open') && !fs.readFileSync('src/components/shell/SiteHeader.astro','utf8').includes('data-catalogue-search-open')) fail('search fallback link is missing');
if (!mobileMenu.includes('<noscript>') || !mobileMenu.includes('Mobile navigation without JavaScript')) fail('mobile no-JS navigation fallback is missing');
if (!baseLayout.includes('thiepn:index-theme') || !baseLayout.includes("prefers-color-scheme: dark")) fail('pre-paint theme bootstrap is missing');
if (!previewController.includes("addEventListener('error'") || !previewController.includes("setState('unavailable')")) fail('preview media failure fallback is missing');
if (!githubSync.includes('cached-or-unavailable') || !githubSync.includes('stale: true')) fail('GitHub metadata failure fallback is missing');
if (!sitemapSource.includes("!route.startsWith('/dev/')")) fail('sitemap must exclude development routes');

const requiredFiles = [
  'src/pages/404.astro',
  'src/pages/search-index.json.ts',
  'src/pages/catalogue.json.ts',
  'src/pages/sitemap.xml.ts',
  'tests/e2e/phase14.spec.ts',
  'docs/RELEASE_CANDIDATE.md',
  'docs/PHASE_14_REPORT.md',
  '.github/workflows/release-candidate.yml'
];
for (const file of requiredFiles) if (!exists(file)) fail(`missing RC artifact ${file}`);

const releaseScripts = ['release:source','release:lockfile','release:visual','release:links','test:e2e:release','audit:release','audit:phase14'];
for (const script of releaseScripts) if (!pkg.scripts?.[script]) fail(`missing npm script ${script}`);

const sourceRoots = ['src','scripts','tests'];
for (const root of sourceRoots) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:astro|ts|mjs|css)$/.test(entry.name)) {
        if (full === 'scripts/audit-release.mjs') continue;
        const text = fs.readFileSync(full, 'utf8');
        const matches = text.match(/\b(?:TODO|FIXME|HACK|XXX)\b/g);
        if (matches?.length) warn(`${full}: ${matches.length} release-note marker(s)`);
      }
    }
  };
  walk(root);
}

if (warnings.length) {
  console.warn('Release audit warnings:');
  warnings.forEach((message) => console.warn(`- ${message}`));
}
if (failures.length) {
  console.error(`Release-candidate source audit failed (${failures.length}):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log(`Release-candidate source audit passed: ${projects.length} launchable projects, ${collections.length} collections, ${routes.size} generated routes, zero source-level critical/high blockers.`);
