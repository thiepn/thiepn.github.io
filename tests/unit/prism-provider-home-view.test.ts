import { describe, expect, it } from 'vitest';
import { buildPrismProviderHomeView } from '../../src/lib/prism/provider-home-view';
import type { ProviderContext, ProviderEnvelope, ProviderId, ProviderResult } from '../../src/lib/providers/types';

const account: ProviderContext = {
  scope: 'account',
  accountId: '11111111-1111-4111-8111-111111111111',
  workspaceId: null,
  grantRevision: 'grant-1',
  translationId: null,
};

const device: ProviderContext = {
  scope: 'device',
  deviceId: 'device-1',
  consentRevision: 'consent-1',
};

function envelope(
  providerId: ProviderId,
  operation: 'summary' | 'continue',
  context: ProviderContext,
  data: ProviderEnvelope['data'],
  status: ProviderEnvelope['status'] = data ? 'ready' : 'empty',
): ProviderEnvelope {
  return {
    schemaVersion: 1,
    providerId,
    operation,
    requestId: `request-${providerId}-${operation}`,
    context,
    status,
    privacy: 'private',
    coverage: providerId === 'library' ? 'device-local' : providerId === 'tms60' ? 'translation-cloud-snapshot' : 'cloud-snapshot',
    observedAt: '2026-10-07T06:00:00.000Z',
    expiresAt: '2026-10-07T06:05:00.000Z',
    sourceUpdatedAt: '2026-10-07T05:59:00.000Z',
    data,
  };
}

describe('Prism provider Home view model', () => {
  it('selects the freshest ready Continue item and preserves Library progress', () => {
    const results: ProviderResult[] = [
      {
        providerId: 'notes',
        operation: 'continue',
        status: 'ready',
        envelope: envelope('notes', 'continue', account, {
          items: [{
            resourceId: '22222222-2222-4222-8222-222222222222',
            title: 'Older note',
            updatedAt: '2026-10-07T05:30:00.000Z',
          }],
        }),
      },
      {
        providerId: 'library',
        operation: 'continue',
        status: 'ready',
        envelope: envelope('library', 'continue', device, {
          items: [{
            resourceId: 'book-1',
            title: 'Current book',
            updatedAt: '2026-10-07T05:50:00.000Z',
            format: 'epub',
            edition: 1,
            releaseVersion: 'release-1',
            current: 0.42,
            furthest: 0.55,
          }],
        }),
      },
    ];

    expect(buildPrismProviderHomeView(results).continue).toEqual({
      state: 'ready',
      providerId: 'library',
      title: 'Current book',
      updatedAt: '2026-10-07T05:50:00.000Z',
      href: '/library/hub/continue?resource=book-1&edition=1&release=release-1',
      progress: 0.42,
    });
  });

  it('maps TMS60 summary counts into a bounded Now action', () => {
    const tmsContext: ProviderContext = { ...account, translationId: 'esv' };
    const view = buildPrismProviderHomeView([{
      providerId: 'tms60',
      operation: 'summary',
      status: 'ready',
      envelope: envelope('tms60', 'summary', tmsContext, {
        items: [],
        dueTaskCount: 23,
        dueVerseCount: 9,
        newVerseCount: 2,
      }),
    }]);

    expect(view.now).toEqual([{
      id: 'tms60:due',
      providerId: 'tms60',
      title: '23 Bible reviews due',
      detail: '9 verses',
      href: 'https://tms60.thiepn.dev/',
      priority: 100,
    }]);
  });

  it('keeps summary failures isolated from Continue state', () => {
    const view = buildPrismProviderHomeView([
      { providerId: 'notes', operation: 'summary', status: 'error' },
      { providerId: 'library', operation: 'continue', status: 'empty', envelope: envelope('library', 'continue', device, { items: [] }, 'empty') },
    ]);
    expect(view.continue.state).toBe('empty');
    expect(view.now).toEqual([]);
  });

  it('preserves unavailable state only for the requested Continue operation', () => {
    const view = buildPrismProviderHomeView([
      { providerId: 'notes', operation: 'summary', status: 'error' },
      { providerId: 'library', operation: 'continue', status: 'offline' },
      { providerId: 'tms60', operation: 'continue', status: 'unsupported' },
    ]);
    expect(view.continue).toMatchObject({ state: 'offline', providerId: 'library', title: null });
  });

  it('caps Now contributions to three items', () => {
    const tmsContext: ProviderContext = { ...account, translationId: 'esv' };
    const repeated: ProviderResult[] = Array.from({ length: 5 }, () => ({
      providerId: 'tms60',
      operation: 'summary',
      status: 'ready',
      envelope: envelope('tms60', 'summary', tmsContext, {
        items: [],
        dueTaskCount: 1,
        dueVerseCount: 1,
        newVerseCount: 0,
      }),
    }));
    expect(buildPrismProviderHomeView(repeated).now.length).toBeLessThanOrEqual(3);
  });
});
