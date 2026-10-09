import type { ProviderId } from '../providers/types';

// Cross-tab messages deliberately carry no owner ID, device ID, consent,
// translation, resource metadata, credentials, or private snapshot content.
export const PROVIDER_CLEAR_SIGNAL = Object.freeze({ type: 'clear' as const });

export function providerClearChannelName(providerId: ProviderId): string {
  return `thiepn:hub-${providerId}:clear:v1`;
}

export function isProviderClearSignal(value: unknown): value is { type: 'clear' } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 1 &&
    Object.hasOwn(record, 'type') && record.type === 'clear';
}
