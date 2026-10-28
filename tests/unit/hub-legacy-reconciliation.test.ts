import {describe,it,expect} from 'vitest';
import {previewLegacyReconciliation,renderLegacyReconciliation} from '../../src/lib/workspace/legacy-reconciliation';
import type {WorkspaceState} from '../../src/lib/workspace/types';
import type {FolioDeviceSnapshot} from '../../src/lib/workspace/folio-device';
import type {NotesDeviceSummary} from '../../src/lib/workspace/notes-device';
const now=Date.parse('2026-10-26T10:00:00Z');
const hub=():WorkspaceState=>({schemaVersion:1,revision:0,active:'w',workspaces:[],preferences:{rail:true,density:'comfortable',timezone:'Europe/Berlin',hidden:false},
 tasks:[{id:'same-id',title:'My task',notes:'',due:'',time:'',priority:'none',completedAt:null}],
 notes:[{id:'original',title:'Same NOTE',body:'Never copy me',updatedAt:'2026-10-25T14:00:00Z'}],events:[],trackers:[],logs:[],activity:[],captureDraft:'',legacyBackup:null});
const folio=(timestamp='2026-10-26T10:00:00Z'):FolioDeviceSnapshot=>({schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
 generatedAt:timestamp,date:'2026-10-26',pendingCount:1,overdueCount:0,
 tasks:[{id:'same-id',title:'My task',priority:'high',plannedToday:true}],events:[],
 notes:[{id:'other-note',title:' SAME note ',updatedAt:timestamp}],habits:[]});
const notes=():NotesDeviceSummary=>({schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',generatedAt:'2026-10-26T10:00:00Z',
 activeCount:4,notes:[{id:'x',title:'Different note',updatedAt:'2026-10-25T10:00:00Z',pinned:false}],
 reminders:[{id:'r1',noteId:'x',title:'My task',dueAt:'2026-10-27T10:00:00Z'}]});
describe('read-only legacy title-only reconciliation',()=>{
 it('detects ambiguous same-title and cross-owner ID while preserving original state',()=>{
  const s=hub(),f=folio(),n=notes(),before=JSON.stringify({s,f,n});
  const report=previewLegacyReconciliation(s,f,n,now);
  expect(report).toMatchObject({status:'partial-preview',rows:4,possibleSameTitle:2,sameIdAcrossOwners:1,importable:0,incomplete:true});
  expect(JSON.stringify({s,f,n})).toBe(before);
 });
 it('does not misclassify a Notes reminder as a Hub task, even with the same title',()=>{
  const r=previewLegacyReconciliation(hub(),null,notes(),now);
  expect(r.possibleSameTitle).toBe(0);expect(r.importable).toBe(0);
 });
 it('rejects expired source claims and never invents an eligible migration',()=>{
  const r=previewLegacyReconciliation(hub(),folio('2026-10-25T10:00:00Z'),null,now);
  expect(r).toEqual({status:'no-share',rows:0,possibleSameTitle:0,sameIdAcrossOwners:0,incomplete:true,importable:0});
 });
 it('never renders original private titles, plaintext or fake migration controls',()=>{
  const html=renderLegacyReconciliation(previewLegacyReconciliation(hub(),folio(),notes(),now));
  expect(html).toContain('possible same-title matches');
  for(const term of ['Same NOTE','Never copy me','My task','data-action="import"'])expect(html).not.toContain(term);
  expect(html).toContain('No records can be imported');
 });
});
