import { afterEach, describe, expect, it, vi } from 'vitest';
import { InboxRuntime, type InboxAdapter, type AttentionActionRequest } from '../../src/lib/providers/inbox-runtime';
import type { AttentionRequest } from '../../src/lib/providers/inbox';
import { providerManifest } from '../../src/lib/providers/registry';
import type { ProviderAccess } from '../../src/lib/providers/types';
import fixture from '../../contracts/fixtures/inbox.json';
const now = Date.parse('2026-10-01T08:00:01Z');
const manifest = () => ({ ...structuredClone(providerManifest('notes')), privateReadsEnabled: true, inlineWritesEnabled: true, operations: { ...providerManifest('notes').operations, inbox: true } });
const access = (): ProviderAccess => ({ providerId: 'notes', context: fixture.context as ProviderAccess['context'], permissions: ['notes.hub.inbox.read', 'notes.hub.inbox.attention.write'], expiresAt: now + 300000 });
const raw = (r: AttentionRequest, attention = 'unread', patch = {}) => JSON.stringify({ ...structuredClone(fixture), ...r, operation: 'inbox', data: { items: [{ ...fixture.data.items[0], attention, ...patch }] } });
// The wire response cannot echo command fields (action/issueId/expectedUpdatedAt).
const reply = (r: AttentionActionRequest, patch = {}) => raw({ providerId: r.providerId, operation: 'inbox', requestId: r.requestId, context: r.context }, r.action === 'dismiss' ? 'dismissed' : 'read', patch);
const adapter = (overrides: Partial<InboxAdapter> = {}): InboxAdapter => ({ manifest: manifest(), read: async r => raw(r), acknowledge: async r => reply(r), ...overrides });
afterEach(() => vi.useRealTimers());
describe('H17 Inbox coordination', () => {
  it('never calls a disabled provider or treats unavailable coverage as zero unread', async () => {
    const read = vi.fn(); const runtime = new InboxRuntime([adapter({ manifest: providerManifest('notes'), read })], () => now);
    runtime.setAccess([access()]); await runtime.refresh(() => {});
    expect(read).not.toHaveBeenCalled(); expect(runtime.snapshot()).toMatchObject({ unreadCount: null, items: [] });
  });
  it('requires read permission independently of action permission', async () => {
    const read = vi.fn(); const runtime = new InboxRuntime([adapter({ read })], () => now);
    runtime.setAccess([{ ...access(), permissions: ['notes.hub.inbox.attention.write'] }]); await runtime.refresh(() => {});
    expect(read).not.toHaveBeenCalled(); expect(runtime.canAcknowledge('notes')).toBe(false);
  });
  it('times out a source that ignores cancellation and settles the refresh', async () => {
    vi.useFakeTimers(); const runtime = new InboxRuntime([adapter({ read: () => new Promise(() => {}) })], () => now);
    runtime.setAccess([access()]); const work = runtime.refresh(() => {}); await vi.advanceTimersByTimeAsync(2001); await work;
    expect(runtime.snapshot().sources[0]!.status).toBe('offline'); expect(runtime.snapshot().unreadCount).toBeNull();
  });
  it('aborts revocation and suppresses late reply and render', async () => {
    let finish!: (s: string) => void; let request!: AttentionRequest; let signal!: AbortSignal;
    const runtime = new InboxRuntime([adapter({ read: (r, s) => { request = r; signal = s; return new Promise(resolve => { finish = resolve; }); } })], () => now);
    runtime.setAccess([access()]); const emit = vi.fn(); const work = runtime.refresh(emit); runtime.clear(); finish(raw(request)); await work;
    expect(signal.aborted).toBe(true); expect(emit).not.toHaveBeenCalled(); expect(runtime.snapshot().items).toEqual([]);
  });
  it('requires an independent write grant and owner write enablement', async () => {
    const acknowledge = vi.fn(); const runtime = new InboxRuntime([adapter({ acknowledge })], () => now);
    runtime.setAccess([{ ...access(), permissions: ['notes.hub.inbox.read'] }]); await runtime.refresh(() => {});
    expect(await runtime.acknowledge('notes', 'issue-example', 'dismiss', () => {})).toBe('unavailable'); expect(acknowledge).not.toHaveBeenCalled();
    const other = new InboxRuntime([adapter({ manifest: { ...manifest(), inlineWritesEnabled: false }, acknowledge })], () => now);
    other.setAccess([access()]); await other.refresh(() => {}); expect(other.canAcknowledge('notes')).toBe(false);
  });
  it('sends compare-and-set context, applies an explicit owner confirmation and leaves issue open', async () => {
    const acknowledge = vi.fn(async (r: AttentionActionRequest) => reply(r)); const runtime = new InboxRuntime([adapter({ acknowledge })], () => now);
    runtime.setAccess([access()]); await runtime.refresh(() => {});
    expect(await runtime.acknowledge('notes', 'issue-example', 'mark-read', () => {})).toBe('applied');
    expect(acknowledge.mock.calls[0]![0]).toMatchObject({ issueId: 'issue-example', action: 'mark-read', expectedUpdatedAt: fixture.data.items[0]!.updatedAt, context: access().context });
    expect(runtime.snapshot()).toMatchObject({ unreadCount: 0, items: [{ attention: 'read', state: 'open' }] });
  });
  it('requires a dismissal tombstone before hiding the issue', async () => {
    const runtime = new InboxRuntime([adapter()], () => now); runtime.setAccess([access()]); await runtime.refresh(() => {});
    expect(await runtime.acknowledge('notes', 'issue-example', 'dismiss', () => {})).toBe('applied'); expect(runtime.snapshot()).toMatchObject({ unreadCount: 0, items: [] });
  });
  it.each([{ state: 'resolved' }, { dedupeKey: 'other' }, { updatedAt: '2026-09-30T00:00:00.000Z' }, { attention: 'unread' }])('rejects an owner confirmation with unexpected issue semantics %j', async patch => {
    const runtime = new InboxRuntime([adapter({ acknowledge: async r => reply(r, patch) })], () => now); runtime.setAccess([access()]); await runtime.refresh(() => {});
    expect(await runtime.acknowledge('notes', 'issue-example', 'mark-read', () => {})).toBe('uncertain'); expect(runtime.snapshot()).toMatchObject({ unreadCount: null, items: [] });
  });
  it('rejects missing confirmation, oversize and wrong request binding', async () => {
    for (const acknowledge of [async (r: AttentionActionRequest) => JSON.stringify({ ...JSON.parse(reply(r)), status: 'empty', data: { items: [] } }), async () => 'x'.repeat(32769), async (r: AttentionActionRequest) => reply({ ...r, requestId: 'wrong' })]) {
      const runtime = new InboxRuntime([adapter({ acknowledge })], () => now); runtime.setAccess([access()]); await runtime.refresh(() => {});
      expect(await runtime.acknowledge('notes', 'issue-example', 'dismiss', () => {})).toBe('uncertain'); expect(runtime.snapshot().items).toEqual([]);
    }
  });
  it('does not retry an uncertain write and ignores a second click', async () => {
    vi.useFakeTimers(); const acknowledge = vi.fn(() => new Promise<string>(() => {})); const runtime = new InboxRuntime([adapter({ acknowledge })], () => now);
    runtime.setAccess([access()]); await runtime.refresh(() => {}); const work = runtime.acknowledge('notes', 'issue-example', 'dismiss', () => {});
    expect(await runtime.acknowledge('notes', 'issue-example', 'dismiss', () => {})).toBe('unavailable'); await vi.advanceTimersByTimeAsync(2001); expect(await work).toBe('uncertain'); expect(acknowledge).toHaveBeenCalledTimes(1);
    await runtime.refresh(() => {}); expect(runtime.snapshot().items).toHaveLength(1); expect(acknowledge).toHaveBeenCalledTimes(1);
  });
  it('prevents a late action success from rendering after identity changes', async () => {
    let finish!: (s: string) => void; let command!: AttentionActionRequest;
    const runtime = new InboxRuntime([adapter({ acknowledge: r => { command = r; return new Promise(resolve => { finish = resolve; }); } })], () => now);
    runtime.setAccess([access()]); await runtime.refresh(() => {}); const emit = vi.fn(); const work = runtime.acknowledge('notes', 'issue-example', 'dismiss', emit);
    runtime.clear(); emit.mockClear(); finish(reply(command)); expect(await work).toBe('unavailable'); expect(emit).not.toHaveBeenCalled(); expect(runtime.snapshot().items).toEqual([]);
  });
  it('expires access before accepting action success', async () => {
    let time = now; const runtime = new InboxRuntime([adapter({ acknowledge: async r => { time += 300001; return reply(r); } })], () => time);
    runtime.setAccess([access()]); await runtime.refresh(() => {}); expect(await runtime.acknowledge('notes', 'issue-example', 'dismiss', () => {})).toBe('unavailable'); expect(runtime.snapshot().items).toEqual([]);
  });
});
