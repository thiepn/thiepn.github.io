import { ProviderRunner } from '../providers/runtime';
import { providerContextAllowed } from '../providers/contract';
import type { Operation, ProviderAccess, ProviderAdapter, ProviderId, ProviderResult } from '../providers/types';
import { buildPrismProviderHomeView, type PrismProviderHomeView } from './provider-home-view';

export interface PrismVisibleProviderOperation {
  providerId: ProviderId;
  operation: Exclude<Operation, 'search'>;
}

type ViewListener = (view: PrismProviderHomeView, results: readonly ProviderResult[]) => void;

const key = (providerId: ProviderId, operation: Operation) => `${providerId}:${operation}`;

export class PrismProviderCoordinator {
  #connections = new Map<ProviderId, { adapter: ProviderAdapter; access: ProviderAccess }>();
  #results = new Map<string, ProviderResult>();
  #runner: ProviderRunner | null = null;
  #generation = 0;

  constructor(private readonly now = Date.now) {}

  setConnection(adapter: ProviderAdapter, access: ProviderAccess): void {
    if (adapter.manifest.id !== access.providerId) throw new Error('Provider adapter/access mismatch');
    if (!providerContextAllowed(access.context, adapter.manifest) ||
        !Number.isFinite(access.expiresAt) ||
        !Array.isArray(access.permissions) ||
        access.permissions.some(permission => typeof permission !== 'string')) {
      throw new Error('Invalid provider authority');
    }
    // A Home can combine Notes and TMS60 only for the same signed-in owner.
    // A new owner invalidates *every* existing private snapshot and device
    // contribution before any new adapter can be attached. No cross-owner UI
    // frame may contain results from both sessions.
    if (access.context.scope === 'account') {
      const owner = access.context.accountId.toLowerCase();
      const previousOwner = [...this.#connections.values()].find(connection =>
        connection.access.context.scope === 'account',
      )?.access.context;
      if (previousOwner?.scope === 'account' && previousOwner.accountId.toLowerCase() !== owner) {
        this.clear();
      }
    }
    this.#connections.set(access.providerId, {
      adapter,
      access: structuredClone(access),
    });
    this.#results.delete(key(access.providerId, 'summary'));
    this.#results.delete(key(access.providerId, 'continue'));
    this.#rebuild();
  }

  removeConnection(providerId: ProviderId): void {
    this.#connections.delete(providerId);
    this.#results.delete(key(providerId, 'summary'));
    this.#results.delete(key(providerId, 'continue'));
    this.#rebuild();
  }

  clear(): void {
    this.#connections.clear();
    this.#results.clear();
    this.#runner?.clear();
    this.#runner = null;
    ++this.#generation;
  }

  connectedProviders(): readonly ProviderId[] {
    return [...this.#connections.keys()];
  }

  snapshotResults(): readonly ProviderResult[] {
    let expired = false;
    for (const [providerId, connection] of this.#connections) {
      if (connection.access.expiresAt > this.now()) continue;
      this.#connections.delete(providerId);
      this.#results.delete(key(providerId, 'summary'));
      this.#results.delete(key(providerId, 'continue'));
      expired = true;
    }
    if (expired) this.#rebuild();
    for (const result of this.#runner?.snapshot() ?? []) {
      const resultKey = key(result.providerId, result.operation);
      if (this.#results.has(resultKey)) this.#results.set(resultKey, structuredClone(result));
    }
    // A different provider's reconnect rebuilds the runner, but retained
    // snapshots still have their own deadline and must lose private data.
    for (const result of this.#results.values()) {
      if (result.envelope && ['ready', 'empty'].includes(result.status) && Date.parse(result.envelope.expiresAt) <= this.now()) {
        result.status = 'stale';
        result.envelope.status = 'stale';
        result.envelope.data = null;
      }
    }
    return [...this.#results.values()].map((result) => structuredClone(result));
  }

  snapshotView(): PrismProviderHomeView {
    return buildPrismProviderHomeView(this.snapshotResults());
  }

  async refresh(
    visible: readonly PrismVisibleProviderOperation[],
    emit: ViewListener,
  ): Promise<void> {
    const allowed = visible.filter((item) => this.#connections.has(item.providerId));
    const visibleKeys = new Set(allowed.map((item) => key(item.providerId, item.operation)));
    for (const resultKey of [...this.#results.keys()]) {
      if (!visibleKeys.has(resultKey)) this.#results.delete(resultKey);
    }
    // Publish removals before a visible provider's asynchronous read completes.
    emit(this.snapshotView(), this.snapshotResults());

    const runner = this.#runner;
    if (!runner || allowed.length === 0) {
      if (runner) await runner.run([], () => {});
      emit(this.snapshotView(), this.snapshotResults());
      return;
    }

    const generation = this.#generation;
    await runner.run(allowed, (result) => {
      if (generation !== this.#generation) return;
      this.#results.set(key(result.providerId, result.operation), structuredClone(result));
      emit(this.snapshotView(), this.snapshotResults());
    });

    if (generation !== this.#generation) return;
    for (const result of runner.snapshot()) {
      const resultKey = key(result.providerId, result.operation);
      if (visibleKeys.has(resultKey)) this.#results.set(resultKey, structuredClone(result));
    }
    emit(this.snapshotView(), this.snapshotResults());
  }

  #rebuild(): void {
    this.#runner?.clear();
    ++this.#generation;
    const values = [...this.#connections.values()];
    if (values.length === 0) {
      this.#runner = null;
      return;
    }
    this.#runner = new ProviderRunner(values.map((value) => value.adapter), this.now);
    this.#runner.setAccess(values.map((value) => value.access));
  }
}
