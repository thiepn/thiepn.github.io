const SUPABASE_URL = 'https://hycegznamzjhwinegaai.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1rZzRPzfLMaAH5pIgCwIjA_19UPMIsR';
const SHARED_SESSION_KEY = 'sb-hycegznamzjhwinegaai-auth-token';
const ACCOUNT_REDIRECT = `${window.location.origin}/account/`;
const DELETE_CONFIRMATION = 'DELETE MY ACCOUNT';

type Tone = 'neutral' | 'success' | 'error';

interface AuthIdentity {
  provider?: string;
}

interface AuthUser {
  id: string;
  email?: string;
  new_email?: string;
  email_confirmed_at?: string;
  created_at?: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, unknown>;
  identities?: AuthIdentity[];
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: AuthUser;
}

interface AuthPayload {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: AuthUser;
  error?: string;
  error_description?: string;
  message?: string;
  msg?: string;
}

interface AccountProfile {
  user_id: string;
  display_name: string | null;
  preferred_language: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

interface AccountApp {
  slug: string;
  name: string;
  description: string;
  path: string;
  sort_order: number;
}

interface AccountConnection {
  app_slug: string;
  first_used_at: string;
  last_used_at: string;
}

interface DeleteResult {
  deleted?: boolean;
  reason?: string | null;
  storage_objects?: number;
}

class AccountRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AccountRequestError';
  }
}

const root = document.querySelector<HTMLElement>('[data-account-root]');
const signedOut = document.querySelector<HTMLElement>('[data-account-signed-out]');
const signedIn = document.querySelector<HTMLElement>('[data-account-signed-in]');
const deletedState = document.querySelector<HTMLElement>('[data-account-deleted]');
const globalStatus = document.querySelector<HTMLElement>('[data-account-global-status]');

let session: AuthSession | null = null;
let profile: AccountProfile | null = null;
let accountApps: AccountApp[] = [];
let connections: AccountConnection[] = [];
let memorySession: AuthSession | null = null;
let recoveryMode = false;

function qs<T extends Element>(selector: string, scope: ParentNode = document): T | null {
  return scope.querySelector<T>(selector);
}

function text(selector: string, value: string, scope: ParentNode = document): void {
  const element = qs<HTMLElement>(selector, scope);
  if (element) element.textContent = value;
}

function setHidden(element: HTMLElement | null, hidden: boolean): void {
  if (!element) return;
  element.hidden = hidden;
}

function setStatus(element: HTMLElement | null, message: string, tone: Tone = 'neutral'): void {
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
  element.hidden = message.length === 0;
}

function setGlobalStatus(message: string, tone: Tone = 'neutral'): void {
  setStatus(globalStatus, message, tone);
}

function setBusy(form: HTMLFormElement, busy: boolean, busyLabel = 'Working…'): void {
  const controls = [...form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input,button,select')];
  controls.forEach((control) => {
    control.disabled = busy;
  });
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!submit) return;
  if (busy) {
    submit.dataset.originalLabel = submit.textContent ?? '';
    submit.textContent = busyLabel;
  } else if (submit.dataset.originalLabel) {
    submit.textContent = submit.dataset.originalLabel;
    delete submit.dataset.originalLabel;
  }
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The in-memory session still keeps this page usable when storage is unavailable.
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing else to do when storage is unavailable.
  }
}

function parseStoredSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof parsed.access_token !== 'string' ||
      typeof parsed.refresh_token !== 'string' ||
      typeof parsed.expires_at !== 'number'
    ) {
      return null;
    }
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: parsed.expires_at,
      token_type: parsed.token_type ?? 'bearer',
      user: parsed.user && typeof parsed.user.id === 'string' ? parsed.user : { id: '' },
    };
  } catch {
    return null;
  }
}

function readStoredSession(): AuthSession | null {
  return parseStoredSession(safeLocalStorageGet(SHARED_SESSION_KEY)) ?? memorySession;
}

function storeSession(nextSession: AuthSession | null): void {
  memorySession = nextSession;
  if (nextSession) safeLocalStorageSet(SHARED_SESSION_KEY, JSON.stringify(nextSession));
  else safeLocalStorageRemove(SHARED_SESSION_KEY);
}

async function api<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(30_000),
  });

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    const record = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
    const message = [record.error_description, record.message, record.msg, record.error]
      .find((entry) => typeof entry === 'string') as string | undefined;
    throw new AccountRequestError(message ?? `Request failed (${response.status}).`, response.status);
  }

  return payload as T;
}

function normalizeSession(payload: AuthPayload, fallbackUser?: AuthUser): AuthSession {
  if (!payload.access_token || !payload.refresh_token) {
    throw new Error('Authentication did not return a complete session.');
  }
  const expiresAt =
    payload.expires_at ?? Math.floor(Date.now() / 1000) + Math.max(60, payload.expires_in ?? 3600);
  const user = payload.user ?? fallbackUser;
  if (!user?.id) throw new Error('Authentication did not return an account identity.');
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: expiresAt,
    token_type: payload.token_type ?? 'bearer',
    user,
  };
}

async function fetchUser(accessToken: string): Promise<AuthUser> {
  return api<AuthUser>('/auth/v1/user', { method: 'GET' }, accessToken);
}

async function refreshSession(current: AuthSession): Promise<AuthSession> {
  const payload = await api<AuthPayload>('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: current.refresh_token }),
  });
  const next = normalizeSession(payload, current.user);
  storeSession(next);
  return next;
}

async function ensureFreshSession(current: AuthSession): Promise<AuthSession> {
  const now = Math.floor(Date.now() / 1000);
  let next = current;
  if (current.expires_at - now <= 60) next = await refreshSession(current);
  const user = await fetchUser(next.access_token);
  next = { ...next, user };
  storeSession(next);
  return next;
}

async function consumeAuthCallback(): Promise<AuthSession | null> {
  if (!window.location.hash) return null;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const errorDescription = hash.get('error_description') ?? hash.get('error');
  if (errorDescription) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    throw new Error(errorDescription);
  }

  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  recoveryMode = hash.get('type') === 'recovery';
  const user = await fetchUser(accessToken);
  const next: AuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + Math.max(60, Number(hash.get('expires_in') ?? 3600)),
    token_type: hash.get('token_type') ?? 'bearer',
    user,
  };
  storeSession(next);
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  return next;
}

function providerSet(user: AuthUser): Set<string> {
  return new Set((user.identities ?? []).map((identity) => identity.provider).filter((provider): provider is string => Boolean(provider)));
}

function metadataString(user: AuthUser, key: string): string | null {
  const value = user.user_metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function preferredDisplayName(user: AuthUser): string {
  return (
    profile?.display_name?.trim() ||
    metadataString(user, 'full_name') ||
    metadataString(user, 'name') ||
    user.email?.split('@')[0] ||
    'THIEPN user'
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}` : name.slice(0, 2)).toUpperCase();
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

async function loadProfile(current: AuthSession): Promise<AccountProfile> {
  const query = new URLSearchParams({
    select: 'user_id,display_name,preferred_language,timezone,created_at,updated_at',
    user_id: `eq.${current.user.id}`,
    limit: '1',
  });
  const rows = await api<AccountProfile[]>(`/rest/v1/account_profiles?${query}`, {}, current.access_token);
  if (rows[0]) return rows[0];

  const displayName = metadataString(current.user, 'full_name') ?? metadataString(current.user, 'name');
  const created = await api<AccountProfile[]>(
    '/rest/v1/account_profiles?on_conflict=user_id&select=user_id,display_name,preferred_language,timezone,created_at,updated_at',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ user_id: current.user.id, display_name: displayName }),
    },
    current.access_token,
  );
  if (!created[0]) throw new Error('Could not create the account profile.');
  return created[0];
}

async function loadApps(current: AuthSession): Promise<void> {
  const [apps, appConnections] = await Promise.all([
    api<AccountApp[]>(
      '/rest/v1/account_apps?select=slug,name,description,path,sort_order&active=eq.true&order=sort_order.asc',
      {},
      current.access_token,
    ),
    api<AccountConnection[]>(
      `/rest/v1/account_user_apps?select=app_slug,first_used_at,last_used_at&user_id=eq.${encodeURIComponent(current.user.id)}`,
      {},
      current.access_token,
    ),
  ]);
  accountApps = apps;
  connections = appConnections;
}

async function saveProfile(current: AuthSession, patch: Partial<AccountProfile>): Promise<AccountProfile> {
  const rows = await api<AccountProfile[]>(
    '/rest/v1/account_profiles?on_conflict=user_id&select=user_id,display_name,preferred_language,timezone,created_at,updated_at',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ user_id: current.user.id, ...patch }),
    },
    current.access_token,
  );
  if (!rows[0]) throw new Error('The profile update did not return a profile.');
  return rows[0];
}

function renderIdentity(user: AuthUser): void {
  const name = preferredDisplayName(user);
  const avatar = qs<HTMLElement>('[data-account-avatar]');
  const avatarUrl = metadataString(user, 'avatar_url') ?? metadataString(user, 'picture');
  if (avatar) {
    avatar.replaceChildren();
    if (avatarUrl) {
      const image = document.createElement('img');
      image.src = avatarUrl;
      image.alt = '';
      image.referrerPolicy = 'no-referrer';
      avatar.append(image);
    } else {
      avatar.textContent = initials(name);
    }
  }

  text('[data-account-name]', name);
  text('[data-account-email]', user.email ?? 'No email address');
  text('[data-account-created]', formatDate(user.created_at));
  text('[data-account-last-sign-in]', formatDate(user.last_sign_in_at));

  const providers = providerSet(user);
  const providerList = qs<HTMLElement>('[data-account-providers]');
  if (providerList) {
    providerList.replaceChildren();
    const entries = [
      { key: 'email', label: 'Email', connected: providers.has('email') || Boolean(user.email) },
      { key: 'google', label: 'Google', connected: providers.has('google') },
    ];
    entries.forEach(({ key, label, connected }) => {
      const item = document.createElement('span');
      item.className = 'account-provider';
      item.dataset.connected = connected ? 'true' : 'false';
      item.dataset.provider = key;
      item.textContent = `${label} · ${connected ? 'Connected' : 'Not connected'}`;
      providerList.append(item);
    });
  }
}

function renderProfileForm(user: AuthUser): void {
  const displayName = qs<HTMLInputElement>('[data-profile-display-name]');
  const language = qs<HTMLSelectElement>('[data-profile-language]');
  const timezone = qs<HTMLInputElement>('[data-profile-timezone]');
  if (displayName) displayName.value = profile?.display_name ?? metadataString(user, 'full_name') ?? metadataString(user, 'name') ?? '';

  const browserLanguage = navigator.language.split('-')[0]?.toLowerCase() ?? 'en';
  if (language) language.value = profile?.preferred_language ?? (['en', 'de', 'ko', 'tr', 'fr'].includes(browserLanguage) ? browserLanguage : 'en');

  let detectedTimezone = '';
  try {
    detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    detectedTimezone = '';
  }
  if (timezone) timezone.value = profile?.timezone ?? detectedTimezone;
}

function renderApps(): void {
  const container = qs<HTMLElement>('[data-account-apps]');
  if (!container) return;
  container.replaceChildren();
  const connectionMap = new Map(connections.map((connection) => [connection.app_slug, connection]));

  accountApps.forEach((app) => {
    const connection = connectionMap.get(app.slug);
    const article = document.createElement('article');
    article.className = 'account-app';
    article.dataset.connected = connection ? 'true' : 'false';

    const mark = document.createElement('span');
    mark.className = 'account-app__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = app.name === 'WORDSTRIKE' ? 'W' : app.name.slice(0, 1).toUpperCase();

    const copy = document.createElement('div');
    copy.className = 'account-app__copy';
    const top = document.createElement('div');
    top.className = 'account-app__top';
    const heading = document.createElement('h3');
    heading.textContent = app.name;
    const state = document.createElement('span');
    state.className = 'account-app__state';
    state.textContent = connection ? 'Connected' : 'Available';
    top.append(heading, state);

    const description = document.createElement('p');
    description.textContent = app.description;
    const meta = document.createElement('small');
    meta.textContent = connection ? `Last account activity ${formatDate(connection.last_used_at)}` : 'Uses the same THIEPN Account when you sign in.';
    copy.append(top, description, meta);

    const link = document.createElement('a');
    link.className = 'action-link account-app__open';
    link.href = app.path;
    link.innerHTML = 'Open <span aria-hidden="true">→</span>';

    article.append(mark, copy, link);
    container.append(article);
  });
}

function renderSecurity(user: AuthUser): void {
  text('[data-security-current-email]', user.email ?? 'No email address');
  const pending = qs<HTMLElement>('[data-security-pending-email]');
  if (pending) {
    const nextEmail = user.new_email?.trim();
    pending.hidden = !nextEmail;
    pending.textContent = nextEmail ? `Pending confirmation: ${nextEmail}` : '';
  }
  const googleState = qs<HTMLElement>('[data-security-google]');
  if (googleState) googleState.textContent = providerSet(user).has('google') ? 'Connected' : 'Not connected';
  const emailState = qs<HTMLElement>('[data-security-email-verified]');
  if (emailState) emailState.textContent = user.email_confirmed_at ? 'Verified' : 'Confirmation pending';
}

function renderDeletionSummary(): void {
  const list = qs<HTMLElement>('[data-delete-apps]');
  if (!list) return;
  list.replaceChildren();
  const connected = new Set(connections.map((entry) => entry.app_slug));
  accountApps.filter((app) => connected.has(app.slug)).forEach((app) => {
    const item = document.createElement('li');
    item.textContent = `${app.name} data`;
    list.append(item);
  });
  const identity = document.createElement('li');
  identity.textContent = 'THIEPN Account identity and sign-in sessions';
  list.append(identity);
}

function renderSignedIn(): void {
  if (!session) return;
  setHidden(signedOut, true);
  setHidden(deletedState, true);
  setHidden(signedIn, false);
  renderIdentity(session.user);
  renderProfileForm(session.user);
  renderSecurity(session.user);
  renderApps();
  renderDeletionSummary();
  setGlobalStatus(recoveryMode ? 'Recovery link accepted. Set a new password below.' : 'Signed in with THIEPN Account.', 'success');
  if (recoveryMode) qs<HTMLInputElement>('[data-security-new-password]')?.focus();
}

function renderSignedOut(message = 'Sign in once to manage your THIEPN Account.'): void {
  setHidden(signedIn, true);
  setHidden(deletedState, true);
  setHidden(signedOut, false);
  setGlobalStatus(message, 'neutral');
}

async function hydrateAccount(): Promise<void> {
  if (!session) return;
  [profile] = await Promise.all([loadProfile(session), loadApps(session).then(() => profile)]);
  // loadApps and loadProfile run concurrently; the assignment above keeps profile explicit.
  profile = await loadProfile(session);
  renderSignedIn();
}

async function initializeSession(): Promise<void> {
  setGlobalStatus('Checking your THIEPN Account…');
  try {
    session = (await consumeAuthCallback()) ?? readStoredSession();
    if (!session) {
      renderSignedOut();
      return;
    }
    session = await ensureFreshSession(session);
    profile = await loadProfile(session);
    await loadApps(session);
    renderSignedIn();
  } catch (error) {
    console.warn('THIEPN Account session initialization failed', error);
    storeSession(null);
    session = null;
    renderSignedOut('Your previous session could not be restored. Sign in again.');
  }
}

async function updateCurrentUser(patch: Record<string, string>): Promise<AuthUser> {
  if (!session) throw new Error('Sign in first.');
  const user = await api<AuthUser>('/auth/v1/user', { method: 'PUT', body: JSON.stringify(patch) }, session.access_token);
  session = { ...session, user };
  storeSession(session);
  return user;
}

function bindSignedOutActions(): void {
  const form = qs<HTMLFormElement>('[data-auth-form]');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = qs<HTMLElement>('[data-auth-status]', form);
      const email = qs<HTMLInputElement>('[data-auth-email]', form)?.value.trim() ?? '';
      const password = qs<HTMLInputElement>('[data-auth-password]', form)?.value ?? '';
      if (!email || password.length < 8) {
        setStatus(status, 'Enter a valid email and an 8+ character password.', 'error');
        return;
      }
      setBusy(form, true, 'Signing in…');
      setStatus(status, '');
      try {
        const payload = await api<AuthPayload>('/auth/v1/token?grant_type=password', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        session = normalizeSession(payload);
        storeSession(session);
        profile = await loadProfile(session);
        await loadApps(session);
        renderSignedIn();
      } catch (error) {
        setStatus(status, error instanceof Error ? error.message : 'Could not sign in.', 'error');
      } finally {
        setBusy(form, false);
      }
    });
  }

  qs<HTMLButtonElement>('[data-auth-google]')?.addEventListener('click', () => {
    const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    url.searchParams.set('provider', 'google');
    url.searchParams.set('redirect_to', ACCOUNT_REDIRECT);
    window.location.assign(url);
  });

  qs<HTMLButtonElement>('[data-auth-create]')?.addEventListener('click', async () => {
    if (!form) return;
    const status = qs<HTMLElement>('[data-auth-status]', form);
    const email = qs<HTMLInputElement>('[data-auth-email]', form)?.value.trim() ?? '';
    const password = qs<HTMLInputElement>('[data-auth-password]', form)?.value ?? '';
    if (!email || password.length < 8) {
      setStatus(status, 'Enter a valid email and an 8+ character password first.', 'error');
      return;
    }
    setBusy(form, true, 'Creating…');
    try {
      const redirect = encodeURIComponent(ACCOUNT_REDIRECT);
      const payload = await api<AuthPayload>(`/auth/v1/signup?redirect_to=${redirect}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (payload.access_token && payload.refresh_token && payload.user) {
        session = normalizeSession(payload);
        storeSession(session);
        profile = await loadProfile(session);
        await loadApps(session);
        renderSignedIn();
      } else {
        setStatus(status, 'Account created. Check your email to confirm the address, then return here.', 'success');
      }
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not create the account.', 'error');
    } finally {
      setBusy(form, false);
    }
  });

  qs<HTMLButtonElement>('[data-auth-reset]')?.addEventListener('click', async () => {
    if (!form) return;
    const status = qs<HTMLElement>('[data-auth-status]', form);
    const email = qs<HTMLInputElement>('[data-auth-email]', form)?.value.trim() ?? '';
    if (!email) {
      setStatus(status, 'Enter your email first.', 'error');
      return;
    }
    setBusy(form, true, 'Sending…');
    try {
      const redirect = encodeURIComponent(ACCOUNT_REDIRECT);
      await api<unknown>(`/auth/v1/recover?redirect_to=${redirect}`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStatus(status, 'If that account exists, a password-reset email has been sent.', 'success');
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not send the reset email.', 'error');
    } finally {
      setBusy(form, false);
    }
  });
}

function bindProfileActions(): void {
  const form = qs<HTMLFormElement>('[data-profile-form]');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!session) return;
    const status = qs<HTMLElement>('[data-profile-status]', form);
    const displayName = qs<HTMLInputElement>('[data-profile-display-name]', form)?.value.trim() ?? '';
    const preferredLanguage = qs<HTMLSelectElement>('[data-profile-language]', form)?.value ?? 'en';
    const timezone = qs<HTMLInputElement>('[data-profile-timezone]', form)?.value.trim() ?? '';
    setBusy(form, true, 'Saving…');
    try {
      profile = await saveProfile(session, {
        display_name: displayName || null,
        preferred_language: preferredLanguage,
        timezone: timezone || null,
      });
      renderIdentity(session.user);
      setStatus(status, 'Profile saved.', 'success');
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not save the profile.', 'error');
    } finally {
      setBusy(form, false);
    }
  });

  qs<HTMLButtonElement>('[data-profile-detect-timezone]')?.addEventListener('click', () => {
    const input = qs<HTMLInputElement>('[data-profile-timezone]');
    if (!input) return;
    try {
      input.value = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    } catch {
      input.value = '';
    }
  });
}

function bindSecurityActions(): void {
  const emailForm = qs<HTMLFormElement>('[data-email-form]');
  emailForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = qs<HTMLElement>('[data-email-status]', emailForm);
    const email = qs<HTMLInputElement>('[data-new-email]', emailForm)?.value.trim() ?? '';
    if (!email) {
      setStatus(status, 'Enter the new email address.', 'error');
      return;
    }
    setBusy(emailForm, true, 'Updating…');
    try {
      const user = await updateCurrentUser({ email });
      renderSecurity(user);
      setStatus(status, user.new_email ? `Confirmation sent to ${user.new_email}.` : 'Email updated.', 'success');
      const input = qs<HTMLInputElement>('[data-new-email]', emailForm);
      if (input) input.value = '';
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not update the email.', 'error');
    } finally {
      setBusy(emailForm, false);
    }
  });

  const passwordForm = qs<HTMLFormElement>('[data-password-form]');
  passwordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = qs<HTMLElement>('[data-password-status]', passwordForm);
    const password = qs<HTMLInputElement>('[data-security-new-password]', passwordForm)?.value ?? '';
    const confirm = qs<HTMLInputElement>('[data-security-confirm-password]', passwordForm)?.value ?? '';
    if (password.length < 8) {
      setStatus(status, 'Use at least 8 characters.', 'error');
      return;
    }
    if (password !== confirm) {
      setStatus(status, 'The passwords do not match.', 'error');
      return;
    }
    setBusy(passwordForm, true, 'Saving…');
    try {
      const user = await updateCurrentUser({ password });
      renderSecurity(user);
      setStatus(status, 'Password updated for THIEPN Account.', 'success');
      passwordForm.reset();
      recoveryMode = false;
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not update the password.', 'error');
    } finally {
      setBusy(passwordForm, false);
    }
  });

  qs<HTMLButtonElement>('[data-account-sign-out]')?.addEventListener('click', async () => {
    if (!session) return;
    const current = session;
    session = null;
    profile = null;
    accountApps = [];
    connections = [];
    storeSession(null);
    try {
      await api<unknown>('/auth/v1/logout?scope=local', { method: 'POST' }, current.access_token);
    } catch (error) {
      console.warn('Remote sign out failed after the local THIEPN Account session was cleared', error);
    }
    renderSignedOut('Signed out of THIEPN Account in this browser.');
  });
}

async function listNotesStorageObjects(current: AuthSession): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  for (let page = 0; page < 100; page += 1) {
    let rows: Array<{ name?: string }>;
    try {
      rows = await api<Array<{ name?: string }>>(
        '/storage/v1/object/list/notes-attachments',
        {
          method: 'POST',
          body: JSON.stringify({ prefix: `${current.user.id}/`, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
        },
        current.access_token,
      );
    } catch (error) {
      if (error instanceof AccountRequestError && [400, 401, 403, 404].includes(error.status)) return paths;
      throw error;
    }
    if (!Array.isArray(rows) || rows.length === 0) return paths;
    rows.forEach((row) => {
      if (!row.name) return;
      paths.push(row.name.startsWith(`${current.user.id}/`) ? row.name : `${current.user.id}/${row.name}`);
    });
    if (rows.length < 100) return paths;
    offset += rows.length;
  }
  throw new Error('Too many attachment pages to delete safely.');
}

async function removeNotesStorage(current: AuthSession): Promise<number> {
  const paths = await listNotesStorageObjects(current);
  for (const path of paths) {
    const encoded = path.split('/').map((part) => encodeURIComponent(part)).join('/');
    await api<unknown>(`/storage/v1/object/notes-attachments/${encoded}`, { method: 'DELETE' }, current.access_token);
  }
  return paths.length;
}

function bindDeletion(): void {
  const confirmation = qs<HTMLInputElement>('[data-delete-confirmation]');
  const button = qs<HTMLButtonElement>('[data-delete-account]');
  const status = qs<HTMLElement>('[data-delete-status]');
  if (!confirmation || !button) return;

  const syncButton = () => {
    button.disabled = confirmation.value !== DELETE_CONFIRMATION || !session;
  };
  confirmation.addEventListener('input', syncButton);
  syncButton();

  button.addEventListener('click', async () => {
    if (!session || confirmation.value !== DELETE_CONFIRMATION) return;
    const current = session;
    button.disabled = true;
    button.textContent = 'Deleting…';
    setStatus(status, 'Removing private app storage before deleting the identity…');
    try {
      const removed = await removeNotesStorage(current);
      const result = await api<DeleteResult>(
        '/rest/v1/rpc/delete_thiepn_account',
        { method: 'POST', body: JSON.stringify({ p_confirmation: DELETE_CONFIRMATION }) },
        current.access_token,
      );
      if (!result.deleted) {
        if (result.reason === 'storage_objects_remaining') {
          throw new Error(`Account deletion stopped because ${result.storage_objects ?? 'some'} Notes attachment object(s) remain.`);
        }
        throw new Error(`Account deletion stopped (${result.reason ?? 'unknown reason'}).`);
      }

      session = null;
      profile = null;
      accountApps = [];
      connections = [];
      storeSession(null);
      setHidden(signedIn, true);
      setHidden(signedOut, true);
      setHidden(deletedState, false);
      setGlobalStatus('THIEPN Account deleted.', 'success');
      text('[data-delete-result]', removed ? `Account deleted. ${removed} private Notes attachment object(s) were removed first.` : 'Account and connected app data deleted.');
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Account deletion failed safely.', 'error');
      button.textContent = 'Delete THIEPN Account';
      syncButton();
    }
  });
}

function bindCrossTabSession(): void {
  window.addEventListener('storage', (event) => {
    if (event.key !== SHARED_SESSION_KEY) return;
    window.location.reload();
  });
}

async function init(): Promise<void> {
  if (!root) return;
  bindSignedOutActions();
  bindProfileActions();
  bindSecurityActions();
  bindDeletion();
  bindCrossTabSession();
  await initializeSession();
}

void init();
