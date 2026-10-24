import {describe,it,expect} from 'vitest';
import {initialState} from '../../src/lib/workspace/model';
import {
  projectEventPreparation,preparationTaskSeed,preparationNoteSeed,
  renderEventPreparation,upcomingEventPreparation,renderUpcomingEventPreparation,
} from '../../src/lib/workspace/event-preparation';
import type {CalendarEvent,Task,Note} from '../../src/lib/workspace/types';
import type {FolioDeviceSnapshot} from '../../src/lib/workspace/folio-device';
import type {NotesDeviceSummary} from '../../src/lib/workspace/notes-device';

const NOW=Date.parse('2026-10-17T12:00:00Z');
const event=(date='2026-10-20'):CalendarEvent=>({
 id:'original-event',title:'Differential Equations <exam>',date,endDate:date,
 start:date+'T08:00:00Z',end:date+'T09:00:00Z',zone:'Europe/Berlin',allDay:false,
});
const task=(id:string,title:string,due=''):Task=>({
 id,title,notes:'',due,time:'',priority:'medium',completedAt:null,
});
const note=(id:string,title:string):Note=>({
 id,title,body:'Reference proof',updatedAt:'2026-10-15T12:00:00Z',
});
const fixture=()=>{
 const s=initialState([],null);
 s.tasks.push(task('t1','Study Differential Equations','2026-10-19'));
 s.tasks.push(task('t2','Buy groceries','2026-10-20'));
 s.tasks.push({...task('t3','Differential Equations homework'),completedAt:'2026-10-16T08:00:00Z'});
 s.notes.push(note('n1','Differential Equations lecture notes'));
 s.notes.push(note('n2','Unrelated reading'));
 s.events.push(event());
 return s;
};
const folio=():FolioDeviceSnapshot=>({
 schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
 generatedAt:new Date(NOW).toISOString(),date:'2026-10-17',pendingCount:1,overdueCount:0,
 habits:[],events:[],
 tasks:[{id:'f1',title:'Differential Equations assignments',priority:'medium',plannedToday:true}],
 notes:[{id:'fn',title:'Differential Equations article',updatedAt:new Date(NOW).toISOString()}],
});
const notes=():NotesDeviceSummary=>({
 schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',
 generatedAt:new Date(NOW).toISOString(),activeCount:1,
 notes:[{id:'original-notes-id',title:'Differential Equations proof',
  updatedAt:new Date(NOW).toISOString(),pinned:false}],
 reminders:[{id:'nr',noteId:'original-notes-id',title:'Differential Equations revision',
  dueAt:'2026-10-20T07:00:00Z'}],
});
describe('original Hub event preparation and follow-through',()=>{
 it('projects related unfinished and completed original task IDs and notes without mutating anything',()=>{
  const state=fixture(),before=JSON.stringify(state);
  const result=projectEventPreparation(state,state.events[0]!);
  expect(result.openTasks.map(x=>x.id)).toEqual(['t1']);
  expect(result.completedTasks.map(x=>x.id)).toEqual(['t3']);
  expect(result.notes.map(x=>x.id)).toEqual(['n1']);
  expect(result.totalOpen).toBe(1);
  expect(JSON.stringify(state)).toBe(before);
 });
 it('generates editable original task form candidates before/after event, never persisted',()=>{
  const original=event(),before=JSON.stringify(original);
  const prep=preparationTaskSeed(original,'2026-10-17','prepare');
  expect(prep).toMatchObject({due:'2026-10-19',priority:'medium'});
  expect(prep.title).toContain('Prepare for');
  expect(prep.notes).toContain('Original event ID is not copied');
  expect(preparationTaskSeed(original,'2026-10-20','prepare').due).toBe('2026-10-20');
  expect(preparationTaskSeed(event('2026-10-10'),'2026-10-17','prepare').due).toBe('');
  expect(preparationTaskSeed(original,'2026-10-17','followup').due).toBe('2026-10-21');
  expect(preparationNoteSeed(original).body).toContain('This note is a draft');
  expect(JSON.stringify(original)).toBe(before);
 });
 it('provides consent-scoped matching owner titles without provider IDs or foreign edit actions',()=>{
  const state=fixture(),e=state.events[0]!;
  const result=projectEventPreparation(state,e,{folio:folio(),notes:notes(),now:NOW});
  expect(result.owners.length).toBeGreaterThanOrEqual(3);
  const html=renderEventPreparation(state,e,{folio:folio(),notes:notes(),now:NOW});
  expect(html).toContain('Differential Equations &lt;exam&gt;');
  expect(html).not.toContain('<exam>');
  expect(html).toContain('data-action="context-task" data-id="t1"');
  expect(html).toContain('data-action="edit-note" data-id="n1"');
  expect(html).toContain('data-action="prep-event-task" data-id="original-event"');
  expect(html).toContain('data-action="followup-event-task" data-id="original-event"');
  expect(html).toContain('data-action="prep-event-note" data-id="original-event"');
  expect(html).not.toContain('data-id="f1"');
  expect(html).not.toContain('data-id="original-notes-id"');
  expect(html).toContain('href="/notes/"');
  expect(html).toContain('href="/folio/?view=today"');
 });
 it('clears expired owner suggestions while keeping the Hub event preparation useful',()=>{
  const state=fixture(),e=state.events[0]!;
  const stale=projectEventPreparation(state,e,{
    folio:folio(),notes:notes(),now:NOW+16*60_000,
  });
  expect(stale.owners).toEqual([]);
  expect(stale.openTasks.map(x=>x.id)).toEqual(['t1']);
  expect(renderEventPreparation(state,e,{folio:null,notes:null})).not.toContain('original-notes-id');
 });
 it('surfaces actual local events in the next seven days, not invented source appointments',()=>{
  const state=fixture();
  state.events.push(event('2026-10-25'));
  const entries=upcomingEventPreparation(state,'2026-10-17');
  expect(entries.map(x=>x.date)).toEqual(['2026-10-20']);
  const html=renderUpcomingEventPreparation(state,'2026-10-17');
  expect(html).toContain('data-action="context-event" data-id="original-event"');
  expect(html).toContain('1 possibly related unfinished Hub task');
  expect(html).not.toContain('2026-10-25');
  expect(upcomingEventPreparation(state,'invalid')).toEqual([]);
 });
});
