import { describe, expect, it } from 'vitest';
import { parseLibraryConsent, libraryContinueUrl, libraryProviderAccess, type LibraryConsent } from '../../src/lib/hub-library-session';
const consent: LibraryConsent = { schemaVersion: 1, deviceId: '11111111-1111-4111-8111-111111111111', revision: '22222222-2222-4222-8222-222222222222', permissions: ['continue'], includePersonal: false };
describe('Library device consent', () => {
  it('accepts owner-issued purposes and excludes imported titles by default', () => expect(parseLibraryConsent(consent)).toEqual(consent));
  it.each([null, {}, { ...consent, permissions: ['capture'] }, { ...consent, permissions: ['search','search'] }, { ...consent, revision: 'old' }, { ...consent, accountId: 'owner' }, { ...consent, includePersonal: 1 }])('rejects malformed consent %j', value => expect(parseLibraryConsent(value)).toBeNull());
  it('encodes exact continuation metadata without reader positions', () => expect(libraryContinueUrl({ resourceId: 'personal:pdf-fictional:pdf', edition: 1, releaseVersion: 'local-fictional' })).toBe('/library/hub/continue?resource=personal%3Apdf-fictional%3Apdf&edition=1&release=local-fictional'));
  it('projects device consent into a bounded sanitized ProviderAccess', () => {
    const now=Date.parse('2026-10-07T06:00:00.000Z');
    expect(libraryProviderAccess(consent,now)).toEqual({
      providerId:'library',
      context:{scope:'device',deviceId:consent.deviceId,consentRevision:consent.revision},
      permissions:['library.hub.continue.read'],
      expiresAt:now+300000,
    });
    expect(JSON.stringify(libraryProviderAccess(consent,now))).not.toMatch(/title|resource|position|content/);
  });
});
