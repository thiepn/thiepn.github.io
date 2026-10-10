import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { spkiSha256 } from '../../src/lib/prism/h8-operator-attestation.mjs';
import { canonicalH9CustodyEvent, h9EventDigest } from '../../src/lib/prism/h9-custody-acceptance.mjs';
import {
  H10_PARENT,H10_TESTED_MERGE,H10_CHECKS,H10_ARTIFACTS,H10_DOMAINS,H10_GATES,
  canonicalH10Evidence,inspectH10Preparation,reconcileH10Custody,
  inspectH10EvidenceBatch,prepareH10ReleaseDenial,
} from '../../src/lib/prism/h10-release-reconciliation.mjs';

const receipt=JSON.parse(readFileSync(new URL('../../docs/evidence/HUB_V1_1_H10_RELEASE_RECONCILIATION.json',import.meta.url),'utf8'));
const edit=fn=>{const x=structuredClone(receipt);fn(x);return x;};
const keys=Array.from({length:3},()=>generateKeyPairSync('ed25519')); // synthetic fixture, never registered
const publicPem=i=>keys[i].publicKey.export({type:'spki',format:'pem'}).toString();
const pins=[spkiSha256(publicPem(0)),spkiSha256(publicPem(2))];
const now=Date.parse('2026-10-10T14:00:00.000Z');
const hash=s=>createHash('sha256').update(s).digest('hex');
const nonce=i=>'h10_independently_witnessed_nonce_abcdefghijklmnop'+i;
function signedH9(p,index){
  const bytes=Buffer.from(canonicalH9CustodyEvent(p));
  return {payload:p,signerSignature:sign(null,bytes,keys[index].privateKey).toString('base64url'),
    witnessSignature:sign(null,bytes,keys[2].privateKey).toString('base64url')};
}
function syntheticCustody(){
  const a=signedH9({sequence:1,previousDigest:'0'.repeat(64),action:'rotate',
    signerKeyId:'operator-root',nextKeyId:'operator-next',nextSpkiPem:publicPem(1),
    observedAt:'2026-10-10T10:00:00.000Z',nonce:nonce('a')},0);
  const b=signedH9({sequence:2,previousDigest:h9EventDigest(a),action:'compromise',
    signerKeyId:'operator-next',nextKeyId:null,nextSpkiPem:null,
    observedAt:'2026-10-10T11:00:00.000Z',nonce:nonce('b')},1);
  return [a,b];
}
const custodyArgs={
  initialKeyId:'operator-root',initialSpkiPem:publicPem(0),witnessSpkiPem:publicPem(2),
  independentPins:pins,nowMs:now,
  keyEpochPins:[{keyId:'operator-root',spkiSha256:spkiSha256(publicPem(0))},
    {keyId:'operator-next',spkiSha256:spkiSha256(publicPem(1))}],
};
const evidence=(overrides={})=>({
  schemaVersion:1,domain:'original-source-objects',subjectHead:H10_PARENT,
  sourceDigest:hash('synthetic source'),proofDigest:hash('synthetic proof'),
  observedAt:'2026-10-10T12:00:00.000Z',expiresAt:'2026-10-11T12:00:00.000Z',
  nonce:nonce('c'),...overrides,
});
function signedEvidence(p=evidence()){
  const bytes=Buffer.from(canonicalH10Evidence(p));
  return {payload:p,operatorSignature:sign(null,bytes,keys[0].privateKey).toString('base64url'),
    witnessSignature:sign(null,bytes,keys[2].privateKey).toString('base64url')};
}
const evidenceOptions={operatorSpkiPem:publicPem(0),witnessSpkiPem:publicPem(2),
  independentPins:pins,operatorRole:'source-reviewer',witnessRole:'evidence-witness',nowMs:now};
describe('H10 qualified provenance and NO-GO release packet',()=>{
  it('pins eight H9 exact-head run IDs and two checked archives while all human gates stay open',()=>{
    const r=inspectH10Preparation(receipt);
    expect(r).toMatchObject({valid:true,qualifiedPredecessorChecks:8,
      verifiedPredecessorArtifacts:2,decision:'NO_GO',releaseAllowed:false});
    expect(receipt.parentH9.head).toBe(H10_PARENT);
    expect(receipt.parentH9.testedPrMergeTree).toBe(H10_TESTED_MERGE);
    expect(receipt.parentH9.checks.map(x=>x.runId)).toEqual(H10_CHECKS.map(x=>x[1]));
    expect(receipt.parentH9.artifacts.map(x=>x.sha256)).toEqual(H10_ARTIFACTS.map(x=>x[3]));
    expect(r.humanGatesOpen).toEqual([...H10_GATES]);
    expect(r.sourceDomainsOpen).toEqual(Object.keys(H10_DOMAINS));
    expect(prepareH10ReleaseDenial(receipt)).toMatchObject({decision:'NO_GO',
      publicationAllowed:false,mergeAllowed:false,deployAllowed:false,
      rollbackExecuted:false,realWitnessedCustodyCount:0});
  });
  it('fails closed on forged predecessor, source/rights/CDN/PWA/recovery and fake human approvals',()=>{
    for(const bad of [
      edit(p=>{p.parentH9.head='a'.repeat(40);}),
      edit(p=>{p.parentH9.testedPrMergeTree='b'.repeat(40);}),
      edit(p=>{p.parentH9.checks[0].runId=999;p.parentH9.checks[0].url='https://github.com/thiepn/thiepn.github.io/actions/runs/999';}),
      edit(p=>{p.parentH9.artifacts[0].sha256='f'.repeat(64);}),
      edit(p=>{p.parentH9.artifacts[1].crcOk=false;}),
      edit(p=>{p.provenanceDomains[0].sourceDigest=hash('fabricated');}),
      edit(p=>{p.provenanceDomains[1].status='APPROVED';}),
      edit(p=>{p.provenanceDomains[2].proofDigest=hash('fake CDN');}),
      edit(p=>{p.provenanceDomains[3].reviewer='unknown operator';}),
      edit(p=>{p.operatorGates[2].status='APPROVED';}),
      edit(p=>{p.operatorGates[3].observedAt='2026-10-10T12:00:00.000Z';}),
      edit(p=>{p.operatorTrustRoot='OPERATOR_PINNED';}),
      edit(p=>{p.evidenceSubmissions=[{fake:true}];}),
      edit(p=>{p.publicationAllowed=true;}),
      edit(p=>{p.ownerAuthorization='self-asserted';}),
    ]){expect(inspectH10Preparation(bad).valid).toBe(false);expect(()=>prepareH10ReleaseDenial(bad)).toThrow();}
  });
});
describe('H10 external signer-epoch continuity',()=>{
  it('witnesses a synthetic multi-hop rotation + terminal compromise only with independent epoch pins',()=>{
    const audit=reconcileH10Custody(syntheticCustody(),custodyArgs);
    expect(audit).toMatchObject({valid:true,cryptographicChainValid:true,verifiedSyntheticHops:2,
      terminated:true,externalOperatorApproval:false,decision:'NO_GO',releaseAllowed:false});
  });
  it('rejects unpinned/reused successor epochs, witness replacement and post-compromise recovery',()=>{
    const invalid=[
      {...custodyArgs,keyEpochPins:[custodyArgs.keyEpochPins[0]]},
      {...custodyArgs,keyEpochPins:[custodyArgs.keyEpochPins[0],{keyId:'operator-next',spkiSha256:'a'.repeat(64)}]},
      {...custodyArgs,keyEpochPins:[custodyArgs.keyEpochPins[0],custodyArgs.keyEpochPins[0]]},
      {...custodyArgs,witnessSpkiPem:publicPem(0)},
      {...custodyArgs,priorNonceDigests:[hash(nonce('a'))]},
    ];
    for(const o of invalid)expect(reconcileH10Custody(syntheticCustody(),o).valid).toBe(false);
    const compromised=syntheticCustody();
    compromised.push(signedH9({sequence:3,previousDigest:h9EventDigest(compromised[1]),
      action:'rotate',signerKeyId:'operator-next',nextKeyId:'operator-recover',nextSpkiPem:publicPem(0),
      observedAt:'2026-10-10T12:00:00.000Z',nonce:nonce('d')},1));
    expect(reconcileH10Custody(compromised,custodyArgs).valid).toBe(false);
  });
});
describe('H10 privacy-safe, independently witnessed source/device evidence review',()=>{
  it('cryptographically checks a synthetic source receipt without upgrading human/rights approval',()=>{
    const r=inspectH10EvidenceBatch([signedEvidence()],evidenceOptions);
    expect(r).toMatchObject({valid:true,cryptographicallyVerified:1,
      sourceRightsOrDeviceHumanApproval:false,decision:'NO_GO',releaseAllowed:false});
    expect(r.outcomes[0]).toMatchObject({domain:'original-source-objects',verifiedCryptography:true,
      redactedProofDigest:hash('synthetic proof')});
    expect(JSON.stringify(r)).not.toContain(nonce('c'));
    expect(JSON.stringify(r)).not.toContain('BEGIN PUBLIC KEY');
  });
  it('rejects forged digests, new private fields, wrong signer/role, replay and replaced keys',()=>{
    const tampered=signedEvidence();tampered.payload.sourceDigest=hash('replacement');
    const leaked=signedEvidence();leaked.payload.userId='not-permitted';
    const role=signedEvidence(evidence({domain:'physical-device-observations'}));
    const future=signedEvidence(evidence({observedAt:'2026-10-11T12:00:00.000Z'}));
    const expired=signedEvidence(evidence({expiresAt:'2026-10-10T11:00:00.000Z'}));
    const impossible=signedEvidence(evidence({observedAt:'2026-02-30T12:00:00.000Z'}));
    for(const item of [tampered,leaked,role,future,expired,impossible])
      expect(inspectH10EvidenceBatch([item],evidenceOptions).valid).toBe(false);
    expect(inspectH10EvidenceBatch([signedEvidence(),signedEvidence()],evidenceOptions).valid).toBe(false);
    expect(inspectH10EvidenceBatch([signedEvidence()],{
      ...evidenceOptions,priorNonceDigests:[hash(nonce('c'))]}).valid).toBe(false);
    expect(inspectH10EvidenceBatch([signedEvidence()],{
      ...evidenceOptions,independentPins:[pins[0],'f'.repeat(64)]}).valid).toBe(false);
    expect(inspectH10EvidenceBatch([signedEvidence()],{
      ...evidenceOptions,witnessSpkiPem:publicPem(0)}).valid).toBe(false);
    expect(inspectH10EvidenceBatch([signedEvidence()],{
      ...evidenceOptions,operatorRole:'release-operator'}).valid).toBe(false);
  });
});
