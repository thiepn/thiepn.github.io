import registry from '../data/hub-providers.json';
import { validateProviderEnvelope } from './providers/contract';
import type { Operation, ProviderContext, ProviderManifest } from './providers/types';

const protocol = 'thiepn-library-hub-v1';
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const operations = ['summary', 'continue', 'search'] as const;

export interface LibraryConsent {
  schemaVersion: 2;
  deviceId: string;
  revision: string;
  permissions: Operation[];
  includePersonal: boolean;
  includeAccount: boolean;
}

function validPermissions(value: unknown): value is Operation[] {
  return Array.isArray(value)
    && value.length <= operations.length
    && new Set(value).size === value.length
    && value.every((permission) => operations.includes(permission as Operation));
}

export function parseLibraryConsent(v: unknown): LibraryConsent | null {
  if (!obj(v) || !uuid(v.deviceId) || !uuid(v.revision) || !validPermissions(v.permissions) || typeof v.includePersonal !== 'boolean') return null;
  if (v.schemaVersion === 1
    && Object.keys(v).sort().join(',') === 'deviceId,includePersonal,permissions,revision,schemaVersion') {
    return {
      schemaVersion: 2,
      deviceId: v.deviceId,
      revision: v.revision,
      permissions: v.permissions,
      includePersonal: v.includePersonal,
      includeAccount: false,
    };
  }
  if (v.schemaVersion === 2
    && Object.keys(v).sort().join(',') === 'deviceId,includeAccount,includePersonal,permissions,revision,schemaVersion'
    && typeof v.includeAccount === 'boolean') {
    return v as unknown as LibraryConsent;
  }
  return null;
}

export function libraryContinueUrl(item: { resourceId: string; edition?: number; releaseVersion?: string }): string {
  return '/library/hub/continue?' + new URLSearchParams({
    resource: item.resourceId,
    edition: String(item.edition),
    release: item.releaseVersion ?? '',
  });
}

/** RAM-only session; one owner frame, nonce-bound responses, bounded deadlines. */
export class HubLibrarySession {
  private frame: HTMLIFrameElement | null = null;
  private channel = crypto.randomUUID();
  private consent: LibraryConsent | null = null;
  private accountId: string | null = null;
  private pending = new Map<string, { resolve: (value: Record<string, unknown>) => void; reject: () => void }>();

  constructor(private invalidate: () => void) {
    window.addEventListener('message', this.receive);
  }

  private receive = (event: MessageEvent) => {
    const value: unknown = event.data;
    if (event.origin !== location.origin || event.source !== this.frame?.contentWindow || !obj(value) || value.protocol !== protocol || value.channel !== this.channel) return;
    if (value.kind === 'invalidate' && Object.keys(value).sort().join(',') === 'channel,kind,protocol') {
      this.clear();
      this.invalidate();
      return;
    }
    if (!uuid(value.requestId)) return;
    const entry = this.pending.get(value.requestId);
    if (entry) {
      this.pending.delete(value.requestId);
      entry.resolve(value);
    }
  };

  clear() {
    this.consent = null;
    this.accountId = null;
    this.channel = crypto.randomUUID();
    for (const entry of this.pending.values()) entry.reject();
    this.pending.clear();
    this.frame?.remove();
    this.frame = null;
  }

  dispose() {
    this.clear();
    window.removeEventListener('message', this.receive);
  }

  private request(body: Record<string, unknown>, signal: AbortSignal): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (signal.aborted || !this.frame?.contentWindow) {
        reject(new Error('Cancelled'));
        return;
      }
      const requestId = crypto.randomUUID();
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        this.pending.delete(requestId);
      };
      const cancel = () => {
        finish();
        reject(new Error('Cancelled'));
      };
      const timer = setTimeout(cancel, 2000);
      signal.addEventListener('abort', cancel, { once: true });
      this.pending.set(requestId, {
        resolve: value => {
          finish();
          resolve(value);
        },
        reject: cancel,
      });
      this.frame.contentWindow.postMessage({ protocol, channel: this.channel, requestId, ...body }, location.origin);
    });
  }

  async connect(signal: AbortSignal, accountId: string | null = null): Promise<LibraryConsent> {
    this.clear();
    const frame = document.createElement('iframe');
    this.frame = frame;
    frame.hidden = true;
    frame.title = 'Library metadata connection';
    frame.referrerPolicy = 'no-referrer';
    frame.src = '/library/hub/bridge';

    await new Promise<void>((resolve, reject) => {
      const done = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        frame.onload = frame.onerror = null;
      };
      const cancel = () => {
        done();
        reject(new Error('Unavailable'));
      };
      const timer = setTimeout(cancel, 2000);
      frame.onload = () => {
        done();
        resolve();
      };
      frame.onerror = cancel;
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) cancel();
      else document.body.append(frame);
    });

    let result: Record<string, unknown>;
    let accountAware = true;
    try {
      result = await this.request({ kind: 'connect', accountId }, signal);
    } catch (error) {
      if (signal.aborted) throw error;
      accountAware = false;
      result = await this.request({ kind: 'connect' }, signal);
    }

    const consent = parseLibraryConsent(result.consent);
    if (result.kind !== 'connected'
      || Object.keys(result).sort().join(',') !== 'channel,consent,kind,protocol,requestId'
      || !consent
      || !consent.permissions.length) {
      throw new Error('Choose sharing in Library');
    }

    this.consent = accountAware ? consent : { ...consent, includeAccount: false };
    this.accountId = accountAware && accountId && uuid(accountId) ? accountId : null;
    return this.consent;
  }

  async read(operation: Operation, signal: AbortSignal, query = '') {
    const consent = this.consent;
    if (!consent?.permissions.includes(operation)) throw new Error('Missing permission');
    const context: ProviderContext = {
      scope: 'device',
      deviceId: consent.deviceId,
      consentRevision: consent.revision,
    };
    const result = await this.request({ kind: 'read', operation, context, query }, signal);
    if (consent !== this.consent
      || result.kind !== 'result'
      || Object.keys(result).sort().join(',') !== 'channel,envelope,kind,protocol,requestId') {
      throw new Error('Invalid result');
    }
    const manifest = registry.providers.find(p => p.id === 'library') as ProviderManifest;
    return validateProviderEnvelope(
      JSON.stringify(result.envelope),
      manifest,
      { providerId: 'library', operation, requestId: result.requestId as string, context },
    );
  }
}
