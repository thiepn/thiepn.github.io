import {describe,it,expect} from 'vitest';
import {initialState,parseState} from '../../src/lib/workspace/model';
import {linkTaskEvent,unlinkTaskEvent,taskEventLinks,projectRelations,renderTaskEventBoard,renderTaskEventContext,validRelationConfig,MAX_TASK_EVENT_LINKS} from '../../src/lib/workspace/task-event-links';
const make=()=>{const s=initialState([],null);
 s.tasks.push({id:'task1',title:'Learn <Analysis>',notes:'SECRET TASK',due:'2026-10-23',time:'',priority:'medium',completedAt:null});
 s.events.push({id:'event1',title:'Study & seminar',date:'2026-10-23',endDate:'2026-10-23',start:'2026-10-23T08:00:00Z',end:'2026-10-23T09:00:00Z',zone:'Europe/Berlin',allDay:false});
 return s;};
describe('persistent Hub original task ↔ calendar event links',()=>{
 it('creates original ID link in existing widget and survives schema parsing',()=>{
  const s=make(),sources=JSON.stringify({tasks:s.tasks,events:s.events});
  const id=linkTaskEvent(s,{taskId:'task1',eventId:'event1',role:'work'});
  expect(taskEventLinks(parseState(JSON.stringify(s)))).toEqual([{id,taskId:'task1',eventId:'event1',role:'work'}]);
  expect(JSON.stringify(s.workspaces[0]!.widgets)).not.toContain('SECRET TASK');
  expect(JSON.stringify(s.workspaces[0]!.widgets)).not.toContain('Study & seminar');
  expect(JSON.stringify({tasks:s.tasks,events:s.events})).toBe(sources);
  expect(renderTaskEventBoard(s)).toContain('Learn &lt;Analysis&gt;');
  expect(renderTaskEventContext(s,'event','event1')).toContain('Learn &lt;Analysis&gt;');
 });
 it('rejects duplicate links, missing originals and forged external references',()=>{
  const s=make();linkTaskEvent(s,{taskId:'task1',eventId:'event1',role:'work'});
  expect(()=>linkTaskEvent(s,{taskId:'task1',eventId:'event1',role:'work'})).toThrow('already');
  expect(()=>linkTaskEvent(s,{taskId:'external',eventId:'event1',role:'prepare'})).toThrow('removed');
  expect(validRelationConfig([{id:'fake',taskId:'task1',eventId:'event1',role:'external'}])).toBe(false);
  expect(validRelationConfig([{id:'x',taskId:'task1',eventId:'event1',role:'work'},{id:'y',taskId:'task1',eventId:'event1',role:'work'}])).toBe(false);
 });
 it('refuses stale unlink and preserves source task/event',()=>{
  const s=make(),before=JSON.stringify({tasks:s.tasks,events:s.events});
  const id=linkTaskEvent(s,{taskId:'task1',eventId:'event1',role:'followup'});
  expect(()=>unlinkTaskEvent(s,id,'incorrect')).toThrow('changed');
  unlinkTaskEvent(s,id,JSON.stringify(taskEventLinks(s)[0]));
  expect(taskEventLinks(s)).toEqual([]);
  expect(JSON.stringify({tasks:s.tasks,events:s.events})).toBe(before);
 });
 it('makes deletions visible and does not invent or resurrect source records',()=>{
  const s=make();linkTaskEvent(s,{taskId:'task1',eventId:'event1',role:'work'});s.events=[];
  expect(projectRelations(s)[0]?.missing).toBe(true);
  expect(renderTaskEventBoard(s)).toContain('Original task or calendar event removed');
  expect(renderTaskEventBoard(s)).not.toContain('Study &amp; seminar');
 });
 it('isolates links by original workspace and caps relation count',()=>{
  const s=make();linkTaskEvent(s,{taskId:'task1',eventId:'event1',role:'work'});
  const w=structuredClone(s.workspaces[0]!);w.id='second';w.widgets=[];s.workspaces.push(w);s.active='second';
  expect(taskEventLinks(s)).toEqual([]);
  expect(validRelationConfig(Array.from({length:MAX_TASK_EVENT_LINKS+1},(_,i)=>({id:'link'+i,taskId:'t'+i,eventId:'e'+i,role:'work'})))).toBe(false);
 });
});
