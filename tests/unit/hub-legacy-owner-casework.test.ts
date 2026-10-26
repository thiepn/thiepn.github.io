import {describe,it,expect} from 'vitest';
import {makeOriginalOwnerDryRun} from '../../src/lib/workspace/legacy-migration-dry-run';
import {reviewOriginalOwnerCases} from '../../src/lib/workspace/legacy-owner-casework';
const now=Date.parse('2026-10-26T10:00:00Z');
const encode=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v));
const hub=()=>({
 revision:4,
 tasks:[{id:'hub-shared',title:'Existing task'}],
 events:[],
 notes:[{id:'hub-note',title:'Existing note'}],
 trackers:[]
}) as any;
const folio=()=>({
 format:'folio-backup',version:24,exportedAt:'2026-10-26T09:00:00Z',
 data:Object.fromEntries(['tasks','projects','habits','habitEntries','timeBlocks','dailyPlans','dailyPlanItems',
 'focusSessions','recurringSeries','settings','importBatches','reviewRecords','reminders','reminderOccurrences',
 'folders','lists','sections','tags','notes','attachments','habitGroups','habitTemplates'].map(k=>[k,[]])) as Record<string,Record<string,unknown>[]>
});
const notes=()=>({
 format:'thiepn.notes.backup',formatVersion:2,databaseVersion:3,exportedAt:now,
 data:{notes:[] as Record<string,unknown>[],checklistItems:[],labels:[],noteLabels:[],
 attachments:[] as Record<string,unknown>[],reminders:[],revisions:[],settings:[]}
});
describe('original-owner conflict review without writer or rights authority',()=>{
 it('binds exact source digest and Hub revision, preserves all original IDs and their attachment lineage',async()=>{
  const f=folio();
  f.data.tasks!.push({id:'hub-shared',title:'Existing task'});
  f.data.notes!.push({id:'folio-note',title:'Unique note'});
  f.data.attachments!.push({id:'original-binary',ownerType:'task',ownerId:'hub-shared',
    kind:'file',size:3,dataBase64:'YWJj'});
  const snapshot=JSON.stringify(f),h=hub(),originalHub=JSON.stringify(h);
  const {plan}=await makeOriginalOwnerDryRun(encode(f),h,now);
  expect(plan.rows.find(r=>r.originalId==='hub-shared')?.originalAttachmentIds).toEqual(['original-binary']);
  const receipt=reviewOriginalOwnerCases(plan,[{kind:'task',originalId:'hub-shared',
    observedStatus:'ID_COLLISION',choice:'KEEP_SEPARATE'}],plan.originalFileSha256,4);
  expect(receipt).toMatchObject({owner:'folio',attachmentReferences:1,reviewed:1,held:1,
   blocked:true,writes:0,readyToMigrate:false,sourceRightsApproved:false,
   ownerBackupVerified:false,destinationBackupVerified:false});
  expect(JSON.stringify(f)).toBe(snapshot);expect(JSON.stringify(h)).toBe(originalHub);
  expect(plan.rows.every(r=>r.originalId===r.proposedOriginalId)).toBe(true);
 });
 it('retains native Notes SHA attestation, but never upgrades a decision to migration authorization',async()=>{
  const n=notes();n.data.notes.push({id:'hub-note',title:'Existing note'});
  n.data.attachments.push({id:'source-attachment',noteId:'hub-note',dataSha256:
   'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
   dataBase64:'YWJj',size:3});
  const {plan}=await makeOriginalOwnerDryRun(encode(n),hub(),now);
  expect(plan.rows[0]?.originalAttachmentIds).toEqual(['source-attachment']);
  const receipt=reviewOriginalOwnerCases(plan,[{kind:'note',originalId:'hub-note',
   observedStatus:'ID_COLLISION',choice:'REVIEW_SOURCE'}],plan.originalFileSha256,4);
  expect(receipt.selected.REVIEW_SOURCE).toBe(1);
  expect(receipt.readyToMigrate).toBe(false);
  expect(receipt.held).toBe(1);
 });
 it('rejects stale source hash and competing decisions without altering original data',async()=>{
  const f=folio();f.data.tasks!.push({id:'hub-shared',title:'Existing task'});
  const {plan}=await makeOriginalOwnerDryRun(encode(f),hub(),now);
  const yes={kind:'task',originalId:'hub-shared',observedStatus:'ID_COLLISION',choice:'KEEP_SEPARATE'} as const;
  expect(()=>reviewOriginalOwnerCases(plan,[yes], 'a'.repeat(64),4)).toThrow('stale');
  expect(()=>reviewOriginalOwnerCases(plan,[yes], plan.originalFileSha256,5)).toThrow('stale');
  expect(()=>reviewOriginalOwnerCases(plan,[yes,yes],plan.originalFileSha256,4)).toThrow('competing');
  expect(()=>reviewOriginalOwnerCases(plan,[{...yes,originalId:'missing'}],plan.originalFileSha256,4)).toThrow('unknown');
  expect(()=>reviewOriginalOwnerCases(plan,[{...yes,observedStatus:'SOURCE_ONLY'}],plan.originalFileSha256,4)).toThrow('changed');
  expect(()=>reviewOriginalOwnerCases(plan,[{...yes,choice:'REPLACE_HUB' as any}],plan.originalFileSha256,4)).toThrow('unsupported');
 });
});
