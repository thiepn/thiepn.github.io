import {validAccountId} from '../hub-auth';
import {MAX_HOME_DOCUMENT_BYTES} from './home-store';
import {validateHomeDocument, type HomeDocumentV2} from './home-document';
import type {PendingHomeEdit} from './home-indexeddb';

// H16 is a usable local status/recovery preflight, not a Core endpoint.
// No remote response, caller-supplied proof or browser grant can certify OAuth,
// a cloud upload, an encrypted restore, or a release.
export type HomeLocalSyncState = 'checking' | 'unavailable' | 'guest' |
  'legacy' | 'storage-error' | 'local' | 'local-pending';
export interface HomeSyncStatus {
  code: HomeLocalSyncState;
  message: string;
  cloudSynced: false;
}
export function describeLocalHomeSync(
  identity: 'checking' | 'unavailable' | 'signed-out' | 'signed-in',
  pending: readonly PendingHomeEdit[] | null,
  storage: 'indexeddb' | 'legacy-only' | 'error' | 'loading',
): HomeSyncStatus {
  if (identity === 'checking') return {code:'checking',message:'Checking Home ownership; no cloud copy has been verified.',cloudSynced:false};
  if (identity === 'unavailable') return {code:'unavailable',message:'Account verification unavailable. Home sync is disabled.',cloudSynced:false};
  if (identity === 'signed-out') return {code:'guest',message:'Guest Home preferences stay in this browser. They do not sync to an account.',cloudSynced:false};
  if (storage === 'error' || (storage === 'indexeddb' && pending === null)) return {
    code:'storage-error',message:'Local Home history could not be checked. No cloud backup is available.',cloudSynced:false,
  };
  if (storage !== 'indexeddb') return {code:'legacy',
    message:'Home is stored in this browser only. Durable sync and cloud recovery are not enabled.',cloudSynced:false};
  const batches = pending?.length ?? 0;
  if (batches) return {code:'local-pending',
    message:`${batches} local revision ${batches === 1 ? 'batch' : 'batches'} awaiting a verified Core sync service. Nothing has been uploaded.`,
    cloudSynced:false};
  return {code:'local',message:'Home is saved on this device only. Cross-device sync and cloud recovery are not enabled.',cloudSynced:false};
}
export interface HomeRecoveryCandidate {
  ownerId: string;
  remoteRevision: string;
  document: unknown;
}
export interface HomeRecoveryInspection {
  state: 'INVALID_OWNER' | 'UNTRUSTED_REMOTE' | 'INVALID_REMOTE_DOCUMENT' |
    'SAME_CONTENT_REVIEW_ONLY' | 'DIVERGENT_REVIEW_REQUIRED';
  errors: string[];
  hasLocalUnsentChanges: boolean;
  safeForAutomaticApply: false;
  cloudSyncVerified: false;
  actualEncryptedRestoreVerified: false;
  ownerApprovalGranted: false;
  releaseAllowed: false;
}
// Strictly passive: inspect an independently supplied candidate without applying it.
// In particular, a string that resembles an owner ID or a remote revision is not
// a substitute for Core-side RLS, authenticated access or a trusted revision CAS.
export function inspectHomeRecoveryCandidate({
  owner, authenticatedOwner, local, pending, remote,
}:{
  owner: string | null;
  authenticatedOwner: string | null;
  local: HomeDocumentV2;
  pending: readonly PendingHomeEdit[];
  remote: HomeRecoveryCandidate | null;
}): HomeRecoveryInspection {
  const errors:string[] = [];
  const hasLocalUnsentChanges = Array.isArray(pending) && pending.length > 0;
  const result=(state:HomeRecoveryInspection['state']):HomeRecoveryInspection=>({
    state,errors,hasLocalUnsentChanges,safeForAutomaticApply:false,cloudSyncVerified:false,
    actualEncryptedRestoreVerified:false,ownerApprovalGranted:false,releaseAllowed:false,
  });
  if(!validAccountId(owner)||!validAccountId(authenticatedOwner)||
    owner.toLowerCase()!==authenticatedOwner.toLowerCase()||
    !Array.isArray(pending)||pending.length>32||
    pending.some(p=>!p || !Number.isSafeInteger(p.fromRevision)||!Number.isSafeInteger(p.toRevision)||
      p.fromRevision<0||p.toRevision<=p.fromRevision||!Number.isFinite(p.savedAt)||
      typeof p.coalesced!=='boolean')||!validateHomeDocument(local).valid) {
    errors.push('Owner is not verified for this HomeDocument or local state is invalid.');
    return result('INVALID_OWNER');
  }
  if(!remote || typeof remote!=='object'||Array.isArray(remote)||
    Object.keys(remote).sort().join(',')!=='document,ownerId,remoteRevision'||
    !validAccountId(remote.ownerId) || remote.ownerId.toLowerCase()!==owner.toLowerCase()||
    typeof remote.remoteRevision!=='string'||!/^[a-f0-9]{64}$/i.test(remote.remoteRevision)) {
    errors.push('Remote owner or revision is missing, untrusted or belongs to another user.');
    return result('UNTRUSTED_REMOTE');
  }
  let raw:string;
  try{raw=JSON.stringify(remote.document);}catch {errors.push('Remote document is not serializable.');return result('INVALID_REMOTE_DOCUMENT');}
  if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_HOME_DOCUMENT_BYTES||
    !validateHomeDocument(remote.document).valid){
    errors.push('Remote HomeDocument schema or size is invalid.');
    return result('INVALID_REMOTE_DOCUMENT');
  }
  if(JSON.stringify(local)===raw && !hasLocalUnsentChanges)
    return result('SAME_CONTENT_REVIEW_ONLY');
  errors.push(hasLocalUnsentChanges?
    'Unsent local revisions must be reconciled before importing any remote snapshot.':
    'Local and remote layouts differ: independently review provenance and choose recovery explicitly.');
  return result('DIVERGENT_REVIEW_REQUIRED');
}
