import {describe,it,expect} from 'vitest';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spkiSha256} from '../../src/lib/prism/h8-operator-attestation.mjs';
import {canonicalH11WitnessPayload} from '../../src/lib/prism/h11-external-witness-intake.mjs';
import {H12_PARENT,H12_MERGE,H12_CHECKS,H12_ARTIFACTS,H12_OBSERVATIONS,
 inspectH12Preparation,reconcileH12MultiParty,inspectH12CustodyChronology,
 inspectH12PhysicalCollection,inspectH12DecisionCandidates,canonicalH12Decision,
 prepareH12NoGo} from '../../src/lib/prism/h12-multiparty-reconciliation.mjs';
const packet=JSON.parse(readFileSync(new URL('../../docs/evidence/HUB_V1_1_H12_PRECUTOVER_RECONCILIATION.json',import.meta.url),'utf8'));
const changed=f=>{const x=structuredClone(packet);f(x);return x;};
const sha=s=>createHash('sha256').update(s).digest('hex');
const keys=Array.from({length:6},()=>generateKeyPairSync('ed25519')); // synthetic and ephemeral
const pem=i=>keys[i].publicKey.export({format:'pem',type:'spki'}).toString();
const pin=i=>spkiSha256(pem(i));
const now=Date.parse('2026-10-10T16:00:00.000Z');
function registry(domain='original-source-objects'){
 const roles={'original-source-objects':'source-reviewer','content-rights-and-licenses':'rights-reviewer',
  'cdn-cache-and-rollback':'release-operator','offline-data-recovery':'recovery-operator'};
 return [0,2].map((k,i)=>({
  operatorId:'operator-'+(i+1),witnessId:'witness-'+(i+1),
  operatorRole:roles[domain]??'source-reviewer',
  operatorSpkiPem:pem(k),witnessSpkiPem:pem(k+1),
  operatorPin:pin(k),witnessPin:pin(k+1),epoch:1,
  validFrom:'2026-10-09T00:00:00.000Z',validUntil:'2026-10-11T00:00:00.000Z',
  revokedAt:null,compromisedAt:null
 }));
}
function payload(i=0,extra={}){
 return {schemaVersion:1,packetId:'synthetic_packet_'+(i+1)+'_abcdefghijkl',
  domain:'original-source-objects',subjectHead:'31f267fca6a3e227b45c34893b0f5532022359d9',
  sourceObjectKeyDigest:sha('stable original object key'),sourceDigest:sha('original object bytes'),
  proofDigest:sha('independent proof fixture'),rightsDigest:null,previousStableDigest:null,
  observedAt:'2026-10-10T14:00:00.000Z',expiresAt:'2026-10-11T14:00:00.000Z',
  nonce:'unique_witness_nonce_'+(i+1)+'_abcdefghijklmnop',
  previousPacketDigest:'0'.repeat(64),...extra};
}
function seal(p,i){
 const bytes=Buffer.from(canonicalH11WitnessPayload(p));
 return {payload:p,operatorSignature:sign(null,bytes,keys[i*2].privateKey).toString('base64url'),
  witnessSignature:sign(null,bytes,keys[i*2+1].privateKey).toString('base64url')};
}
function groups(extra0={},extra1={}){
 return [{operatorId:'operator-1',epoch:1,envelopes:[seal(payload(0,extra0),0)]},
  {operatorId:'operator-2',epoch:1,envelopes:[seal(payload(1,extra1),1)]}];
}
const opts={registry:registry(),nowMs:now};
const candidate=(kind,index,changes={})=>{
 const p={schemaVersion:1,subjectHead:H12_PARENT,kind,
  requestedAt:'2026-10-10T15:00:00.000Z',expiresAt:'2026-10-10T17:00:00.000Z',
  intentDigest:sha('synthetic '+kind),nonce:'owner_nonce_'+kind.toLowerCase(),
  signerRole:kind==='PRECUTOVER'?'release-owner':'recovery-owner',...changes};
 return {payload:p,signature:sign(null,Buffer.from(canonicalH12Decision(p)),keys[index].privateKey).toString('base64url')};
};
const decisionOpts={precutoverPublicKey:pem(4),postreleasePublicKey:pem(5),
 precutoverPin:pin(4),postreleasePin:pin(5),nowMs:now};
describe('H12 pinned H11 prerequisite and nonexecuting decisions',()=>{
 it('pins all eight exact-head CI IDs, both independent ZIP hashes/CRC and seven open human gates',()=>{
  expect(inspectH12Preparation(packet)).toMatchObject({valid:true,sourceChecks:8,
   independentlyCheckedArchives:2,decision:'NO_GO',releaseAllowed:false,rollbackAllowed:false});
  expect(packet.qualifiedH11.head).toBe(H12_PARENT);
  expect(packet.qualifiedH11.testedMergeTree).toBe(H12_MERGE);
  expect(packet.qualifiedH11.checks.map(x=>x.runId)).toEqual(H12_CHECKS.map(x=>x[1]));
  expect(packet.qualifiedH11.artifacts.map(x=>x.sha256)).toEqual(H12_ARTIFACTS.map(x=>x[3]));
  expect(prepareH12NoGo(packet)).toMatchObject({precutoverDecision:'NO_GO',
   postreleaseRollback:'NOT_REQUESTED',realExternalWitnesses:0,
   rollbackExecuted:false,deployAllowed:false});
 });
 it('rejects synthetic signoffs, trust-root forgery, altered run/artifact, and pretend rollback',()=>{
  const bad=[
   changed(x=>x.qualifiedH11.head='a'.repeat(40)),
   changed(x=>x.qualifiedH11.testedMergeTree='b'.repeat(40)),
   changed(x=>x.qualifiedH11.checks[1].conclusion='failure'),
   changed(x=>x.qualifiedH11.artifacts[0].entryCount=50),
   changed(x=>x.qualifiedH11.artifacts[1].crcVerified=false),
   changed(x=>x.trustRoot='INSTALLED'),
   changed(x=>x.operatorRegistrations.push({fake:true})),
   changed(x=>x.externalWitnessSets.push({fake:true})),
   changed(x=>x.custodyTransitions.push('fake')),
   changed(x=>x.provenance[1].status='VERIFIED'),
   changed(x=>x.humanGates[1].status='APPROVED'),
   changed(x=>x.humanGates[6].reviewer='operator'),
   changed(x=>x.decisions.precutover='GO'),
   changed(x=>x.decisions.postrelease='ROLLBACK'),
   changed(x=>x.decisions.purge=true),
  ];
  for(const v of bad){expect(inspectH12Preparation(v).valid).toBe(false);
   expect(()=>prepareH12NoGo(v)).toThrow();}
 });
});
describe('H12 independently pinned multi-party reconciliation',()=>{
 it('cryptographically corroborates independent synthetic operators without human authority',()=>{
  const v=reconcileH12MultiParty(groups(),opts);
  expect(v).toMatchObject({valid:true,acceptedRealWitnesses:0,trustRootInstalled:false,
    decision:'NO_GO',releaseAllowed:false,rollbackAllowed:false});
  expect(v.syntheticCorroboratedScopes).toHaveLength(1);
  expect(JSON.stringify(v)).not.toContain('BEGIN PUBLIC KEY');
  expect(JSON.stringify(v)).not.toContain('unique_witness_nonce');
 });
 it('refuses conflicting source-object bytes, license rights and previous-stable recovery',()=>{
  expect(reconcileH12MultiParty(groups({}, {sourceDigest:sha('conflicting original')}),opts).valid).toBe(false);
  const rights='content-rights-and-licenses';
  const a={domain:rights,rightsDigest:sha('license A')};
  const b={domain:rights,rightsDigest:sha('license B')};
  expect(reconcileH12MultiParty(groups(a,b),{...opts,registry:registry(rights)}).valid).toBe(false);
  expect(reconcileH12MultiParty(groups(a,a),{...opts,registry:registry(rights)}).valid).toBe(true);
  const cdn='cdn-cache-and-rollback';
  const restore={domain:cdn,previousStableDigest:sha('rollback stable A')};
  expect(reconcileH12MultiParty(groups(restore,{...restore,previousStableDigest:sha('rollback stable B')}),
   {...opts,registry:registry(cdn)}).valid).toBe(false);
  expect(reconcileH12MultiParty(groups(restore,restore),{...opts,registry:registry(cdn)}).valid).toBe(true);
 });
 it('rejects replays across operators, conflict in proof hashes and duplicate custodian',()=>{
  expect(reconcileH12MultiParty(groups({}, {nonce:payload(0).nonce}),opts).valid).toBe(false);
  expect(reconcileH12MultiParty(groups({}, {proofDigest:sha('conflicting proof')}),opts).valid).toBe(false);
  const duplicate=registry();duplicate[1].witnessId=duplicate[0].witnessId;
  duplicate[1].witnessSpkiPem=duplicate[0].witnessSpkiPem;
  duplicate[1].witnessPin=duplicate[0].witnessPin;
  const v=reconcileH12MultiParty(groups(),{...opts,registry:duplicate});
  expect(v.valid).toBe(false);
  const preUsed=sha(payload(0).nonce);
  expect(reconcileH12MultiParty(groups(),{...opts,usedNonceDigests:[preUsed]}).valid).toBe(false);
 });
 it('rejects forged signatures, roles, pin substitution and overlapping operator/witness identity',()=>{
  const invalid=groups();invalid[0].envelopes[0].payload.proofDigest=sha('tampered');
  expect(reconcileH12MultiParty(invalid,opts).valid).toBe(false);
  const wrong=registry();wrong[0].operatorRole='release-operator';
  expect(reconcileH12MultiParty(groups(),{...opts,registry:wrong}).valid).toBe(false);
  const untrusted=registry();untrusted[0].witnessPin=sha('replacement witness pin');
  expect(reconcileH12MultiParty(groups(),{...opts,registry:untrusted}).valid).toBe(false);
  const alias=registry();alias[1].witnessPin=pin(0);alias[1].witnessSpkiPem=pem(0);
  expect(reconcileH12MultiParty(groups(),{...opts,registry:alias}).valid).toBe(false);
 });
 it('rejects expired, backdated, revoked or compromised custody epochs',()=>{
  for(const patch of [
    x=>x.validUntil='2026-10-10T13:00:00.000Z',
    x=>x.validFrom='2026-10-10T15:00:00.000Z',
    x=>x.revokedAt='2026-10-10T13:00:00.000Z',
    x=>x.compromisedAt='2026-10-10T14:30:00.000Z',
    x=>x.compromisedAt='2026-10-10T13:00:00.000Z',
  ]){
   const e=registry();patch(e[0]);
   expect(reconcileH12MultiParty(groups(),{...opts,registry:e}).valid).toBe(false);
  }
  expect(inspectH12CustodyChronology([])).toMatchObject({valid:false,
   independentlyEnrolled:false,releaseAllowed:false,rollbackExecuted:false});
 });
 it('rejects untrusted empty quorum, malformed external replay ledgers and additional keys',()=>{
  expect(reconcileH12MultiParty([groups()[0]],opts).valid).toBe(false);
  expect(reconcileH12MultiParty(groups(),{...opts,registry:[]}).valid).toBe(false);
  expect(reconcileH12MultiParty(groups(),{...opts,usedReceiptDigests:['not-a-hash']}).valid).toBe(false);
  const extra={...groups()[0],ownerToken:'private'};expect(reconcileH12MultiParty([extra,groups()[1]],opts).valid).toBe(false);
 });
});
describe('H12 genuine-device evidence preparation without counterfeit observations',()=>{
 const fixture=(kind,platform,browser,assistiveTechnology)=>({
  kind,platform,browser,assistiveTechnology,subjectHead:H12_PARENT,
  proofDigest:sha('uncollected external proof'),witnessReceiptDigest:sha('uncollected witness receipt'),
  observedAt:'2026-10-10T15:00:00.000Z',source:'INDEPENDENT_REVIEW_REQUIRED',state:'PENDING'
 });
 it('enforces Android Chrome, Samsung Internet, iOS Safari, TalkBack and VoiceOver combinations',()=>{
  const list=H12_OBSERVATIONS.map(v=>fixture(...v));
  const v=inspectH12PhysicalCollection(list,{nowMs:now});
  expect(v).toMatchObject({valid:true,realDeviceAcceptance:false,screenReaderAcceptance:false,
   decision:'NO_GO',rollbackAllowed:false});
  expect(v.outcomes.every(x=>x.actualPhysicalReviewVerified===false)).toBe(true);
 });
 it('rejects fake reviews, switched assistive technologies, private fields and future observations',()=>{
  const base=fixture(...H12_OBSERVATIONS[0]);
  const fake=[{...base,state:'APPROVED'},
   {...base,assistiveTechnology:'VoiceOver'},
   {...base,source:'CI_SYNTHETIC'},
   {...base,privateDeviceId:'serial-number'},
   {...base,observedAt:'2026-10-11T15:00:00.000Z'}];
  for(const p of fake)expect(inspectH12PhysicalCollection([p],{nowMs:now}).valid).toBe(false);
 });
});
describe('H12 separately denied precutover and postrelease signature candidates',()=>{
 it('cryptographically distinguishes two independent synthetic owners without authorizing release',()=>{
  const candidates=[candidate('PRECUTOVER',4),candidate('POSTRELEASE_ROLLBACK',5)];
  const v=inspectH12DecisionCandidates(candidates,decisionOpts);
  expect(v).toMatchObject({valid:true,cryptographicCandidateCount:2,
   independentlyAuthenticatedRealHumans:0,precutover:'NO_GO',postrelease:'NOT_REQUESTED',
   releaseAllowed:false,rollbackAllowed:false,rollbackExecuted:false});
 });
 it('rejects key substitution, same signer for both phases, wrong roles, duplicate or expired claims',()=>{
  const signed=candidate('PRECUTOVER',4);
  const switched=candidate('POSTRELEASE_ROLLBACK',4);
  const tampered=candidate('PRECUTOVER',4);tampered.payload.intentDigest=sha('new intent');
  for(const c of [switched,tampered,candidate('PRECUTOVER',4,{signerRole:'recovery-owner'}),
   candidate('PRECUTOVER',4,{expiresAt:'2026-10-10T13:00:00.000Z'})])
   expect(inspectH12DecisionCandidates([c],decisionOpts).valid).toBe(false);
  expect(inspectH12DecisionCandidates([signed,signed],decisionOpts).valid).toBe(false);
  expect(inspectH12DecisionCandidates([signed],{...decisionOpts,postreleasePin:pin(4)}).valid).toBe(false);
  expect(inspectH12DecisionCandidates([signed],{...decisionOpts,precutoverPin:pin(0)}).valid).toBe(false);
  expect(inspectH12DecisionCandidates([{...signed,payload:{...signed.payload,ownerEmail:'secret@example.test'}}],decisionOpts).valid).toBe(false);
 });
});
