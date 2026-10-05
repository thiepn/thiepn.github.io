import { expect, it } from 'vitest';
import { HUB_DISABLED_FEATURES, HUB_RELEASE_ID, validateHubReleaseStatus } from '../../src/lib/hub-release-policy';
import { HUB_READING_PILOT_RELEASE_ID } from '../../src/lib/hub-release-policy';
const candidate = () => ({ schemaVersion: 1, releaseId: HUB_RELEASE_ID, profile: 'public-handoffs', appCount: 27, features: { hubSignIn: false, privateReads: false, inlineWrites: false, inboxReads: false, automatedTransfers: false } });
it('H21 accepts device reading while rejecting account writes and sign-in', () => {
  const c = candidate(); const pilot = {...c,releaseId:HUB_READING_PILOT_RELEASE_ID,profile:'device-reading-pilot',features:{...c.features,privateReads:true}};
  expect(validateHubReleaseStatus(pilot).profile).toBe('device-reading-pilot');
  for (const feature of ['hubSignIn','inlineWrites','inboxReads','automatedTransfers']) expect(()=>validateHubReleaseStatus({...pilot,features:{...pilot.features,[feature]:true}})).toThrow();
});
it('H8 accepts the bounded public release and returns an independent snapshot', () => {
  const source = candidate(), result = validateHubReleaseStatus(source);
  result.appCount = 250; expect(source.appCount).toBe(27);
  expect(validateHubReleaseStatus({ ...source, appCount: 250 }).appCount).toBe(250);
});
for (const feature of HUB_DISABLED_FEATURES) it(`H8 rejects uncertified ${feature} enablement and malformed flags`, () => {
  const c = candidate();
  for (const value of [true, null, 'false', undefined]) expect(() => validateHubReleaseStatus({ ...c, features: { ...c.features, [feature]: value } })).toThrow();
});
it('H8 rejects missing/unknown fields, stale profiles and invalid roster sizes', () => {
  const c = candidate();
  for (const value of [null, [], {}, { ...c, extra: true }, { ...c, profile: 'full-integration' }, { ...c, releaseId: 'old' }, { ...c, features: { ...c.features, extra: false } }]) expect(() => validateHubReleaseStatus(value)).toThrow();
  for (const appCount of [26, 251, 27.5, '27', NaN]) expect(() => validateHubReleaseStatus({ ...c, appCount })).toThrow();
});
