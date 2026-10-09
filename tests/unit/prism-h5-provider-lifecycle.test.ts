import { describe, expect, it } from 'vitest';
import { isProviderClearSignal, providerClearChannelName, PROVIDER_CLEAR_SIGNAL } from '../../src/lib/prism/provider-clear-signal';
import { PrismProviderRuntime } from '../../src/lib/prism/provider-runtime';
import { sessionProviderAdapter } from '../../src/lib/providers/session-adapters';
import { libraryProviderAccess, type LibraryConsent } from '../../src/lib/hub-library-session';
import type { ProviderAccess, RequestContext } from '../../src/lib/providers/types';

const owner = '11111111-1111-4111-8111-111111111111';
const libraryConsent: LibraryConsent = {
  schemaVersion: 1, deviceId: '22222222-2222-4222-8222-222222222222',
  revision: '33333333-3333-4333-8333-333333333333', permissions: ['continue'],
  includePersonal: false,
};
const reply = (request: RequestContext, label: string) => {
  const now = Date.now();
  return JSON.stringify({
    schemaVersion: 1, requestId: request.requestId, providerId: request.providerId,
    operation: request.operation, context: request.context, status: 'ready',
    privacy: 'private', coverage: request.providerId === 'library' ? 'device-local' : 'cloud-snapshot',
    observedAt: new Date(now).toISOString(), expiresAt: new Date(now + 30_000).toISOString(),
    sourceUpdatedAt: new Date(now - 1000).toISOString(),
    data: { items: [{
      resourceId: request.providerId === 'library' ? 'book-1' : '44444444-4444-4444-8444-444444444444',
      title: label, updatedAt: new Date(now - 1000).toISOString(),
      ...(request.providerId === 'library' ? {
        format: 'epub', edition: 1, releaseVersion: 'r1', current: 0.2, furthest: 0.4,
      } : {}),
    }] },
  });
};
const bind = (runtime: PrismProviderRuntime, access: ProviderAccess, label: string) => {
  const adapter = sessionProviderAdapter(access.providerId, { readRequest: async request => reply(request, label) });
  runtime.setConnection(adapter, access);
  runtime.setVisible(access.providerId, 'continue', true);
};
const notesAccess = (): ProviderAccess => ({
  providerId: 'notes', context: {
    scope: 'account', accountId: owner, workspaceId: null,
    grantRevision: '55555555-5555-4555-8555-555555555555', translationId: null,
  }, permissions: ['notes.hub.continue.read'], expiresAt: Date.now() + 60_000,
});

describe('H5 provider and device lifecycle regression', () => {
  it('uses exact minimal, provider-specific cross-tab invalidations', () => {
    expect(providerClearChannelName('library')).toBe('thiepn:hub-library:clear:v1');
    expect(providerClearChannelName('notes')).toBe('thiepn:hub-notes:clear:v1');
    expect(providerClearChannelName('tms60')).toBe('thiepn:hub-tms60:clear:v1');
    expect(isProviderClearSignal(PROVIDER_CLEAR_SIGNAL)).toBe(true);
    for (const payload of [null, 'clear', { type: 'connect' }, { type: 'clear', owner },
      { type: 'clear', token: 'private-secret' }, { type: 'clear', deviceId: libraryConsent.deviceId },
      ['clear'], Object.create({ type: 'clear' })]) {
      expect(isProviderClearSignal(payload)).toBe(false);
    }
    expect(JSON.stringify(PROVIDER_CLEAR_SIGNAL)).toBe('{"type":"clear"}');
  });

  it('drops every private projection synchronously on disconnect and never restores it by itself', async () => {
    const runtime = new PrismProviderRuntime();
    bind(runtime, notesAccess(), 'Private owner note');
    await runtime.refresh();
    expect(runtime.view().continue.title).toBe('Private owner note');
    const snapshots: string[] = [];
    runtime.subscribe(view => snapshots.push(JSON.stringify(view)));
    runtime.removeConnection('notes');
    expect(runtime.view().continue.title).toBeNull();
    expect(runtime.results()).toEqual([]);
    await runtime.refresh();
    expect(runtime.view().continue.title).toBeNull();
    expect(snapshots.at(-1)).not.toContain('Private owner note');
  });

  it('requires a new device grant after Library disconnect or consent revision', async () => {
    const runtime = new PrismProviderRuntime();
    const first = libraryProviderAccess(libraryConsent);
    bind(runtime, first, 'Device-only book');
    await runtime.refresh();
    expect(runtime.view().continue.title).toBe('Device-only book');
    runtime.removeConnection('library');
    expect(runtime.results()).toEqual([]);
    expect(runtime.view().continue.href).toBeNull();
    await runtime.refresh();
    expect(runtime.view().continue.title).toBeNull();
    const renewed = libraryProviderAccess({ ...libraryConsent, revision: '66666666-6666-4666-8666-666666666666' });
    expect(renewed.context).not.toEqual(first.context);
    bind(runtime, renewed, 'Book after reconsent');
    await runtime.refresh();
    expect(runtime.view().continue.title).toBe('Book after reconsent');
    expect(runtime.results()[0]?.envelope?.context).toEqual(renewed.context);
  });

  it('isolates account logout from device reconsent and forbids background retrieval after clear', async () => {
    const runtime = new PrismProviderRuntime();
    bind(runtime, notesAccess(), 'Old owner');
    bind(runtime, libraryProviderAccess(libraryConsent), 'Device book');
    await runtime.refresh();
    expect([...runtime.connectedProviders()].sort()).toEqual(['library', 'notes']);
    runtime.clear();
    expect(runtime.connectedProviders()).toEqual([]);
    expect(runtime.view().continue.title).toBeNull();
    expect(runtime.results()).toEqual([]);
    await runtime.refresh();
    expect(JSON.stringify(runtime.view())).not.toMatch(/Old owner|Device book/);
  });
});
