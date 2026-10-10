import {createHash,createPublicKey,verify} from 'node:crypto';
import {spkiSha256} from './h8-operator-attestation.mjs';
import {H10_DOMAINS} from './h10-release-reconciliation.mjs';
import {H11_GATES,reviewH11ExternalWitnessBatch,h11WitnessReceiptDigest,reconcileH11Custody} from './h11-external-witness-intake.mjs';

// Automated source provenance is not legal rights, operator identity, or physical acceptance.
export const H12_PARENT='8434f4143894c8b693f858375eb31d0770b6d5e1';
export const H12_MERGE='2b51f8f1ed988508e7982747e74a9d2b6b5cca6b';
export const H12_CHECKS=Object.freeze([
 ['Quality',38062026790],['Hub Account integration',38062026799],
 ['Hub device Library browsers',38062026810],['Hub Notes integration',38062026808],
 ['Hub Notes capture browsers',38062026801],['Hub Notes Inbox browsers',38062026806],
 ['Hub managed Notes browsers',38062026959],['Hub managed TMS60 browsers',38062026835],
]);
export const H12_ARTIFACTS=Object.freeze([
 ['studio-certification',11673093974,38062026790,'27b6cba28b5d33f140b26d5f63aa642c93027b2a069156afd9a42aec159a0bf3',51],
 ['hub-notes-contract-evidence',11673616669,38062026808,'8a0caae9a83e089bd5f105dd523c2a2f9bc7c880ee2339ec6fb9aeb4990ad647',1],
]);
const HEX=/^[0-9a-f]{64}$/;
const IDENT=/^[a-z][a-z0-9._-]{3,63}$/;
const sha=x=>createHash('sha256').update(x).digest('hex');
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,fields)=>plain(x)&&Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k));
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
const domains=Object.keys(H10_DOMAINS);
const gates=[...H11_GATES];
const deny=()=>({decision:'NO_GO',releaseAllowed:false,rollbackAllowed:false,
  mergeAllowed:false,deployAllowed:false,rollbackExecuted:false});
export function inspectH12Preparation(packet){
 const errors=[];
 if(!plain(packet)||packet.schemaVersion!==1||packet.repository!=='thiepn/thiepn.github.io'||packet.phase!=='H12')
   return {valid:false,errors:['Invalid H12 source phase or schema'],...deny()};
 const h=packet.qualifiedH11;
 if(!exact(h,['pr','head','base','testedMergeTree','checks','artifacts'])||
  h.pr!==105||h.head!==H12_PARENT||h.base!=='31f267fca6a3e227b45c34893b0f5532022359d9'||
  h.testedMergeTree!==H12_MERGE)errors.push('H11 exact parent or tested merge mismatch');
 if(!Array.isArray(h?.checks)||h.checks.length!==H12_CHECKS.length||
  !h.checks.every((x,i)=>exact(x,['name','runId','conclusion','url'])&&
   x.name===H12_CHECKS[i][0]&&x.runId===H12_CHECKS[i][1]&&x.conclusion==='success'&&
   x.url==='https://github.com/thiepn/thiepn.github.io/actions/runs/'+x.runId))
  errors.push('H11 source-linked CI mismatch');
 if(!Array.isArray(h?.artifacts)||h.artifacts.length!==H12_ARTIFACTS.length||
  !h.artifacts.every((x,i)=>exact(x,['name','id','runId','sha256','crcVerified','entryCount'])&&
   x.name===H12_ARTIFACTS[i][0]&&x.id===H12_ARTIFACTS[i][1]&&x.runId===H12_ARTIFACTS[i][2]&&
   x.sha256===H12_ARTIFACTS[i][3]&&x.crcVerified===true&&x.entryCount===H12_ARTIFACTS[i][4]))
  errors.push('H11 independent ZIP SHA-256/CRC receipt mismatch');
 if(packet.trustRoot!=='UNCONFIGURED'||!Array.isArray(packet.operatorRegistrations)||
  packet.operatorRegistrations.length!==0||!Array.isArray(packet.externalWitnessSets)||
  packet.externalWitnessSets.length!==0||!Array.isArray(packet.physicalObservations)||
  packet.physicalObservations.length!==0||!Array.isArray(packet.replayLedger)||
  packet.replayLedger.length!==0||!Array.isArray(packet.custodyTransitions)||
  packet.custodyTransitions.length!==0||!Array.isArray(packet.ownerDecisions)||
  packet.ownerDecisions.length!==0)errors.push('Unverified external authority or submissions must be empty');
 if(!Array.isArray(packet.provenance)||packet.provenance.length!==domains.length||
  !packet.provenance.every((x,i)=>exact(x,['domain','status','proofDigest'])&&
   x.domain===domains[i]&&x.status==='UNVERIFIED'&&x.proofDigest===null))
  errors.push('Missing original source, license, CDN, PWA, offline, device or a11y gate');
 if(!Array.isArray(packet.humanGates)||packet.humanGates.length!==gates.length||
  !packet.humanGates.every((x,i)=>exact(x,['id','status','reviewer','receiptDigest'])&&
   x.id===gates[i]&&x.status==='OPEN'&&x.reviewer===null&&x.receiptDigest===null))
  errors.push('No human-only approval can be inferred by CI');
 if(!exact(packet.decisions,['precutover','postrelease','deployment','merge','migration','purge'])||
   packet.decisions.precutover!=='NO_GO'||packet.decisions.postrelease!=='NOT_REQUESTED'||
   [packet.decisions.deployment,packet.decisions.merge,packet.decisions.migration,packet.decisions.purge].some(x=>x!==false))
  errors.push('Release and separately controlled postrelease rollback must remain denied');
 return {valid:errors.length===0,errors,sourceChecks:H12_CHECKS.length,
   independentlyCheckedArchives:H12_ARTIFACTS.length,unverifiedDomains:domains,
   humanGatesOpen:gates,...deny()};
}

// Real external trust and operator-role registration must come from separately
// governed custody. The caller may supply pinned keys for *verification only*.
// Even a successful synthetic quorum never installs a production trust root.
const registryFields=['operatorId','witnessId','operatorRole','operatorSpkiPem','witnessSpkiPem',
 'operatorPin','witnessPin','epoch','validFrom','validUntil','revokedAt','compromisedAt'];
export function reconcileH12MultiParty(groups,{registry=[],usedNonceDigests=[],
 usedReceiptDigests=[],nowMs=Date.now()}={}){
 const errors=[],outcomes=[];
 if(!Array.isArray(groups)||groups.length<2||groups.length>32||
    !Array.isArray(registry)||registry.length<2||registry.length>32||
    !Number.isSafeInteger(nowMs)||!Array.isArray(usedNonceDigests)||
    !Array.isArray(usedReceiptDigests)||usedNonceDigests.some(x=>!HEX.test(x))||
    usedReceiptDigests.some(x=>!HEX.test(x))||
    new Set(usedNonceDigests).size!==usedNonceDigests.length||
    new Set(usedReceiptDigests).size!==usedReceiptDigests.length)
  errors.push('Two independently governed witnesses and valid immutable replay ledgers required');
 const entries=new Map(),operators=new Map(),witnesses=new Map();
 if(Array.isArray(registry))for(const [i,x] of registry.entries()){
   if(!exact(x,registryFields)||!IDENT.test(x.operatorId??'')||
    !IDENT.test(x.witnessId??'')||x.operatorId===x.witnessId||
    !domains.some(d=>H10_DOMAINS[d]===x.operatorRole)||
    !HEX.test(x.operatorPin)||!HEX.test(x.witnessPin)||x.operatorPin===x.witnessPin||
    !Number.isSafeInteger(x.epoch)||x.epoch<1||
    !iso(x.validFrom)||!iso(x.validUntil)||Date.parse(x.validUntil)<=Date.parse(x.validFrom)||
    (x.revokedAt!==null&&!iso(x.revokedAt))||
    (x.compromisedAt!==null&&!iso(x.compromisedAt))){
      errors.push('Invalid independently registered epoch at '+i);continue;
   }
   let validKeys=true;
   try{
     const a=createPublicKey(x.operatorSpkiPem),b=createPublicKey(x.witnessSpkiPem);
     validKeys=a.asymmetricKeyType==='ed25519'&&b.asymmetricKeyType==='ed25519'&&
       spkiSha256(x.operatorSpkiPem)===x.operatorPin&&
       spkiSha256(x.witnessSpkiPem)===x.witnessPin;
   }catch{validKeys=false;}
   if(!validKeys)errors.push('External registry contains unpinned or wrong-type keys');
   if(entries.has(x.operatorId+':'+x.epoch))errors.push('Duplicate signer/epoch binding');
   entries.set(x.operatorId+':'+x.epoch,x);
   for(const [map,id,pin] of [[operators,x.operatorId,x.operatorPin],[witnesses,x.witnessId,x.witnessPin]]){
     if(map.has(id)&&map.get(id)!==pin)errors.push('Identity changes its pinned key without a witnessed custody transition');
     map.set(id,pin);
   }
 }
 // An operator must never appear in the witness pool, including under another alias.
 const operatorPins=new Set(operators.values()),witnessPins=new Set(witnesses.values());
 for(const pin of operatorPins)if(witnessPins.has(pin))errors.push('Operator is also independent witness');
 if(new Set(witnessPins).size!==witnessPins.size)errors.push('Duplicate witness signing identity');
 const nonces=new Set(usedNonceDigests),receipts=new Set(usedReceiptDigests);
 const source=new Map(),rights=new Map(),stable=new Map(),proofs=new Map(),peerIds=new Map();
 if(Array.isArray(groups))for(const [index,g] of groups.entries()){
   const reasons=[];
   if(!exact(g,['operatorId','epoch','envelopes'])||!IDENT.test(g.operatorId??'')||
    !Number.isSafeInteger(g.epoch)||!Array.isArray(g.envelopes)||g.envelopes.length!==1){
      errors.push('Group '+index+': invalid externally witnessed batch');outcomes.push({index,valid:false});continue;
   }
   const reg=entries.get(g.operatorId+':'+g.epoch);
   if(!reg){errors.push('Group '+index+': unregistered independently trusted signer');outcomes.push({index,valid:false});continue;}
   const p=g.envelopes[0]?.payload;
   if(!plain(p)||!iso(p.observedAt)){reasons.push('No canonical witnessed observation');}
   else {
     const observed=Date.parse(p.observedAt);
     if(observed<Date.parse(reg.validFrom)||observed>=Date.parse(reg.validUntil)||
       (reg.revokedAt!==null&&observed>=Date.parse(reg.revokedAt))||
       (reg.compromisedAt!==null&&observed>=Date.parse(reg.compromisedAt))||
       (reg.compromisedAt!==null&&nowMs>=Date.parse(reg.compromisedAt)))
       reasons.push('Signer epoch outside validity or compromised/revoked');
   }
   const proof=reviewH11ExternalWitnessBatch(g.envelopes,{
     operatorSpkiPem:reg.operatorSpkiPem,witnessSpkiPem:reg.witnessSpkiPem,
     pinnedSpkiDigests:[reg.operatorPin,reg.witnessPin],
     operatorRole:reg.operatorRole,witnessRole:'independent-evidence-witness',
     revokedSpkiDigests:reg.revokedAt!==null||reg.compromisedAt!==null&&nowMs>=Date.parse(reg.compromisedAt)?[reg.operatorPin]:[],
     usedNonceDigests:[...nonces],usedReceiptDigests:[...receipts],nowMs
   });
   if(!proof.valid)reasons.push('Signed witness rejected: '+proof.errors.join('; '));
   if(!reasons.length){
     const receipt=h11WitnessReceiptDigest(g.envelopes[0]),nonceHash=sha(p.nonce);
     if(nonces.has(nonceHash)||receipts.has(receipt))reasons.push('Global replay across independent operators');
     const key=p.sourceObjectKeyDigest,identifier=key+':'+p.domain;
     const seenSource=source.get(key),seenRights=rights.get(key),seenStable=stable.get(key);
     if(seenSource&&seenSource!==p.sourceDigest)reasons.push('Conflicting immutable original object digest');
     if(p.rightsDigest!==null&&seenRights&&seenRights!==p.rightsDigest)
       reasons.push('Conflicting license/rights chain');
     if(p.previousStableDigest!==null&&seenStable&&seenStable!==p.previousStableDigest)
       reasons.push('Conflicting previous-stable CDN/PWA/offline recovery chain');
     const priorProof=proofs.get(identifier);
     if(priorProof&&priorProof!==p.proofDigest)reasons.push('Conflicting domain proof for same original');
     const peers=peerIds.get(identifier)??[];
     if(peers.some(x=>x.operatorPin===reg.operatorPin||x.witnessPin===reg.witnessPin))
       reasons.push('Quorum uses duplicated signer or witness');
     if(!reasons.length){
       source.set(key,p.sourceDigest);
       if(p.rightsDigest!==null)rights.set(key,p.rightsDigest);
       if(p.previousStableDigest!==null)stable.set(key,p.previousStableDigest);
       proofs.set(identifier,p.proofDigest);
       peers.push({operatorPin:reg.operatorPin,witnessPin:reg.witnessPin});
       peerIds.set(identifier,peers);
       nonces.add(nonceHash);receipts.add(receipt);
     }
   }
   if(reasons.length)errors.push('Group '+index+': '+reasons.join('; '));
   outcomes.push({index,domain:domains.includes(p?.domain)?p.domain:null,
     cryptographicReviewPassed:reasons.length===0,errors:reasons});
 }
 const corroborated=[...peerIds.entries()].filter(([_,peers])=>peers.length>=2).map(([key])=>sha(key));
 return {valid:errors.length===0,errors,outcomes,syntheticCorroboratedScopes:corroborated,
   sourceConflictsDetected:errors.some(x=>/Conflicting|replay|Quorum/i.test(x)),
   acceptedRealWitnesses:0,independentOwnerApprovals:0,trustRootInstalled:false,
   ...deny()};
}

// H9/H10's cryptographically witnessed multi-epoch chain is reused; H12
// refuses to pretend that an external custodian has independently enrolled it.
export function inspectH12CustodyChronology(events,params={}){
 const checked=reconcileH11Custody(events,params);
 return {...checked,independentlyEnrolled:false,ownerDecision:'NO_GO',...deny()};
}
export const H12_OBSERVATIONS=Object.freeze([
 ['android-chrome','ANDROID','Chrome','NONE'],
 ['android-samsung-internet','ANDROID','Samsung Internet','NONE'],
 ['ios-safari','IOS','Safari','NONE'],
 ['android-talkback','ANDROID','Chrome','TalkBack'],
 ['ios-voiceover','IOS','Safari','VoiceOver'],
 ['physical-keyboard','CROSS_PLATFORM','Browser','Keyboard'],
]);
const observationFields=['kind','platform','browser','assistiveTechnology','subjectHead',
 'proofDigest','witnessReceiptDigest','observedAt','source','state'];
export function inspectH12PhysicalCollection(items,{nowMs=Date.now()}={}){
 const errors=[],outcomes=[];
 if(!Array.isArray(items)||items.length>24||!Number.isSafeInteger(nowMs))
   errors.push('Invalid bounded physical evidence manifest');
 if(Array.isArray(items))for(const [index,p] of items.entries()){
   const expected=H12_OBSERVATIONS.find(x=>x[0]===p?.kind);
   const valid=exact(p,observationFields)&&expected&&
      p.platform===expected[1]&&p.browser===expected[2]&&p.assistiveTechnology===expected[3]&&
      p.subjectHead===H12_PARENT&&HEX.test(p.proofDigest)&&HEX.test(p.witnessReceiptDigest)&&
      iso(p.observedAt)&&Date.parse(p.observedAt)<=nowMs&&
      p.source==='INDEPENDENT_REVIEW_REQUIRED'&&p.state==='PENDING';
   if(!valid)errors.push('Manifest '+index+': missing independent physical observation contract');
   outcomes.push({kind:expected?.[0]??null,contractValid:!!valid,
     actualPhysicalReviewVerified:false,accessibilityApproved:false});
 }
 return {valid:errors.length===0,errors,outcomes,
   realDeviceAcceptance:false,screenReaderAcceptance:false,...deny()};
}
const DEC_FIELDS=['schemaVersion','subjectHead','kind','requestedAt','expiresAt',
 'intentDigest','nonce','signerRole'];
export const canonicalH12Decision=p=>JSON.stringify(Object.fromEntries(DEC_FIELDS.map(k=>[k,p[k]])));
export function inspectH12DecisionCandidates(candidates,{precutoverPublicKey,
 postreleasePublicKey,precutoverPin,postreleasePin,nowMs=Date.now()}={}){
 const errors=[],kinds=new Set();
 if(!Array.isArray(candidates)||candidates.length>2||!Number.isSafeInteger(nowMs)||
   !HEX.test(precutoverPin)||!HEX.test(postreleasePin)||precutoverPin===postreleasePin)
   errors.push('Separately governed release and rollback authorities required');
 let release,rollback;
 try{
   release=createPublicKey(precutoverPublicKey);rollback=createPublicKey(postreleasePublicKey);
   if(release.asymmetricKeyType!=='ed25519'||rollback.asymmetricKeyType!=='ed25519'||
     spkiSha256(precutoverPublicKey)!==precutoverPin||
     spkiSha256(postreleasePublicKey)!==postreleasePin)
     errors.push('Precutover/recovery custody not separately pinned');
 }catch{errors.push('Missing externally pinned owner public keys');}
 const seenNonces=new Set();
 if(Array.isArray(candidates))for(const [i,c] of candidates.entries()){
   const p=c?.payload;
   if(!exact(c,['payload','signature'])||!exact(p,DEC_FIELDS)||
     p.schemaVersion!==1||p.subjectHead!==H12_PARENT||
     !['PRECUTOVER','POSTRELEASE_ROLLBACK'].includes(p.kind)||
     p.signerRole!==(p.kind==='PRECUTOVER'?'release-owner':'recovery-owner')||
     !iso(p.requestedAt)||!iso(p.expiresAt)||Date.parse(p.requestedAt)>nowMs||
     Date.parse(p.expiresAt)<=nowMs||Date.parse(p.expiresAt)-Date.parse(p.requestedAt)>86400000||
     !HEX.test(p.intentDigest)||!IDENT.test(p.nonce)||typeof c.signature!=='string'||
     !/^[A-Za-z0-9_-]{86}$/.test(c.signature)||kinds.has(p.kind)||seenNonces.has(p.nonce)){
     errors.push('Decision '+i+': malformed, duplicate, expired or role-confused');continue;
   }
   kinds.add(p.kind);seenNonces.add(p.nonce);
   const key=p.kind==='PRECUTOVER'?release:rollback;
   if(!key||!verify(null,Buffer.from(canonicalH12Decision(p)),key,Buffer.from(c.signature,'base64url')))
     errors.push('Decision '+i+': invalid independent owner signature');
 }
 return {valid:errors.length===0,errors,cryptographicCandidateCount:kinds.size,
   independentlyAuthenticatedRealHumans:0,
   precutover:'NO_GO',postrelease:'NOT_REQUESTED',...deny()};
}
export function prepareH12NoGo(packet){
 const a=inspectH12Preparation(packet);
 if(!a.valid)throw Error('H12 prerelease source/decision guard rejected: '+a.errors.join('; '));
 return {kind:'H12_MULTI_PARTY_PRECUTOVER_NONEXECUTING',qualifiedH11Head:H12_PARENT,
   checkedSourceWorkflows:a.sourceChecks,checkedArchives:a.independentlyCheckedArchives,
   externalTrustRoot:'UNCONFIGURED',registeredOperators:0,realExternalWitnesses:0,
   sourceRightsVerified:false,previousStableRecoveryVerified:false,
   physicalAndroidIosVerified:false,talkBackVoiceOverVerified:false,
   humanGatesOpen:a.humanGatesOpen,provenanceOpen:a.unverifiedDomains,
   precutoverDecision:'NO_GO',postreleaseRollback:'NOT_REQUESTED',
   mergeAllowed:false,deployAllowed:false,migrationAllowed:false,purgeAllowed:false,
   rollbackExecuted:false};
}
