import {describe,it,expect} from 'vitest';
import {inspectOriginalOwnerExport,renderOriginalExportPreflight,ORIGINAL_EXPORT_SOURCE} from '../../src/lib/workspace/legacy-full-export-preflight';
import type {WorkspaceState} from '../../src/lib/workspace/types';
const now=Date.parse('2026-10-26T10:00:00Z');
const state=():WorkspaceState=>({schemaVersion:1,revision:0,active:'w',workspaces:[],
 preferences:{rail:true,density:'comfortable',timezone:'Europe/Berlin',hidden:false},
 tasks:[{id:'same-id',title:'My task',notes:'',due:'',time:'',priority:'high',completedAt:null}],
 events:[],notes:[{id:'hub-note',title:'Study note',body:'Private Hub body',updatedAt:new Date(now).toISOString()}],
 trackers:[],logs:[],activity:[],captureDraft:'',legacyBackup:null});
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
const folio=()=>({
 format:'folio-backup',version:24,exportedAt:'2026-10-26T09:00:00Z',
 data:Object.fromEntries(['tasks','projects','habits','habitEntries','timeBlocks','dailyPlans','dailyPlanItems',
 'focusSessions','recurringSeries','settings','importBatches','reviewRecords','reminders','reminderOccurrences',
 'folders','lists','sections','tags','notes','attachments','habitGroups','habitTemplates'].map(k=>[k,[]])) as Record<string,unknown[]>
});
const notes=()=>({
 format:'thiepn.notes.backup',formatVersion:2,databaseVersion:3,exportedAt:now,
 data:{notes:[] as Record<string,unknown>[],checklistItems:[] as Record<string,unknown>[],
 labels:[] as Record<string,unknown>[],noteLabels:[] as Record<string,unknown>[],
 attachments:[] as Record<string,unknown>[],reminders:[] as Record<string,unknown>[],
 revisions:[] as Record<string,unknown>[],settings:[] as Record<string,unknown>[]}
});
describe('source-pinned original-owner export preflight: always read-only',()=>{
 it('accepts a bounded original Folio v24 candidate but keeps every migration hold',async()=>{
  const data=folio();data.data.tasks!.push({id:'same-id',title:'My task'});
  data.data.notes!.push({id:'somewhere-else',title:'STUDY note'});
  const src=bytes(data),before=Uint8Array.from(src),hub=state(),snapshot=JSON.stringify(hub);
  const result=await inspectOriginalOwnerExport(src,hub,now);
  expect(result.owner).toBe('folio');expect(result.sameTitleCount).toBe(2);
  expect(result.sameIdCount).toBe(1);expect(result.eligibleToMigrate).toBe(false);
  expect(result.originAuthenticated).toBe(false);expect(result.reviewHolds.length).toBeGreaterThan(3);
  expect(result.sourceRevision).toBe(ORIGINAL_EXPORT_SOURCE.folio.serviceBlob);
  expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect([...src]).toEqual([...before]);expect(JSON.stringify(hub)).toBe(snapshot);
  const rendered=renderOriginalExportPreflight(result);
  expect(rendered).not.toContain('Private Hub body');expect(rendered).not.toContain('Study note');
  expect(rendered).toContain('Migration not authorized');
 });
 it('inspects actual Notes format v2/database 3 without flattening reminders or sensitive contents',async()=>{
  const raw=notes();raw.data.notes.push({id:'note-one',title:'Study note',body:'Original private body'});
  raw.data.reminders.push({id:'rem-one',noteId:'note-one',title:'Payment'});
  const plan=await inspectOriginalOwnerExport(bytes(raw),state(),now);
  expect(plan.counts).toMatchObject({notes:1,reminders:1});
  expect(plan.sameTitleCount).toBe(1);expect(plan.sameIdCount).toBe(0);
  const ui=renderOriginalExportPreflight(plan);
  expect(ui).not.toContain('Original private body');expect(ui).not.toContain('Payment');
  expect(plan.originAuthenticated).toBe(false);
 });
 it('rejects cross-owner format impersonation and old/new schemas',async()=>{
  await expect(inspectOriginalOwnerExport(bytes({format:'THIEPN Hub',data:{}}),state(),now)).rejects.toThrow('Unsupported');
  const f=folio();f.version=23;
  await expect(inspectOriginalOwnerExport(bytes(f),state(),now)).rejects.toThrow('v24');
  const n=notes();n.formatVersion=1;
  await expect(inspectOriginalOwnerExport(bytes(n),state(),now)).rejects.toThrow('v2');
 });
 it('rejects duplicate owner IDs and orphaned Notes links before suggesting any continuity',async()=>{
  const n=notes();n.data.notes.push({id:'a',title:'A'},{id:'a',title:'B'});
  await expect(inspectOriginalOwnerExport(bytes(n),state(),now)).rejects.toThrow('duplicate');
  n.data.notes.pop();n.data.reminders.push({id:'r',noteId:'deleted',title:'Private'});
  await expect(inspectOriginalOwnerExport(bytes(n),state(),now)).rejects.toThrow('missing original note');
 });
 it('checks real attachment SHA-256 rather than trusting claimed hashes',async()=>{
  const n=notes();n.data.notes.push({id:'a',title:'Original'});
  n.data.attachments.push({id:'att',noteId:'a',size:3,dataBase64:'YWJj',dataSha256:'0'.repeat(64)});
  await expect(inspectOriginalOwnerExport(bytes(n),state(),now)).rejects.toThrow('SHA-256/size');
  n.data.attachments[0]!.dataSha256='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  const valid=await inspectOriginalOwnerExport(bytes(n),state(),now);
  expect(valid.counts.attachments).toBe(1);
 });
 it('rejects invalid UTF8, future dated exports and oversize files before parsing',async()=>{
  await expect(inspectOriginalOwnerExport(new Uint8Array([0xff]),state(),now)).rejects.toThrow('UTF-8');
  const n=notes();n.exportedAt=now+600_000;
  await expect(inspectOriginalOwnerExport(bytes(n),state(),now)).rejects.toThrow('future timestamp');
  await expect(inspectOriginalOwnerExport(new Uint8Array(64*1024*1024+1),state(),now)).rejects.toThrow('64 MiB');
 });
});
