import {describe,it,expect} from 'vitest';
import {applyOriginalOwnerPageChoice,reviewOriginalOwnerCases,renderOriginalOwnerCaseworkForm,originalOwnerFilteredRows,updateOriginalOwnerPageMarks,applyOriginalOwnerMarkedChoice,validateOriginalOwnerMarks,OWNER_MARK_LIMIT,OWNER_MARK_FILTERS,makeOriginalOwnerCaseFrame,advanceOriginalOwnerCaseTimeline,traverseOriginalOwnerCaseTimeline,previewOriginalOwnerSelectiveRecovery,applyOriginalOwnerSelectiveRecovery,previewOriginalOwnerCrossVisitRecovery,applyOriginalOwnerCrossVisitRecovery,previewOriginalOwnerCrossVisitSubset,applyOriginalOwnerCrossVisitSubset,previewOriginalOwnerGenerationSelection,applyOriginalOwnerGenerationSelection,OWNER_CASE_HISTORY_LIMIT} from '../../src/lib/workspace/legacy-owner-casework';
import type {OwnerDryRun} from '../../src/lib/workspace/legacy-migration-dry-run';
import type {OwnerCaseChoiceInput,OwnerMarkedCase,OwnerCaseFilter,OwnerReviewFilter,OwnerMarkFilter} from '../../src/lib/workspace/legacy-owner-casework';

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

describe('decision-state-filtered source owner review',()=>{
 it('retains exact original indexes while switching conflict and decision filters',()=>{
  const old=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  const choices=[...old.slice(0,79),{...old[79]!,choice:'REVIEW_SOURCE' as const}];
  const remaining=originalOwnerFilteredRows(plan,'ALL',choices,'UNREVIEWED');
  expect(remaining).toHaveLength(83);
  expect(remaining[0]?.index).toBe(80);
  expect(originalOwnerFilteredRows(plan,'ALL',choices,'REVIEW_SOURCE').map(x=>x.index)).toEqual([79]);
  const html=renderOriginalOwnerCaseworkForm(plan,80,choices,'ALL','UNREVIEWED');
  expect(html).toContain('Records 81–83 of 83');
  expect(html).toContain('80 reviewed · 83 awaiting review');
  expect(html).not.toContain('source-79</code>');
 });
 it('bulk edits exactly the still-unreviewed rows; different decisions remain preserved',()=>{
  const old=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  const choices=[...old.slice(0,79),{...old[79]!,choice:'DEFER' as const}];
  const updated=applyOriginalOwnerPageChoice(plan,choices,0,'KEEP_SEPARATE',sha,7,'ALL','UNREVIEWED');
  expect(updated).toHaveLength(160);
  expect(updated.find(x=>x.originalId==='source-79')?.choice).toBe('DEFER');
  expect(updated.find(x=>x.originalId==='source-80')?.choice).toBe('KEEP_SEPARATE');
  expect(reviewOriginalOwnerCases(plan,updated,sha,7)).toMatchObject({writes:0,blocked:true,readyToMigrate:false});
  const queue=originalOwnerFilteredRows(plan,'ALL',updated,'UNREVIEWED');
  expect(queue.map(x=>x.index)).toEqual([160,161,162]);
 });
 it('rejects unsupported state filters, forged decisions and stale source receipts',()=>{
  const c=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  expect(()=>originalOwnerFilteredRows(plan,'ALL',c,'INVALID' as never)).toThrow();
  expect(()=>originalOwnerFilteredRows(plan,'ALL',[{...c[0]!,originalId:'forged'}],'UNREVIEWED')).toThrow();
  expect(()=>applyOriginalOwnerPageChoice(plan,c,0,null,sha,8,'ALL','KEEP_SEPARATE')).toThrow();
  expect(()=>applyOriginalOwnerPageChoice(plan,c,80,null,sha,7,'ALL','KEEP_SEPARATE')).toThrow();
  expect(c).toHaveLength(80);
 });
 it('empty queue is bounded, nonwriting and excludes private IDs',()=>{
  const a=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  const b=applyOriginalOwnerPageChoice(plan,a,80,'KEEP_SEPARATE',sha,7);
  const c=applyOriginalOwnerPageChoice(plan,b,160,'KEEP_SEPARATE',sha,7);
  const html=renderOriginalOwnerCaseworkForm(plan,0,c,'ALL','UNREVIEWED');
  expect(html).toContain('No original cases match');
  expect(html).toContain('data-action="original-owner-page-keep" disabled');
  expect(html).not.toContain('source-0</code>');
  expect(html).toContain('163 reviewed · 0 awaiting review');
 });
});

describe('Phase 26 marked original-source choices across pages',()=>{
 it('marks a selected 80-row page and last three source IDs with no destination writes',()=>{
  const first=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7);
  expect(first).toHaveLength(80);
  const later=updateOriginalOwnerPageMarks(plan,[],first,160,true,sha,7);
  expect(later).toHaveLength(83);
  expect(later.find(x=>x.originalId==='<private&source>')).toBeDefined();
  const choices=applyOriginalOwnerMarkedChoice(plan,[],later,'KEEP_SEPARATE',sha,7);
  expect(choices).toHaveLength(83);
  expect(choices.some(x=>x.originalId==='source-80')).toBe(false);
  expect(reviewOriginalOwnerCases(plan,choices,sha,7)).toMatchObject({writes:0,blocked:true,readyToMigrate:false});
  const cleared=applyOriginalOwnerMarkedChoice(plan,choices,later,null,sha,7);
  expect(cleared).toHaveLength(0);
  const render=renderOriginalOwnerCaseworkForm(plan,160,choices,'ALL','ALL',later);
  expect(render).toContain('<span data-owner-mark-count>83</span> marked across pages');
  expect(render).toContain('Keep 83 marked in source');
  expect(render).toContain('data-original-owner-mark');
 });
 it('preserves manual review for unmarked source cases and allows independent unmark',()=>{
  const independently=[{kind:'note' as const,originalId:'source-80',observedStatus:'SOURCE_ONLY' as const,choice:'DEFER' as const}];
  const first=updateOriginalOwnerPageMarks(plan,independently,[],0,true,sha,7);
  const second=updateOriginalOwnerPageMarks(plan,independently,first,160,true,sha,7);
  const unmarked=updateOriginalOwnerPageMarks(plan,independently,second,0,false,sha,7);
  expect(unmarked).toHaveLength(3);
  const selected=applyOriginalOwnerMarkedChoice(plan,independently,unmarked,'REVIEW_SOURCE',sha,7);
  expect(selected).toHaveLength(4);
  expect(selected.find(x=>x.originalId==='source-80')?.choice).toBe('DEFER');
  expect(selected.filter(x=>x.choice==='REVIEW_SOURCE')).toHaveLength(3);
 });
 it('marks current filtered unreviewed rows, not hidden or already reviewed decisions',()=>{
  const decisions=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  const marks=updateOriginalOwnerPageMarks(plan,decisions,[],0,true,sha,7,'ALL','UNREVIEWED');
  expect(marks).toHaveLength(80);
  expect(marks[0]?.originalId).toBe('source-80');
  expect(marks.some(x=>x.originalId==='source-0')).toBe(false);
  const updated=applyOriginalOwnerMarkedChoice(plan,decisions,marks,'DEFER',sha,7);
  expect(updated).toHaveLength(160);
  expect(updated.find(x=>x.originalId==='source-0')?.choice).toBe('KEEP_SEPARATE');
 });
 it('refuses forged, stale, duplicate and over-limit marks atomically',()=>{
  const first=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7);
  const forged=[{...first[0]!,originalId:'not-in-source'}];
  expect(()=>validateOriginalOwnerMarks(plan,forged,sha,7)).toThrow();
  expect(()=>validateOriginalOwnerMarks(plan,[first[0]!,first[0]!],sha,7)).toThrow();
  expect(()=>validateOriginalOwnerMarks(plan,first,sha,8)).toThrow();
  expect(()=>applyOriginalOwnerMarkedChoice(plan,[],first,'BAD' as never,sha,7)).toThrow();
  const big=Array.from({length:OWNER_MARK_LIMIT+1},(_,i)=>({kind:'note' as const,originalId:'source-'+i,observedStatus:'SOURCE_ONLY' as const}));
  expect(()=>validateOriginalOwnerMarks(plan,big,sha,7)).toThrow(/memory limit/);
  expect(first).toHaveLength(80);
 });
 it('renders an empty marked batch with disabled actions and escaped original identity',()=>{
  const html=renderOriginalOwnerCaseworkForm(plan,160,[]);
  expect(html).toContain('data-action="original-owner-marked-keep" disabled');
  expect(html).toContain('data-action="original-owner-marked-clear" disabled');
  expect(html).toContain('&lt;private&amp;source&gt;');
  expect(html).not.toContain('<private&source>');
 });
});

describe('Phase 27 original marked-only queue preserves source IDs and custody',()=>{
 it('combines marked-only, kind conflict and review-state filters with exact original indexes',()=>{
  const a=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7);
  const b=updateOriginalOwnerPageMarks(plan,[],a,160,true,sha,7);
  expect(originalOwnerFilteredRows(plan,'ALL',[], 'ALL',b,'MARKED')).toHaveLength(83);
  expect(originalOwnerFilteredRows(plan,'ALL',[], 'ALL',b,'UNMARKED')).toHaveLength(80);
  expect(originalOwnerFilteredRows(plan,'ALL',[], 'UNREVIEWED',b,'MARKED').map(x=>x.index).at(-1)).toBe(162);
  const html=renderOriginalOwnerCaseworkForm(plan,80,[],'ALL','ALL',b,'MARKED');
  expect(html).toContain('Records 81–83 of 83');
  expect(html).toContain('data-original-owner-mark-filter');
  expect(html).toContain('Marked for review (83)');
  expect(html).toContain('Keep visible 3');
  expect(html).not.toContain('<private&source>');
 });
 it('keeps unmarked decisions untouched when changing only the marked queue',()=>{
  const chosen=[{kind:'note' as const,originalId:'source-80',observedStatus:'SOURCE_ONLY' as const,choice:'DEFER' as const}];
  const marks=updateOriginalOwnerPageMarks(plan,chosen,[],0,true,sha,7,'ALL','ALL');
  const changed=applyOriginalOwnerPageChoice(plan,chosen,0,'KEEP_SEPARATE',sha,7,'ALL','ALL',marks,'MARKED');
  expect(changed).toHaveLength(81);
  expect(changed.find(x=>x.originalId==='source-80')?.choice).toBe('DEFER');
  const remaining=originalOwnerFilteredRows(plan,'ALL',changed,'ALL',marks,'MARKED');
  expect(remaining).toHaveLength(80);
  const cleared=applyOriginalOwnerPageChoice(plan,changed,0,null,sha,7,'ALL','ALL',marks,'MARKED');
  expect(cleared).toEqual(chosen);
  expect(reviewOriginalOwnerCases(plan,cleared,sha,7)).toMatchObject({writes:0,blocked:true,readyToMigrate:false});
 });
 it('validates stale source, unknown filter, forged mark and invalid offscreen page before any edits',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7);
  expect(()=>originalOwnerFilteredRows(plan,'ALL',[],'ALL',marks,'WRONG' as never)).toThrow();
  expect(()=>originalOwnerFilteredRows(plan,'ALL',[],'ALL',[{...marks[0]!,originalId:'not-found'}],'MARKED')).toThrow();
  expect(()=>applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,8,'ALL','ALL',marks,'MARKED')).toThrow();
  expect(()=>applyOriginalOwnerPageChoice(plan,[],80,'KEEP_SEPARATE',sha,7,'ALL','ALL',marks,'MARKED')).toThrow();
  expect(()=>updateOriginalOwnerPageMarks(plan,[],marks,80,false,sha,7,'ALL','ALL','MARKED')).toThrow();
  expect(marks).toHaveLength(80);
  expect(OWNER_MARK_FILTERS).toEqual(['ALL','MARKED','UNMARKED']);
 });
 it('empty marked-only mode blocks page and bulk actions, shows only safe count data',()=>{
  const html=renderOriginalOwnerCaseworkForm(plan,0,[],'ALL','ALL',[],'MARKED');
  expect(html).toContain('No original cases match');
  expect(html).toContain('data-action="original-owner-page-keep" disabled');
  expect(html).toContain('data-action="original-owner-mark-visible" disabled');
  expect(html).not.toContain('source-0</code>');
 });
});

describe('Phase 28 verified original source history and protected undo/redo',()=>{
 const frame=(decisions:readonly OwnerCaseChoiceInput[]=[],marks:readonly OwnerMarkedCase[]=[],page=0,
   filter:OwnerCaseFilter='ALL',reviewFilter:OwnerReviewFilter='ALL',markFilter:OwnerMarkFilter='ALL')=>
  makeOriginalOwnerCaseFrame(plan,decisions,marks,page,filter,reviewFilter,markFilter,sha,7);
 it('restores marked cross-page decisions without writing originals',()=>{
  const base=advanceOriginalOwnerCaseTimeline(plan,null,frame());
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7);
  const afterMarks=advanceOriginalOwnerCaseTimeline(plan,base,frame([],marks));
  const choices=applyOriginalOwnerMarkedChoice(plan,[],marks,'KEEP_SEPARATE',sha,7);
  const afterChoice=advanceOriginalOwnerCaseTimeline(plan,afterMarks,frame(choices,marks));
  expect(afterChoice.past).toHaveLength(2);
  const undo=traverseOriginalOwnerCaseTimeline(plan,afterChoice,'undo');
  expect(undo.current.choices).toHaveLength(0);expect(undo.current.marks).toHaveLength(80);
  const redo=traverseOriginalOwnerCaseTimeline(plan,undo,'redo');
  expect(redo.current.choices).toEqual(choices);
  expect(reviewOriginalOwnerCases(plan,redo.current.choices,sha,7)).toMatchObject({
   writes:0,blocked:true,readyToMigrate:false,sourceRightsApproved:false,
  });
 });
 it('restores filtered page and clears redo after an independent correction',()=>{
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame());
  const choice=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  const second=advanceOriginalOwnerCaseTimeline(plan,first,frame(choice,[],1));
  const undone=traverseOriginalOwnerCaseTimeline(plan,second,'undo');
  expect(undone.current.page).toBe(0);
  const edited=advanceOriginalOwnerCaseTimeline(plan,undone,frame([],[],0,'ALL','ALL','MARKED'));
  expect(edited.future).toHaveLength(0);
  expect(traverseOriginalOwnerCaseTimeline(plan,edited,'redo')).toBe(edited);
 });
 it('keeps only 12 states and rejects no-op changes',()=>{
  let timeline=advanceOriginalOwnerCaseTimeline(plan,null,frame());
  expect(advanceOriginalOwnerCaseTimeline(plan,timeline,frame())).toBe(timeline);
  for(let i=0;i<30;i++){
   const marks=i%2?updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7):[];
   timeline=advanceOriginalOwnerCaseTimeline(plan,timeline,frame([],marks));
  }
  expect(timeline.past).toHaveLength(OWNER_CASE_HISTORY_LIMIT);
  expect(timeline.future).toHaveLength(0);
 });
 it('rejects different source, wrong owner, Hub revision, forged mark and invalid page before recovery',()=>{
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame());
  const mark=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7)[0]!;
  const broken=[
   {...first,current:{...first.current,sourceSha256:'b'.repeat(64)}},
   {...first,current:{...first.current,hubRevision:8}},
   {...first,current:{...first.current,owner:'folio' as const}},
   {...first,current:{...first.current,page:50}},
   {...first,current:{...first.current,marks:[mark,{...mark}]}},
  ];
  for(const draft of broken)expect(()=>traverseOriginalOwnerCaseTimeline(plan,draft,'undo')).toThrow();
  expect(()=>makeOriginalOwnerCaseFrame(plan,[],[],0,'ALL','ALL','ALL',sha,8)).toThrow();
  expect(first.current.choices).toHaveLength(0);
 });
 it('copies source decisions and marks rather than retaining mutable aliases',()=>{
  const choices=applyOriginalOwnerPageChoice(plan,[],0,'KEEP_SEPARATE',sha,7);
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7);
  const timeline=advanceOriginalOwnerCaseTimeline(plan,null,frame(choices,marks));
  choices[0]={...choices[0]!,choice:'DEFER'};
  marks[0]={...marks[0]!,originalId:'invalid'};
  expect(timeline.current.choices[0]?.choice).toBe('KEEP_SEPARATE');
  expect(timeline.current.marks[0]?.originalId).toBe('source-0');
 });
});

describe('Phase 29 multi-generation selective recovery preserves authored current evidence',()=>{
 const frame=(choices:readonly OwnerCaseChoiceInput[],marks:readonly OwnerMarkedCase[])=>
  makeOriginalOwnerCaseFrame(plan,choices,marks,0,'ALL','ALL','ALL',sha,7);
 it('recovers cleared marked choices two generations back while protecting an independent DEFER',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,2);
  const first=applyOriginalOwnerMarkedChoice(plan,[],marks,'KEEP_SEPARATE',sha,7);
  let h=advanceOriginalOwnerCaseTimeline(plan,null,frame(first,marks));
  const second=[{...first[0]!,choice:'DEFER' as const},first[1]!];
  h=advanceOriginalOwnerCaseTimeline(plan,h,frame(second,marks));
  const cleared=[second[0]!];
  h=advanceOriginalOwnerCaseTimeline(plan,h,frame(cleared,marks));
  const authored=[{...cleared[0]!,choice:'REVIEW_HUB' as const}];
  h=advanceOriginalOwnerCaseTimeline(plan,h,frame(authored,marks));
  const receipt=previewOriginalOwnerSelectiveRecovery(plan,h,2);
  expect(receipt).toMatchObject({recoverable:1,protectedCurrent:1,writes:0,blocked:true});
  const recovered=applyOriginalOwnerSelectiveRecovery(plan,h,receipt);
  expect(recovered.find(x=>x.originalId==='source-0')?.choice).toBe('REVIEW_HUB');
  expect(recovered.find(x=>x.originalId==='source-1')?.choice).toBe('KEEP_SEPARATE');
  expect(reviewOriginalOwnerCases(plan,recovered,sha,7)).toMatchObject({writes:0,readyToMigrate:false});
  expect(h.current.choices).toHaveLength(1);
 });
 it('rejects edited preview, changed current choices and source mismatch before any recovery',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,2);
  const choices=applyOriginalOwnerMarkedChoice(plan,[],marks,'KEEP_SEPARATE',sha,7);
  const h1=advanceOriginalOwnerCaseTimeline(plan,null,frame(choices,marks));
  const h2=advanceOriginalOwnerCaseTimeline(plan,h1,frame([],marks));
  const proof=previewOriginalOwnerSelectiveRecovery(plan,h2,1);
  expect(proof.recoverable).toBe(2);
  expect(()=>applyOriginalOwnerSelectiveRecovery(plan,h2,{...proof,recoverable:3})).toThrow();
  expect(()=>applyOriginalOwnerSelectiveRecovery(plan,h2,{...proof,sourceSha256:'b'.repeat(64)})).toThrow();
  const altered=advanceOriginalOwnerCaseTimeline(plan,h2,frame([choices[0]!],marks));
  expect(()=>applyOriginalOwnerSelectiveRecovery(plan,altered,proof)).toThrow();
  expect(h2.current.choices).toHaveLength(0);
 });
 it('tracks unreviewed old snapshots, unchanged current decisions and bounded historical visits',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,2);
  const selected=applyOriginalOwnerMarkedChoice(plan,[],marks,'DEFER',sha,7);
  let h=advanceOriginalOwnerCaseTimeline(plan,null,frame([],marks));
  h=advanceOriginalOwnerCaseTimeline(plan,h,frame(selected,marks));
  const prior=previewOriginalOwnerSelectiveRecovery(plan,h,1);
  expect(prior).toMatchObject({recoverable:0,protectedCurrent:0,unchanged:0,unavailable:2});
  h=advanceOriginalOwnerCaseTimeline(plan,h,frame(selected,[marks[0]!]));
  const unchanged=previewOriginalOwnerSelectiveRecovery(plan,h,1);
  expect(unchanged).toMatchObject({unchanged:1,recoverable:0});
  expect(()=>previewOriginalOwnerSelectiveRecovery(plan,h,0)).toThrow();
  expect(()=>previewOriginalOwnerSelectiveRecovery(plan,h,13)).toThrow();
  expect(()=>previewOriginalOwnerSelectiveRecovery(plan,h,1.5)).toThrow();
 });
 it('guards foreign-owner history, duplicate marks and divergent source status',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,1);
  const choice=applyOriginalOwnerMarkedChoice(plan,[],marks,'KEEP_SEPARATE',sha,7);
  let h=advanceOriginalOwnerCaseTimeline(plan,null,frame(choice,marks));
  h=advanceOriginalOwnerCaseTimeline(plan,h,frame([],marks));
  const corrupted={...h,current:{...h.current,owner:'folio' as const}};
  expect(()=>previewOriginalOwnerSelectiveRecovery(plan,corrupted,1)).toThrow();
  expect(()=>previewOriginalOwnerSelectiveRecovery(plan,{...h,current:{...h.current,marks:[marks[0]!,marks[0]!]}},1)).toThrow();
  expect(()=>previewOriginalOwnerSelectiveRecovery(plan,{...h,current:{...h.current,hubRevision:9}},1)).toThrow();
 });
});

describe('Phase 30 original-source cross-visit selective safe subset',()=>{
 const frame=(choices:readonly OwnerCaseChoiceInput[],marks:readonly OwnerMarkedCase[])=>
  makeOriginalOwnerCaseFrame(plan,choices,marks,0,'ALL','ALL','ALL',sha,7);
 it('recovers different marked records from distinct historical visits with original IDs',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,3);
  const first=[{...marks[0]!,choice:'KEEP_SEPARATE' as const}];
  const second=[{...marks[1]!,choice:'DEFER' as const}];
  let history=advanceOriginalOwnerCaseTimeline(plan,null,frame(first,marks));
  history=advanceOriginalOwnerCaseTimeline(plan,history,frame(second,marks));
  history=advanceOriginalOwnerCaseTimeline(plan,history,frame([],marks));
  const preview=previewOriginalOwnerCrossVisitRecovery(plan,history);
  expect(preview).toMatchObject({owner:'notes',originalFileSha256:sha,hubRevision:7,
   visitsUsed:2,protectedCurrent:0,withoutHistory:1,blocked:true,writes:0,readyToMigrate:false});
  expect(preview.recoverable).toHaveLength(2);
  expect(preview.recoverable.map(x=>[x.originalId,x.choice,x.visitsBack])).toEqual([
   ['source-0','KEEP_SEPARATE',2],['source-1','DEFER',1]]);
  const restored=applyOriginalOwnerCrossVisitRecovery(plan,history,preview);
  expect(restored.map(x=>[x.originalId,x.choice])).toEqual([
   ['source-0','KEEP_SEPARATE'],['source-1','DEFER']]);
  expect(history.current.choices).toHaveLength(0);
  expect(reviewOriginalOwnerCases(plan,restored,sha,7)).toMatchObject({writes:0,blocked:true,readyToMigrate:false});
 });
 it('never overwrites independently authored current decisions, including same ID changed later',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,2);
  const old=[{...marks[0]!,choice:'KEEP_SEPARATE' as const},{...marks[1]!,choice:'DEFER' as const}];
  let history=advanceOriginalOwnerCaseTimeline(plan,null,frame(old,marks));
  history=advanceOriginalOwnerCaseTimeline(plan,history,frame([
   {...marks[0]!,choice:'REVIEW_HUB' as const}],marks));
  const preview=previewOriginalOwnerCrossVisitRecovery(plan,history);
  expect(preview).toMatchObject({protectedCurrent:1,unchangedCurrent:0,visitsUsed:1});
  expect(preview.recoverable).toHaveLength(1);
  const result=applyOriginalOwnerCrossVisitRecovery(plan,history,preview);
  expect(result.find(x=>x.originalId==='source-0')?.choice).toBe('REVIEW_HUB');
  expect(result.find(x=>x.originalId==='source-1')?.choice).toBe('DEFER');
 });
 it('fails closed on altered preview, historical deletion or newer current return',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,2);
  const old=[{...marks[0]!,choice:'KEEP_SEPARATE' as const}];
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame(old,marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,first,frame([],marks));
  const receipt=previewOriginalOwnerCrossVisitRecovery(plan,current);
  expect(()=>applyOriginalOwnerCrossVisitRecovery(plan,current,{...receipt,visitsUsed:0})).toThrow();
  expect(()=>applyOriginalOwnerCrossVisitRecovery(plan,current,{...receipt,originalFileSha256:'b'.repeat(64)})).toThrow();
  expect(()=>applyOriginalOwnerCrossVisitRecovery(plan,current,{...receipt,
   recoverable:[{...receipt.recoverable[0]!,choice:'REVIEW_HUB'}]})).toThrow();
  const concurrent=advanceOriginalOwnerCaseTimeline(plan,current,frame([{...marks[0]!,choice:'REVIEW_SOURCE'}],marks));
  expect(()=>applyOriginalOwnerCrossVisitRecovery(plan,concurrent,receipt)).toThrow();
  expect(current.current.choices).toHaveLength(0);
 });
 it('rejects foreign owner, stale revision and malformed source evidence before constructing any recovery',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,1);
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame([{...marks[0]!,choice:'DEFER'}],marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,first,frame([],marks));
  for(const corrupt of [
   {...current,current:{...current.current,owner:'folio' as const}},
   {...current,current:{...current.current,hubRevision:8}},
   {...current,current:{...current.current,marks:[marks[0]!,marks[0]!]}},
   {...current,past:[{...current.past[0]!,sourceSha256:'c'.repeat(64)}]},
  ])expect(()=>previewOriginalOwnerCrossVisitRecovery(plan,corrupt)).toThrow();
  expect(first.current.choices).toHaveLength(1);
 });
 it('uses only 12 protected in-memory frames and honors exact marked subset',()=>{
  const marked=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,1);
  let history=advanceOriginalOwnerCaseTimeline(plan,null,frame([{...marked[0]!,choice:'DEFER'}],marked));
  for(let i=0;i<31;i++)history=advanceOriginalOwnerCaseTimeline(plan,history,frame(
   i%2?[{...marked[0]!,choice:'KEEP_SEPARATE'}]:[],marked));
  expect(history.past).toHaveLength(OWNER_CASE_HISTORY_LIMIT);
  const proof=previewOriginalOwnerCrossVisitRecovery(plan,history);
  expect(proof.recoverable.length).toBeLessThanOrEqual(1);
  expect(proof.writes).toBe(0);
 });
});

describe('Phase 31 original-ID selective cross-visit receipts and independent re-entry',()=>{
 const frame=(choices:readonly OwnerCaseChoiceInput[],marks:readonly OwnerMarkedCase[])=>
  makeOriginalOwnerCaseFrame(plan,choices,marks,0,'ALL','ALL','ALL',sha,7);
 const originalId=(kind:string,id:string)=>JSON.stringify([kind,id]);
 it('restores exactly one original, leaves another missing and preserves a newer independent decision',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,3);
  const older=[{...marks[0]!,choice:'KEEP_SEPARATE' as const},{...marks[1]!,choice:'DEFER' as const},
   {...marks[2]!,choice:'DEFER' as const}];
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame(older,marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,first,frame([{...marks[2]!,choice:'REVIEW_HUB'}],marks));
  const full=previewOriginalOwnerCrossVisitRecovery(plan,current);
  expect(full.recoverable).toHaveLength(2);
  const subset=previewOriginalOwnerCrossVisitSubset(plan,current,full,[originalId(marks[1]!.kind,marks[1]!.originalId)]);
  expect(subset).toMatchObject({selected:[{originalId:'source-1',choice:'DEFER'}],excluded:1,
   protectedCurrent:1,writes:0,blocked:true,readyToMigrate:false});
  const restored=applyOriginalOwnerCrossVisitSubset(plan,current,subset);
  expect(restored.find(row=>row.originalId==='source-0')).toBeUndefined();
  expect(restored.find(row=>row.originalId==='source-1')?.choice).toBe('DEFER');
  expect(restored.find(row=>row.originalId==='source-2')?.choice).toBe('REVIEW_HUB');
  expect(reviewOriginalOwnerCases(plan,restored,sha,7)).toMatchObject({writes:0,blocked:true,readyToMigrate:false});
  expect(current.current.choices).toHaveLength(1);
 });
 it('rejects duplicate, unreviewed, and unknown IDs rather than silently choosing more than requested',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,2);
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame([{...marks[0]!,choice:'KEEP_SEPARATE'}],marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,first,frame([],marks));
  const full=previewOriginalOwnerCrossVisitRecovery(plan,current),key=originalId('note','source-0');
  expect(()=>previewOriginalOwnerCrossVisitSubset(plan,current,full,[key,key])).toThrow();
  expect(()=>previewOriginalOwnerCrossVisitSubset(plan,current,full,[originalId('note','unknown-id')])).toThrow();
  expect(()=>previewOriginalOwnerCrossVisitSubset(plan,current,full,[originalId('note','source-1')])).toThrow();
  const actual=previewOriginalOwnerCrossVisitSubset(plan,current,full,[key]);
  expect(()=>applyOriginalOwnerCrossVisitSubset(plan,current,{...actual,selected:[{...actual.selected[0]!,choice:'DEFER'}]})).toThrow();
  expect(()=>applyOriginalOwnerCrossVisitSubset(plan,current,{...actual,sourceSha256:'b'.repeat(64)})).toThrow();
 });
 it('enforces a fresh preview after competing current decisions, mark changes or historical visit revocation',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,2);
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame([{...marks[0]!,choice:'KEEP_SEPARATE'}],marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,first,frame([],marks));
  const review=previewOriginalOwnerCrossVisitRecovery(plan,current);
  const receipt=previewOriginalOwnerCrossVisitSubset(plan,current,review,[originalId('note','source-0')]);
  const changed=advanceOriginalOwnerCaseTimeline(plan,current,frame([{...marks[0]!,choice:'REVIEW_SOURCE'}],marks));
  expect(()=>applyOriginalOwnerCrossVisitSubset(plan,changed,receipt)).toThrow();
  const unmarked=advanceOriginalOwnerCaseTimeline(plan,current,frame([],marks.slice(1)));
  expect(()=>applyOriginalOwnerCrossVisitSubset(plan,unmarked,receipt)).toThrow();
  expect(()=>applyOriginalOwnerCrossVisitSubset(plan,{...current,past:[]},receipt)).toThrow();
  expect(()=>previewOriginalOwnerCrossVisitSubset(plan,current,{...review,hubRevision:8},[originalId('note','source-0')])).toThrow();
  expect(current.current.choices).toHaveLength(0);
 });
 it('supports an empty explicit selection but never grants migration, backups or original-owner writes',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,1);
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame([{...marks[0]!,choice:'DEFER'}],marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,first,frame([],marks));
  const full=previewOriginalOwnerCrossVisitRecovery(plan,current);
  const zero=previewOriginalOwnerCrossVisitSubset(plan,current,full,[]);
  expect(zero).toMatchObject({selected:[],excluded:1,readyToMigrate:false,writes:0,blocked:true});
  expect(applyOriginalOwnerCrossVisitSubset(plan,current,zero)).toEqual([]);
 });
});

describe('Phase 32 independently chosen exact historical decision generations',()=>{
 const frame=(choices:readonly OwnerCaseChoiceInput[],marks:readonly OwnerMarkedCase[])=>
  makeOriginalOwnerCaseFrame(plan,choices,marks,0,'ALL','ALL','ALL',sha,7);
 it('selects older DEFER instead of more recent REVIEW_SOURCE, protecting a current independent choice',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,2);
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame([
   {...marks[0]!,choice:'DEFER'},{...marks[1]!,choice:'KEEP_SEPARATE'}],marks));
  const second=advanceOriginalOwnerCaseTimeline(plan,first,frame([
   {...marks[0]!,choice:'REVIEW_SOURCE'},{...marks[1]!,choice:'REVIEW_HUB'}],marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,second,frame([{...marks[1]!,choice:'REVIEW_HUB'}],marks));
  const catalog=previewOriginalOwnerCrossVisitRecovery(plan,current);
  expect(catalog.recoverable).toMatchObject([{originalId:'source-0',choice:'REVIEW_SOURCE'}]);
  const receipt=previewOriginalOwnerGenerationSelection(plan,current,catalog,[{
   kind:marks[0]!.kind,originalId:marks[0]!.originalId,visitsBack:2}]);
  expect(receipt).toMatchObject({selected:[{originalId:'source-0',choice:'DEFER',visitsBack:2}],
   blocked:true,writes:0,readyToMigrate:false});
  const restored=applyOriginalOwnerGenerationSelection(plan,current,receipt);
  expect(restored.find(x=>x.originalId==='source-0')?.choice).toBe('DEFER');
  expect(restored.find(x=>x.originalId==='source-1')?.choice).toBe('REVIEW_HUB');
  expect(current.current.choices).toHaveLength(1);
 });
 it('rejects duplicate, forged, removed or already-reviewed historical generations',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,2);
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame([{...marks[0]!,choice:'DEFER'}],marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,first,frame([],marks));
  const catalog=previewOriginalOwnerCrossVisitRecovery(plan,current);
  const row={kind:marks[0]!.kind,originalId:marks[0]!.originalId,visitsBack:1};
  expect(()=>previewOriginalOwnerGenerationSelection(plan,current,catalog,[row,row])).toThrow();
  expect(()=>previewOriginalOwnerGenerationSelection(plan,current,catalog,[{...row,visitsBack:0}])).toThrow();
  expect(()=>previewOriginalOwnerGenerationSelection(plan,current,catalog,[{...row,visitsBack:2}])).toThrow();
  expect(()=>previewOriginalOwnerGenerationSelection(plan,current,catalog,[{...row,originalId:'unknown'}])).toThrow();
  expect(()=>previewOriginalOwnerGenerationSelection(plan,current,catalog,[{...row,originalId:marks[1]!.originalId}])).toThrow();
  const newer=advanceOriginalOwnerCaseTimeline(plan,current,frame([{...marks[0]!,choice:'REVIEW_HUB'}],marks));
  expect(()=>previewOriginalOwnerGenerationSelection(plan,newer,previewOriginalOwnerCrossVisitRecovery(plan,newer),[row])).toThrow();
 });
 it('rejects concurrent changes and forged receipts, preserving original data',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,1);
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame([{...marks[0]!,choice:'DEFER'}],marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,first,frame([],marks));
  const scan=previewOriginalOwnerCrossVisitRecovery(plan,current);
  const receipt=previewOriginalOwnerGenerationSelection(plan,current,scan,[{
   kind:marks[0]!.kind,originalId:marks[0]!.originalId,visitsBack:1}]);
  expect(()=>applyOriginalOwnerGenerationSelection(plan,current,{...receipt,selected:[{...receipt.selected[0]!,choice:'REVIEW_HUB'}]})).toThrow();
  expect(()=>applyOriginalOwnerGenerationSelection(plan,{...current,past:[]},receipt)).toThrow();
  const competing=advanceOriginalOwnerCaseTimeline(plan,current,frame([{...marks[0]!,choice:'REVIEW_SOURCE'}],marks));
  expect(()=>applyOriginalOwnerGenerationSelection(plan,competing,receipt)).toThrow();
  expect(()=>previewOriginalOwnerGenerationSelection(plan,current,{...scan,originalFileSha256:'b'.repeat(64)},[])).toThrow();
  expect(current.current.choices).toHaveLength(0);
 });
 it('empty explicit selection remains no-op and migration impossible',()=>{
  const marks=updateOriginalOwnerPageMarks(plan,[],[],0,true,sha,7).slice(0,1);
  const first=advanceOriginalOwnerCaseTimeline(plan,null,frame([{...marks[0]!,choice:'DEFER'}],marks));
  const current=advanceOriginalOwnerCaseTimeline(plan,first,frame([],marks));
  const receipt=previewOriginalOwnerGenerationSelection(plan,current,previewOriginalOwnerCrossVisitRecovery(plan,current),[]);
  expect(receipt).toMatchObject({selected:[],blocked:true,writes:0,readyToMigrate:false});
  expect(applyOriginalOwnerGenerationSelection(plan,current,receipt)).toEqual([]);
 });
});
