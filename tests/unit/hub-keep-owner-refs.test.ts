import {describe,it,expect} from 'vitest';
import {makeOwnerRef,parseOwnerRef,SOURCE_ADAPTERS} from '../../src/lib/workspace/keep-b3-owner-refs';
describe('KEEP B3 original owner pointers within Hub: no provider access',()=>{
 it('retains canonical owner ID as opaque and safely percent-encoded',()=>{
  const ref=makeOwnerRef('folio','task','assignment/42');
  expect(ref.uri).toBe('thiepn://folio/home/task/assignment%2F42?v=1');
  expect(parseOwnerRef(ref.uri)).toEqual(ref);
 });
 it('rejects wrong kinds, double encoding, unsupported versions, and malformed input',()=>{
  expect(parseOwnerRef('thiepn://folio/home/habit/a?v=2')).toBeNull();
  expect(parseOwnerRef('thiepn://folio/home/task/assignment%252F42?v=1')).toEqual(makeOwnerRef('folio','task','assignment%2F42'));
  expect(parseOwnerRef('thiepn://bad/home/task/a?v=1')).toBeNull();
  expect(parseOwnerRef('javascript:alert(1)')).toBeNull();
 });
 it('does not grant any source live read, remote write, or sync permission',()=>{
   for(const adapter of Object.values(SOURCE_ADAPTERS)){
    expect(adapter.liveRead).toBe(false);expect(adapter.remoteWrite).toBe(false);expect(adapter.synchronization).toBe(false);
   }
 });
 it('rejects control bytes and fake module identifiers',()=>{
  expect(()=>makeOwnerRef('folio','task','a\n')).toThrow();
  expect(parseOwnerRef('thiepn://folio/private/task/x?v=1')).toBeNull();
 });
});
