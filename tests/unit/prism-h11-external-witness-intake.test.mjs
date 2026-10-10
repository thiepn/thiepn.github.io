import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync, createHash, sign } from 'node:crypto';
import { spkiSha256 } from '../../src/lib/prism/h8-operator-attestation.mjs';
import {
  H11_PARENT,H11_MERGE,H11_CHECKS,H11_ARTIFACTS,H11_GATES,
  canonicalH11WitnessPayload,h11WitnessReceiptDigest,
  inspectH11DefaultPacket,reviewH11ExternalWitnessBatch,prepareH11Denial
} from '../../src/lib/prism/h11-external-witness-intake.mjs';

const packet=JSON.parse(readFileSync(new URL('../../docs/evidence/HUB_V1_1_H11_EXTERNAL_WITNESS.json',import.meta.url),'utf8'));
const change=fn=>{const v=structuredClone(packet);fn(v);return v;};
const keys=Array.from({length:3},()=>generateKeyPairSync('ed25519')); // process-local synthetic only
const pem=i=>keys[i].publicKey.export({type:'spki',format:'pem'}).toString();
const pins=[spkiSha256(pem(0)),spkiSha256(pem(1))];
const sha=x=>createHash('sha256').update(x).digest('hex');
const nowMs=Date.parse('2026-10-10T16:00:00.000Z');
const opts={operatorSpkiPem:pem(0),witnessSpkiPem:pem(1),pinnedSpkiDigests:pins,
  operatorRole:'source-reviewer',witnessRole:'independent-evidence-witness',nowMs};
const payload=(overrides={})=>({
  schemaVersion:1,packetId:'synthetic_packet_abcdefghijkl',domain:'original-source-objects',
  subjectHead:H11_PARENT,sourceObjectKeyDigest:sha('key synthetic'),
  sourceDigest:sha('original synthetic bytes'),proofDigest:sha('synthetic evidence'),
  rightsDigest:null,previousStableDigest:null,observedAt:'2026-10-10T14:00:00.000Z',
  expiresAt:'2026-10-11T14:00:00.000Z',nonce:'witness_nonce_abcdefghijklmnop',
  previousPacketDigest:'0'.repeat(64),...overrides,
});
const seal=p=>{
  const bytes=Buffer.from(canonicalH11WitnessPayload(p));
  return {payload:p,operatorSignature:sign(null,bytes,keys[0].privateKey).toString('base64url'),
    witnessSignature:sign(null,bytes,keys[1].privateKey).toString('base64url')};
};
describe('H11 externally sourced witness and rights/recovery intake',()=>{
  it('reconciles exact H10 source, CI artifacts, seven UNVERIFIED domains and seven OPEN human gates',()=>{
    const q=inspectH11DefaultPacket(packet);
    expect(q).toMatchObject({valid:true,priorRuns:8,priorArtifacts:2,decision:'NO_GO',releaseAllowed:false});
    expect(packet.qualifiedH10.head).toBe(H11_PARENT);
    expect(packet.qualifiedH10.testedMergeTree).toBe(H11_MERGE);
    expect(packet.qualifiedH10.checks.map(x=>x.runId)).toEqual(H11_CHECKS.map(x=>x[1]));
    expect(packet.qualifiedH10.artifacts.map(x=>x.sha256)).toEqual(H11_ARTIFACTS.map(x=>x[3]));
    expect(q.openGates).toEqual([...H11_GATES]);
    expect(prepareH11Denial(packet)).toMatchObject({trustRoot:'UNCONFIGURED',
      realPackets:0,realSigners:0,rightsAccepted:false,previousStableRestored:false,
      physicalDeviceAccepted:false,decision:'NO_GO',publishAllowed:false,
      mergeAllowed:false,deployAllowed:false,rollbackExecuted:false});
  });
  it('rejects forged exact-head CI, artifacts, source/rights and pretend real approvals',()=>{
    for(const v of [
      change(p=>{p.qualifiedH10.head='a'.repeat(40);}),
      change(p=>{p.qualifiedH10.testedMergeTree='b'.repeat(40);}),
      change(p=>{p.qualifiedH10.checks[0].runId=9;p.qualifiedH10.checks[0].url='https://github.com/thiepn/thiepn.github.io/actions/runs/9';}),
      change(p=>{p.qualifiedH10.artifacts[1].sha256='c'.repeat(64);}),
      change(p=>{p.qualifiedH10.artifacts[0].crcVerified=false;}),
      change(p=>{p.sourceEvidenceDomains[1].status='APPROVED';}),
      change(p=>{p.sourceEvidenceDomains[2].evidenceDigest=sha('made up');}),
      change(p=>{p.operatorGates[1].reviewer='Fabricated operator';}),
      change(p=>{p.operatorGates[3].status='APPROVED';}),
      change(p=>{p.operatorPublicKeys=['made up root'];}),
      change(p=>{p.rotationEvents=[{fake:true}];}),
      change(p=>{p.revocationEvents=[{fake:true}];}),
      change(p=>{p.previousStableRestore='RESTORED';}),
      change(p=>{p.ownerAuthorization='GO';}),
      change(p=>{p.publishAllowed=true;}),
      change(p=>{p.externalPackets=[seal(payload())];}),
    ]){expect(inspectH11DefaultPacket(v).valid).toBe(false);expect(()=>prepareH11Denial(v)).toThrow();}
  });
  it('checks an independently pinned synthetic dual-signature without promoting human approval',()=>{
    const q=reviewH11ExternalWitnessBatch([seal(payload())],opts);
    expect(q).toMatchObject({valid:true,cryptographicallyChecked:1,
      independentlyAcceptedHumanGates:0,sourceObjectRightsApproved:false,
      physicalDeviceApproved:false,recoveryExecuted:false,decision:'NO_GO',publishAllowed:false});
    expect(q.packets[0].proofDigest).toBe(sha('synthetic evidence'));
    expect(JSON.stringify(q)).not.toContain('BEGIN PUBLIC KEY');
    expect(JSON.stringify(q)).not.toContain('witness_nonce');
  });
  it('requires a chained receipt, unique IDs, stable source bytes and monotonically increasing times',()=>{
    const a=seal(payload());
    const b=seal(payload({packetId:'synthetic_packet_second_abcdefgh',nonce:'witness_nonce_second_abcdefghijk',
      observedAt:'2026-10-10T14:10:00.000Z',previousPacketDigest:h11WitnessReceiptDigest(a)}));
    expect(reviewH11ExternalWitnessBatch([a,b],opts)).toMatchObject({valid:true,cryptographicallyChecked:2});
    for(const invalid of [
      [a,seal(payload({packetId:'synthetic_packet_second_abcdefgh',nonce:'witness_nonce_second_abcdefghijk',
        observedAt:'2026-10-10T14:10:00.000Z',previousPacketDigest:'f'.repeat(64)}))],
      [a,seal(payload({packetId:'synthetic_packet_abcdefghijkl',nonce:'witness_nonce_second_abcdefghijk',
        observedAt:'2026-10-10T14:10:00.000Z',previousPacketDigest:h11WitnessReceiptDigest(a)}))],
      [a,seal(payload({packetId:'synthetic_packet_second_abcdefgh',nonce:'witness_nonce_second_abcdefghijk',
        observedAt:'2026-10-10T13:10:00.000Z',previousPacketDigest:h11WitnessReceiptDigest(a)}))],
      [a,seal(payload({packetId:'synthetic_packet_second_abcdefgh',nonce:'witness_nonce_second_abcdefghijk',
        sourceDigest:sha('different source bytes'),observedAt:'2026-10-10T14:10:00.000Z',
        previousPacketDigest:h11WitnessReceiptDigest(a)}))],
    ])expect(reviewH11ExternalWitnessBatch(invalid,opts).valid).toBe(false);
  });
  it('refuses unscoped license, CDN rollback, PWA and offline restore assertions',()=>{
    for(const [domain,role] of [
      ['content-rights-and-licenses','rights-reviewer'],
      ['cdn-cache-and-rollback','release-operator'],
      ['pwa-service-worker-provenance','release-operator'],
      ['offline-data-recovery','recovery-operator']
    ]){
      const p=payload({domain});
      const insufficient=reviewH11ExternalWitnessBatch([seal(p)],{...opts,operatorRole:role});
      expect(insufficient.valid).toBe(false);
      if(domain==='content-rights-and-licenses')p.rightsDigest=sha('fixture license');
      else p.previousStableDigest=sha('fixture previous stable');
      const checked=reviewH11ExternalWitnessBatch([seal(p)],{...opts,operatorRole:role});
      expect(checked).toMatchObject({valid:true,cryptographicallyChecked:1,
        sourceObjectRightsApproved:false,recoveryExecuted:false});
    }
  });
  it('rejects fabricated signatures, scope drift, private payload metadata and key substitution',()=>{
    const forged=seal(payload());forged.payload.proofDigest=sha('tampered');
    const privateField=seal(payload());privateField.payload.ownerId='secret-owner';
    const badSig=seal(payload());badSig.witnessSignature='A'.repeat(86);
    for(const e of [forged,privateField,badSig])
      expect(reviewH11ExternalWitnessBatch([e],opts).valid).toBe(false);
    for(const changed of [
      {...opts,pinnedSpkiDigests:[pins[0],sha('untrusted')]},
      {...opts,revokedSpkiDigests:[pins[0]]},
      {...opts,witnessSpkiPem:pem(0)},
      {...opts,operatorRole:'rights-reviewer'},
      {...opts,witnessRole:'source-reviewer'},
      {...opts,usedNonceDigests:[sha(payload().nonce)]},
      {...opts,usedReceiptDigests:[h11WitnessReceiptDigest(seal(payload()))]},
    ])expect(reviewH11ExternalWitnessBatch([seal(payload())],changed).valid).toBe(false);
  });
  it('rejects rollover timestamps, stale/future/expired observation and overlong expiry',()=>{
    for(const p of [
      payload({observedAt:'2026-02-30T14:00:00.000Z'}),
      payload({observedAt:'2026-10-10T24:00:00.000Z'}),
      payload({observedAt:'2026-11-10T14:00:00.000Z'}),
      payload({observedAt:'2026-07-10T14:00:00.000Z'}),
      payload({expiresAt:'2026-10-10T12:00:00.000Z'}),
      payload({expiresAt:'2026-11-11T14:00:00.000Z'}),
    ])expect(reviewH11ExternalWitnessBatch([seal(p)],opts).valid).toBe(false);
  });
});
