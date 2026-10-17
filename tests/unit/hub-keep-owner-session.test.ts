import {describe,it,expect} from 'vitest';
import {keepWriteAuthorized} from '../../src/lib/workspace/keep-b3-device';
describe('KEEP original owner write authorization — fail closed inside source transaction',()=>{
 it('requires an affirmative current owner session',()=>{
  expect(keepWriteAuthorized(()=>true)).toBe(true);
  expect(keepWriteAuthorized(()=>false)).toBe(false);
 });
 it('does not authorize missing callbacks or exceptions',()=>{
  expect(keepWriteAuthorized(undefined as never)).toBe(false);
  expect(keepWriteAuthorized(()=>{throw new Error('Account unavailable');})).toBe(false);
 });
 it('re-checks a previously valid account during each transaction callback',()=>{
  let epoch=42,ticket=7,privacy=false,mode:'keep'|'hub'='keep';
  const authorized=()=>epoch===42&&ticket===7&&!privacy&&mode==='keep';
  expect(keepWriteAuthorized(authorized)).toBe(true);
  epoch++;
  expect(keepWriteAuthorized(authorized)).toBe(false);
  epoch=42;ticket++;
  expect(keepWriteAuthorized(authorized)).toBe(false);
  ticket=7;privacy=true;
  expect(keepWriteAuthorized(authorized)).toBe(false);
  privacy=false;mode='hub';
  expect(keepWriteAuthorized(authorized)).toBe(false);
 });
});