import {ConnectionFailure} from '../lib/providers/connection-state';
import { createThiepnAccountSession, createThiepnBrowserSso, type ThiepnAccountSession } from '@thiepn/account-session';
import configuration from '../data/hub-account.json';
import { validAccountId, type HubIdentity } from '../lib/hub-auth';
import { readBoundedJson } from '../lib/providers/runtime';
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
    throw new ConnectionFailure(response.status===429?'rate-limited':'service-unavailable','Saved on this device · cloud sync unavailable. We will retry.');
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
  function show(identity: HubIdentity, message?: string) {
    const previous = activeIdentity;
    activeIdentity = identity;
    const changed = previous.status !== identity.status || (previous.status === 'signed-in' && identity.status === 'signed-in' && previous.id !== identity.id);
    if (changed) { ++epoch; publish(identity); }
    status.textContent = message ?? (identity.status === 'signed-in' ? `Connected as ${identity.label}. Your Hub workspace syncs with your account.` : identity.status === 'signed-out' ? 'Sign in to sync your Hub workspace and use your connected apps.' : identity.status === 'checking' ? 'Connecting your THIEPN Account…' : 'Account connection is unavailable. Your device data is preserved.');
    login.hidden = identity.status !== 'signed-out';
    logout.hidden = switcher.hidden = identity.status !== 'signed-in';
    retry.hidden = identity.status !== 'unavailable';
    [login,switcher,logout,retry].forEach(button => button.disabled = busy);
  }
  if (location.origin !== configuration.hubOrigin) { show({ status: 'signed-out' }, 'Account sync is available on thiepn.dev. This preview keeps data on this device.'); login.hidden = true; return; }
  try {
    localStorage.setItem(STORAGE + ':probe','1'); localStorage.removeItem(STORAGE + ':probe');
    accountSession = createThiepnAccountSession({ issuer: configuration.issuer, publishableKey: configuration.publishableKey, clientId: configuration.clientId, redirectUri: configuration.callback, storageKey: STORAGE, authPolicy: 'guest-first' });
    const sso = createThiepnBrowserSso(accountSession, {
      accountOrigin: configuration.accountOrigin,
      navigate: url => { sessionStorage.setItem(RETURN, returnTo()); location.assign(url); },
    });
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
        localStorage.setItem(VERIFIED, JSON.stringify(record));
        show({ status: 'signed-in', id: record.id, label: record.label });
      } else if (identity.status === 'signed-out' && !localStorage.getItem(STORAGE + ':tokens')) { if(!await retainBefore(null))return;localStorage.removeItem(VERIFIED); show({ status: 'signed-out' }); }
      else {
        // A previously verified, unchanged credential permits offline local work.
        // RPCs still validate the real token and owner independently on every call.
        let cached: { id: string; label: string; token: string } | null = null;
        try { cached = JSON.parse(localStorage.getItem(VERIFIED) ?? 'null'); } catch { /* Keep storage untouched. */ }
        const tokens = JSON.parse(localStorage.getItem(STORAGE + ':tokens') ?? 'null') as { accessToken?: string } | null;
        if (ticket !== verification) return;
        if (cached && validAccountId(cached.id) && typeof cached.label === 'string' && tokens?.accessToken && matchingToken(tokens.accessToken, cached.id) && await fingerprint(tokens.accessToken) === cached.token) {
          if (!await retainBefore(cached.id)) return;
          show({ status: 'signed-in', id: cached.id, label: cached.label }, 'Offline or Account unavailable. Your device changes are kept and will sync when reconnected.');
        } else show({ status: 'unavailable' });
      }
    }
    async function check() { const ticket=++verification;try { await verified(await sso.verify(),ticket); } catch { if(ticket===verification)show({ status: 'unavailable' }); } }
    async function connect(changing = false) {
      if (busy) return;
      busy = true; ++verification;
      try {
        await prepareAccountNavigation();
        if (changing) { sso.signOutLocal(); localStorage.removeItem(VERIFIED); }
        show({ status: 'checking' });
        await sso.connect();
      } catch { busy = false; show({ status: 'unavailable' }, 'Connection could not start. Your changes are preserved; try again.'); }
    }
    login.addEventListener('click', () => void connect());
    switcher.addEventListener('click', () => void connect(true));
    logout.addEventListener('click', () => { void (async()=>{try {await prepareAccountNavigation();++verification;++epoch;sso.signOutLocal();localStorage.removeItem(VERIFIED);show({status:'signed-out'});}catch{show(activeIdentity,'Save or export your changes before signing out.');}})(); });
    retry.addEventListener('click', () => { if (location.pathname === '/home/auth/callback/') location.replace('/'); else void check(); });
    window.addEventListener('storage', event => { if (event.key === STORAGE + ':tokens') void check(); });
    window.addEventListener('online', () => void check());
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !busy) void check(); });
    if (location.pathname === new URL(configuration.callback).pathname) {
      const original = { href: location.href, hash: location.hash };
      history.replaceState(null,'',location.pathname);
      busy = true; show({ status: 'checking' });
      // Shared SDK consumes the pending nonce and code once, then verifies getUser.
      const result = await accountSession.completeCallback(original);
      busy = false; await verified(result);
      if (activeIdentity.status === 'signed-in') {
        const target = sessionStorage.getItem(RETURN) ?? '/'; sessionStorage.removeItem(RETURN);
        location.replace(['/', '/apps/', '/home/', '/home/tasks/', '/home/calendar/', '/home/trackers/', '/home/settings/'].includes(target) ? target : '/');
      }
    } else {
      await prepareAccountNavigation();
      const result = await sso.initialize();
      if (result.status === 'ready') await verified(result.identity);
    }
  } catch { busy = false; show({ status: 'unavailable' }, 'Account connection needs working browser storage. Your local workspace remains available.'); }
}
