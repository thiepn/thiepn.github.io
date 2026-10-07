export const HUB_RELEASE_ID = 'H8-public-handoffs-v1';
export const HUB_READING_PILOT_RELEASE_ID = 'H23-device-reading-pilot-v1';
export const HUB_LIBRARY_ECOSYSTEM_RELEASE_ID = 'P4-library-ecosystem-v1';
export const HUB_RELEASE_ROUTES = ['/', '/home/', '/apps/', '/search/', '/inbox/', '/flows/', '/home/auth/callback/'] as const;
export const HUB_DISABLED_FEATURES = ['hubSignIn', 'privateReads', 'inlineWrites', 'inboxReads', 'automatedTransfers'] as const;

export type HubReleaseProfile = 'public-handoffs' | 'device-reading-pilot' | 'library-ecosystem';

export interface HubReleaseStatus {
  schemaVersion: 1;
  releaseId: string;
  profile: HubReleaseProfile;
  appCount: number;
  features: Record<typeof HUB_DISABLED_FEATURES[number], boolean>;
}

function expectedFeatures(profile: HubReleaseProfile): Record<typeof HUB_DISABLED_FEATURES[number], boolean> {
  return {
    hubSignIn: profile === 'library-ecosystem',
    privateReads: profile === 'device-reading-pilot' || profile === 'library-ecosystem',
    inlineWrites: false,
    inboxReads: false,
    automatedTransfers: false,
  };
}

// Each release profile allows only its declared capabilities.
export function validateHubReleaseStatus(value: unknown): HubReleaseStatus {
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(value) || Object.keys(value).sort().join(',') !== 'appCount,features,profile,releaseId,schemaVersion'
    || value.schemaVersion !== 1
    || !(
      (value.releaseId === HUB_RELEASE_ID && value.profile === 'public-handoffs')
      || (value.releaseId === HUB_READING_PILOT_RELEASE_ID && value.profile === 'device-reading-pilot')
      || (value.releaseId === HUB_LIBRARY_ECOSYSTEM_RELEASE_ID && value.profile === 'library-ecosystem')
    )
    || typeof value.appCount !== 'number' || !Number.isInteger(value.appCount) || value.appCount < 27 || value.appCount > 250
    || !obj(value.features) || Object.keys(value.features).sort().join(',') !== [...HUB_DISABLED_FEATURES].sort().join(',')) {
    throw new Error('Hub release profile rejected');
  }

  const expected = expectedFeatures(value.profile as HubReleaseProfile);
  if (HUB_DISABLED_FEATURES.some(feature => (value.features as Record<string, unknown>)[feature] !== expected[feature])) {
    throw new Error('Hub release profile rejected');
  }

  return structuredClone(value) as unknown as HubReleaseStatus;
}
