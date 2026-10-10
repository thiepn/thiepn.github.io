import { describe, expect, it } from 'vitest';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  H8_PARENT, H8_GATES, canonicalAttestationPayload, spkiSha256,
  evaluateH8Attestations, prepareH8NonexecutingDecision,
} from '../../src/lib/prism/h8-operator-attestation.mjs';

const recorded=JSON.parse(readFileSync(new URL('../../docs/evidence/HUB_V1_1_H8_ATTESTATION_REGISTRY.json',import.meta.url),'utf8'));
const nowMs=Date.parse('2026-10-10T08:00:00.000Z');
const clone=o=>structuredClone(o);
const {publicKey,privateKey}=generateKeyPairSync('ed25519'); // synthetic ephemeral fixture, never a trust root
const pem=publicKey.export({type:'spki',format:'pem'}).toString();
const digest=spkiSha256(pem);
const key={
  keyId:'fixture-accessibility-operator',
  role:'accessibility-operator',spkiPem:pem,
  validFrom:'2026-10-09T00:00:00.000Z',
  validUntil:'2026-10-17T00:00:00.000Z',revokedAt:null,
};
const payload=(overrides={})=>({
  schemaVersion:1,gateId:'screen-reader-keyboard',subjectHead:H8_PARENT,keyId:key.keyId,
  evidenceDigest:createHash('sha256').update('synthetic evidence not attached').digest('hex'),
  observedAt:'2026-10-10T07:00:00.000Z',expiresAt:'2026-10-12T07:00:00.000Z',
  nonce:'fixture_nonce_abcdefghijklmnopqrstuvwxyz',...overrides,
});
const receipt=(p=payload())=>({
  payload:p, signature:sign(null,Buffer.from(canonicalAttestationPayload(p)),privateKey).toString('base64url'),
});
const fixture=(r=receipt())=>({
  ...clone(recorded),trustRoot:'OPERATOR_PINNED',keys:[key],receipts:[r],
});
const evaluate=(r,pins=[digest],priorNonceDigests=[])=>evaluateH8Attestations(r,{trustedSpkiDigests:pins,priorNonceDigests,nowMs});

describe('H8 independent cryptographic evidence intake',()=>{
  it('keeps all seven real operator gates OPEN and performs only a NO-GO rehearsal',()=>{
    const audit=evaluate(recorded,[]);
    expect(audit).toMatchObject({valid:true,validatedReceipts:0,signoffsApproved:0,
      evidenceReviewOnly:true,releaseAllowed:false,deployAllowed:false,rollbackExecuted:false});
    expect(audit.openGates).toEqual(Object.keys(H8_GATES));
    expect(prepareH8NonexecutingDecision(recorded)).toMatchObject({
      trustRootStatus:'UNCONFIGURED',signaturesCollected:0,operatorApproved:false,
      publicationAllowed:false,mergeAllowed:false,deployAllowed:false,rollbackExecuted:false});
  });
  it('verifies a correctly signed, scoped *synthetic* receipt with independently supplied key pin',()=>{
    const r=fixture();
    const audit=evaluate(r);
    expect(audit).toMatchObject({valid:true,validatedReceipts:1,
      signoffsApproved:0,releaseDecision:'NO_GO',releaseAllowed:false});
    expect(audit.receipts[0]).toMatchObject({gateId:'screen-reader-keyboard',
      cryptographicallyVerified:true,reasons:[]});
    expect(JSON.stringify(audit)).not.toMatch(/fixture-accessibility-operator|spkiPem|signature|nonce_/);
  });
  it('rejects private metadata, forgery, different signing key and wrong subject',()=>{
    const modifications=[
      r=>{r.receipts[0].payload.evidenceDigest='f'.repeat(64);},
      r=>{r.receipts[0].payload.userId='forbidden-private-owner';},
      r=>{r.receipts[0].payload.subjectHead='a'.repeat(40);},
      r=>{r.receipts[0].signature='x'.repeat(86);},
      r=>{r.receipts[0].payload.gateId='security-review';},
      r=>{r.receipts[0].payload.keyId='different-key';},
    ];
    for(const mutate of modifications){const r=fixture();mutate(r);expect(evaluate(r).valid).toBe(false);}
    expect(evaluate(fixture(),[]).valid).toBe(false);
  });
  it('blocks replay within packet and against an independently retained nonce ledger',()=>{
    const r=fixture();r.receipts.push(clone(r.receipts[0]));
    expect(evaluate(r).valid).toBe(false);
    const hash=createHash('sha256').update(payload().nonce).digest('hex');
    expect(evaluate(fixture(),[digest],[hash]).valid).toBe(false);
    const stored=fixture();stored.usedNonceDigests=[hash];
    expect(evaluate(stored).valid).toBe(false);
  });
  it('fences expired, future, stale, and excessive lifetime attestations',()=>{
    const values=[
      {observedAt:'2026-10-10T09:00:00.000Z'},
      {observedAt:'2026-08-10T07:00:00.000Z'},
      {expiresAt:'2026-10-10T07:00:00.000Z'},
      {expiresAt:'2026-11-10T07:00:00.000Z'},
    ];
    for(const update of values){const p=payload(update);expect(evaluate(fixture(receipt(p))).valid).toBe(false);}
  });
  it('enforces signer roles, pinning, validity and revocation across rotations',()=>{
    for(const change of [
      r=>{r.keys[0].role='security-reviewer';},
      r=>{r.keys[0].revokedAt='2026-10-09T04:00:00.000Z';},
      r=>{r.revokedKeyIds=[key.keyId];},
      r=>{r.keys[0].validFrom='2026-10-11T00:00:00.000Z';},
      r=>{r.keys[0].validUntil='2026-10-10T06:00:00.000Z';},
      r=>{r.keys.push(clone(r.keys[0]));},
    ]){const r=fixture();change(r);expect(evaluate(r).valid).toBe(false);}
    const other=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'}).toString();
    const r=fixture();r.keys[0].spkiPem=other;
    expect(evaluate(r).valid).toBe(false);
  });
  it('never permits operator-to-release privilege escalation even with valid synthetic signatures',()=>{
    const r=fixture();r.gateStates[2].status='APPROVED';
    expect(evaluate(r).valid).toBe(false);
    for(const field of ['publicationAllowed','mergeAllowed','deployAllowed','rollbackExecuted',
      'operatorTrustRootApproved']){
      const modified=clone(fixture());modified[field]=true;
      expect(evaluate(modified).valid).toBe(false);
    }
    const modified=fixture();modified.releaseDecision='GO';
    expect(evaluate(modified).valid).toBe(false);
    expect(()=>prepareH8NonexecutingDecision(fixture())).toThrow();
  });
});
