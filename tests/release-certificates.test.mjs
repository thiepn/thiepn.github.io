import { test } from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { certifiedLaunchEntries, validateDevelopmentInventory, validateReleaseRegistry, RELEASE_GATES, certificateDigest, promotionSigningPayload } from '../src/lib/release-certificates.mjs';

const load = p => JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const registry = () => load('../src/data/release-certificates.v1.json');
const inventory = () => load('../src/data/development-inventory.v1.json');
const manifest = () => load('../src/generated/launch-manifest.json');
const clone = x => structuredClone(x);

function signFixture(c) {
  const {publicKey,privateKey}=generateKeyPairSync('ed25519'); // disposable test-only private key
  return {schemaVersion:1,policyId:'thiepn-release-gate-v1.0',
    publicKeyPem:publicKey.export({format:'pem',type:'spki'}).toString(),
    receipts:[{appId:c.appId,releaseSha:c.releaseSha,certificateDigest:certificateDigest(c),
      signature:sign(null,promotionSigningPayload(c),privateKey).toString('base64')}]};
}


test('five audited candidates remain unapproved and cannot appear in Released apps', () => {
  const certs = validateReleaseRegistry(registry());
  assert.equal(certs.certificates.length,5);
  assert.deepEqual(certs.certificates.map(c=>c.review.decision),Array(5).fill('pending'));
  assert.equal(certifiedLaunchEntries(manifest(),certs).length,0);
  assert.equal(certs.certificates.find(c=>c.appId==='tiny-tools').checks.G8,'FAIL');
  assert.equal(certs.certificates.find(c=>c.appId==='pdf-studio').checks.G8,'FAIL');
});
test('development inventory independently preserves all legacy identities', () => {
  const m=manifest(), i=validateDevelopmentInventory(inventory(),m);
  assert.equal(i.entries.length,m.entries.length);
  assert.equal(i.entries.length,31);
  assert.deepEqual(new Set(i.entries.map(x=>x.appId)),new Set(m.entries.map(x=>x.id)));
});
test('empty release roster is valid without changing existing legacy launchers',()=>{
  assert.deepEqual(certifiedLaunchEntries({entries:[]},{schemaVersion:1,policyId:'thiepn-release-gate-v1.0',certificates:[]}),[]);
  assert.equal(manifest().entries.length,31);
});
test('incomplete or forged approval fails closed',()=>{
  const r=registry(), c=r.certificates[0];
  c.review={decision:'approved',reviewer:'auditor',reviewedAt:'2026-10-25T00:00:00Z'};
  assert.throws(()=>validateReleaseRegistry(r),/approved release requires/);
  c.version='1.0.0';c.scopeContract='Complete real v1 workflows for this fixture';c.authModel='local-only';c.storageModel='local browser';
  c.checks=Object.fromEntries(RELEASE_GATES.map(g=>[g,'PASS']));c.blockers=[];
  assert.throws(()=>validateReleaseRegistry(r),/has no passing evidence/);
  c.evidence=RELEASE_GATES.map(g=>({gate:g,result:'PASS',url:'https://example.org/fixture/'+g,description:'Synthetic test-only evidence, not real qualification'}));
  c.releaseSha='a'.repeat(40);c.deployedSha='b'.repeat(40);
  assert.throws(()=>validateReleaseRegistry(r),/SHA differ/);
  c.deployedSha=c.releaseSha;
  assert.doesNotThrow(()=>validateReleaseRegistry(r));
  assert.throws(()=>certifiedLaunchEntries(manifest(),r),/missing signed independent promotion/);
  assert.deepEqual(certifiedLaunchEntries(manifest(),r,signFixture(c)).map(x=>x.id),['tms60']);
});
test('approved fixture matching manifest can be selected without padding',()=>{
  const r=registry();const c=r.certificates[0];
  c.review={decision:'approved',reviewer:'fixture-reviewer',reviewedAt:'2026-10-25T00:00:00Z'};
  c.version='1.0.0';c.scopeContract='Synthetic full-scope fixture for validator tests only';c.authModel='local-only';c.storageModel='local browser';
  c.checks=Object.fromEntries(RELEASE_GATES.map(g=>[g,'PASS']));c.blockers=[];
  c.evidence=RELEASE_GATES.map(g=>({gate:g,result:'PASS',url:'https://example.org/test-evidence/'+g,description:'Synthetic fixture, not release evidence'}));
  const result=certifiedLaunchEntries(manifest(),r,signFixture(c));
  assert.deepEqual(result.map(x=>x.id),['tms60']);
});
test('gate verdicts, N/A exceptions, evidence URLs and SHA formats cannot be bypassed',()=>{
  const alter=callback=>{const r=registry();callback(r.certificates[0]);assert.throws(()=>validateReleaseRegistry(r))};
  alter(c=>{c.checks.G5='PASSED';});
  alter(c=>{c.checks.G3='NOT_APPLICABLE';});
  alter(c=>{c.checks.G3='NOT_APPLICABLE';c.notApplicableReasons.G3='short';});
  alter(c=>{c.checks.G3='NOT_APPLICABLE';c.notApplicableReasons.G3='Although optional account sync exists we claim this app is local-only';});
  alter(c=>{c.checks.G8='NOT_APPLICABLE';c.notApplicableReasons.G8='Security checks are never truly inapplicable';});
  alter(c=>{c.notApplicableReasons.G3='No accounts exist in local-only product';});
  alter(c=>{c.releaseSha='main';});
  alter(c=>{c.evidence[0].url='http://example.org/test';});
  alter(c=>{c.evidence.push(clone(c.evidence[0]));});
  alter(c=>{c.review.decision='approved';});
});
test('different repository, URL or duplicate app IDs never pass catalog selection',()=>{
  const r=registry();r.certificates[0].repository='thiepn/not-tms60';
  assert.throws(()=>certifiedLaunchEntries(manifest(),r),/owner repository/);
  r.certificates[0].repository='thiepn/tms60';r.certificates[0].productionUrl='https://example.org/';
  assert.throws(()=>certifiedLaunchEntries(manifest(),r),/production URL/);
  r.certificates[0].productionUrl='https://tms60.thiepn.dev/';
  r.certificates.push(clone(r.certificates[0]));
  assert.throws(()=>validateReleaseRegistry(r),/duplicate certificate/);
});
test('development inventory rejects missing, duplicated and fabricated identities',()=>{
  const m=manifest(), i=inventory();
  i.entries.pop();
  assert.throws(()=>validateDevelopmentInventory(i,m),/preserve all legacy/);
  const j=inventory();j.entries.push(clone(j.entries[0]));
  assert.throws(()=>validateDevelopmentInventory(j,m),/duplicated/);
  const k=inventory();k.entries[0].appId='invented-launcher';
  assert.throws(()=>validateDevelopmentInventory(k,m),/not in legacy/);
});

test('signed owner promotion cannot be fabricated, replayed, retargeted or silently stale',()=>{
  const r=registry(),c=r.certificates[0];
  c.version='1.0.0';c.scopeContract='Synthetic signed promotion test fixture only';
  c.authModel='local-only';c.storageModel='local database';c.blockers=[];
  c.review={decision:'approved',reviewer:'fixture-reviewer',reviewedAt:'2026-10-25T00:00:00Z'};
  c.checks=Object.fromEntries(RELEASE_GATES.map(g=>[g,'PASS']));
  c.evidence=RELEASE_GATES.map(g=>({gate:g,result:'PASS',url:'https://example.org/only-fixture/'+g,description:'Synthetic strictly local test fixture'}));
  const p=signFixture(c);
  assert.deepEqual(certifiedLaunchEntries(manifest(),r,p).map(x=>x.id),['tms60']);
  const testModified=fn=>{const obj=clone(p);fn(obj);assert.throws(()=>certifiedLaunchEntries(manifest(),r,obj));};
  testModified(p=>p.receipts[0].signature='a'.repeat(88));
  testModified(p=>p.receipts[0].releaseSha='b'.repeat(40));
  testModified(p=>p.receipts[0].certificateDigest='f'.repeat(64));
  testModified(p=>p.receipts[0].appId='recipe');
  testModified(p=>p.receipts.push(clone(p.receipts[0])));
  testModified(p=>p.publicKeyPem=null);
  const cloned=clone(r);cloned.certificates[0].evidence[0].description='Post-release evidence substitution';
  assert.throws(()=>certifiedLaunchEntries(manifest(),cloned,p),/stale or substituted/);
  const after=clone(r);after.certificates[0].review.reviewedAt='2026-10-26T00:00:00Z';
  assert.throws(()=>certifiedLaunchEntries(manifest(),after,p),/stale or substituted/);
});
