import type { ProviderEnvelope, ProviderId, ProviderStatus } from '../providers/types';
import { providerManifest } from '../providers/registry';

/**
 * Ephemeral view notifications from the EXISTING owner-authorized readers.
 * There is no transport, authorization grant, persistent cache or progress writer here.
 * Owner scripts must only call publishOwnerContinue after their existing envelope validation.
 */
export type ContinueSourceStatus = 'loading' | ProviderStatus | 'revoked';
export type ContinueMessage =
  | { providerId: ProviderId; status: ContinueSourceStatus; data: null }
  | { providerId: ProviderId; status: 'ready' | 'empty'; data: ProviderEnvelope };
type Listener = (message: ContinueMessage) => void;
const listeners = new Set<Listener>();

export function listenOwnerContinue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function notifyOwnerContinue(providerId: ProviderId, status: ContinueSourceStatus) {
  if (!providerManifest(providerId)) return;
  const message: ContinueMessage = { providerId, status, data: null };
  listeners.forEach(listener => listener(message));
}
/** Consumers see metadata only and must clear it no later than the envelope expiry. */
export function publishOwnerContinue(envelope: ProviderEnvelope) {
  if (!['notes','library','tms60'].includes(envelope.providerId)) return;
  if (!['summary','continue'].includes(envelope.operation)) return;
  if (!['ready','empty'].includes(envelope.status) || !envelope.data ||
      envelope.privacy !== 'private' || envelope.schemaVersion !== 1 ||
      envelope.coverage !== providerManifest(envelope.providerId).coverage) return;
  const now = Date.now();
  if (!Number.isFinite(Date.parse(envelope.expiresAt)) ||
      Date.parse(envelope.expiresAt) <= now ||
      Date.parse(envelope.observedAt) > now + 30000) return;
  // A detached, bounded copy decouples the visual desk from the owner read lifecycle.
  const data: ProviderEnvelope = {
    ...envelope,
    context: structuredClone(envelope.context),
    data: {
      ...envelope.data,
      items: envelope.data.items.slice(0, 6).map(item => ({...item}))
    }
  };
  listeners.forEach(listener => listener({ providerId: envelope.providerId, status: envelope.status as 'ready'|'empty', data }));
}
