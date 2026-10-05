import { contextKey } from './contract';
import { InboxStore, validateAttention, type AttentionEnvelope, type AttentionRequest, type InboxView } from './inbox';
import { PROVIDER_BUDGETS } from './registry';
import type { ProviderAccess, ProviderId, ProviderManifest } from './types';

export type AttentionAction = 'mark-read' | 'dismiss';
export interface AttentionActionRequest extends AttentionRequest {
  action: AttentionAction;
  issueId: string;
  expectedUpdatedAt: string;
}
/** Each owner enforces the purpose, context/revision and expectedUpdatedAt.
 * Action requestId is the idempotency key. Writes are never retried automatically.
 * The response is a fresh Inbox envelope bound to the same request/context.
 */
export interface InboxAdapter {
  manifest: ProviderManifest;
  read(request: AttentionRequest, signal: AbortSignal): Promise<string>;
  acknowledge?(request: AttentionActionRequest, signal: AbortSignal): Promise<string>;
}
export type ActionResult = 'applied' | 'unavailable' | 'uncertain';

/** RAM-only coordinator. UI masking, revocation and identity boundaries call clear(). */
export class InboxRuntime {
  private store: InboxStore;
  private access: ProviderAccess[] = [];
  private epoch = 0;
  private flights = new Map<ProviderId, AbortController>();
  constructor(private adapters: readonly InboxAdapter[], private now = Date.now) {
    this.adapters = adapters.map(a => ({ ...a, manifest: structuredClone(a.manifest) }));
    this.store = new InboxStore(this.adapters.map(a => a.manifest), now);
  }
  setAccess(values: readonly ProviderAccess[] | null) {
    // Validate before replacing the active authorization snapshot.
    this.store.setAccess(values);
    ++this.epoch;
    for (const c of this.flights.values()) c.abort();
    this.flights.clear();
    this.access = structuredClone(values ? [...values] : []);
  }
  clear() { this.setAccess(null); }
  snapshot(): InboxView { return this.store.snapshot(); }
  nextExpiry(): number | null { return this.store.nextExpiry(); }
  canAcknowledge(id: ProviderId): boolean {
    const a = this.adapters.find(a => a.manifest.id === id), access = this.access.find(a => a.providerId === id);
    return !!a?.acknowledge && a.manifest.inlineWritesEnabled && a.manifest.privateReadsEnabled && a.manifest.operations.inbox
      && !!access && access.expiresAt > this.now() && access.permissions.includes(`${id}.hub.inbox.read`)
      && access.permissions.includes(`${id}.hub.inbox.attention.write`)
      && this.snapshot().sources.some(s => s.providerId === id && s.status === 'ready');
  }
  private async bounded(id: ProviderId, task: (signal: AbortSignal) => Promise<string>): Promise<string> {
    const c = new AbortController(); this.flights.get(id)?.abort(); this.flights.set(id, c);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let detach = () => {};
    try {
      const cancelled = new Promise<never>((_, reject) => {
        const abort = () => reject(new Error('Unavailable'));
        c.signal.addEventListener('abort', abort, { once: true });
        detach = () => c.signal.removeEventListener('abort', abort);
      });
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { reject(new Error('Unavailable')); c.abort(); }, PROVIDER_BUDGETS.deadlineMs);
      });
      return await Promise.race([task(c.signal), cancelled, deadline]);
    } finally {
      clearTimeout(timer); detach(); c.abort();
      if (this.flights.get(id) === c) this.flights.delete(id);
    }
  }
  async refresh(emit: (view: InboxView) => void): Promise<void> {
    this.setAccess(this.access);
    const epoch = this.epoch;
    let cursor = 0;
    const worker = async () => {
      while (cursor < this.adapters.length && epoch === this.epoch) {
        const a = this.adapters[cursor++]!;
        const request = this.store.begin(a.manifest.id);
        if (request) {
          try {
            const raw = await this.bounded(a.manifest.id, signal => a.read(structuredClone(request), signal));
            if (epoch !== this.epoch) return;
            this.store.accept(raw, request);
          } catch {
            if (epoch !== this.epoch) return;
            this.store.fail(request, 'offline');
          }
        }
        if (epoch === this.epoch) emit(this.snapshot());
      }
    };
    await Promise.all(Array.from({ length: Math.min(PROVIDER_BUDGETS.concurrency, this.adapters.length) }, worker));
  }
  async acknowledge(id: ProviderId, issueId: string, action: AttentionAction, emit: (view: InboxView) => void): Promise<ActionResult> {
    if (!['mark-read', 'dismiss'].includes(action) || !this.canAcknowledge(id) || this.flights.has(id)) return 'unavailable';
    const item = this.snapshot().items.find(i => i.providerId === id && i.issueId === issueId);
    const access = this.access.find(a => a.providerId === id)!;
    const adapter = this.adapters.find(a => a.manifest.id === id)!;
    if (!item || action === 'mark-read' && item.attention === 'read') return 'unavailable';
    const epoch = this.epoch;
    const request = this.store.begin(id)!;
    const command: AttentionActionRequest = { ...request, action, issueId, expectedUpdatedAt: item.updatedAt };
    // Remove the old snapshot before a write. A timeout may have applied at the owner;
    // no optimistic success, replay or restoration of stale attention is permitted.
    emit(this.snapshot());
    try {
      const raw = await this.bounded(id, signal => adapter.acknowledge!(structuredClone(command), signal));
      if (epoch !== this.epoch || this.now() >= access.expiresAt || contextKey(access.context) !== contextKey(request.context)) return 'unavailable';
      const envelope: AttentionEnvelope = validateAttention(raw, adapter.manifest, request, this.now());
      if (!['ready', 'empty'].includes(envelope.status)) throw new Error('Unavailable');
      const rows = envelope.data!.items.filter(i => i.issueId === issueId);
      // Require explicit owner confirmation, including a tombstone for dismissal.
      const expected = action === 'mark-read' ? 'read' : 'dismissed';
      if (!rows.length || rows.some(i => i.attention !== expected || i.state !== item.state || i.dedupeKey !== item.dedupeKey || Date.parse(i.updatedAt) < Date.parse(item.updatedAt))) throw new Error('Unavailable');
      if (!this.store.accept(raw, request)) throw new Error('Unavailable');
      emit(this.snapshot());
      return 'applied';
    } catch {
      if (epoch !== this.epoch) return 'unavailable';
      this.store.fail(request, 'error'); emit(this.snapshot()); return 'uncertain';
    }
  }
}
