import {createHash} from 'node:crypto';
import {H11_GATES} from './h11-external-witness-intake.mjs';
import {H12_OBSERVATIONS} from './h12-multiparty-reconciliation.mjs';

// External packets are self-reported references, not proof of a real device,
// an authorized reviewer, legal rights, recovered bytes or a release decision.
// No private originals or bearer credentials are ever read by this module.
export const H15_PARENT='026e57a1d695dcba320398cdfbdfa8e4527346d9';
export const H15_RUNS=Object.freeze([38071760957,38071760988,38071760971,
 38071760968,38071760964,38071760986,38071761034,38071760970]);
export const H15_ARCHIVES=Object.freeze([
 {id:11677436357,sha256:'103c565db225fc20bddc7317118e0f576bd300d55dd6c84d88ec05ed1ba87cad',entries:54},
 {id:11676519576,sha256:'2ddffda1374202da9559dd2eab9e9c6d781dfedf8a9d6180190daddc24663364',entries:1},
]);
const HEX=/^[0-9a-f]{64}$/;
const ID=/^[a-z][a-z0-9-]{7,63}$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const exact=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const utc=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
const hash=s=>createHash('sha256').update(s).digest('hex');
const DENY=Object.freeze({precutover:'NO_GO',postrelease:'NOT_REQUESTED',
 releaseAllowed:false,rollbackAllowed:false,mergeAllowed:false,deployAllowed:false,
 migrationAllowed:false,purgeAllowed:false,rollbackExecuted:false});
const rootFields=['schemaVersion','repository','phase','qualifiedH14','recordedAt',
 'observations','recoveryWitnesses','ownerDockets'];
const observationFields=['id','kind','ownerScopeDigest','sessionDigest','captureDigest',
 'witnessDigest','observerDigest','observedAt','outcome'];
const recoveryFields=['id','ownerScopeDigest','objectKeyDigest','sourceVersionDigest',
 'originalBytesDigest','priorStableDigest','backupCiphertextDigest','restoredBytesDigest',
 'witnessDigest','observedAt','outcome'];
const docketFields=['kind','ownerRole','ownerScopeDigest','intentDigest','rightsReceiptDigest',
 'priorStableReceiptDigest','custodianDigest','requestedAt','decision'];
function timestamp(s,nowMs){
 return utc(s)&&Date.parse(s)<=nowMs&&Date.parse(s)>=nowMs-90*86400000;
}
function conflict(type,first,second){
 return {type,firstIndex:first,secondIndex:second,disposition:'HUMAN_REVIEW_REQUIRED'};
}
export function reconcileH15ExternalIntake(packet,{nowMs=Date.now(),priorPacketDigests=[]}={}){
 const errors=[],conflicts=[],covered=new Set(),seenIds=new Set(),seenWitnesses=new Map();
 const byKind=new Map(),byObject=new Map(),byDocket=new Map();
 if(!exact(packet,rootFields)||packet.schemaVersion!==1||
   packet.repository!=='thiepn/thiepn.github.io'||packet.phase!=='H15'){
  errors.push('H15 closed schema, repository or phase mismatch');
 }
 const q=packet?.qualifiedH14;
 if(!exact(q,['pr','head','runIds','artifacts'])||q.pr!==109||q.head!==H15_PARENT||
  !Array.isArray(q.runIds)||q.runIds.length!==H15_RUNS.length||
  !q.runIds.every((v,i)=>v===H15_RUNS[i])||
  !Array.isArray(q.artifacts)||q.artifacts.length!==H15_ARCHIVES.length||
  !q.artifacts.every((v,i)=>exact(v,['id','sha256','entries','crcVerified'])&&
   v.id===H15_ARCHIVES[i].id&&v.sha256===H15_ARCHIVES[i].sha256&&
   v.entries===H15_ARCHIVES[i].entries&&v.crcVerified===true))
  errors.push('H14 exact-head CI or independent ZIP pedigree mismatch');
 if(!Number.isSafeInteger(nowMs)||!timestamp(packet?.recordedAt,nowMs))
  errors.push('Invalid or future original intake timestamp');
 if(!Array.isArray(priorPacketDigests)||priorPacketDigests.some(s=>!HEX.test(s)))
  errors.push('Invalid independently maintained replay ledger');
 const packetDigest=plain(packet)?hash(JSON.stringify(packet)):null;
 if(packetDigest&&priorPacketDigests?.includes(packetDigest))
  errors.push('External packet replayed against prior intake');
 for(const [field,limit] of [['observations',32],['recoveryWitnesses',24],['ownerDockets',2]]){
  if(!Array.isArray(packet?.[field])||packet[field].length>limit)
   errors.push('Invalid or unbounded '+field);
 }
 // Only SHA-256 references and strictly declared fields are accepted. A
 // reporter's PASS is a claim; no cryptographic/human acceptance is inferred.
 if(Array.isArray(packet?.observations))for(const [i,o] of packet.observations.entries()){
  const type=H12_OBSERVATIONS.find(x=>x[0]===o?.kind);
  if(!exact(o,observationFields)||!type||!ID.test(o.id)||
   ![o.ownerScopeDigest,o.sessionDigest,o.captureDigest,o.witnessDigest,o.observerDigest].every(x=>HEX.test(x))||
   o.witnessDigest===o.observerDigest||!timestamp(o.observedAt,nowMs)||
   !['PASS','FAIL','BLOCKED'].includes(o.outcome)){
    errors.push('Malformed device/assistive-technology observation at index '+i);continue;
  }
  if(seenIds.has(o.id))errors.push('Duplicate external record identifier '+i);
  seenIds.add(o.id);covered.add(o.kind);
  const key=o.ownerScopeDigest+':'+o.kind,prior=byKind.get(key);
  if(prior&&(prior.o.outcome!==o.outcome||
   (prior.o.sessionDigest===o.sessionDigest&&prior.o.captureDigest!==o.captureDigest)))
   conflicts.push(conflict('PHYSICAL_OUTCOME_OR_SAME_SESSION_BYTES',prior.i,i));
  else if(!prior)byKind.set(key,{o,i});
  const earlier=seenWitnesses.get(o.witnessDigest);
  if(earlier!==undefined&&earlier!==i)
   conflicts.push(conflict('REUSED_PHYSICAL_WITNESS_RECEIPT',earlier,i));
  seenWitnesses.set(o.witnessDigest,i);
 }
 if(Array.isArray(packet?.recoveryWitnesses))for(const [i,o] of packet.recoveryWitnesses.entries()){
  if(!exact(o,recoveryFields)||!ID.test(o.id)||
   ![o.ownerScopeDigest,o.objectKeyDigest,o.sourceVersionDigest,o.originalBytesDigest,
    o.priorStableDigest,o.backupCiphertextDigest,o.restoredBytesDigest,o.witnessDigest].every(x=>HEX.test(x))||
   !timestamp(o.observedAt,nowMs)||!['MATCH_REPORTED','MISMATCH_REPORTED','NOT_TESTED'].includes(o.outcome)){
    errors.push('Malformed original-byte recovery witness at index '+i);continue;
  }
  if(seenIds.has(o.id))errors.push('Duplicate external record identifier '+i);
  seenIds.add(o.id);
  if(o.outcome==='MATCH_REPORTED'&&o.originalBytesDigest!==o.restoredBytesDigest)
   conflicts.push(conflict('FALSE_RESTORED_BYTE_MATCH',i,i));
  const key=o.ownerScopeDigest+':'+o.objectKeyDigest,prior=byObject.get(key);
  if(prior&&['sourceVersionDigest','originalBytesDigest','priorStableDigest',
   'backupCiphertextDigest','restoredBytesDigest','outcome'].some(k=>prior.o[k]!==o[k]))
   conflicts.push(conflict('CONTRADICTORY_ORIGINAL_RIGHTS_OR_RESTORED_BYTES',prior.i,i));
  else if(!prior)byObject.set(key,{o,i});
 }
 if(Array.isArray(packet?.ownerDockets))for(const [i,o] of packet.ownerDockets.entries()){
  const role=o?.kind==='PRECUTOVER'?'release-owner':
   o?.kind==='POSTRELEASE'?'recovery-owner':null;
  if(!exact(o,docketFields)||!role||o.ownerRole!==role||
   ![o.ownerScopeDigest,o.intentDigest,o.rightsReceiptDigest,o.priorStableReceiptDigest,
    o.custodianDigest].every(x=>HEX.test(x))||!timestamp(o.requestedAt,nowMs)||
   !['REVIEW_PENDING','DECLINED'].includes(o.decision)){
    errors.push('Invalid owner-specific nonexecuting decision docket '+i);continue;
  }
  const prior=byDocket.get(o.kind);
  if(prior)conflicts.push(conflict('DUPLICATE_OWNER_DECISION_SCOPE',prior.i,i));
  else byDocket.set(o.kind,{o,i});
 }
 const before=byDocket.get('PRECUTOVER')?.o,after=byDocket.get('POSTRELEASE')?.o;
 if(before&&after&&(before.custodianDigest===after.custodianDigest||
   before.ownerScopeDigest!==after.ownerScopeDigest))
  conflicts.push(conflict('OWNER_ROLE_ALIAS_OR_SCOPE_CHANGE',byDocket.get('PRECUTOVER').i,
   byDocket.get('POSTRELEASE').i));
 const missing=H12_OBSERVATIONS.map(x=>x[0]).filter(k=>!covered.has(k));
 const hasClaims=(packet?.observations?.length||0)+(packet?.recoveryWitnesses?.length||0)+
   (packet?.ownerDockets?.length||0)>0;
 const status=errors.length?'INVALID_INTAKE':conflicts.length?'CONFLICT_ESCROW':
   hasClaims?'AWAITING_INDEPENDENT_ORIGINAL_REVIEW':'AWAITING_EXTERNAL_EVIDENCE';
 return {schemaValid:errors.length===0,errors,conflicts,
  packetDigest:errors.length===0?packetDigest:null,
  status,observationClaims:covered.size,missingPhysicalKinds:missing,
  recoveryWitnessClaims:Array.isArray(packet?.recoveryWitnesses)?packet.recoveryWitnesses.length:0,
  ownerDocketClaims:Array.isArray(packet?.ownerDockets)?packet.ownerDockets.length:0,
  independentExternalIdentityAuthenticated:false,realPhysicalAcceptance:false,
  originalBytesIndependentlyRestored:false,sourceRightsApproved:false,
  actualTwoOwnerOAuthVerified:false,realOwnerApprovals:0,
  openHumanGates:[...H11_GATES],...DENY};
}
