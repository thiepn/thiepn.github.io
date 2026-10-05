import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const report = JSON.parse(await fs.readFile('.cache/hub-release-qualification.json', 'utf8'));
const fixture = await fs.mkdtemp(path.resolve('.cache/h8-release-gate-'));
const files = report.builtAssets.map(asset => asset.file);
const run = dist => execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/qualify-hub-release.mjs', '--dist', dist], { stdio: 'pipe' });
const faults = [
  ['managed panel leakage', 'home/index.html', text => text + '<section data-private-tms></section>'],
  ['pilot scope drift', 'reading-pilot.json', text => { const value=JSON.parse(text);value.cloudAccess=true;return JSON.stringify(value); }],
  ['auth enablement', 'hub-release.json', text => { const value = JSON.parse(text); value.features.hubSignIn = true; return JSON.stringify(value); }],
  ['provider operation drift', 'hub-providers.json', text => { const value = JSON.parse(text); value.providers[0].operations.summary = true; return JSON.stringify(value); }],
  ['Home indexing', 'home/index.html', text => text.replace('noindex,nofollow', 'index,follow')],
  ['Search analytics', 'search/index.html', text => text + '<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>'],
  ['personal sitemap route', 'sitemap.xml', text => text.replace('</urlset>', '<url><loc>https://thiepn.dev/home/</loc></url></urlset>')],
  ['missing app roster', 'home/index.html', text => text.replace('data-hub-slug=', 'data-unreviewed-slug=')],
];
try {
  for (const file of files) { await fs.mkdir(path.dirname(path.join(fixture, file)), { recursive: true }); await fs.copyFile(path.join('dist', file), path.join(fixture, file)); }
  run(fixture); console.log('H8 isolated valid artifact accepted');
  for (const [name, file, mutate] of faults) {
    const target = path.join(fixture, file), original = await fs.readFile(target, 'utf8');
    await fs.writeFile(target, mutate(original));
    let rejected = false; try { run(fixture); } catch { rejected = true; }
    if (!rejected) throw new Error(`H8 accepted ${name}`);
    // Failed gates must remove the previous success report.
    try { await fs.access('.cache/hub-release-qualification.json'); throw new Error('Stale qualification report survived'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    console.log(`H8 rejected ${name}`); await fs.writeFile(target, original);
  }
  const asset = files.find(file => file.startsWith('_astro/'));
  await fs.rm(path.join(fixture, asset));
  let rejected = false; try { run(fixture); } catch { rejected = true; }
  if (!rejected) throw new Error('H8 accepted missing referenced asset');
  console.log('H8 rejected missing referenced asset');
} finally { await fs.rm(fixture, { recursive: true, force: true }); run('dist'); }
