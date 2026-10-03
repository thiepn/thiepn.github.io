import { ACCOUNT_ORIGIN, HUB_AUTH_KEY, HUB_LOGIN_KEY, validAccountId, readPendingLogin, readHubCallback, type HubIdentity } from '../lib/hub-auth';

const callbackQuery = location.pathname === '/home/auth/callback/' ? new URLSearchParams(location.search) : null;
const callbackFragment = callbackQuery ? location.hash : '';
if (callbackQuery) history.replaceState(null, '', '/home/auth/callback/');
const root = document.querySelector<HTMLElement>('[data-hub-account]');
const config = { url: import.meta.env.PUBLIC_THIEPN_SUPABASE_URL, key: import.meta.env.PUBLIC_THIEPN_SUPABASE_PUBLISHABLE_KEY, origin: import.meta.env.PUBLIC_HUB_AUTH_ORIGIN, enabled: import.meta.env.PUBLIC_HUB_ACCOUNT_ENTRY === 'v1' };
export let hubIdentity: HubIdentity = { status: 'checking' };
export function publishIdentity(identity: HubIdentity) {
  hubIdentity = identity;
  window.dispatchEvent(new CustomEvent('hub:identity', { detail: identity }));
}
if (root) {
  const status = root.querySelector<HTMLElement>('[data-auth-status]')!;
  const login = root.querySelector<HTMLButtonElement>('[data-auth-login]')!;
  const change = root.querySelector<HTMLButtonElement>('[data-auth-switch]')!;
  const logout = root.querySelector<HTMLButtonElement>('[data-auth-logout]')!;
  const retry = root.querySelector<HTMLButtonElement>('[data-auth-retry]')!;
  let busy = false;
  let generation = 0;
  function show(identity: HubIdentity, message?: string) {
    publishIdentity(identity);
    status.textContent = message ?? (identity.status === 'signed-in' ? `Signed in as ${identity.label}` : identity.status === 'checking' ? 'Checking your Hub session…' : identity.status === 'signed-out' ? 'Sign in to use your account’s Home preferences in this browser.' : 'Hub sign-in is unavailable. You can still open Account and use all app links.');
    login.hidden = identity.status !== 'signed-out';
    logout.hidden = change.hidden = identity.status !== 'signed-in';
    retry.hidden = identity.status !== 'unavailable';
    [login, change, logout, retry].forEach(button => button.disabled = busy);
  }
  const configured = config.enabled && config.url === 'https://hycegznamzjhwinegaai.supabase.co' && /^sb_publishable_[a-zA-Z0-9_-]+$/.test(config.key ?? '') && config.origin === 'https://thiepn.dev' && location.origin === config.origin;
  if (!configured) {
    retry.hidden = true;
    publishIdentity({ status: 'signed-out' });
    status.textContent = 'Hub sign-in is not enabled yet.';
  } else {
    void (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(config.url!, config.key!, { global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(8000)]) }) }, auth: { storageKey: HUB_AUTH_KEY, flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true } });
      async function verify() {
        const current = ++generation;
        show({ status: 'checking' });
        try {
          const { data: session, error: sessionError } = await client.auth.getSession();
          if (sessionError) throw sessionError;
          if (!session.session) { if (current === generation) show({ status: 'signed-out' }); return; }
          const { data, error } = await client.auth.getUser();
          if (current !== generation) return;
          if (error || !data.user || !validAccountId(data.user.id) || data.user.id !== session.session.user.id) throw new Error('Unverified identity');
          show({ status: 'signed-in', id: data.user.id, label: data.user.email ?? 'THIEPN member' });
        } catch { if (current === generation) show({ status: 'unavailable' }); }
      }
      async function start(switching: boolean) {
        if (busy) return;
        busy = true; ++generation; show({ status: 'checking' });
        try {
          // Fail before redirect if either PKCE or pending-flow storage cannot persist.
          localStorage.setItem(`${HUB_AUTH_KEY}:probe`, '1'); localStorage.removeItem(`${HUB_AUTH_KEY}:probe`);
          if (switching) { const { error } = await client.auth.signOut({ scope: 'local' }); if (error) throw error; }
          const flow = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
          sessionStorage.setItem(HUB_LOGIN_KEY, JSON.stringify({ flow, started: Date.now(), returnTo: '/home/' }));
          const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${config.origin}/home/auth/callback/?flow=${flow}`, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
          if (error || !data.url) throw new Error('Sign-in failed');
          const entry = new URL('/hub/entry', ACCOUNT_ORIGIN); entry.searchParams.set('request', data.url);
          location.assign(entry.href);
        } catch { busy = false; show({ status: 'unavailable' }, 'Sign-in could not start. Check browser storage and try again.'); }
      }
      login.addEventListener('click', () => void start(false));
      change.addEventListener('click', () => void start(true));
      logout.addEventListener('click', () => void (async () => {
        if (busy) return;
        busy = true; ++generation; show({ status: 'checking' });
        try { const { error } = await client.auth.signOut({ scope: 'local' }); if (error) throw error; busy = false; show({ status: 'signed-out' }); }
        catch { busy = false; show({ status: 'unavailable' }, 'Hub preferences are hidden. Sign-out could not be confirmed; try again.'); }
      })());
      retry.addEventListener('click', () => { if (callbackQuery) location.assign('/home/'); else void verify(); });
      client.auth.onAuthStateChange(() => { if (!busy && !callbackQuery) { ++generation; show({ status: 'checking' }); setTimeout(() => { if (!busy && !callbackQuery) void verify(); }, 0); } });
      window.addEventListener('pageshow', () => { if (!busy && !callbackQuery) void verify(); });
      document.addEventListener('visibilitychange', () => { if (!document.hidden && !busy && !callbackQuery) void verify(); });
      if (location.pathname === '/home/auth/callback/') {
        const query = callbackQuery!;
        const callback = readHubCallback(query, callbackFragment);
        let pending = null;
        try { pending = readPendingLogin(sessionStorage.getItem(HUB_LOGIN_KEY), callback?.flow ?? null); sessionStorage.removeItem(HUB_LOGIN_KEY); } catch { /* storage unavailable */ }
        history.replaceState(null, '', '/home/auth/callback/');
        busy = true; show({ status: 'checking' });
        if (!pending || !callback) {
          busy = false; show({ status: 'unavailable' }, 'This sign-in return is missing, expired or already used. Start again from Home.');
        } else {
          try { const { error } = await client.auth.exchangeCodeForSession(callback.code); if (error) throw error; busy = false; await verify(); if ((hubIdentity as HubIdentity).status === 'signed-in') location.replace(pending.returnTo); }
          catch { busy = false; show({ status: 'unavailable' }, 'Sign-in could not be completed. Start again from Home.'); }
        }
      } else await verify();
    })().catch(() => show({ status: 'unavailable' }));
  }
}
