import { describe, expect, it } from 'vitest';
import { deriveDailyHomeAvailability } from '../../src/lib/prism/daily-home-availability';
import { buildPrismProviderHomeView } from '../../src/lib/prism/provider-home-view';
import type { ProviderResult, ProviderContext, ProviderEnvelope } from '../../src/lib/providers/types';

const account: ProviderContext = {
  scope: 'account', accountId: '11111111-1111-4111-8111-111111111111',
  workspaceId: null, grantRevision: 'grant-1', translationId: null,
};
const device: ProviderContext = { scope: 'device', deviceId: 'device-1', consentRevision: 'consent-1' };
const none = { continue: false, now: false, study: false, recent: false };
const result = (providerId: ProviderResult['providerId'], operation: ProviderResult['operation'], status: ProviderResult['status']): ProviderResult =>
  ({ providerId, operation, status });

function privateResult(providerId: 'notes' | 'library', operation: 'continue' | 'summary', title: string): ProviderResult {
  const envelope: ProviderEnvelope = {
    schemaVersion: 1, providerId, operation, status: 'ready',
    requestId: 'request-1', context: providerId === 'library' ? device : account,
    privacy: 'private', coverage: providerId === 'library' ? 'device-local' : 'cloud-snapshot',
    observedAt: '2026-10-07T06:00:00.000Z', expiresAt: '2026-10-07T06:05:00.000Z',
    sourceUpdatedAt: '2026-10-07T05:59:00.000Z',
    data: { items: [{
      resourceId: providerId === 'notes' ? '22222222-2222-4222-8222-222222222222' : 'book-1',
      title, updatedAt: '2026-10-07T05:59:00.000Z',
      ...(providerId === 'library' ? { format: 'epub' as const, edition: 1, releaseVersion: 'release-1', current: 0.25, furthest: 0.5 } : {}),
    }] },
  };
  return { providerId, operation, status: 'ready', envelope };
}

describe('H4 provider-aware Daily Home availability', () => {
  it('renders disconnected rather than inventing activity when no provider was read', () => {
    expect(deriveDailyHomeAvailability([], none)).toEqual({
      continue: 'disconnected', now: 'disconnected', study: 'disconnected', recent: 'disconnected',
    });
  });

  it('keeps each operation and provider scope independent', () => {
    const states = deriveDailyHomeAvailability([
      result('notes', 'continue', 'offline'),
      result('library', 'summary', 'empty'),
      result('tms60', 'summary', 'unsupported'),
    ], none);
    expect(states).toEqual({ continue: 'offline', now: 'unsupported', study: 'unsupported', recent: 'unsupported' });
  });

  it('does not mistake a blank snapshot for fresh activity', () => {
    expect(deriveDailyHomeAvailability([result('notes', 'continue', 'ready')], none).continue).toBe('empty');
    expect(deriveDailyHomeAvailability([result('tms60', 'summary', 'empty')], none)).toMatchObject({ now: 'empty', study: 'empty' });
  });

  it('surfaces failed provider reads even if another provider reports empty', () => {
    const statuses = deriveDailyHomeAvailability([
      result('notes', 'continue', 'empty'),
      result('library', 'continue', 'stale'),
      result('notes', 'summary', 'error'),
    ], none);
    expect(statuses.continue).toBe('stale');
    expect(statuses.recent).toBe('error');
    expect(statuses.study).toBe('disconnected');
  });

  it('prefers real authorized activity over unavailable peers without copying their data', () => {
    const statuses = deriveDailyHomeAvailability([
      result('notes', 'continue', 'ready'),
      result('library', 'continue', 'offline'),
      result('tms60', 'summary', 'stale'),
    ], { ...none, continue: true });
    expect(statuses).toMatchObject({ continue: 'ready', now: 'stale', study: 'stale', recent: 'stale' });
  });

  it('retains explicit permission and unsupported states with no credentials or identifiers', () => {
    const availability = deriveDailyHomeAvailability([
      result('notes', 'continue', 'unconnected'),
      result('library', 'summary', 'unsupported'),
    ], none);
    expect(availability.continue).toBe('unconnected');
    expect(availability.recent).toBe('unsupported');
    expect(JSON.stringify(availability)).not.toContain('device-1');
  });

  it('never retains stale private items across a failing provider refresh', () => {
    const view = buildPrismProviderHomeView([
      { ...privateResult('notes', 'continue', 'Secret note'), status: 'stale' },
      result('library', 'continue', 'empty'),
      { ...privateResult('library', 'summary', 'Secret book'), status: 'error' },
    ]);
    expect(view.continue).toMatchObject({ state: 'stale', title: null, href: null });
    expect(view.recent).toEqual([]);
    expect(view.availability).toMatchObject({ continue: 'stale', recent: 'error' });
    expect(JSON.stringify(view)).not.toContain('Secret');
  });

  it('projects a real Library continuation without fabricating other module activity', () => {
    const view = buildPrismProviderHomeView([privateResult('library', 'continue', 'Chapter two')]);
    expect(view.continue).toMatchObject({
      state: 'ready', title: 'Chapter two', progress: 0.25,
      href: '/library/hub/continue?resource=book-1&edition=1&release=release-1',
    });
    expect(view.availability).toEqual({
      continue: 'ready', now: 'disconnected', study: 'disconnected', recent: 'disconnected',
    });
  });

  it('loses all activity after revocation and owner session clearing', () => {
    const shared = buildPrismProviderHomeView([privateResult('notes', 'continue', 'Owner note')]);
    expect(shared.continue.title).toBe('Owner note');
    const revoked = buildPrismProviderHomeView([]);
    expect(revoked.continue.title).toBeNull();
    expect(revoked.now).toEqual([]);
    expect(revoked.recent).toEqual([]);
    expect(JSON.stringify(revoked)).not.toContain('Owner note');
  });
});
