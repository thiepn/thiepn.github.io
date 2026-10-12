import { sessionProviderAdapter, type BoundProviderSession } from '../providers/session-adapters';
import type { NotesConsent } from '../hub-notes-session';
import type { ProviderAccess, ProviderResult } from '../providers/types';
import type { PrismProviderRuntime } from './provider-runtime';

type ManagedProvider = 'notes' | 'tms60';
type HomeOperation = 'summary' | 'continue';
export interface PrismManagedSession extends BoundProviderSession {
  clear(removePending?: boolean): void;
  begin(owner: string, consent: NotesConsent): Promise<string>;
  complete(query: URLSearchParams, fragment: string): Promise<void>;
  providerAccess(consent: NotesConsent): Promise<ProviderAccess>;
}
export interface PrismManagedState { connected: boolean; busy: boolean; message: string; }

/** Reuses the qualified owner session; credentials remain inside that RAM-only session. */
export class PrismManagedConnection {
  #generation = 0;
  #connected = false;
  #busy = false;
  #expiry: ReturnType<typeof setTimeout> | undefined;
  constructor(
    readonly providerId: ManagedProvider,
    private readonly session: PrismManagedSession,
    private readonly runtime: PrismProviderRuntime,
    private readonly owner: () => string | null,
    private readonly consent: (owner: string) => Promise<NotesConsent>,
    private readonly visible: () => readonly HomeOperation[],
    private readonly emit: (state: PrismManagedState) => void,
  ) {}

  #show(message: string): void { this.#message = message; this.emit({ connected: this.#connected, busy: this.#busy, message }); }
  clear(message = 'Connect to show shared Home data.', removePending = true): void {
    ++this.#generation;
    clearTimeout(this.#expiry);
    this.#expiry = undefined;
    this.session.clear(removePending);
    this.runtime.removeConnection(this.providerId);
    this.#connected = false;
    this.#busy = false;
    this.#show(message);
  }
  async begin(): Promise<string | null> {
    if (this.#busy) return null;
    const owner = this.owner();
    if (!owner) return null;
    this.clear();
    const generation = this.#generation;
    this.#busy = true;
    this.#show('Checking your sharing choices…');
    try {
      const consent = await this.consent(owner);
      if (generation !== this.#generation || owner !== this.owner()) return null;
      const url = await this.session.begin(owner, consent);
      return generation === this.#generation && owner === this.owner() ? url : null;
    } catch {
      if (generation === this.#generation) this.clear('Choose sharing permissions in Account, then connect again.');
      return null;
    }
  }
  async complete(query: URLSearchParams, fragment: string): Promise<void> {
    const generation = this.#generation;
    const owner = this.owner();
    if (!owner || this.#busy) return;
    this.#busy = true;
    this.#show('Completing connection…');
    try {
      await this.session.complete(query, fragment);
      if (generation !== this.#generation || owner !== this.owner()) return;
      this.#connected = true;
      this.#busy = false;
      await this.refresh();
    } catch {
      if (generation === this.#generation) this.clear('This return is missing, expired or already used. Connect again.');
    }
  }
  async refresh(): Promise<void> {
    if (!this.#connected || this.#busy) return;
    const owner = this.owner();
    if (!owner) { this.clear('Sign in to connect Home data.'); return; }
    const generation = ++this.#generation;
    clearTimeout(this.#expiry);
    this.runtime.removeConnection(this.providerId);
    if (!this.visible().length) { this.#show('Connected · Home data blocks are hidden; nothing is being read.'); return; }
    this.#busy = true;
    this.#show('Checking current shared Home data…');
    try {
      const consent = await this.consent(owner);
      if (generation !== this.#generation || owner !== this.owner()) return;
      const access = await this.session.providerAccess(consent);
      if (generation !== this.#generation || owner !== this.owner()) return;
      if (access.providerId !== this.providerId || access.context.scope !== 'account' || access.context.accountId !== owner) throw new Error('Unavailable');
      const allowed = this.visible().filter(operation => access.permissions.includes(`${this.providerId}.hub.${operation}.read`));
      if (!allowed.length) { this.clear('No shared summary or Continue permission. Manage sharing in Account.'); return; }
      this.runtime.setConnection(sessionProviderAdapter(this.providerId, this.session), access);
      for (const operation of allowed) this.runtime.setVisible(this.providerId, operation, true);
      await this.runtime.refresh();
      if (generation !== this.#generation || owner !== this.owner()) return;
      const results = this.runtime.results().filter(result => result.providerId === this.providerId);
      if (results.some(result => result.status === 'error' || result.status === 'offline')) throw new Error('Unavailable');
      this.#show(results.some(result => result.status === 'unconnected') ? 'No cloud snapshot. Sync this app, then refresh.'
        : results.some(result => result.status === 'unsupported') ? 'This cloud snapshot cannot be read yet. Open the app.'
        : results.some(result => result.status === 'ready') ? 'Connected · shared snapshot shown on Home.' : 'Connected · no current shared activity.');
      this.#scheduleExpiry(results, access.expiresAt, generation);
    } catch {
      if (generation === this.#generation) this.clear('Sharing could not be checked. Reconnect or open the app.');
    } finally {
      if (generation === this.#generation) { this.#busy = false; this.#showCurrent(); }
    }
  }
  #message = '';
  #showCurrent(): void { this.#show(this.#message); }
  #scheduleExpiry(results: readonly ProviderResult[], accessExpiry: number, generation: number): void {
    const deadlines = results.flatMap(result => result.envelope ? [Date.parse(result.envelope.expiresAt)] : []).filter(deadline => deadline > Date.now());
    const expiry = Math.min(accessExpiry, ...deadlines);
    this.#expiry = setTimeout(() => {
      if (generation !== this.#generation) return;
      this.runtime.expireSnapshots();
      if (Date.now() >= accessExpiry) this.clear('Connection expired. Connect again.');
      else {
        this.#show('Snapshot expired. Refresh to check current Home data.');
        this.#scheduleExpiry(this.runtime.results().filter(result => result.providerId === this.providerId), accessExpiry, generation);
      }
    }, Math.max(0, expiry - Date.now()) + 5);
  }
}
