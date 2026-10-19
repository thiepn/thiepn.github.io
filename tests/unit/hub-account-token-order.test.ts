import { describe, expect, it } from 'vitest';
import { staleLegacyAccountCredential } from '../../src/lib/hub-account-persistence';

const token=(refreshToken:string,expiresAt:number)=>JSON.stringify({
  accessToken:'fixture-access',refreshToken,expiresAt,scope:'openid',
});

describe('Hub Account durable token ordering across tabs',()=>{
  const old=token('older',100),rotated=token('rotated',200),newer=token('newer',300);
  it('rejects a stale localStorage credential after an IndexedDB rotation',()=>{
    expect(staleLegacyAccountCredential({value:rotated,legacy:rotated},old)).toBe(true);
    expect(staleLegacyAccountCredential({value:rotated,legacy:rotated},token('tie',200))).toBe(true);
  });
  it('still adopts a genuinely newer credential written by a legacy tab',()=>{
    expect(staleLegacyAccountCredential({value:rotated,legacy:rotated},newer)).toBe(false);
    expect(staleLegacyAccountCredential({value:old,legacy:old},rotated)).toBe(false);
  });
  it('preserves an explicit legacy sign-out without resurrecting a durable tombstone',()=>{
    expect(staleLegacyAccountCredential({value:rotated,legacy:rotated},null)).toBe(false);
    expect(staleLegacyAccountCredential({value:null,legacy:null},old)).toBe(true);
  });
  it('does not admit malformed legacy credentials or reject unchanged records',()=>{
    expect(staleLegacyAccountCredential({value:rotated,legacy:rotated},'{broken')).toBe(true);
    expect(staleLegacyAccountCredential({value:rotated,legacy:rotated},rotated)).toBe(false);
  });
});
