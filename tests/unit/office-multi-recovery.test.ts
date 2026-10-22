import {describe,it,expect} from 'vitest';
import {previewMultiRevisionRecovery,MAX_MULTI_RECOVERY_HUNKS} from '../../src/lib/office/multi-recovery';
import {revisionHunks} from '../../src/lib/office/revision-hunks';
describe('Office O12 atomic multi-change recovery preparation',()=>{
 const old='# Class\nold first\nkeep\nold second\nkeep again\nold third\n';
 const current='# Class\nnew first\nkeep\nnew second\nkeep again\nnew third\n';
 it('previews two disjoint changes without touching the third or source records',()=>{
  const originalOld=old,originalCurrent=current;
  const preview=previewMultiRevisionRecovery(old,current,[0,2]);
  expect(preview).toMatchObject({selected:2,removedCurrentLines:2,restoredHistoricalLines:2});
  expect(preview.value).toBe('# Class\nold first\nkeep\nnew second\nkeep again\nold third\n');
  expect(old).toBe(originalOld);expect(current).toBe(originalCurrent);
 });
 it('supports mixed addition/deletion changes and recovers all to byte-identical Markdown',()=>{
  const older='# Note\nalpha\nskip\nbeta\nlast';
  const now='# Note\nchanged\nskip\nextra\nlast';
  const hunks=revisionHunks(older,now);
  expect(hunks.totalHunks).toBe(2);
  expect(previewMultiRevisionRecovery(older,now,[0,1]).value).toBe(older);
 });
 it('does not confuse purely inserted current lines with original historical text',()=>{
  const older='a\nz',now='a\nadded\nz';
  const result=previewMultiRevisionRecovery(older,now,[0]);
  expect(result.value).toBe(older);expect(result.restoredHistoricalLines).toBe(0);
  expect(result.removedCurrentLines).toBe(1);
 });
 it('does not normalize Unicode or final newline in any unaffected span',()=>{
  const older='한글\nold\n日本語\nunchanged\n';
  const now='한글\nnew\n日本語\nunchanged\n';
  expect(previewMultiRevisionRecovery(older,now,[0]).value).toBe(older);
 });
 it('rejects duplicates, empty selections, invalid indices and oversized combined restoration',()=>{
  expect(()=>previewMultiRevisionRecovery(old,current,[])).toThrow('between 1 and 20');
  expect(()=>previewMultiRevisionRecovery(old,current,[0,0])).toThrow('invalid or repeated');
  expect(()=>previewMultiRevisionRecovery(old,current,[4])).toThrow('invalid or repeated');
  expect(()=>previewMultiRevisionRecovery(old,current,Array.from({length:MAX_MULTI_RECOVERY_HUNKS+1},(_,i)=>i))).toThrow('between 1 and 20');
  const older='x'.repeat(199980)+'\nkeep\nA',now='short\nkeep\n'+'y'.repeat(200);
  expect(()=>previewMultiRevisionRecovery(older,now,[0])).toThrow('200,000');
 });
 it('refuses approximate large-document summaries and truncated hunk sets',()=>{
  const older=Array.from({length:810},(_,i)=>'before '+i).join('\n');
  const now=Array.from({length:810},(_,i)=>'after '+i).join('\n');
  expect(()=>previewMultiRevisionRecovery(older,now,[0])).toThrow('Detailed historical changes');
  const a=Array.from({length:160},(_,i)=>i%2?'same':'before'+i).join('\n');
  const b=Array.from({length:160},(_,i)=>i%2?'same':'after'+i).join('\n');
  expect(()=>previewMultiRevisionRecovery(a,b,[0])).toThrow('Detailed historical changes');
 });
});
