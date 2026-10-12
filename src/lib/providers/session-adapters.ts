import { providerManifest } from './registry';
import type { ProviderAdapter, ProviderId, RequestContext } from './types';

export interface BoundProviderSession {
  readRequest(request: RequestContext, signal: AbortSignal): Promise<string>;
}

export function sessionProviderAdapter(
  providerId: ProviderId,
  session: BoundProviderSession,
): ProviderAdapter {
  const manifest = structuredClone(providerManifest(providerId));
  manifest.privateReadsEnabled = true;
  manifest.inlineWritesEnabled = false;
  manifest.operations = {
    ...manifest.operations,
    summary: true,
    continue: true,
    search: true,
    capture: false,
    inbox: false,
  };
  return {
    manifest,
    read: (request, signal) => session.readRequest(request, signal),
  };
}
