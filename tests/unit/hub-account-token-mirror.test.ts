import {describe,it,expect} from 'vitest';
import {shouldImportLegacyAccountToken} from '../../src/lib/hub-account-token-mirror';
const now=Date.now();
const token=(sub:string,refreshToken:string,expiresAt:number)=>JSON.stringify({accessToken:'fixture.'+Buffer.from(JSON.stringify({sub})).toString('base64url')+'.fixture',refreshToken,expiresAt});
describe('durable Account token mirror',()=>{
 it('never replaces a committed refresh with a delayed same-owner mirror, even with a later timestamp',()=>{
  expect(shouldImportLegacyAccountToken(token('a','rotated',now+3600000),token('a','old',now+3700000))).toBe(false);
 });
 it('does not resurrect an expired refresh token with stale mirror expiry',()=>{
  expect(shouldImportLegacyAccountToken(token('a','old',0),token('a','old',now+3600000))).toBe(false);
 });
 it('preserves an explicit newer account switch and rejects sign-out resurrection',()=>{
  expect(shouldImportLegacyAccountToken(token('a','old',now+3600000),token('b','new',now+3600001))).toBe(true);
  expect(shouldImportLegacyAccountToken(null,token('a','old',now+3600000))).toBe(false);
 });
});
