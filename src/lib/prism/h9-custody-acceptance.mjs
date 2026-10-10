import { createHash, createPublicKey, verify } from 'node:crypto';
import { spkiSha256, H8_GATES } from './h8-operator-attestation.mjs';

// PINNED from independently checked GitHub CI logs, ZIP CRC and SHA-256;
// these constants do not authenticate real-world operator or asset acceptance.
export const H9_PARENT='ed5dfe10be6aadf1575ae37ce28d49e22d4d4855';
export const H9_MERGE='621fe28ef7da23e9575271314176844a397659bb';
export const H9_WORKFLOWS=Object.freeze([
  ['Quality',38035724066],['Hub Account integration',38035724236],
  ['Hub device Library browsers',38035724201],
  ['Hub Notes Inbox browsers',38035724026],
  ['Hub Notes capture browsers',38035724056],
  ['Hub managed Notes browsers',38035724101],
  ['Hub managed TMS60 browsers',38035724036],
  ['Hub Notes integration',38035724132],
]);
const ARTIFACTS=Object.freeze([
  ['studio-certification',11663852738,38035724066,'28f977b05a05b209d0c74f517812a468ef86ec1da37d7fe27d2ef5c824844d4e'],
  ['hub-notes-contract-evidence',11664191649,38035724132,'f3983595a0dd738382dbfc24174f7862eb31c4ad4b0cd4e734633d300a2565d9'],
]);
export const H9_SURFACES=Object.freeze([
  'original-source-objects','content-rights-and-licenses','cdn-cache-and-rollback',
  'pwa-service-worker-provenance','offline-data-recovery',
]);
const KEYS=Object.keys(H8_GATES);
const HEX=/^[0-9a-f]{64}$/;
const SHA=/^[0-9a-f]{40}$/;
const KEY_ID=/^[a-z][a-z0-9._-]{3,63}$/;
const NONCE=/^[A-Za-z0-9_-]{24,128}$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(o,fields)=>plain(o)&&Object.keys(o).length===fields.length&&fields.every(k=>Object.hasOwn(o,k));
const digest=x=>createHash('sha256').update(x).digest('hex');
const utc=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
  Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
const FIELDS=['sequence','previousDigest','action','signerKeyId','nextKeyId','nextSpkiPem','observedAt','nonce'];
export const canonicalH9CustodyEvent=e=>JSON.stringify(Object.fromEntries(FIELDS.map(k=>[k,e[k]])));
export const h9EventDigest=e=>digest(JSON.stringify({
  payload:JSON.parse(canonicalH9CustodyEvent(e.payload)),
  signerSignature:e.signerSignature,witnessSignature:e.witnessSignature,
}));
const ENVELOPE=['payload','signerSignature','witnessSignature'];
export function inspectH9SourcePacket(packet){
  const errors=[];
  if(!plain(packet)||packet.schemaVersion!==1||packet.repository!=='thiepn/thiepn.github.io')
    return {valid:false,errors:['Repository or schema mismatch'],decision:'NO_GO',releaseAllowed:false};
  const p=packet.parentH8;
  if(!plain(p)||p.pr!==102||p.head!==H9_PARENT||p.base!=='55a2aa4ff3e41971e4bdf538f33be174a87466f1'||
    p.testedPrMergeTree!==H9_MERGE)errors.push('Unqualified H8 source head or PR merge tree');
  if(!Array.isArray(p?.checks)||p.checks.length!==H9_WORKFLOWS.length||
    !p.checks.every((c,i)=>exact(c,['name','runId','result','url'])&&
      c.name===H9_WORKFLOWS[i][0]&&c.runId===H9_WORKFLOWS[i][1]&&c.result==='success'&&
      c.url===`https://github.com/thiepn/thiepn.github.io/actions/runs/${c.runId}`))
    errors.push('Tampered exact-head CI or missing mandatory workflow');
  if(!Array.isArray(p?.artifacts)||p.artifacts.length!==ARTIFACTS.length||
    !p.artifacts.every((a,i)=>exact(a,['kind','id','runId','digest','crcOk'])&&
      a.kind===ARTIFACTS[i][0]&&a.id===ARTIFACTS[i][1]&&
      a.runId===ARTIFACTS[i][2]&&a.digest===ARTIFACTS[i][3]&&a.crcOk===true))
    errors.push('Unverified original Quality/Notes archive provenance');
  if(packet.operatorTrustRoot!=='UNCONFIGURED'||packet.signerContinuity!=='UNESTABLISHED'||
    !Array.isArray(packet.custodyEvents)||packet.custodyEvents.length!==0||
    !Array.isArray(packet.compromiseEvents)||packet.compromiseEvents.length!==0||
    !Array.isArray(packet.witnessReceipts)||packet.witnessReceipts.length!==0||
    !Array.isArray(packet.replayLedger)||packet.replayLedger.length!==0)
    errors.push('Unexpected operator trust, signed chain or replay ledger');
  if(!Array.isArray(packet.sourceSurfaces)||packet.sourceSurfaces.length!==H9_SURFACES.length||
    !packet.sourceSurfaces.every((x,i)=>exact(x,['id','status','sourceSha','objectDigest','rightsDigest','cdnDigest','offlineDigest','proofUri'])&&
      x.id===H9_SURFACES[i]&&x.status==='UNVERIFIED'&&
      [x.sourceSha,x.objectDigest,x.rightsDigest,x.cdnDigest,x.offlineDigest,x.proofUri].every(v=>v===null)))
    errors.push('Unsupported immutable object, rights, CDN, PWA or offline acceptance claim');
  if(!Array.isArray(packet.operatorGates)||packet.operatorGates.length!==KEYS.length||
    !packet.operatorGates.every((x,i)=>exact(x,['id','status','proofDigest','reviewer','device','observedAt'])&&
      x.id===KEYS[i]&&x.status==='OPEN'&&[x.proofDigest,x.reviewer,x.device,x.observedAt].every(v=>v===null)))
    errors.push('Missing or fabricated physical/human approval');
  if(packet.realDeviceAcceptance!=='NOT_COLLECTED'||packet.decision!=='NO_GO'||
    packet.mergeAllowed!==false||packet.publicationAllowed!==false||
    packet.deployAllowed!==false||packet.rollbackExecuted!==false)
    errors.push('Operator decision or release actions must remain denied');
  return {valid:errors.length===0,errors,sourceLinkedChecks:H9_WORKFLOWS.length,
    independentlyCheckedArtifacts:ARTIFACTS.length,
    sourceProvenanceOpen:[...H9_SURFACES],operatorApprovalsOpen:[...KEYS],
    decision:'NO_GO',releaseAllowed:false,mergeAllowed:false,deployAllowed:false,
    rollbackExecuted:false};
}

// Synthesized custody events can be exercised with ephemeral independent
// signer+witness keys, but cannot establish trust or human approval.
// Every transition needs two independently pinned Ed25519 keys. Compromise
// irreversibly terminates the chain; compromised keys cannot self-recover.
export function verifyH9WitnessedCustody(events,{
  initialKeyId,initialSpkiPem,witnessSpkiPem,independentPins=[],
  priorEventDigests=[],priorNonceDigests=[],nowMs=Date.now()
}={}){
  const errors=[],outcomes=[];
  if(!Array.isArray(events)||events.length===0||events.length>64)
    errors.push('Bounded nonempty custody chain required');
  if(!KEY_ID.test(initialKeyId??'')||typeof initialSpkiPem!=='string'||
    typeof witnessSpkiPem!=='string'||!Array.isArray(independentPins)||
    independentPins.length!==2||new Set(independentPins).size!==2||
    independentPins.some(x=>!HEX.test(x))||!Number.isSafeInteger(nowMs)||
    !Array.isArray(priorEventDigests)||priorEventDigests.some(x=>!HEX.test(x))||
    !Array.isArray(priorNonceDigests)||priorNonceDigests.some(x=>!HEX.test(x)))
    errors.push('Invalid independent root/witness pins, chronology or replay inputs');
  let signer=null,witness=null;
  try{
    signer=createPublicKey(initialSpkiPem);
    witness=createPublicKey(witnessSpkiPem);
    if(signer.asymmetricKeyType!=='ed25519'||witness.asymmetricKeyType!=='ed25519'||
      signer.export({format:'der',type:'spki'}).equals(witness.export({format:'der',type:'spki'}))||
      !independentPins.includes(spkiSha256(initialSpkiPem))||
      !independentPins.includes(spkiSha256(witnessSpkiPem)))
      errors.push('Signer and independent witness are not separately trusted');
  }catch{errors.push('Invalid source or independent witness public key');}
  const used=new Set(priorEventDigests);
  const nonces=new Set(priorNonceDigests);
  const ids=new Set([initialKeyId]);
  let activeKeyId=initialKeyId,previousDigest='0'.repeat(64),previousTime=-Infinity,terminated=false;
  if(Array.isArray(events))for(const [i,item] of events.entries()){
    const reasons=[],p=item?.payload;
    if(!exact(item,ENVELOPE)||!exact(p,FIELDS)||p.sequence!==i+1||
      p.previousDigest!==previousDigest||!['rotate','revoke','compromise'].includes(p.action)||
      p.signerKeyId!==activeKeyId||!utc(p.observedAt)||!NONCE.test(p.nonce)||
      (p.action==='rotate'?(!KEY_ID.test(p.nextKeyId)||typeof p.nextSpkiPem!=='string'||ids.has(p.nextKeyId)):
        p.nextKeyId!==null||p.nextSpkiPem!==null)||
      typeof item?.signerSignature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(item.signerSignature)||
      typeof item?.witnessSignature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(item.witnessSignature))
      reasons.push('Malformed, out-of-sequence, or unsigned custody transition');
    else {
      const t=Date.parse(p.observedAt),n=digest(p.nonce);
      const itemHash=h9EventDigest(item);
      if(used.has(itemHash)||nonces.has(n))reasons.push('Replayed custody transition or nonce');
      used.add(itemHash);nonces.add(n);
      if(t<=previousTime||t>nowMs||t<nowMs-30*86400000)
        reasons.push('Out-of-order, future or stale custody chronology');
      if(terminated)reasons.push('Revoked/compromised signer cannot recover its own chain');
      if(signer&&witness)try{
        const bytes=Buffer.from(canonicalH9CustodyEvent(p));
        if(!verify(null,bytes,signer,Buffer.from(item.signerSignature,'base64url'))||
          !verify(null,bytes,witness,Buffer.from(item.witnessSignature,'base64url')))
          reasons.push('Signer or independent witness signature invalid');
      }catch{reasons.push('Invalid signer or witness signature');}
      if(p.action==='rotate'&&reasons.length===0){
        try{
          const next=createPublicKey(p.nextSpkiPem);
          if(next.asymmetricKeyType!=='ed25519'||spkiSha256(p.nextSpkiPem)===spkiSha256(witnessSpkiPem)||
            ids.has(p.nextKeyId))reasons.push('Untrusted or duplicate successor signer');
          else{signer=next;activeKeyId=p.nextKeyId;ids.add(p.nextKeyId);}
        }catch{reasons.push('Invalid rotated operator key');}
      }
      if(reasons.length===0){
        previousTime=t;
        previousDigest=itemHash;
        if(p.action!=='rotate')terminated=true;
      }
    }
    outcomes.push({sequence:i+1,kind:typeof p?.action==='string'?p.action:null,
      accepted:reasons.length===0,reasons});
    if(reasons.length)errors.push(`Transition ${i+1} rejected: ${reasons.join(', ')}`);
  }
  return {valid:errors.length===0,errors,transitions:outcomes,
    witnessedTransitions:outcomes.filter(x=>x.accepted).length,
    terminated,operatorApproval:false,publicationAllowed:false,decision:'NO_GO'};
}

export function rehearseH9DeniedDecision(packet){
  const audit=inspectH9SourcePacket(packet);
  if(!audit.valid)throw new Error(`Invalid H9 custody/acceptance source: ${audit.errors.join('; ')}`);
  return {kind:'H9_NONEXECUTING_CUSTODY_ACCEPTANCE_REHEARSAL',
    qualifyingParentHead:H9_PARENT,sourceLinkedChecks:audit.sourceLinkedChecks,
    independentlyCheckedArtifacts:audit.independentlyCheckedArtifacts,
    custodyTrust:'UNCONFIGURED',verifiedRealSignatures:0,
    originalSourceAndRightsApproved:false,cdnPwaOfflineApproved:false,
    operatorGatesOpen:audit.operatorApprovalsOpen,sourceProvenanceOpen:audit.sourceProvenanceOpen,
    releaseDecision:'NO_GO',publicationAllowed:false,mergeAllowed:false,
    deployAllowed:false,rollbackExecuted:false};
}
