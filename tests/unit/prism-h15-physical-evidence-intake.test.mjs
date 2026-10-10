import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {H12_OBSERVATIONS} from '../../src/lib/prism/h12-multiparty-reconciliation.mjs';
import {H15_PARENT,H15_RUNS,H15_ARCHIVES,reconcileH15ExternalIntake}
 from '../../src/lib/prism/h15-physical-evidence-intake.mjs';
const stored=JSON.parse(readFileSync(new URL('../../docs/evidence/HUB_V1_1_H15_EXTERNAL_INTAKE.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(stored);
const hash=x=>createHash('sha256').update(x).digest('hex');
const now=Date.parse('2026-10-10T19:00:00.000Z');
const assess=p=>reconcileH15ExternalIntake(p,{nowMs:now});
function observation(i,patch={}){
 return {id:'device-record-'+i,kind:H12_OBSERVATIONS[i][0],
  ownerScopeDigest:hash('owner-external'),sessionDigest:hash('physical-session-'+i),
  captureDigest:hash('capture-'+i),witnessDigest:hash('independent-witness-'+i),
  observerDigest:hash('observer-'+i),observedAt:'2026-10-10T18:00:00.000Z',
  outcome:'PASS',...patch};
}
function recovery(i=0,patch={}){
 return {id:'recovery-record-'+i,ownerScopeDigest:hash('owner-external'),
  objectKeyDigest:hash('original-key'),sourceVersionDigest:hash('source-version'),
  originalBytesDigest:hash('original-bytes'),priorStableDigest:hash('prior-stable'),
  backupCiphertextDigest:hash('encrypted-backup'),restoredBytesDigest:hash('original-bytes'),
  witnessDigest:hash('witness-restore-'+i),observedAt:'2026-10-10T18:00:00.000Z',
  outcome:'MATCH_REPORTED',...patch};
}
function docket(kind,patch={}){
 return {kind,ownerRole:kind==='PRECUTOVER'?'release-owner':'recovery-owner',
  ownerScopeDigest:hash('owner-external'),intentDigest:hash('intent-'+kind),
  rightsReceiptDigest:hash('rights-original'),priorStableReceiptDigest:hash('prior-stable'),
  custodianDigest:hash('owner-'+kind),requestedAt:'2026-10-10T18:00:00.000Z',
  decision:'REVIEW_PENDING',...patch};
}
describe('H15 exact qualified H14 ancestry and non-executing original intake',()=>{
 it('pins eight successful H14 checks and both independently checked ZIPs',()=>{
  expect(stored.qualifiedH14.head).toBe(H15_PARENT);
  expect(stored.qualifiedH14.runIds).toEqual(H15_RUNS);
  expect(stored.qualifiedH14.artifacts).toEqual(H15_ARCHIVES.map(a=>({...a,crcVerified:true})));
  expect(assess(copy())).toMatchObject({schemaValid:true,status:'AWAITING_EXTERNAL_EVIDENCE',
   realOwnerApprovals:0,independentExternalIdentityAuthenticated:false,
   realPhysicalAcceptance:false,releaseAllowed:false,precutover:'NO_GO',
   postrelease:'NOT_REQUESTED',mergeAllowed:false,deployAllowed:false});
 });
 it('rejects parent switch, CI forgery, ZIP replacement, replay, and invented approval',()=>{
  const cases=[
   p=>p.qualifiedH14.head=hash('false-parent'),
   p=>p.qualifiedH14.runIds[0]=123456,
   p=>p.qualifiedH14.artifacts[0].sha256=hash('replacement'),
   p=>p.qualifiedH14.artifacts[1].crcVerified=false,
   p=>p.privateAccessToken='not allowed',
   p=>p.observations={},
   p=>p.recordedAt='2100-01-01T00:00:00.000Z',
  ];
  for(const change of cases){const p=copy();change(p);expect(assess(p).schemaValid).toBe(false);}
  const p=copy(),digest=hash(JSON.stringify(p));
  expect(reconcileH15ExternalIntake(p,{nowMs:now,priorPacketDigests:[digest]}).schemaValid).toBe(false);
 });
});
describe('H15 genuine device claims stay pending independently witnessed human acceptance',()=>{
 it('allows bounded six-device intake and NEVER treats even all PASS claims as verified',()=>{
  const p=copy();p.observations=H12_OBSERVATIONS.map((_,i)=>observation(i));
  const result=assess(p);
  expect(result).toMatchObject({schemaValid:true,status:'AWAITING_INDEPENDENT_ORIGINAL_REVIEW',
   observationClaims:6,missingPhysicalKinds:[],realPhysicalAcceptance:false,
   actualTwoOwnerOAuthVerified:false,releaseAllowed:false});
 });
 it('detects conflicting outcomes and re-used witness digests into escrow',()=>{
  const p=copy();
  p.observations=[observation(0),observation(0,{id:'device-record-seven',
   witnessDigest:hash('fresh-witness'),outcome:'FAIL'})];
  const r=assess(p);expect(r.schemaValid).toBe(true);
  expect(r.status).toBe('CONFLICT_ESCROW');
  expect(r.conflicts.some(e=>e.type==='PHYSICAL_OUTCOME_OR_SAME_SESSION_BYTES')).toBe(true);
  p.observations[1]=observation(1,{witnessDigest:p.observations[0].witnessDigest});
  expect(assess(p).conflicts.some(e=>e.type==='REUSED_PHYSICAL_WITNESS_RECEIPT')).toBe(true);
 });
 it('rejects private fields, duplicate IDs, fake PASS alias, missing proof, observer self-witness',()=>{
  const bad=[
   [observation(0,{email:'private@example.test'})],
   [observation(0),observation(1,{id:'device-record-0'})],
   [observation(0,{outcome:'APPROVED'})],
   [observation(0,{captureDigest:null})],
   [observation(0,{witnessDigest:hash('observer-0')})],
   [observation(0,{observedAt:'2026-10-11T18:00:00.000Z'})],
  ];
  for(const observations of bad){const p=copy();p.observations=observations;
   expect(assess(p).schemaValid).toBe(false);}
 });
});
describe('H15 authentic original recovery and split-owner claims are never self-approved',()=>{
 it('accepts digest-only reported restore and distinct pending owners, always NO_GO',()=>{
  const p=copy();p.recoveryWitnesses=[recovery()];
  p.ownerDockets=[docket('PRECUTOVER'),docket('POSTRELEASE')];
  expect(assess(p)).toMatchObject({schemaValid:true,
   recoveryWitnessClaims:1,ownerDocketClaims:2,originalBytesIndependentlyRestored:false,
   realOwnerApprovals:0,rollbackAllowed:false,postrelease:'NOT_REQUESTED'});
 });
 it('escrows conflicting restored bytes and rejects falsely claimed byte matches',()=>{
  const p=copy();p.recoveryWitnesses=[recovery(),recovery(1,{
   sourceVersionDigest:hash('different-version'),restoredBytesDigest:hash('different-bytes'),
   outcome:'MISMATCH_REPORTED'})];
  expect(assess(p).status).toBe('CONFLICT_ESCROW');
  expect(assess(p).conflicts.some(e=>e.type==='CONTRADICTORY_ORIGINAL_RIGHTS_OR_RESTORED_BYTES')).toBe(true);
  p.recoveryWitnesses=[recovery(0,{restoredBytesDigest:hash('different'),outcome:'MATCH_REPORTED'})];
  expect(assess(p).conflicts.some(e=>e.type==='FALSE_RESTORED_BYTE_MATCH')).toBe(true);
 });
 it('enforces separate precutover and recovery custodians, no GO or deployed rollback',()=>{
  const p=copy();p.ownerDockets=[docket('PRECUTOVER'),docket('POSTRELEASE',{
   custodianDigest:hash('owner-PRECUTOVER')})];
  expect(assess(p).conflicts.some(e=>e.type==='OWNER_ROLE_ALIAS_OR_SCOPE_CHANGE')).toBe(true);
  p.ownerDockets=[docket('PRECUTOVER',{decision:'GO'})];
  expect(assess(p).schemaValid).toBe(false);
  p.ownerDockets=[docket('POSTRELEASE',{ownerRole:'release-owner'})];
  expect(assess(p).schemaValid).toBe(false);
 });
});
