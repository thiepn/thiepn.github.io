import { createHash, createPublicKey, verify } from 'node:crypto';
import { spkiSha256 } from './h8-operator-attestation.mjs';
import { verifyH9WitnessedCustody } from './h9-custody-acceptance.mjs';

// Pins copied from independently retrieved H9 job logs and checked ZIP bytes;
// these are automated-source receipts, NOT authentic device or operator evidence.
export const H10_PARENT='ad23ef24076aed4e3e714cee50f27f6aa6342d4e';
export const H10_TESTED_MERGE='c9cfaa63da43aa4877de6a5b50d4a88bd745baeb';
export const H10_CHECKS=Object.freeze([
  ['Quality',38053333209],['Hub Account integration',38053333176],
  ['Hub device Library browsers',38053333177],
  ['Hub Notes Inbox browsers',38053333205],
  ['Hub Notes capture browsers',38053333191],
  ['Hub managed Notes browsers',38053333213],
  ['Hub managed TMS60 browsers',38053333181],
  ['Hub Notes integration',38053333215],
]);
export const H10_ARTIFACTS=Object.freeze([
  ['studio-certification',11670312948,38053333209,'58428a378168e6758e109f16a003fbac20596d392c57a2e55bef646fc91fe200'],
  ['hub-notes-contract-evidence',11670916079,38053333215,'81f625e3df33a2f625c4dd848e8b7cded6098cdcd43a1f12c58f00f323fa0518'],
]);
export const H10_DOMAINS=Object.freeze({
  'original-source-objects':'source-reviewer',
  'content-rights-and-licenses':'rights-reviewer',
  'cdn-cache-and-rollback':'release-operator',
  'pwa-service-worker-provenance':'release-operator',
  'offline-data-recovery':'recovery-operator',
  'physical-device-observations':'device-operator',
  'assistive-technology-observations':'accessibility-operator',
});
export const H10_GATES=Object.freeze([
  'two-owner-oauth-consent','physical-android-ios','screen-reader-keyboard',
  'device-local-reconsent','security-review','prism-visual-owner',
  'release-owner-authorization',
]);
const FIELDS=['schemaVersion','domain','subjectHead','sourceDigest','proofDigest','observedAt','expiresAt','nonce'];
const HEX=/^[0-9a-f]{64}$/;
const NONCE=/^[A-Za-z0-9_-]{24,128}$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,fields)=>plain(x)&&Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k));
const sha=x=>createHash('sha256').update(x).digest('hex');
const utc=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
  Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
export const canonicalH10Evidence=p=>JSON.stringify(Object.fromEntries(FIELDS.map(k=>[k,p[k]])));

export function inspectH10Preparation(p){
  const errors=[];
  if(!plain(p)||p.schemaVersion!==1||p.repository!=='thiepn/thiepn.github.io'||p.phase!=='H10')
    return {valid:false,errors:['Invalid H10 repository or schema'],releaseAllowed:false};
  const h=p.parentH9;
  if(!plain(h)||h.pr!==103||h.head!==H10_PARENT||h.base!=='ed5dfe10be6aadf1575ae37ce28d49e22d4d4855'||
    h.testedPrMergeTree!==H10_TESTED_MERGE)
    errors.push('H9 exact head, base or tested merge tree not pinned');
  if(!Array.isArray(h?.checks)||h.checks.length!==H10_CHECKS.length||
    !h.checks.every((x,i)=>exact(x,['name','runId','conclusion','url'])&&
      x.name===H10_CHECKS[i][0]&&x.runId===H10_CHECKS[i][1]&&x.conclusion==='success'&&
      x.url==='https://github.com/thiepn/thiepn.github.io/actions/runs/'+x.runId))
    errors.push('Tampered H9 exact-head workflow checks');
  if(!Array.isArray(h?.artifacts)||h.artifacts.length!==H10_ARTIFACTS.length||
    !h.artifacts.every((x,i)=>exact(x,['name','id','runId','sha256','crcOk'])&&
      x.name===H10_ARTIFACTS[i][0]&&x.id===H10_ARTIFACTS[i][1]&&
      x.runId===H10_ARTIFACTS[i][2]&&x.sha256===H10_ARTIFACTS[i][3]&&x.crcOk===true))
    errors.push('H9 artifact digest or ZIP integrity not independently checked');
  if(p.operatorTrustRoot!=='UNCONFIGURED'||
    !Array.isArray(p.custodyEvents)||p.custodyEvents.length!==0||
    !Array.isArray(p.keyEpochPins)||p.keyEpochPins.length!==0||
    !Array.isArray(p.revocations)||p.revocations.length!==0||
    !Array.isArray(p.evidenceSubmissions)||p.evidenceSubmissions.length!==0||
    !Array.isArray(p.priorNonceDigests)||p.priorNonceDigests.length!==0)
    errors.push('Unexpected signer authority or purported real evidence');
  if(!Array.isArray(p.provenanceDomains)||p.provenanceDomains.length!==Object.keys(H10_DOMAINS).length||
    !p.provenanceDomains.every((x,i)=>exact(x,['id','status','proofDigest','sourceDigest','reviewer'])&&
      x.id===Object.keys(H10_DOMAINS)[i]&&x.status==='UNVERIFIED'&&
      x.proofDigest===null&&x.sourceDigest===null&&x.reviewer===null))
    errors.push('Unverified rights, source, CDN, PWA, offline, device and accessibility claims must remain open');
  if(!Array.isArray(p.operatorGates)||p.operatorGates.length!==H10_GATES.length||
    !p.operatorGates.every((x,i)=>exact(x,['id','status','proofDigest','observedAt','reviewer'])&&
      x.id===H10_GATES[i]&&x.status==='OPEN'&&x.proofDigest===null&&
      x.observedAt===null&&x.reviewer===null))
    errors.push('Missing or fabricated human-only operator approval');
  if(p.releaseDecision!=='NO_GO'||p.ownerAuthorization!==null||
    p.publicationAllowed!==false||p.mergeAllowed!==false||p.deployAllowed!==false||
    p.rollbackExecuted!==false)
    errors.push('Production release/rollback must remain denied');
  return {valid:errors.length===0,errors,qualifiedPredecessorChecks:H10_CHECKS.length,
    verifiedPredecessorArtifacts:H10_ARTIFACTS.length,sourceDomainsOpen:Object.keys(H10_DOMAINS),
    humanGatesOpen:[...H10_GATES],releaseAllowed:false,mergeAllowed:false,
    deployAllowed:false,rollbackExecuted:false,decision:'NO_GO'};
}

// Supplemental review of H9 cryptographic chain with an *externally* pinned
// fingerprint for every rotated signer epoch. This does not install trust roots,
// accept signatures on behalf of people, or mark their approvals as complete.
export function reconcileH10Custody(events,{
  keyEpochPins=[],...options
}={}){
  const base=verifyH9WitnessedCustody(events,options);
  const errors=[...base.errors];
  if(!Array.isArray(keyEpochPins)||keyEpochPins.length<1||keyEpochPins.length>65||
    keyEpochPins.some(x=>!exact(x,['keyId','spkiSha256'])||typeof x.keyId!=='string'||
      !/^[a-z][a-z0-9._-]{3,63}$/.test(x.keyId)||!HEX.test(x.spkiSha256))||
    new Set(keyEpochPins.map(x=>x.keyId)).size!==keyEpochPins.length)
    errors.push('Independently pinned key epoch list required');
  else {
    const witnessed=[{keyId:options.initialKeyId,spkiSha256:null}];
    try{witnessed[0].spkiSha256=spkiSha256(options.initialSpkiPem);}catch{errors.push('Invalid initial signer epoch');}
    if(Array.isArray(events))for(const e of events)if(e?.payload?.action==='rotate'){
      try{witnessed.push({keyId:e.payload.nextKeyId,spkiSha256:spkiSha256(e.payload.nextSpkiPem)});}
      catch{errors.push('Invalid successor signer epoch');}
    }
    if(witnessed.length!==keyEpochPins.length||
      witnessed.some((e,i)=>e.keyId!==keyEpochPins[i]?.keyId||e.spkiSha256!==keyEpochPins[i]?.spkiSha256))
      errors.push('Witnessed rotation does not match external epoch custody pins');
  }
  return {valid:errors.length===0,errors,cryptographicChainValid:base.valid,
    verifiedSyntheticHops:base.witnessedTransitions,terminated:base.terminated,
    externalOperatorApproval:false,decision:'NO_GO',releaseAllowed:false};
}

// Review only: strict digest references and two independently pinned signatures
// from distinct roles. This does not verify the physical source, device, rights
// or human observation behind a digest, and never promotes a human-only gate.
export function inspectH10EvidenceBatch(envelopes,{
  operatorSpkiPem,witnessSpkiPem,independentPins=[],operatorRole,witnessRole,
  priorNonceDigests=[],nowMs=Date.now()
}={}){
  const errors=[],outcomes=[];
  if(!Array.isArray(envelopes)||envelopes.length<1||envelopes.length>32)
    errors.push('Expected bounded evidence intake batch');
  if(!Array.isArray(independentPins)||independentPins.length!==2||
    independentPins.some(x=>!HEX.test(x))||new Set(independentPins).size!==2||
    !Array.isArray(priorNonceDigests)||priorNonceDigests.some(x=>!HEX.test(x))||
    new Set(priorNonceDigests).size!==priorNonceDigests.length||
    !Number.isSafeInteger(nowMs)||witnessRole!=='evidence-witness')
    errors.push('Missing independent pins, witness role or valid replay inputs');
  let signer=null,witness=null;
  try{
    signer=createPublicKey(operatorSpkiPem);
    witness=createPublicKey(witnessSpkiPem);
    if(signer.asymmetricKeyType!=='ed25519'||witness.asymmetricKeyType!=='ed25519'||
      spkiSha256(operatorSpkiPem)===spkiSha256(witnessSpkiPem)||
      !independentPins.includes(spkiSha256(operatorSpkiPem))||
      !independentPins.includes(spkiSha256(witnessSpkiPem)))
      errors.push('Signer/witness trust not independently pinned');
  }catch{errors.push('Invalid or missing independently pinned signer/witness key');}
  const nonces=new Set(priorNonceDigests);
  if(Array.isArray(envelopes))for(const [i,e] of envelopes.entries()){
    const p=e?.payload,problems=[];
    if(!exact(e,['payload','operatorSignature','witnessSignature'])||
      !exact(p,FIELDS)||p.schemaVersion!==1||
      !Object.hasOwn(H10_DOMAINS,p.domain)||p.subjectHead!==H10_PARENT||
      !HEX.test(p.sourceDigest)||!HEX.test(p.proofDigest)||
      !utc(p.observedAt)||!utc(p.expiresAt)||!NONCE.test(p.nonce)||
      typeof e?.operatorSignature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(e.operatorSignature)||
      typeof e?.witnessSignature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(e.witnessSignature))
      problems.push('Malformed, private, or unbound signed evidence');
    else {
      const digestNonce=sha(p.nonce);
      if(nonces.has(digestNonce))problems.push('Replayed evidence nonce');
      nonces.add(digestNonce);
      const from=Date.parse(p.observedAt),until=Date.parse(p.expiresAt);
      if(from>nowMs||from<nowMs-30*86400000||until<=nowMs||
        until<=from||until-from>7*86400000)problems.push('Invalid evidence expiry or observation order');
      if(operatorRole!==H10_DOMAINS[p.domain]||operatorRole===witnessRole)
        problems.push('Insufficient independently scoped operator role');
      if(signer&&witness)try{
        const bytes=Buffer.from(canonicalH10Evidence(p));
        if(!verify(null,bytes,signer,Buffer.from(e.operatorSignature,'base64url'))||
          !verify(null,bytes,witness,Buffer.from(e.witnessSignature,'base64url')))
          problems.push('Operator or witness signature invalid');
      }catch{problems.push('Signature validation failed');}
    }
    outcomes.push({index:i,domain:Object.hasOwn(H10_DOMAINS,p?.domain)?p.domain:null,
      verifiedCryptography:problems.length===0,reasons:problems,
      redactedProofDigest:HEX.test(p?.proofDigest)?p.proofDigest:null});
    if(problems.length)errors.push('Evidence '+i+': '+problems.join('; '));
  }
  return {valid:errors.length===0,errors,outcomes,
    cryptographicallyVerified:outcomes.filter(x=>x.verifiedCryptography).length,
    sourceRightsOrDeviceHumanApproval:false,releaseAllowed:false,decision:'NO_GO'};
}
export function prepareH10ReleaseDenial(packet){
  const audit=inspectH10Preparation(packet);
  if(!audit.valid)throw new Error('H10 exact-source/acceptance checks rejected: '+audit.errors.join('; '));
  return {kind:'H10_INDEPENDENT_RELEASE_RECONCILIATION_DRY_RUN',
    qualifiedParentHead:H10_PARENT,sourceLinkedChecks:audit.qualifiedPredecessorChecks,
    artifactsIndependentlyChecked:audit.verifiedPredecessorArtifacts,
    trustRoot:'UNCONFIGURED',realWitnessedCustodyCount:0,
    originalSourceRightsApproved:false,cdnPwaOfflineRecoveryApproved:false,
    physicalAndAccessibilityApproved:false,humanGatesOpen:audit.humanGatesOpen,
    sourceDomainsOpen:audit.sourceDomainsOpen,decision:'NO_GO',
    publicationAllowed:false,mergeAllowed:false,deployAllowed:false,
    rollbackExecuted:false};
}
