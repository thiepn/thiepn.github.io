import {describe,it,expect} from 'vitest';
import {initialState} from '../../src/lib/workspace/model';
import {taskSnapshot} from '../../src/lib/workspace/weekly-followthrough';
import {prepareDistributedWeek,applyDistributedWeek} from '../../src/lib/workspace/distributed-planning';
import {freshFolioPlanningShare,folioDayLoad,folioPlanningDays,folioConflictActions,renderFolioPlanningContinuity} from '../../src/lib/workspace/folio-continuity';
import type {FolioDeviceSnapshot} from '../../src/lib/workspace/folio-device';
import type {Task} from '../../src/lib/workspace/types';

const now=Date.parse('2026-10-19T10:00:00Z');
const shared=():FolioDeviceSnapshot=>({
 schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
 generatedAt:new Date(now).toISOString(),date:'2026-10-19',
 pendingCount:4,overdueCount:1,notes:[],habits:[],
 tasks:[
  {id:'owner-task',title:'Folio private <task>',priority:'high',plannedToday:true},
  {id:'deadline',title:'Folio due later',priority:'medium',plannedToday:false,deadline:'2026-10-21'},
  {id:'same-day',title:'Once',priority:'low',plannedToday:false,plannedDate:'2026-10-20',deadline:'2026-10-20'},
 ],
 events:[
  {id:'owner-block',title:'Folio <meeting>',start:'2026-10-20T08:30:00Z',
   end:'2026-10-20T09:30:00Z',kind:'event',allDay:false},
  {id:'owner-night',title:'Evening block',start:'2026-10-20T22:30:00Z',
   end:'2026-10-21T00:30:00Z',kind:'event',allDay:false},
 ],
});
const hub=()=>{
 const s=initialState([],null);s.preferences.timezone='Europe/Berlin';
 s.events.push({id:'hub-meeting',title:'Hub appointment',date:'2026-10-20',endDate:'2026-10-20',
   start:'2026-10-20T08:00:00Z',end:'2026-10-20T09:00:00Z',zone:'Europe/Berlin',allDay:false});
 return s;
};
const newTask=(id:string):Task=>({id,title:id,notes:'',due:'',time:'',priority:'high',completedAt:null});
describe('original Folio day/week continuity',()=>{
 it('projects original task dates and end-exclusive time blocks in Hub timezone without mutating owner data',()=>{
  const s=hub(),source=shared(),before=JSON.stringify(source);
  const monday=folioDayLoad(source,'2026-10-19','Europe/Berlin',s);
  expect(monday.tasks.map(t=>t.id)).toEqual(['owner-task']);
  const tuesday=folioDayLoad(source,'2026-10-20','Europe/Berlin',s);
  expect(tuesday.tasks.map(t=>t.id)).toEqual(['same-day']);
  expect(tuesday.timed).toBe(1);
  expect(tuesday.overlapPairs).toBe(1);
  const wednesday=folioDayLoad(source,'2026-10-21','Europe/Berlin',s);
  expect(wednesday.tasks.map(t=>t.id)).toEqual(['deadline']);
  expect(wednesday.timed).toBe(1);
  expect(folioPlanningDays(source,'2026-10-19','week',s)).toHaveLength(7);
  expect(JSON.stringify(source)).toBe(before);
 });
 it('gates stale owner shares and refuses to show titles without consent',()=>{
  const s=hub(),source=shared();
  expect(freshFolioPlanningShare(source,now+1000)).toBe(source);
  expect(freshFolioPlanningShare(source,now+16*60_000)).toBeNull();
  expect(freshFolioPlanningShare(null,now)).toBeNull();
  const empty=renderFolioPlanningContinuity(s,'2026-10-19','week',null,now);
  expect(empty).not.toContain('Folio private');
  const expired=renderFolioPlanningContinuity(s,'2026-10-19','week',source,now+16*60_000);
  expect(expired).toContain('too old');
  expect(expired).not.toContain('Folio private');
 });
 it('escapes metadata, shows source-original destinations, and never fabricates Hub relations',()=>{
  const html=renderFolioPlanningContinuity(hub(),'2026-10-20','day',shared(),now);
  expect(html).toContain('Folio &lt;meeting&gt;');
  expect(html).toContain('Once');
  expect(html).toContain('possible Hub/Folio timed overlap');
  expect(html).toContain('/folio/?view=planner');
  expect(html).not.toContain('<meeting>');
  expect(html).not.toContain('data-action="complete-task"');
  expect(html).not.toContain('data-action="edit-task"');
  expect(html).toContain('Nothing shown here is imported');
 });
 it('uses Folio hints only when explicitly passed to the original Hub distribution writer',()=>{
  const s=initialState([],null);s.preferences.timezone='Europe/Berlin';
  s.tasks.push(newTask('first'),newTask('second'));
  const originals=s.tasks.map(taskSnapshot),before=JSON.stringify(s);
  const plain=prepareDistributedWeek(s,originals,'2026-10-19',3);
  const opted=prepareDistributedWeek(s,originals,'2026-10-19',3,shared());
  expect(plain.folioConsidered).toBe(false);
  expect(opted.folioConsidered).toBe(true);
  expect(opted.load[0]?.folioTasks).toBeGreaterThan(0);
  expect(opted.changes.map(change=>change.after)).not.toEqual(plain.changes.map(change=>change.after));
  expect(JSON.stringify(s)).toBe(before);
  const applied=applyDistributedWeek(s,originals,'2026-10-19',3,shared());
  expect(applied.changes).toEqual(opted.changes);
  expect(s.tasks.map(task=>task.id)).toEqual(['first','second']);
  expect(s.events).toHaveLength(0);
  expect(()=>applyDistributedWeek(s,originals,'2026-10-19',3,shared())).toThrow('changed');
 });
 it('routes source-shared overlap review only to the original Hub event, never the Folio owner',()=>{
  const state=hub(),source=shared(),before=JSON.stringify(state),original=JSON.stringify(source);
  const clashes=folioConflictActions(state,['2026-10-20','2026-10-20','2026-10-21'],source,now);
  expect(clashes).toHaveLength(1);
  expect(clashes[0]).toMatchObject({day:'2026-10-20',hubEventId:'hub-meeting',
   folioTitle:'Folio <meeting>',minutes:30});
  const html=renderFolioPlanningContinuity(state,'2026-10-20','day',source,now);
  expect(html).toContain('data-folio-conflict-review');
  expect(html).toContain('data-action="review-event-time" data-id="hub-meeting"');
  expect(html).not.toContain('data-id="owner-block"');
  expect(html).toContain('Folio &lt;meeting&gt;');
  expect(folioConflictActions(state,['2026-10-20'],null,now)).toEqual([]);
  expect(folioConflictActions(state,['2026-10-20'],source,now+16*60_000)).toEqual([]);
  expect(JSON.stringify(state)).toBe(before);
  expect(JSON.stringify(source)).toBe(original);
 });
});
