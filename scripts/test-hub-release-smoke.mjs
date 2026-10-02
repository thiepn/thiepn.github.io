import fs from 'node:fs/promises';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const report = JSON.parse(await fs.readFile('.cache/hub-release-qualification.json', 'utf8'));
const responses = new Map(await Promise.all(report.builtAssets.map(async asset => [asset.path, await fs.readFile('dist/' + asset.file)])));
let fault = null;
const server = createServer((request, response) => {
  const route = new URL(request.url, 'http://127.0.0.1').pathname;
  const bytes = responses.get(route);
  if (!bytes || (fault === 'missing' && route === '/hub-release.json')) { response.writeHead(404); response.end(); return; }
  response.writeHead(200);
  response.end(fault === 'changed' && route === '/' ? Buffer.concat([bytes, Buffer.from('changed')]) : bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const base = `http://127.0.0.1:${server.address().port}/`;
  const args = ['--experimental-strip-types', 'scripts/smoke-hub-release.mjs', '--url', base];
  await run(process.execPath, args, { timeout: 15000 }); console.log('H8 exact serving fixture accepted');
  for (fault of ['changed', 'missing']) {
    let rejected = false;
    try { await run(process.execPath, args, { timeout: 15000 }); }
    catch (error) { if (error.code === 1 && error.stderr.includes('Hub candidate smoke failed')) rejected = true; else throw error; }
    if (!rejected) throw new Error(`H8 accepted ${fault} public artifact`);
    console.log(`H8 rejected ${fault} served artifact`);
  }
} finally { await new Promise(resolve => server.close(resolve)); }
