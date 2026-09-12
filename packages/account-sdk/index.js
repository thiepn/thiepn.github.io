export const THIEPN_ACCOUNT_VERSION = '1.1.0';

export const THIEPN_ACCOUNT_CONFIG = Object.freeze({
  supabaseUrl: 'https://hycegznamzjhwinegaai.supabase.co',
  publishableKey: 'sb_publishable_1rZzRPzfLMaAH5pIgCwIjA_19UPMIsR',
  sessionKey: 'sb-hycegznamzjhwinegaai-auth-token',
  accountPath: '/account/',
});

export const THIEPN_APPS = Object.freeze({
  notes: Object.freeze({ id: 'notes', name: 'Notes', path: '/notes/' }),
  diet: Object.freeze({ id: 'diet', name: 'Diet Copilot', path: '/diet/' }),
  wordstrike: Object.freeze({ id: 'wordstrike', name: 'WORDSTRIKE', path: '/wordstrike/' }),
});

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_REFRESH_SKEW_SECONDS = 60;

export class ThiepnAccountError extends Error {
  constructor(message, { status = 0, code = null, payload = null } = {}) {
    super(message);
    this.name = 'ThiepnAccountError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function safeGet(storage, key) {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(storage, key) {
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseSession(raw) {
  if (!raw) return null;
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!isRecord(value)) return null;
    if (typeof value.access_token !== 'string' || !value.access_token) return null;
    if (typeof value.refresh_token !== 'string' || !value.refresh_token) return null;
    if (typeof value.expires_at !== 'number' || !Number.isFinite(value.expires_at)) return null;
    const user = isRecord(value.user) && typeof value.user.id === 'string' ? value.user : { id: '' };
    return {
      access_token: value.access_token,
      refresh_token: value.refresh_token,
      expires_at: value.expires_at,
      token_type: typeof value.token_type === 'string' && value.token_type ? value.token_type : 'bearer',
      user,
    };
  } catch {
    return null;
  }
}

export function readSession({ storage = defaultStorage(), sessionKey = THIEPN_ACCOUNT_CONFIG.sessionKey } = {}) {
  return parseSession(safeGet(storage, sessionKey));
}

export function writeSession(session, { storage = defaultStorage(), sessionKey = THIEPN_ACCOUNT_CONFIG.sessionKey } = {}) {
  const normalized = parseSession(session);
  if (!normalized) throw new ThiepnAccountError('Cannot store an invalid THIEPN Account session.', { code: 'invalid_session' });
  safeSet(storage, sessionKey, JSON.stringify(normalized));
  return normalized;
}

export function clearSession({ storage = defaultStorage(), sessionKey = THIEPN_ACCOUNT_CONFIG.sessionKey } = {}) {
  safeRemove(storage, sessionKey);
}

export function migrateLegacySessions({
  storage = defaultStorage(),
  legacyKeys = [],
  sessionKey = THIEPN_ACCOUNT_CONFIG.sessionKey,
  removeLegacy = true,
} = {}) {
  const existing = parseSession(safeGet(storage, sessionKey));
  if (existing) return { session: existing, migratedFrom: null };

  for (const key of legacyKeys) {
    if (!key || key === sessionKey) continue;
    const session = parseSession(safeGet(storage, key));
    if (!session) continue;
    safeSet(storage, sessionKey, JSON.stringify(session));
    if (removeLegacy) safeRemove(storage, key);
    return { session, migratedFrom: key };
  }
  return { session: null, migratedFrom: null };
}

export function getConnectedProviders(user) {
  const providers = new Set();
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  for (const identity of identities) {
    if (typeof identity?.provider === 'string' && identity.provider) providers.add(identity.provider);
  }
  const metadataProviders = Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : [];
  for (const provider of metadataProviders) {
    if (typeof provider === 'string' && provider) providers.add(provider);
  }
  if (typeof user?.app_metadata?.provider === 'string' && user.app_metadata.provider) {
    providers.add(user.app_metadata.provider);
  }
  return providers;
}

export function hasProvider(user, provider) {
  return getConnectedProviders(user).has(provider);
}

export function getMfaFactors(user) {
  const factors = Array.isArray(user?.factors) ? user.factors : [];
  return factors.filter((factor) => isRecord(factor) && typeof factor.id === 'string' && typeof factor.factor_type === 'string');
}

export function getVerifiedMfaFactors(user) {
  return getMfaFactors(user).filter((factor) => factor.status === 'verified');
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;
  try {
    const payload = JSON.parse(decoded);
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function getSessionSecurity(session) {
  const claims = decodeJwtPayload(session?.access_token);
  const aal = claims?.aal === 'aal2' ? 'aal2' : 'aal1';
  const amr = Array.isArray(claims?.amr)
    ? claims.amr.filter((entry) => isRecord(entry) && typeof entry.method === 'string' && typeof entry.timestamp === 'number')
    : [];
  return Object.freeze({
    aal,
    sessionId: typeof claims?.session_id === 'string' ? claims.session_id : null,
    expiresAt: typeof claims?.exp === 'number' ? claims.exp : session?.expires_at ?? null,
    amr,
  });
}

export function needsMfaChallenge(session, user = session?.user) {
  return getVerifiedMfaFactors(user).length > 0 && getSessionSecurity(session).aal !== 'aal2';
}

export function accountUrl({ origin = globalThis.location?.origin ?? 'https://thiepn.dev' } = {}) {
  return new URL(THIEPN_ACCOUNT_CONFIG.accountPath, origin).toString();
}

export function appUrl(appId, { origin = globalThis.location?.origin ?? 'https://thiepn.dev' } = {}) {
  const app = THIEPN_APPS[appId];
  if (!app) throw new ThiepnAccountError(`Unknown THIEPN app: ${appId}`, { code: 'unknown_app' });
  return new URL(app.path, origin).toString();
}

function messageFromPayload(payload, fallback) {
  if (!isRecord(payload)) return fallback;
  for (const key of ['error_description', 'message', 'msg', 'error']) {
    if (typeof payload[key] === 'string' && payload[key]) return payload[key];
  }
  return fallback;
}

function normalizeSession(payload, fallbackUser) {
  if (!isRecord(payload) || typeof payload.access_token !== 'string' || typeof payload.refresh_token !== 'string') {
    throw new ThiepnAccountError('Authentication did not return a complete session.', { code: 'invalid_auth_payload', payload });
  }
  const user = isRecord(payload.user) ? payload.user : fallbackUser;
  if (!isRecord(user) || typeof user.id !== 'string' || !user.id) {
    throw new ThiepnAccountError('Authentication did not return an account identity.', { code: 'missing_user', payload });
  }
  const expiresAt = typeof payload.expires_at === 'number'
    ? payload.expires_at
    : Math.floor(Date.now() / 1000) + Math.max(60, Number(payload.expires_in) || 3600);
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: expiresAt,
    token_type: typeof payload.token_type === 'string' && payload.token_type ? payload.token_type : 'bearer',
    user,
  };
}

function requireSignedIn(session) {
  if (!session?.access_token) throw new ThiepnAccountError('Sign in first.', { code: 'not_signed_in' });
  return session;
}

export function createAccountClient(options = {}) {
  const config = {
    supabaseUrl: options.supabaseUrl ?? THIEPN_ACCOUNT_CONFIG.supabaseUrl,
    publishableKey: options.publishableKey ?? THIEPN_ACCOUNT_CONFIG.publishableKey,
    sessionKey: options.sessionKey ?? THIEPN_ACCOUNT_CONFIG.sessionKey,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    refreshSkewSeconds: options.refreshSkewSeconds ?? DEFAULT_REFRESH_SKEW_SECONDS,
  };
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (typeof fetchImpl !== 'function') throw new ThiepnAccountError('THIEPN Account requires fetch.', { code: 'missing_fetch' });
  let memorySession = null;

  const read = () => parseSession(safeGet(storage, config.sessionKey)) ?? memorySession;
  const write = (session) => {
    const normalized = parseSession(session);
    if (!normalized) throw new ThiepnAccountError('Cannot store an invalid THIEPN Account session.', { code: 'invalid_session' });
    memorySession = normalized;
    safeSet(storage, config.sessionKey, JSON.stringify(normalized));
    return normalized;
  };
  const clear = () => {
    memorySession = null;
    safeRemove(storage, config.sessionKey);
  };

  async function request(path, init = {}, accessToken) {
    const headers = new Headers(init.headers);
    headers.set('apikey', config.publishableKey);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    let timeoutId = null;
    let signal = init.signal;
    if (!signal && typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
    }

    let response;
    try {
      response = await fetchImpl(`${config.supabaseUrl}${path}`, { ...init, headers, signal });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new ThiepnAccountError('THIEPN Account request timed out.', { code: 'timeout' });
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const raw = await response.text();
    let payload = null;
    if (raw) {
      try { payload = JSON.parse(raw); } catch { payload = raw; }
    }
    if (!response.ok) {
      throw new ThiepnAccountError(messageFromPayload(payload, `Request failed (${response.status}).`), {
        status: response.status,
        code: isRecord(payload)
          ? (typeof payload.error_code === 'string' ? payload.error_code : typeof payload.code === 'string' ? payload.code : null)
          : null,
        payload,
      });
    }
    return payload;
  }

  async function getUser(session = read()) {
    if (!session?.access_token) return null;
    return request('/auth/v1/user', { method: 'GET' }, session.access_token);
  }

  async function refreshSession(session = read()) {
    requireSignedIn(session);
    if (!session.refresh_token) throw new ThiepnAccountError('No refresh token is available.', { code: 'missing_refresh_token' });
    const payload = await request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    return write(normalizeSession(payload, session.user));
  }

  async function ensureSession({ verifyUser = true } = {}) {
    let session = read();
    if (!session) return null;
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at - now <= config.refreshSkewSeconds) session = await refreshSession(session);
    if (verifyUser) {
      const user = await getUser(session);
      if (!user?.id) throw new ThiepnAccountError('The THIEPN Account session has no valid user.', { code: 'missing_user' });
      session = write({ ...session, user });
    }
    return session;
  }

  async function consumeAuthCallback({ location = globalThis.location, history = globalThis.history } = {}) {
    if (!location?.hash) return null;
    const hash = new URLSearchParams(location.hash.slice(1));
    const callbackError = hash.get('error_description') ?? hash.get('error');
    if (callbackError) {
      history?.replaceState?.(null, '', `${location.pathname}${location.search}`);
      throw new ThiepnAccountError(callbackError, { code: hash.get('error_code') ?? 'oauth_callback_error' });
    }
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (!accessToken || !refreshToken) return null;
    const user = await request('/auth/v1/user', { method: 'GET' }, accessToken);
    const session = write({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + Math.max(60, Number(hash.get('expires_in')) || 3600),
      token_type: hash.get('token_type') || 'bearer',
      user,
    });
    history?.replaceState?.(null, '', `${location.pathname}${location.search}`);
    return { session, type: hash.get('type') };
  }

  async function signInWithPassword({ email, password }) {
    const payload = await request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return write(normalizeSession(payload));
  }

  async function requestEmailOtp({ email, shouldCreateUser = false } = {}) {
    if (!email) throw new ThiepnAccountError('Enter your email first.', { code: 'email_required' });
    return request('/auth/v1/otp', {
      method: 'POST',
      body: JSON.stringify({ email, create_user: Boolean(shouldCreateUser) }),
    });
  }

  async function verifyEmailOtp({ email, token } = {}) {
    if (!email || !token) throw new ThiepnAccountError('Email and one-time code are required.', { code: 'otp_required' });
    const payload = await request('/auth/v1/verify', {
      method: 'POST',
      body: JSON.stringify({ email, token, type: 'email' }),
    });
    return write(normalizeSession(payload));
  }

  async function signUp({ email, password, redirectTo }) {
    const suffix = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '';
    const payload = await request(`/auth/v1/signup${suffix}`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (payload?.access_token && payload?.refresh_token && payload?.user) {
      return { session: write(normalizeSession(payload)), user: payload.user };
    }
    return { session: null, user: payload?.user ?? null };
  }

  function oauthUrl({ provider = 'google', redirectTo, scopes, query = {} } = {}) {
    const url = new URL(`${config.supabaseUrl}/auth/v1/authorize`);
    url.searchParams.set('provider', provider);
    if (redirectTo) url.searchParams.set('redirect_to', redirectTo);
    if (scopes) url.searchParams.set('scopes', scopes);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async function requestPasswordReset({ email, redirectTo }) {
    const suffix = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '';
    return request(`/auth/v1/recover${suffix}`, { method: 'POST', body: JSON.stringify({ email }) });
  }

  async function requestReauthentication(session = read()) {
    requireSignedIn(session);
    return request('/auth/v1/reauthenticate', { method: 'POST' }, session.access_token);
  }

  async function updateUser(patch, session = read()) {
    requireSignedIn(session);
    const user = await request('/auth/v1/user', { method: 'PUT', body: JSON.stringify(patch) }, session.access_token);
    write({ ...session, user });
    return user;
  }

  async function listMfaFactors(session = read()) {
    requireSignedIn(session);
    const user = await getUser(session);
    return { user, factors: getMfaFactors(user) };
  }

  async function enrollTotp({ friendlyName = 'Authenticator' } = {}, session = read()) {
    requireSignedIn(session);
    return request('/auth/v1/factors', {
      method: 'POST',
      body: JSON.stringify({ factor_type: 'totp', friendly_name: friendlyName }),
    }, session.access_token);
  }

  async function challengeMfa({ factorId, channel } = {}, session = read()) {
    requireSignedIn(session);
    if (!factorId) throw new ThiepnAccountError('Choose a verification factor.', { code: 'factor_required' });
    const body = channel ? { channel } : {};
    return request(`/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.access_token);
  }

  async function verifyMfa({ factorId, challengeId, code } = {}, session = read()) {
    requireSignedIn(session);
    if (!factorId || !challengeId || !code) {
      throw new ThiepnAccountError('Factor, challenge and verification code are required.', { code: 'mfa_verification_required' });
    }
    const payload = await request(`/auth/v1/factors/${encodeURIComponent(factorId)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, code }),
    }, session.access_token);
    return write(normalizeSession(payload, session.user));
  }

  async function unenrollMfa({ factorId } = {}, session = read()) {
    requireSignedIn(session);
    if (!factorId) throw new ThiepnAccountError('Choose a verification factor.', { code: 'factor_required' });
    return request(`/auth/v1/factors/${encodeURIComponent(factorId)}`, { method: 'DELETE' }, session.access_token);
  }

  async function signOut({ scope = 'local' } = {}) {
    const current = read();
    if (scope !== 'others') clear();
    if (!current?.access_token) return;
    try {
      await request(`/auth/v1/logout?scope=${encodeURIComponent(scope)}`, { method: 'POST' }, current.access_token);
    } catch (error) {
      if (options.strictRemoteSignOut) throw error;
    }
  }

  async function authFetch(path, init = {}, session = read()) {
    requireSignedIn(session);
    return request(path, init, session.access_token);
  }

  async function listAccountSessions(session = read()) {
    requireSignedIn(session);
    return authFetch('/rest/v1/rpc/list_thiepn_account_sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    }, session);
  }

  return Object.freeze({
    version: THIEPN_ACCOUNT_VERSION,
    config: Object.freeze({ ...config }),
    readSession: read,
    writeSession: write,
    clearSession: clear,
    migrateLegacySessions: (legacyOptions = {}) => migrateLegacySessions({ storage, sessionKey: config.sessionKey, ...legacyOptions }),
    getUser,
    refreshSession,
    ensureSession,
    consumeAuthCallback,
    signInWithPassword,
    requestEmailOtp,
    verifyEmailOtp,
    signUp,
    oauthUrl,
    requestPasswordReset,
    requestReauthentication,
    updateUser,
    updateEmail: ({ email }) => updateUser({ email }),
    updatePassword: ({ password, nonce } = {}) => updateUser(nonce ? { password, nonce } : { password }),
    listMfaFactors,
    enrollTotp,
    challengeMfa,
    verifyMfa,
    unenrollMfa,
    signOut,
    signOutOtherSessions: () => signOut({ scope: 'others' }),
    authFetch,
    listAccountSessions,
    getSessionSecurity: () => getSessionSecurity(read()),
  });
}
