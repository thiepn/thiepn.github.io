import {describe,it,expect} from 'vitest';
import {renderIntegratedHome} from '../../src/lib/workspace/home-panel';
import {renderHubLanguageToday,renderSourceToday} from '../../src/lib/workspace/source-today';
import {renderTodayWorkbench} from '../../src/lib/workspace/today-workbench';
import type {WorkspaceState} from '../../src/lib/workspace/types';
import type {FolioDeviceSnapshot} from '../../src/lib/workspace/folio-device';
import type {NotesDeviceSummary} from '../../src/lib/workspace/notes-device';

const state=():WorkspaceState=>({
  schemaVersion:1,revision:0,active:'w',workspaces:[],
  preferences:{rail:true,density:'comfortable',timezone:'Europe/Berlin',hidden:false},
  tasks:[],events:[],notes:[],trackers:[],logs:[],activity:[],captureDraft:'',legacyBackup:null,
});
function sources(){
 const time=new Date().toISOString();
 const folio={
  schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
  date:time.slice(0,10),generatedAt:time,pendingCount:1,overdueCount:0,
  tasks:[{id:'source-task',title:'FOLIO PRIVATE TOKEN',priority:'high',plannedToday:true}],
  events:[],notes:[{id:'source-note',title:'FOLIO SECRET NOTE',updatedAt:time}],habits:[],
 } as unknown as FolioDeviceSnapshot;
 const notes={
  schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',
  generatedAt:time,activeCount:1,
  notes:[{id:'old-note',title:'NOTES PRIVATE TOKEN',updatedAt:time,pinned:true}],
  reminders:[],
 } as unknown as NotesDeviceSummary;
 return {folio,notes};
}
describe('Hub consolidation: bounded owner-native retirement',()=>{
 it('renders native local note and new Knowledge access, not duplicate source cards',()=>{
  const s=state();s.notes=[{id:'original',title:'Hub original note',body:'Local only',updatedAt:new Date().toISOString()}];
  const original=JSON.stringify(s),{folio,notes}=sources();
  const html=renderIntegratedHome(s,'signed-out',[],null,[],
   {status:'ready',snapshot:folio},{status:'ready',snapshot:notes});
  expect(html).toContain('Hub original note');
  expect(html).toContain('/home/knowledge/');
  expect(html).not.toContain('FOLIO PRIVATE TOKEN');
  expect(html).not.toContain('NOTES PRIVATE TOKEN');
  expect(html).not.toContain('data-folio-device');
  expect(html).not.toContain('data-notes-source');
  expect(JSON.stringify(s)).toBe(original);
 });
 it('keeps Hub Today native even if fresh external snapshots are supplied',()=>{
  const s=state();s.notes=[{id:'native',title:'Native Knowledge note',body:'',updatedAt:new Date().toISOString()}];
  const {folio,notes}=sources();
  const html=renderTodayWorkbench(s,new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Berlin'}),
    folio,Date.now(),notes,true);
  expect(html).toContain('Native Knowledge note');
  expect(html).not.toContain('FOLIO PRIVATE TOKEN');
  expect(html).not.toContain('NOTES PRIVATE TOKEN');
  expect(html).not.toContain('data-workbench-source-actions');
  expect(html).not.toContain('data-notes-reminder-horizon');
 });
 it('shows real language owner snapshots without adding Folio/Notes launch controls',()=>{
  const {folio,notes}=sources();
  const html=renderHubLanguageToday({
   folio:{status:'ready',snapshot:folio},notes:{status:'ready',snapshot:notes},
   languages:{status:'signed-out',cards:[]},apps:[],
  });
  expect(html).toContain('Sign in');
  expect(html).not.toContain('Share from Folio');
  expect(html).not.toContain('Share from Notes');
  expect(html).not.toContain('FOLIO PRIVATE TOKEN');
  expect(html).not.toContain('NOTES PRIVATE TOKEN');
 });
 it('retains the explicit legacy source renderer, original IDs, and one-time consent boundary',()=>{
  const {folio,notes}=sources(),before=JSON.stringify({folio,notes});
  const html=renderSourceToday({
   folio:{status:'ready',snapshot:folio},notes:{status:'ready',snapshot:notes},
   languages:{status:'signed-out',cards:[]},apps:[],
  });
  expect(html).toContain('FOLIO PRIVATE TOKEN');
  expect(html).toContain('NOTES PRIVATE TOKEN');
  expect(html).toContain('data-action="connect-folio"');
  expect(html).toContain('data-action="connect-notes-source"');
  expect(JSON.stringify({folio,notes})).toBe(before);
 });
});
