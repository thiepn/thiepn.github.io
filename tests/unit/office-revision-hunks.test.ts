import {describe,it,expect} from 'vitest';
import {revisionHunks,MAX_NAVIGABLE_HUNKS,MAX_DETAILED_DIFF_LINES} from '../../src/lib/office/revision-hunks';
describe('Office O11 safe changed-hunk navigation',()=>{
 it('finds separate changes rather than one misleading contiguous span',()=>{
  const old=['# Report','a','keep','b','keep again','c'].join('\n');
  const next=['# Report','A','keep','B','keep again','c'].join('\n');
  const result=revisionHunks(old,next);
  expect(result.summaryOnly).toBe(false);
  expect(result.totalHunks).toBe(2);
  expect(result.hunks.map(h=>[h.historicalFrom,h.historicalTo,h.currentFrom,h.currentTo])).toEqual([[2,2,2,2],[4,4,4,4]]);
  expect(result.hunks[0]?.historicalSample).toEqual(['a']);
  expect(result.hunks[1]?.currentSample).toEqual(['B']);
 });
 it('reports pure insertions without pretending they contain recoverable historical lines',()=>{
  const result=revisionHunks('first\nlast','first\nnew\nlast');
  expect(result.hunks).toHaveLength(1);
  expect(result.hunks[0]).toMatchObject({historicalFrom:2,historicalTo:1,removed:0,added:1,currentSample:['new']});
 });
 it('returns no hunks for unchanged document, and supports Unicode',()=>{
  expect(revisionHunks('日本語\nSame','日本語\nSame').totalHunks).toBe(0);
  expect(revisionHunks('한국어\nold','한국어\nnew').hunks[0]).toMatchObject({historicalFrom:2,removed:1,added:1});
 });
 it('caps detailed navigation while retaining an honest total count',()=>{
  const left=Array.from({length:160},(_,i)=>i%2?'shared':'old'+i).join('\n');
  const right=Array.from({length:160},(_,i)=>i%2?'shared':'new'+i).join('\n');
  const result=revisionHunks(left,right);
  expect(result.totalHunks).toBe(80);
  expect(result.hunks).toHaveLength(MAX_NAVIGABLE_HUNKS);
  expect(result.truncated).toBe(true);
 });
 it('bounds memory for very long documents and preserves a truthful summary',()=>{
  const prefix=Array.from({length:MAX_DETAILED_DIFF_LINES+1},(_,i)=>'Line '+i).join('\n');
  const result=revisionHunks(prefix+'\nOld',prefix+'\nNew');
  expect(result.summaryOnly).toBe(true);
  expect(result.hunks).toHaveLength(1);
  expect(result.hunks[0]?.historicalSample.join('\n')).toContain('Old');
  expect(result.hunks[0]?.currentSample.join('\n')).toContain('New');
 });
});
