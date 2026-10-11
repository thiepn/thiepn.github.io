import { describe, it, expect, vi } from 'vitest';
import { createDefaultHomeDocument } from '../../src/lib/prism/home-document';
import {
  createH22CloudflareHomeTransport, H22BackendUnverified,
  type H22AccountAuth,
} from '../../src/lib/prism/home-h22-cloudflare-transport';
import { homeDocumentStorageKey } from '../../src/lib/prism/home-store';
import { synchronizeHomeOnce } from '../../src/lib/prism/home-sync-engine';
import type { HomeSyncSnapshot } from '../../src/lib/prism/home-indexeddb';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const TA='aaaa.bbbb.cccc';
const TB='dddd.eeee.ffff';
const R1='1'.repeat(64),R2='2'.repeat(64),KEY='a'.repeat(64);
const gate={sourceOnlyTestApproved:true,isolatedBackendOnly:true};
const raw=(mode:'system'|'dark'|'light'='system')=>{
  const doc=createDefaultHomeDocument(); doc.appearance.mode=mode; return JSON.stringify(doc);
};
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
function fixture() {
  let user:string|null=A;
  let token=TA;
  let active=true;
  let onFetch:(url:URL,opts:RequestInit)=>Response|Promise<Response>=()=>reply(null);
  const calls:{url:URL;options:RequestInit}[]=[];
  let verified=0;
  const auth:H22AccountAuth={
    async getUser(){verified++;return {data:{user:user?{id:user}:null},error:null};},
    async getSession(){return {data:{session:user?{user:{id:user},access_token:token}:null},error:null};},
  };
  const fetcher=vi.fn(async(input:RequestInfo|URL,init?:RequestInit):Promise<Response>=>{
    const url=new URL(String(input)); const options=init??{};
    calls.push({url,options});
    return onFetch(url,options);
  }) as unknown as typeof fetch;
  const port=()=>createH22CloudflareHomeTransport(auth,{
    origin:'https://h22-disposable.invalid',fetcher,gate,isCurrent:()=>active,
  });
  return {auth,port,calls,fetcher,get verified(){return verified;},
    setUser:(v:string|null)=>user=v,setToken:(v:string)=>token=v,
    setActive:(v:boolean)=>active=v,setFetch:(v:typeof onFetch)=>onFetch=v};
}
function memory(owner=A,source=raw()) {
  const state:HomeSyncSnapshot={raw:source,revision:1,syncedToRevision:0,
    pending:[{fromRevision:0,toRevision:1,savedAt:1,coalesced:false}],remoteRevision:null};
  let count=0;
  return {
    key:homeDocumentStorageKey(owner),
    async getSyncSnapshot(){return structuredClone(state);},
    async acknowledgeSynced(snapshot:HomeSyncSnapshot,revision:string){
      if(snapshot.raw!==state.raw||snapshot.revision!==state.revision||
          state.syncedToRevision>=snapshot.revision)return false;
      count++;state.syncedToRevision=state.revision;state.remoteRevision=revision;state.pending=[];
      return true;
    },
    get count(){return count;},get state(){return structuredClone(state);},
  };
}
describe('H22 isolated Cloudflare client: source-only authorization and identity',()=>{
  it('cannot construct a production origin or an unapproved adapter',()=>{
    const f=fixture();
    for(const origin of [
      'https://thiepn.dev','https://account.thiepn.dev',
      'https://x.supabase.co','https://api.cloudflare.com',
      'https://h22-disposable.invalid/other','https://user@h22-disposable.invalid',
      'https://h22-disposable.invalid/?token=leak',
      'http://h22-disposable.invalid',
    ])expect(()=>createH22CloudflareHomeTransport(f.auth,{origin,fetcher:f.fetcher,gate})).toThrow(H22BackendUnverified);
    expect(()=>createH22CloudflareHomeTransport(f.auth,{
      origin:'https://h22-disposable.invalid',fetcher:f.fetcher,
      gate:{...gate,sourceOnlyTestApproved:false},
    })).toThrow(H22BackendUnverified);
    expect(()=>createH22CloudflareHomeTransport(f.auth,{
      origin:'https://h22-disposable.invalid',fetcher:f.fetcher,
      gate:{...gate,isolatedBackendOnly:false},
    })).toThrow(H22BackendUnverified);
    expect(f.calls).toHaveLength(0);
  });
  it('does not trigger any automatic network calls just by constructing',()=>{
    const f=fixture(),t=f.port();
    expect(t).toBeDefined();expect(f.calls).toHaveLength(0);expect(f.verified).toBe(0);
  });
  it('derives verifiedOwner from both server-checked getUser and session UUID',async()=>{
    const f=fixture(),t=f.port();
    expect(await t.verifiedOwner()).toBe(A);
    f.setUser(null);expect(await t.verifiedOwner()).toBeNull();
    f.setUser(A);f.setToken('not.jwt');expect(await t.verifiedOwner()).toBeNull();
    expect(f.calls).toHaveLength(0);
  });
  it('disallows cross-owner access and CAS before any fetch',async()=>{
    const f=fixture(),t=f.port();
    await expect(t.read(B)).rejects.toThrow();
    await expect(t.compareAndSwap(B,{expectedRevision:null,idempotencyKey:KEY,raw:raw()})).rejects.toThrow();
    await expect(t.readRecoveryRevision(B,R1)).rejects.toThrow();
    expect(f.calls).toHaveLength(0);
  });
  it('never sends cookies, stale origin, wildcard credentials or query-borne tokens',async()=>{
    const f=fixture(),t=f.port();
    expect(await t.read(A)).toBeNull();
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]!.url.origin).toBe('https://h22-disposable.invalid');
    expect(f.calls[0]!.url.pathname).toBe('/v1/home');
    expect(f.calls[0]!.url.searchParams.get('ownerId')).toBe(A);
    expect(f.calls[0]!.options.method).toBe('GET');
    expect(f.calls[0]!.options.credentials).toBe('omit');
    expect(f.calls[0]!.options.cache).toBe('no-store');
    expect(f.calls[0]!.options.redirect).toBe('error');
    expect(f.calls[0]!.options.headers).toMatchObject({authorization:'Bearer '+TA});
    expect(f.calls[0]!.url.href).not.toContain(TA);
  });
  it('drops a signed-out session before and during a remote fetch',async()=>{
    const f=fixture(),t=f.port();f.setUser(null);
    await expect(t.read(A)).rejects.toThrow();expect(f.calls).toHaveLength(0);
    f.setUser(A);f.setFetch(()=>{f.setUser(null);return reply({ownerId:A,revision:R1,raw:raw()});});
    await expect(t.read(A)).rejects.toThrow(/owner unavailable/);
    expect(f.calls).toHaveLength(1);
  });
  it('drops a replaced JWT for the SAME UUID while a response is pending',async()=>{
    const f=fixture(),t=f.port();f.setFetch(()=>{f.setToken(TB);return reply({ownerId:A,revision:R1,raw:raw()});});
    await expect(t.read(A)).rejects.toThrow(/session changed/);
    expect(f.calls).toHaveLength(1);
  });
  it('honors an independent lifecycle cancellation guard',async()=>{
    const f=fixture(),t=f.port();f.setActive(false);
    await expect(t.read(A)).rejects.toThrow();expect(f.calls).toHaveLength(0);
    f.setActive(true);f.setFetch(()=>{f.setActive(false);return reply(null);});
    await expect(t.read(A)).rejects.toThrow();expect(f.calls).toHaveLength(1);
  });
  it('rejects forged read owners, keys, oversized and structurally invalid documents',async()=>{
    const f=fixture(),t=f.port();
    for(const value of [
      {ownerId:B,revision:R1,raw:raw()},
      {ownerId:A,revision:'abc',raw:raw()},
      {ownerId:A,revision:R1,raw:'{}'},
      {ownerId:A,revision:R1,raw:raw(),secret:'token'},
    ]){f.setFetch(()=>reply(value));await expect(t.read(A)).rejects.toThrow();}
    expect(f.calls).toHaveLength(4);
  });
  it('rejects network errors, redirects, HTML and oversized JSON responses fail-closed',async()=>{
    const f=fixture(),t=f.port();
    f.setFetch(()=>{throw new Error('sensitive infrastructure details');});
    await expect(t.read(A)).rejects.toThrow('H22 remote unavailable');
    f.setFetch(()=>new Response('not JSON',{status:200,headers:{'content-type':'text/html'}}));
    await expect(t.read(A)).rejects.toThrow();
    f.setFetch(()=>new Response(' '.repeat(150000),{status:200,headers:{'content-type':'application/json'}}));
    await expect(t.read(A)).rejects.toThrow();
    f.setFetch(()=>reply({error:'cross owner'},403));
    await expect(t.read(A)).rejects.toThrow('H22 remote unavailable or unauthorized');
    expect(f.calls).toHaveLength(4);
  });
});
describe('H22 Cloudflare CAS and original-preserving read-only recovery',()=>{
  it('rejects malformed CAS before fetch and sends the exact H21 Worker JSON contract',async()=>{
    const f=fixture(),t=f.port();
    for(const req of [
      {expectedRevision:'oops',idempotencyKey:KEY,raw:raw()},
      {expectedRevision:null,idempotencyKey:'bad',raw:raw()},
      {expectedRevision:null,idempotencyKey:KEY,raw:'{}'},
      {expectedRevision:null,idempotencyKey:KEY,raw:raw(),extra:'leak'},
    ]) await expect(t.compareAndSwap(A,req)).rejects.toThrow('invalid CAS');
    expect(f.calls).toHaveLength(0);
    f.setFetch(()=>reply({outcome:'applied',ownerId:A,revision:R1,idempotencyKey:KEY}));
    expect(await t.compareAndSwap(A,{expectedRevision:null,idempotencyKey:KEY,raw:raw()}))
      .toMatchObject({outcome:'applied',revision:R1});
    const req=f.calls[0]!;
    expect(req.url.pathname).toBe('/v1/home/cas');
    expect(req.options.method).toBe('POST');
    expect(req.options.headers).toMatchObject({'content-type':'application/json',authorization:'Bearer '+TA});
    expect(JSON.parse(req.options.body as string)).toEqual({ownerId:A,expectedRevision:null,idempotencyKey:KEY,raw:raw()});
  });
  it('rejects cross-owner applied receipts, missing revision, duplicate-field injections',async()=>{
    const f=fixture(),t=f.port();
    for(const value of [
      {outcome:'applied',ownerId:B,revision:R1,idempotencyKey:KEY},
      {outcome:'applied',ownerId:A,revision:null,idempotencyKey:KEY},
      {outcome:'applied',ownerId:A,revision:R1,idempotencyKey:KEY,admin:true},
      {outcome:'conflict',ownerId:A,revision:'wrong',idempotencyKey:KEY},
      {outcome:'applied',ownerId:A,revision:R1,idempotencyKey:R2},
    ]){f.setFetch(()=>reply(value));await expect(t.compareAndSwap(A,{expectedRevision:null,idempotencyKey:KEY,raw:raw()})).rejects.toThrow();}
  });
  it('requires exact owner/revision/raw for read-only archival recovery',async()=>{
    const f=fixture(),t=f.port(),original='  '+raw('dark')+'  ';
    f.setFetch(()=>reply({ownerId:A,revision:R1,raw:original}));
    expect(await t.readRecoveryRevision(A,R1)).toEqual({ownerId:A,revision:R1,raw:original});
    expect(f.calls[0]!.url.pathname).toBe('/v1/home/recovery');
    expect(f.calls[0]!.options.method).toBe('GET');
    f.setFetch(()=>reply({error:'missing'},404));
    expect(await t.readRecoveryRevision(A,R2)).toBeNull();
    f.setFetch(()=>reply({ownerId:A,revision:R2,raw:original}));
    await expect(t.readRecoveryRevision(A,R1)).rejects.toThrow('invalid recovery');
    await expect(t.readRecoveryRevision(A,'invalid')).rejects.toThrow('invalid recovery');
    expect(f.calls.every(x=>x.options.method==='GET')).toBe(true);
  });
});
describe('H22 H17 sync engine integrated over injectable synthetic Worker boundary',()=>{
  function simulated() {
    const f=fixture();
    let stored:{revision:string;raw:string}|null=null;
    const originals=new Map<string,string>();
    const receipts=new Map<string,{expected:string|null;payload:string;revision:string}>();
    let commits=0;
    let failAfterCommit=false;
    let wrongReadback=false;
    let externalChange=false;
    f.setFetch((u,options)=>{
      if(options.headers && (options.headers as Record<string,string>).authorization !== 'Bearer '+TA)
        return reply({error:'unauthorized'},401);
      if(u.pathname==='/v1/home') {
        if(wrongReadback && stored)return reply({ownerId:A,revision:stored.revision,raw:raw('light')});
        return reply(stored?{ownerId:A,...stored}:null);
      }
      if(u.pathname==='/v1/home/recovery') {
        const revision=u.searchParams.get('revision')!;
        return originals.has(revision)?reply({ownerId:A,revision,raw:originals.get(revision)}):reply(null,404);
      }
      if(u.pathname==='/v1/home/cas') {
        const body=JSON.parse(options.body as string);
        if(externalChange){stored={revision:R2,raw:raw('light')};externalChange=false;}
        const hash=body.idempotencyKey;
        const previous=receipts.get(hash);
        if(previous){
          if(previous.expected!==body.expectedRevision || previous.payload!==body.raw)return reply({error:'reuse'},409);
          return reply({outcome:'applied',ownerId:A,revision:previous.revision,idempotencyKey:hash});
        }
        if((stored?.revision??null)!==body.expectedRevision)
          return reply({outcome:'conflict',ownerId:A,revision:stored?.revision??null,idempotencyKey:hash});
        if(stored) originals.set(stored.revision,stored.raw);
        commits++;
        const revision=commits.toString(16).padStart(64,'0');
        stored={revision,raw:body.raw};
        receipts.set(hash,{expected:body.expectedRevision,payload:body.raw,revision});
        if(failAfterCommit){failAfterCommit=false;throw Error('ambiguous network commit');}
        return reply({outcome:'applied',ownerId:A,revision,idempotencyKey:hash});
      }
      return reply({error:'not found'},404);
    });
    return {f,port:f.port(),get commits(){return commits;},
      get stored(){return stored;},loseReceipt:()=>{failAfterCommit=true;},
      forgeReadback:()=>{wrongReadback=true;},changeConcurrently:()=>{externalChange=true;}};
  }
  it('offline replay does no request and preserves every pending revision',async()=>{
    const s=simulated(),local=memory();
    expect(await synchronizeHomeOnce({ownerId:A,persistence:local,transport:s.port,
      isCurrent:()=>true,online:()=>false})).toBe('offline');
    expect(s.f.calls).toHaveLength(0);expect(local.count).toBe(0);expect(local.state.pending).toHaveLength(1);
    expect(await synchronizeHomeOnce({ownerId:A,persistence:local,transport:s.port,
      isCurrent:()=>true})).toBe('synced');
    expect(s.commits).toBe(1);expect(local.count).toBe(1);expect(local.state.pending).toHaveLength(0);
  });
  it('lost CAS response never acknowledges before identical owner-scoped readback',async()=>{
    const s=simulated(),local=memory();s.loseReceipt();
    expect(await synchronizeHomeOnce({ownerId:A,persistence:local,transport:s.port,isCurrent:()=>true})).toBe('deferred');
    expect(local.count).toBe(0);expect(local.state.pending).toHaveLength(1);expect(s.commits).toBe(1);
    expect(await synchronizeHomeOnce({ownerId:A,persistence:local,transport:s.port,isCurrent:()=>true})).toBe('synced');
    expect(s.commits).toBe(1);expect(local.count).toBe(1);
  });
  it('ambiguous malformed readback retains pending original local data',async()=>{
    const s=simulated(),local=memory();s.forgeReadback();
    expect(await synchronizeHomeOnce({ownerId:A,persistence:local,transport:s.port,isCurrent:()=>true})).toBe('invalid-remote');
    expect(local.count).toBe(0);expect(local.state.pending).toHaveLength(1);expect(s.commits).toBe(1);
  });
  it('a concurrent server update causes conflict without overwriting or clearing pending',async()=>{
    const s=simulated(),local=memory();s.changeConcurrently();
    expect(await synchronizeHomeOnce({ownerId:A,persistence:local,transport:s.port,isCurrent:()=>true})).toBe('conflict');
    expect(s.stored?.raw).toBe(raw('light'));
    expect(local.count).toBe(0);expect(local.state.pending).toHaveLength(1);
  });
  it('sign-out during read never emits a successful sync acknowledgment',async()=>{
    const s=simulated(),local=memory();
    s.f.setFetch(()=>{s.f.setUser(null);return reply(null);});
    expect(await synchronizeHomeOnce({ownerId:A,persistence:local,transport:s.port,isCurrent:()=>true})).not.toBe('synced');
    expect(local.count).toBe(0);expect(local.state.pending).toHaveLength(1);
  });
});
