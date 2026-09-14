export const THIEPN_ACCOUNT = Object.freeze({
  sdkVersion: '1.0.0',
  sdkContract: '1.x',
  accountContract: '1.0',
  operationsVersion: 'A7.1',
  projectRef: 'hycegznamzjhwinegaai',
  url: 'https://hycegznamzjhwinegaai.supabase.co',
  publishableKey: 'sb_publishable_1rZzRPzfLMaAH5pIgCwIjA_19UPMIsR',
  storageKey: 'sb-hycegznamzjhwinegaai-auth-token',
  productionOrigin: 'https://thiepn.dev',
  sessionAuthority: 'thiepn-account',
});

const SIGN_OUT_SCOPES = new Set(['local', 'others', 'global']);

function defaultBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.href) return window.location.href;
  return `${THIEPN_ACCOUNT.productionOrigin}/`;
}

export function assertAllowedRedirect(value, { baseUrl = defaultBaseUrl() } = {}) {
  const candidate = new URL(value || baseUrl, baseUrl);
  const production = candidate.origin === THIEPN_ACCOUNT.productionOrigin;
  const localHost = candidate.hostname === 'localhost' || candidate.hostname === '127.0.0.1';
  const localDevelopment = localHost && (candidate.protocol === 'http:' || candidate.protocol === 'https:');
  if (!production && !localDevelopment) {
    throw new Error('THIEPN Account redirect must stay on thiepn.dev or an approved local development origin.');
  }
  if (candidate.username || candidate.password) throw new Error('THIEPN Account redirect credentials are not allowed.');
  return candidate.href;
}

export function classifyAccountError(error) {
  const status = Number(error?.status ?? error?.statusCode ?? 0);
  if (status === 0 && (error?.name === 'TypeError' || /network|fetch|offline/i.test(String(error?.message || '')))) return 'network';
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'service';
  if (status >= 400) return 'request';
  return 'unknown';
}

function publicUser(user) {
  if (!user || typeof user.id !== 'string') return null;
  return Object.freeze({
    id: user.id,
    email: typeof user.email === 'string' ? user.email : null,
  });
}

function publicSession(session) {
  if (!session) return null;
  return Object.freeze({
    authenticated: true,
    user: publicUser(session.user),
    expiresAt: Number.isFinite(Number(session.expires_at)) ? Number(session.expires_at) : null,
  });
}

function unwrap(result) {
  if (result?.error) throw result.error;
  return result?.data ?? null;
}

export function createThiepnClient(createClient) {
  if (typeof createClient !== 'function') throw new TypeError('A Supabase createClient function is required.');
  return createClient(THIEPN_ACCOUNT.url, THIEPN_ACCOUNT.publishableKey, {
    auth: {
      storageKey: THIEPN_ACCOUNT.storageKey,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function createThiepnAccount({ client, createClient, appSlug, redirectTo } = {}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(appSlug || ''))) {
    throw new TypeError('A lowercase THIEPN app slug is required.');
  }
  const supabase = client ?? createThiepnClient(createClient);
  if (!supabase?.auth) throw new TypeError('A compatible Supabase client is required.');
  const baseUrl = defaultBaseUrl();
  const defaultRedirect = assertAllowedRedirect(redirectTo || baseUrl, { baseUrl });
  const resolveRedirect = (value) => assertAllowedRedirect(value || defaultRedirect, { baseUrl: defaultRedirect });

  async function getSession() {
    const data = unwrap(await supabase.auth.getSession());
    return publicSession(data?.session ?? null);
  }

  async function getUser() {
    const data = unwrap(await supabase.auth.getUser());
    return publicUser(data?.user ?? null);
  }

  async function signInWithPassword({ email, password }) {
    const data = unwrap(await supabase.auth.signInWithPassword({ email, password }));
    return publicSession(data?.session ?? null);
  }

  async function signUpWithPassword({ email, password, redirectTo: nextRedirect } = {}) {
    const data = unwrap(await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: resolveRedirect(nextRedirect) },
    }));
    return Object.freeze({
      session: publicSession(data?.session ?? null),
      user: publicUser(data?.user ?? null),
    });
  }

  async function signInWithGoogle({ redirectTo: nextRedirect } = {}) {
    return unwrap(await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: resolveRedirect(nextRedirect) },
    }));
  }

  async function requestPasswordReset({ email, redirectTo: nextRedirect } = {}) {
    unwrap(await supabase.auth.resetPasswordForEmail(email, { redirectTo: resolveRedirect(nextRedirect) }));
    return true;
  }

  async function refreshSession() {
    const data = unwrap(await supabase.auth.refreshSession());
    return publicSession(data?.session ?? null);
  }

  async function signOut({ scope = 'local' } = {}) {
    if (!SIGN_OUT_SCOPES.has(scope)) throw new TypeError('Invalid THIEPN Account sign-out scope.');
    unwrap(await supabase.auth.signOut({ scope }));
    return true;
  }

  function onAuthStateChange(callback) {
    if (typeof callback !== 'function') throw new TypeError('Auth state callback must be a function.');
    const result = supabase.auth.onAuthStateChange((event, session) => {
      callback(Object.freeze({ event, session: publicSession(session) }));
    });
    return result?.data?.subscription ?? result?.subscription ?? null;
  }

  async function diagnostics() {
    let session = null;
    try { session = await getSession(); } catch { /* diagnostics must remain non-sensitive */ }
    return Object.freeze({
      sdkVersion: THIEPN_ACCOUNT.sdkVersion,
      accountContract: THIEPN_ACCOUNT.accountContract,
      operationsVersion: THIEPN_ACCOUNT.operationsVersion,
      projectRef: THIEPN_ACCOUNT.projectRef,
      sessionAuthority: THIEPN_ACCOUNT.sessionAuthority,
      appSlug,
      hasSession: Boolean(session),
      hasUser: Boolean(session?.user),
    });
  }

  return Object.freeze({
    config: THIEPN_ACCOUNT,
    client: supabase,
    getSession,
    getUser,
    onAuthStateChange,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    requestPasswordReset,
    refreshSession,
    signOut,
    diagnostics,
    classifyError: classifyAccountError,
    assertAllowedRedirect,
  });
}
