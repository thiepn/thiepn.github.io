import { describe, expect, it, vi } from 'vitest';
import {
  THIEPN_ACCOUNT_CONFIG,
  THIEPN_ACCOUNT_VERSION,
  THIEPN_PLATFORM_VERSION,
  createAccountClient,
  getConnectedProviders,
  migrateLegacySessions,
  parseSession,
} from '../../packages/account-sdk/index.js';

function storage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const session = {
  access_token: 'access', refresh_token: 'refresh', expires_at: 2_000_000_000, token_type: 'bearer',
  user: { id: 'user-1', email: 'user@example.test', identities: [{ provider: 'google' }] },
};

describe('THIEPN Account SDK v1', () => {
  it('locks the canonical shared identity and platform contracts', () => {
    expect(THIEPN_ACCOUNT_VERSION).toBe('1.2.0');
    expect(THIEPN_PLATFORM_VERSION).toBe('1.0.0');
    expect(THIEPN_ACCOUNT_CONFIG.sessionKey).toBe('sb-hycegznamzjhwinegaai-auth-token');
    expect(THIEPN_ACCOUNT_CONFIG.supabaseUrl).toBe('https://hycegznamzjhwinegaai.supabase.co');
  });

  it('parses only complete shared sessions', () => {
    expect(parseSession(JSON.stringify(session))?.user.id).toBe('user-1');
    expect(parseSession('{"access_token":"only"}')).toBeNull();
    expect(parseSession('not-json')).toBeNull();
  });

  it('migrates a valid legacy session without overwriting a canonical one', () => {
    const legacy = storage({ old: JSON.stringify(session) });
    const migrated = migrateLegacySessions({ storage: legacy, legacyKeys: ['old'] });
    expect(migrated.migratedFrom).toBe('old');
    expect(parseSession(legacy.getItem(THIEPN_ACCOUNT_CONFIG.sessionKey))?.user.id).toBe('user-1');
    expect(legacy.getItem('old')).toBeNull();
  });

  it('does not infer email/password from the existence of an email address', () => {
    const providers = getConnectedProviders({
      id: 'user-1', email: 'user@example.test', email_confirmed_at: '2026-09-01T00:00:00Z',
      app_metadata: { provider: 'google', providers: ['google'] }, identities: [{ provider: 'google' }],
    });
    expect([...providers]).toEqual(['google']);
    expect(providers.has('email')).toBe(false);
  });

  it('refreshes expiring sessions and writes the canonical session key', async () => {
    const store = storage();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
        return new Response(JSON.stringify({ ...session, access_token: 'fresh', expires_at: 2_100_000_000 }), { status: 200 });
      }
      if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify(session.user), { status: 200 });
      throw new Error(`Unexpected request ${url}`);
    });
    const client = createAccountClient({ storage: store, fetch: fetchMock as typeof fetch });
    client.writeSession({ ...session, expires_at: 1 });
    const restored = await client.ensureSession();
    expect(restored?.access_token).toBe('fresh');
    expect(parseSession(store.getItem(THIEPN_ACCOUNT_CONFIG.sessionKey))?.access_token).toBe('fresh');
  });
});
