import {describe,it,expect} from 'vitest';
import {initialState} from '../../src/lib/workspace/model';
import {
  taskKnowledgeContext,noteWorkContext,renderTaskKnowledgeContext,renderNoteWorkContext,
  topicTokens,
} from '../../src/lib/workspace/knowledge-work-context';
import type {FolioDeviceSnapshot} from '../../src/lib/workspace/folio-device';
import type {NotesDeviceSummary} from '../../src/lib/workspace/notes-device';
import type {Task,Note} from '../../src/lib/workspace/types';
const NOW=Date.parse('2026-10-17T13:00:00Z');
const task=(id:string,title:string,notes=''):Task=>({
 id,title,notes,due:'2026-10-20',time:'',priority:'high',completedAt:null,
});
const note=(id:string,title:string,body=''):Note=>({
 id,title,body,updatedAt:'2026-10-17T12:00:00Z',
});
const fixture=()=>{
 const s=initialState([],null);
 s.tasks.push(task('original-task','Differential Equations Exam','Prepare linear systems'));
 s.tasks.push(task('other','Grocery shopping'));
 s.tasks.push({...task('done','Differential Equations Exam finished'),completedAt:'2026-10-16T09:00:00Z'});
 s.notes.push(note('original-note','Differential Equations lecture','Chapter on linear systems'));
 s.notes.push(note('unrelated','Recipes','Shopping list'));
 return s;
};
const folio=():FolioDeviceSnapshot=>({
 schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
 generatedAt:new Date(NOW).toISOString(),date:'2026-10-17',pendingCount:1,
 overdueCount:0,events:[],habits:[],
 tasks:[{id:'folio-task',title:'Differential Equations homework',
  priority:'high',plannedToday:true}],
 notes:[{id:'folio-note',title:'Differential Equations readings',
  updatedAt:new Date(NOW).toISOString()}],
});
const notes=():NotesDeviceSummary=>({
 schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',
 generatedAt:new Date(NOW).toISOString(),activeCount:2,
 notes:[{id:'source-note',title:'Differential Equations proofs',
  updatedAt:new Date(NOW).toISOString(),pinned:false}],
 reminders:[{id:'source-reminder',noteId:'source-note',
   title:'Differential Equations practice',
   dueAt:'2026-10-19T11:00:00Z'}],
});
const owner=()=>({folio:folio(),notes:notes(),now:NOW});
describe('native task and knowledge context continuity',()=>{
 it('picks related original Hub note and preserves every original ID and record',()=>{
  const s=fixture(),before=JSON.stringify(s);
  const result=taskKnowledgeContext(s,s.tasks[0]!,owner());
  expect(result.matchedNotes).toBe(true);
  expect(result.localNotes.map(x=>x.id)).toEqual(['original-note']);
  expect(result.ownerRows.map(x=>x.source)).toEqual(['Folio','Folio','Notes','Notes']);
  expect(result.ownerRows).toHaveLength(4);
  expect(JSON.stringify(s)).toBe(before);
 });
 it('starts from an original local note and finds only unfinished matching tasks',()=>{
  const s=fixture(),result=noteWorkContext(s,s.notes[0]!,owner());
  expect(result.localTasks.map(x=>x.id)).toEqual(['original-task']);
  expect(result.localTasks.every(x=>x.id!=='done')).toBe(true);
  const html=renderNoteWorkContext(s,s.notes[0]!,owner());
  expect(html).toContain('data-action="context-task" data-id="original-task"');
  expect(html).not.toContain('data-action="context-task" data-id="done"');
 });
 it('escapes owners, opens original apps only, and does not expose record bodies or provider IDs as editable records',()=>{
  const s=fixture(),f=folio(),n=notes();
  f.tasks[0]!.title='Differential Equations <private>';
  n.notes[0]!.title='Differential Equations <proof>';
  const html=renderTaskKnowledgeContext(s,s.tasks[0]!,{folio:f,notes:n,now:NOW});
  expect(html).toContain('Differential Equations &lt;private&gt;');
  expect(html).toContain('Differential Equations &lt;proof&gt;');
  expect(html).not.toContain('<private>');
  expect(html).toContain('data-action="edit-note" data-id="original-note"');
  expect(html).not.toContain('data-id="source-note"');
  expect(html).not.toContain('data-id="folio-task"');
  expect(html).toContain('href="/notes/"');
  expect(html).toContain('href="/folio/?view=today"');
  expect(html).not.toContain('Chapter on linear systems');
 });
 it('refuses expired source titles while keeping real local work usable',()=>{
  const s=fixture();
  const expired={folio:folio(),notes:notes(),now:NOW+16*60_000};
  const result=taskKnowledgeContext(s,s.tasks[0]!,expired);
  expect(result.localNotes.map(x=>x.id)).toEqual(['original-note']);
  expect(result.ownerRows).toEqual([]);
  expect(result.incomplete).toBe(true);
  const html=renderTaskKnowledgeContext(s,s.tasks[0]!,expired);
  expect(html).not.toContain('Differential Equations readings');
  expect(html).toContain('Some sources are unshared');
 });
 it('shows recent notes as explicitly unlinked fallback and prevents topicless fake academic references',()=>{
  const s=fixture(),target=task('none','Do it');
  const result=taskKnowledgeContext(s,target,{folio:null,notes:null,now:NOW});
  expect(result.matchedNotes).toBe(false);
  expect(result.ownerRows).toHaveLength(0);
  expect(renderTaskKnowledgeContext(s,target,{folio:null,notes:null,now:NOW})).toContain('not a topic match');
  expect([...topicTokens('the and und for review')]).toEqual([]);
 });
});
