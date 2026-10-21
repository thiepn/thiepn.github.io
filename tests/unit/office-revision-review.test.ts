import {describe,it,expect} from 'vitest';
import {compareOfficeRevision,recoverRevisionLines,applyRevisionExcerpt,MAX_COMPARE_ROWS} from '../../src/lib/office/revision-review';
import type {OfficeRevision} from '../../src/lib/office/documents';
const historical:OfficeRevision={revision:1,title:'Old',body:'# Report\n\nLine A\nLine B\nLine C',updatedAt:'2026-10-18T18:00:00Z'};
describe('Office O10 revision comparison and selective recovery',()=>{
 it('compares changed line span while ignoring unchanged prefix and suffix',()=>{
  const compare=compareOfficeRevision('# Title\nShared\nOld line\nFinish','# Title\nShared\nNew line\nFinish');
  expect(compare).toMatchObject({changedRows:1,addedRows:0,removedRows:0,truncated:false});
  expect(compare.differences).toEqual([{line:3,historical:'Old line',current:'New line'}]);
 });
 it('reports added/removed line counts and bounded comparison rows',()=>{
  expect(compareOfficeRevision('one','one\ntwo\nthree')).toMatchObject({addedRows:2,removedRows:0});
  expect(compareOfficeRevision('one\ntwo\nthree','one')).toMatchObject({addedRows:0,removedRows:2});
  const comparison=compareOfficeRevision('a\n'+'x\n'.repeat(200),'a\n'+'y\n'.repeat(200));
  expect(comparison.truncated).toBe(true);
  expect(comparison.differences).toHaveLength(MAX_COMPARE_ROWS);
 });
 it('extracts only selected historical lines, without modifying immutable history',()=>{
  const snapshot=JSON.stringify(historical);
  expect(recoverRevisionLines(historical,3,4)).toBe('Line A\nLine B');
  expect(()=>recoverRevisionLines(historical,1,300)).toThrow('1–200');
  expect(()=>recoverRevisionLines(historical,3,30)).toThrow('not available');
  expect(JSON.stringify(historical)).toBe(snapshot);
 });
 it('inserts at original caret and replaces only nonempty selected current text',()=>{
  expect(applyRevisionExcerpt('Hello world','Line A',6,11,'insert')).toBe('Hello Line Aworld');
  expect(applyRevisionExcerpt('Hello world','Line A',6,11,'replace')).toBe('Hello Line A');
  expect(()=>applyRevisionExcerpt('text','copy',2,2,'replace')).toThrow('nonempty');
  expect(()=>applyRevisionExcerpt('text','copy',-1,2,'insert')).toThrow('Invalid');
 });
 it('refuses any overflowing recovery without returning a partial document',()=>{
  expect(()=>applyRevisionExcerpt('x'.repeat(200000),'recovery',0,0,'insert')).toThrow('200,000');
  expect(()=>recoverRevisionLines({...historical,body:'z'.repeat(50000)},1,1)).toThrow('40,000');
 });
});
