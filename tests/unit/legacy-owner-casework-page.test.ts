import {describe,it,expect} from 'vitest';
import {applyOriginalOwnerPageChoice,reviewOriginalOwnerCases,renderOriginalOwnerCaseworkForm,originalOwnerFilteredRows} from '../../src/lib/workspace/legacy-owner-casework';
import type {OwnerDryRun} from '../../src/lib/workspace/legacy-migration-dry-run';

const sha='a'.repeat(64);
const rows=Array.from({length:163},(_,i)=>({
 kind:'note' as const,originalId:i===162?'<private&source>':'source-'+i,
 proposedOriginalId:i===162?'<private&source>':'source-'+i,
 status:'SOURCE_ONLY' as const,sourceRelations:[] as string[],
 originalAttachmentIds:[] as string[],destinationWrites:0 as const
}));
const plan:OwnerDryRun={
 owner:'notes',originalFileSha256:sha,hubRevision:7,
 rows,counts:{SOURCE_ONLY:163,ID_COLLISION:0,TITLE_AMBIGUITY:0,MISSING_RELATION:0},
 blocked:true,writes:0,sourceAuthenticated:false,approvalRequired:true,reasons:[]
};
describe('original owner visible-page review is bounded and read-only',()=>{
 it('keeps exactly the first 80, preserving unrelated pages and original IDs',()=>{
  const first=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  expect(first).toHaveLength(80);
  expect(first.map(x=>x.originalId)).toEqual(rows.slice(0,80).map(x=>x.originalId));
  const last=applyOriginalOwnerPageChoice(plan,first,160,'KEEP_SEPARATE',sha,7);
  expect(last).toHaveLength(83);
  expect(last.some(x=>x.originalId==='source-80')).toBe(false);
  const receipt=reviewOriginalOwnerCases(plan,last,sha,7);
  expect(receipt.reviewed).toBe(83);
  expect(receipt.held).toBe(80);
  expect(receipt.writes).toBe(0);
  expect(receipt.readyToMigrate).toBe(false);
 });
 it('clears only one page and preserves independently selected other pages',()=>{
  const a=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  const b=applyOriginalOwnerPageChoice(plan,a,80,'KEEP_SEPARATE',sha,7);
  const c=applyOriginalOwnerPageChoice(plan,b,0,null,sha,7);
  expect(c).toHaveLength(80);
  expect(c.every(x=>Number(x.originalId.split('-')[1])>=80)).toBe(true);
  expect(renderOriginalOwnerCaseworkForm(plan,80,c)).toContain('selected>Keep in original owner');
  expect(renderOriginalOwnerCaseworkForm(plan,0,c)).toContain('Not reviewed');
 });
 it('rejects forged, stale and unaligned page input without changing old decisions',()=>{
  const a=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  for(const offset of [-80,1,163,Number.NaN]){
   expect(()=>applyOriginalOwnerPageChoice(plan,a,offset,null,sha,7)).toThrow();
  }
  expect(()=>applyOriginalOwnerPageChoice(plan,a,0,null,'b'.repeat(64),7)).toThrow();
  expect(()=>applyOriginalOwnerPageChoice(plan,a,0,null,sha,8)).toThrow();
  expect(()=>applyOriginalOwnerPageChoice(plan,[{...a[0]!,originalId:'forged'}],0,'KEEP_SEPARATE',sha,7)).toThrow();
  expect(a).toHaveLength(80);
 });
 it('escapes hostile IDs and limits the last page to three rows',()=>{
  const html=renderOriginalOwnerCaseworkForm(plan,160,[]);
  expect(html).toContain('&lt;private&amp;source&gt;');
  expect(html).not.toContain('<private&source>');
  expect(html).toContain('Keep visible 3');
  expect(html).toContain('Clear visible 3');
  expect(html).toContain('Records 161–163 of 163');
  expect(html).toContain('Migration remains blocked');
 });
});

describe('filtered original owner review preserves source identity and cross-page decisions',()=>{
 const mixedRows=rows.map((row,i)=>({...row,status:(i%2===0?'ID_COLLISION':'SOURCE_ONLY') as typeof row.status|'ID_COLLISION'}));
 const mixed:OwnerDryRun={...plan,rows:mixedRows,counts:{ID_COLLISION:82,SOURCE_ONLY:81,TITLE_AMBIGUITY:0,MISSING_RELATION:0}};
 it('filters by original conflict status and keeps original global case indexes',()=>{
  expect(originalOwnerFilteredRows(mixed,'ID_COLLISION')).toHaveLength(82);
  const html=renderOriginalOwnerCaseworkForm(mixed,0,[],'ID_COLLISION');
  expect(html).toContain('Case 1');
  expect(html).toContain('Case 3');
  expect(html).not.toContain('source-1</code>');
  expect(html).toContain('ID collisions (82)');
  expect(html).toContain('Records 1–80 of 82');
  expect(()=>originalOwnerFilteredRows(mixed,'INVALID' as never)).toThrow();
 });
 it('bulk keeps only matching rows, retaining independently selected other conflict types',()=>{
  const collision=applyOriginalOwnerPageChoice(mixed,[],0,'KEEP_SEPARATE',sha,7,'ID_COLLISION');
  expect(collision).toHaveLength(80);
  expect(collision.every(x=>x.observedStatus==='ID_COLLISION')).toBe(true);
  const source=applyOriginalOwnerPageChoice(mixed,collision,0,'KEEP_SEPARATE',sha,7,'SOURCE_ONLY');
  expect(source).toHaveLength(160);
  const cleared=applyOriginalOwnerPageChoice(mixed,source,0,null,sha,7,'ID_COLLISION');
  expect(cleared).toHaveLength(80);
  expect(cleared.every(x=>x.observedStatus==='SOURCE_ONLY')).toBe(true);
  const tail=applyOriginalOwnerPageChoice(mixed,cleared,80,'KEEP_SEPARATE',sha,7,'ID_COLLISION');
  expect(tail).toHaveLength(82);
  expect(tail.some(x=>x.originalId==='<private&source>')).toBe(true);
  expect(reviewOriginalOwnerCases(mixed,tail,sha,7)).toMatchObject({writes:0,blocked:true,readyToMigrate:false});
  expect(()=>applyOriginalOwnerPageChoice(mixed,[],80,'KEEP_SEPARATE',sha,8,'ID_COLLISION')).toThrow();
  expect(()=>applyOriginalOwnerPageChoice(mixed,[],80,'KEEP_SEPARATE',sha,7,'TITLE_AMBIGUITY')).toThrow();
 });
 it('empty filters remain nonwriting and prevent blind bulk actions',()=>{
  const empty=renderOriginalOwnerCaseworkForm(mixed,0,[],'MISSING_RELATION');
  expect(empty).toContain('No original cases match');
  expect(empty).toContain('data-action="original-owner-page-keep" disabled');
  expect(empty).not.toContain('source-0</code>');
 });
});
