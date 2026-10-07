import {afterEach,describe,expect,it,vi} from 'vitest';
import {HubNotesSession,NOTES_PENDING_KEY,NOTES_CALLBACK,NOTES_ISSUER,parseNotesConsent,validNotesConfig} from '../../src/lib/hub-notes-session';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',CLIENT='33333333-3333-4333-8333-333333333333',REV='44444444-4444-4444-8444-444444444444';
const NOW=Date.parse('2026-10-03T20:00:00.000Z');
const cfg={clientId:CLIENT,platformOrigin:'https://platform-fictional.vercel.app',publishableKey:'sb_publishable_fictional'};
const consent={permissions:['notes.hub.summary.read','notes.hub.search.read'],revision:REV};
const token=(patch:Record<string,unknown>={})=>'eyJhbGciOiJFUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:A,client_id:CLIENT,session_id:REV,iss:NOTES_ISSUER+'/auth/v1',aud:'authenticated',role:'authenticated',exp:Math.floor(NOW/1000)+3600,...patch})).toString('base64url')+'.fictional_signature';
const response=(patch:Record<string,unknown>={})=>({access_token:token(),refresh_token:'fictional_refresh',token_type:'bearer',expires_in:3600,...patch});
function fixture(options:{claims?:Record<string,unknown>;denied?:boolean;badRow?:boolean;delay?:()=>Promise<void>;ttl?:number}={}){
  let owner:string|null=A,now=NOW;const map=new Map<string,string>();
  const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
  const http=vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
    expect(init?.redirect).toBe('error');expect(init?.credentials).toBe('omit');expect(init?.cache).toBe('no-store');expect(init?.referrerPolicy).toBe('no-referrer');
    if(String(url).endsWith('/oauth/token'))return Response.json(response({access_token:token(options.claims),expires_in:options.ttl??3600}));
    expect(new Headers(init?.headers).get('authorization')).toContain('Bearer eyJ');
    if(String(url).endsWith('/notes/access'))return Response.json({ok:true,data:options.denied?null:{accountId:A,consumer:'thiepn-hub',audience:'notes-hub',permissions:consent.permissions,grantRevision:REV,expiresAt:NOW+Math.min(options.ttl??3600,3600)*1000,accountState:'active',notesSyncAccess:true}});
    expect(String(url)).toBe(cfg.platformOrigin+'/hub/notes/v1');
    const input=JSON.parse(String(init?.body));await options.delay?.();
    return Response.json({schemaVersion:1,providerId:'notes',operation:input.operation,requestId:input.requestId,context:input.context,privacy:'private',coverage:'cloud-snapshot',status:'ready',observedAt:new Date(now).toISOString(),expiresAt:new Date(Math.min(now+300000,NOW+Math.min(options.ttl??3600,3600)*1000)).toISOString(),sourceUpdatedAt:new Date(now-1000).toISOString(),data:{items:[{resourceId:B,title:'Fictional title',updatedAt:new Date(now-1000).toISOString(),...(options.badRow?{content:'PRIVATE_BODY'}:{})}]}});
  });
  const session=new HubNotesSession(cfg,storage,()=>owner,http,()=>now);
  return{session,storage,map,http,owner:(v:string|null)=>{owner=v;},clock:(v:number)=>{now=v;}};
}
async function connect(f:ReturnType<typeof fixture>,patch?:Record<string,unknown>){await f.session.begin(A,consent);if(patch){const p=JSON.parse(f.storage.getItem(NOTES_PENDING_KEY)!);f.storage.setItem(NOTES_PENDING_KEY,JSON.stringify({...p,...patch}));}const p=JSON.parse(f.storage.getItem(NOTES_PENDING_KEY)!);await f.session.complete(new URLSearchParams({code:'fictional-code',state:p.state}),'');}
afterEach(()=>vi.useRealTimers());
describe('H14 standard managed OAuth and private Notes boundary',()=>{
  it('generates standard S256 PKCE and persists only bounded one-use initiation data',async()=>{
    const f=fixture(),url=new URL(await f.session.begin(A,consent)),p=JSON.parse(f.storage.getItem(NOTES_PENDING_KEY)!);
    expect(url.origin).toBe(NOTES_ISSUER);expect(url.pathname).toBe('/auth/v1/oauth/authorize');expect(url.searchParams.get('redirect_uri')).toBe(NOTES_CALLBACK);expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    const digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p.verifier))).toString('base64url');expect(url.searchParams.get('code_challenge')).toBe(digest);
    expect(JSON.stringify(p)).not.toMatch(/access_token|refresh_token|fictional_refresh/);expect(f.http).not.toHaveBeenCalled();
  });
  it('exchanges a single-use callback, verifies current access, then validates actual envelope',async()=>{
    const f=fixture();await connect(f);expect(f.map.size).toBe(0);const result=await f.session.read('summary',new AbortController().signal);expect(result.data?.items[0]?.title).toBe('Fictional title');expect(f.http).toHaveBeenCalledTimes(3);
    const exchange=new URLSearchParams(String(f.http.mock.calls[0]![1]?.body));expect(exchange.get('grant_type')).toBe('authorization_code');expect(exchange.get('client_secret')).toBeNull();
    await expect(f.session.complete(new URLSearchParams({code:'fictional-code',state:'x'.repeat(43)}),'')).rejects.toThrow();
  });
  it.each([{owner:B},{revision:'bad'},{started:NOW-600001},{started:NOW+1},{started:Infinity},{clientId:B},{verifier:'x'},{extra:'bad'}])('rejects invalid initiation %j before token calls',async(patch)=>{
    const f=fixture();await expect(connect(f,patch)).rejects.toThrow();expect(f.http).not.toHaveBeenCalled();expect(f.map.size).toBe(0);
  });
  it.each(['code=x&code=y&state=z','code=x&state=z&unknown=1','error=access_denied&state=z','code=x&state=z'])('rejects callback confusion %s',async(query)=>{
    const f=fixture();await f.session.begin(A,consent);await expect(f.session.complete(new URLSearchParams(query),'')).rejects.toThrow();expect(f.http).not.toHaveBeenCalled();expect(f.map.size).toBe(0);
  });
  it('rejects implicit tokens and clears a failed callback',async()=>{const f=fixture();await f.session.begin(A,consent);const p=JSON.parse(f.storage.getItem(NOTES_PENDING_KEY)!);await expect(f.session.complete(new URLSearchParams({code:'x',state:p.state}),'#access_token=secret')).rejects.toThrow();expect(f.http).not.toHaveBeenCalled();});
  it.each([{sub:B},{client_id:B},{aud:'thiepn-hub'},{role:'service_role'},{iss:'https://evil.test/auth/v1'},{exp:1},{is_anonymous:true},{session_id:'bad'}])('rejects wrong token claims %j without using them as authority',async(claims)=>{const f=fixture({claims});await expect(connect(f)).rejects.toThrow();expect(f.session.connected()).toBe(false);});
  it('exposes only sanitized provider access after a verified Notes connection',async()=>{
    const f=fixture();await connect(f);
    const access=await f.session.providerAccess(consent);
    expect(access).toEqual({
      providerId:'notes',
      context:{scope:'account',accountId:A,workspaceId:null,grantRevision:REV,translationId:null},
      permissions:consent.permissions,
      expiresAt:NOW+3600*1000,
    });
    expect(JSON.stringify(access)).not.toMatch(/access_token|refresh_token|fictional_refresh|Bearer eyJ/);
  });
  it('rejects provider access when current consent no longer matches the connected grant',async()=>{
    const f=fixture();await connect(f);
    await expect(f.session.providerAccess({...consent,revision:B})).rejects.toThrow();
    await expect(f.session.providerAccess({permissions:['app_data.read'],revision:REV})).rejects.toThrow();
  });
  it('fails closed before private data when current authority denies access',async()=>{const f=fixture({denied:true});await connect(f);await expect(f.session.read('summary',new AbortController().signal)).rejects.toThrow();expect(f.http).toHaveBeenCalledTimes(2);expect(f.session.connected()).toBe(false);});
  it('rejects an extra body field from the owner response',async()=>{const f=fixture({badRow:true});await connect(f);await expect(f.session.read('summary',new AbortController().signal)).rejects.toThrow();expect(f.session.connected()).toBe(false);});
  it('withholds late results after account changes and clearing',async()=>{let release!:()=>void;const f=fixture({delay:()=>new Promise<void>(r=>{release=r;})});await connect(f);const pending=f.session.read('summary',new AbortController().signal);await vi.waitFor(()=>expect(release).toBeTypeOf('function'));f.owner(B);f.session.clear();release();await expect(pending).rejects.toThrow();expect(f.session.connected()).toBe(false);});
  it('sends private title search in POST bodies, with no URL echo or persistent data',async()=>{const f=fixture();await connect(f);await f.session.read('search',new AbortController().signal,'private % query');expect(f.http.mock.calls.every(([url])=>!String(url).includes('private %'))).toBe(true);expect(JSON.parse(String(f.http.mock.calls[2]![1]?.body)).query).toBe('private % query');expect(f.map.size).toBe(0);});
  it('refreshes near-expiry tokens before checking current grants again',async()=>{const f=fixture({ttl:30});await connect(f);await f.session.read('summary',new AbortController().signal);const forms=f.http.mock.calls.filter(([url])=>String(url).endsWith('/oauth/token')).map(([,init])=>new URLSearchParams(String(init?.body)));expect(forms[1]?.get('grant_type')).toBe('refresh_token');expect(f.map.size).toBe(0);});
  it('has a two-second whole-read deadline even when upstream ignores abort',async()=>{const f=fixture({delay:()=>new Promise<void>(()=>{})});await connect(f);vi.useFakeTimers();const pending=f.session.read('summary',new AbortController().signal);const check=expect(pending).rejects.toThrow();await vi.advanceTimersByTimeAsync(2100);await check;expect(f.session.connected()).toBe(false);});
  it('rejects broad consent and unsafe deployment configuration',()=>{expect(()=>parseNotesConsent({permissions:['app_data.read'],revision:REV})).toThrow();expect(()=>parseNotesConsent({permissions:consent.permissions,revision:null})).toThrow();expect(validNotesConfig({...cfg,platformOrigin:'https://evil.test'})).toBe(false);expect(validNotesConfig({...cfg,platformOrigin:'https://platform.vercel.app/path'})).toBe(false);});
});
