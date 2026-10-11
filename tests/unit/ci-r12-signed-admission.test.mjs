import {describe,it,expect} from 'vitest';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonical,inspectSignedAdmission,FIXED_SUITES,FIXED_EXTERNAL,INSPECTION_ONLY} from '../../scripts/ci-r12-signed-admission.mjs';

const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const pub=publicKey.export({type:'spki',format:'pem'});
const issued=Date.parse('2026-10-12T00:00:00Z');
const nowMs=issued+30_000;
const nonce='synthetic_Nonce_01234567890123';
const data=()=>({schemaVersion:1,purpose:'THIEPN_HUB_CI_PRIVATE_TEST_REVIEW_ONLY',candidateSha:'a'.repeat(40),trustedRunnerSha:'b'.repeat(40),ownerId:'owner-synthetic',reviewerId:'reviewer-synthetic',issuedAt:new Date(issued).toISOString(),expiresAt:new Date(issued+10*60_000).toISOString(),nonce,suitePins:structuredClone(FIXED_SUITES),externalPins:structuredClone(FIXED_EXTERNAL)});
const make=(d=data(),changes={})=>{const recordJson=canonical(d);const signatureBase64=sign(null,Buffer.from(recordJson),privateKey).toString('base64');return{recordJson,signatureBase64,trustedPublicKeyPem:pub,observed:{candidateSha:d.candidateSha,trustedRunnerSha:d.trustedRunnerSha},consumedNonces:[],nowMs,...changes};};
const rejected=(a)=>{const r=inspectSignedAdmission(a);expect(r.executionAllowed).toBe(false);expect(r.recordConsistent).toBe(false);expect(r.errors.length).toBeGreaterThan(0);};
describe('R12 independently-held signed admission data: NEVER a release or CI execution grant',()=>{
 it('accepts synthetically signed immutable source records for inspection ONLY',()=>{
   const r=inspectSignedAdmission(make());expect(r).toEqual({status:INSPECTION_ONLY,recordConsistent:true,executionAllowed:false,errors:[]});
   expect(Object.keys(FIXED_SUITES)).toHaveLength(6);
 });
 it('rejects tampering, a forged signer, or missing externally held trust root',()=>{
   let a=make();rejected({...a,recordJson:a.recordJson.replace('a'.repeat(40),'c'.repeat(40))});
   rejected({...a,trustedPublicKeyPem:generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'})});
   rejected({...a,trustedPublicKeyPem:null});
 });
 it('rejects changed Account/TMS60/Library SHA pins and a missing suite',()=>{
   for(const edit of [d=>d.suitePins['hub-integration.yml'][0]='c'.repeat(40),d=>{delete d.suitePins['hub-inbox-browser.yml'];},d=>d.externalPins['h20-library']='d'.repeat(40),d=>d.externalPins['h15-tms60']='e'.repeat(40)]){const d=data();edit(d);rejected(make(d));}
 });
 it('rejects changed observed HEAD or runner code even with signed unchanged approval',()=>{
   rejected(make(data(),{observed:{candidateSha:'d'.repeat(40),trustedRunnerSha:'b'.repeat(40)}}));
   rejected(make(data(),{observed:{candidateSha:'a'.repeat(40),trustedRunnerSha:'c'.repeat(40)}}));
   rejected(make(data(),{observed:null}));
 });
 it('rejects expired/future, extended validity and replayed synthetic authorization',()=>{
   rejected(make(data(),{nowMs:issued+11*60_000}));
   rejected(make(data(),{nowMs:issued-1}));
   const long=data();long.expiresAt=new Date(issued+16*60_000).toISOString();rejected(make(long));
   rejected(make(data(),{consumedNonces:[nonce]}));
   rejected(make(data(),{consumedNonces:undefined}));
 });
 it('rejects self-approval, missing reviewer, foreign purpose and unrequested extra controls',()=>{
   for(const edit of [d=>d.reviewerId=d.ownerId,d=>d.reviewerId='',d=>d.purpose='DEPLOY',d=>d.executionAllowed=true,d=>d.candidateSha='HEAD']){const d=data();edit(d);rejected(make(d));}
 });
 it('never upgrades a passing signature to a privileged test or release entitlement',()=>{
   const value=inspectSignedAdmission(make());expect(value.recordConsistent).toBe(true);expect(value.executionAllowed).toBe(false);expect(value.status).toBe(INSPECTION_ONLY);
 });
});
