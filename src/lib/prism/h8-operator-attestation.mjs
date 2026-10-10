import { createHash, createPublicKey, verify as verifyEd25519 } from 'node:crypto';

// No production trust root is bundled. This module verifies *only* public-key
// signatures pinned independently by a human operator; signed evidence is NOT
// by itself an authorization or a real-world approval.
export const H8_PARENT = '55a2aa4ff3e41971e4bdf538f33be174a87466f1';
export const H8_GATES = Object.freeze({
  'two-owner-oauth-consent':'identity-operator',
  'physical-android-ios':'device-operator',
  'screen-reader-keyboard':'accessibility-operator',
  'device-local-reconsent':'device-operator',
  'security-review':'security-reviewer',
  'prism-visual-owner':'design-owner',
  'release-owner-authorization':'release-owner',
});
const HEX64=/^[a-f0-9]{64}$/;
const KEY_ID=/^[a-z0-9][a-z0-9._-]{3,63}$/;
const SAFE_NONCE=/^[A-Za-z0-9_-]{24,128}$/;
const EXACT_PAYLOAD=['schemaVersion','gateId','subjectHead','keyId','evidenceDigest','observedAt','expiresAt','nonce'];
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const date=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===new Date(x).toISOString();
const sha=x=>createHash('sha256').update(x).digest('hex');
const exact=(input,keys)=>plain(input)&&Object.keys(input).length===keys.length&&keys.every(k=>Object.hasOwn(input,k));
export const canonicalAttestationPayload=value=>JSON.stringify(Object.fromEntries(EXACT_PAYLOAD.map(k=>[k,value[k]])));
export const spkiSha256=pem=>{
  const key=createPublicKey(pem);
  if(key.asymmetricKeyType!=='ed25519')throw new Error('Only Ed25519 operator public keys supported');
  return sha(key.export({type:'spki',format:'der'}));
};
function inspectRegistry(r){
  const errors=[];
  if(!plain(r)||r.schemaVersion!==1||r.repository!=='thiepn/thiepn.github.io'||
    r.qualifyingParentHead!==H8_PARENT) return ['Registry schema/repository/qualified H7 parent mismatch'];
  if(!['UNCONFIGURED','OPERATOR_PINNED'].includes(r.trustRoot)||
    !Array.isArray(r.keys)||!Array.isArray(r.revokedKeyIds)||
    !Array.isArray(r.receipts)||!Array.isArray(r.usedNonceDigests))errors.push('Malformed trust registry');
  if(!Array.isArray(r.gateStates)||r.gateStates.length!==Object.keys(H8_GATES).length||
    !r.gateStates.every((g,i)=>exact(g,['id','status','reviewedBy','proofDigest'])&&
      g.id===Object.keys(H8_GATES)[i]&&g.status==='OPEN'&&g.reviewedBy===null&&g.proofDigest===null))
    errors.push('Missing or fabricated human acceptance');
  if(r.signedReviewsCollected!==0||r.releaseDecision!=='NO_GO'||
    r.publicationAllowed!==false||r.mergeAllowed!==false||r.deployAllowed!==false||
    r.rollbackExecuted!==false||r.operatorTrustRootApproved!==false)
    errors.push('Operator-only release authorization must remain denied');
  if(Array.isArray(r.keys)){
    const ids=new Set();
    for(const key of r.keys){
      if(!exact(key,['keyId','role','spkiPem','validFrom','validUntil','revokedAt'])||
        !KEY_ID.test(key.keyId)||ids.has(key.keyId)||
        !Object.values(H8_GATES).includes(key.role)||!date(key.validFrom)||!date(key.validUntil)||
        Date.parse(key.validFrom)>=Date.parse(key.validUntil)||
        (key.revokedAt!==null&&!date(key.revokedAt)))errors.push('Invalid or duplicate operator key metadata');
      else ids.add(key.keyId);
    }
  }
  if(Array.isArray(r.revokedKeyIds)&&
    (new Set(r.revokedKeyIds).size!==r.revokedKeyIds.length||
    r.revokedKeyIds.some(x=>!KEY_ID.test(x))))errors.push('Invalid key revocations');
  if(Array.isArray(r.usedNonceDigests)&&(new Set(r.usedNonceDigests).size!==r.usedNonceDigests.length||
    r.usedNonceDigests.some(x=>typeof x!=='string'||!HEX64.test(x))))errors.push('Invalid anti-replay ledger');
  if(r.trustRoot==='UNCONFIGURED'&&
    (r.keys?.length||r.revokedKeyIds?.length||r.receipts?.length||r.usedNonceDigests?.length))
    errors.push('Unconfigured registry cannot contain claimed operator evidence');
  return errors;
}
export function evaluateH8Attestations(registry, {trustedSpkiDigests=[], nowMs=Date.now(), priorNonceDigests=[]}={}){
  const errors=inspectRegistry(registry);
  if(!Array.isArray(trustedSpkiDigests)||trustedSpkiDigests.some(x=>typeof x!=='string'||!HEX64.test(x))||
    new Set(trustedSpkiDigests).size!==trustedSpkiDigests.length||
    !Array.isArray(priorNonceDigests)||priorNonceDigests.some(x=>typeof x!=='string'||!HEX64.test(x))||
    !Number.isSafeInteger(nowMs))errors.push('Invalid independently pinned trust or replay inputs');
  const trusted=new Set(Array.isArray(trustedSpkiDigests)?trustedSpkiDigests:[]);
  const seen=new Set(Array.isArray(priorNonceDigests)?priorNonceDigests:[]);
  for(const hash of registry?.usedNonceDigests??[])seen.add(hash);
  const outcomes=[];
  if(Array.isArray(registry?.receipts))for(const receipt of registry.receipts){
    const reasons=[];
    const payload=receipt?.payload;
    if(!exact(receipt,['payload','signature'])||
      !exact(payload,EXACT_PAYLOAD)||payload.schemaVersion!==1||
      !Object.hasOwn(H8_GATES,payload.gateId)||payload.subjectHead!==H8_PARENT||
      !KEY_ID.test(payload.keyId)||!HEX64.test(payload.evidenceDigest)||
      !date(payload.observedAt)||!date(payload.expiresAt)||!SAFE_NONCE.test(payload.nonce)||
      typeof receipt.signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(receipt.signature)) {
      reasons.push('Malformed privacy-minimal signed evidence');
    } else {
      const nonceHash=sha(payload.nonce);
      if(seen.has(nonceHash))reasons.push('Replay or previously consumed nonce');
      seen.add(nonceHash);
      const obs=Date.parse(payload.observedAt),expires=Date.parse(payload.expiresAt);
      if(obs>nowMs||obs<nowMs-30*86400000||expires<=nowMs||expires<=obs||
        expires-obs>7*86400000)reasons.push('Expired, future, stale or overlong attestation');
      const key=registry.keys?.find(x=>x.keyId===payload.keyId);
      if(!key)reasons.push('Unknown operator key');
      else {
        if(key.role!==H8_GATES[payload.gateId])reasons.push('Operator scope mismatch');
        if(registry.revokedKeyIds?.includes(key.keyId)||key.revokedAt!==null)
          reasons.push('Revoked operator signer');
        if(!date(key.validFrom)||!date(key.validUntil)||
          obs<Date.parse(key.validFrom)||obs>=Date.parse(key.validUntil)||
          nowMs>=Date.parse(key.validUntil))reasons.push('Signer expired or not yet valid');
        try{
          const keyObject=createPublicKey(key.spkiPem);
          if(keyObject.asymmetricKeyType!=='ed25519'||!trusted.has(spkiSha256(key.spkiPem)))
            reasons.push('Unpinned or incompatible operator signing key');
          else if(!verifyEd25519(null,Buffer.from(canonicalAttestationPayload(payload)),
            keyObject,Buffer.from(receipt.signature,'base64url')))
            reasons.push('Attestation signature does not verify');
        }catch{reasons.push('Invalid operator public key or signature');}
      }
    }
    const gateId=typeof payload?.gateId==='string'&&Object.hasOwn(H8_GATES,payload.gateId)?payload.gateId:null;
    outcomes.push({gateId,cryptographicallyVerified:reasons.length===0,
      reasons,evidenceDigest:typeof payload?.evidenceDigest==='string'&&HEX64.test(payload.evidenceDigest)?payload.evidenceDigest:null});
  }
  if(registry?.trustRoot==='OPERATOR_PINNED'&&trusted.size===0)
    errors.push('No independently pinned operator trust root');
  if(registry?.trustRoot==='UNCONFIGURED'&&trusted.size>0)
    errors.push('Cannot activate unconfigured trust root through caller input');
  return {valid:errors.length===0&&outcomes.every(x=>x.cryptographicallyVerified),
    errors,receipts:outcomes,validatedReceipts:outcomes.filter(x=>x.cryptographicallyVerified).length,
    openGates:Object.keys(H8_GATES),signoffsApproved:0,
    evidenceReviewOnly:true,releaseDecision:'NO_GO',releaseAllowed:false,
    mergeAllowed:false,deployAllowed:false,rollbackExecuted:false};
}
export function prepareH8NonexecutingDecision(registry){
  const audit=evaluateH8Attestations(registry,{trustedSpkiDigests:[]});
  if(!audit.valid||audit.validatedReceipts!==0||
    registry.trustRoot!=='UNCONFIGURED')throw new Error('H8 evidence registry requires independent operator trust provisioning');
  return {kind:'H8_OFFLINE_EVIDENCE_INTAKE_REHEARSAL',
    qualifyingParentHead:H8_PARENT,trustRootStatus:'UNCONFIGURED',
    signaturesCollected:0,realDeviceEvidenceCollected:false,operatorApproved:false,
    openGates:audit.openGates,decision:'NO_GO',publicationAllowed:false,
    mergeAllowed:false,deployAllowed:false,rollbackExecuted:false};
}
