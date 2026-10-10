import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createDefaultHomeDocument} from '../../src/lib/prism/home-document';
import {createH18DisposableHomeTransport,H18BackendUnverified,type H18RpcClient} from '../../src/lib/prism/home-h18-disposable-transport';
import {synchronizeHomeOnce} from '../../src/lib/prism/home-sync-engine';
import {homeDocumentStorageKey} from '../../src/lib/prism/home-store';
import type {HomeSyncSnapshot} from '../../src/lib/prism/home-indexeddb';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const raw=()=>JSON.stringify(createDefaultHomeDocument());
const rev='f'.repeat(64);
const enabled={disposableOwnerApproved:true,backendRlsAcceptanceComplete:true};
function fixture(){
  let user:string|null=A;
  let onRpc:(name:string,args:Record<string,unknown>)=>void=()=>{};
  const calls:{name:string,args:Record<string,unknown>}[]=[];
  let document:unknown=null;
  let reply:unknown={outcome:'applied',ownerId:A,revision:rev,idempotencyKey:'a'.repeat(64)};
  let failure:unknown=null;
  const client:H18RpcClient={
    auth:{async getUser(){return {data:{user:user?{id:user}:null},error:null};}},
    async rpc(name,args){calls.push({name,args});onRpc(name,args);return {data:name==='h18_home_read'?document:reply,error:failure};}
  };
  return {client,calls,setUser:(v:string|null)=>user=v,
    setDocument:(v:unknown)=>document=v,setReceipt:(v:unknown)=>reply=v,
    setFailure:(v:unknown)=>failure=v,onRpc:(f:typeof onRpc)=>onRpc=f};
}
describe('H18 disabled, owner-revalidating disposable RPC adapter',()=>{
 it('fails closed with no enabled disposable project and never calls RPC',()=>{
  const f=fixture();
  for(const gate of [
    {disposableOwnerApproved:false,backendRlsAcceptanceComplete:true},
    {disposableOwnerApproved:true,backendRlsAcceptanceComplete:false},
  ])expect(()=>createH18DisposableHomeTransport(f.client,gate)).toThrow(H18BackendUnverified);
  expect(f.calls).toHaveLength(0);
 });
 it('uses independently verified auth.getUser, never untrusted caller owner',async()=>{
  const f=fixture(),t=createH18DisposableHomeTransport(f.client,enabled);
  expect(await t.verifiedOwner()).toBe(A);
  await expect(t.read(B)).rejects.toThrow('owner mismatch');
  await expect(t.compareAndSwap(B,{expectedRevision:null,idempotencyKey:'a'.repeat(64),raw:raw()}))
    .rejects.toThrow('owner mismatch');
  expect(f.calls).toHaveLength(0);
 });
 it('recognizes an owner-scoped missing document without pretending another owner is empty',async()=>{
  const f=fixture(),t=createH18DisposableHomeTransport(f.client,enabled);
  expect(await t.read(A)).toBeNull();
  expect(f.calls).toEqual([{name:'h18_home_read',args:{p_owner:A}}]);
  f.setUser(B);
  await expect(t.read(A)).rejects.toThrow('owner mismatch');
 });
 it('rejects extra private fields, wrong owner, invalid revision and malformed remote schema',async()=>{
  const f=fixture(),t=createH18DisposableHomeTransport(f.client,enabled);
  for(const item of [
    {ownerId:B,revision:rev,raw:raw()},
    {ownerId:A,revision:'invalid',raw:raw()},
    {ownerId:A,revision:rev,raw:JSON.stringify({...createDefaultHomeDocument(),schemaVersion:3})},
    {ownerId:A,revision:rev,raw:raw(),accessToken:'must-never-return'},
  ]){f.setDocument(item);await expect(t.read(A)).rejects.toThrow();}
 });
 it('validates arbitrary CAS payloads before any network call',async()=>{
  const f=fixture(),t=createH18DisposableHomeTransport(f.client,enabled);
  for(const p of [
    {expectedRevision:'abc',idempotencyKey:'a'.repeat(64),raw:raw()},
    {expectedRevision:null,idempotencyKey:'bad',raw:raw()},
    {expectedRevision:null,idempotencyKey:'a'.repeat(64),raw:'{}'},
    {expectedRevision:null,idempotencyKey:'a'.repeat(64),raw:raw(),unexpected:'secret'},
  ]) await expect(t.compareAndSwap(A,p)).rejects.toThrow();
  expect(f.calls).toHaveLength(0);
 });
 it('rechecks verified owner after backend await and prevents reporting results on a switched session',async()=>{
  const f=fixture(),t=createH18DisposableHomeTransport(f.client,enabled);
  f.setDocument({ownerId:A,revision:rev,raw:raw()});
  f.onRpc(()=>f.setUser(B));
  await expect(t.read(A)).rejects.toThrow('owner mismatch');
  expect(f.calls).toHaveLength(1);
 });
 it('never treats RPC errors, raw grant errors or malformed acknowledgments as successful sync',async()=>{
  const f=fixture(),t=createH18DisposableHomeTransport(f.client,enabled);
  f.setFailure({message:'private project details must not be surfaced'});
  await expect(t.read(A)).rejects.toThrow('unavailable or unauthorized');
  f.setFailure(null);
  for(const value of [
    {outcome:'applied',ownerId:B,revision:rev,idempotencyKey:'a'.repeat(64)},
    {outcome:'applied',ownerId:A,revision:null,idempotencyKey:'a'.repeat(64)},
    {outcome:'applied',ownerId:A,revision:rev,idempotencyKey:'different'},
    {outcome:'applied',ownerId:A,revision:rev,idempotencyKey:'a'.repeat(64),token:'leak'},
  ]){
    f.setReceipt(value);
    await expect(t.compareAndSwap(A,{expectedRevision:null,idempotencyKey:'a'.repeat(64),raw:raw()}))
      .rejects.toThrow();
  }
 });
 it('transmits exact CAS contract arguments and accepts only owner-bound receipts',async()=>{
  const f=fixture(),t=createH18DisposableHomeTransport(f.client,enabled);
  const value=await t.compareAndSwap(A,{expectedRevision:null,idempotencyKey:'a'.repeat(64),raw:raw()});
  expect(value).toMatchObject({ownerId:A,outcome:'applied',revision:rev});
  expect(f.calls).toEqual([{
    name:'h18_home_cas',
    args:{p_owner:A,p_expected_revision:null,p_idempotency_key:'a'.repeat(64),p_raw:raw()}
  }]);
 });
 it('keeps durable pending revisions if the RPC returns success but readback mismatches',async()=>{
  const f=fixture(),t=createH18DisposableHomeTransport(f.client,enabled);
  const pending:HomeSyncSnapshot={raw:raw(),revision:1,syncedToRevision:0,
    remoteRevision:null,pending:[{fromRevision:0,toRevision:1,savedAt:1,coalesced:false}]};
  let ack=0;
  const persistence={key:homeDocumentStorageKey(A),async getSyncSnapshot(){return structuredClone(pending);},
    async acknowledgeSynced(){ack++;return true;}};
  // RPC returns successful H18 CAS, but second read returns conflicting bytes.
  f.setReceipt({outcome:'applied',ownerId:A,revision:rev,idempotencyKey:'a'.repeat(64)});
  const status=await synchronizeHomeOnce({ownerId:A,persistence,transport:t,isCurrent:()=>true});
  expect(['invalid-remote','deferred']).toContain(status);
  expect(ack).toBe(0);
  expect(pending.pending).toHaveLength(1);
 });
});

describe('H18 SQL candidate has independent database gates, not source-only RLS approval',()=>{
 const sql=readFileSync('docs/h18-disposable/core-home-document-contract.sql','utf8');
 it('keeps owner document and idempotency tables in an unexposed private schema',()=>{
  expect(sql).toContain('hub_h18_private.home_documents');
  expect(sql).toContain('hub_h18_private.home_receipts');
  expect(sql).toMatch(/home_documents enable row level security/i);
  expect(sql).toMatch(/home_receipts enable row level security/i);
  expect(sql).toMatch(/home_documents force row level security/i);
  expect(sql).not.toMatch(/security definer/i);
 });
 it('requires explicit owner predicates on read, insert, update and receipts',()=>{
  for(const name of ['h18_document_read','h18_document_insert','h18_document_update','h18_receipt_read','h18_receipt_insert'])
    expect(sql).toContain('create policy '+name);
  expect(sql).toContain('auth.uid()');
  expect(sql).toContain('with check (owner_id = (select auth.uid())');
  expect(sql).toContain('not coalesce((auth.jwt()->>\'is_anonymous\')::boolean,false)');
 });
 it('uses one server-side lock and request key for CAS and idempotent retries',()=>{
  expect(sql).toContain('pg_advisory_xact_lock');
  expect(sql).toContain('is distinct from p_expected_revision');
  expect(sql).toContain('primary key (owner_id, request_key)');
  expect(sql).toContain('v_receipt.payload_hash <> v_payload_hash');
  expect(sql).toContain('p_idempotency_key');
  expect(sql).toContain('security invoker');
  expect(sql).toContain('grant execute on function public.h18_home_cas');
 });
});
