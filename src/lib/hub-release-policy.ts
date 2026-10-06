export const HUB_RELEASE_ID = 'H8-public-handoffs-v1';
export const HUB_READING_PILOT_RELEASE_ID = 'H23-device-reading-pilot-v1';
export const HUB_RELEASE_ROUTES = ['/', '/home/', '/apps/', '/search/', '/inbox/', '/flows/', '/home/auth/callback/'] as const;
export const HUB_DISABLED_FEATURES = ['hubSignIn', 'privateReads', 'inlineWrites', 'inboxReads', 'automatedTransfers'] as const;
export interface HubReleaseStatus {
  schemaVersion: 1;
  releaseId: string;
  profile: 'public-handoffs' | 'device-reading-pilot';
  appCount: number;
  features: Record<typeof HUB_DISABLED_FEATURES[number], boolean>;
}
// Each release profile allows only its declared capabilities.
export function validateHubReleaseStatus(value: unknown): HubReleaseStatus {
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(value) || Object.keys(value).sort().join(',') !== 'appCount,features,profile,releaseId,schemaVersion'
    || value.schemaVersion !== 1
    || !((value.releaseId === HUB_RELEASE_ID && value.profile === 'public-handoffs') || (value.releaseId === HUB_READING_PILOT_RELEASE_ID && value.profile === 'device-reading-pilot'))
    || typeof value.appCount !== 'number' || !Number.isInteger(value.appCount) || value.appCount < 27 || value.appCount > 250
    || !obj(value.features) || Object.keys(value.features).sort().join(',') !== [...HUB_DISABLED_FEATURES].sort().join(',')
    || HUB_DISABLED_FEATURES.some(feature => (value.features as Record<string, unknown>)[feature] !== (feature === 'privateReads' && value.profile === 'device-reading-pilot'))) {
    throw new Error('Hub public-handoffs release profile rejected');
  }
  return structuredClone(value) as unknown as HubReleaseStatus;
}
