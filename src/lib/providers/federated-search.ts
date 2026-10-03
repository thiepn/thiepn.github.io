import { ProviderRunner } from './runtime';
import type { ContinueItem, ProviderAccess, ProviderAdapter, ProviderId, ProviderStatus } from './types';
export interface SearchGroup { providerId: ProviderId; status: ProviderStatus | 'idle'; items: ContinueItem[]; coverage: string; }
export interface FederatedSearchView { groups: SearchGroup[]; knownResults: number; respondingSources: number; requestedSources: number; allSourcesResponded: boolean; }
// Owner transports are deliberately not instantiated by the current Search UI.
export class FederatedSearch {
  private runner: ProviderRunner;
  private generation = 0;
  private access: readonly ProviderAccess[] = [];
  private states = new Map<ProviderId, ProviderStatus>();
  constructor(private readonly adapters: readonly ProviderAdapter[], private readonly now = Date.now) { this.runner = new ProviderRunner(adapters, now); }
  setAccess(access: readonly ProviderAccess[] | null) {
    this.runner.setAccess(access); this.access = structuredClone(access ?? []); ++this.generation; this.states.clear();
  }
  cancel() { this.setAccess(this.access); }
  clear() { this.setAccess(null); }
  snapshot(): FederatedSearchView {
    const results = this.runner.snapshot();
    const groups = this.adapters.map(adapter => {
      const result = results.find(result => result.providerId === adapter.manifest.id && result.envelope?.operation === 'search');
      return { providerId: adapter.manifest.id, coverage: adapter.manifest.coverage, status: result?.status ?? this.states.get(adapter.manifest.id) ?? 'idle', items: result?.status === 'ready' ? structuredClone(result.envelope!.data!.items) : [] } as SearchGroup;
    });
    // Expired grants have no visible result or success status, even without a new query.
    for (const group of groups) if (!this.access.some(access => access.providerId === group.providerId && access.expiresAt > this.now()) && ['ready', 'empty'].includes(group.status)) { group.status = 'unconnected'; group.items = []; }
    const respondingSources = groups.filter(group => ['ready', 'empty'].includes(group.status)).length;
    return { groups, knownResults: groups.reduce((sum, group) => sum + group.items.length, 0), respondingSources, requestedSources: groups.length, allSourcesResponded: groups.length > 0 && respondingSources === groups.length };
  }
  async search(query: string, emit: (view: FederatedSearchView) => void) {
    this.cancel();
    if (typeof query !== 'string' || query.length > 256 || /[\u0000-\u001f\u007f]/.test(query)) throw new Error('Invalid private query');
    const generation = this.generation;
    if (!query.trim()) { emit(this.snapshot()); return; }
    await this.runner.run(this.adapters.map(adapter => ({ providerId: adapter.manifest.id, operation: 'search' as const, query: query.trim() })), result => {
      if (generation !== this.generation) return;
      this.states.set(result.providerId, result.status); emit(this.snapshot());
    });
  }
}
