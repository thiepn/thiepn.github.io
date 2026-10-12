import { contextKey, requestKey, validProviderContext, providerContextAllowed, validateProviderEnvelope, ProviderContractError } from './contract';
import { PROVIDER_BUDGETS } from './registry';
import type { Operation, ProviderAccess, ProviderAdapter, ProviderId, ProviderResult, RequestContext } from './types';

export class ProviderRunner {
  private epoch = 0;
  private access = new Map<ProviderId, ProviderAccess>();
  private controllers = new Set<AbortController>();
  private results = new Map<string, ProviderResult>();
  constructor(private readonly adapters: readonly ProviderAdapter[], private readonly now = Date.now) {
    if (new Set(adapters.map(adapter => adapter.manifest.id)).size !== adapters.length) throw new Error('Duplicate provider adapter');
  }
  setAccess(access: readonly ProviderAccess[] | null) {
    if (access && (new Set(access.map(value => value.providerId)).size !== access.length || access.some(value => !validProviderContext(value.context) || !Number.isFinite(value.expiresAt) || !Array.isArray(value.permissions)))) throw new Error('Invalid access context');
    ++this.epoch;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear(); this.results.clear();
    this.access = new Map((access ?? []).map(value => [value.providerId,structuredClone(value)]));
  }
  clear() { this.setAccess(null); }
  snapshot(): readonly ProviderResult[] {
    const snapshot: ProviderResult[] = [];
    for (const [key,result] of this.results) {
      const access = this.access.get(result.providerId);
      if (!access || access.expiresAt <= this.now()) { this.results.delete(key); continue; }
      const value = structuredClone(result);
      if (value.envelope && ['ready','empty'].includes(value.status) && Date.parse(value.envelope.expiresAt) <= this.now()) { value.status = 'stale'; value.envelope.status = 'stale'; value.envelope.data = null; this.results.set(key, structuredClone(value)); }
      snapshot.push(value);
    }
    return snapshot;
  }
  async run(visible: readonly { providerId: ProviderId; operation: Operation; query?: string }[], emit: (result: ProviderResult) => void): Promise<void> {
    // Starting a new visible set also cancels hidden contributions and old queries.
    const accesses = [...this.access.values()];
    this.setAccess(accesses);
    const epoch = this.epoch;
    const requests = [...new Map(visible.map(item => [JSON.stringify([item.providerId,item.operation]),item])).values()];
    if (requests.some(item => item.query !== undefined && (item.operation !== 'search' || typeof item.query !== 'string' || item.query.length > 256 || /[\u0000-\u001f\u007f]/.test(item.query)))) throw new Error('Invalid private search query');
    if (requests.length > PROVIDER_BUDGETS.visible) throw new Error('Visible contribution budget exceeded');
    let cursor = 0;
    const worker = async () => {
      while (cursor < requests.length && epoch === this.epoch) {
        const item = requests[cursor++]!;
        const adapter = this.adapters.find(value => value.manifest.id === item.providerId);
        if (!adapter) { emit({ providerId:item.providerId, operation:item.operation, status:'unsupported' }); continue; }
        const access = this.access.get(item.providerId);
        let result: ProviderResult;
        const allowed = adapter.manifest.privateReadsEnabled && adapter.manifest.operations[item.operation];
        if (!allowed) result = { providerId:item.providerId, operation:item.operation, status:'unsupported' };
        else if (!access || access.expiresAt <= this.now() || !providerContextAllowed(access.context, adapter.manifest) || !access.permissions.includes(adapter.manifest.requiredPermissions[item.operation])) result = { providerId:item.providerId, operation:item.operation, status:'unconnected' };
        else {
          const controller = new AbortController(); this.controllers.add(controller);
          const request: RequestContext = { ...item, requestId:crypto.randomUUID(), context:structuredClone(access.context) };
          let timer: ReturnType<typeof setTimeout> | undefined;
          let detach = () => {};
          try {
            const cancelled = new Promise<never>((_,reject) => {
              const abort = () => reject(new Error('aborted'));
              controller.signal.addEventListener('abort',abort,{once:true});
              detach = () => controller.signal.removeEventListener('abort',abort);
            });
            const deadline = new Promise<never>((_,reject) => { timer = setTimeout(() => { reject(new Error('deadline')); controller.abort(); }, PROVIDER_BUDGETS.deadlineMs); });
            const raw = await Promise.race([adapter.read(request,controller.signal),deadline,cancelled]);
            const envelope = validateProviderEnvelope(raw,adapter.manifest,request,this.now());
            result = { providerId:item.providerId, operation:item.operation, status:envelope.status, envelope };
            if (epoch === this.epoch && access.expiresAt > this.now()) this.results.set(requestKey(request),structuredClone(result));
          } catch (error) {
            result = { providerId:item.providerId, operation:item.operation, status:error instanceof ProviderContractError && error.code === 'version' ? 'unsupported' : controller.signal.aborted ? 'offline' : 'error' };
          } finally { clearTimeout(timer); detach(); this.controllers.delete(controller); }
        }
        // A grant/account/consent change makes every late response ineligible.
        if (epoch !== this.epoch) return;
        if (access && (access.expiresAt <= this.now() || !this.access.has(item.providerId) || contextKey(access.context) !== contextKey(this.access.get(item.providerId)!.context))) { this.clear(); return; }
        emit(result);
      }
    };
    await Promise.all(Array.from({length:Math.min(PROVIDER_BUDGETS.concurrency,requests.length)},worker));
  }
}

export async function readBoundedJson(response: Response, maxBytes: number, signal: AbortSignal): Promise<string> {
  if (!response.ok || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '') || !response.body || !Number.isInteger(maxBytes) || maxBytes < 1) throw new Error('Invalid provider response');
  const length = response.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) { await response.body.cancel().catch(() => {}); throw new ProviderContractError('size'); }
  const reader = response.body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort',abort,{once:true});
  let total = 0; const parts: Uint8Array[] = [];
  try {
    while (true) {
      if (signal.aborted) throw new Error('aborted');
      const {done,value} = await reader.read();
      if (signal.aborted) throw new Error('aborted');
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new ProviderContractError('size');
      parts.push(value);
    }
    const joined = new Uint8Array(total); let offset = 0;
    for (const part of parts) { joined.set(part,offset); offset += part.byteLength; }
    return new TextDecoder('utf-8',{fatal:true}).decode(joined);
  } finally { signal.removeEventListener('abort',abort); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
