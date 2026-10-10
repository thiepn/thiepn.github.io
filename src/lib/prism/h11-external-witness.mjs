import { createHash, createPublicKey, verify } from 'node:crypto';
import { H10_DOMAINS, H10_GATES, reconcileH10Custody } from './h10-release-reconciliation.mjs';
import { spkiSha256 } from './h8-operator-attestation.mjs';

// Fixed CI provenance identifies an automated prerequisite, not operator acceptance.
export const H11_PARENT='31f267fca6a3e227b45c34893b0f5532022359d9';
export const H11_TESTED_MERGE='e0e9b90bc60f7264a2b01742f0bab486b024a0ca';
export const H11_CHECKS=Object.freeze([
  ['Quality',38059640861],['Hub Account integration',38059640874],
  ['Hub device Library browsers',38059640894],
  ['Hub Notes integration',38059640864],
  ['Hub Notes capture browsers',38059640875],
  ['Hub Notes Inbox browsers',38059640857],
  ['Hub managed Notes browsers',38059640804],
  ['Hub managed TMS60 browsers',38059640877],
]);
export const H11_ARTIFACTS=Object.freeze([
  ['studio-certification',11672613218,38059640861,'5ef93274c1b48fec8ae59745fdcfbcd65c06eb72c104985f0523507b4868c82e',50],
  ['hub-notes-contract-evidence',11673235138,38059640864,'3d452730c9c111435c66d1fe02c0fc1b54f6579071b44c9cb1d75bce6abbd5f5',1],
]);
const HEX=/^[0-9a-f]{64}$/;
const KEY=/^[a-z][a-z0-9._-]{3,63}$/;
const NONCE=/^[A-Za-z0-9_-]{24,128}$/;
const SIG=/^[A-Za-z0-9_-]{86}$/;
const sha=value=>createHash('sha256').update(value).digest('hex');
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,fields)=>plain(x)&&Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k));
const utc=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
  Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
const domains=Object.keys(H10_DOMAINS);
const gates=[...H10_GATES];
const observations=Object.freeze({
  'original-source-objects':['source-byte-inspection'],
  'content-rights-and-licenses':['license-chain-review'],
  'cdn-cache-and-rollback':['cdn-cache-probe','previous-stable-probe'],
  'pwa-service-worker-provenance':['service-worker-update','service-worker-rollback'],
  'offline-data-recovery':['offline-restore-rehearsal'],
  'physical-device-observations':['android-chrome','android-samsung-internet','ios-safari'],
  'assistive-technology-observations':['talkback','voiceover','physical-keyboard'],
});
export function inspectH11Preparation(packet){
  const errors=[];
  if(!plain(packet)||packet.schemaVersion!==1||packet.repository!=='thiepn/thiepn.github.io'||packet.phase!=='H11')
    return {valid:false,errors:['Invalid H11 source or schema'],decision:'NO_GO',releaseAllowed:false};
  const p=packet.parentH10;
  if(!exact(p,['pr','head','testedPrMergeTree','checks','artifacts'])||
    p.pr!==104||p.head!==H11_PARENT||p.testedPrMergeTree!==H11_TESTED_MERGE)
    errors.push('H10 head or tested PR merge tree mismatch');
  if(!Array.isArray(p?.checks)||p.checks.length!==H11_CHECKS.length||
    !p.checks.every((c,i)=>exact(c,['name','runId','conclusion','url'])&&
      c.name===H11_CHECKS[i][0]&&c.runId===H11_CHECKS[i][1]&&c.conclusion==='success'&&
      c.url==='https://github.com/thiepn/thiepn.github.io/actions/runs/'+c.runId))
    errors.push('Missing or altered H10 exact-head workflow');
  if(!Array.isArray(p?.artifacts)||p.artifacts.length!==H11_ARTIFACTS.length||
    !p.artifacts.every((a,i)=>exact(a,['name','id','runId','sha256','entries','crcOk'])&&
      a.name===H11_ARTIFACTS[i][0]&&a.id===H11_ARTIFACTS[i][1]&&
      a.runId===H11_ARTIFACTS[i][2]&&a.sha256===H11_ARTIFACTS[i][3]&&
      a.entries===H11_ARTIFACTS[i][4]&&a.crcOk===true))
    errors.push('H10 independently downloaded ZIP evidence mismatch');
  if(packet.trustRoot!=='UNCONFIGURED'||packet.operatorKeysRegistered!==false||
    !Array.isArray(packet.externalPackets)||packet.externalPackets.length||
    !Array.isArray(packet.signerEpochs)||packet.signerEpochs.length||
    !Array.isArray(packet.revocations)||packet.revocations.length||
    !Array.isArray(packet.replayLedger)||packet.replayLedger.length||
    !Array.isArray(packet.externalReviewers)||packet.externalReviewers.length)
    errors.push('Cannot provision roots, signers, reviewers or external evidence from CI');
  if(!Array.isArray(packet.provenance)||packet.provenance.length!==domains.length||
    !packet.provenance.every((x,i)=>exact(x,['domain','status','sourceSha256','objectSha256','rightsSha256','proofSha256'])&&
      x.domain===domains[i]&&x.status==='UNVERIFIED'&&
      [x.sourceSha256,x.objectSha256,x.rightsSha256,x.proofSha256].every(v=>v===null)))
    errors.push('Source, rights, CDN, PWA, recovery and device provenance must be unverified');
  if(!Array.isArray(packet.humanGates)||packet.humanGates.length!==gates.length||
    !packet.humanGates.every((x,i)=>exact(x,['gate','status','reviewer','proofSha256'])&&
      x.gate===gates[i]&&x.status==='OPEN'&&x.reviewer===null&&x.proofSha256===null))
    errors.push('Human gate status cannot be self-approved');
  if(!exact(packet.decisions,['release','rollback','merge','deploy','migration','purge'])||
    packet.decisions.release!=='NO_GO'||packet.decisions.rollback!=='NOT_EXECUTED'||
    [packet.decisions.merge,packet.decisions.deploy,packet.decisions.migration,packet.decisions.purge].some(Boolean))
    errors.push('Live release, rollback and destructive operations denied');
  return {valid:errors.length===0,errors,parentHead:H11_PARENT,checkedWorkflows:H11_CHECKS.length,
    checkedZipArchives:H11_ARTIFACTS.length,unverifiedDomains:domains,openHumanGates:gates,
    decision:'NO_GO',releaseAllowed:false,rollbackAllowed:false,mergeAllowed:false,deployAllowed:false};
}

// Externally governed trust handoff. A synthetic test key cannot register itself.
// H9/H10 verify signatures, rotation, revocation and terminal compromise, and H11
// requires every epoch fingerprint to be separately pinned by a caller.
export function verifyH11TrustHandoff(events,options={}){
  const result=reconcileH10Custody(events,options);
  return {...result,trustRootInstalled:false,operatorAuthorityEstablished:false,
    releaseAllowed:false,decision:'NO_GO'};
}

const FIELDS=['schemaVersion','repository','subjectHead','domain','observation','signerKeyId',
  'witnessKeyId','epoch','sequence','previousDigest','sourceSha256','objectSha256',
  'rightsSha256','proofSha256','objectBytes','observedAt','expiresAt','nonce'];
export const canonicalH11Packet=p=>JSON.stringify(Object.fromEntries(FIELDS.map(k=>[k,p[k]])));
export const h11ReceiptDigest=e=>sha(JSON.stringify({payload:JSON.parse(canonicalH11Packet(e.payload)),
  operatorSignature:e.operatorSignature,witnessSignature:e.witnessSignature}));

// Caller must independently supply pinned epoch keys, role and compromise/revocation
// chronology. Receipts reference evidence only: no URLs, PII, bearer tokens or raw
// protected objects. Cryptographic validity alone NEVER establishes genuine source,
// hardware, assistive technology, license rights, or acceptance.
export function inspectH11ExternalPackets(envelopes,{
  epoch,signerKeyId,witnessKeyId,operatorSpkiPem,witnessSpkiPem,
  independentPins=[],operatorRole,witnessRole,
  revokedAt=null,compromisedAt=null,priorNonceDigests=[],previousDigest='0'.repeat(64),
  nowMs=Date.now(),objectBytesByDigest={}
}={}){
  const errors=[],outcomes=[];
  if(!Array.isArray(envelopes)||envelopes.length<1||envelopes.length>32)
    errors.push('Nonempty bounded packet batch required');
  if(!Number.isSafeInteger(epoch)||epoch<1||epoch>100000||
    !KEY.test(signerKeyId??'')||!KEY.test(witnessKeyId??'')||signerKeyId===witnessKeyId||
    witnessRole!=='evidence-witness'||!Number.isSafeInteger(nowMs)||
    !HEX.test(previousDigest)||!Array.isArray(independentPins)||independentPins.length!==2||
    new Set(independentPins).size!==2||independentPins.some(v=>!HEX.test(v))||
    !Array.isArray(priorNonceDigests)||new Set(priorNonceDigests).size!==priorNonceDigests.length||
    priorNonceDigests.some(v=>!HEX.test(v))||
    (revokedAt!==null&&!utc(revokedAt))||(compromisedAt!==null&&!utc(compromisedAt))||
    !plain(objectBytesByDigest))
    errors.push('Missing independent epoch registry, roles or replay chronology');
  let signer=null,witness=null;
  try{
    signer=createPublicKey(operatorSpkiPem);
    witness=createPublicKey(witnessSpkiPem);
    if(signer.asymmetricKeyType!=='ed25519'||witness.asymmetricKeyType!=='ed25519'||
      spkiSha256(operatorSpkiPem)===spkiSha256(witnessSpkiPem)||
      !independentPins.includes(spkiSha256(operatorSpkiPem))||
      !independentPins.includes(spkiSha256(witnessSpkiPem)))
      errors.push('Keys not independently pinned to distinct Ed25519 roles');
  }catch{errors.push('Missing independently provisioned public keys');}
  const nonces=new Set(priorNonceDigests);
  let last=previousDigest,lastTime=-Infinity;
  if(Array.isArray(envelopes))for(const [index,envelope] of envelopes.entries()){
    const p=envelope?.payload,issues=[];
    if(!exact(envelope,['payload','operatorSignature','witnessSignature'])||
      !exact(p,FIELDS)||p.schemaVersion!==1||p.repository!=='thiepn/thiepn.github.io'||
      p.subjectHead!==H11_PARENT||!domains.includes(p.domain)||
      !observations[p.domain]?.includes(p.observation)||
      p.signerKeyId!==signerKeyId||p.witnessKeyId!==witnessKeyId||
      p.epoch!==epoch||p.sequence!==index+1||
      p.previousDigest!==last||
      [p.sourceSha256,p.objectSha256,p.rightsSha256,p.proofSha256].some(v=>!HEX.test(v))||
      !Number.isSafeInteger(p.objectBytes)||p.objectBytes<1||p.objectBytes>50_000_000||
      !utc(p.observedAt)||!utc(p.expiresAt)||!NONCE.test(p.nonce)||
      !SIG.test(envelope.operatorSignature)||!SIG.test(envelope.witnessSignature))
      issues.push('Malformed, unsigned, private or misbound source receipt');
    else {
      const nonceDigest=sha(p.nonce),when=Date.parse(p.observedAt),expiry=Date.parse(p.expiresAt);
      if(nonces.has(nonceDigest))issues.push('Replay nonce');
      nonces.add(nonceDigest);
      if(when<lastTime||when>nowMs||when<nowMs-30*86400000||
        expiry<=nowMs||expiry<=when||expiry-when>7*86400000)
        issues.push('Expired, future or nonmonotonic timeline');
      if((revokedAt!==null&&when>=Date.parse(revokedAt))||
        (compromisedAt!==null&&when>=Date.parse(compromisedAt))||
        (compromisedAt!==null&&nowMs>=Date.parse(compromisedAt)))
        issues.push('Revoked or compromised signer epoch');
      if(operatorRole!==H10_DOMAINS[p.domain]||operatorRole===witnessRole)
        issues.push('Signer role lacks domain rights or independent witness');
      const bytes=objectBytesByDigest[p.objectSha256];
      if(bytes!==undefined){
        if(!(Buffer.isBuffer(bytes)||bytes instanceof Uint8Array)||
          bytes.byteLength!==p.objectBytes||sha(bytes)!==p.objectSha256)
          issues.push('Object bytes do not match immutable digest or size');
      }
      if(signer&&witness)try{
        const signed=Buffer.from(canonicalH11Packet(p));
        if(!verify(null,signed,signer,Buffer.from(envelope.operatorSignature,'base64url'))||
          !verify(null,signed,witness,Buffer.from(envelope.witnessSignature,'base64url')))
          issues.push('Detached operator/witness signature mismatch');
      }catch{issues.push('Invalid evidence signature');}
      lastTime=when;
      last=h11ReceiptDigest(envelope);
    }
    outcomes.push({index,domain:domains.includes(p?.domain)?p.domain:null,
      cryptographicallyValid:issues.length===0,reasons:issues,
      objectDigest:HEX.test(p?.objectSha256)?p.objectSha256:null,
      observedHardwareOrRightsAuthenticity:false});
    if(issues.length)errors.push('Packet '+index+': '+issues.join('; '));
  }
  return {valid:errors.length===0,errors,outcomes,
    verifiedSyntheticOrExternalSignatures:outcomes.filter(x=>x.cryptographicallyValid).length,
    endingDigest:last,independentHumanAcceptance:false,sourceRightsApproved:false,
    physicalAccessibilityApproved:false,releaseAllowed:false,rollbackAllowed:false,decision:'NO_GO'};
}
export function prepareH11NoGo(packet){
  const audit=inspectH11Preparation(packet);
  if(!audit.valid)throw Error('H11 source preparation rejected: '+audit.errors.join('; '));
  return {kind:'H11_EXTERNAL_WITNESS_INTAKE_NONEXECUTING',
    qualifiedParentHead:H11_PARENT,checkedWorkflows:8,checkedZipArchives:2,
    signerTrustRoot:'UNCONFIGURED',externalPacketsCollected:0,
    originalRightsAccepted:false,offlineRecoveryAccepted:false,
    realAndroidIosAccepted:false,talkBackVoiceOverAccepted:false,
    openHumanGates:audit.openHumanGates,unverifiedDomains:audit.unverifiedDomains,
    releaseDecision:'NO_GO',rollbackDecision:'NOT_EXECUTED',
    mergeAllowed:false,deployAllowed:false,migrationAllowed:false,purgeAllowed:false};
}
