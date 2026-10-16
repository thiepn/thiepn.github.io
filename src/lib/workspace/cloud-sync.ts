import { parseState } from './model';
import { cloudState, localState, meaningfulState, mergeStates, sameState } from './sync-merge';
import { clone, uid, type WorkspaceState } from './types';
import type { WorkspaceStore } from './store';

export interface CloudHead { owner: string; revision: number; state: WorkspaceState | null }
export interface CloudMutation { id: string; base: number; state: WorkspaceState }
export interface CloudJournal {
  version: 1; owner: string; device: string;
  baseline: { revision: number; state: WorkspaceState } | null;
  pending: CloudMutation | null;
  recovery: { local: WorkspaceState; remote: WorkspaceState; revision: number; conflicts: string[] } | null;
}
export interface CloudTransport {
  read(signal: AbortSignal): Promise<CloudHead>;
  push(mutation: CloudMutation, device: string, signal: AbortSignal): Promise<{ owner: string; status: 'applied' | 'conflict'; revision: number }>;
}
export interface CloudSyncOptions {
  owner: string; store: WorkspaceStore; transport: CloudTransport;
  canApply(): boolean;
  changed(): Promise<void>;
  status(message: string, recovery?: boolean): void;
  lock?: (work: () => Promise<void>) => Promise<void>;
}
export function parseCloudHead(value: unknown, owner: string): CloudHead {
  const v = value as CloudHead;
  if (!v || v.owner !== owner || !Number.isSafeInteger(v.revision) || v.revision < 0 || (v.revision === 0) !== (v.state === null)) throw new Error('Invalid account sync response.');
  return { owner, revision: v.revision, state: v.state === null ? null : parseState(JSON.stringify(v.state)) };
}
function journal(value: unknown, owner: string): CloudJournal {
  if (value === null) return { version: 1, owner, device: uid(), baseline: null, pending: null, recovery: null };
  const v = value as CloudJournal;
  if (!v || v.version !== 1 || v.owner !== owner || typeof v.device !== 'string' || !/^[a-f0-9-]{36}$/i.test(v.device)) throw new Error('The saved sync journal needs recovery; it has been left untouched.');
  if (v.baseline) { parseState(JSON.stringify(v.baseline.state)); if (!Number.isSafeInteger(v.baseline.revision) || v.baseline.revision < 1) throw new Error('Invalid sync baseline.'); }
  if (v.pending) { parseState(JSON.stringify(v.pending.state)); if (!/^[a-f0-9-]{36}$/i.test(v.pending.id) || !Number.isSafeInteger(v.pending.base) || v.pending.base < 0) throw new Error('Invalid pending sync.'); }
  if (v.recovery) { parseState(JSON.stringify(v.recovery.local)); parseState(JSON.stringify(v.recovery.remote)); }
  return clone(v);
}

export class WorkspaceCloudSync {
  private controller = new AbortController();
  private flight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  constructor(private readonly options: CloudSyncOptions) {
    if (options.store.key !== 'user:' + options.owner.toLowerCase()) throw new Error('Account sync requires an owner-scoped store.');
  }
  stop() { this.stopped = true; this.controller.abort(); clearTimeout(this.timer); }
  schedule(delay = 700) {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, delay);
  }
  async flush(): Promise<void> {
    if (this.stopped) return;
    if (this.flight) { await this.flight; if (!this.stopped) this.schedule(); return; }
    const run = async () => {
      if (this.stopped) return;
      try { await this.reconcile(); }
      catch (error) { if (!this.stopped) this.options.status(error instanceof Error ? error.message : 'Waiting to sync'); }
    };
    const lock = this.options.lock ?? (async (work: () => Promise<void>) => {
      if (!navigator.locks) throw new Error('Saved on this device · automatic sync needs browser storage coordination.');
      await navigator.locks.request('thiepn-hub-sync:' + this.options.owner, { ifAvailable: true }, async lease => { if (lease) await work(); });
    });
    this.flight = lock(run).catch(error => { if (!this.stopped) this.options.status(error instanceof Error ? error.message : 'Sync unavailable'); }).finally(() => { this.flight = null; });
    await this.flight;
  }
  private async save(value: CloudJournal) {
    if (this.stopped) return;
    await this.options.store.syncJournal(value);
  }
  private async reconcile() {
    const { store, transport, owner, status } = this.options;
    const meta = journal(await store.syncJournal(), owner);
    if (this.stopped) return;
    if (meta.recovery) { status('Sync needs review · both versions are saved', true); return; }
    let local = await store.load();
    if (!local || this.stopped) return;
    status('Syncing…');
    if (meta.pending) {
      const result = await transport.push(meta.pending, meta.device, this.controller.signal);
      if (this.stopped) return;
      if (result.owner !== owner || !Number.isSafeInteger(result.revision) || result.revision < 1) throw new Error('Invalid account sync receipt.');
      if (result.status === 'applied') meta.baseline = { revision: result.revision, state: meta.pending.state };
      // Only an explicit applied/conflict reply resolves an immutable pending command.
      else if (result.status !== 'conflict') throw new Error('Sync receipt could not be verified.');
      meta.pending = null;
      await this.save(meta);
      if (this.stopped) return;
    }
    const head = parseCloudHead(await transport.read(this.controller.signal), owner);
    if (this.stopped) return;
    local = await store.load();
    if (!local || this.stopped) return;
    let candidate = cloudState(local);
    if (head.state) {
      if (meta.baseline && head.revision < meta.baseline.revision) throw new Error('Cloud history moved backwards. Your local copy is preserved.');
      if (!meta.baseline) {
        if (sameState(local, head.state)) candidate = head.state;
        else if (!meaningfulState(local)) candidate = head.state;
        else { meta.recovery = { local, remote: head.state, revision: head.revision, conflicts: ['This device and your account both have workspace data.'] }; await this.save(meta); status('Sync needs review · both versions are saved', true); return; }
      } else {
        const merged = mergeStates(meta.baseline.state, local, head.state);
        if (!merged.state) { meta.recovery = { local, remote: head.state, revision: head.revision, conflicts: merged.conflicts }; await this.save(meta); status('Sync needs review · both versions are saved', true); return; }
        candidate = merged.state;
      }
      if (!sameState(candidate, local)) {
        if (!this.options.canApply()) { status('Cloud changes ready · finish your current edit to sync'); return; }
        await store.save(localState(candidate, local), local.revision, true);
        if (this.stopped) return;
        await this.options.changed();
        if (this.stopped) return;
      }
      meta.baseline = { revision: head.revision, state: head.state };
    } else if (meta.baseline) {
      // Account data removal cannot silently resurrect an old device snapshot.
      throw new Error('The account workspace was removed. Your device copy is preserved; reconnect explicitly to start again.');
    }
    if (!head.state || !sameState(candidate, head.state)) {
      meta.pending = { id: uid(), base: head.revision, state: candidate };
      await this.save(meta); // Durable before any network transmission.
      if (this.stopped) return;
      const result = await transport.push(meta.pending, meta.device, this.controller.signal);
      if (this.stopped) return;
      if (result.owner !== owner || !Number.isSafeInteger(result.revision) || result.revision < 1 || !['applied','conflict'].includes(result.status)) throw new Error('Invalid account sync receipt.');
      if (result.status === 'conflict') { meta.pending = null; await this.save(meta); this.schedule(0); return; }
      meta.baseline = { revision: result.revision, state: candidate };
      meta.pending = null;
      await this.save(meta);
      if (this.stopped) return;
    } else { await this.save(meta); }
    const latest = await store.load();
    if (this.stopped) return;
    if (latest && meta.baseline && !sameState(latest, meta.baseline.state)) { this.schedule(); status('Syncing newer changes…'); }
    else status('Synced with your account');
  }
  async recovery(): Promise<CloudJournal['recovery']> { return journal(await this.options.store.syncJournal(), this.options.owner).recovery; }
  async resolve(choice: 'local' | 'remote') {
    if (this.stopped || !this.options.canApply()) throw new Error('Finish your current edit first.');
    const meta = journal(await this.options.store.syncJournal(), this.options.owner);
    const local = await this.options.store.load();
    if (!meta.recovery || !local || this.stopped) return;
    if (choice === 'remote') await this.options.store.save(localState(meta.recovery.remote, local), local.revision, true);
    // Recovery candidates stay in the journal until explicitly resolved. The
    // ordinary workspace replacement backup preserves a replaced local version.
    meta.baseline = { revision: meta.recovery.revision, state: meta.recovery.remote };
    meta.recovery = null;
    await this.save(meta);
    if (this.stopped) return;
    await this.options.changed(); this.schedule(0);
  }
}
