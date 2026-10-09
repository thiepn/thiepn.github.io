import type { ProviderId, ProviderResult, ProviderStatus } from '../providers/types';

export type DailyHomeState = ProviderStatus | 'disconnected';
export type DailyHomeSlot = 'continue' | 'now' | 'study' | 'recent';
export type DailyHomeAvailability = Record<DailyHomeSlot, DailyHomeState>;

type ProjectedActivity = Record<DailyHomeSlot, boolean>;

// Availability contains only coarse operation states; never private titles,
// counts, identities, resource IDs, or cached snapshots.
function availabilityFor(
  results: readonly ProviderResult[],
  operation: 'continue' | 'summary',
  providerId: ProviderId | null,
  hasActivity: boolean,
): DailyHomeState {
  if (hasActivity) return 'ready';
  const candidates = results.filter(result =>
    result.operation === operation && (providerId === null || result.providerId === providerId),
  );
  if (candidates.length === 0) return 'disconnected';
  // A successful empty response must not mask a different provider's failure.
  for (const state of ['offline', 'error', 'stale', 'unconnected', 'unsupported'] as const) {
    if (candidates.some(result => result.status === state)) return state;
  }
  return 'empty';
}

export function deriveDailyHomeAvailability(
  results: readonly ProviderResult[],
  activity: ProjectedActivity,
): DailyHomeAvailability {
  return {
    continue: availabilityFor(results, 'continue', null, activity.continue),
    now: availabilityFor(results, 'summary', 'tms60', activity.now),
    study: availabilityFor(results, 'summary', 'tms60', activity.study),
    recent: availabilityFor(results, 'summary', null, activity.recent),
  };
}
