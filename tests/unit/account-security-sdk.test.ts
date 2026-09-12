import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import {
  THIEPN_ACCOUNT_CONFIG,
  createAccountClient,
  decodeJwtPayload,
  getSessionSecurity,
  needsMfaChallenge,
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

function jwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'account@example.test',
  factors: [{
    id: '22222222-2222-4222-8222-222222222222',
    factor_type: 'totp',
    status: 'verified',
    friendly_name: 'Phone authenticator',
  }],
};

function session(accessToken = jwt({ aal: 'aal1', session_id: '33333333-3333-4333-8333-333333333333' })) {
  return {
    access_token: accessToken,
    refresh_token: 'refresh-token',
    expires_at: 2_000_000_000,
    token_type: 'bearer',
    user,
  };
}

describe('A3 account security SDK', () => {
  it('decodes local AAL/session metadata without treating the token as verified authorization', () => {
    const token = jwt({
      aal: 'aal2',
      session_id: 'session-123',
      exp: 2_000_000_000,
      amr: [{ method: 'totp', timestamp: 1_999_999_900 }],
    });
    expect(decodeJwtPayload(token)?.session_id).toBe('session-123');
    expect(getSessionSecurity(session(token))).toEqual({
      aal: 'aal2',
      sessionId: 'session-123',
      expiresAt: 2_000_000_000,
      amr: [{ method: 'totp', timestamp: 1_999_999_900 }],
    });
  });

  it('requires an AAL2 challenge only after the user has a verified second factor', () => {
    const aal1 = session();
    expect(needsMfaChallenge(aal1, user)).toBe(true);
    expect(needsMfaChallenge(aal1, { ...user, factors: [] })).toBe(false);
    const aal2 = session(jwt({ aal: 'aal2', session_id: 'session-2' }));
    expect(needsMfaChallenge(aal2, user)).toBe(false);
  });

  it('requests existing-user email OTP and stores the verified session', async () => {
    const store = storage();
    const verified = session(jwt({ aal: 'aal1', session_id: 'otp-session' }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/otp')) {
        expect(JSON.parse(String(init?.body))).toEqual({ email: 'account@example.test', create_user: false });
        return new Response('{}', { status: 200 });
      }
      if (url.endsWith('/auth/v1/verify')) {
        expect(JSON.parse(String(init?.body))).toEqual({ email: 'account@example.test', token: '123456', type: 'email' });
        return new Response(JSON.stringify(verified), { status: 200 });
      }
      throw new Error(`Unexpected request ${url}`);
    });
    const client = createAccountClient({ storage: store, fetch: fetchMock as typeof fetch });
    await client.requestEmailOtp({ email: 'account@example.test', shouldCreateUser: false });
    const next = await client.verifyEmailOtp({ email: 'account@example.test', token: '123456' });
    expect(next.user.id).toBe(user.id);
    expect(parseSession(store.getItem(THIEPN_ACCOUNT_CONFIG.sessionKey))?.access_token).toBe(verified.access_token);
  });

  it('performs TOTP enroll, challenge and verification through current GoTrue routes', async () => {
    const store = storage();
    const factorId = '44444444-4444-4444-8444-444444444444';
    const challengeId = '55555555-5555-4555-8555-555555555555';
    const aal2 = session(jwt({ aal: 'aal2', session_id: 'mfa-session' }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/factors') && init?.method === 'POST') {
        return new Response(JSON.stringify({ id: factorId, type: 'totp', totp: { secret: 'SECRET', qr_code: '<svg></svg>' } }), { status: 200 });
      }
      if (url.endsWith(`/auth/v1/factors/${factorId}/challenge`)) {
        return new Response(JSON.stringify({ id: challengeId, expires_at: 2_000_000_000 }), { status: 200 });
      }
      if (url.endsWith(`/auth/v1/factors/${factorId}/verify`)) {
        expect(JSON.parse(String(init?.body))).toEqual({ challenge_id: challengeId, code: '654321' });
        return new Response(JSON.stringify(aal2), { status: 200 });
      }
      throw new Error(`Unexpected request ${url}`);
    });
    const client = createAccountClient({ storage: store, fetch: fetchMock as typeof fetch });
    client.writeSession(session());
    const enrolled = await client.enrollTotp({ friendlyName: 'Backup authenticator' });
    expect(enrolled.id).toBe(factorId);
    const challenge = await client.challengeMfa({ factorId });
    expect(challenge.id).toBe(challengeId);
    const upgraded = await client.verifyMfa({ factorId, challengeId, code: '654321' });
    expect(getSessionSecurity(upgraded).aal).toBe('aal2');
  });

  it('signs out other sessions without deleting the current browser session', async () => {
    const store = storage();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/v1/logout?scope=others') || url.includes('/auth/v1/logout?scope=local')) {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request ${url}`);
    });
    const client = createAccountClient({ storage: store, fetch: fetchMock as typeof fetch });
    client.writeSession(session());
    await client.signOutOtherSessions();
    expect(client.readSession()?.user.id).toBe(user.id);
    await client.signOut({ scope: 'local' });
    expect(client.readSession()).toBeNull();
  });

  it('loads only the account-session RPC contract exposed by A3', async () => {
    const store = storage();
    const rows = [{
      session_id: 'session-1',
      created_at: '2026-09-13T10:00:00Z',
      updated_at: '2026-09-13T10:05:00Z',
      refreshed_at: null,
      not_after: null,
      user_agent: 'Firefox',
      aal: 'aal2',
      is_current: true,
    }];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/list_thiepn_account_sessions')) {
        return new Response(JSON.stringify(rows), { status: 200 });
      }
      throw new Error(`Unexpected request ${url}`);
    });
    const client = createAccountClient({ storage: store, fetch: fetchMock as typeof fetch });
    client.writeSession(session());
    await expect(client.listAccountSessions()).resolves.toEqual(rows);
  });
});
