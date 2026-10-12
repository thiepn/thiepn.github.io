import { hubIdentity, readHubNotesConsent, readHubTmsConsent } from './portal-auth';
import { HubNotesSession, NOTES_PENDING_KEY } from '../lib/hub-notes-session';
import { PrismManagedConnection, type PrismManagedState } from '../lib/prism/managed-provider-connection';
import { prismProviderRuntime } from '../lib/prism/provider-runtime';

const home = document.querySelector<HTMLElement>('[data-prism-home]');
const canonical = location.origin === 'https://thiepn.dev' && ['/home/', '/home'].includes(location.pathname);
if (home) void (async () => {
  // Do not scrub a preview URL into canonical Home or start a managed return there.
  const managed = canonical ? await import('../lib/hub-managed-return') : null;
  const owner = () => hubIdentity.status === 'signed-in' ? hubIdentity.id : null;
  for (const provider of ['notes', 'tms60'] as const) {
    const enabled = import.meta.env.PUBLIC_HUB_ACCOUNT_ENTRY === 'v1' && (provider === 'notes'
      ? import.meta.env.PUBLIC_HUB_NOTES_PRIVATE === 'staged-v1'
      : import.meta.env.PUBLIC_HUB_TMS60_PRIVATE === 'staged-v1');
    const row = document.querySelector<HTMLElement>(`[data-prism-provider="${provider}"]`);
    if (!row) continue;
    const status = row.querySelector<HTMLElement>(`[data-prism-${provider}-status]`)!;
    const connect = row.querySelector<HTMLButtonElement>(`[data-prism-${provider}-connect]`)!;
    const refresh = row.querySelector<HTMLButtonElement>(`[data-prism-${provider}-refresh]`)!;
    const disconnect = row.querySelector<HTMLButtonElement>(`[data-prism-${provider}-disconnect]`)!;
    const translation = row.querySelector<HTMLSelectElement>('[data-prism-tms60-translation]');
    const returnedTranslation = managed?.managedTarget?.match(/^thiepn:hub-tms60:pkce:([a-z0-9]+):v1$/)?.[1];
    if (translation && returnedTranslation) translation.value = returnedTranslation;
    const targeted = Boolean(managed?.managedCallback && (provider === 'notes'
      ? managed.managedTarget === null || managed.managedTarget === NOTES_PENDING_KEY
      : managed.managedTarget === null || returnedTranslation));
    let callbackUsed = false;
    let currentState: PrismManagedState = { connected: false, busy: false, message: 'Sign in to connect Home data.' };
    let connection: PrismManagedConnection | null = null;
    function controls() {
      status.textContent = !canonical ? 'Connection is available only on the qualified Home route.'
        : !enabled || !connection ? 'Connection is unavailable. Open the app directly.' : currentState.message;
      connect.hidden = currentState.connected;
      refresh.hidden = disconnect.hidden = !currentState.connected;
      connect.disabled = !canonical || !enabled || !connection || !owner() || currentState.busy || document.hidden;
      refresh.disabled = currentState.busy || document.hidden;
      disconnect.disabled = currentState.busy;
      if (translation) translation.disabled = currentState.busy || !canonical || !enabled;
      row!.setAttribute('aria-busy', String(currentState.busy));
    }
    function createConnection() {
      if (!canonical || !enabled) { controls(); return; }
      try {
        const session = new HubNotesSession({
          clientId: import.meta.env.PUBLIC_HUB_NOTES_CLIENT_ID ?? '',
          platformOrigin: import.meta.env.PUBLIC_HUB_PLATFORM_ORIGIN ?? '',
          publishableKey: import.meta.env.PUBLIC_THIEPN_SUPABASE_PUBLISHABLE_KEY ?? '',
          provider, ...(translation ? { translationId: translation.value } : {}),
        }, sessionStorage, owner);
        connection = new PrismManagedConnection(provider, session, prismProviderRuntime, owner,
          id => provider === 'notes' ? readHubNotesConsent(id) : readHubTmsConsent(id, translation!.value),
          () => {
            const visible = (id: string) => { const block = home!.querySelector<HTMLElement>(`[data-prism-block="${id}"]`); return !!block && !home!.hidden && !block.hidden && !document.hidden; };
            return [...(visible('continue') ? ['continue' as const] : []),
              ...(visible('recent') || provider === 'tms60' && (visible('now') || visible('study')) ? ['summary' as const] : [])];
          }, state => { currentState = state; controls(); });
      } catch { connection = null; }
      controls();
    }
    async function identityChanged() {
      connection?.clear(owner() ? 'Connect to show shared Home data.' : 'Sign in to connect Home data.', !targeted || callbackUsed);
      controls();
      if (!targeted || callbackUsed || !owner() || !connection || document.hidden) return;
      callbackUsed = true;
      await connection.complete(managed!.managedQuery, managed!.managedFragment);
    }
    createConnection();
    connect.addEventListener('click', () => void (async () => {
      if (connect.disabled || !connection) return;
      const url = await connection.begin();
      if (url) location.assign(url);
    })());
    refresh.addEventListener('click', () => void connection?.refresh());
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(`thiepn:hub-${provider === 'notes' ? 'notes' : 'tms60'}:clear:v1`) : null;
    disconnect.addEventListener('click', () => { connection?.clear('Disconnected in this tab. Manage sharing in Account to revoke everywhere.'); channel?.postMessage({ type: 'clear' }); });
    channel?.addEventListener('message', () => connection?.clear());
    translation?.addEventListener('change', () => { connection?.clear(); createConnection(); });
    window.addEventListener('hub:identity', () => void identityChanged());
    window.addEventListener('pagehide', () => connection?.clear(undefined, false));
    window.addEventListener('pageshow', event => { if (event.persisted) connection?.clear(); });
    window.addEventListener('storage', event => { if (event.key === 'thiepn:hub-auth:v1') connection?.clear(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) connection?.clear('Home data cleared when this tab was hidden.', false);
      else if (targeted && !callbackUsed) void identityChanged();
      controls();
    });
    new MutationObserver(records => {
      if (records.some(record => { const target = record.target as HTMLElement; return target.hidden && (target === home || target.hasAttribute('data-prism-block-id')); })) connection?.clear('Hidden Home data cleared. Connect again to refresh.');
    }).observe(home, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
    void identityChanged();
  }
})();
