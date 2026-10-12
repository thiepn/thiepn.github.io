import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ProviderRunner, readBoundedJson } from '../../src/lib/providers/runtime';
import { providerManifest, PROVIDER_BUDGETS } from '../../src/lib/providers/registry';
import type { ProviderAdapter, ProviderAccess, ProviderResult, RequestContext } from '../../src/lib/providers/types';

// Import the immutable owner checkout, never a duplicate Hub projection.
type OwnerAuthorization = {accountId:string;consumer:string;audience:string;permissions:string[];grantRevision:string;expiresAt:number;accountState:'active'|'restricted'|'deleted';notesSyncAccess:boolean};
type OwnerDependencies = {authorize:(bearer:string,signal:AbortSignal)=>Promise<OwnerAuthorization|null>;query:(plan:{text:string;values:readonly(string|number)[]},authorization:OwnerAuthorization,signal:AbortSignal)=>Promise<unknown[]>;now:()=>number};
let createHandler:(dependencies:OwnerDependencies)=>(request:Request)=>Promise<Response>;
beforeAll(async()=>{
  if(!process.env.H11_NOTES_DIR) throw new Error('Set H11_NOTES_DIR to the pinned Notes owner checkout.');
  const owner=await import(/* @vite-ignore */pathToFileURL(path.resolve(process.env.H11_NOTES_DIR,'server/hub/notesProjection.ts')).href);
  createHandler=owner.createNotesHubHandler;
});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const NOW=Date.parse('2026-10-03T12:00:00.000Z');
const row=(accountId=A)=>({user_id:accountId,entity_type:'note',entity_id:'33333333-3333-4333-8333-333333333333',deleted_at:null,note_id:'33333333-3333-4333-8333-333333333333',note_type:'text',title:'Fictional private title',note_updated_at:String(NOW-1000),archived_at:null,trashed_at:null,synced_at:new Date(NOW-500).toISOString()});
const authorization=(patch:Partial<OwnerAuthorization>={}):OwnerAuthorization=>({accountId:A,consumer:'thiepn-hub',audience:'notes-hub',permissions:Object.values(providerManifest('notes').requiredPermissions),grantRevision:'grant-1',expiresAt:NOW+600000,accountState:'active',notesSyncAccess:true,...patch});
const access=(accountId=A,grantRevision='grant-1'):ProviderAccess=>({providerId:'notes',context:{scope:'account',accountId,workspaceId:null,grantRevision,translationId:null},permissions:Object.values(providerManifest('notes').requiredPermissions),expiresAt:NOW+600000});
const enabled=()=>({...structuredClone(providerManifest('notes')),privateReadsEnabled:true,operations:{summary:true,continue:true,search:true,capture:false,inbox:false}});
function adapter(handler:(request:Request)=>Promise<Response>,requests:Request[]=[]):ProviderAdapter{
  return {manifest:enabled(),read:async(input:RequestContext,signal:AbortSignal)=>{
    const request=new Request('https://owner.example.test/hub/notes/v1',{method:'POST',headers:{authorization:'Bearer fictional-scoped-token','content-type':'application/json'},body:JSON.stringify(input),signal});
    requests.push(request.clone());
    return readBoundedJson(await handler(request),input.operation==='search'?PROVIDER_BUDGETS.searchBytes:PROVIDER_BUDGETS.summaryBytes,signal);
  }};
}
describe('H11 actual Notes owner → Hub v1 validator and runner',()=>{
  for(const operation of ['summary','continue','search'] as const)it(`accepts the real owner ${operation} envelope with no raw fields or query echo`,async()=>{
    const requests:Request[]=[];
    const handler=createHandler({authorize:async()=>authorization(),query:async()=>[row()],now:()=>NOW});
    const runner=new ProviderRunner([adapter(handler,requests)],()=>NOW);runner.setAccess([access()]);
    const emitted:ProviderResult[]=[];
    await runner.run([{providerId:'notes',operation,...(operation==='search'?{query:'private query only in request body'}:{})}],result=>emitted.push(result));
    expect(emitted[0]?.status).toBe('ready');expect(runner.snapshot()).toHaveLength(1);
    expect(Object.keys(emitted[0]!.envelope!.data!.items[0]!).sort()).toEqual(['resourceId','title','updatedAt']);
    expect(JSON.stringify(runner.snapshot())).not.toMatch(/private query only|access_token|refresh_token|fictional-scoped-token|content|payload/);
    expect(new URL(requests[0]!.url).search).toBe('');
    if(operation==='search')expect(await requests[0]!.json()).toMatchObject({query:'private query only in request body'});
  });
  it('an authorized empty owner result remains empty rather than unconnected',async()=>{
    const handler=createHandler({authorize:async()=>authorization(),query:async()=>[],now:()=>NOW});
    const runner=new ProviderRunner([adapter(handler)],()=>NOW);runner.setAccess([access()]);
    const results:ProviderResult[]=[];await runner.run([{providerId:'notes',operation:'summary'}],r=>results.push(r));
    expect(results[0]?.status).toBe('empty');expect(results[0]?.envelope?.data?.items).toEqual([]);
  });
  it('keeps production discovery disabled even though the test adapter is enabled',()=>{
    const manifest=providerManifest('notes');expect(manifest.privateReadsEnabled).toBe(false);expect(Object.values(manifest.operations).every(v=>v===false)).toBe(true);
    expect(enabled().privateReadsEnabled).toBe(true);expect(manifest.privateReadsEnabled).toBe(false);
  });
  it('missing purpose permission prevents the frontend from calling the owner',async()=>{
    let calls=0;
    const handler=createHandler({authorize:async()=>{calls++;return authorization();},query:async()=>[row()],now:()=>NOW});
    const runner=new ProviderRunner([adapter(handler)],()=>NOW);runner.setAccess([{...access(),permissions:['identity.basic','app_data.read']}]);
    const results:ProviderResult[]=[];await runner.run([{providerId:'notes',operation:'summary'}],r=>results.push(r));
    expect(results).toEqual([{providerId:'notes',operation:'summary',status:'unconnected'}]);expect(calls).toBe(0);
  });
  it.each([{consumer:'wrong-client'},{accountId:B},{permissions:['app_data.read']},{grantRevision:'revoked'},{accountState:'deleted' as const},{notesSyncAccess:false}])('the owner independently denies stale or forged frontend authorization %j',async patch=>{
    let reads=0;
    const handler=createHandler({authorize:async()=>authorization(patch),query:async()=>{reads++;return[row()];},now:()=>NOW});
    const runner=new ProviderRunner([adapter(handler)],()=>NOW);runner.setAccess([access()]);
    const results:ProviderResult[]=[];await runner.run([{providerId:'notes',operation:'summary'}],r=>results.push(r));
    expect(reads).toBe(0);expect(results).toEqual([{providerId:'notes',operation:'summary',status:'error'}]);expect(runner.snapshot()).toEqual([]);
  });
  it('grant revocation during the SQL read prevents the result reaching Hub',async()=>{
    let revoked=false;
    const handler=createHandler({authorize:async()=>revoked?null:authorization(),query:async()=>{revoked=true;return[row()];},now:()=>NOW});
    const runner=new ProviderRunner([adapter(handler)],()=>NOW);runner.setAccess([access()]);
    const results:ProviderResult[]=[];await runner.run([{providerId:'notes',operation:'summary'}],r=>results.push(r));
    expect(results).toEqual([{providerId:'notes',operation:'summary',status:'error'}]);expect(runner.snapshot()).toEqual([]);
  });
  it('sign-out cancels the owner request and a late row never enters the cache',async()=>{
    let release!:(value:unknown[])=>void,started!:()=>void;
    const began=new Promise<void>(resolve=>{started=resolve;});
    const handler=createHandler({authorize:async()=>authorization(),query:async()=>{started();return new Promise(resolve=>{release=resolve;});},now:()=>NOW});
    const runner=new ProviderRunner([adapter(handler)],()=>NOW);runner.setAccess([access()]);
    const results:ProviderResult[]=[];const pending=runner.run([{providerId:'notes',operation:'summary'}],r=>results.push(r));
    await began;runner.clear();release([row()]);await pending;
    expect(results).toEqual([]);expect(runner.snapshot()).toEqual([]);
  });
  it('a new account partition clears all earlier owner results synchronously',async()=>{
    let current=A;
    const handler=createHandler({authorize:async()=>authorization({accountId:current}),query:async()=>[row(current)],now:()=>NOW});
    const runner=new ProviderRunner([adapter(handler)],()=>NOW);runner.setAccess([access()]);
    await runner.run([{providerId:'notes',operation:'summary'}],()=>{});expect(runner.snapshot()).toHaveLength(1);
    current=B;runner.setAccess([access(B)]);expect(runner.snapshot()).toEqual([]);
    await runner.run([{providerId:'notes',operation:'summary'}],()=>{});
    expect(runner.snapshot()[0]?.envelope?.context).toMatchObject({accountId:B});
  });
  it('strips private metadata when the owner freshness window expires',async()=>{
    let clock=NOW;
    const handler=createHandler({authorize:async()=>authorization(),query:async()=>[row()],now:()=>NOW});
    const runner=new ProviderRunner([adapter(handler)],()=>clock);runner.setAccess([access()]);
    await runner.run([{providerId:'notes',operation:'summary'}],()=>{});clock=NOW+300001;
    expect(runner.snapshot()[0]).toMatchObject({status:'stale',envelope:{data:null}});
  });
});
