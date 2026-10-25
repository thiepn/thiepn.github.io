// CI ONLY. Intentionally mutates files in a throwaway GitHub Actions checkout.
// No official owner key, external writes, real approvals or deployment allowed.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {certificateDigest,promotionSigningPayload,certifiedLaunchEntries} from '../../src/lib/release-certificates.mjs';
const registryPath='src/data/release-certificates.v1.json';
const promotionsPath='src/data/release-promotions.v1.json';
const manifestPath='src/generated/launch-manifest.json';
const registry=JSON.parse(readFileSync(registryPath));
const promotions=JSON.parse(readFileSync(promotionsPath));
const manifest=JSON.parse(readFileSync(manifestPath));
assert.equal(process.env.GITHUB_ACTIONS,'true','Synthetic approval may run only in disposable Actions checkout');
assert.ok(process.env.GITHUB_ENV,'GITHUB_ENV missing');
assert.ok(registry.certificates.every(x=>x.review.decision==='pending'),'Never override real approvals');
assert.deepEqual(promotions.receipts,[],'No existing promotion may be overwritten');
assert.equal(promotions.publicKeyPem,null,'An existing trust authority must never be overwritten');
const cert=registry.certificates.find(x=>x.appId==='tms60');
assert.ok(cert,'Missing TMS60 identity');
cert.version='1.0.0-test-fixture';
cert.scopeContract='Synthetic browser integration fixture only; this is NOT genuine release approval.';
cert.authModel='local-only';cert.storageModel='synthetic disposable test fixture';
cert.blockers=[];cert.notApplicableReasons={};
for(const gate of Object.keys(cert.checks))cert.checks[gate]='PASS';
cert.evidence=Object.keys(cert.checks).map(gate=>({
 gate,result:'PASS',url:'https://example.invalid/synthetic-only/'+gate,
 description:'Synthetic CI test receipt. This is NOT genuine release evidence.'
}));
cert.review={decision:'approved',reviewer:'synthetic-fixture-not-human',reviewedAt:'2026-10-25T00:00:00Z'};
const {publicKey,privateKey}=generateKeyPairSync('ed25519'); // in-memory only
const publicKeyPem=publicKey.export({type:'spki',format:'pem'}).toString();
const fingerprint=createHash('sha256').update(publicKey.export({type:'spki',format:'der'})).digest('hex');
promotions.publicKeyPem=publicKeyPem;
promotions.receipts=[{
 appId:cert.appId,releaseSha:cert.releaseSha,certificateDigest:certificateDigest(cert),
 signature:sign(null,promotionSigningPayload(cert),privateKey).toString('base64')
}];
assert.deepEqual(certifiedLaunchEntries(manifest,registry,promotions,fingerprint).map(x=>x.id),['tms60']);
writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
writeFileSync(promotionsPath,JSON.stringify(promotions,null,2)+'\n');
appendFileSync(process.env.GITHUB_ENV,'THIEPN_RELEASE_PROMOTION_TRUST_FINGERPRINT='+fingerprint+'\n');
console.log('PASS synthetic signed CI-only fixture resolves to one TMS60 app; no actual approvals were created');
