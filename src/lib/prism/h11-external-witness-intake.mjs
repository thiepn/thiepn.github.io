import { createHash, createPublicKey, verify } from 'node:crypto';
import { spkiSha256 } from './h8-operator-attestation.mjs';
import { H10_DOMAINS, reconcileH10Custody } from './h10-release-reconciliation.mjs';

// H11 is preparation/verification only. This file cannot assert ownership,
// copyright, real-device testing, signer custody or human release authority.
export const H11_PARENT='31f267fca6a3e227b45c34893b0f5532022359d9';
export const H11_MERGE='e0e9b90bc60f7264a2b01742f0bab486b024a0ca';
export const H11_CHECKS=Object.freeze([
  ['Quality',38059640861],['Hub Account integration',38059640874],
  ['Hub device Library browsers',38059640894],['Hub Notes integration',38059640864],
  ['Hub Notes capture browsers',38059640875],['Hub Notes Inbox browsers',38059640857],
  ['Hub managed Notes browsers',38059640804],['Hub managed TMS60 browsers',38059640877],
]);
export const H11_ARTIFACTS=Object.freeze([
  ['studio-certification',11672613218,38059640861,'5ef93274c1b48fec8ae59745fdcfbcd65c06eb72c104985f0523507b4868c82e'],
  ['hub-notes-contract-evidence',11673235138,38059640864,'3d452730c9c111435c66d1fe02c0fc1b54f6579071b44c9cb1d75bce6abbd5f5'],
]);
export const H11_GATES=Object.freeze([
  'two-owner-oauth-consent','physical-android-ios','screen-reader-keyboard',
  'device-local-reconsent','security-review','prism-visual-owner',
  'release-owner-authorization',
]);
const HEX=/^[0-9a-f]{64}$/;
const ID=/^[A-Za-z0-9_-]{16,96}$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,fields)=>plain(x)&&Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k));
const sha=x=>createHash('sha256').update(x).digest('hex');
const utc=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
  Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
const FIELDS=['schemaVersion','packetId','domain','subjectHead','sourceObjectKeyDigest',
  'sourceDigest','proofDigest','rightsDigest','previousStableDigest',
  'observedAt','expiresAt','nonce','previousPacketDigest'];
export const canonicalH11WitnessPayload=p=>JSON.stringify(Object.fromEntries(FIELDS.map(k=>[k,p[k]])));
export const h11WitnessReceiptDigest=e=>sha(JSON.stringify({payload:JSON.parse(canonicalH11WitnessPayload(e.payload)),
  operatorSignature:e.operatorSignature,witnessSignature:e.witnessSignature}));

export function inspectH11DefaultPacket(p){
  const errors=[];
  if(!plain(p)||p.schemaVersion!==1||p.repository!=='thiepn/thiepn.github.io'||p.phase!=='H11')
    return {valid:false,errors:['Wrong repository/phase/schema'],decision:'NO_GO',releaseAllowed:false};
  const h=p.qualifiedH10;
  if(!plain(h)||h.pr!==104||h.head!==H11_PARENT||
    h.base!=='ad23ef24076aed4e3e714cee50f27f6aa6342d4e'||
    h.testedMergeTree!==H11_MERGE)errors.push('H10 exact-head/base/tested-tree mismatch');
  if(!Array.isArray(h?.checks)||h.checks.length!==H11_CHECKS.length||
    !h.checks.every((x,i)=>exact(x,['name','runId','conclusion','url'])&&
      x.name===H11_CHECKS[i][0]&&x.runId===H11_CHECKS[i][1]&&
      x.conclusion==='success'&&x.url==='https://github.com/thiepn/thiepn.github.io/actions/runs/'+x.runId))
    errors.push('H10 CI source-link mismatch');
  if(!Array.isArray(h?.artifacts)||h.artifacts.length!==H11_ARTIFACTS.length||
    !h.artifacts.every((x,i)=>exact(x,['name','id','runId','sha256','crcVerified'])&&
      x.name===H11_ARTIFACTS[i][0]&&x.id===H11_ARTIFACTS[i][1]&&
      x.runId===H11_ARTIFACTS[i][2]&&x.sha256===H11_ARTIFACTS[i][3]&&x.crcVerified===true))
    errors.push('H10 CRC/digest artifacts unqualified');
  if(p.trustRootStatus!=='UNCONFIGURED'||
    !Array.isArray(p.operatorPublicKeys)||p.operatorPublicKeys.length!==0||
    !Array.isArray(p.witnessPublicKeys)||p.witnessPublicKeys.length!==0||
    !Array.isArray(p.rotationEvents)||p.rotationEvents.length!==0||
    !Array.isArray(p.revocationEvents)||p.revocationEvents.length!==0||
    !Array.isArray(p.replayLedger)||p.replayLedger.length!==0||
    !Array.isArray(p.externalPackets)||p.externalPackets.length!==0)
    errors.push('Untrusted signer, custody or external evidence silently provisioned');
  if(!Array.isArray(p.sourceEvidenceDomains)||p.sourceEvidenceDomains.length!==Object.keys(H10_DOMAINS).length||
    !p.sourceEvidenceDomains.every((x,i)=>exact(x,['id','status','evidenceDigest','reviewer'])&&
      x.id===Object.keys(H10_DOMAINS)[i]&&x.status==='UNVERIFIED'&&
      x.evidenceDigest===null&&x.reviewer===null))
    errors.push('Missing or manufactured original source/rights/recovery/device evidence');
  if(!Array.isArray(p.operatorGates)||p.operatorGates.length!==H11_GATES.length||
    !p.operatorGates.every((x,i)=>exact(x,['id','status','proofDigest','reviewer','observedAt'])&&
      x.id===H11_GATES[i]&&x.status==='OPEN'&&x.proofDigest===null&&
      x.reviewer===null&&x.observedAt===null))
    errors.push('Missing or manufactured human acceptance');
  if(p.previousStableRestore!=='NOT_ATTESTED'||p.physicalAccessibility!=='NOT_ATTESTED'||
    p.decision!=='NO_GO'||p.ownerAuthorization!==null||p.mergeAllowed!==false||
    p.publishAllowed!==false||p.deployAllowed!==false||p.rollbackExecuted!==false)
    errors.push('Nonexecuting human release decision must stay NO_GO');
  return {valid:errors.length===0,errors,priorRuns:H11_CHECKS.length,
    priorArtifacts:H11_ARTIFACTS.length,openGates:[...H11_GATES],
    sourceDomainsOpen:Object.keys(H10_DOMAINS),decision:'NO_GO',
    releaseAllowed:false,mergeAllowed:false,deployAllowed:false,rollbackExecuted:false};
}

// Caller MUST supply independently pinned public-key fingerprints from an
// external operator-controlled trust store, a prior immutable nonce and receipt
// ledger, and separately checked custody/compromise chronology. Signed payloads
// carry *only digest references*; verifying a signature does not prove the
// underlying source object's rights, a physical phone or a human finding.
export function reviewH11ExternalWitnessBatch(envelopes,{
  operatorSpkiPem,witnessSpkiPem,pinnedSpkiDigests=[],operatorRole,witnessRole,
  revokedSpkiDigests=[],usedNonceDigests=[],usedReceiptDigests=[],
  nowMs=Date.now(),maxAgeMs=30*86400000
}={}){
  const errors=[],results=[];
  if(!Array.isArray(envelopes)||envelopes.length<1||envelopes.length>48)
    errors.push('Bounded nonempty external packet batch required');
  if(!Array.isArray(pinnedSpkiDigests)||pinnedSpkiDigests.length!==2||
    new Set(pinnedSpkiDigests).size!==2||pinnedSpkiDigests.some(x=>!HEX.test(x))||
    !Array.isArray(revokedSpkiDigests)||revokedSpkiDigests.some(x=>!HEX.test(x))||
    !Array.isArray(usedNonceDigests)||usedNonceDigests.some(x=>!HEX.test(x))||
    !Array.isArray(usedReceiptDigests)||usedReceiptDigests.some(x=>!HEX.test(x))||
    new Set(usedNonceDigests).size!==usedNonceDigests.length||
    new Set(usedReceiptDigests).size!==usedReceiptDigests.length||
    !Number.isSafeInteger(nowMs)||!Number.isSafeInteger(maxAgeMs)||
    maxAgeMs<60000||maxAgeMs>30*86400000||witnessRole!=='independent-evidence-witness')
    errors.push('Untrusted, revoked, invalid chronology or replay baseline');
  let op=null,witness=null,opPin=null,witnessPin=null;
  try{
    op=createPublicKey(operatorSpkiPem);witness=createPublicKey(witnessSpkiPem);
    opPin=spkiSha256(operatorSpkiPem);witnessPin=spkiSha256(witnessSpkiPem);
    if(op.asymmetricKeyType!=='ed25519'||witness.asymmetricKeyType!=='ed25519'||
      opPin===witnessPin||!pinnedSpkiDigests.includes(opPin)||
      !pinnedSpkiDigests.includes(witnessPin)||
      revokedSpkiDigests.includes(opPin)||revokedSpkiDigests.includes(witnessPin))
      errors.push('Signer or witness pin not independently trusted or revoked');
  }catch{errors.push('Missing/invalid external operator or witness public key');}
  const nonces=new Set(usedNonceDigests),receipts=new Set(usedReceiptDigests),packetIds=new Set();
  let prior='0'.repeat(64),priorTime=-Infinity;
  const objectDigests=new Map();
  if(Array.isArray(envelopes))for(const [i,e] of envelopes.entries()){
    const p=e?.payload,reasons=[];
    if(!exact(e,['payload','operatorSignature','witnessSignature'])||!exact(p,FIELDS)||
      p.schemaVersion!==1||!ID.test(p.packetId)||!Object.hasOwn(H10_DOMAINS,p.domain)||
      p.subjectHead!==H11_PARENT||!HEX.test(p.sourceObjectKeyDigest)||
      !HEX.test(p.sourceDigest)||!HEX.test(p.proofDigest)||
      !(p.rightsDigest===null||HEX.test(p.rightsDigest))||
      !(p.previousStableDigest===null||HEX.test(p.previousStableDigest))||
      !utc(p.observedAt)||!utc(p.expiresAt)||!ID.test(p.nonce)||
      p.previousPacketDigest!==prior||
      typeof e?.operatorSignature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(e.operatorSignature)||
      typeof e?.witnessSignature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(e.witnessSignature))
      reasons.push('Malformed, secret-bearing, noncanonical or unlinked witness packet');
    else{
      const n=sha(p.nonce),receipt=h11WitnessReceiptDigest(e);
      if(nonces.has(n)||receipts.has(receipt)||packetIds.has(p.packetId))
        reasons.push('Replayed nonce, packet ID or attested envelope');
      nonces.add(n);receipts.add(receipt);packetIds.add(p.packetId);
      const observed=Date.parse(p.observedAt),expiry=Date.parse(p.expiresAt);
      if(observed<=priorTime||observed>nowMs||nowMs-observed>maxAgeMs||
        expiry<=nowMs||expiry<=observed||expiry-observed>7*86400000)
        reasons.push('Late, reordered, expired or overlong external witness');
      if(operatorRole!==H10_DOMAINS[p.domain]||operatorRole===witnessRole)
        reasons.push('Signer role incompatible with scoped external evidence');
      if(p.domain==='content-rights-and-licenses'&&p.rightsDigest===null)
        reasons.push('Rights digest required for external license review');
      if(['cdn-cache-and-rollback','pwa-service-worker-provenance','offline-data-recovery'].includes(p.domain)&&
        p.previousStableDigest===null)
        reasons.push('Independent previous-stable recovery digest missing');
      const previousSource=objectDigests.get(p.sourceObjectKeyDigest);
      if(previousSource&&previousSource!==p.sourceDigest)
        reasons.push('Original source object digest discontinuity');
      if(op&&witness)try{
        const bytes=Buffer.from(canonicalH11WitnessPayload(p));
        if(!verify(null,bytes,op,Buffer.from(e.operatorSignature,'base64url'))||
          !verify(null,bytes,witness,Buffer.from(e.witnessSignature,'base64url')))
          reasons.push('Independent witness or scoped operator signature invalid');
      }catch{reasons.push('Invalid detached signature bytes');}
      if(reasons.length===0){
        prior=receipt;priorTime=observed;objectDigests.set(p.sourceObjectKeyDigest,p.sourceDigest);
      }
    }
    results.push({index:i,domain:typeof p?.domain==='string'&&Object.hasOwn(H10_DOMAINS,p.domain)?p.domain:null,
      checked:reasons.length===0,proofDigest:HEX.test(p?.proofDigest)?p.proofDigest:null,reasons});
    if(reasons.length)errors.push('External packet '+i+' rejected: '+reasons.join('; '));
  }
  return {valid:errors.length===0,errors,packets:results,cryptographicallyChecked:results.filter(x=>x.checked).length,
    independentlyAcceptedHumanGates:0,sourceObjectRightsApproved:false,physicalDeviceApproved:false,
    recoveryExecuted:false,decision:'NO_GO',publishAllowed:false,deployAllowed:false};
}
export function reconcileH11Custody(events,params={}){
  // No trust roots or signer-chain documents are installed in this repository.
  // H10 verifies per-epoch independent pins and H9 verifies each witnessed hop.
  const result=reconcileH10Custody(events,params);
  return {...result,realOperatorApproval:false,releaseDecision:'NO_GO',
    releaseAllowed:false,rollbackExecuted:false};
}
export function prepareH11Denial(packet){
  const audit=inspectH11DefaultPacket(packet);
  if(!audit.valid)throw new Error('H11 default-denied intake failed: '+audit.errors.join('; '));
  return {kind:'H11_EXTERNAL_WITNESS_AND_RIGHTS_RECOVERY_NO_GO',
    qualifiedH10Head:H11_PARENT,sourceLinkedChecks:audit.priorRuns,
    checkedH10Artifacts:audit.priorArtifacts,trustRoot:'UNCONFIGURED',
    realSigners:0,realPackets:0,rightsAccepted:false,previousStableRestored:false,
    physicalDeviceAccepted:false,accessibilityAccepted:false,
    sourceDomainsOpen:audit.sourceDomainsOpen,operatorGatesOpen:audit.openGates,
    decision:'NO_GO',publishAllowed:false,mergeAllowed:false,deployAllowed:false,
    rollbackExecuted:false};
}