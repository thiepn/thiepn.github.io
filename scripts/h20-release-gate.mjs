import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export const GATES = ['hosted-boundary','shared-project-isolation','real-oauth',
  'android-chrome-physical','ipad-safari-physical','owner-production','usage-cost','rollback'];
export const INTEGRATIONS = ['capture','reading','due-review'];
const SHA = /^[a-f0-9]{40}$/;
/** @param {any} manifest @param {any[]} records @param {{candidate?: string, now?: number, artifactHash?: (file: string) => string}} [options] */
export function qualify(manifest, records, {candidate, now = Date.now(), artifactHash} = {}) {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.productionActivation, 'blocked');
  assert.deepEqual(Object.keys(manifest.owners).sort(), ['account','library','notes','tms60']);
  for (const sha of Object.values(manifest.owners)) assert.match(sha, SHA);
  assert(Array.isArray(records));
  if (candidate !== undefined) assert.match(candidate, SHA);
  const seen = new Set();
  for (const r of records) {
    assert(INTEGRATIONS.includes(r.integration) && GATES.includes(r.gate));
    const key = `${r.integration}:${r.gate}`;
    assert(!seen.has(key), 'Duplicate gate evidence'); seen.add(key);
    assert.equal(r.status, 'passed'); assert.match(r.candidate, SHA);
    assert.deepEqual(r.owners, manifest.owners, 'Owner revisions changed');
    const observed = Date.parse(r.observedAt);
    assert(Number.isFinite(observed) && observed <= now && now - observed <= 7 * 86400000, 'Evidence expired or future-dated');
    assert(typeof r.tester === 'string' && r.tester.trim());
    assert.equal(r.mode, r.gate.endsWith('-physical') ? 'physical' : 'observed');
    if (r.mode === 'physical') {
      for (const field of ['model','os','browser','browserVersion']) assert(typeof r.device?.[field] === 'string' && r.device[field].trim(), 'Physical device details required');
    }
    assert.match(r.artifact, /^evidence\/h20\/artifacts\/[A-Za-z0-9._-]+$/);
    assert.match(r.sha256, /^[a-f0-9]{64}$/);
    assert.equal(artifactHash?.(r.artifact), r.sha256, 'Evidence artifact missing or altered');
  }
  return Object.fromEntries(INTEGRATIONS.map(integration => [integration, {
    ready: Boolean(candidate) && GATES.every(gate => records.some(r => r.integration === integration && r.gate === gate && r.candidate === candidate)),
    missing: GATES.filter(gate => !records.some(r => r.integration === integration && r.gate === gate && r.candidate === candidate)),
  }]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'evidence/h20/release.json'),'utf8'));
  const records = JSON.parse(fs.readFileSync(path.join(root,'evidence/h20/records.json'),'utf8'));
  const candidateIndex = process.argv.indexOf('--candidate');
  const candidate = candidateIndex < 0 ? undefined : process.argv[candidateIndex + 1];
  const status = qualify(manifest, records, {candidate, artifactHash: file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')});
  console.log(JSON.stringify({activation: Object.values(status).every(s=>s.ready) ? 'qualified' : 'blocked', integrations: status}, null, 2));
  if (process.argv.includes('--activation') && Object.values(status).some(s=>!s.ready)) process.exitCode = 1;
}
