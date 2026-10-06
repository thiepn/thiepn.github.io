import { describe, expect, it } from 'vitest';
import { parseLibraryConsent, libraryContinueUrl } from '../../src/lib/hub-library-session';

const legacy = {
  schemaVersion: 1,
  deviceId: '11111111-1111-4111-8111-111111111111',
  revision: '22222222-2222-4222-8222-222222222222',
  permissions: ['continue'],
  includePersonal: false,
};
const accountAware = { ...legacy, schemaVersion: 2, includeAccount: true };

describe('Library sharing consent', () => {
  it('keeps legacy owner-issued consent local-only', () => {
    expect(parseLibraryConsent(legacy)).toEqual({ ...legacy, schemaVersion: 2, includeAccount: false });
  });
  it('accepts explicit v2 Account sharing', () => expect(parseLibraryConsent(accountAware)).toEqual(accountAware));
  it.each([
    null,
    {},
    { ...accountAware, permissions: ['capture'] },
    { ...accountAware, permissions: ['search','search'] },
    { ...accountAware, revision: 'old' },
    { ...accountAware, accountId: 'owner' },
    { ...accountAware, includePersonal: 1 },
    { ...accountAware, includeAccount: 'true' },
  ])('rejects malformed consent %j', value => expect(parseLibraryConsent(value)).toBeNull());
  it('encodes exact continuation metadata without reader positions', () => expect(libraryContinueUrl({
    resourceId: 'personal:pdf-fictional:pdf',
    edition: 1,
    releaseVersion: 'local-fictional',
  })).toBe('/library/hub/continue?resource=personal%3Apdf-fictional%3Apdf&edition=1&release=local-fictional'));
});
