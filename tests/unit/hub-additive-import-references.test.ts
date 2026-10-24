import {describe,it,expect} from 'vitest';
import {initialState,parseState} from '../../src/lib/workspace/model';
import {saveOutcome,outcomes} from '../../src/lib/workspace/outcome-board';
import {saveDecision,decisions} from '../../src/lib/workspace/decision-register';
import {linkTaskEvent,taskEventLinks} from '../../src/lib/workspace/task-event-links';
import {toggleHubRecordPin,hubPinnedKeys,hubPinboard} from '../../src/lib/workspace/record-pinboard';
import {rebaseAddedHubBackup} from '../../src/lib/workspace/additive-import-references';

function sample(){
 const s=initialState([],null);
 // These IDs deliberately collide across kinds; a single Map is unsafe.
 const common='legacy-shared';
 s.tasks.push({id:common,title:'Original imported task',notes:'private',due:'',time:'',priority:'high',completedAt:null});
 s.notes.push({id:common,title:'Original imported note',body:'protected',updatedAt:'2026-10-18T12:00:00Z'});
 s.events.push({id:common,title:'Original imported block',date:'2026-10-18',endDate:'2026-10-18',
   start:'2026-10-18T08:00:00Z',end:'2026-10-18T09:00:00Z',zone:'Europe/Berlin',allDay:false});
 s.trackers.push({id:common,title:'Original tracker',kind:'count',goal:3,unit:'times',cadence:'daily'});
 s.logs.push({id:'log1',trackerId:common,date:'2026-10-18',value:1,note:'confirmed'});
 const w=s.workspaces[0]!;
 w.widgets.find(x=>x.type==='tracker-summary')!.config.trackerIds=[common];
 saveOutcome(s,null,{title:'Analysis',target:'',taskIds:[common],trackerIds:[common]},null);
 saveDecision(s,null,{title:'Research direction',context:'',options:['A','B'],review:'',taskId:common,noteId:common},null);
 linkTaskEvent(s,{taskId:common,eventId:common,role:'work'});
 toggleHubRecordPin(s,'task:'+common);
 toggleHubRecordPin(s,'note:'+common);
 toggleHubRecordPin(s,'event:'+common);
 toggleHubRecordPin(s,'tracker:'+common);
 return s;
}
describe('additive Hub backup reference rebase',()=>{
 it('remaps every original Hub owner link by source kind, not a shared old-ID map',()=>{
  const source=sample(),snapshot=JSON.stringify(source);
  const next=rebaseAddedHubBackup(parseState(snapshot));
  expect(next.tasks[0]!.id).not.toBe('legacy-shared');
  expect(new Set([next.tasks[0]!.id,next.notes[0]!.id,next.events[0]!.id,next.trackers[0]!.id]).size).toBe(4);
  const o=outcomes(next)[0]!,d=decisions(next)[0]!,r=taskEventLinks(next)[0]!;
  expect(o.taskIds).toEqual([next.tasks[0]!.id]);expect(o.trackerIds).toEqual([next.trackers[0]!.id]);
  expect(d.taskId).toBe(next.tasks[0]!.id);expect(d.noteId).toBe(next.notes[0]!.id);
  expect(r.taskId).toBe(next.tasks[0]!.id);expect(r.eventId).toBe(next.events[0]!.id);
  expect(next.logs[0]!.trackerId).toBe(next.trackers[0]!.id);
  const pins=hubPinnedKeys(hubPinboard(next));
  expect(pins).toEqual(['task:'+next.tasks[0]!.id,'note:'+next.notes[0]!.id,
   'event:'+next.events[0]!.id,'tracker:'+next.trackers[0]!.id]);
  expect(next.workspaces[0]!.widgets.find(w=>w.type==='tracker-summary')!.config.trackerIds).toEqual([next.trackers[0]!.id]);
  expect(JSON.stringify(source)).toBe(snapshot);expect(parseState(JSON.stringify(next)).schemaVersion).toBe(1);
 });
 it('makes missing source links safely unavailable rather than pointing to existing records',()=>{
  const old=sample();old.tasks=[];
  const newer=rebaseAddedHubBackup(old);
  expect(outcomes(newer)[0]!.taskIds[0]).not.toBe('legacy-shared');
  expect(newer.tasks).toHaveLength(0);
  expect(decisions(newer)[0]!.taskId).toBe(outcomes(newer)[0]!.taskIds[0]);
  expect(taskEventLinks(newer)[0]!.taskId).toBe(outcomes(newer)[0]!.taskIds[0]);
 });
 it('refuses unknown future widget formats instead of partially copying owner data',()=>{
  const old=sample();old.workspaces[0]!.widgets[0]!.type='future-owned-widget';
  expect(()=>rebaseAddedHubBackup(old)).toThrow('unknown widget');
  expect(old.workspaces[0]!.widgets[0]!.type).toBe('future-owned-widget');
 });
});
