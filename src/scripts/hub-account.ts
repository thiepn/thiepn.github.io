import {ConnectionFailure} from '../lib/providers/connection-state';
import { createThiepnAccountSession, createThiepnBrowserSso, type ThiepnAccountSession } from '@thiepn/account-session';
import configuration from '../data/hub-account.json';
import { validAccountId, type HubIdentity } from '../lib/hub-auth';
import { readBoundedJson } from '../lib/providers/runtime';
import { createHubAccountStorage } from '../lib/hub-account-storage';
import { persistHubAccountStorage } from '../lib/hub-account-persistence';
import type { CloudMutation, CloudTransport } from '../lib/workspace/cloud-sync';

const STORAGE = 'thiepn:hub-sso:v1';
const RETURN = STORAGE + ':return';
const VERIFIED = STORAGE + ':verified';
let accountSession: ThiepnAccountSession | null = null;
let activeIdentity: HubIdentity = { status: 'checking' };
let epoch = 0;
export const managedAccountEnabled = configuration.enabled && configuration.version === 1 && validAccountId(configuration.clientId);
function claims(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) throw new Error('Account session is unavailable.');
  return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
}
async function fingerprint(token: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), byte => byte.toString(16).padStart(2, '0')).join('');
}
function matchingToken(token: string, owner: string) {
  const value = claims(token);
  return value.sub === owner && value.client_id === configuration.clientId && value.iss === configuration.issuer + '/auth/v1' && value.aud === 'authenticated';
}
/** Reverify the current owner before an existing first-party read-only handoff. */
export async function readVerifiedHubToken(owner:string):Promise<string|null> {
  if(!accountSession||activeIdentity.status!=='signed-in'||activeIdentity.id!==owner)return null;
  const own=epoch,session=accountSession;
  const identity=await session.verify();
  if(identity.status!=='signed-in'||identity.id!==owner||own!==epoch)return null;
  const token=await session.getAccessToken();
  return own===epoch&&activeIdentity.status==='signed-in'&&activeIdentity.id===owner&&token&&matchingToken(token,owner)?token:null;
}
export async function hubRpc(owner: string, name: string, data: Record<string, unknown> = {}, signal?: AbortSignal): Promise<unknown> {
  if (!accountSession || activeIdentity.status !== 'signed-in' || activeIdentity.id !== owner) throw new ConnectionFailure('session-required','Connect your THIEPN Account to sync.');
  const own = epoch;
  const token = await accountSession.getAccessToken();
  if (own !== epoch || !token || !matchingToken(token, owner)) throw new ConnectionFailure('session-changed','Account changed. Your device copy is preserved.');
  const requestSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(10000)]);
  const response = await fetch(configuration.issuer + '/rest/v1/rpc/' + name, {
    method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
    headers: { apikey: configuration.publishableKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(data), signal: requestSignal,
  });
  if (own !== epoch || activeIdentity.status !== 'signed-in' || activeIdentity.id !== owner) throw new ConnectionFailure('session-changed','Account changed.');
  if (!response.ok) {
    if ([401,403].includes(response.status)) throw new ConnectionFailure(response.status===401?'session-required':'permission-required','Account connection needs attention. Open Account to reconnect Hub and review permissions.');
    throw new ConnectionFailure(response.status===429?'rate-limited':'service-unavailable','Cloud sync unavailable. Retrying…');
  }
  const raw = await readBoundedJson(response, 5100000, requestSignal);
  let value:unknown;
  try {value=JSON.parse(raw);}catch{throw new ConnectionFailure('invalid-response','Account returned an unreadable response.');}
  if (own !== epoch || activeIdentity.status !== 'signed-in' || activeIdentity.id !== owner) throw new ConnectionFailure('session-changed','Account changed.');
  return value;
}
export function hubCloudTransport(owner: string): CloudTransport {
  return {
    read: async signal => await hubRpc(owner, 'read_thiepn_hub_workspace', {}, signal) as Awaited<ReturnType<CloudTransport['read']>>,
    push: async (mutation: CloudMutation, device: string, signal: AbortSignal) => await hubRpc(owner, 'sync_thiepn_hub_workspace', {
      p_mutation_id: mutation.id, p_base_revision: mutation.base, p_device_id: device, p_state: mutation.state,
    }, signal) as Awaited<ReturnType<CloudTransport['push']>>,
  };
}
export interface HubConnections {
  owner: string;
  notes: { permissions: string[]; revision: string | null };
  tms60: { translation: string; permissions: string[]; revision: string }[];
  library: boolean;
}
export async function hubConnections(owner: string, signal?: AbortSignal): Promise<HubConnections> {
  const value = await hubRpc(owner, 'get_thiepn_hub_connections', {}, signal) as HubConnections;
  if (!value || value.owner !== owner || !Array.isArray(value.notes?.permissions) || !Array.isArray(value.tms60) || value.tms60.length > 7 || typeof value.library !== 'boolean') throw new ConnectionFailure('invalid-response','App connections could not be verified.');
  return value;
}
export async function prepareAccountNavigation() {
  const work: Promise<void>[] = [];
  window.dispatchEvent(new CustomEvent('hub:before-account-navigation', { detail: { wait: (promise: Promise<void>) => work.push(promise) } }));
  await Promise.all(work);
}
function returnTo(): string {
  const paths = ['/', '/apps/', '/home/', '/home/tasks/', '/home/calendar/', '/home/trackers/', '/home/settings/'];
  return paths.includes(location.pathname) ? location.pathname : '/';
}
export async function setupHubAccount(root: HTMLElement, publish: (identity: HubIdentity) => void) {
  const status = root.querySelector<HTMLElement>('[data-auth-status]')!;
  const login = root.querySelector<HTMLButtonElement>('[data-auth-login]')!;
  const switcher = root.querySelector<HTMLButtonElement>('[data-auth-switch]')!;
  const logout = root.querySelector<HTMLButtonElement>('[data-auth-logout]')!;
  const retry = root.querySelector<HTMLButtonElement>('[data-auth-retry]')!;
  let busy = false, verification = 0;
  // Initialization can fail before the session's event handlers exist.
  // Retry must still restart it once browser storage becomes available.
  let retryConnection = () => location.reload();
  retry.addEventListener('click', () => retryConnection());
  function show(identity: HubIdentity, message?: string) {
    const previous = activeIdentity;
    activeIdentity = identity;
    const changed = previous.status !== identity.status || (previous.status === 'signed-in' && identity.status === 'signed-in' && previous.id !== identity.id);
    if (changed) { ++epoch; publish(identity); }
    status.textContent = message ?? (identity.status === 'signed-in' ? identity.label : identity.status === 'signed-out' ? 'Not connected' : identity.status === 'checking' ? 'Connecting…' : 'Cloud sync unavailable.');
    login.hidden = identity.status !== 'signed-out';
    logout.hidden = switcher.hidden = identity.status !== 'signed-in';
    retry.hidden = identity.status !== 'unavailable';
    [login,switcher,logout,retry].forEach(button => button.disabled = busy);
  }
  if (location.origin !== configuration.hubOrigin) { show({ status: 'signed-out' }, 'Cloud sync is available on thiepn.dev.'); login.hidden = true; return; }
  try {
    let persistent: Storage | null = null;
    try { persistent = localStorage; } catch { /* Account credentials may still use tab storage. */ }
    const keys = [STORAGE+':tokens', VERIFIED, `thiepn:sso:${configuration.clientId}:manual-signout`];
    const fallback = createHubAccountStorage(persistent, sessionStorage, keys);
    const durable = await persistHubAccountStorage(fallback, keys, persistent);
    const storage = durable.storage;
    const session = createThiepnAccountSession({ issuer: configuration.issuer, publishableKey: configuration.publishableKey, clientId: configuration.clientId, redirectUri: configuration.callback, storageKey: STORAGE, authPolicy: 'guest-first', localStorage: storage });
    accountSession = { ...session,
      verify: () => durable.run(() => session.verify()),
      getAccessToken: () => durable.run(() => session.getAccessToken()),
      completeCallback: input => durable.run(() => session.completeCallback(input)),
    };
    let pendingNavigation: string | null = null;
    let navigating: Promise<void> | null = null;
    function continueNavigation(url:string):Promise<void> {
      if(navigating)return navigating;
      pendingNavigation=url;
      const work=(async()=>{
        try {
          // Discovery may finish while the user is typing. Flush again at
          // the actual handoff, not only before the background probe.
          await prepareAccountNavigation();
          await durable.flush();
          sessionStorage.setItem(RETURN,returnTo());
          location.assign(url);
        } catch {
          busy=false;
          show(activeIdentity,'Save or export your changes before continuing the Account connection.');
          login.hidden=true;retry.hidden=false;
        }
      })();
      navigating=work;
      return work.finally(()=>{if(navigating===work)navigating=null;});
    }
    const createSso = () => createThiepnBrowserSso(accountSession!, {
      accountOrigin: configuration.accountOrigin,
      probeTimeoutMs: 8000,
      optOutStorage: storage,
      navigate: url => {void continueNavigation(url);},
    });
    let sso=createSso();
    let signOutChannel: BroadcastChannel | null = null;
    try { if(typeof BroadcastChannel !== 'undefined')signOutChannel = new BroadcastChannel('thiepn:hub-account-signout'); } catch { /* Storage events remain available where supported. */ }
    async function signOut(notify: boolean) {
      try {
        await prepareAccountNavigation();
        ++verification;
        await durable.run(() => { sso.signOutLocal(); storage.removeItem(VERIFIED); });
        show({status:'signed-out'});
        if(notify)signOutChannel?.postMessage('signed-out');
      } catch { show(activeIdentity,'Save or export your changes before signing out.'); }
    }
    // Notify other tabs without putting credentials in messages.
    if(signOutChannel)signOutChannel.onmessage = event => {if(event.data==='signed-out')void signOut(false);};
    async function verified(identity: ReturnType<ThiepnAccountSession['identity']>, ticket = verification) {
      if (ticket !== verification) return;
      async function retainBefore(nextOwner: string | null) {
        const currentOwner=activeIdentity.status==='signed-in'?activeIdentity.id:activeIdentity.status==='signed-out'?null:undefined;
        if(currentOwner!==undefined && currentOwner!==nextOwner)await prepareAccountNavigation();
        return ticket===verification;
      }
      if (identity.status === 'signed-in') {
        const token = await accountSession!.getAccessToken();
        if (!token || !matchingToken(token, identity.id)) throw new Error('Account changed during verification.');
        const record = { id: identity.id, label: identity.email ?? 'THIEPN member', token: await fingerprint(token) };
        if (!await retainBefore(identity.id)) return;
        await durable.run(() => {
          if (ticket !== verification) return;
          const current = JSON.parse(storage.getItem(STORAGE+':tokens') ?? 'null') as {accessToken?: string} | null;
          if (current?.accessToken !== token) throw new Error('Account changed during verification.');
          storage.setItem(VERIFIED, JSON.stringify(record));
        });
        if (ticket !== verification) return;
        show({ status: 'signed-in', id: record.id, label: record.label });
      } else if (identity.status === 'signed-out' && !storage.getItem(STORAGE + ':tokens')) { if(!await retainBefore(null))return;storage.removeItem(VERIFIED); show({ status: 'signed-out' }); }
      else {
        // A previously verified, unchanged credential permits offline local work.
        // RPCs still validate the real token and owner independently on every call.
        let cached: { id: string; label: string; token: string } | null = null;
        try { cached = JSON.parse(storage.getItem(VERIFIED) ?? 'null'); } catch { /* Keep storage untouched. */ }
        const tokens = JSON.parse(storage.getItem(STORAGE + ':tokens') ?? 'null') as { accessToken?: string } | null;
        if (ticket !== verification) return;
        if (cached && validAccountId(cached.id) && typeof cached.label === 'string' && tokens?.accessToken && matchingToken(tokens.accessToken, cached.id) && await fingerprint(tokens.accessToken) === cached.token) {
          if (!await retainBefore(cached.id)) return;
          show({ status: 'signed-in', id: cached.id, label: cached.label }, 'Offline · sync paused');
        } else if(await retainBefore(null)) {
          show({ status: 'signed-out' }, 'Cloud sync could not be verified. Try again.');
          retry.hidden = false;
        }
      }
    }
    let discovery: Promise<void> | null = null;
    async function check(): Promise<void> {
      // A background tab with an existing credential must still establish its
      // verified owner: otherwise Safari/WebKit may never initialize the
      // second tab before it is brought to the foreground. Defer only
      // *tokenless* SSO discovery while hidden; never infer signed-out from
      // visibility or bypass verification of an existing credential.
      if (busy || (document.hidden && !storage.getItem(STORAGE+':tokens'))) return;
      if (discovery) return discovery;
      const ticket=++verification;
      const work=(async()=>{
        try {
          await prepareAccountNavigation();
          if(ticket!==verification || busy)return;
          // Re-discover Account when Hub has no session, rather than only
          // verifying an absent Hub token. The SDK retains sign-out/revocation
          // guards, origin checks, cooldown and a single PKCE redirect.
          const result=await sso.initialize();
          if(result.status==='ready')await verified(result.identity,ticket);
        } catch {if(ticket===verification){
          // An unavailable cloud service must not lock a visitor's device workspace.
          show(activeIdentity.status==='signed-in'?{status:'unavailable'}:{status:'signed-out'},'Cloud sync unavailable. Try again.');
          retry.hidden=false;
        }}
      })();
      discovery=work;
      try {await work;}finally{if(discovery===work)discovery=null;}
    }
    async function connect(changing = false) {
      if (busy) return;
      const previousIdentity=activeIdentity;
      busy = true; ++verification;
      try {
        await prepareAccountNavigation();
        if (changing) { await durable.run(() => { sso.signOutLocal(); storage.removeItem(VERIFIED); }); }
        show({ status: 'checking' });
        await sso.connect();
      } catch { busy = false; show(previousIdentity.status==='signed-out'?{status:'signed-out'}:{status:'unavailable'}, 'Cloud sync could not start. Try again.');retry.hidden=false; }
    }
    login.addEventListener('click', () => void connect());
    switcher.addEventListener('click', () => void connect(true));
    logout.addEventListener('click', () => { void signOut(true); });
    retryConnection = () => { if(pendingNavigation){void continueNavigation(pendingNavigation);return;} if (location.pathname === '/home/auth/callback/') location.replace('/'); else void check(); };
    window.addEventListener('storage', event => {
      if (event.key === STORAGE + ':tokens') {
        fallback.reconcilePersistentChange(STORAGE+':tokens');
        fallback.reconcilePersistentChange(VERIFIED);
        void check();
      }
    });
    window.addEventListener('online', () => void check());
    window.addEventListener('focus', () => void check());
    let discoveryTimer: ReturnType<typeof setInterval> | undefined;
    const startDiscovery=()=>{if(!discoveryTimer)discoveryTimer=setInterval(()=>void check(),60_000);};
    startDiscovery();
    window.addEventListener('pagehide',event=>{clearInterval(discoveryTimer);discoveryTimer=undefined;if(!event.persisted)signOutChannel?.close();});
    window.addEventListener('pageshow',event=>{if(event.persisted){sso=createSso();pendingNavigation=null;navigating=null;startDiscovery();void check();}});
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !busy) void check(); });
    if (location.pathname === new URL(configuration.callback).pathname) {
      const original = { href: location.href, hash: location.hash };
      history.replaceState(null,'',location.pathname);
      busy = true; show({ status: 'checking' });
      // Shared SDK consumes the pending nonce and code once, then verifies getUser.
      const result = await accountSession.completeCallback(original);
      busy = false; await verified(result);
      if (activeIdentity.status === 'signed-in') {
        await durable.flush();
        const target = sessionStorage.getItem(RETURN) ?? '/'; sessionStorage.removeItem(RETURN);
        location.replace(['/', '/apps/', '/home/', '/home/tasks/', '/home/calendar/', '/home/trackers/', '/home/settings/'].includes(target) ? target : '/');
      }
    } else {
      // Guest-first: Account discovery runs in the background; private owner
      // records still require a verified app credential before they can load.
      if(!storage.getItem(STORAGE+':tokens'))show({status:'signed-out'});
      await check();
    }
  } catch (error) {
    busy = false;
    const storageError = error instanceof DOMException && ['QuotaExceededError','SecurityError'].includes(error.name);
    root.dataset.accountFailure = storageError ? error.name : 'initialization';
    show({ status: 'signed-out' }, storageError
      ? 'Browser session storage is blocked. Allow storage, then try again.'
      : 'Cloud sync could not start. Try again.');
    retry.hidden=false;
  }
}
