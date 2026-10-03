import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { validateHubReleaseStatus } from '../src/lib/hub-release-policy.ts';
const report = JSON.parse(await fs.readFile('.cache/hub-release-qualification.json', 'utf8'));
const argIndex = process.argv.indexOf('--url');
const base = new URL(argIndex >= 0 ? process.argv[argIndex + 1] : 'https://thiepn.dev/');
assert(base.protocol === 'https:' || (base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname)), 'Use HTTPS or a local preview');
assert(!base.username && !base.password && !base.search && !base.hash && base.pathname === '/', 'Use a root origin without credentials or query');
assert.equal(report.schemaVersion, 1);
const failures = [];
// Only public candidate bytes; no sign-in, user storage, private reads or mutation.
for (let start = 0; start < report.builtAssets.length; start += 6) {
  await Promise.all(report.builtAssets.slice(start, start + 6).map(async asset => {
    try {
      const url = new URL(asset.path, base);
      url.searchParams.set('hub-qualification', String(Date.now()));
      const response = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'error', headers: { 'Cache-Control': 'no-cache' } });
      if (response.status !== 200) { await response.body?.cancel(); throw new Error('Unexpected serving status'); }
      const reader = response.body.getReader(), chunks = []; let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > asset.bytes) throw new Error('Artifact byte budget exceeded');
          chunks.push(Buffer.from(value));
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      finally { reader.releaseLock(); }
      const bytes = Buffer.concat(chunks, size);
      assert.equal(bytes.length, asset.bytes);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256);
      if (asset.path === '/hub-release.json') {
        const status = validateHubReleaseStatus(JSON.parse(bytes.toString()));
        assert.equal(status.releaseId, report.releaseId); assert.equal(status.appCount, report.appCount);
      }
    } catch { failures.push(asset.path); }
  }));
}
if (failures.length) {
  console.error(`Hub candidate smoke failed for ${failures.length} public artifacts: ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`Hub candidate smoke passed: ${report.builtAssets.length} exact public artifacts at ${base.origin}. This is not authenticated or physical-device certification.`);
