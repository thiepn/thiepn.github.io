import {describe,it,expect} from 'vitest';
import {createDefaultHomeDocument} from '../../src/lib/prism/home-document';
import {describeLocalHomeSync,inspectHomeRecoveryCandidate} from '../../src/lib/prism/home-sync-preflight';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const rev='a'.repeat(64);
const edited=()=>{const d=createDefaultHomeDocument();d.appearance.mode='dark';return d;};
const journal=[{fromRevision:0,toRevision:1,savedAt:100,coalesced:false}];
const arg=()=>({owner:A,authenticatedOwner:A,local:createDefaultHomeDocument(),pending:[],
 remote:{ownerId:A,remoteRevision:rev,document:createDefaultHomeDocument()}});
describe('H16 real local Home sync status is not fictional cloud success',()=>{
 it('discloses owner-local durability and unsent revision *batches*, not fabricated edited counts',()=>{
  expect(describeLocalHomeSync('signed-in',[],'indexeddb')).toMatchObject({
   code:'local',cloudSynced:false});
  const pending=describeLocalHomeSync('signed-in',journal,'indexeddb');
  expect(pending).toMatchObject({code:'local-pending',cloudSynced:false});
  expect(pending.message).toContain('1 local revision batch');
  expect(pending.message).toContain('Nothing has been uploaded');
  const coalesced=describeLocalHomeSync('signed-in',[{...journal[0]!,coalesced:true,toRevision:40}],'indexeddb');
  expect(coalesced.message).not.toContain('40 local');
 });
 it('never exposes pending account revisions while signed out, checking or unavailable',()=>{
  for(const identity of ['signed-out','checking','unavailable'] as const){
   expect(describeLocalHomeSync(identity,journal,'indexeddb').message).not.toContain('1 local revision');
   expect(describeLocalHomeSync(identity,journal,'indexeddb').cloudSynced).toBe(false);
  }
  expect(describeLocalHomeSync('signed-in',null,'indexeddb')).toMatchObject({code:'storage-error'});
  expect(describeLocalHomeSync('signed-in',[],'legacy-only')).toMatchObject({code:'legacy'});
 });
});
describe('H16 read-only recovery preflight refuses implicit cross-account or automatic writes',()=>{
 it('returns review-only for matching owner and identical layout, never approval',()=>{
  expect(inspectHomeRecoveryCandidate(arg())).toMatchObject({
   state:'SAME_CONTENT_REVIEW_ONLY',safeForAutomaticApply:false,cloudSyncVerified:false,
   actualEncryptedRestoreVerified:false,ownerApprovalGranted:false,releaseAllowed:false});
 });
 it('rejects guest, uncertain, wrong owner, and invalid pending journal',()=>{
  for(const patch of [
   {owner:null},{authenticatedOwner:null},{authenticatedOwner:B},
   {pending:[{fromRevision:-1,toRevision:1,savedAt:0,coalesced:false}]},
   {pending:[...Array.from({length:33},(_,i)=>({fromRevision:i,toRevision:i+1,savedAt:i,coalesced:false}))]},
  ]){
   expect(inspectHomeRecoveryCandidate({...arg(),...patch}).state).toBe('INVALID_OWNER');
  }
 });
 it('rejects wrong/forged remote owner, revision and private unexpected fields',()=>{
  for(const remote of [
   {...arg().remote,ownerId:B},
   {...arg().remote,remoteRevision:'local-revision'},
   {...arg().remote,secretToken:'SHOULD-NOT-BE-HERE'},
   null,
  ]){
   expect(inspectHomeRecoveryCandidate({...arg(),remote}).state).toBe('UNTRUSTED_REMOTE');
  }
 });
 it('never imports a future schema, unknown block type or oversized remote payload',()=>{
  const future={...createDefaultHomeDocument(),schemaVersion:999};
  const malicious=createDefaultHomeDocument();malicious.blocks['block-now']!.type='unknown' as never;
  for(const doc of [future,malicious,{'long':'X'.repeat(150000)}]){
   expect(inspectHomeRecoveryCandidate({...arg(),remote:{...arg().remote,document:doc}}).state)
    .toBe('INVALID_REMOTE_DOCUMENT');
  }
 });
 it('flags divergent snapshots without altering local content or clearing the pending queue',()=>{
  const a=arg(); const before=structuredClone(a.local);
  const decision=inspectHomeRecoveryCandidate({...a,remote:{...a.remote,document:edited()}});
  expect(decision).toMatchObject({state:'DIVERGENT_REVIEW_REQUIRED',safeForAutomaticApply:false,cloudSyncVerified:false});
  expect(a.local).toEqual(before);
  const dirty=inspectHomeRecoveryCandidate({...arg(),pending:journal});
  expect(dirty).toMatchObject({state:'DIVERGENT_REVIEW_REQUIRED',hasLocalUnsentChanges:true});
  expect(dirty.errors.join(' ')).toContain('Unsent local revisions');
 });
});
