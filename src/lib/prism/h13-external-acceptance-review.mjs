import {createHash,createPublicKey,verify} from 'node:crypto';
import {spkiSha256} from './h8-operator-attestation.mjs';
import {H10_DOMAINS} from './h10-release-reconciliation.mjs';
import {H11_GATES} from './h11-external-witness-intake.mjs';
import {H12_OBSERVATIONS,inspectH12CustodyChronology} from './h12-multiparty-reconciliation.mjs';

// Source-only, nondeploying review. A signed hash cannot prove legal title,
// physical hardware, accessibility, OAuth identity, or a real human's approval.
export const H13_PARENT='92948683834e1f03d6f8ff2bf390bd62603305b1';
export const H13_TESTED_MERGE='9d710f6bb534a537c3910f273996a10962d88246';
export const H13_CHECKS=Object.freeze([
  ['Quality',38066420751],['Hub Account integration',38066420754],
  ['Hub device Library browsers',38066420798],['Hub Notes integration',38066420734],
  ['Hub Notes capture browsers',38066420742],['Hub Notes Inbox browsers',38066420747],
  ['Hub managed Notes browsers',38066420756],['Hub managed TMS60 browsers',38066420738],
]);
export const H13_ARTIFACTS=Object.freeze([
  ['studio-certification',11674184694,38066420751,'ca63a0398429e30ea3c9e2c73138a73a6a964da0d59ed9d3033e0e71b28bc680',52],
  ['hub-notes-contract-evidence',11674958928,38066420734,'eb7a4936d3a0a94426be5c580e527d4e090d98cd12dbebdcd7ad8799da41afb3',1],
]);
const HEX=/^[0-9a-f]{64}$/,IDENT=/^[a-z][a-z0-9._-]{3,63}$/,NONCE=/^[A-Za-z0-9_-]{24,128}$/,SIG=/^[A-Za-z0-9_-]{86}$/;
const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,fields)=>isPlain(x)&&Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k));
const sha=v=>createHash('sha256').update(v).digest('hex');
const utc=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(Date.parse(v)).toISOString()===v;
const deny=()=>({releaseDecision:'NO_GO',postreleaseRollback:'NOT_REQUESTED',releaseAllowed:false,rollbackAllowed:false,deployAllowed:false,mergeAllowed:false,migrationAllowed:false,purgeAllowed:false,rollbackExecuted:false});
const domains=Object.keys(H10_DOMAINS),gates=[...H11_GATES];
export function inspectH13Preparation(p){
 const errors=[];
 if(!isPlain(p)||p.schemaVersion!==1||p.repository!=='thiepn/thiepn.github.io'||p.phase!=='H13')
   return {valid:false,errors:['Invalid phase/repository/schema'],...deny()};
 const h=p.qualifiedH12;
 if(!exact(h,['pr','head','base','testedMerge','checks','artifacts'])||
   h.pr!==107||h.head!==H13_PARENT||h.base!=='8434f4143894c8b693f858375eb31d0770b6d5e1'||
   h.testedMerge!==H13_TESTED_MERGE)errors.push('H12 prerequisite exact-head/merge mismatch');
 if(!Array.isArray(h?.checks)||h.checks.length!==H13_CHECKS.length||
   !h.checks.every((x,i)=>exact(x,['name','runId','conclusion','url'])&&
    x.name===H13_CHECKS[i][0]&&x.runId===H13_CHECKS[i][1]&&x.conclusion==='success'&&
    x.url==='https://github.com/thiepn/thiepn.github.io/actions/runs/'+x.runId))
   errors.push('H12 workflow source binding inconsistent');
 if(!Array.isArray(h?.artifacts)||h.artifacts.length!==H13_ARTIFACTS.length||
   !h.artifacts.every((x,i)=>exact(x,['name','id','runId','sha256','entryCount','crcVerified'])&&
    x.name===H13_ARTIFACTS[i][0]&&x.id===H13_ARTIFACTS[i][1]&&x.runId===H13_ARTIFACTS[i][2]&&
    x.sha256===H13_ARTIFACTS[i][3]&&x.entryCount===H13_ARTIFACTS[i][4]&&x.crcVerified===true))
   errors.push('H12 independently inspected ZIP digests/CRC inconsistent');
 for(const k of ['externalReviewers','witnessReceipts','signerEpochs','revocationLedger','replayLedger','rightsObjects',
   'physicalObservations','restorationPackets','releaseOwnerDecisions','rollbackOwnerDecisions']){
   if(!Array.isArray(p[k])||p[k].length!==0)errors.push('Unapproved real evidence asserted in '+k);
 }
 if(p.externalTrustRoot!=='UNCONFIGURED')errors.push('External trust root cannot be self-provisioned');
 if(!Array.isArray(p.provenance)||p.provenance.length!==domains.length||
   !p.provenance.every((x,i)=>exact(x,['domain','status','proofDigest'])&&
     x.domain===domains[i]&&x.status==='UNVERIFIED'&&x.proofDigest===null))
   errors.push('Unverified source/rights/CDN/PWA/offline/physical/a11y domains must remain open');
 if(!Array.isArray(p.humanGates)||p.humanGates.length!==gates.length||
   !p.humanGates.every((x,i)=>exact(x,['id','status','reviewer','receiptDigest'])&&
     x.id===gates[i]&&x.status==='OPEN'&&x.reviewer===null&&x.receiptDigest===null))
   errors.push('Genuine OAuth, device, a11y, security and owner approvals not supplied');
 if(!exact(p.decisions,['precutover','postrelease','publish','deploy','merge','migrate','purge','rollbackExecuted'])||
   p.decisions.precutover!=='NO_GO'||p.decisions.postrelease!=='NOT_REQUESTED'||
   [p.decisions.publish,p.decisions.deploy,p.decisions.merge,p.decisions.migrate,p.decisions.purge,p.decisions.rollbackExecuted].some(v=>v!==false))
   errors.push('Invalid pre/post release boundary');
 return {valid:errors.length===0,errors,sourceRuns:H13_CHECKS.length,archives:H13_ARTIFACTS.length,
   provenanceOpen:domains,operatorGatesOpen:gates,...deny()};
}
export const H13_REVIEW_ROLES=Object.freeze({
 'original-source-objects':'source-reviewer',
 'content-rights-and-licenses':'rights-reviewer',
 'cdn-cache-and-rollback':'release-operator',
 'pwa-service-worker-provenance':'release-operator',
 'offline-data-recovery':'recovery-operator',
 'physical-device-observations':'device-operator',
 'assistive-technology-observations':'accessibility-operator',
});
const REVIEW_FIELDS=['schemaVersion','subjectHead','domain','sourceObjectKeyDigest','sourceDigest','proofDigest',
 'rightsDigest','previousStableDigest','witnessReceiptDigest','reviewerId','observedAt','expiresAt','nonce','finding'];
export const canonicalH13Review=p=>JSON.stringify(Object.fromEntries(REVIEW_FIELDS.map(k=>[k,p[k]])));
export const h13ReviewDigest=v=>sha(JSON.stringify({payload:JSON.parse(canonicalH13Review(v.payload)),signature:v.signature}));
const REG_FIELDS=['reviewerId','role','spkiPem','pinSha256','validFrom','validUntil','revokedAt','compromisedAt'];
export function adjudicateH13ExternalReviews(envelopes,{registry=[],priorNonceDigests=[],priorReviewDigests=[],nowMs=Date.now()}={}){
 const errors=[],outcomes=[],disputes=[];
 if(!Array.isArray(envelopes)||envelopes.length<2||envelopes.length>48||
   !Array.isArray(registry)||registry.length<2||registry.length>32||
   !Array.isArray(priorNonceDigests)||!Array.isArray(priorReviewDigests)||
   priorNonceDigests.some(x=>!HEX.test(x))||priorReviewDigests.some(x=>!HEX.test(x))||
   new Set(priorNonceDigests).size!==priorNonceDigests.length||
   new Set(priorReviewDigests).size!==priorReviewDigests.length||!Number.isSafeInteger(nowMs))
   errors.push('Bounded external reviews and immutable replay ledgers required');
 const members=new Map(),pins=new Set();
 if(Array.isArray(registry))for(const [i,x] of registry.entries()){
   if(!exact(x,REG_FIELDS)||!IDENT.test(x.reviewerId??'')||
     !Object.values(H13_REVIEW_ROLES).includes(x.role)||!HEX.test(x.pinSha256)||
     !utc(x.validFrom)||!utc(x.validUntil)||Date.parse(x.validFrom)>=Date.parse(x.validUntil)||
     (x.revokedAt!==null&&!utc(x.revokedAt))||
     (x.compromisedAt!==null&&!utc(x.compromisedAt))){
     errors.push('Invalid externally governed reviewer '+i);continue;
   }
   try{
     const key=createPublicKey(x.spkiPem);
     if(key.asymmetricKeyType!=='ed25519'||spkiSha256(x.spkiPem)!==x.pinSha256)
       errors.push('External reviewer key pin mismatch');
   }catch{errors.push('Invalid external reviewer public key');}
   if(members.has(x.reviewerId)||pins.has(x.pinSha256))
     errors.push('Reviewer identity/key is duplicated or aliased');
   members.set(x.reviewerId,x);pins.add(x.pinSha256);
 }
 const nonces=new Set(priorNonceDigests),receiptDigests=new Set(priorReviewDigests);
 const byScope=new Map(),objectClaims=new Map();
 if(Array.isArray(envelopes))for(const [i,item] of envelopes.entries()){
   const p=item?.payload,problems=[];
   if(!exact(item,['payload','signature'])||!exact(p,REVIEW_FIELDS)||
    p.schemaVersion!==1||p.subjectHead!==H13_PARENT||!domains.includes(p.domain)||
    ![p.sourceObjectKeyDigest,p.sourceDigest,p.proofDigest,p.witnessReceiptDigest].every(x=>HEX.test(x))||
    !(p.rightsDigest===null||HEX.test(p.rightsDigest))||
    !(p.previousStableDigest===null||HEX.test(p.previousStableDigest))||
    !IDENT.test(p.reviewerId??'')||!utc(p.observedAt)||!utc(p.expiresAt)||
    !NONCE.test(p.nonce)||p.finding!=='REVIEW_ONLY'||
    !SIG.test(item?.signature))problems.push('Malformed, private or self-approved external review');
   else{
     const n=sha(p.nonce),receipt=h13ReviewDigest(item);
     if(nonces.has(n)||receiptDigests.has(receipt))problems.push('Replayed review nonce/digest');
     nonces.add(n);receiptDigests.add(receipt);
     const from=Date.parse(p.observedAt),until=Date.parse(p.expiresAt);
     if(from>nowMs||from<nowMs-30*86400000||until<=nowMs||until<=from||until-from>7*86400000)
       problems.push('Invalid observation chronology or expiry');
     const reg=members.get(p.reviewerId);
     if(!reg||reg.role!==H13_REVIEW_ROLES[p.domain])problems.push('Untrusted reviewer role or identity');
     else {
       if(from<Date.parse(reg.validFrom)||from>=Date.parse(reg.validUntil)||
        (reg.revokedAt!==null&&from>=Date.parse(reg.revokedAt))||
        (reg.compromisedAt!==null&&nowMs>=Date.parse(reg.compromisedAt)))
          problems.push('Revoked, expired or compromised reviewer');
       try{
         if(!verify(null,Buffer.from(canonicalH13Review(p)),createPublicKey(reg.spkiPem),Buffer.from(item.signature,'base64url')))
           problems.push('Invalid reviewer signature');
       }catch{problems.push('Reviewer signature verification failed');}
     }
     if(p.domain==='content-rights-and-licenses'&&p.rightsDigest===null)
       problems.push('Rights evidence reference required');
     if(['cdn-cache-and-rollback','pwa-service-worker-provenance','offline-data-recovery'].includes(p.domain)&&
       p.previousStableDigest===null)problems.push('Previous stable restore reference required');
     const scope=p.sourceObjectKeyDigest+':'+p.domain;
     const claim=[p.sourceDigest,p.proofDigest,p.rightsDigest,p.previousStableDigest,p.witnessReceiptDigest];
     const earlier=objectClaims.get(scope);
     if(earlier&&earlier.some((v,k)=>v!==claim[k])){
       disputes.push({scopeDigest:sha(scope),code:'CONFLICTING_SOURCE_RIGHTS_OR_RECOVERY'});
       problems.push('Conflicting immutable source/rights/proof/restore chain');
     }
     if(!earlier)objectClaims.set(scope,claim);
     const prior=byScope.get(scope)??[];
     if(reg&&prior.some(z=>z.pin===reg.pinSha256))
       problems.push('Same reviewer key reused under another acceptance identity');
     if(!problems.length){
       prior.push({pin:reg.pinSha256,reviewerId:p.reviewerId});byScope.set(scope,prior);
     }
   }
   if(problems.length)errors.push('Review '+i+': '+problems.join('; '));
   outcomes.push({index:i,domain:domains.includes(p?.domain)?p.domain:null,
     signatureChecked:problems.length===0,reasons:problems});
 }
 const syntheticCorroborated=[...byScope.entries()].filter(([,x])=>x.length>=2).map(([k])=>sha(k));
 return {valid:errors.length===0,errors,disputes,outcomes,syntheticCorroboratedScopeDigests:syntheticCorroborated,
   genuineHumanReviewerAuthenticated:false,legalRightsApproved:false,realDevicesApproved:false,
   ...deny()};
}
// Reuse inherited per-epoch witnessed Ed25519 rotation/revocation/compromise
// checks; this wrapper cannot independently *enroll* a registry or real signer.
export function auditH13SignerCustody(events,options={}){
 const base=inspectH12CustodyChronology(events,options);
 return {...base,independentTrustEnrolled:false,originalKeyHolderVerified:false,...deny()};
}
const DEVICE_FIELDS=['kind','platform','browser','assistiveTechnology','subjectHead','witnessReceiptDigest',
 'proofDigest','reviewerDigest','physicalDeviceKeyDigest','observedAt','status'];
export function inspectH13PhysicalWitnessIntake(items,{nowMs=Date.now()}={}){
 const errors=[],outcomes=[];
 if(!Array.isArray(items)||items.length>24||!Number.isSafeInteger(nowMs))
   errors.push('Invalid independent physical evidence batch');
 const unique=new Set();
 if(Array.isArray(items))for(const [i,x] of items.entries()){
   const expected=H12_OBSERVATIONS.find(y=>y[0]===x?.kind);
   const ok=exact(x,DEVICE_FIELDS)&&!!expected&&x.platform===expected[1]&&
    x.browser===expected[2]&&x.assistiveTechnology===expected[3]&&x.subjectHead===H13_PARENT&&
    [x.witnessReceiptDigest,x.proofDigest,x.reviewerDigest,x.physicalDeviceKeyDigest].every(z=>HEX.test(z))&&
    utc(x.observedAt)&&Date.parse(x.observedAt)<=nowMs&&
    x.status==='PENDING_INDEPENDENT_PHYSICAL_REVIEW'&&!unique.has(x.kind);
   if(!ok)errors.push('Unapproved or malformed physical/a11y witness contract '+i);
   if(expected)unique.add(expected[0]);
   outcomes.push({kind:expected?.[0]??null,contractChecked:ok,
     verifiedRealHardware:false,verifiedTalkBackVoiceOver:false});
 }
 return {valid:errors.length===0,errors,outcomes,realWorldWitnessCount:0,...deny()};
}
const REC_FIELDS=['schemaVersion','subjectHead','ownerKeyDigest','sourceObjectDigest','rightsDigest',
 'previousStableDigest','encryptedBackupDigest','restoredBytesDigest','witnessReceiptDigest',
 'observedAt','expiry','status'];
export function reconcileH13OwnerRecovery(packets,{nowMs=Date.now()}={}){
 const errors=[],ownerSources=new Map();
 if(!Array.isArray(packets)||packets.length>24||!Number.isSafeInteger(nowMs))errors.push('Invalid owner recovery batch');
 if(Array.isArray(packets))for(const [i,p] of packets.entries()){
   if(!exact(p,REC_FIELDS)||p.schemaVersion!==1||p.subjectHead!==H13_PARENT||
    [p.ownerKeyDigest,p.sourceObjectDigest,p.rightsDigest,p.previousStableDigest,p.encryptedBackupDigest,
     p.restoredBytesDigest,p.witnessReceiptDigest].some(x=>!HEX.test(x))||
    !utc(p.observedAt)||!utc(p.expiry)||Date.parse(p.observedAt)>nowMs||
    Date.parse(p.expiry)<=nowMs||p.status!=='PENDING_EXTERNAL_RESTORE_WITNESS'){
     errors.push('Recovery '+i+': invalid or fabricated acceptance');continue;
   }
   const existing=ownerSources.get(p.ownerKeyDigest);
   const refs=[p.sourceObjectDigest,p.rightsDigest,p.previousStableDigest,
     p.encryptedBackupDigest,p.restoredBytesDigest];
   if(existing&&existing.some((v,j)=>v!==refs[j]))
     errors.push('Recovery '+i+': conflicting owner-specific original, license, backup or restored bytes');
   else ownerSources.set(p.ownerKeyDigest,refs);
 }
 return {valid:errors.length===0,errors,ownerScopesReviewed:ownerSources.size,
   independentlyWitnessedRestores:0,actualRestorationSucceeded:false,...deny()};
}
const DEC_FIELDS=['schemaVersion','subjectHead','kind','ownerRole','intentDigest',
 'requestedAt','expiresAt','nonce','status'];
export const canonicalH13OwnerDecision=p=>JSON.stringify(Object.fromEntries(DEC_FIELDS.map(k=>[k,p[k]])));
export function inspectH13SeparatedOwnerCustody(requests,{releaseSpkiPem,rollbackSpkiPem,
 releasePin,rollbackPin,priorNonceDigests=[],nowMs=Date.now()}={}){
 const errors=[],seenKinds=new Set(),seenNonces=new Set(priorNonceDigests);
 if(!Array.isArray(requests)||requests.length>2||!Number.isSafeInteger(nowMs)||
   !HEX.test(releasePin)||!HEX.test(rollbackPin)||releasePin===rollbackPin||
   !Array.isArray(priorNonceDigests)||priorNonceDigests.some(x=>!HEX.test(x)))
   errors.push('Separate operator governance and replay baseline required');
 let pubRelease=null,pubRollback=null;
 try{
   pubRelease=createPublicKey(releaseSpkiPem);pubRollback=createPublicKey(rollbackSpkiPem);
   if(pubRelease.asymmetricKeyType!=='ed25519'||pubRollback.asymmetricKeyType!=='ed25519'||
    spkiSha256(releaseSpkiPem)!==releasePin||spkiSha256(rollbackSpkiPem)!==rollbackPin)
     errors.push('Owner keys are not separately independently pinned');
 }catch{errors.push('Missing independently governed owner public keys');}
 if(Array.isArray(requests))for(const [i,x] of requests.entries()){
   const p=x?.payload,kind=p?.kind,role=kind==='PRECUTOVER'?'release-owner':'recovery-owner';
   if(!exact(x,['payload','signature'])||!exact(p,DEC_FIELDS)||p.schemaVersion!==1||
    p.subjectHead!==H13_PARENT||!['PRECUTOVER','POSTRELEASE_ROLLBACK'].includes(kind)||
    p.ownerRole!==role||p.status!=='REVIEW_ONLY'||!HEX.test(p.intentDigest)||
    !utc(p.requestedAt)||!utc(p.expiresAt)||Date.parse(p.requestedAt)>nowMs||
    Date.parse(p.expiresAt)<=nowMs||Date.parse(p.expiresAt)-Date.parse(p.requestedAt)>86400000||
    !NONCE.test(p.nonce)||!SIG.test(x.signature)||seenKinds.has(kind)||
    seenNonces.has(sha(p.nonce))){
     errors.push('Owner candidate '+i+': forged, expired or role-confused');continue;
   }
   seenKinds.add(kind);seenNonces.add(sha(p.nonce));
   try{
     const key=kind==='PRECUTOVER'?pubRelease:pubRollback;
     if(!key||!verify(null,Buffer.from(canonicalH13OwnerDecision(p)),key,Buffer.from(x.signature,'base64url')))
       errors.push('Owner candidate '+i+': incorrect independent signature');
   }catch{errors.push('Owner candidate '+i+': signature rejected');}
 }
 return {valid:errors.length===0,errors,syntheticSignedCandidates:seenKinds.size,
   independentlyAuthenticatedOwners:0,...deny()};
}
export function prepareH13NoGo(p){
 const a=inspectH13Preparation(p);
 if(!a.valid)throw Error('H13 untrusted original evidence: '+a.errors.join('; '));
 return {kind:'H13_INDEPENDENT_EXTERNAL_REVIEW_CUSTODY_NONEXECUTING',
   qualifiedH12Head:H13_PARENT,exactHeadWorkflows:8,crcCheckedArchives:2,
   externalTrustRoot:'UNCONFIGURED',realExternalReviews:0,
   independentlyAuthenticatedOwners:0,originalRightsAccepted:false,
   realAndroidIosObserved:false,talkBackVoiceOverObserved:false,priorStableRestoreAuthenticated:false,
   humanGatesOpen:a.operatorGatesOpen,sourceDomainsOpen:a.provenanceOpen,...deny()};
}
