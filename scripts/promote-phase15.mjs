import fs from 'node:fs';
import path from 'node:path';

const RELEASE = '1.0.0';
const DOMAIN = 'https://thiepn.dev';
const OLD_DOMAIN = 'https://thiepn.github.io';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const replaceIn = (file, replacer) => {
  if (!fs.existsSync(file)) return;
  const before = fs.readFileSync(file, 'utf8');
  const after = replacer(before);
  if (after !== before) fs.writeFileSync(file, after);
};

const pkg = readJson('package.json');
pkg.version = RELEASE;
writeJson('package.json', pkg);

const rc = readJson('release-candidate.json');
rc.release = RELEASE;
rc.phase = 15;
rc.releaseChecks = [...new Set([...(rc.releaseChecks ?? []), 'production-custom-domain', 'post-deploy-smoke'])];
writeJson('release-candidate.json', rc);

writeJson('release-production.json', {
  schemaVersion: 1,
  release: RELEASE,
  phase: 15,
  productionUrl: `${DOMAIN}/`,
  repository: 'thiepn/thiepn.github.io',
  customDomain: 'thiepn.dev',
  featureFreeze: true,
  tag: 'v1.0.0',
  requiredPostDeployChecks: [
    'homepage', 'projects', 'collections', 'catalogue-json', 'sitemap',
    'all-artifact-records', 'all-live-destinations', 'mobile', 'production-performance'
  ]
});

replaceIn('src/data/site.ts', (text) => text
  .replace(/url:\s*'https:\/\/(?:thiepn\.github\.io|thiepn\.dev)'/, `url: '${DOMAIN}'`)
  .replace(/phase:\s*\d+/, 'phase: 15'));
replaceIn('astro.config.mjs', (text) => text.replace(/site:\s*['"]https:\/\/(?:thiepn\.github\.io|thiepn\.dev)['"]/, `site: '${DOMAIN}'`));
replaceIn('public/robots.txt', (text) => text.replace(/https:\/\/(?:thiepn\.github\.io|thiepn\.dev)\/sitemap\.xml/g, `${DOMAIN}/sitemap.xml`));
fs.writeFileSync('CNAME', 'thiepn.dev\n');
fs.writeFileSync('public/CNAME', 'thiepn.dev\n');

const projectsDir = 'src/content/projects';
for (const name of fs.readdirSync(projectsDir)) {
  if (!name.endsWith('.md')) continue;
  replaceIn(path.join(projectsDir, name), (text) => text.replaceAll(`${OLD_DOMAIN}/`, `${DOMAIN}/`));
}

for (const file of [
  'README.md',
  'docs/ARCHITECTURE.md',
  'docs/CONTENT_MODEL.md',
  'docs/MASTER_IMPLEMENTATION_PROMPT.md',
  'docs/AUTOMATION.md',
  'docs/RELEASE_CANDIDATE.md',
]) {
  replaceIn(file, (text) => text.replaceAll(`${OLD_DOMAIN}/`, `${DOMAIN}/`));
}

replaceIn('tests/unit/site.test.ts', (text) => text
  .replace("expect(['https://thiepn.github.io', 'https://thiepn.dev']).toContain(SITE.url);", "expect(SITE.url).toBe('https://thiepn.dev');")
  .replace('expect(SITE.phase).toBeGreaterThanOrEqual(3);', 'expect(SITE.phase).toBeGreaterThanOrEqual(15);'));

console.log(`Promoted source metadata to Phase 15 / ${RELEASE} / ${DOMAIN}.`);
