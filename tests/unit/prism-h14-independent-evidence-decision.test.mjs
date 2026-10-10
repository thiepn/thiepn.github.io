import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {spkiSha256} from '../../src/lib/prism/h8-operator-attestation.mjs';
import {H12_OBSERVATIONS} from '../../src/lib/prism/h12-multiparty-reconciliation.mjs';
import {H14_PARENT,H14_MERGE,H14_CHECKS,H14_ARTIFACTS,inspectH14Default,
 canonicalH14Custody,reviewH14SignerTransitions,canonicalH14Source,qualifyH14SourceReview,
 inspectH14PhysicalEvidence,canonicalH14Owner,verifyH14OwnerDecisions,prepareH14NoGo
} from '../../src/lib/prism/h14-independent-evidence-decision.mjs';
const packet=JSON.parse(readFileSync(new URL('../../docs/evidence/HUB_V1_1_H14_EVIDENCE_DECISION.json',import.meta.url),'utf8'));
const mutate=fn=>{const p=structuredClone(packet);fn(p);return p;};
const sha=s=>createHash('sha256').update(s).digest('hex');
const keys=Array.from({length:6},()=>generateKeyPairSync('ed25519')); // ephemeral, synthetic ONLY
const pem=i=>keys[i].publicKey.export({format:'pem',type:'spki'}).toString();
const pin=i=>spkiSha256(pem(i));
const now=Date.parse('2026-10-10T18:00:00.000Z');
const source=(i,patch={})=>({
 schemaVersion:1,subjectHead:H14_PARENT,ownerScopeDigest:sha('owner-scope'),
 sourceObjectKeyDigest:sha('object-key'),originalObjectDigest:sha('original-object'),
 licenseDigest:sha('rights-license'),cdnStableDigest:sha('cdn'),pwaStableDigest:sha('pwa'),
 offlineStableDigest:sha('offline'),priorStableDigest:sha('prior-stable'),
 backupCiphertextDigest:sha('encrypted-backup'),restoredPlaintextDigest:sha('original-restored'),
 objectVersionDigest:sha('original-version'),witnessReceiptDigest:sha('externally-source-stable'),
 reviewerId:'synthetic-reviewer-'+(i+1),observedAt:'2026-10-10T16:00:00.000Z',
 nonce:'source_review_nonce_abcdefghijklmnop_'+i,status:'REVIEW_ONLY',...patch
});
const sealSource=(i,patch={})=>{const p=source(i,patch);return {payload:p,signature:sign(null,Buffer.from(canonicalH14Source(p)),keys[i].privateKey).toString('base64url')}};
const reviewers=[0,1].map(i=>({id:'synthetic-reviewer-'+(i+1),spkiPem:pem(i),pin:pin(i),domain:'source-reviewer'}));
const srcArgs={reviewerKeys:reviewers,nowMs:now};
const transition=(patch={})=>{const p={schemaVersion:1,subjectHead:H14_PARENT,
 identity:'external-signer-alpha',epoch:1,event:'ROTATE',priorSignerPin:pin(2),
 nextSignerPin:pin(4),effectiveAt:'2026-10-10T16:00:00.000Z',
 expiresAt:'2026-10-11T16:00:00.000Z',nonce:'signer_transition_nonce_abcdefghijkl',
 reasonDigest:sha('rotation-context'),...patch};
 const b=Buffer.from(canonicalH14Custody(p));
 return {payload:p,oldSignerSignature:sign(null,b,keys[2].privateKey).toString('base64url'),
 independentWitnessSignature:sign(null,b,keys[3].privateKey).toString('base64url')};};
const custody={previousSignerSpki:pem(2),previousSignerPin:pin(2),witnessSpki:pem(3),witnessPin:pin(3),nowMs:now};
const hw=(d)=>({kind:d[0],platform:d[1],browser:d[2],assistiveTechnology:d[3],
 subjectHead:H14_PARENT,deviceSessionDigest:sha('independent-device-session'),
 originalCaptureDigest:sha('pending-capture'),witnessReceiptDigest:sha('pending-witness'),
 operatorPin:pin(0),observedAt:'2026-10-10T16:00:00.000Z',status:'PENDING_EXTERNAL_PHYSICAL_WITNESS'});
const owner=(kind,i,patch={})=>{const p={schemaVersion:1,subjectHead:H14_PARENT,
 kind,ownerRole:kind==='PRECUTOVER'?'release-owner':'recovery-owner',
 intentDigest:sha('intent-'+kind),proofOfRightsDigest:sha('rights-reference'),
 proofOfPriorStableDigest:sha('prior-stable-reference'),observedAt:'2026-10-10T16:00:00.000Z',
 expiresAt:'2026-10-10T20:00:00.000Z',
 nonce:'owner_review_nonce_abcdefghijklmnopqrstuvwxyz_'+i,decision:'REVIEW_ONLY',...patch};
 return {payload:p,signature:sign(null,Buffer.from(canonicalH14Owner(p)),keys[i].privateKey).toString('base64url')};};
const owners={precutoverSpki:pem(4),postreleaseSpki:pem(5),precutoverPin:pin(4),postreleasePin:pin(5),nowMs:now};
describe('H14 locked H13 provenance, seven OPEN owner gates and default denial',()=>{
 it('pins H13 SHA/merge, eight workflows, exact two independent ZIP checksums and open decisions',()=>{
  expect(inspectH14Default(packet)).toMatchObject({valid:true,qualifiedH13Runs:8,qualifiedH13Archives:2,
   decision:'NO_GO',postreleaseRollback:'NOT_REQUESTED',releaseAllowed:false});
  expect(packet.qualifiedH13.head).toBe(H14_PARENT);
  expect(packet.qualifiedH13.testedMerge).toBe(H14_MERGE);
  expect(packet.qualifiedH13.checks.map(x=>x.runId)).toEqual(H14_CHECKS.map(x=>x[1]));
  expect(packet.qualifiedH13.artifacts.map(x=>x.sha256)).toEqual(H14_ARTIFACTS.map(x=>x[3]));
  expect(prepareH14NoGo(packet)).toMatchObject({realExternalReviewers:0,realEvidencePackets:0,
   previousStableOriginalRestored:false,twoOwnerOAuthApproved:false,deployAllowed:false,rollbackExecuted:false});
 });
 it('rejects fabricated H13 CI, artifacts, signer evidence, source rights and human approvals',()=>{
  for(const v of [
   mutate(p=>p.qualifiedH13.head='a'.repeat(40)),
   mutate(p=>p.qualifiedH13.testedMerge='b'.repeat(40)),
   mutate(p=>p.qualifiedH13.checks[0].runId=1),
   mutate(p=>p.qualifiedH13.artifacts[0].sha256='c'.repeat(64)),
   mutate(p=>p.qualifiedH13.artifacts[1].crcVerified=false),
   mutate(p=>p.externalTrustRoots.push({fake:true})),
   mutate(p=>p.custodyTransitions.push({fake:true})),
   mutate(p=>p.ownerRecoveryEvidence.push({fake:true})),
   mutate(p=>p.physicalEvidence.push({fake:true})),
   mutate(p=>p.humanGates[0].status='APPROVED'),
   mutate(p=>p.provenance[1].status='VERIFIED'),
   mutate(p=>p.ownerDecisions.precutover='GO'),
   mutate(p=>p.ownerDecisions.postrelease='ROLLBACK'),
   mutate(p=>p.ownerDecisions.rollbackExecuted=true)]){
    expect(inspectH14Default(v).valid).toBe(false);expect(()=>prepareH14NoGo(v)).toThrow();
  }
 });
});
describe('H14 independent witnessed signer custody',()=>{
 it('accepts cryptographic synthetic dual signed rotation without installing trust authority',()=>{
  const r=reviewH14SignerTransitions([transition()],custody);
  expect(r).toMatchObject({valid:true,originalSignerIndependentlyAuthenticated:false,
   trustRootInstalled:false,finalPin:pin(4),decision:'NO_GO'});
  expect(JSON.stringify(r)).not.toContain('BEGIN PUBLIC KEY');
 });
 it('rejects forged signer/witness, key self-rotation, pin replacement, replay and compromised/ revoked root',()=>{
  const forged=transition();forged.payload.reasonDigest=sha('tamper');
  const untrusted=transition({nextSignerPin:pin(3)});
  for(const [events,args] of [
   [[forged],custody],[[untrusted],custody],
   [[transition()],{...custody,previousSignerPin:pin(0)}],
   [[transition()],{...custody,compromisedPins:[pin(2)]}],
   [[transition()],{...custody,revokedPins:[pin(2)]}],
   [[transition()],{...custody,priorNonceDigests:[sha(transition().payload.nonce)]}],
   [[transition({effectiveAt:'2026-10-11T16:00:00.000Z'})],custody],
   [[transition({epoch:0})],custody],
  ])expect(reviewH14SignerTransitions(events,args).valid).toBe(false);
 });
});
describe('H14 immutable original/rights/CDN/PWA/offline/prior-stable evidence exchange',()=>{
 it('checks independently pinned synthetic reviewers yet never promotes source or rights',()=>{
  expect(qualifyH14SourceReview([sealSource(0),sealSource(1)],srcArgs))
   .toMatchObject({valid:true,originalObjectVerified:false,legalRightsApproved:false,
    actualEncryptedRestoreProven:false,decision:'NO_GO'});
  expect(qualifyH14SourceReview([sealSource(0),sealSource(1)],srcArgs).syntheticCorroboratedScopes).toHaveLength(1);
 });
 it('rejects conflicting source/rights/CDN/PWA/offline/backup/recovery byte continuity',()=>{
  for(const field of ['originalObjectDigest','licenseDigest','cdnStableDigest','pwaStableDigest',
   'offlineStableDigest','priorStableDigest','backupCiphertextDigest','restoredPlaintextDigest','objectVersionDigest']){
   const r=qualifyH14SourceReview([sealSource(0),sealSource(1,{[field]:sha(field+'-conflict')})],srcArgs);
   expect(r.valid,field).toBe(false);expect(r.errors.join(' ')).toMatch(/continuity conflict/);
  }
 });
 it('rejects nonce reuse, invented reviewer, impersonation, role alias and counterfeit status',()=>{
  const tampered=sealSource(0);tampered.payload.licenseDigest=sha('forged-rights');
  const synthetic=sealSource(0,{status:'APPROVED'});
  const changedPin=structuredClone(reviewers);changedPin[1].pin=sha('wrong');
  const alias=[reviewers[0],{...reviewers[1],spkiPem:pem(0),pin:pin(0)}];
  for(const [set,options] of [
   [[tampered,sealSource(1)],srcArgs],
   [[synthetic,sealSource(1)],srcArgs],
   [[sealSource(0),sealSource(1,{nonce:source(0).nonce})],srcArgs],
   [[sealSource(0),sealSource(1)],{...srcArgs,reviewerKeys:changedPin}],
   [[sealSource(0),sealSource(1)],{...srcArgs,reviewerKeys:alias}],
   [[sealSource(0),sealSource(1)],{...srcArgs,baselineNonceDigests:[sha(source(0).nonce)]}],
  ])expect(qualifyH14SourceReview(set,options).valid).toBe(false);
 });
});
describe('H14 real-device and actual recovery remain outside source-only authority',()=>{
 it('prepares 6 physical browser, TalkBack, VoiceOver and keyboard contracts without claiming a real session',()=>{
  const v=inspectH14PhysicalEvidence(H12_OBSERVATIONS.map(hw),{nowMs:now});
  expect(v).toMatchObject({valid:true,missingCoverage:[],
   physicalAndroidIosApproved:false,talkbackVoiceOverApproved:false,decision:'NO_GO'});
 });
 it('rejects false physical approval, duplicated device evidence, switched accessibility and private data',()=>{
  const p=hw(H12_OBSERVATIONS[4]);
  for(const bad of [{...p,status:'APPROVED'}, {...p,assistiveTechnology:'TalkBack'},
   {...p,deviceSerial:'secret'}, {...p,observedAt:'2026-10-11T16:00:00.000Z'}])
   expect(inspectH14PhysicalEvidence([bad],{nowMs:now}).valid).toBe(false);
  expect(inspectH14PhysicalEvidence([p,p],{nowMs:now}).valid).toBe(false);
 });
});
describe('H14 separate owner precutover and postrelease decision custody',()=>{
 it('verifies distinct synthetic signatures and prohibits all actual owner execution',()=>{
  expect(verifyH14OwnerDecisions([owner('PRECUTOVER',4),owner('POSTRELEASE_ROLLBACK',5)],owners))
   .toMatchObject({valid:true,syntheticOwnerCandidates:2,realOwnerApprovals:0,
    decision:'NO_GO',postreleaseRollback:'NOT_REQUESTED',releaseAllowed:false,rollbackAllowed:false});
 });
 it('rejects cross-signed recovery, key substitution, replay, forged approval and expired owner intent',()=>{
  const good=owner('PRECUTOVER',4);
  const tampered=owner('PRECUTOVER',4);tampered.payload.proofOfRightsDigest=sha('tampered');
  for(const e of [owner('POSTRELEASE_ROLLBACK',4),
   owner('PRECUTOVER',4,{ownerRole:'recovery-owner'}),
   owner('PRECUTOVER',4,{decision:'GO'}),
   owner('PRECUTOVER',4,{expiresAt:'2026-10-10T15:00:00.000Z'}),tampered])
    expect(verifyH14OwnerDecisions([e],owners).valid).toBe(false);
  expect(verifyH14OwnerDecisions([good,good],owners).valid).toBe(false);
  expect(verifyH14OwnerDecisions([good],{...owners,postreleasePin:pin(4)}).valid).toBe(false);
  expect(verifyH14OwnerDecisions([good],{...owners,priorNonceDigests:[sha(good.payload.nonce)]}).valid).toBe(false);
 });
});
