import {createHash,createPublicKey,verify} from 'node:crypto';
import {spkiSha256} from './h8-operator-attestation.mjs';
import {H10_DOMAINS} from './h10-release-reconciliation.mjs';
import {H11_GATES} from './h11-external-witness-intake.mjs';
import {H12_OBSERVATIONS} from './h12-multiparty-reconciliation.mjs';
import {adjudicateH13ExternalReviews} from './h13-external-acceptance-review.mjs';

// H14 verifies digest-only packets in memory; it NEVER ingests protected originals,
// registers external keys, confirms legal title, or authorizes deployments/rollback.
export const H14_PARENT='ce87d145615e43259445e9f01f67c619336b7691';
export const H14_MERGE='20c3da94c5654e3794227ff5a576f45e040608cf';
export const H14_CHECKS=Object.freeze([
 ['Quality',38068293390],['Hub Account integration',38068293454],
 ['Hub device Library browsers',38068293428],['Hub Notes integration',38068293418],
 ['Hub Notes capture browsers',38068293453],['Hub Notes Inbox browsers',38068293492],
 ['Hub managed Notes browsers',38068293462],['Hub managed TMS60 browsers',38068293384],
]);
export const H14_ARTIFACTS=Object.freeze([
 ['studio-certification',11675833360,38068293390,'65d5e1b807b9e6592c0eb5b041a7862a6fd81328e51d10fbdc7c5507bc25bbfb',53],
 ['hub-notes-contract-evidence',11675827099,38068293418,'8a6b35762b0ceaf63f05fe4949b0f7b48eab20908d6f23e7e17105f9127ceac5',1],
]);
const HEX=/^[0-9a-f]{64}$/,IDENT=/^[a-z][a-z0-9._-]{3,63}$/,NONCE=/^[A-Za-z0-9_-]{24,128}$/,SIG=/^[A-Za-z0-9_-]{86}$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const utc=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
const sha=x=>createHash('sha256').update(x).digest('hex');
const validPin=(spki,pin)=>{try{const k=createPublicKey(spki);return k.asymmetricKeyType==='ed25519'&&spkiSha256(spki)===pin;}catch{return false;}};
const checkSignature=(payload,sig,spki)=>{try{return SIG.test(sig)&&verify(null,Buffer.from(payload),createPublicKey(spki),Buffer.from(sig,'base64url'));}catch{return false;}};
const DENIAL=()=>({decision:'NO_GO',postreleaseRollback:'NOT_REQUESTED',releaseAllowed:false,rollbackAllowed:false,mergeAllowed:false,deployAllowed:false,migrationAllowed:false,purgeAllowed:false,rollbackExecuted:false});
const domains=Object.keys(H10_DOMAINS),gates=[...H11_GATES];
export function inspectH14Default(packet){
 const errors=[];
 if(!plain(packet)||packet.schemaVersion!==1||packet.repository!=='thiepn/thiepn.github.io'||packet.phase!=='H14')
   return {valid:false,errors:['H14 schema/repository/phase mismatch'],...DENIAL()};
 const p=packet.qualifiedH13;
 if(!exact(p,['pr','head','base','testedMerge','checks','artifacts'])||
   p.pr!==108||p.head!==H14_PARENT||p.base!=='92948683834e1f03d6f8ff2bf390bd62603305b1'||
   p.testedMerge!==H14_MERGE)errors.push('Unqualified H13 parent or merge tree');
 if(!Array.isArray(p?.checks)||p.checks.length!==H14_CHECKS.length||
  !p.checks.every((x,i)=>exact(x,['name','runId','conclusion','url'])&&x.name===H14_CHECKS[i][0]&&
    x.runId===H14_CHECKS[i][1]&&x.conclusion==='success'&&
    x.url==='https://github.com/thiepn/thiepn.github.io/actions/runs/'+x.runId))
   errors.push('H13 workflow run exact-head provenance mismatch');
 if(!Array.isArray(p?.artifacts)||p.artifacts.length!==H14_ARTIFACTS.length||
  !p.artifacts.every((x,i)=>exact(x,['name','id','runId','sha256','entryCount','crcVerified'])&&
   x.name===H14_ARTIFACTS[i][0]&&x.id===H14_ARTIFACTS[i][1]&&x.runId===H14_ARTIFACTS[i][2]&&
   x.sha256===H14_ARTIFACTS[i][3]&&x.entryCount===H14_ARTIFACTS[i][4]&&x.crcVerified===true))
   errors.push('H13 original ZIP bytes/hash/CRC not qualified');
 for(const k of ['externalTrustRoots','custodyTransitions','acceptedWitnesses','sourceCustodyReceipts',
  'ownerRecoveryEvidence','physicalEvidence','releaseOwnerAttestations','rollbackOwnerAttestations','replayLedger']){
   if(!Array.isArray(packet[k])||packet[k].length!==0)errors.push('Missing or fabricated real external record: '+k);
 }
 if(!Array.isArray(packet.provenance)||packet.provenance.length!==domains.length||
   !packet.provenance.every((x,i)=>exact(x,['domain','status','proofDigest'])&&x.domain===domains[i]&&
     x.status==='UNVERIFIED'&&x.proofDigest===null))
   errors.push('Seven independent original/rights/restore/device domains must remain UNVERIFIED');
 if(!Array.isArray(packet.humanGates)||packet.humanGates.length!==gates.length||
   !packet.humanGates.every((x,i)=>exact(x,['id','status','proofDigest','reviewer'])&&x.id===gates[i]&&
     x.status==='OPEN'&&x.proofDigest===null&&x.reviewer===null))
   errors.push('Seven human acceptance/owner gates must remain OPEN');
 if(!exact(packet.ownerDecisions,['precutover','postrelease','publish','deploy','merge','migrate','purge','rollbackExecuted'])||
   packet.ownerDecisions.precutover!=='NO_GO'||packet.ownerDecisions.postrelease!=='NOT_REQUESTED'||
   [packet.ownerDecisions.publish,packet.ownerDecisions.deploy,packet.ownerDecisions.merge,
    packet.ownerDecisions.migrate,packet.ownerDecisions.purge,packet.ownerDecisions.rollbackExecuted].some(x=>x!==false))
   errors.push('Release/rollback execution remains default-denied');
 return {valid:errors.length===0,errors,qualifiedH13Runs:H14_CHECKS.length,qualifiedH13Archives:H14_ARTIFACTS.length,
   unverifiedDomains:domains,openHumanGates:gates,...DENIAL()};
}
// Custody events must be backed by two *independently sourced* pins. The
// registry and signatures can be exercised with ephemeral synthetic keys,
// but never become externally installed trust roots.
const CUSTODY=['schemaVersion','subjectHead','identity','epoch','event','priorSignerPin',
 'nextSignerPin','effectiveAt','expiresAt','nonce','reasonDigest'];
export const canonicalH14Custody=p=>JSON.stringify(Object.fromEntries(CUSTODY.map(k=>[k,p[k]])));
export function reviewH14SignerTransitions(records,{
 previousSignerSpki,previousSignerPin,witnessSpki,witnessPin,nowMs=Date.now(),
 priorNonceDigests=[],compromisedPins=[],revokedPins=[],nextSignerKeys=[]
}={}){
 const errors=[],items=[],seen=new Set(priorNonceDigests);
 const nextKeys=new Map();
 if(!Array.isArray(nextSignerKeys)||nextSignerKeys.length>32)errors.push('Invalid independent next-key custody registry');
 if(Array.isArray(nextSignerKeys))for(const x of nextSignerKeys){
  if(!exact(x,['pin','spkiPem'])||!HEX.test(x.pin)||!validPin(x.spkiPem,x.pin)||
     nextKeys.has(x.pin)||x.pin===witnessPin||x.pin===previousSignerPin)
    errors.push('Unknown, duplicated or aliased next-epoch signer key');
  else nextKeys.set(x.pin,x.spkiPem);
 }
 if(!Array.isArray(records)||records.length<1||records.length>24||
  !Array.isArray(priorNonceDigests)||priorNonceDigests.some(x=>!HEX.test(x))||
  !Array.isArray(compromisedPins)||compromisedPins.some(x=>!HEX.test(x))||
  !Array.isArray(revokedPins)||revokedPins.some(x=>!HEX.test(x))||
  !Number.isSafeInteger(nowMs)||!HEX.test(previousSignerPin)||!HEX.test(witnessPin)||
  previousSignerPin===witnessPin||!validPin(previousSignerSpki,previousSignerPin)||
  !validPin(witnessSpki,witnessPin)||compromisedPins.includes(witnessPin)||revokedPins.includes(witnessPin))
   errors.push('Independent original signer/witness custody not established');
 let current=previousSignerPin,currentSpki=previousSignerSpki,priorEpoch=0,priorTime=-Infinity;
 const originalIdentity=records?.[0]?.payload?.identity;
 if(Array.isArray(records))for(const [i,e] of records.entries()){
  const p=e?.payload,reasons=[];
  if(!exact(e,['payload','oldSignerSignature','independentWitnessSignature'])||
   !exact(p,CUSTODY)||p.schemaVersion!==1||p.subjectHead!==H14_PARENT||
   !IDENT.test(p.identity)||!Number.isSafeInteger(p.epoch)||p.epoch<1||
   !['ROTATE','REVOKE','COMPROMISE'].includes(p.event)||!HEX.test(p.priorSignerPin)||
   !HEX.test(p.nextSignerPin)||!HEX.test(p.reasonDigest)||!utc(p.effectiveAt)||
   !utc(p.expiresAt)||!NONCE.test(p.nonce)||
   !SIG.test(e.oldSignerSignature)||!SIG.test(e.independentWitnessSignature)){
    errors.push('Invalid externally witnessed custody event '+i);items.push({index:i,verified:false});continue;
  }
  const t=Date.parse(p.effectiveAt),expiry=Date.parse(p.expiresAt),nonce=sha(p.nonce);
  if(p.identity!==originalIdentity)reasons.push('Custody identity switched between epochs');
  if(p.priorSignerPin!==current||p.epoch<=priorEpoch||t<=priorTime||t>nowMs||
   expiry<=nowMs||expiry<=t||expiry-t>7*86400000)reasons.push('Broken monotonic key epoch/expiry/custody link');
  if(seen.has(nonce))reasons.push('Custody nonce replay');
  seen.add(nonce);
  if(compromisedPins.includes(current)||revokedPins.includes(current))reasons.push('Previously compromised/revoked signer cannot delegate');
  if(p.event==='ROTATE'&&(p.nextSignerPin===current||p.nextSignerPin===witnessPin||
      !nextKeys.has(p.nextSignerPin)))
   reasons.push('Next signer not independently pinned or lacks registered public key');
  if(p.event!=='ROTATE'&&p.nextSignerPin!==current)
   reasons.push('Revocation/compromise may not silently rotate key');
  if(!checkSignature(canonicalH14Custody(p),e.oldSignerSignature,currentSpki)||
   !checkSignature(canonicalH14Custody(p),e.independentWitnessSignature,witnessSpki))
   reasons.push('Independent signer/witness signatures missing');
  if(reasons.length===0){
   priorEpoch=p.epoch;priorTime=t;current=p.nextSignerPin;
   if(p.event==='ROTATE')currentSpki=nextKeys.get(current);
   else errors.push('Custody '+i+': revocation/compromise terminates signer authority');
  }
  if(reasons.length)errors.push('Custody '+i+': '+reasons.join('; '));
  items.push({index:i,cryptographicCheck:reasons.length===0,event:p.event});
 }
 return {valid:errors.length===0,errors,items,finalPin:HEX.test(current)?current:null,
   originalSignerIndependentlyAuthenticated:false,trustRootInstalled:false,...DENIAL()};
}
const SOURCE=['schemaVersion','subjectHead','ownerScopeDigest','sourceObjectKeyDigest','originalObjectDigest',
 'licenseDigest','cdnStableDigest','pwaStableDigest','offlineStableDigest','priorStableDigest',
 'backupCiphertextDigest','restoredPlaintextDigest','objectVersionDigest',
 'witnessReceiptDigest','reviewerId','observedAt','nonce','status'];
export const canonicalH14Source=p=>JSON.stringify(Object.fromEntries(SOURCE.map(k=>[k,p[k]])));
export function qualifyH14SourceReview(packets,{
 reviewerKeys=[],baselineNonceDigests=[],nowMs=Date.now()
}={}){
 const errors=[],claims=[],seen=new Set(baselineNonceDigests),ledger=new Map(),reviewerPins=new Set();
 const independentlyRequiredRoles=['source-reviewer','rights-reviewer','release-operator','recovery-operator'];
 if(!Array.isArray(packets)||packets.length<2||packets.length>32||
   !Array.isArray(reviewerKeys)||reviewerKeys.length<2||reviewerKeys.length>32||
   !Array.isArray(baselineNonceDigests)||baselineNonceDigests.some(x=>!HEX.test(x))||
   !Number.isSafeInteger(nowMs))errors.push('Independent bounded witness and replay baseline required');
 const reviewers=new Map();
 if(Array.isArray(reviewerKeys))for(const [i,r] of reviewerKeys.entries()){
   if(!exact(r,['id','spkiPem','pin','domain'])||!IDENT.test(r.id??'')||
    !HEX.test(r.pin)||!validPin(r.spkiPem,r.pin)||
    !['source-reviewer','rights-reviewer','release-operator','recovery-operator'].includes(r.domain)||
    reviewers.has(r.id)||reviewerPins.has(r.pin))errors.push('Untrusted or aliased independent reviewer '+i);
   else{reviewers.set(r.id,r);reviewerPins.add(r.pin);}
 }
 if(Array.isArray(packets))for(const [i,e] of packets.entries()){
  const p=e?.payload,reasons=[];
  if(!exact(e,['payload','signature'])||!exact(p,SOURCE)||
   p.schemaVersion!==1||p.subjectHead!==H14_PARENT||
   ![p.ownerScopeDigest,p.sourceObjectKeyDigest,p.originalObjectDigest,p.licenseDigest,
    p.cdnStableDigest,p.pwaStableDigest,p.offlineStableDigest,p.priorStableDigest,
    p.backupCiphertextDigest,p.restoredPlaintextDigest,p.objectVersionDigest,
    p.witnessReceiptDigest].every(x=>HEX.test(x))||!IDENT.test(p.reviewerId??'')||
   !utc(p.observedAt)||!NONCE.test(p.nonce)||p.status!=='REVIEW_ONLY'||
   !SIG.test(e.signature)){errors.push('Source '+i+': malformed or self-approved evidence');continue;}
  const nonce=sha(p.nonce),reg=reviewers.get(p.reviewerId),timestamp=Date.parse(p.observedAt);
  if(seen.has(nonce))reasons.push('Cross-source replay detected');seen.add(nonce);
  if(timestamp>nowMs||timestamp<nowMs-30*86400000)reasons.push('Stale or future original source claim');
  if(!reg||!checkSignature(canonicalH14Source(p),e.signature,reg.spkiPem))
   reasons.push('Untrusted external source reviewer or signature');
  const objectKey=p.ownerScopeDigest+':'+p.sourceObjectKeyDigest;
  const values=[p.originalObjectDigest,p.licenseDigest,p.cdnStableDigest,p.pwaStableDigest,
   p.offlineStableDigest,p.priorStableDigest,p.backupCiphertextDigest,p.restoredPlaintextDigest,
   p.objectVersionDigest];
  const prior=ledger.get(objectKey);
  if(prior&&prior.values.some((x,j)=>x!==values[j]))
   reasons.push('Original/rights/CDN/PWA/offline/prior-stable/backup/restore byte continuity conflict');
  if(prior?.pins.includes(reg?.pin))
   reasons.push('Duplicate or aliased reviewer for one original');
  if(!reasons.length){
   if(!prior)ledger.set(objectKey,{values,pins:[reg.pin],roles:[reg.domain]});
   else {prior.pins.push(reg.pin);prior.roles.push(reg.domain);}
   claims.push({index:i,scopeDigest:sha(objectKey),cryptographicallyChecked:true});
  }else errors.push('Source '+i+': '+reasons.join('; '));
 }
 const corroborated=[];
 for(const [scope,value] of ledger){
  const missing=independentlyRequiredRoles.filter(role=>!value.roles.includes(role));
  if(missing.length)errors.push('Owner-scoped original missing independent source/rights/release/recovery reviewers: '+missing.join(','));
  else corroborated.push(sha(scope));
 }
 return {valid:errors.length===0,errors,claims,syntheticCorroboratedScopes:corroborated,
   originalObjectVerified:false,legalRightsApproved:false,cdnRecoveryProven:false,
   pwaOfflineRestoreProven:false,actualEncryptedRestoreProven:false,...DENIAL()};
}
// Real devices are accepted only by independent human/physical procedures.
// A complete manifest with proof digests is preparation, never actual acceptance.
const HARDWARE=['kind','platform','browser','assistiveTechnology','subjectHead','deviceSessionDigest',
 'originalCaptureDigest','witnessReceiptDigest','operatorPin','observedAt','status'];
export function inspectH14PhysicalEvidence(manifest,{nowMs=Date.now()}={}){
 const errors=[],seen=new Set();
 if(!Array.isArray(manifest)||manifest.length>24||!Number.isSafeInteger(nowMs))
   errors.push('Bounded externally owned device evidence required');
 if(Array.isArray(manifest))for(const [i,p] of manifest.entries()){
  const d=H12_OBSERVATIONS.find(x=>x[0]===p?.kind);
  if(!exact(p,HARDWARE)||!d||p.platform!==d[1]||p.browser!==d[2]||
   p.assistiveTechnology!==d[3]||p.subjectHead!==H14_PARENT||
   ![p.deviceSessionDigest,p.originalCaptureDigest,p.witnessReceiptDigest,p.operatorPin].every(x=>HEX.test(x))||
   !utc(p.observedAt)||Date.parse(p.observedAt)>nowMs||
   p.status!=='PENDING_EXTERNAL_PHYSICAL_WITNESS'||seen.has(p.kind))
   errors.push('Physical/A11y witness '+i+': unqualified or counterfeit');
  if(d)seen.add(d[0]);
 }
 const missing=H12_OBSERVATIONS.filter(d=>!seen.has(d[0])).map(d=>d[0]);
 return {valid:errors.length===0,errors,missingCoverage:missing,
   physicalAndroidIosApproved:false,talkbackVoiceOverApproved:false,...DENIAL()};
}
// Owner authority requires independently pinned and *different* keys for each
// decision phase. A valid detached signature remains a REVIEW_ONLY candidate.
const OWNER=['schemaVersion','subjectHead','kind','ownerRole','intentDigest','proofOfRightsDigest',
 'proofOfPriorStableDigest','observedAt','expiresAt','nonce','decision'];
export const canonicalH14Owner=p=>JSON.stringify(Object.fromEntries(OWNER.map(k=>[k,p[k]])));
export function verifyH14OwnerDecisions(envelopes,{
 precutoverSpki,postreleaseSpki,precutoverPin,postreleasePin,
 priorNonceDigests=[],nowMs=Date.now()
}={}){
 const errors=[],kinds=new Set(),used=new Set(priorNonceDigests);
 if(!Array.isArray(envelopes)||envelopes.length>2||!Array.isArray(priorNonceDigests)||
  priorNonceDigests.some(x=>!HEX.test(x))||!Number.isSafeInteger(nowMs)||
  !HEX.test(precutoverPin)||!HEX.test(postreleasePin)||precutoverPin===postreleasePin||
  !validPin(precutoverSpki,precutoverPin)||!validPin(postreleaseSpki,postreleasePin))
   errors.push('Independent release vs postrelease owner custody not configured');
 if(Array.isArray(envelopes))for(const [i,e] of envelopes.entries()){
  const p=e?.payload,k=p?.kind;
  if(!exact(e,['payload','signature'])||!exact(p,OWNER)||p.schemaVersion!==1||
   p.subjectHead!==H14_PARENT||!['PRECUTOVER','POSTRELEASE_ROLLBACK'].includes(k)||
   p.ownerRole!==(k==='PRECUTOVER'?'release-owner':'recovery-owner')||
   ![p.intentDigest,p.proofOfRightsDigest,p.proofOfPriorStableDigest].every(x=>HEX.test(x))||
   !utc(p.observedAt)||!utc(p.expiresAt)||Date.parse(p.observedAt)>nowMs||
   Date.parse(p.expiresAt)<=nowMs||Date.parse(p.expiresAt)-Date.parse(p.observedAt)>86400000||
   !NONCE.test(p.nonce)||p.decision!=='REVIEW_ONLY'||!SIG.test(e.signature)||
   kinds.has(k)||used.has(sha(p.nonce))){
   errors.push('Owner '+i+': replayed, forged, expired, duplicate or role confused');continue;}
  used.add(sha(p.nonce));kinds.add(k);
  if(!checkSignature(canonicalH14Owner(p),e.signature,k==='PRECUTOVER'?precutoverSpki:postreleaseSpki))
    errors.push('Owner '+i+': invalid independent owner signature');
 }
 return {valid:errors.length===0,errors,syntheticOwnerCandidates:kinds.size,
   realOwnerApprovals:0,...DENIAL()};
}
export function checkH14InheritedExternalReviews(packets,options){
 const review=adjudicateH13ExternalReviews(packets,options);
 return {...review,realReviewerAccepted:false,...DENIAL()};
}
export function prepareH14NoGo(packet){
 const q=inspectH14Default(packet);
 if(!q.valid)throw Error('H14 source/rights/recovery custody NO_GO failure: '+q.errors.join('; '));
 return {kind:'H14_INDEPENDENT_EVIDENCE_OWNER_DECISION_NO_GO',
   qualifiedH13Head:H14_PARENT,checkedWorkflows:8,checkedOriginalZipArtifacts:2,
   externalTrustRoot:'UNCONFIGURED',realExternalReviewers:0,realEvidencePackets:0,
   originalSourceRightsAccepted:false,previousStableOriginalRestored:false,
   realAndroidIosAccessibilityVerified:false,twoOwnerOAuthApproved:false,
   humanGatesOpen:q.openHumanGates,sourceDomainsOpen:q.unverifiedDomains,...DENIAL()};
}
