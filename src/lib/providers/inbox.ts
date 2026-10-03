import { contextKey, validProviderContext, providerContextAllowed, validProviderTimestamp, validateProviderHeader, ProviderContractError } from './contract';
import type { ProviderAccess, ProviderContext, ProviderId, ProviderManifest, ProviderStatus } from './types';
export const ATTENTION_TYPES = ['sync-conflict', 'export-failed', 'device-approval', 'job-complete', 'reminder', 'security-notice'] as const;
export interface AttentionRequest { providerId: ProviderId; operation: 'inbox'; requestId: string; context: ProviderContext; }
export interface AttentionItem {
  issueId: string; dedupeKey: string; title: string; type: typeof ATTENTION_TYPES[number];
  severity: 'critical' | 'important' | 'normal'; state: 'open' | 'resolved'; attention: 'unread' | 'read' | 'dismissed';
  updatedAt: string; expiresAt: string | null; actionKey: 'open';
}
export interface AttentionEnvelope extends AttentionRequest {
  schemaVersion: 1; status: ProviderStatus; privacy: 'private'; coverage: string;
  observedAt: string; expiresAt: string; sourceUpdatedAt: string | null; data: { items: AttentionItem[] } | null;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const token = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,128}$/.test(value);
export function validateAttention(raw: string, manifest: ProviderManifest, request: AttentionRequest, now = Date.now()): AttentionEnvelope {
  if (typeof raw !== 'string' || raw.length > 32768 || new TextEncoder().encode(raw).byteLength > 32768) throw new ProviderContractError('size');
  let value: unknown; try { value = JSON.parse(raw); } catch { throw new ProviderContractError('schema'); }
  if (!object(value)) throw new ProviderContractError('schema');
  validateProviderHeader(value, manifest, request, now);
  if (!['ready', 'empty'].includes(String(value.status))) { if (value.data !== null) throw new ProviderContractError('schema'); }
  else {
    if (!object(value.data) || Object.keys(value.data).some(key => key !== 'items') || !Array.isArray(value.data.items) || value.data.items.length > 10) throw new ProviderContractError('schema');
    const issues = new Map<string, string>(), keys = new Map<string, string>();
    for (const item of value.data.items) {
      if (!object(item) || Object.keys(item).some(key => !['issueId', 'dedupeKey', 'title', 'type', 'severity', 'state', 'attention', 'updatedAt', 'expiresAt', 'actionKey'].includes(key))
        || !token(item.issueId) || !token(item.dedupeKey) || typeof item.title !== 'string' || !item.title.length || item.title.length > 160 || /[\u0000-\u001f\u007f]/.test(item.title)
        || !ATTENTION_TYPES.includes(item.type as AttentionItem['type']) || !['critical', 'important', 'normal'].includes(String(item.severity))
        || !['open', 'resolved'].includes(String(item.state)) || !['unread', 'read', 'dismissed'].includes(String(item.attention)) || item.actionKey !== 'open' || !manifest.actions.open
        || !validProviderTimestamp(item.updatedAt) || Date.parse(item.updatedAt) > Date.parse(value.observedAt as string) + 30000
        || (item.expiresAt !== null && (!validProviderTimestamp(item.expiresAt) || Date.parse(item.expiresAt) <= Date.parse(item.updatedAt)))
        || (item.type === 'security-notice' && item.severity === 'normal')) throw new ProviderContractError('schema');
      if (issues.has(item.dedupeKey) && issues.get(item.dedupeKey) !== item.issueId) throw new ProviderContractError('schema');
      if (keys.has(item.issueId) && keys.get(item.issueId) !== item.dedupeKey) throw new ProviderContractError('schema');
      issues.set(item.dedupeKey, item.issueId);
      keys.set(item.issueId, item.dedupeKey);
    }
    if ((value.status === 'empty' && value.data.items.length !== 0) || (value.status === 'ready' && value.data.items.length === 0)) throw new ProviderContractError('schema');
  }
  const envelope = value as unknown as AttentionEnvelope;
  return Date.parse(envelope.expiresAt) <= now && ['ready', 'empty'].includes(envelope.status) ? { ...envelope, status: 'stale', data: null } : envelope;
}
export interface InboxView {
  sources: { providerId: ProviderId; status: ProviderStatus | 'idle'; coverage: string }[];
  items: (AttentionItem & { providerId: ProviderId; href: string })[];
  knownUnread: number; unreadCount: number | null; allSourcesResponded: boolean;
}
// Passive contract store: a future certified bounded transport must call begin/accept/fail.
// This does not fetch, mutate owner state, acknowledge or dismiss an issue.
export class InboxStore {
  private access = new Map<ProviderId, ProviderAccess>();
  private pending = new Map<ProviderId, AttentionRequest>();
  private envelopes = new Map<ProviderId, AttentionEnvelope>();
  private states = new Map<ProviderId, ProviderStatus>();
  constructor(private readonly manifests: readonly ProviderManifest[], private readonly now = Date.now) {
    if (new Set(manifests.map(m => m.id)).size !== manifests.length || manifests.length > 6) throw new Error('Invalid Inbox providers');
  }
  setAccess(values: readonly ProviderAccess[] | null) {
    if (values && (new Set(values.map(v => v.providerId)).size !== values.length || values.some(v => !validProviderContext(v.context) || !Number.isFinite(v.expiresAt) || !Array.isArray(v.permissions)))) throw new Error('Invalid Inbox access');
    this.pending.clear(); this.envelopes.clear(); this.states.clear();
    this.access = new Map((values ?? []).map(value => [value.providerId, structuredClone(value)]));
  }
  clear() { this.setAccess(null); }
  private allowed(id: ProviderId) {
    const manifest = this.manifests.find(m => m.id === id), access = this.access.get(id);
    return !!manifest && manifest.privateReadsEnabled && manifest.operations.inbox && !!access && access.expiresAt > this.now() && providerContextAllowed(access.context, manifest) && access.permissions.includes(`${id}.hub.inbox.read`);
  }
  begin(id: ProviderId): AttentionRequest | null {
    this.pending.delete(id); this.envelopes.delete(id);
    const manifest = this.manifests.find(m => m.id === id);
    if (!manifest?.privateReadsEnabled || !manifest.operations.inbox) { this.states.set(id, 'unsupported'); return null; }
    if (!this.allowed(id)) { this.states.set(id, 'unconnected'); return null; }
    const request: AttentionRequest = { providerId: id, operation: 'inbox', requestId: crypto.randomUUID(), context: structuredClone(this.access.get(id)!.context) };
    this.pending.set(id, structuredClone(request)); this.states.delete(id); return request;
  }
  private current(request: AttentionRequest) {
    const pending = this.pending.get(request.providerId);
    return request.operation === 'inbox' && validProviderContext(request.context) && this.allowed(request.providerId) && !!pending && pending.requestId === request.requestId && contextKey(pending.context) === contextKey(request.context);
  }
  accept(raw: string, request: AttentionRequest): boolean {
    if (!this.current(request)) return false;
    this.pending.delete(request.providerId);
    try {
      const envelope = validateAttention(raw, this.manifests.find(m => m.id === request.providerId)!, request, this.now());
      this.envelopes.set(request.providerId, envelope); this.states.set(request.providerId, envelope.status); return true;
    } catch (error) { this.states.set(request.providerId, error instanceof ProviderContractError && error.code === 'version' ? 'unsupported' : 'error'); return false; }
  }
  fail(request: AttentionRequest, status: 'offline' | 'error') {
    if (!this.current(request)) return;
    this.pending.delete(request.providerId); this.envelopes.delete(request.providerId); this.states.set(request.providerId, status);
  }
  snapshot(): InboxView {
    const items: InboxView['items'] = [], sources: InboxView['sources'] = [];
    for (const manifest of this.manifests) {
      const envelope = this.envelopes.get(manifest.id);
      let status: ProviderStatus | 'idle' = !manifest.privateReadsEnabled || !manifest.operations.inbox ? 'unsupported' : !this.allowed(manifest.id) ? 'unconnected' : this.states.get(manifest.id) ?? 'idle';
      if (status === 'unconnected' || status === 'unsupported') { this.envelopes.delete(manifest.id); this.pending.delete(manifest.id); }
      if (envelope && ['ready', 'empty'].includes(status) && Date.parse(envelope.expiresAt) <= this.now()) { status = 'stale'; this.envelopes.set(manifest.id, { ...envelope, status: 'stale', data: null }); this.states.set(manifest.id, 'stale'); }
      sources.push({ providerId: manifest.id, status, coverage: manifest.coverage });
      if (status !== 'ready' || !envelope?.data) continue;
      const deduped = new Map<string, AttentionItem>();
      for (const item of envelope.data.items) {
        const old = deduped.get(item.dedupeKey);
        // Equal-time ambiguity favors hiding a resolved/dismissed item over reviving it.
        const hidden = (value: AttentionItem) => value.state === 'resolved' || value.attention === 'dismissed' ? 2 : value.attention === 'read' ? 1 : 0;
        if (!old || Date.parse(item.updatedAt) > Date.parse(old.updatedAt) || (Date.parse(item.updatedAt) === Date.parse(old.updatedAt) && hidden(item) > hidden(old))) deduped.set(item.dedupeKey, item);
      }
      for (const item of deduped.values()) if (item.state === 'open' && item.attention !== 'dismissed' && (!item.expiresAt || Date.parse(item.expiresAt) > this.now())) items.push({ ...structuredClone(item), providerId: manifest.id, href: manifest.actions.open! });
    }
    const priority = { critical: 0, important: 1, normal: 2 };
    items.sort((a, b) => priority[a.severity] - priority[b.severity] || Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.providerId.localeCompare(b.providerId) || a.dedupeKey.localeCompare(b.dedupeKey));
    const knownUnread = items.filter(item => item.attention === 'unread').length;
    const allSourcesResponded = sources.length > 0 && sources.every(source => ['ready', 'empty'].includes(source.status));
    return { sources, items, knownUnread, unreadCount: allSourcesResponded ? knownUnread : null, allSourcesResponded };
  }
}
