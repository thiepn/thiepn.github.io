import { contextKey } from './providers/contract';
import { validateAttention, type AttentionRequest } from './providers/inbox';
import type { AttentionActionRequest } from './providers/inbox-runtime';
import type { ProviderAccess } from './providers/types';
import { readBoundedJson } from './providers/runtime';
import { providerManifest } from './providers/registry';
import { validateProviderEnvelope } from './providers/contract';
import type { Operation, ProviderEnvelope, RequestContext } from './providers/types';

export const NOTES_PENDING_KEY = 'thiepn:hub-notes:pkce:v1';
export const NOTES_ISSUER = 'https://hycegznamzjhwinegaai.supabase.co';
export const NOTES_CALLBACK = 'https://thiepn.dev/home/';
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const INBOX_PENDING_KEY = 'thiepn:hub-inbox:pkce:v1';
const purposes = ['notes.hub.summary.read','notes.hub.continue.read','notes.hub.search.read','notes.hub.inbox.read','notes.hub.inbox.attention.write'];
export type NotesConsent = { permissions: string[]; revision: string | null };
export function parseNotesConsent(v: unknown, provider: 'notes'|'tms60' = 'notes'): NotesConsent {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Unavailable');
  const value = v as NotesConsent;
  if (Object.keys(value).sort().join(',') !== 'permissions,revision' || !Array.isArray(value.permissions) || value.permissions.length > (provider === 'notes' ? 5 : 3) || new Set(value.permissions).size !== value.permissions.length || value.permissions.some(p => !(provider === 'notes' ? purposes : purposes.slice(0,3).map(x=>x.replace('notes.',provider+'.'))).includes(p)) || !(value.revision === null || uuid(value.revision)) || value.revision === null && value.permissions.length) throw new Error('Unavailable');
  if (provider === 'notes' && value.permissions.includes('notes.hub.inbox.attention.write') && !value.permissions.includes('notes.hub.inbox.read')) throw new Error('Unavailable');
  return structuredClone(value);
}
type Pending = { state: string; verifier: string; started: number; owner: string; revision: string; clientId: string };
type Tokens = { bearer: string; refresh: string; expiresAt: number; owner: string; revision: string };
export type NotesSessionConfig = { clientId: string; platformOrigin: string; publishableKey: string; provider?: 'notes'|'tms60'; translationId?: string; inbox?: boolean };
export function validNotesConfig(config: NotesSessionConfig): boolean {
  try {
    if(config.inbox && config.provider==='tms60') return false;
    if(config.provider==='tms60')return uuid(config.clientId) && /^sb_publishable_[a-zA-Z0-9_-]+$/.test(config.publishableKey) && ['esv','niv','nlt','hfa','schlachter1951','klb1985','krv1961'].includes(config.translationId ?? '');
    if (config.inbox === true) return uuid(config.clientId) && /^sb_publishable_[a-zA-Z0-9_-]+$/.test(config.publishableKey);
    const url = new URL(config.platformOrigin);
    return uuid(config.clientId) && /^sb_publishable_[a-zA-Z0-9_-]+$/.test(config.publishableKey) && url.origin === config.platformOrigin && url.protocol === 'https:' && url.hostname.endsWith('.vercel.app') && !url.username && !url.password;
  } catch { return false; }
}
const random = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const object = (value: unknown): value is Record<string,unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
/** Standard Supabase OAuth public-client flow. Tokens exist only in this object.
 * Decoded claims are rejection checks; the owner server/PostgREST verifies authority.
 */
export class HubNotesSession {
  private epoch = 0;
  private tokens: Tokens | null = null;
  private controllers = new Set<AbortController>();
  private refreshFlight: Promise<void> | null = null;
  constructor(private config: NotesSessionConfig, private storage: Pick<Storage,'getItem'|'setItem'|'removeItem'>, private owner: () => string | null, private http: typeof fetch = fetch, private now = Date.now) {
    if (!validNotesConfig(config)) throw new Error('Unavailable');
  }
  private get callback(){return this.config.inbox ? 'https://thiepn.dev/inbox/' : NOTES_CALLBACK;}
  private get pendingKey(){return this.config.inbox ? INBOX_PENDING_KEY : this.config.provider==='tms60'?'thiepn:hub-tms60:pkce:'+this.config.translationId+':v1':NOTES_PENDING_KEY;}
  clear(removePending = true) {
    ++this.epoch; this.tokens = null; this.refreshFlight = null;
    for (const c of this.controllers) c.abort(); this.controllers.clear();
    if (removePending) try { this.storage.removeItem(this.pendingKey); } catch { /* inaccessible storage */ }
  }
  connected() { return !!this.tokens && this.tokens.owner === this.owner() && this.tokens.expiresAt > this.now(); }
  async begin(owner: string, raw: unknown): Promise<string> {
    this.clear(); const epoch = this.epoch;
    const consent = parseNotesConsent(raw,this.config.provider);
    if (this.config.inbox && !consent.permissions.includes('notes.hub.inbox.read')) throw new Error('Unavailable');
    if (!uuid(owner) || owner !== this.owner() || !consent.revision || !consent.permissions.length) throw new Error('Unavailable');
    const verifier = random(), state = random();
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
    const challenge = btoa(String.fromCharCode(...hash)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    if (epoch !== this.epoch || this.owner() !== owner) throw new Error('Unavailable');
    this.storage.setItem(this.pendingKey,JSON.stringify({ state, verifier, started:this.now(), owner, revision:consent.revision, clientId:this.config.clientId }));
    const url = new URL('/auth/v1/oauth/authorize',NOTES_ISSUER);
    url.search = new URLSearchParams({ response_type:'code',client_id:this.config.clientId,redirect_uri:this.callback,state,code_challenge:challenge,code_challenge_method:'S256',scope:'email' }).toString();
    return url.href;
  }
  /** Caller captures and scrubs URL before any async work. Single-use pending. */
  async complete(query: URLSearchParams, fragment: string): Promise<void> {
    const raw = this.storage.getItem(this.pendingKey); this.storage.removeItem(this.pendingKey);
    this.clear(false); const epoch = this.epoch;
    if (fragment || query.getAll('code').length !== 1 || query.getAll('state').length !== 1 || [...query.keys()].some(k => !['code','state'].includes(k)) || !raw || raw.length > 2048) throw new Error('Unavailable');
    const p = JSON.parse(raw) as Pending;
    const code = query.get('code')!;
    if (!object(p) || Object.keys(p).sort().join(',') !== 'clientId,owner,revision,started,state,verifier' || !/^[A-Za-z0-9_-]{43}$/.test(p.state) || !/^[A-Za-z0-9_-]{43}$/.test(p.verifier) || p.state !== query.get('state') || p.clientId !== this.config.clientId || !uuid(p.owner) || !uuid(p.revision) || p.owner !== this.owner() || !Number.isSafeInteger(p.started) || this.now() < p.started || this.now()-p.started > 600000 || !/^[A-Za-z0-9._~-]{1,2048}$/.test(code)) throw new Error('Unavailable');
    const value = await this.tokenRequest({ grant_type:'authorization_code',code,redirect_uri:this.callback,code_verifier:p.verifier });
    if (epoch !== this.epoch || p.owner !== this.owner()) throw new Error('Unavailable');
    this.tokens = this.parseTokens(value,p.owner,p.revision);
  }
  private parseTokens(value: unknown, owner: string, revision: string, previousRefresh?: string): Tokens {
    if (!object(value) || value.token_type !== 'bearer' || typeof value.access_token !== 'string' || !/^[A-Za-z0-9._-]{16,8192}$/.test(value.access_token) || !Number.isSafeInteger(value.expires_in) || Number(value.expires_in) < 1 || Number(value.expires_in) > 86400) throw new Error('Unavailable');
    const refresh = value.refresh_token ?? previousRefresh;
    if (typeof refresh !== 'string' || !/^[A-Za-z0-9._~-]{1,8192}$/.test(refresh)) throw new Error('Unavailable');
    const part = value.access_token.split('.'); if (part.length !== 3) throw new Error('Unavailable');
    const claims = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(part[1]!.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
    if (!object(claims) || claims.sub !== owner || claims.client_id !== this.config.clientId || claims.iss !== NOTES_ISSUER+'/auth/v1' || claims.aud !== 'authenticated' || claims.role !== 'authenticated' || claims.is_anonymous === true || !uuid(claims.session_id) || !Number.isSafeInteger(claims.exp) || Number(claims.exp)*1000 <= this.now()) throw new Error('Unavailable');
    return { bearer:value.access_token,refresh,owner,revision,expiresAt:Math.min(this.now()+Number(value.expires_in)*1000,Number(claims.exp)*1000) };
  }
  private async json(url: string, init: RequestInit, bytes: number, external?: AbortSignal): Promise<unknown> {
    const c = new AbortController(); this.controllers.add(c);
    const signal = AbortSignal.any([c.signal,AbortSignal.timeout(8000),...(external?[external]:[])]);
    let detach = () => {};
    try {
      const aborted = new Promise<never>((_,reject)=>{const abort=()=>reject(new Error('Unavailable'));detach=()=>signal.removeEventListener('abort',abort);if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});
      return await Promise.race([(async()=>{const r=await this.http.call(globalThis,url,{...init,signal,redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});return JSON.parse(await readBoundedJson(r,bytes,signal));})(),aborted]);
    } finally { detach(); c.abort(); this.controllers.delete(c); }
  }
  private tokenRequest(fields: Record<string,string>) {
    return this.json(NOTES_ISSUER+'/auth/v1/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',apikey:this.config.publishableKey},body:new URLSearchParams({...fields,client_id:this.config.clientId})},16384);
  }
  private async freshTokens(): Promise<Tokens> {
    const previous = this.tokens;
    if (!previous || previous.owner !== this.owner()) throw new Error('Unavailable');
    if (previous.expiresAt-this.now() < 60000) {
      if (!this.refreshFlight) {
        const epoch = this.epoch;
        this.refreshFlight = (async()=>{try {const raw=await this.tokenRequest({grant_type:'refresh_token',refresh_token:previous.refresh});if(epoch!==this.epoch || previous.owner!==this.owner())throw new Error('Unavailable');this.tokens=this.parseTokens(raw,previous.owner,previous.revision,previous.refresh);}catch {if(epoch===this.epoch)this.clear();throw new Error('Unavailable');}})().finally(()=>{if(epoch===this.epoch)this.refreshFlight=null;});
      }
      await this.refreshFlight;
    }
    if (!this.tokens || this.tokens.owner !== this.owner() || this.tokens.expiresAt <= this.now()) throw new Error('Unavailable');
    return this.tokens;
  }
  async inboxAccess(raw: unknown): Promise<ProviderAccess> {
    const consent = parseNotesConsent(raw);
    const tokens = await this.freshTokens();
    if (!this.config.inbox || consent.revision !== tokens.revision || !consent.permissions.includes('notes.hub.inbox.read')) throw new Error('Unavailable');
    return { providerId:'notes', context:{scope:'account',accountId:tokens.owner,workspaceId:null,grantRevision:tokens.revision,translationId:null}, permissions:consent.permissions, expiresAt:tokens.expiresAt };
  }
  async readAttention(request: AttentionRequest | AttentionActionRequest, signal: AbortSignal): Promise<string> {
    const epoch = this.epoch;
    const tokens = await this.freshTokens();
    const expected = {scope:'account' as const,accountId:tokens.owner,workspaceId:null,grantRevision:tokens.revision,translationId:null};
    if (!this.config.inbox || request.providerId !== 'notes' || request.operation !== 'inbox' || !uuid(request.requestId) || contextKey(request.context) !== contextKey(expected)) throw new Error('Unavailable');
    const command = 'action' in request ? request : null;
    const raw = await this.json(NOTES_ISSUER+'/rest/v1/rpc/thiepn_hub_notes_inbox', {
      method:'POST', headers:{Authorization:'Bearer '+tokens.bearer,apikey:this.config.publishableKey,'Content-Type':'application/json'},
      body:JSON.stringify({p_revision:tokens.revision,p_request_id:request.requestId,p_action:command?.action ?? null,p_issue_id:command?.issueId ?? null,p_expected_updated_at:command?.expectedUpdatedAt ?? null}),
    },32768,signal);
    if (epoch !== this.epoch || tokens.owner !== this.owner() || signal.aborted) throw new Error('Unavailable');
    const manifest = {...structuredClone(providerManifest('notes')),privateReadsEnabled:true,operations:{summary:false,continue:false,search:false,capture:false,inbox:true}};
    const envelope = validateAttention(JSON.stringify(raw),manifest,request,this.now());
    if (Date.parse(envelope.expiresAt) > tokens.expiresAt) throw new Error('Unavailable');
    return JSON.stringify(envelope);
  }
  async read(operation: Operation, external: AbortSignal, query?: string): Promise<ProviderEnvelope> {
    const epoch=this.epoch,signal=AbortSignal.any([external,AbortSignal.timeout(2000)]);
    let detach=()=>{};
    try{
      const aborted=new Promise<never>((_,reject)=>{const abort=()=>reject(new Error('Unavailable'));detach=()=>signal.removeEventListener('abort',abort);if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});
      return await Promise.race([this.performRead(operation,signal,query),aborted]);
    }catch{if(epoch===this.epoch&&!external.aborted)this.clear();throw new Error('Unavailable');}
    finally{detach();}
  }
  private async performRead(operation: Operation, signal: AbortSignal, query?: string): Promise<ProviderEnvelope> {
    const epoch = this.epoch;
    try {
      const tokens = await this.freshTokens();
      if(this.config.provider==='tms60'){
        if(operation==='search' && (typeof query!=='string'||!query.trim()||query.length>256||/[\u0000-\u001f\u007f]/.test(query)) || operation!=='search' && query!==undefined)throw new Error('Unavailable');
        const request:RequestContext={providerId:'tms60',operation,requestId:crypto.randomUUID(),context:{scope:'account',accountId:tokens.owner,workspaceId:null,grantRevision:tokens.revision,translationId:this.config.translationId!},...(query!==undefined?{query}:{})};
        const raw=await this.json(NOTES_ISSUER+'/rest/v1/rpc/read_thiepn_hub_tms60',{method:'POST',headers:{Authorization:'Bearer '+tokens.bearer,apikey:this.config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_operation:operation,p_revision:tokens.revision,p_translation:this.config.translationId,p_request_id:request.requestId,p_query:query??null})},operation==='search'?65536:32768,signal);
        if(epoch!==this.epoch||tokens.owner!==this.owner()||signal.aborted)throw new Error('Unavailable');
        const manifest={...structuredClone(providerManifest('tms60')),privateReadsEnabled:true,operations:{summary:true,continue:true,search:true,capture:false,inbox:false}};
        const envelope=validateProviderEnvelope(JSON.stringify(raw),manifest,request,this.now());
        if(Date.parse(envelope.expiresAt)>tokens.expiresAt)throw new Error('Unavailable');
        return envelope;
      }
      const snapshot = await this.json(this.config.platformOrigin+'/v1/private/hub/notes/access',{method:'POST',headers:{Authorization:'Bearer '+tokens.bearer,'Content-Type':'application/json'},body:JSON.stringify({operation,grantRevision:tokens.revision})},8192,signal);
      const auth = object(snapshot) && snapshot.ok === true ? snapshot.data : null;
      if (!object(auth) || Object.keys(auth).sort().join(',') !== 'accountId,accountState,audience,consumer,expiresAt,grantRevision,notesSyncAccess,permissions' || auth.accountId !== tokens.owner || auth.consumer !== 'thiepn-hub' || auth.audience !== 'notes-hub' || auth.accountState !== 'active' || auth.notesSyncAccess !== true || auth.grantRevision !== tokens.revision || !Array.isArray(auth.permissions) || auth.permissions.length > 5 || new Set(auth.permissions).size !== auth.permissions.length || auth.permissions.some(p=>!purposes.includes(p)) || !auth.permissions.includes(`notes.hub.${operation}.read`) || !Number.isSafeInteger(auth.expiresAt) || Number(auth.expiresAt) <= this.now() || Number(auth.expiresAt) > tokens.expiresAt || epoch !== this.epoch || tokens.owner !== this.owner()) throw new Error('Unavailable');
      if (operation === 'search' && (typeof query !== 'string' || !query.trim() || query.length > 256 || /[\u0000-\u001f\u007f]/.test(query)) || operation !== 'search' && query !== undefined) throw new Error('Unavailable');
      const request: RequestContext = {providerId:'notes',operation,requestId:crypto.randomUUID(),context:{scope:'account',accountId:tokens.owner,workspaceId:null,grantRevision:tokens.revision,translationId:null},...(query!==undefined?{query}:{})};
      const raw = await this.json(this.config.platformOrigin+'/hub/notes/v1',{method:'POST',headers:{Authorization:'Bearer '+tokens.bearer,'Content-Type':'application/json'},body:JSON.stringify(request)},operation==='search'?65536:32768,signal);
      if (epoch !== this.epoch || tokens.owner !== this.owner() || signal.aborted || Number(auth.expiresAt) <= this.now()) throw new Error('Unavailable');
      const manifest = {...structuredClone(providerManifest('notes')),privateReadsEnabled:true,operations:{summary:true,continue:true,search:true,capture:false,inbox:false}};
      const envelope = validateProviderEnvelope(JSON.stringify(raw),manifest,request,this.now());
      if (Date.parse(envelope.expiresAt) > Number(auth.expiresAt)) throw new Error('Unavailable');
      return envelope;
    } catch { if(epoch===this.epoch&&!signal.aborted)this.clear(); throw new Error('Unavailable'); }
  }
}
