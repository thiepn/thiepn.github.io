/**
 * R12: a PURE, source-only, signed-candidate-record inspector.
 * NEVER executes CI, fetches Account, creates tokens, trusts public PR input,
 * asserts GitHub/Azure setup, or grants authorization.
 * Trusted execution MUST implement its own outside-repository custody checks.
 */
import { verify as verifySignature } from 'node:crypto';

export const FIXED_SUITES = Object.freeze({
  'hub-integration.yml': ['19abe54a605ee7fe121d91e4b5cbef0f0b74763b', 'playwright.hub-account.config.ts'],
  'hub-notes-browser.yml': ['19abe54a605ee7fe121d91e4b5cbef0f0b74763b', 'playwright.hub-notes.config.ts'],
  'hub-tms60-browser.yml': ['19abe54a605ee7fe121d91e4b5cbef0f0b74763b', 'playwright.hub-tms60.config.ts'],
  'hub-inbox-browser.yml': ['5b426c40e9e174c11c36604c1ef2c18a6aa155d8', 'playwright.hub-inbox.config.ts'],
  'hub-capture-browser.yml': ['676413adfeef68f50e2bae95364fd43afbb6b497', 'playwright.hub-capture.config.ts'],
  'hub-workflows-browser.yml': ['9cddcbcdb36e6260be3761ae35b221b1a7b8e271', 'playwright.hub-workflows.config.ts'],
});
export const FIXED_EXTERNAL = Object.freeze({
  'h15-tms60':'21d733b015f12a7c58e0d1728ef9edf5fa30a074',
  'h20-tms60':'3ecc39eb517f6cd4d4171046e376fc4108f928c6',
  'h20-library':'77058023894f4d7935c79e291a5dba7daacb8666',
});
export const INSPECTION_ONLY = 'STATIC_INSPECTION_ONLY_NO_EXECUTION';
const SHA=/^[0-9a-f]{40}$/;
const hasOwn=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const record=v=>!!v && typeof v==='object'&&!Array.isArray(v);
export function canonical(value) {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (record(value)) return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
function exactKeys(value, keys) {
  return record(value)&&Object.keys(value).length===keys.length&&keys.every(k=>hasOwn(value,k));
}
function checkedPins(pins,expected,err,field) {
  if (!exactKeys(pins,Object.keys(expected))) {err.push(field+': missing/extra pins');return;}
  for (const [k,v] of Object.entries(expected)) {
    if (canonical(pins[k])!==canonical(v))err.push(field+': pin mismatch '+k);
  }
}
/**
 * recordJson is the exact, signed UTF-8 JSON string; caller must NOT deserialize
 * then re-serialize/re-sign it. trustedPublicKeyPem must come from a separately
 * owner-verified trust root, never the public candidate or signed payload.
 * observedSha values must come from an independent Git object inspection.
 * consumedNonces is an external authoritative array; no replay protection is
 * claimed without an actual persistent, atomic owner-controlled nonce store.
 */
export function inspectSignedAdmission({recordJson,signatureBase64,trustedPublicKeyPem,observed,consumedNonces,nowMs}={}) {
  const errors=[];
  const fail=message=>errors.push(message);
  let authorization;
  try {authorization=JSON.parse(recordJson);}catch{fail('authorization JSON invalid');}
  if (typeof recordJson!=='string'||!recordJson.length)fail('signed bytes missing');
  if (typeof trustedPublicKeyPem!=='string'||!trustedPublicKeyPem.includes('BEGIN PUBLIC KEY'))fail('external trust root missing');
  if (typeof signatureBase64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(signatureBase64))fail('signature invalid');
  if (errors.length===0) {
    try {
      const sig=Buffer.from(signatureBase64,'base64');
      if (sig.length!==64||!verifySignature(null,Buffer.from(recordJson,'utf8'),trustedPublicKeyPem,sig))fail('signature verification failed');
    }catch{fail('signature verification failed');}
  }
  const keys=['schemaVersion','purpose','candidateSha','trustedRunnerSha','ownerId','reviewerId','issuedAt','expiresAt','nonce','suitePins','externalPins'];
  if (!exactKeys(authorization,keys))fail('authorization schema invalid');
  else {
    if(authorization.schemaVersion!==1||authorization.purpose!=='THIEPN_HUB_CI_PRIVATE_TEST_REVIEW_ONLY')fail('authorization purpose invalid');
    if(!SHA.test(authorization.candidateSha)||!SHA.test(authorization.trustedRunnerSha))fail('candidate or runner SHA invalid');
    if(typeof authorization.ownerId!=='string'||!authorization.ownerId.trim()||typeof authorization.reviewerId!=='string'||!authorization.reviewerId.trim()||authorization.ownerId===authorization.reviewerId)fail('separate named owner and reviewer required');
    const issued=Date.parse(authorization.issuedAt), expires=Date.parse(authorization.expiresAt);
    if (!Number.isFinite(nowMs)||!Number.isFinite(issued)||!Number.isFinite(expires)||issued>nowMs||nowMs>=expires||expires-issued>15*60*1000||expires<=issued)fail('record expired, future-dated, or >15 minutes');
    if(typeof authorization.nonce!=='string'||!/^[a-zA-Z0-9_-]{20,128}$/.test(authorization.nonce))fail('nonce format invalid');
    if(!Array.isArray(consumedNonces))fail('external replay ledger missing');
    else if(consumedNonces.includes(authorization.nonce))fail('replayed nonce');
    checkedPins(authorization.suitePins,FIXED_SUITES,errors,'suitePins');
    checkedPins(authorization.externalPins,FIXED_EXTERNAL,errors,'externalPins');
    if (!record(observed)||!SHA.test(observed.candidateSha)||!SHA.test(observed.trustedRunnerSha))fail('independent exact HEAD evidence missing');
    else if(observed.candidateSha!==authorization.candidateSha||observed.trustedRunnerSha!==authorization.trustedRunnerSha)fail('approved and independently observed SHAs differ');
  }
  // A valid signature is not an execution entitlement: protected resource checks,
  // reviewer identity, runner isolation and atomic nonce custody are external.
  return {status:INSPECTION_ONLY,recordConsistent:errors.length===0,executionAllowed:false,errors};
}
