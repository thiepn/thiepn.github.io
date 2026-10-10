import {describe,it,expect} from 'vitest';
import {createDefaultHomeDocument} from '../../src/lib/prism/home-document';
import {homeDocumentStorageKey} from '../../src/lib/prism/home-store';
import {appendPendingEdit,subtractAcknowledgedHomeEdits,type HomeSyncSnapshot} from '../../src/lib/prism/home-indexeddb';
import {synchronizeHomeOnce,type HomeCasRequest,type HomeCasResponse,type HomeRemoteDocument,type HomeSyncTransport} from '../../src/lib/prism/home-sync-engine';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const raw=(mode:'dark'|'light'|'system'='system')=>{
  const d=createDefaultHomeDocument();d.appearance.mode=mode;return JSON.stringify(d);
};
function memory(owner:string,initial=raw()) {
 const state:HomeSyncSnapshot={raw:initial,revision:1,pending:[{fromRevision:0,toRevision:1,savedAt:1,coalesced:false}],
   remoteRevision:null,syncedToRevision:0};
 let acknowledged=0;
 const port={
  key:homeDocumentStorageKey(owner),
  async getSyncSnapshot(){return structuredClone(state);},
  async acknowledgeSynced(s:HomeSyncSnapshot,revision:string){
   if(state.remoteRevision!==s.remoteRevision || state.revision<s.revision ||
     (state.revision===s.revision && state.raw!==s.raw) ||
     state.syncedToRevision>=s.revision ||
     !state.pending.some(p=>p.fromRevision<s.revision&&p.toRevision>=s.revision)) return false;
   state.pending=subtractAcknowledgedHomeEdits(state.pending,s.revision);
   state.remoteRevision=revision; state.syncedToRevision=s.revision;
   acknowledged++; return true;
  },
  edit(nextRaw:string){const revision=state.revision;state.raw=nextRaw;state.revision++;state.pending=appendPendingEdit(state.pending,revision,revision+1);},
  value(){return structuredClone(state);},
  get acks(){return acknowledged;},
 };
 return port;
}
class IsolatedServer implements HomeSyncTransport {
 auth:string|null=A;
 docs=new Map<string,HomeRemoteDocument>();
 requestCount=0;
 writeCount=0;
 lastNonce:string|null=null;
 afterRead:(()=>void)|null=null;
 afterCas:(()=>void)|null=null;
 failReadback=false;
 async verifiedOwner(){return this.auth;}
 async read(ownerId:string) {
  this.requestCount++;
  if(this.auth!==ownerId) throw new Error('Server owner RLS denial');
  const found=this.docs.get(ownerId);
  const copy=found?structuredClone(found):null;
  if(this.afterRead){const f=this.afterRead;this.afterRead=null;f();}
  if(this.failReadback && this.requestCount>1) throw new Error('Network disconnect before readback');
  return copy;
 }
 async compareAndSwap(ownerId:string,r:HomeCasRequest):Promise<HomeCasResponse> {
  this.writeCount++;
  if(this.auth!==ownerId) throw new Error('Server owner RLS denial');
  const previous=this.docs.get(ownerId);
  if((previous?.revision??null)!==r.expectedRevision) return {
   ownerId,revision:previous?.revision??null,idempotencyKey:r.idempotencyKey,outcome:'conflict'
  };
  this.lastNonce=r.idempotencyKey;
  const revision=this.writeCount.toString(16).padStart(64,'0');
  this.docs.set(ownerId,{ownerId,revision,raw:r.raw});
  if(this.afterCas){const f=this.afterCas;this.afterCas=null;f();}
  return {ownerId,revision,idempotencyKey:r.idempotencyKey,outcome:'applied'};
 }
}
const run=(owner:string,local:ReturnType<typeof memory>,server:HomeSyncTransport,active=()=>true,online=()=>true)=>
  synchronizeHomeOnce({ownerId:owner,persistence:local,transport:server,isCurrent:active,online});
describe('H17 owner-scoped idempotent CAS engine, source-only mock',()=>{
 it('does not make a network call or purge evidence while offline',async()=>{
  const local=memory(A),server=new IsolatedServer();
  expect(await run(A,local,server,()=>true,()=>false)).toBe('offline');
  expect(server.requestCount+server.writeCount).toBe(0);
  expect(local.value().pending).toHaveLength(1);
 });
 it('rejects wrong owner/persistence key before touching server',async()=>{
  const local=memory(A),server=new IsolatedServer();
  expect(await run(B,local,server)).toBe('unauthorized');
  server.auth=B;
  expect(await run(A,local,server)).toBe('unauthorized');
  expect(server.writeCount).toBe(0);expect(local.acks).toBe(0);
 });
 it('requires actual remote CAS then separate full read-back before durable ack',async()=>{
  const local=memory(A),server=new IsolatedServer();
  expect(await run(A,local,server)).toBe('synced');
  expect(server.writeCount).toBe(1);
  expect(server.requestCount).toBe(2);
  expect(local.value().pending).toHaveLength(0);
  expect(local.value().syncedToRevision).toBe(1);
  expect(await run(A,local,server)).toBe('idle');
  expect(server.writeCount).toBe(1);
 });
 it('sends subsequent edit with prior remote revision CAS, never blind upsert',async()=>{
  const local=memory(A),server=new IsolatedServer();
  expect(await run(A,local,server)).toBe('synced');
  const previous=local.value().remoteRevision;
  local.edit(raw('dark'));
  expect(await run(A,local,server)).toBe('synced');
  expect(local.value().syncedToRevision).toBe(2);
  expect(local.value().remoteRevision).not.toBe(previous);
  expect(server.docs.get(A)?.raw).toBe(raw('dark'));
 });
 it('withholds subsequent dirty edit if another device changed the remote',async()=>{
  const local=memory(A),server=new IsolatedServer();
  expect(await run(A,local,server)).toBe('synced');
  local.edit(raw('dark'));
  server.docs.set(A,{ownerId:A,revision:'f'.repeat(64),raw:raw('light')});
  expect(await run(A,local,server)).toBe('conflict');
  expect(server.docs.get(A)?.raw).toBe(raw('light'));
  expect(local.value().pending).toHaveLength(1);
 });
 it('keeps a fresh second device owner snapshot pending instead of overwriting divergent first-device data',async()=>{
  const ownerA=memory(A,raw('dark')),server=new IsolatedServer();
  expect(await run(A,ownerA,server)).toBe('synced');
  const anotherDevice=memory(A,raw('light'));
  expect(await run(A,anotherDevice,server)).toBe('conflict');
  expect(anotherDevice.acks).toBe(0);
 });
 it('idempotently reconciles a lost receipt only after re-reading identical server bytes',async()=>{
  const local=memory(A),server=new IsolatedServer(); server.failReadback=true;
  expect(await run(A,local,server)).toBe('deferred');
  expect(local.value().pending).toHaveLength(1);
  server.failReadback=false;server.requestCount=0;
  expect(await run(A,local,server)).toBe('synced');
  expect(server.writeCount).toBe(1);
  expect(local.value().pending).toHaveLength(0);
 });
 it('detects concurrent remote CAS conflict; no automatic last-write-wins',async()=>{
  const local=memory(A),server=new IsolatedServer();
  server.afterRead=()=>{server.docs.set(A,{ownerId:A,revision:'a'.repeat(64),raw:raw('dark')});};
  expect(await run(A,local,server)).toBe('conflict');
  expect(local.value().pending).toHaveLength(1);
 });
 it('rejects forged remote ownership and unexpectedly shaped privileged response',async()=>{
  const local=memory(A),server=new IsolatedServer();
  server.docs.set(A,{ownerId:B,revision:'b'.repeat(64),raw:raw()});
  expect(await run(A,local,server)).toBe('invalid-remote');
  expect(local.acks).toBe(0);
  server.docs.clear();
  const forged:HomeSyncTransport={...server,
    verifiedOwner:async()=>A,read:async()=>null,
    compareAndSwap:async(_id,req)=>({ownerId:B,revision:'b'.repeat(64),idempotencyKey:req.idempotencyKey,outcome:'applied'})};
  expect(await run(A,local,forged)).toBe('invalid-remote');
  expect(local.value().pending).toHaveLength(1);
 });
 it('stops on identity transition during remote read; never acknowledges other owner',async()=>{
  const local=memory(A),server=new IsolatedServer();server.afterRead=()=>{server.auth=B};
  expect(await run(A,local,server)).toBe('cancelled');
  expect(server.writeCount).toBe(0);expect(local.value().pending).toHaveLength(1);
 });
 it('keeps concurrent new local edits even when older remote snapshot is acknowledged',async()=>{
  const local=memory(A),server=new IsolatedServer();server.afterCas=()=>local.edit(raw('dark'));
  expect(await run(A,local,server)).toBe('synced');
  expect(local.value()).toMatchObject({revision:2,syncedToRevision:1});
  expect(local.value().pending).toEqual([{fromRevision:1,toRevision:2,savedAt:2,coalesced:false}]);
  expect(await run(A,local,server)).toBe('synced');
  expect(server.docs.get(A)?.raw).toBe(raw('dark'));
 });
 it('splits coalesced pending ranges at successful ack boundary without losing later edits',()=>{
  const pending=[{fromRevision:0,toRevision:40,savedAt:1,coalesced:true}];
  expect(subtractAcknowledgedHomeEdits(pending,30)).toEqual([{fromRevision:30,toRevision:40,savedAt:1,coalesced:true}]);
  expect(subtractAcknowledgedHomeEdits(pending,40)).toEqual([]);
 });
 it('does not pull and overwrite another device when the local device has no edits',async()=>{
  const local=memory(A),server=new IsolatedServer();
  expect(await run(A,local,server)).toBe('synced');
  const clean=memory(A);await clean.acknowledgeSynced(await clean.getSyncSnapshot() as HomeSyncSnapshot,'f'.repeat(64));
  const before=clean.value();
  expect(await run(A,clean,server)).toBe('idle');
  expect(clean.value()).toEqual(before);
 });
});
