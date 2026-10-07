import { describe, expect, it, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import { validateProviderEnvelope, contextKey, requestKey, validProviderContext } from '../../src/lib/providers/contract';
import { PILOT_PROVIDERS, providerManifest, PROVIDER_BUDGETS } from '../../src/lib/providers/registry';
import { ProviderRunner, readBoundedJson } from '../../src/lib/providers/runtime';
import { sessionProviderAdapter } from '../../src/lib/providers/session-adapters';
import { PILOT_HANDOFFS } from '../../src/lib/providers/handoffs';
import type { ProviderAccess, ProviderAdapter, ProviderEnvelope, ProviderId, ProviderManifest, RequestContext } from '../../src/lib/providers/types';
const now=Date.parse('2026-10-01T08:00:01.000Z');
const ids: ProviderId[]=['notes','library','tms60'];
const fixture=(id:ProviderId):ProviderEnvelope=>JSON.parse(fs.readFileSync(`contracts/fixtures/${id}.json`,'utf8'));
const request=(id:ProviderId):RequestContext=>{const f=fixture(id);return {providerId:id,operation:f.operation,requestId:f.requestId,context:f.context};};
const enabled=(id:ProviderId):ProviderManifest=>({...structuredClone(providerManifest(id)),privateReadsEnabled:true,operations:{summary:true,continue:true,search:true,capture:false,inbox:false}});
const access=(id:ProviderId):ProviderAccess=>({providerId:id,context:fixture(id).context,permissions:Object.values(providerManifest(id).requiredPermissions),expiresAt:now+60000});
const response=(r:RequestContext)=>{const f=fixture(r.providerId);if(r.providerId==='tms60'&&r.operation!=='summary')f.data={items:f.data!.items};return JSON.stringify({...f,operation:r.operation,requestId:r.requestId,context:r.context});};
const adapter=(id:ProviderId,read:ProviderAdapter['read']=async r=>response(r)):ProviderAdapter=>({manifest:enabled(id),read});
const validate=(id:ProviderId,value:unknown,req=request(id),time=now)=>validateProviderEnvelope(JSON.stringify(value),providerManifest(id),req,time);
afterEach(()=>vi.useRealTimers());
describe('H3 registered owner contracts',()=>{
 it('keeps discovery public, handoff-only and every private operation off',()=>{
  expect(PILOT_PROVIDERS.map(p=>p.id)).toEqual(ids);
  for(const p of PILOT_PROVIDERS){expect(p.privateReadsEnabled).toBe(false);expect(p.inlineWritesEnabled).toBe(false);expect(Object.values(p.operations).every(v=>v===false)).toBe(true);}
  for(const action of PILOT_HANDOFFS){const url=new URL(action.href);expect(['https://thiepn.dev','https://tms60.thiepn.dev']).toContain(url.origin);expect(url.hash).toBe('');expect([...url.searchParams.keys()].every(k=>k==='capture')).toBe(true);}
 });
 it.each(ids)('accepts the exact bounded %s fixture',id=>expect(validate(id,fixture(id))).toEqual(fixture(id)));
 it.each(['unconnected','unsupported','offline','stale','error'] as const)('keeps %s distinct from empty',status=>{const f=fixture('notes');expect(validate('notes',{...f,status,data:null}).status).toBe(status);expect(()=>validate('notes',{...f,status})).toThrow();});
 it.each(ids)('accepts explicit empty %s results without implying a disconnected provider',id=>{const f=fixture(id);f.status='empty';f.data={items:[],...(id==='tms60'?{dueTaskCount:0,dueVerseCount:0,newVerseCount:0}:{})};expect(validate(id,f).status).toBe('empty');});
 it('rejects unknown versions, IDs, request binding and unknown/raw private fields',()=>{
  const f=fixture('notes');for(const patch of [{schemaVersion:2},{providerId:'tms60'},{requestId:'different'},{operation:'search'},{privacy:'public'},{coverage:'device-local'},{access_token:'secret'}])expect(()=>validate('notes',{...f,...patch})).toThrow();
  for(const field of ['body','content','quote','href','attachment','html','access_token']){const g=fixture('notes');(g.data!.items[0] as any)[field]='private';expect(()=>validate('notes',g)).toThrow();}
 });
 it('rejects payload byte/item budgets, duplicate resources and control characters',()=>{
  expect(()=>validateProviderEnvelope('x'.repeat(PROVIDER_BUDGETS.summaryBytes+1),providerManifest('notes'),request('notes'),now)).toThrow(/size/);
  expect(()=>validateProviderEnvelope('😀'.repeat(9000),providerManifest('notes'),request('notes'),now)).toThrow(/size/);
  const f=fixture('notes');f.data!.items=Array.from({length:11},()=>({...f.data!.items[0]!}));expect(()=>validate('notes',f)).toThrow();
  f.data!.items=[f.data!.items[0]!,f.data!.items[0]!];expect(()=>validate('notes',f)).toThrow();
  f.data!.items=[{...f.data!.items[0]!,title:'bad\u0000title'}];expect(()=>validate('notes',f)).toThrow();
 });
 it('allows up to 20 search results but rejects query echo and extra results',()=>{
  const r={...request('notes'),operation:'search' as const,query:'private phrase'};
  const f={...fixture('notes'),operation:'search' as const};f.data!.items=Array.from({length:20},(_,i)=>({...f.data!.items[0]!,resourceId:`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`}));
  expect(validate('notes',f,r).data!.items).toHaveLength(20);
  expect(()=>validate('notes',{...f,query:r.query},r)).toThrow();f.data!.items.push({...f.data!.items[0]!,resourceId:'44444444-4444-4444-8444-444444444444'});expect(()=>validate('notes',f,r)).toThrow();
 });
 it('binds account, workspace, grant revision and translation; device history never becomes account history',()=>{
  const f=fixture('notes');for(const patch of [{accountId:'22222222-2222-4222-8222-222222222222'},{workspaceId:'other'},{grantRevision:'revoked'},{translationId:'esv'}])expect(()=>validate('notes',{...f,context:{...f.context,...patch}})).toThrow();
  expect(()=>validate('library',{...fixture('library'),context:f.context})).toThrow();
  expect(()=>validate('tms60',{...fixture('tms60'),context:{...fixture('tms60').context,translationId:'niv'}})).toThrow();
  expect(validProviderContext({...fixture('library').context,accountId:'11111111-1111-4111-8111-111111111111'})).toBe(false);
 });
 it('normalizes cache ownership without leaking a private query into cache keys',()=>{
  const r=request('notes');expect(requestKey({...r,operation:'search',query:'private phrase'})).not.toContain('private phrase');
  expect(contextKey({...r.context,grantRevision:'different'} as any)).not.toBe(contextKey(r.context));
  expect(requestKey({...r,operation:'continue'})).not.toBe(requestKey(r));
 });
 it('preserves reading identity and rejects false progress, mixed due counts and full verse text',()=>{
  for(const patch of [{edition:0},{current:30},{current:.7,furthest:.6},{format:'unknown'},{releaseVersion:''}]){const f=fixture('library');Object.assign(f.data!.items[0]!,patch);expect(()=>validate('library',f)).toThrow();}
  const f=fixture('tms60');expect(f.data!.dueTaskCount).toBe(2);expect(f.data!.dueVerseCount).toBe(1);
  for(const patch of [{dueTaskCount:-1},{dueVerseCount:3},{dueTaskCount:181},{dueVerseCount:61},{dueTaskCount:0,dueVerseCount:1}])expect(()=>validate('tms60',{...f,data:{...f.data,...patch}})).toThrow();
  expect(()=>validate('tms60',{...f,data:{...f.data,verseText:'Full verse'}})).toThrow();
  const r={...request('tms60'),operation:'continue' as const};expect(validate('tms60',{...f,operation:'continue',data:{items:f.data!.items}},r).status).toBe('ready');expect(()=>validate('tms60',{...f,operation:'continue'},r)).toThrow();
 });
 it('strips expired payloads and rejects impossible freshness windows and false emptiness',()=>{
  const f=fixture('notes');expect(validate('notes',f,request('notes'),now+180000)).toMatchObject({status:'stale',data:null});
  for(const patch of [{observedAt:'invalid'},{observedAt:'2026-02-31T08:00:00.000Z'},{observedAt:'2027-01-01T00:00:00.000Z'},{expiresAt:'2026-10-02T00:00:00.000Z'},{sourceUpdatedAt:'2027-01-01T00:00:00.000Z'},{status:'empty'}])expect(()=>validate('notes',{...f,...patch})).toThrow();
  expect(()=>validate('notes',{...f,data:{items:[]}})).toThrow();
 });
});
describe('H3 isolated scheduling and cancellation',()=>{
 it('never calls a production pilot reader while contracts are not enabled',async()=>{const read=vi.fn(async r=>response(r));const runner=new ProviderRunner(ids.map(id=>({manifest:providerManifest(id),read})),()=>now);runner.setAccess(ids.map(access));const emit=vi.fn();await runner.run(ids.map(providerId=>({providerId,operation:'summary'})),emit);expect(read).not.toHaveBeenCalled();expect(emit.mock.calls.map(c=>c[0].status)).toEqual(['unsupported','unsupported','unsupported']);});
 it('requires owner-specific permission and fresh access, not identity alone',async()=>{const read=vi.fn(async r=>response(r));const runner=new ProviderRunner([adapter('notes',read)],()=>now);for(const permission of [[],['app_data.read'],['tms60.hub.summary.read']]){runner.setAccess([{...access('notes'),permissions:permission}]);await runner.run([{providerId:'notes',operation:'summary'}],()=>{});}runner.setAccess([{...access('notes'),expiresAt:now}]);await runner.run([{providerId:'notes',operation:'summary'}],()=>{});expect(read).not.toHaveBeenCalled();});
 it('runs three owners with independent device/account contexts and grant revisions',async()=>{const runner=new ProviderRunner(ids.map(id=>adapter(id)),()=>now);runner.setAccess(ids.map(access));const emitted:any[]=[];await runner.run(ids.map(providerId=>({providerId,operation:'summary'})),r=>emitted.push(r));expect(emitted.map(r=>r.status)).toEqual(['ready','ready','ready']);expect(runner.snapshot()).toHaveLength(3);expect(runner.snapshot()[1]!.envelope!.context.scope).toBe('device');});
 it('rejects a delayed A response after switching to B or revoking a grant',async()=>{
  for(const changed of [null,[{...access('notes'),context:{...request('notes').context,accountId:'22222222-2222-4222-8222-222222222222'} as any}], [{...access('notes'),context:{...request('notes').context,grantRevision:'revoked'} as any,permissions:[]}]]){
   let finish!:(s:string)=>void;let saved!:RequestContext;const read=vi.fn((r:RequestContext)=>{saved=r;return new Promise<string>(resolve=>{finish=resolve;});});const runner=new ProviderRunner([adapter('notes',read)],()=>now);runner.setAccess([access('notes')]);const emit=vi.fn();const work=runner.run([{providerId:'notes',operation:'summary'}],emit);runner.setAccess(changed);await work;finish(response(saved));await Promise.resolve();expect(emit).not.toHaveBeenCalled();expect(runner.snapshot()).toEqual([]);
  }
 });
 it('isolates malformed, future-version and timed-out owners from working owners',async()=>{
  vi.useFakeTimers();const runner=new ProviderRunner([adapter('notes',async()=>'{'),adapter('library',async r=>JSON.stringify({...JSON.parse(response(r)),schemaVersion:9})),adapter('tms60',()=>new Promise(()=>{}))],()=>now);runner.setAccess(ids.map(access));const emit=vi.fn();const work=runner.run(ids.map(providerId=>({providerId,operation:'summary'})),emit);await vi.advanceTimersByTimeAsync(2001);await work;expect(emit.mock.calls.map(c=>c[0].status)).toEqual(['error','unsupported','offline']);
 });
 it('bounds visible contributions and concurrent work; hidden work is cancelled',async()=>{
  vi.useFakeTimers();let active=0,peak=0;const runners=ids.map(id=>adapter(id,r=>new Promise(resolve=>{active++;peak=Math.max(peak,active);setTimeout(()=>{active--;resolve(response(r));},10);})));const runner=new ProviderRunner(runners,()=>now);runner.setAccess(ids.map(access));
  const visible=ids.flatMap(providerId=>(['summary','continue'] as const).map(operation=>({providerId,operation})));const work=runner.run(visible,()=>{});expect(peak).toBe(3);await vi.advanceTimersByTimeAsync(30);await work;expect(peak).toBe(3);expect(runner.snapshot()).toHaveLength(6);
  await expect(runner.run([...visible,{providerId:'notes',operation:'search'}],()=>{})).rejects.toThrow(/budget/);
  const pending=runner.run([{providerId:'notes',operation:'summary'}],()=>{});await runner.run([],()=>{});await pending;expect(runner.snapshot()).toEqual([]);
 });
 it('removes expired permission and projection data from in-memory snapshots',async()=>{let time=now;const runner=new ProviderRunner([adapter('notes')],()=>time);runner.setAccess([{...access('notes'),expiresAt:now+300000}]);await runner.run([{providerId:'notes',operation:'summary'}],()=>{});time=now+180000;expect(runner.snapshot()[0]).toMatchObject({status:'stale',envelope:{data:null}});time=now+300001;expect(runner.snapshot()).toEqual([]);});
 it('rejects unsupported query routing and duplicate adapters',async()=>{expect(()=>new ProviderRunner([adapter('notes'),adapter('notes')])).toThrow(/Duplicate/);const runner=new ProviderRunner([adapter('notes')],()=>now);await expect(runner.run([{providerId:'notes',operation:'continue',query:'secret'}],()=>{})).rejects.toThrow(/query/);});
});
describe('P6 reusable bound-session adapters',()=>{
 it('enables only a runtime manifest clone and leaves the canonical registry frozen off',()=>{
  const readRequest=vi.fn(async(r:RequestContext)=>response(r));
  const runtime=sessionProviderAdapter('notes',{readRequest});
  expect(runtime.manifest.privateReadsEnabled).toBe(true);
  expect(runtime.manifest.inlineWritesEnabled).toBe(false);
  expect(runtime.manifest.operations).toMatchObject({summary:true,continue:true,search:true,capture:false,inbox:false});
  expect(providerManifest('notes').privateReadsEnabled).toBe(false);
  expect(Object.values(providerManifest('notes').operations).every(Boolean)).toBe(false);
 });
 it('forwards the exact runner request and signal without replacing request identity',async()=>{
  const seen:RequestContext[]=[];
  const runtime=sessionProviderAdapter('notes',{readRequest:async(r)=>{seen.push(structuredClone(r));return response(r);}});
  const req={...request('notes'),requestId:'runner-bound-request'};
  const signal=new AbortController().signal;
  await runtime.read(req,signal);
  expect(seen).toEqual([req]);
 });
});
describe('H3 streaming byte budget',()=>{
 it('counts streamed bytes with and without a content-length header',async()=>{const signal=new AbortController().signal;expect(await readBoundedJson(new Response('{"x":1}',{headers:{'content-type':'application/json'}}),7,signal)).toBe('{"x":1}');await expect(readBoundedJson(new Response('😀😀',{headers:{'content-type':'application/json'}}),7,signal)).rejects.toThrow(/size/);await expect(readBoundedJson(new Response('{}',{headers:{'content-type':'application/json','content-length':'100'}}),7,signal)).rejects.toThrow(/size/);});
 it('rejects invalid status/type/UTF-8 and cancels blocked streams',async()=>{const signal=new AbortController().signal;await expect(readBoundedJson(new Response('{}',{status:503,headers:{'content-type':'application/json'}}),10,signal)).rejects.toThrow();await expect(readBoundedJson(new Response('{}',{headers:{'content-type':'text/html'}}),10,signal)).rejects.toThrow();await expect(readBoundedJson(new Response(new Uint8Array([255]),{headers:{'content-type':'application/json'}}),10,signal)).rejects.toThrow();const cancel=vi.fn();const controller=new AbortController();const work=readBoundedJson(new Response(new ReadableStream({cancel}),{headers:{'content-type':'application/json'}}),10,controller.signal);controller.abort();await expect(work).rejects.toThrow(/aborted/);expect(cancel).toHaveBeenCalled();});
});
