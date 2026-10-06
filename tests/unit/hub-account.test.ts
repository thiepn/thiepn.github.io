import { describe, expect, it } from 'vitest';
import { preferenceKey, readPendingLogin, safeHubReturn, readHubCallback } from '../../src/lib/hub-auth';
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
describe('H2 account isolation and return boundaries', () => {
  it('partitions guest and each canonical UUID without adopting guest state', () => { expect(new Set([preferenceKey(null),preferenceKey(a),preferenceKey(b)]).size).toBe(3); expect(()=>preferenceKey('email@example.test')).toThrow(); });
  it.each(['https://evil.test','//evil.test','/\\evil.test','/notes/','/home/auth/callback/','/home/?access_token=x'])( 'rejects return destination %s', value => expect(safeHubReturn(value)).toBe('/home/'));
  it('accepts fresh, matching nonces only for allowlisted Hub return paths', () => { const flow='a'.repeat(64); expect(readPendingLogin(JSON.stringify({flow,started:100,returnTo:'/search/'}),flow,200)).toEqual({returnTo:'/search/'}); expect(readPendingLogin(JSON.stringify({flow,started:100,returnTo:'/home/prism-preview/'}),flow,200)).toEqual({returnTo:'/home/prism-preview/'}); });
  it('rejects mismatched, expired, future, malformed and missing flows', () => { const flow='a'.repeat(64); const raw=JSON.stringify({flow,started:100}); for(const [value,nonce,now] of [[raw,'b'.repeat(64),200],[raw,flow,700000],[raw,flow,0],['{',flow,200],[null,flow,200],[raw,null,200]] as const) expect(readPendingLogin(value,nonce,now)).toBeNull(); });
});
describe('H10 code callback boundary', () => {
  const valid = 'flow=' + 'a'.repeat(64) + '&code=one-use-code';
  it('accepts exactly one code and matching flow in either order', () => {
    expect(readHubCallback(new URLSearchParams(valid), '')).toEqual({ flow: 'a'.repeat(64), code: 'one-use-code' });
    expect(readHubCallback(new URLSearchParams('code=one-use-code&flow=' + 'a'.repeat(64)), '')).not.toBeNull();
  });
  it.each(['&code=duplicate', '&flow=' + 'a'.repeat(64), '&access_token=x', '&refresh_token=x', '&error=denied', '&extra=1'])('rejects additional callback fields %s', suffix => {
    expect(readHubCallback(new URLSearchParams(valid + suffix), '')).toBeNull();
  });
  it.each(['', ' ', 'a\nb', 'x'.repeat(2049)])('rejects invalid codes', code => {
    expect(readHubCallback(new URLSearchParams({ flow: 'a'.repeat(64), code }), '')).toBeNull();
  });
  it('rejects fragments and non-finite persisted initiation time', () => {
    expect(readHubCallback(new URLSearchParams(valid), '#access_token=x')).toBeNull();
    expect(readPendingLogin('{"flow":"' + 'a'.repeat(64) + '","started":1e400}', 'a'.repeat(64))).toBeNull();
  });
});
