import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {spkiSha256} from '../../src/lib/prism/h8-operator-attestation.mjs';
import {
 H13_PARENT,H13_TESTED_MERGE,H13_CHECKS,H13_ARTIFACTS,inspectH13Preparation,
 canonicalH13Review,h13ReviewDigest,adjudicateH13ExternalReviews,
 auditH13SignerCustody,inspectH13PhysicalWitnessIntake,reconcileH13OwnerRecovery,
 canonicalH13OwnerDecision,inspectH13SeparatedOwnerCustody,prepareH13NoGo
} from '../../src/lib/prism/h13-external-acceptance-review.mjs';
import {H12_OBSERVATIONS} from '../../src/lib/prism/h12-multiparty-reconciliation.mjs';
const packet=JSON.parse(readFileSync(new URL('../../docs/evidence/HUB_V1_1_H13_EXTERNAL_ACCEPTANCE.json',import.meta.url),'utf8'));
const change=f=>{const p=structuredClone(packet);f(p);return p;};
const hash=x=>createHash('sha256').update(x).digest('hex');
const keys=Array.from({length:4},()=>generateKeyPairSync('ed25519')); // Synthetic process-local only
const pem=i=>keys[i].publicKey.export({type:'spki',format:'pem'}).toString();
const pin=i=>spkiSha256(pem(i));
const now=Date.parse('2026-10-10T18:00:00.000Z');
const review=(i,overrides={})=>({
 schemaVersion:1,subjectHead:H13_PARENT,domain:'original-source-objects',
 sourceObjectKeyDigest:hash('original key'),sourceDigest:hash('original source bytes'),
 proofDigest:hash('source proof'),rightsDigest:null,previousStableDigest:null,
 witnessReceiptDigest:hash('independent witness receipt'),
 reviewerId:'source-reviewer-'+(i+1),
 observedAt:'2026-10-10T16:00:00.000Z',expiresAt:'2026-10-11T16:00:00.000Z',
 nonce:'external_review_nonce_abcdefghijk_'+(i+1),finding:'REVIEW_ONLY',...overrides
});
const envelope=(i,overrides={})=>{
 const p=review(i,overrides);
 return {payload:p,signature:sign(null,Buffer.from(canonicalH13Review(p)),keys[i].privateKey).toString('base64url')};
};
const registry=(role='source-reviewer')=>[0,1].map(i=>({
 reviewerId:'source-reviewer-'+(i+1),role,spkiPem:pem(i),pinSha256:pin(i),
 validFrom:'2026-10-09T00:00:00.000Z',validUntil:'2026-10-12T00:00:00.000Z',
 revokedAt:null,compromisedAt:null
}));
const reviewArgs={registry:registry(),nowMs:now};
describe('H13 exact H12 source custody and hard NO_GO',()=>{
 it('pins H12 head, merge, 8 workflows, independent ZIP SHA/CRC and open decisions',()=>{
  const audit=inspectH13Preparation(packet);
  expect(audit).toMatchObject({valid:true,sourceRuns:8,archives:2,
   releaseDecision:'NO_GO',postreleaseRollback:'NOT_REQUESTED',deployAllowed:false});
  expect(packet.qualifiedH12.head).toBe(H13_PARENT);
  expect(packet.qualifiedH12.testedMerge).toBe(H13_TESTED_MERGE);
  expect(packet.qualifiedH12.checks.map(x=>x.runId)).toEqual(H13_CHECKS.map(x=>x[1]));
  expect(packet.qualifiedH12.artifacts.map(x=>x.sha256)).toEqual(H13_ARTIFACTS.map(x=>x[3]));
  expect(prepareH13NoGo(packet)).toMatchObject({externalTrustRoot:'UNCONFIGURED',
   independentlyAuthenticatedOwners:0,realExternalReviews:0,originalRightsAccepted:false,
   releaseDecision:'NO_GO',postreleaseRollback:'NOT_REQUESTED',rollbackExecuted:false});
 });
 it('rejects tampered CI, artifacts, invented source/human evidence and real release approvals',()=>{
  const bad=[
   change(p=>p.qualifiedH12.head='a'.repeat(40)),
   change(p=>p.qualifiedH12.testedMerge='b'.repeat(40)),
   change(p=>p.qualifiedH12.checks[0].conclusion='failure'),
   change(p=>p.qualifiedH12.artifacts[0].sha256='c'.repeat(64)),
   change(p=>p.qualifiedH12.artifacts[1].entryCount=2),
   change(p=>p.externalTrustRoot='INSTALLED'),
   change(p=>p.signerEpochs.push({fake:true})),
   change(p=>p.witnessReceipts.push({fake:true})),
   change(p=>p.restorationPackets.push({fake:true})),
   change(p=>p.provenance[1].status='APPROVED'),
   change(p=>p.humanGates[1].status='APPROVED'),
   change(p=>p.humanGates[5].reviewer='fabricated'),
   change(p=>p.decisions.precutover='GO'),
   change(p=>p.decisions.postrelease='ROLLBACK'),
   change(p=>p.decisions.rollbackExecuted=true),
  ];
  for(const p of bad){expect(inspectH13Preparation(p).valid).toBe(false);
   expect(()=>prepareH13NoGo(p)).toThrow();}
 });
});
describe('H13 independently governed external acceptance review',()=>{
 it('synthetic two-reviewer signatures corroborate a digest but never authenticate genuine acceptance',()=>{
  const v=adjudicateH13ExternalReviews([envelope(0),envelope(1)],reviewArgs);
  expect(v).toMatchObject({valid:true,genuineHumanReviewerAuthenticated:false,
   legalRightsApproved:false,realDevicesApproved:false,releaseDecision:'NO_GO'});
  expect(v.syntheticCorroboratedScopeDigests).toHaveLength(1);
  expect(JSON.stringify(v)).not.toContain('BEGIN PUBLIC KEY');
  expect(JSON.stringify(v)).not.toContain(review(0).nonce);
 });
 it('rejects forged reviewers, pin substitution, shared key aliases and fake approval',()=>{
  const forged=envelope(0);forged.payload.sourceDigest=hash('tampered');
  const leaked=envelope(0);leaked.payload.ownerEmail='private@example.test';
  for(const v of [forged,leaked,envelope(0,{finding:'APPROVED'}),envelope(0,{domain:'unknown'})])
   expect(adjudicateH13ExternalReviews([v,envelope(1)],reviewArgs).valid).toBe(false);
  const unpinned=registry();unpinned[0].pinSha256=hash('fake pin');
  expect(adjudicateH13ExternalReviews([envelope(0),envelope(1)],{...reviewArgs,registry:unpinned}).valid).toBe(false);
  const aliases=registry();aliases[1].spkiPem=pem(0);aliases[1].pinSha256=pin(0);
  expect(adjudicateH13ExternalReviews([envelope(0),envelope(1)],{...reviewArgs,registry:aliases}).valid).toBe(false);
 });
 it('rejects conflicts in original source, legal rights and prior-stable recovery',()=>{
  expect(adjudicateH13ExternalReviews([envelope(0),envelope(1,{sourceDigest:hash('modified')})],reviewArgs).valid).toBe(false);
  const rights={domain:'content-rights-and-licenses',rightsDigest:hash('license-A')};
  const roleRegistry=registry('rights-reviewer');
  expect(adjudicateH13ExternalReviews([envelope(0,rights),envelope(1,{...rights,rightsDigest:hash('license-B')})],
   {...reviewArgs,registry:roleRegistry}).valid).toBe(false);
  expect(adjudicateH13ExternalReviews([envelope(0,rights),envelope(1,rights)],
   {...reviewArgs,registry:roleRegistry}).valid).toBe(true);
  const cache={domain:'cdn-cache-and-rollback',previousStableDigest:hash('stable-version')};
  expect(adjudicateH13ExternalReviews([envelope(0,cache),envelope(1,{...cache,previousStableDigest:hash('wrong')})],
   {...reviewArgs,registry:registry('release-operator')}).valid).toBe(false);
  expect(adjudicateH13ExternalReviews([envelope(0,cache),envelope(1,cache)],
   {...reviewArgs,registry:registry('release-operator')}).valid).toBe(true);
 });
 it('rejects replayed receipts/nonces, expired/revoked/compromised signer epochs and false roles',()=>{
  const base=[envelope(0),envelope(1)];
  expect(adjudicateH13ExternalReviews(base,{...reviewArgs,priorNonceDigests:[hash(review(0).nonce)]}).valid).toBe(false);
  expect(adjudicateH13ExternalReviews(base,{...reviewArgs,priorReviewDigests:[h13ReviewDigest(base[0])]}).valid).toBe(false);
  expect(adjudicateH13ExternalReviews([envelope(0),envelope(1,{nonce:review(0).nonce})],reviewArgs).valid).toBe(false);
  for(const f of [
   x=>x.validUntil='2026-10-10T15:00:00.000Z',
   x=>x.revokedAt='2026-10-10T15:00:00.000Z',
   x=>x.compromisedAt='2026-10-10T17:00:00.000Z',
   x=>x.role='source-reviewer'
  ]){
   const p=registry();f(p[0]);if(p[0].role==='source-reviewer'&&p[0].validUntil==='2026-10-12T00:00:00.000Z'&&p[0].revokedAt===null&&p[0].compromisedAt===null)continue;
   expect(adjudicateH13ExternalReviews(base,{...reviewArgs,registry:p}).valid).toBe(false);
  }
  expect(adjudicateH13ExternalReviews([envelope(0,{expiresAt:'2026-10-10T17:00:00.000Z'}),envelope(1)],reviewArgs).valid).toBe(false);
  expect(auditH13SignerCustody([])).toMatchObject({valid:false,
   independentTrustEnrolled:false,releaseAllowed:false});
 });
});
describe('H13 physically witnessed evidence contracts and owner-scoped restore',()=>{
 const hardware=(row)=>({kind:row[0],platform:row[1],browser:row[2],assistiveTechnology:row[3],
  subjectHead:H13_PARENT,witnessReceiptDigest:hash('receipt'),proofDigest:hash('proof'),
  reviewerDigest:hash('reviewer'),physicalDeviceKeyDigest:hash('physical-model-key'),
  observedAt:'2026-10-10T16:00:00.000Z',status:'PENDING_INDEPENDENT_PHYSICAL_REVIEW'});
 it('enumerates Android/iOS/TalkBack/VoiceOver evidence contracts but never claims real devices',()=>{
  const result=inspectH13PhysicalWitnessIntake(H12_OBSERVATIONS.map(hardware),{nowMs:now});
  expect(result).toMatchObject({valid:true,realWorldWitnessCount:0,releaseAllowed:false});
  expect(result.outcomes.every(x=>x.verifiedRealHardware===false&&x.verifiedTalkBackVoiceOver===false)).toBe(true);
 });
 it('rejects fake physical acceptance, changed assistive technology and private/duplicate fields',()=>{
  const p=hardware(H12_OBSERVATIONS[4]);
  for(const bad of [{...p,status:'ACCEPTED'},
   {...p,assistiveTechnology:'TalkBack'},
   {...p,deviceSerial:'private'},
   {...p,observedAt:'2026-10-11T16:00:00.000Z'}]){
   expect(inspectH13PhysicalWitnessIntake([bad],{nowMs:now}).valid).toBe(false);
  }
  expect(inspectH13PhysicalWitnessIntake([p,p],{nowMs:now}).valid).toBe(false);
 });
 it('rejects conflicting original, rights, backups or restored bytes between same owner scope',()=>{
  const p={schemaVersion:1,subjectHead:H13_PARENT,
   ownerKeyDigest:hash('owner A'),sourceObjectDigest:hash('object'),
   rightsDigest:hash('rights'),previousStableDigest:hash('stable'),
   encryptedBackupDigest:hash('encrypted backup'),restoredBytesDigest:hash('restored result'),
   witnessReceiptDigest:hash('witness'),observedAt:'2026-10-10T16:00:00.000Z',
   expiry:'2026-10-11T16:00:00.000Z',status:'PENDING_EXTERNAL_RESTORE_WITNESS'};
  expect(reconcileH13OwnerRecovery([p],{nowMs:now})).toMatchObject({valid:true,
   independentlyWitnessedRestores:0,actualRestorationSucceeded:false});
  expect(reconcileH13OwnerRecovery([p,{...p,restoredBytesDigest:hash('other')}],{nowMs:now}).valid).toBe(false);
  expect(reconcileH13OwnerRecovery([{...p,status:'RESTORED'}],{nowMs:now}).valid).toBe(false);
  expect(reconcileH13OwnerRecovery([{...p,userEmail:'private@example.test'}],{nowMs:now}).valid).toBe(false);
 });
});
describe('H13 independent precutover owner vs postrelease recovery owner',()=>{
 function owner(kind,index,changes={}){
  const p={schemaVersion:1,subjectHead:H13_PARENT,kind,
   ownerRole:kind==='PRECUTOVER'?'release-owner':'recovery-owner',
   intentDigest:hash(kind),requestedAt:'2026-10-10T16:00:00.000Z',
   expiresAt:'2026-10-10T20:00:00.000Z',
   nonce:'owner_review_nonce_abcdefghijklmnopqrstuvwxyz_'+index,
   status:'REVIEW_ONLY',...changes};
  return {payload:p,signature:sign(null,Buffer.from(canonicalH13OwnerDecision(p)),keys[index].privateKey).toString('base64url')};
 }
 const opts={releaseSpkiPem:pem(2),rollbackSpkiPem:pem(3),releasePin:pin(2),rollbackPin:pin(3),nowMs:now};
 it('validates two distinct synthetic owner signatures but never authorizes real actions',()=>{
  expect(inspectH13SeparatedOwnerCustody([owner('PRECUTOVER',2),owner('POSTRELEASE_ROLLBACK',3)],opts))
   .toMatchObject({valid:true,syntheticSignedCandidates:2,independentlyAuthenticatedOwners:0,
    releaseDecision:'NO_GO',postreleaseRollback:'NOT_REQUESTED',rollbackExecuted:false});
 });
 it('rejects swapped owner credentials, release GO, unauthorized role or replay',()=>{
  for(const p of [owner('POSTRELEASE_ROLLBACK',2),owner('PRECUTOVER',2,{status:'GO'}),
   owner('PRECUTOVER',2,{ownerRole:'recovery-owner'}),
   owner('PRECUTOVER',2,{expiresAt:'2026-10-10T15:00:00.000Z'})])
   expect(inspectH13SeparatedOwnerCustody([p],opts).valid).toBe(false);
  expect(inspectH13SeparatedOwnerCustody([owner('PRECUTOVER',2),owner('PRECUTOVER',2)],opts).valid).toBe(false);
  expect(inspectH13SeparatedOwnerCustody([owner('PRECUTOVER',2)],{...opts,rollbackPin:pin(2)}).valid).toBe(false);
  expect(inspectH13SeparatedOwnerCustody([owner('PRECUTOVER',2)],{...opts,priorNonceDigests:[hash(owner('PRECUTOVER',2).payload.nonce)]}).valid).toBe(false);
 });
});
