import { hubIdentity, readHubNotesConsent } from './portal-auth';
import { mountInbox } from '../lib/inbox-controller';
import { HubNotesSession, INBOX_PENDING_KEY } from '../lib/hub-notes-session';
import { PILOT_PROVIDERS } from '../lib/providers/registry';
import { managedQuery, managedFragment, managedCallback, managedTarget } from '../lib/hub-managed-return';

const root = document.querySelector<HTMLElement>('[data-portal-inbox]');
if (root) {
  const hide = root.querySelector<HTMLButtonElement>('[data-inbox-hide]')!;
  const content = root.querySelector<HTMLElement>('[data-inbox-content]')!;
  const account = root.querySelector<HTMLElement>('[data-hub-account]')!;
  const hidden = root.querySelector<HTMLElement>('[data-inbox-hidden]')!;
  const status = root.querySelector<HTMLElement>('[data-inbox-status]')!;
  const connect = root.querySelector<HTMLButtonElement>('[data-inbox-connect]');
  const disconnect = root.querySelector<HTMLButtonElement>('[data-inbox-disconnect]');
  const callback = managedCallback && managedTarget === INBOX_PENDING_KEY;
  const owner = () => hubIdentity.status === 'signed-in' ? hubIdentity.id : null;
  let session: HubNotesSession | null = null;
  let generation = 0, masked = false, used = false;
  try {
    if (!connect || location.origin !== 'https://thiepn.dev' || import.meta.env.PUBLIC_HUB_ACCOUNT_ENTRY !== 'v1') throw new Error('Unavailable');
    session = new HubNotesSession({ inbox:true, clientId:import.meta.env.PUBLIC_HUB_INBOX_CLIENT_ID ?? '', platformOrigin:'', publishableKey:import.meta.env.PUBLIC_THIEPN_SUPABASE_PUBLISHABLE_KEY ?? '' }, sessionStorage, owner);
  } catch { if (connect) status.textContent = 'Inbox connection is unavailable. Open Notes to manage reminders.'; }
  const adapters = session ? PILOT_PROVIDERS.map(m => {
    const manifest = structuredClone(m);
    if (m.id === 'notes') { manifest.privateReadsEnabled = manifest.inlineWritesEnabled = manifest.operations.inbox = true; }
    return { manifest, read: (request: import('../lib/providers/inbox').AttentionRequest, signal: AbortSignal) => session!.readAttention(request,signal), ...(m.id === 'notes' ? {acknowledge:(request:import('../lib/providers/inbox-runtime').AttentionActionRequest,signal:AbortSignal)=>session!.readAttention(request,signal)} : {}) };
  }) : [];
  const inbox = mountInbox(root, adapters);
  const controls = () => { if (connect) connect.disabled = !session || !owner() || masked || document.hidden; };
  const clear = (removePending = true) => { ++generation; inbox.clear(); session?.clear(removePending); if (disconnect) disconnect.hidden = true; controls(); };
  hide.hidden = false;
  hide.addEventListener('click', () => {
    masked = !masked; content.hidden = account.hidden = masked; hidden.hidden = !masked; hide.textContent = masked ? 'Show Inbox' : 'Hide Inbox';
    if (masked) clear(); controls();
  });
  connect?.addEventListener('click', () => void (async () => {
    const id = owner(); if (!session || !id || masked || document.hidden) return;
    clear(); const epoch = generation; connect.disabled = true; status.textContent = 'Checking Inbox sharing choices…';
    try {
      const consent = await readHubNotesConsent(id);
      if (epoch !== generation || id !== owner()) return;
      const url = await session.begin(id,consent);
      if (epoch === generation && id === owner() && !masked && !document.hidden) location.assign(url);
    } catch { if (epoch === generation) status.textContent = 'Choose Inbox sharing in Account, then connect again.'; }
    finally { controls(); }
  })());
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('thiepn:hub-notes:clear:v1') : null;
  disconnect?.addEventListener('click', () => { clear(); status.textContent = 'Inbox disconnected in this tab. Revoke sharing in Account to remove access everywhere.'; channel?.postMessage({type:'clear'}); });
  channel?.addEventListener('message', () => clear());
  async function identityChanged() {
    clear(!callback || used);
    if (!callback || used || !owner() || !session || masked || document.hidden) return;
    used = true; const epoch = generation;
    try {
      await session.complete(managedQuery,managedFragment);
      const id = owner(); if (epoch !== generation || !id) return;
      const consent = await readHubNotesConsent(id);
      if (epoch !== generation || id !== owner()) return;
      const access = await session.inboxAccess(consent);
      if (epoch !== generation || id !== owner() || masked || document.hidden) return;
      await inbox.connect([access]);
      if (epoch !== generation) return;
      if (disconnect) disconnect.hidden = false;
    } catch { if (epoch === generation) { clear(); status.textContent = 'This Inbox return is missing, expired or unavailable. Connect again.'; } }
  }
  window.addEventListener('hub:identity', () => void identityChanged());
  window.addEventListener('pagehide', () => clear(false));
  window.addEventListener('pageshow', e => { if (e.persisted) clear(); });
  window.addEventListener('storage', e => { if (e.key === 'thiepn:hub-auth:v1') clear(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(false); else if (callback && !used) void identityChanged(); controls(); });
  controls(); void identityChanged();
}
