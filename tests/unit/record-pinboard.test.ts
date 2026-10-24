import {describe,it,expect} from 'vitest';
import {initialState,parseState} from '../../src/lib/workspace/model';
import {
  enableHubPinboard,toggleHubRecordPin,moveHubRecordPin,hubPinboard,
  hasHubPin,projectedHubPins,renderHubPinboard,hubPinnedKeys,
  validateHubPinConfig,parseHubPin,MAX_HUB_PINS,
} from '../../src/lib/workspace/record-pinboard';
import type {WorkspaceState,Task,Note,CalendarEvent,Tracker} from '../../src/lib/workspace/types';

const task=(id:string,title:string):Task=>({id,title,notes:'private body',due:'',
 time:'',priority:'high',completedAt:null});
const note=(id:string,title:string):Note=>({id,title,body:'private note body',
 updatedAt:'2026-10-17T13:00:00Z'});
const event=(id:string,title:string):CalendarEvent=>({id,title,date:'2026-10-18',
 endDate:'2026-10-18',start:'2026-10-18T08:00:00Z',
 end:'2026-10-18T09:00:00Z',zone:'Europe/Berlin',allDay:false});
const tracker=(id:string,title:string):Tracker=>({id,title,kind:'count',unit:'sessions',
 goal:5,cadence:'weekly'});
const setup=()=>{
 const s=initialState([],null);
 s.tasks.push(task('task-a','Review <DGL>'));
 s.notes.push(note('note-a','Lecture & proofs'));
 s.events.push(event('event-a','Class meeting'));
 s.trackers.push(tracker('tracker-a','Practice sessions'));
 return s;
};
describe('workspace-scoped original Hub record pinboard',()=>{
 it('validates typed source IDs and enforces bounded, duplicate-free widget config',()=>{
  expect(parseHubPin('task:task-a')).toEqual({kind:'task',id:'task-a'});
  for(const key of ['external:record','notes:item','task:','task:<script>','',null]) {
    expect(parseHubPin(key)).toBeNull();
  }
  expect(validateHubPinConfig(['task:task-a','note:note-a'])).toBe(true);
  expect(validateHubPinConfig(['task:task-a','task:task-a'])).toBe(false);
  expect(validateHubPinConfig(Array.from({length:MAX_HUB_PINS+1},(_,i)=>'task:original-'+i))).toBe(false);
 });
 it('pins four kinds into existing Workspace.widget.config using original IDs only; survives schema parse',()=>{
  const s=setup();
  for(const pin of ['task:task-a','note:note-a','event:event-a','tracker:tracker-a']){
    expect(toggleHubRecordPin(s,pin)).toBe(true);
  }
  const board=hubPinboard(s)!;
  expect(board.type).toBe('record-pinboard');
  expect(board.config.pins).toEqual(['task:task-a','note:note-a','event:event-a','tracker:tracker-a']);
  expect(projectedHubPins(s).map(x=>x.title)).toEqual(['Review <DGL>','Lecture & proofs','Class meeting','Practice sessions']);
  const after=parseState(JSON.stringify(s));
  expect(hubPinnedKeys(hubPinboard(after))).toEqual(board.config.pins);
  expect(JSON.stringify(board.config)).not.toContain('private body');
  expect(JSON.stringify(board.config)).not.toContain('Lecture & proofs');
  expect(JSON.stringify(board.config)).not.toContain('originalSecret');
 });
 it('opens original record actions and escapes unsafe titles without exposing bodies or foreign records',()=>{
  const s=setup();
  toggleHubRecordPin(s,'task:task-a');
  toggleHubRecordPin(s,'note:note-a');
  toggleHubRecordPin(s,'event:event-a');
  toggleHubRecordPin(s,'tracker:tracker-a');
  const html=renderHubPinboard(s,true);
  expect(html).toContain('Review &lt;DGL&gt;');
  expect(html).toContain('Lecture &amp; proofs');
  expect(html).toContain('data-action="context-task" data-id="task-a"');
  expect(html).toContain('data-action="edit-note" data-id="note-a"');
  expect(html).toContain('data-action="context-event" data-id="event-a"');
  expect(html).toContain('data-action="log-tracker" data-id="tracker-a"');
  expect(html).not.toContain('private body');
  expect(html).not.toContain('private note body');
  expect(html).not.toContain('<DGL>');
  expect(html).not.toContain('/folio/');
 });
 it('reorders and unpins without altering or completing original source records',()=>{
  const s=setup(),sources=JSON.stringify({tasks:s.tasks,notes:s.notes,events:s.events,trackers:s.trackers});
  toggleHubRecordPin(s,'task:task-a');
  toggleHubRecordPin(s,'note:note-a');
  expect(moveHubRecordPin(s,'note:note-a',-1)).toBe(true);
  expect(hubPinnedKeys(hubPinboard(s))).toEqual(['note:note-a','task:task-a']);
  expect(moveHubRecordPin(s,'note:note-a',-1)).toBe(false);
  expect(toggleHubRecordPin(s,'note:note-a')).toBe(false);
  expect(hasHubPin(s,'note:note-a')).toBe(false);
  expect(JSON.stringify({tasks:s.tasks,notes:s.notes,events:s.events,trackers:s.trackers}))
    .toBe(sources);
 });
 it('does not resurrect removed records or pin unknown owner references',()=>{
  const s=setup();toggleHubRecordPin(s,'task:task-a');
  s.tasks=[];
  const rows=projectedHubPins(s);
  expect(rows).toMatchObject([{available:false,title:'Original record unavailable'}]);
  const html=renderHubPinboard(s);
  expect(html).toContain('Original record unavailable');
  expect(html).toContain('data-action="toggle-record-pin"');
  expect(html).not.toContain('Review &lt;DGL&gt;');
  expect(()=>toggleHubRecordPin(s,'external:owner-a')).toThrow();
  expect(()=>toggleHubRecordPin(s,'task:missing')).toThrow();
  expect(toggleHubRecordPin(s,'task:task-a')).toBe(false);
 });
 it('isolates pins to the active original workspace and never adds external owner IDs',()=>{
  const s=setup();
  enableHubPinboard(s);enableHubPinboard(s);
  expect(s.workspaces[0]!.widgets.filter(x=>x.type==='record-pinboard')).toHaveLength(1);
  toggleHubRecordPin(s,'task:task-a');
  const another=structuredClone(s.workspaces[0]!);
  another.id='second';
  another.widgets=another.widgets.filter(x=>x.type!=='record-pinboard');
  s.workspaces.push(another);
  s.active='second';
  expect(hubPinboard(s)).toBeNull();
  expect(projectedHubPins(s)).toEqual([]);
  s.active=s.workspaces[0]!.id;
  expect(hasHubPin(s,'task:task-a')).toBe(true);
 });
});
