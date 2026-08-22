import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { ROOT, SCRIPT_ROOT } from './lib/catalogue-files.mjs';

async function hashFile(file) {
  const data = await fs.readFile(file);
  return crypto.createHash('sha256').update(data).digest('hex');
}
const uiFiles = ['src/pages/index.astro', 'src/pages/projects/index.astro', 'src/components/search/CatalogueSearch.astro'];
const before = Object.fromEntries(await Promise.all(uiFiles.map(async (file) => [file, await hashFile(path.join(ROOT, file))])));
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'thiepn-phase10-'));
try {
  for (const relative of ['src/content/projects', 'src/content/collections', 'src/data', 'src/generated', 'public/og']) {
    await fs.mkdir(path.join(temp, path.dirname(relative)), { recursive: true });
    await fs.cp(path.join(ROOT, relative), path.join(temp, relative), { recursive: true });
  }
  const env = { ...process.env, THIEPN_INDEX_ROOT: temp };
  const beforeLedger = JSON.parse(await fs.readFile(path.join(temp, 'src/data/catalogue-ledger.json'), 'utf8'));
  const beforeStats = JSON.parse(await fs.readFile(path.join(temp, 'src/generated/catalogue-stats.json'), 'utf8'));

  const discover = spawnSync(process.execPath, [path.join(SCRIPT_ROOT, 'scripts/discover-projects.mjs'), '--fixture', path.join(SCRIPT_ROOT, 'tests/fixtures/github-repositories.json')], { encoding: 'utf8', env });
  if (discover.status !== 0) throw new Error(`Discovery fixture failed:\n${discover.stdout}\n${discover.stderr}`);
  const discovery = JSON.parse(await fs.readFile(path.join(temp, 'src/generated/github-discovery.json'), 'utf8'));
  if (!discovery.repositories.some((item) => item.repo === 'thiepn/new-index-candidate' && item.state === 'candidate')) throw new Error('Discovery fixture did not identify the opted-in candidate.');

  const sync = spawnSync(process.execPath, [path.join(SCRIPT_ROOT, 'scripts/sync-github.mjs'), '--offline', '--fixture', path.join(SCRIPT_ROOT, 'tests/fixtures/github-metadata.json')], { encoding: 'utf8', env });
  if (sync.status !== 0) throw new Error(`GitHub sync fixture failed:\n${sync.stdout}\n${sync.stderr}`);
  const github = JSON.parse(await fs.readFile(path.join(temp, 'src/generated/github.json'), 'utf8'));
  if (github.projects['pdf-studio']?.language !== 'TypeScript' || github.projects['pdf-studio']?.stale !== false) throw new Error('GitHub fixture metadata did not enrich PDF Studio.');

  const result = spawnSync(process.execPath, [path.join(SCRIPT_ROOT, 'scripts/add-project.mjs'),
    '--title', 'Automation Fixture', '--slug', 'automation-fixture', '--category', 'games', '--type', 'game',
    '--repo', 'thiepn/automation-fixture', '--live', 'https://example.com/automation-fixture/',
    '--summary', 'Temporary Phase 10 fixture used to prove data-driven catalogue automation without component edits.',
    '--status', 'beta', '--visibility', 'listed', '--tag', 'game', '--yes'], { encoding: 'utf8', env });
  if (result.status !== 0) throw new Error(`Project-add fixture failed:\n${result.stdout}\n${result.stderr}`);
  const ledger = JSON.parse(await fs.readFile(path.join(temp, 'src/data/catalogue-ledger.json'), 'utf8'));
  const stats = JSON.parse(await fs.readFile(path.join(temp, 'src/generated/catalogue-stats.json'), 'utf8'));
  const search = JSON.parse(await fs.readFile(path.join(temp, 'src/generated/search-index.json'), 'utf8'));
  const catalogue = JSON.parse(await fs.readFile(path.join(temp, 'src/generated/catalogue-public.json'), 'utf8'));
  const routes = JSON.parse(await fs.readFile(path.join(temp, 'src/generated/route-manifest.json'), 'utf8'));
  const allocatedEntry = Object.entries(ledger.projects).find(([, slug]) => slug === 'automation-fixture');
  const allocatedCode = allocatedEntry?.[0];
  const previousCodes = new Set(Object.keys(beforeLedger.projects));
  const checks = [
    [Boolean(allocatedCode) && !previousCodes.has(allocatedCode), `ledger did not allocate a new code for automation-fixture`],
    [stats.totalRegistered === beforeStats.totalRegistered + 1, `registered count expected ${beforeStats.totalRegistered + 1}, got ${stats.totalRegistered}`],
    [stats.totalListed === beforeStats.totalListed + 1, `listed count expected ${beforeStats.totalListed + 1}, got ${stats.totalListed}`],
    [Boolean(allocatedCode) && search.projects.some((item) => item.code === allocatedCode), `search index missing allocated project ${allocatedCode ?? '(none)'}`],
    [Boolean(allocatedCode) && catalogue.projects.some((item) => item.code === allocatedCode), `public catalogue missing allocated project ${allocatedCode ?? '(none)'}`],
    [routes.routes.includes('/project/automation-fixture/'), 'route manifest missing fixture route'],
    [await fs.access(path.join(temp, 'public/og/automation-fixture.svg')).then(() => true, () => false), 'OG image missing for automation fixture'],
  ];
  const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
  if (failed.length) throw new Error(`Phase 10 fixture failed:\n${failed.map((item) => `- ${item}`).join('\n')}`);
  const after = Object.fromEntries(await Promise.all(uiFiles.map(async (file) => [file, await hashFile(path.join(ROOT, file))])));
  for (const file of uiFiles) if (before[file] !== after[file]) throw new Error(`UI source changed while adding fixture: ${file}`);
  console.log(`Phase 10 project-add fixture passed: data-only add allocated ${allocatedCode}, updated counts, search, public catalogue, routes, and OG output without UI edits.`);
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
