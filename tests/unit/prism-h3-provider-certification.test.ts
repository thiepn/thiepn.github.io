import { describe, expect, it } from 'vitest';
import { PrismProviderCoordinator } from '../../src/lib/prism/provider-coordinator';
import { sessionProviderAdapter } from '../../src/lib/providers/session-adapters';
import type { ProviderAccess, ProviderId, RequestContext } from '../../src/lib/providers/types';

const now = Date.parse('2026-10-09T12:00:00.000Z');
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const account = (id: string, translationId: string | null = null) => ({
  scope: 'account' as const, accountId: id, workspaceId: null,
  grantRevision: 'grant-1', translationId,
});
function access(providerId: ProviderId, owner = alice): ProviderAccess {
  const context = providerId === 'library'
    ? { scope: 'device' as const, deviceId: 'device-1', consentRevision: 'consent-1' }
    : account(owner, providerId === 'tms60' ? 'esv' : null);
  return {
    providerId, context, expiresAt: now + 60000,
    permissions: [`${providerId}.hub.summary.read`, `${providerId}.hub.continue.read`],
  };
}
function reply(request: RequestContext, title: string): string {
  const updatedAt = new Date(now - 1000).toISOString();
  const item = request.providerId === 'notes'
    ? { resourceId: bob, title, updatedAt }
    : request.providerId === 'tms60'
      ? { resourceId: 'esv:1:wording', title, updatedAt, dimension: 'wording' }
      : { resourceId: 'book-1', title, updatedAt, format: 'epub',
          edition: 1, releaseVersion: 'r1', current: 0.2, furthest: 0.5 };
  return JSON.stringify({
    schemaVersion: 1, providerId: request.providerId, operation: request.operation,
    requestId: request.requestId, context: request.context, privacy: 'private',
    coverage: request.providerId === 'library' ? 'device-local'
      : request.providerId === 'tms60' ? 'translation-cloud-snapshot' : 'cloud-snapshot',
    status: 'ready', observedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30000).toISOString(), sourceUpdatedAt: updatedAt,
    data: { items: [item], ...(request.providerId === 'tms60' && request.operation === 'summary'
      ? { dueTaskCount: 1, dueVerseCount: 1, newVerseCount: 0 } : {}) },
  });
}
function adapter(providerId: ProviderId, title: string) {
  return sessionProviderAdapter(providerId, {
    readRequest: async request => reply(request, title),
  });
}

describe('H3 provider contract and owner isolation certification', () => {
  it('permits same-owner Notes, TMS60 and explicitly consented device Library contributions', async () => {
    const coordinator = new PrismProviderCoordinator(() => now);
    coordinator.setConnection(adapter('notes', 'Alice private note'), access('notes'));
    coordinator.setConnection(adapter('tms60', 'Alice review'), access('tms60'));
    coordinator.setConnection(adapter('library', 'Device reading'), access('library'));
    await coordinator.refresh([
      { providerId: 'notes', operation: 'continue' },
      { providerId: 'tms60', operation: 'summary' },
      { providerId: 'library', operation: 'continue' },
    ], () => {});
    expect(coordinator.connectedProviders().sort()).toEqual(['library', 'notes', 'tms60']);
    expect(coordinator.snapshotView().now[0]?.title).toBe('1 Bible review due');
    expect(coordinator.snapshotResults().map(r => r.status)).toEqual(['ready', 'ready', 'ready']);
  });

  it('atomically discards all prior owner and device snapshots before accepting a new owner', async () => {
    const coordinator = new PrismProviderCoordinator(() => now);
    coordinator.setConnection(adapter('notes', 'Alice secret'), access('notes'));
    coordinator.setConnection(adapter('library', 'Previous device'), access('library'));
    await coordinator.refresh([
      { providerId: 'notes', operation: 'continue' },
      { providerId: 'library', operation: 'continue' },
    ], () => {});
    expect(coordinator.snapshotView().continue.title).toBeTruthy();
    coordinator.setConnection(adapter('tms60', 'Bob review'), access('tms60', bob));
    expect(coordinator.connectedProviders()).toEqual(['tms60']);
    expect(coordinator.snapshotResults()).toEqual([]);
    expect(JSON.stringify(coordinator.snapshotView())).not.toMatch(/Alice secret|Previous device/);
    await coordinator.refresh([{ providerId: 'tms60', operation: 'summary' }], () => {});
    expect(coordinator.snapshotView().now[0]?.title).toBe('1 Bible review due');
    expect(JSON.stringify(coordinator.snapshotView())).not.toContain('Alice secret');
  });

  it('invalidates late old-owner responses when the owner changes mid-flight', async () => {
    const coordinator = new PrismProviderCoordinator(() => now);
    let release!: () => void;
    let started!: () => void;
    const requested = new Promise<void>(resolve => { started = resolve; });
    coordinator.setConnection(sessionProviderAdapter('notes', {
      readRequest: async request => {
        started();
        await new Promise<void>(resolve => { release = resolve; });
        return reply(request, 'Never show after sign-out');
      },
    }), access('notes'));
    const emissions: string[] = [];
    const pending = coordinator.refresh([{ providerId: 'notes', operation: 'continue' }],
      view => { emissions.push(JSON.stringify(view)); });
    await requested;
    coordinator.setConnection(adapter('notes', 'New owner note'), access('notes', bob));
    release();
    await pending;
    expect(coordinator.snapshotResults()).toEqual([]);
    expect(emissions.join(' ')).not.toContain('Never show after sign-out');
    await coordinator.refresh([{ providerId: 'notes', operation: 'continue' }], () => {});
    expect(coordinator.snapshotView().continue.title).toBe('New owner note');
  });

  it('rejects cross-scope, missing translation and malformed authority before binding', () => {
    const coordinator = new PrismProviderCoordinator(() => now);
    expect(() => coordinator.setConnection(adapter('notes', 'x'), {
      ...access('notes'), context: account(alice, 'esv'),
    })).toThrow('Invalid provider authority');
    expect(() => coordinator.setConnection(adapter('tms60', 'x'), {
      ...access('tms60'), context: account(alice),
    })).toThrow('Invalid provider authority');
    expect(() => coordinator.setConnection(adapter('library', 'x'), {
      ...access('library'), context: account(alice),
    })).toThrow('Invalid provider authority');
    expect(() => coordinator.setConnection(adapter('notes', 'x'), {
      ...access('notes'), expiresAt: Number.NaN,
    })).toThrow('Invalid provider authority');
    expect(coordinator.connectedProviders()).toEqual([]);
  });

  it('keeps one account owner while allowing revision and translation-scoped reconnection', async () => {
    const coordinator = new PrismProviderCoordinator(() => now);
    coordinator.setConnection(adapter('notes', 'Note'), access('notes'));
    coordinator.setConnection(adapter('tms60', 'Review'), access('tms60'));
    const revised = { ...access('tms60'), context: { ...account(alice, 'esv'), grantRevision: 'grant-2' } };
    coordinator.setConnection(adapter('tms60', 'Updated review'), revised);
    expect(coordinator.connectedProviders().sort()).toEqual(['notes', 'tms60']);
    await coordinator.refresh([{ providerId: 'notes', operation: 'continue' }], () => {});
    expect(coordinator.snapshotView().continue.title).toBe('Note');
  });
});
