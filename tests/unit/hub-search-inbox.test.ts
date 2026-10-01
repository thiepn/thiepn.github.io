import { describe, expect, it, vi } from 'vitest';
import { publicSearchLocation, parseSearchScope } from '../../src/lib/search-scopes';
import { HUB_ACTIONS, findHubActions } from '../../src/lib/hub-actions';
import { FederatedSearch } from '../../src/lib/providers/federated-search';
import { InboxStore, validateAttention, type AttentionRequest } from '../../src/lib/providers/inbox';
import { providerManifest } from '../../src/lib/providers/registry';
import type { ProviderAccess, ProviderAdapter, ProviderId, ProviderManifest, RequestContext } from '../../src/lib/providers/types';
import notes from '../../contracts/fixtures/notes.json';
import library from '../../contracts/fixtures/library.json';
import tms60 from '../../contracts/fixtures/tms60.json';
import inbox from '../../contracts/fixtures/inbox.json';
const fixtures = { notes, library, tms60 }, ids: ProviderId[] = ['notes', 'library', 'tms60'];
const now = Date.parse('2026-10-01T08:00:01Z');
const enabled = (id: ProviderId): ProviderManifest => { const m = structuredClone(providerManifest(id)); m.privateReadsEnabled = m.operations.search = m.operations.inbox = true; return m; };
const access = (id: ProviderId): ProviderAccess => ({ providerId: id, context: structuredClone(fixtures[id].context) as ProviderAccess['context'], permissions: [`${id}.hub.search.read`, `${id}.hub.inbox.read`], expiresAt: now + 300000 });
const response = (request: RequestContext) => {
  const f = structuredClone(fixtures[request.providerId]) as any; f.operation = request.operation; f.requestId = request.requestId; f.context = request.context;
  delete f.data.dueTaskCount; delete f.data.dueVerseCount; delete f.data.newVerseCount; return JSON.stringify(f);
};
const attention = (request: AttentionRequest, items = inbox.data.items) => JSON.stringify({ ...structuredClone(inbox), ...request, coverage: providerManifest(request.providerId).coverage, data: { items } });
describe('H5 public scope and explicit actions', () => {
  it('keeps private queries out of URLs and recovers unknown scopes', () => {
    expect(publicSearchLocation('resources', 'secret health note')).toBe('/search/?scope=resources');
    expect(publicSearchLocation('apps', 'merge PDF')).toBe('/search/?q=merge+PDF');
    expect(publicSearchLocation('actions', 'new checklist')).toBe('/search/?scope=actions&q=new+checklist');
    expect(parseSearchScope('all-private')).toBe('apps');
  });
  it('returns only reviewed owner handoffs without executing a write', () => {
    expect(findHubActions(HUB_ACTIONS, 'checklist')[0]!.href).toBe('https://thiepn.dev/notes/?capture=checklist');
    expect(findHubActions(HUB_ACTIONS, 'book')[0]!.title).toBe('Continue in Library');
    expect(findHubActions(HUB_ACTIONS, 'zz-no-match')).toEqual([]);
    expect(HUB_ACTIONS.every(a => a.href.startsWith('https:') && !/token|accountId/.test(a.href))).toBe(true);
  });
});
describe('H5 bounded federation', () => {
  it('does not read disabled production sources or claim no results means no data', async () => {
    const read = vi.fn(async (r: RequestContext) => response(r)); const engine = new FederatedSearch(ids.map(id => ({ manifest: providerManifest(id), read })), () => now);
    engine.setAccess(ids.map(access)); await engine.search('private thought', () => {});
    expect(read).not.toHaveBeenCalled(); expect(engine.snapshot()).toMatchObject({ knownResults: 0, respondingSources: 0, allSourcesResponded: false });
    expect(engine.snapshot().groups.map(g => g.status)).toEqual(['unsupported', 'unsupported', 'unsupported']);
  });
  it('groups authorized owner results while isolating a timed-out and malformed source', async () => {
    vi.useFakeTimers();
    try {
      const adapters: ProviderAdapter[] = [{ manifest: enabled('notes'), read: async r => response(r) }, { manifest: enabled('library'), read: async () => 'invalid' }, { manifest: enabled('tms60'), read: () => new Promise(() => {}) }];
      const engine = new FederatedSearch(adapters, () => now); engine.setAccess(ids.map(access));
      const work = engine.search('private thought', () => {}); await vi.advanceTimersByTimeAsync(2001); await work;
      expect(engine.snapshot()).toMatchObject({ knownResults: 1, respondingSources: 1, allSourcesResponded: false });
      expect(engine.snapshot().groups.map(g => g.status)).toEqual(['ready', 'error', 'offline']);
      expect(JSON.stringify(engine.snapshot())).not.toContain('private thought');
    } finally { vi.useRealTimers(); }
  });
  it('cancels an old query and rejects its late response without mixing new results', async () => {
    let finish!: (raw: string) => void; let oldRequest!: RequestContext; let calls = 0;
    const engine = new FederatedSearch([{ manifest: enabled('notes'), read: r => { if (++calls === 1) { oldRequest = r; return new Promise(resolve => { finish = resolve; }); } return Promise.resolve(response(r)); } }], () => now);
    engine.setAccess([access('notes')]); const emitOld = vi.fn(); const old = engine.search('first secret', emitOld); await engine.search('second secret', () => {}); finish(response(oldRequest)); await old;
    expect(emitOld).not.toHaveBeenCalled(); expect(engine.snapshot().knownResults).toBe(1);
    expect(JSON.stringify(engine.snapshot())).not.toMatch(/first secret|second secret/);
    engine.clear(); expect(engine.snapshot().knownResults).toBe(0);
  });
  it('removes results when access expires, changes or is revoked', async () => {
    let time = now; const engine = new FederatedSearch([{ manifest: enabled('notes'), read: async r => response(r) }], () => time);
    engine.setAccess([{ ...access('notes'), expiresAt: now + 1000 }]); await engine.search('example', () => {});
    time += 1001; expect(engine.snapshot()).toMatchObject({ knownResults: 0, allSourcesResponded: false });
    engine.setAccess(null); expect(engine.snapshot().groups[0]!.items).toEqual([]);
  });
  it('rejects private query excess/control characters and invalid pilot contexts before reading', async () => {
    const read = vi.fn(async (r: RequestContext) => response(r)); const engine = new FederatedSearch([{ manifest: enabled('notes'), read }], () => now);
    engine.setAccess([{ ...access('notes'), context: { ...access('notes').context, workspaceId: 'wrong' } as any }]);
    await engine.search('example', () => {}); expect(read).not.toHaveBeenCalled();
    await expect(engine.search('x'.repeat(257), () => {})).rejects.toThrow(); await expect(engine.search('secret\nquery', () => {})).rejects.toThrow();
  });
});
describe('H5 attention contract and lifecycle', () => {
  it('keeps production Inbox unconnected with an unknown total', () => {
    const store = new InboxStore(ids.map(providerManifest), () => now); store.setAccess(ids.map(access));
    expect(store.begin('notes')).toBeNull(); expect(store.snapshot()).toMatchObject({ items: [], knownUnread: 0, unreadCount: null, allSourcesResponded: false });
  });
  it('requires inbox purpose, owner/device context and selected translation', () => {
    const store = new InboxStore(ids.map(enabled), () => now);
    store.setAccess([{ ...access('notes'), permissions: ['app_data.read'] }]); expect(store.begin('notes')).toBeNull();
    store.setAccess([{ ...access('library'), context: access('notes').context }]); expect(store.begin('library')).toBeNull();
    store.setAccess([{ ...access('tms60'), context: { ...access('tms60').context, translationId: null } as any }]); expect(store.begin('tms60')).toBeNull();
  });
  it('dedupes within each owner, keeps owners separate and counts only open unread issues', () => {
    const store = new InboxStore(ids.map(enabled), () => now); store.setAccess(ids.map(access));
    for (const id of ids) { const r = store.begin(id)!; expect(store.accept(attention(r, [...inbox.data.items, ...inbox.data.items]), r)).toBe(true); }
    expect(store.snapshot()).toMatchObject({ knownUnread: 3, unreadCount: 3, allSourcesResponded: true }); expect(store.snapshot().items).toHaveLength(3);
    const r = store.begin('notes')!; const resolved = { ...inbox.data.items[0]!, state: 'resolved' }; store.accept(attention(r, [resolved, inbox.data.items[0]!] as any), r);
    expect(store.snapshot().unreadCount).toBe(2);
  });
  it('distinguishes read, dismissed and resolved; issue opening never changes owner state', () => {
    const store = new InboxStore([enabled('notes')], () => now); store.setAccess([access('notes')]); const r = store.begin('notes')!;
    const items = ['read', 'dismissed', 'unread'].map((attention, i) => ({ ...inbox.data.items[0]!, issueId: 'issue-' + i, dedupeKey: 'key-' + i, attention, state: i === 2 ? 'resolved' : 'open' }));
    store.accept(attention(r, items as any), r); expect(store.snapshot()).toMatchObject({ knownUnread: 0, unreadCount: 0 }); expect(store.snapshot().items).toHaveLength(1);
    expect(store.snapshot().items[0]!.href).toBe(providerManifest('notes').actions.open); expect(store.snapshot().items[0]!.attention).toBe('read');
  });
  it('rejects different issues sharing one dedupe key, arbitrary URLs, raw telemetry and false empty states', () => {
    const r: AttentionRequest = { providerId: 'notes', operation: 'inbox', requestId: inbox.requestId, context: access('notes').context };
    for (const patch of [{ href: 'https://evil.test/' }, { body: 'secret raw log' }, { type: 'save-success' }, { severity: 'normal', type: 'security-notice' }, { updatedAt: '2026-02-31T08:00:00Z' }]) expect(() => validateAttention(attention(r, [{ ...inbox.data.items[0], ...patch }] as any), enabled('notes'), r, now)).toThrow();
    expect(() => validateAttention(attention(r, [inbox.data.items[0]!, { ...inbox.data.items[0]!, issueId: 'different' }]), enabled('notes'), r, now)).toThrow();
    expect(() => validateAttention(attention(r, [inbox.data.items[0]!, { ...inbox.data.items[0]!, dedupeKey: 'different' }]), enabled('notes'), r, now)).toThrow();
    expect(() => validateAttention(JSON.stringify({ ...JSON.parse(attention(r)), status: 'empty' }), enabled('notes'), r, now)).toThrow();
  });
  it('rejects byte/item excess, wrong request/account and future versions', () => {
    const r: AttentionRequest = { providerId: 'notes', operation: 'inbox', requestId: inbox.requestId, context: access('notes').context };
    expect(() => validateAttention('😀'.repeat(10000), enabled('notes'), r, now)).toThrow(/size/);
    expect(() => validateAttention(attention(r, Array(11).fill(inbox.data.items[0])), enabled('notes'), r, now)).toThrow();
    for (const patch of [{ requestId: 'wrong' }, { schemaVersion: 2 }, { context: { ...r.context, accountId: '22222222-2222-4222-8222-222222222222' } }]) expect(() => validateAttention(JSON.stringify({ ...JSON.parse(attention(r)), ...patch }), enabled('notes'), r, now)).toThrow();
  });
  it('revocation/new refresh makes every late response ineligible', () => {
    const store = new InboxStore([enabled('notes')], () => now); store.setAccess([access('notes')]); const old = store.begin('notes')!;
    store.setAccess(null); expect(store.accept(attention(old), old)).toBe(false); expect(store.snapshot().items).toEqual([]);
    store.setAccess([access('notes')]); const first = store.begin('notes')!, second = store.begin('notes')!;
    expect(store.accept(attention(first), first)).toBe(false); expect(store.accept(attention(second), { ...second, operation: 'search' } as any)).toBe(false); expect(store.accept(attention(second), second)).toBe(true);
    expect(store.accept(attention(second), second)).toBe(false);
  });
  it('suppresses expiry and unknown totals under partial coverage; empty requires successful reads', () => {
    let time = now; const store = new InboxStore(ids.map(enabled), () => time); store.setAccess(ids.map(access));
    const r = store.begin('notes')!; store.accept(attention(r), r); const failed = store.begin('library')!; store.fail(failed, 'offline');
    expect(store.snapshot()).toMatchObject({ knownUnread: 1, unreadCount: null, allSourcesResponded: false });
    time += 180000; expect(store.snapshot().items).toEqual([]); expect(store.snapshot().sources[0]!.status).toBe('stale');
    store.setAccess(ids.map(access)); for (const id of ids) { const request = store.begin(id)!; const f = JSON.parse(attention(request, [])); f.status = 'empty'; f.observedAt = new Date(time).toISOString(); f.expiresAt = new Date(time + 60000).toISOString(); store.accept(JSON.stringify(f), request); }
    expect(store.snapshot()).toMatchObject({ unreadCount: 0, allSourcesResponded: true });
  });
});
