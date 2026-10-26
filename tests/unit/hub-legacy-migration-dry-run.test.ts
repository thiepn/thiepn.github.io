import {describe,it,expect} from 'vitest';
import {makeOriginalOwnerDryRun,renderOriginalOwnerDryRun} from '../../src/lib/workspace/legacy-migration-dry-run';
import type {WorkspaceState} from '../../src/lib/workspace/types';
const now=Date.parse('2026-10-26T10:00:00Z');
const state=():WorkspaceState=>({
 schemaVersion:1,revision:27,active:'w',workspaces:[],
 preferences:{rail:true,density:'comfortable',timezone:'Europe/Berlin',hidden:false},
 tasks:[{id:'collision',title:'Original task',notes:'private',due:'',time:'',priority:'high',completedAt:null}],
 notes:[{id:'hub-note',title:'Study',body:'Private body remains',updatedAt:'2026-10-26T09:00:00Z'}],
 events:[],trackers:[],logs:[],activity:[],captureDraft:'',legacyBackup:null,
});
const bytes=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v));
const folio=()=>({
 format:'folio-backup',version:24,exportedAt:'2026-10-26T09:00:00Z',
 data:Object.fromEntries(['tasks','projects','habits','habitEntries','timeBlocks','dailyPlans','dailyPlanItems',
 'focusSessions','recurringSeries','settings','importBatches','reviewRecords','reminders','reminderOccurrences',
 'folders','lists','sections','tags','notes','attachments','habitGroups','habitTemplates'].map(k=>[k,[]])) as Record<string,Record<string,unknown>[]>
});
const notes=()=>({format:'thiepn.notes.backup',formatVersion:2,databaseVersion:3,exportedAt:now,
 data:{notes:[] as Record<string,unknown>[],checklistItems:[],labels:[],noteLabels:[],attachments:[],reminders:[] as Record<string,unknown>[],revisions:[],settings:[]}});
describe('source-owner migration dry-run, never a write authority',()=>{
 it('retains original IDs and identifies collisions and orphaned Folio references without rewriting Hub',async()=>{
  const f=folio();
  f.data.tasks!.push({id:'collision',title:'Original task'}, {id:'source-task',title:'New work',projectId:'missing-project'});
  f.data.notes!.push({id:'folio-note',title:'Study',sourceTaskId:'source-task'});
  f.data.habits!.push({id:'habit-source',title:'Track'});
  const hub=state(),before=JSON.stringify({f,hub});
  const {preflight,plan}=await makeOriginalOwnerDryRun(bytes(f),hub,now);
  expect(preflight.owner).toBe('folio');
  expect(plan.counts).toEqual({ID_COLLISION:1,TITLE_AMBIGUITY:1,SOURCE_ONLY:1,MISSING_RELATION:1});
  expect(plan.rows.map(x=>x.proposedOriginalId)).toEqual(plan.rows.map(x=>x.originalId));
  expect(plan.rows.find(x=>x.originalId==='source-task')?.sourceRelations).toEqual(['projectId absent from projects']);
  expect(plan).toMatchObject({blocked:true,writes:0,approvalRequired:true,sourceAuthenticated:false,hubRevision:27});
  expect(JSON.stringify({f,hub})).toBe(before);
  const ui=renderOriginalOwnerDryRun(plan);
  expect(ui).not.toContain('Private body remains');
  expect(ui).not.toContain('source-task');
  expect(ui).toContain('No records imported or merged');
 });
 it('keeps a Notes file in its separate original namespace, even when original IDs match Hub',async()=>{
  const n=notes();n.data.notes.push({id:'hub-note',title:'Unrelated'} ,{id:'different',title:'Study'});
  const {plan}=await makeOriginalOwnerDryRun(bytes(n),state(),now);
  expect(plan.owner).toBe('notes');
  expect(plan.counts).toEqual({ID_COLLISION:1,TITLE_AMBIGUITY:1,SOURCE_ONLY:0,MISSING_RELATION:0});
  expect(plan.rows.every(x=>x.destinationWrites===0&&x.originalId===x.proposedOriginalId)).toBe(true);
  expect(plan.rows[0]!.originalId).toBe('hub-note');
 });
 it('does not accept compromised original-owner export preflight or forward untrusted data to Hub',async()=>{
  const n=notes();n.data.notes.push({id:'one',title:'A'},{id:'one',title:'B'});
  await expect(makeOriginalOwnerDryRun(bytes(n),state(),now)).rejects.toThrow('duplicate');
  n.data.notes.pop();n.data.reminders.push({id:'reminder',noteId:'missing'});
  await expect(makeOriginalOwnerDryRun(bytes(n),state(),now)).rejects.toThrow('missing original note');
 });
 it('is deterministic under repeated inspection and preserves source SHA-256',async()=>{
  const f=folio();f.data.tasks!.push({id:'only-original',title:'Unique'});
  const input=bytes(f),s=state();
  const one=await makeOriginalOwnerDryRun(input,s,now);
  const two=await makeOriginalOwnerDryRun(input,s,now);
  expect(one).toEqual(two);
  expect(one.plan.originalFileSha256).toBe(one.preflight.sha256);
  expect(one.plan.rows[0]).toMatchObject({status:'SOURCE_ONLY',originalId:'only-original',destinationWrites:0});
 });
});
