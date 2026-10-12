import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismManagedConnection, type PrismManagedState } from '../../src/lib/prism/managed-provider-connection';
import { PrismProviderRuntime } from '../../src/lib/prism/provider-runtime';
import type { ProviderAccess, RequestContext } from '../../src/lib/providers/types';

const owner = '11111111-1111-4111-8111-111111111111';
const revision = '44444444-4444-4444-8444-444444444444';
const connections: PrismManagedConnection[] = [];
afterEach(() => { connections.splice(0).forEach(connection => connection.clear()); vi.useRealTimers(); });
function fixture(permissions = ['notes.hub.summary.read', 'notes.hub.continue.read']) {
  const runtime = new PrismProviderRuntime();
  const states: PrismManagedState[] = [], requests: RequestContext[] = [];
  let currentOwner: string | null = owner, denied = false;
  let visible: ('summary' | 'continue')[] = ['summary', 'continue'];
  const access: ProviderAccess = { providerId: 'notes', context: { scope: 'account', accountId: owner, workspaceId: null, grantRevision: revision, translationId: null }, permissions, expiresAt: Date.now() + 60000 };
  const session = {
    clear: vi.fn(), begin: vi.fn(async () => 'https://example.test/authorize'), complete: vi.fn(async () => {}),
    providerAccess: vi.fn(async () => access),
    readRequest: vi.fn(async (request: RequestContext) => {
      requests.push(request);
      return JSON.stringify({ schemaVersion: 1, providerId: 'notes', operation: request.operation, requestId: request.requestId, context: request.context,
        privacy: 'private', coverage: 'cloud-snapshot', status: 'ready', observedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1000).toISOString(), sourceUpdatedAt: new Date(Date.now() - 1).toISOString(),
        data: { items: [{ resourceId: revision, title: 'Private note', updatedAt: new Date(Date.now() - 1).toISOString() }] } });
    }),
  };
  const consent = vi.fn(async () => { if (denied) throw new Error('Revoked'); return { permissions, revision }; });
  const connection = new PrismManagedConnection('notes', session, runtime, () => currentOwner, consent, () => visible, state => states.push(state));
  connections.push(connection);
  return { connection, runtime, states, requests, session, consent, access, revoke: () => { denied = true; }, hide: () => { visible = []; }, switch: () => { currentOwner = revision; } };
}
describe('Prism managed owner connection', () => {
  it('reads only the granted Home operation; never adds Search automatically', async () => {
    const f = fixture(['notes.hub.continue.read']);
    await f.connection.complete(new URLSearchParams(), '');
    expect(f.requests.map(request => request.operation)).toEqual(['continue']);
    expect(f.runtime.view().continue.title).toBe('Private note');
    expect(f.runtime.view().recent).toEqual([]);
    expect(f.states.at(-1)).toMatchObject({ connected: true, busy: false, message: 'Connected · shared snapshot shown on Home.' });
  });
  it('rechecks sharing on refresh and erases prior contributions immediately on revocation', async () => {
    const f = fixture(); await f.connection.complete(new URLSearchParams(), '');
    expect(f.runtime.view().recent).toHaveLength(1);
    f.revoke(); const refresh = f.connection.refresh();
    expect(f.runtime.view().recent).toEqual([]);
    expect(f.runtime.view().continue.title).toBeNull();
    await refresh;
    expect(f.states.at(-1)).toMatchObject({ connected: false, busy: false });
    expect(f.session.clear).toHaveBeenCalled();
  });
  it('withholds hidden Home data without issuing authority or owner reads', async () => {
    const f = fixture(); f.hide(); await f.connection.complete(new URLSearchParams(), '');
    expect(f.requests).toEqual([]); expect(f.consent).not.toHaveBeenCalled();
    expect(f.runtime.results()).toEqual([]);
  });
  it('drops expired private snapshots without an automatic network refresh', async () => {
    vi.useFakeTimers(); const f = fixture(); await f.connection.complete(new URLSearchParams(), '');
    expect(f.runtime.view().continue.title).toBe('Private note');
    await vi.advanceTimersByTimeAsync(1006);
    expect(f.runtime.view().continue.title).toBeNull(); expect(f.runtime.view().recent).toEqual([]);
    expect(f.requests).toHaveLength(2);
    expect(f.states.at(-1)?.message).toContain('expired');
  });
  it('rejects an access snapshot for another owner before reading it', async () => {
    const f = fixture(); f.switch(); await f.connection.complete(new URLSearchParams(), '');
    expect(f.requests).toEqual([]); expect(f.runtime.results()).toEqual([]);
  });
  it('does not restore a late callback after identity clearing', async () => {
    const f = fixture(); let release!: () => void;
    f.session.complete.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
    const complete = f.connection.complete(new URLSearchParams(), '');
    f.connection.clear('Signed out'); release(); await complete;
    expect(f.requests).toEqual([]); expect(f.runtime.connectedProviders()).toEqual([]);
    expect(f.states.at(-1)).toEqual({ connected: false, busy: false, message: 'Signed out' });
  });
});
