import registry from '../../data/hub-providers.json';
import type { ProviderId, ProviderManifest } from './types';
export const PROVIDER_BUDGETS = Object.freeze(registry.budgets);
export const PILOT_PROVIDERS = registry.providers as ProviderManifest[];
export function providerManifest(id: ProviderId): ProviderManifest { return PILOT_PROVIDERS.find(provider => provider.id === id)!; }
export function providerAction(id: ProviderId, action: string): string | null { return providerManifest(id).actions[action] ?? null; }
