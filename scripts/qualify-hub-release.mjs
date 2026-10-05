import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { HUB_RELEASE_ROUTES, validateHubReleaseStatus } from '../src/lib/hub-release-policy.ts';

const distArg = process.argv.indexOf('--dist');
const dist = path.resolve(distArg >= 0 ? process.argv[distArg + 1] : 'dist');
// A failed qualification must not leave an earlier success report usable.
await fs.rm('.cache/hub-release-qualification.json', { force: true });
const read = file => fs.readFile(path.join(dist, file));
const json = async file => JSON.parse(await read(file));
const hub = JSON.parse(await fs.readFile('src/data/hub.json', 'utf8'));
const status = validateHubReleaseStatus(await json('hub-release.json'));
const release = JSON.parse(await fs.readFile('release-hub.json', 'utf8'));
assert.equal(release.schemaVersion, 1); assert.equal(release.releaseId, status.releaseId); assert.equal(release.profile, status.profile);
assert.equal(release.status, 'review-candidate'); assert.equal(release.productionEnabled, false);
assert.equal(status.appCount, hub.expectedCount, 'Built Hub count differs from source');
const providers = await json('hub-providers.json');
const sourceProviders = JSON.parse(await fs.readFile('src/data/hub-providers.json', 'utf8'));
assert.deepEqual(providers, sourceProviders, 'Built providers differ from source');
assert.equal(providers.providers.length, 3, 'Pilot coverage requires separate review');
for (const provider of providers.providers) {
  assert.equal(provider.status, 'handoff-only');
  assert.equal(provider.transport, null);
  assert.equal(provider.privateReadsEnabled, false);
  assert.equal(provider.inlineWritesEnabled, false);
  for (const operation of ['summary', 'continue', 'search', 'capture', 'inbox']) assert.equal(provider.operations[operation], false);
}
assert.equal(providers.attentionContract.transport, null);
assert.equal(providers.attentionContract.privateReadsEnabled, false);
assert.equal(providers.attentionContract.inlineWritesEnabled, false);
assert.deepEqual(providers.budgets, { visible: 6, concurrency: 3, deadlineMs: 2000, summaryItems: 10, summaryBytes: 32768, searchItems: 20, searchBytes: 65536 });

const files = new Set(['hub-release.json', 'hub-providers.json', 'hub-search.json', 'hub-provider-schema.json', 'hub-attention-schema.json', 'sitemap.xml']);
const sitemap = (await read('sitemap.xml')).toString();
for (const route of HUB_RELEASE_ROUTES) {
  const file = route === '/' ? 'index.html' : `${route.slice(1)}index.html`;
  const html = (await read(file)).toString();
  files.add(file);
  if (['/home/', '/inbox/', '/home/auth/callback/'].includes(route)) {
    assert.match(html, /<meta\s+name="robots"\s+content="noindex,nofollow"/);
    assert(!sitemap.includes(`<loc>https://thiepn.dev${route}</loc>`), 'Personal route leaked into sitemap');
  }
  if (['/home/', '/inbox/', '/search/', '/home/auth/callback/'].includes(route)) assert(!html.includes('static.cloudflareinsights.com'), 'Personal/query surface includes analytics');
  for (const match of html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)"/g)) files.add(match[1].slice(1));
}
const home = (await read('home/index.html')).toString();
if (status.profile === 'device-reading-pilot') {
  const pilot = await json('reading-pilot.json');
  assert.deepEqual(pilot, JSON.parse(await fs.readFile('src/data/reading-pilot.json','utf8')));
  assert.equal(pilot.enabled, true); assert.equal(pilot.scope, 'device');
  assert.equal(pilot.cloudAccess, false); assert.equal(pilot.writes, false); assert.equal(pilot.desktopOnly, true);
  assert.deepEqual(pilot.operations, ['summary','continue']);
  assert(home.includes('data-reading-pilot') && home.includes('data-library-pilot="v1"'));
  assert(!/data-private-(?:notes|tms|capture)|data-integrated-workflows/.test(home), 'Managed integration leaked into device pilot');
  files.add('reading-pilot.json');
}
assert.equal([...home.matchAll(/\bdata-hub-slug=/g)].length, status.appCount, 'Home roster does not match release count');
assert.equal([...home.matchAll(/\bdata-pin-choice\b/g)].length, status.appCount, 'Pin choices do not match release count');
assert.equal((await json('hub-search.json')).projects.length, status.appCount, 'Search roster does not match release count');
const assets = [];
for (const file of [...files].sort()) {
  const bytes = await read(file);
  const route = file === 'index.html' ? '/' : file.endsWith('/index.html') ? '/' + file.slice(0, -10) : '/' + file;
  assets.push({ path: route, file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
const report = { schemaVersion: 1, profile: status.profile, releaseId: status.releaseId, appCount: status.appCount, builtAssets: assets, scope: 'Built public Hub routes and directly referenced assets; no physical-device or authenticated certification' };
await fs.mkdir('.cache', { recursive: true });
await fs.writeFile('.cache/hub-release-qualification.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Hub ${status.profile} qualification passed: ${status.appCount} apps / ${HUB_RELEASE_ROUTES.length} routes / ${assets.length} hashed artifacts; ${status.profile === 'device-reading-pilot' ? 'explicit device reading only; managed features disabled' : 'private features disabled'}.`);
