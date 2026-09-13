import { describe, expect, it, vi } from 'vitest';
import {
  THIEPN_PLATFORM_VERSION,
  createAccountClient,
} from '../../packages/account-sdk/index.js';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'account@example.test' },
};

const ecosystem = [
  {
    app_slug: 'notes',
    name: 'Notes',
    description: 'Local-first notes.',
    path: '/notes/',
    sort_order: 10,
    manifest_version: 1,
    identity_scope: 'shared',
    data_scope: 'isolated',
    export_scope: 'app-owned',
    capabilities: { sharedIdentity: true, isolatedData: true },
    connected: true,
    first_used_at: '2026-09-01T10:00:00Z',
    last_used_at: '2026-09-12T20:00:00Z',
  },
];

describe('A4 ecosystem platform SDK', () => {
  it('exposes platform version and reads the user-scoped ecosystem RPC', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url.endsWith('/rest/v1/rpc/get_thiepn_ecosystem')).toBe(true);
      expect(init?.method).toBe('POST');
      return new Response(JSON.stringify(ecosystem), { status: 200 });
    });
    const client = createAccountClient({ storage: storage(), fetch: fetchMock as typeof fetch });
    client.writeSession(session);

    expect(client.platformVersion).toBe(THIEPN_PLATFORM_VERSION);
    await expect(client.getEcosystemState()).resolves.toEqual(ecosystem);
  });

  it('records app activity through the existing owner-scoped account_user_apps RLS table', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain('/rest/v1/account_user_apps?');
      expect(url).toContain('on_conflict=user_id%2Capp_slug');
      expect(url).toContain('select=app_slug%2Cfirst_used_at%2Clast_used_at');
      expect(init?.method).toBe('POST');
      const headers = new Headers(init?.headers);
      expect(headers.get('Prefer')).toBe('resolution=merge-duplicates,return=representation');
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        user_id: session.user.id,
        app_slug: 'notes',
        source: 'app',
      });
      expect(Date.parse(body.last_used_at)).not.toBeNaN();
      return new Response(JSON.stringify([{
        app_slug: 'notes',
        first_used_at: '2026-09-01T10:00:00Z',
        last_used_at: body.last_used_at,
      }]), { status: 201 });
    });
    const client = createAccountClient({ storage: storage(), fetch: fetchMock as typeof fetch });
    client.writeSession(session);

    const result = await client.recordAppActivity({ appId: 'notes' });
    expect(result?.app_slug).toBe('notes');
  });

  it('rejects malformed app slugs before making a network request', async () => {
    const fetchMock = vi.fn();
    const client = createAccountClient({ storage: storage(), fetch: fetchMock as typeof fetch });
    client.writeSession(session);

    await expect(client.recordAppActivity({ appId: '../notes' })).rejects.toMatchObject({
      code: 'invalid_app_slug',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exports account/platform metadata through the dedicated read-only RPC', async () => {
    const snapshot = {
      schema: 'thiepn-platform-snapshot',
      version: 1,
      platformVersion: '1.0.0',
      exportedAt: '2026-09-13T00:00:00Z',
      account: { userId: session.user.id, email: session.user.email },
      profile: { displayName: 'Test User', preferredLanguage: 'en', timezone: 'Europe/Berlin' },
      security: { assuranceLevel: 'aal2' },
      apps: [],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input).endsWith('/rest/v1/rpc/export_thiepn_platform_snapshot')).toBe(true);
      expect(init?.method).toBe('POST');
      return new Response(JSON.stringify(snapshot), { status: 200 });
    });
    const client = createAccountClient({ storage: storage(), fetch: fetchMock as typeof fetch });
    client.writeSession(session);

    await expect(client.exportPlatformSnapshot()).resolves.toEqual(snapshot);
  });
});
