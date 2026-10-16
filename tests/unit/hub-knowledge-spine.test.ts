import { describe, expect, it } from 'vitest';
import { knowledgeDesk, resolveWiki, wikiTargets } from '../../src/lib/workspace/knowledge-spine';
import type { Note, Task } from '../../src/lib/workspace/types';
const note=(id:string,title:string,body=''):Note=>({id,title,body,updatedAt:'2026-10-16T12:00:00Z'});
const task=(id:string,notes:string):Task=>({id,title:'Study',notes,due:'',time:'',priority:'none',completedAt:null});
describe('native Hub knowledge: no duplicate owner records',()=>{
 it('resolves stable IDs when titles change',()=>{
  expect(resolveWiki(note('a','Source','[[note:b]]'),[note('b','Renamed')])[0]?.targetId).toBe('b');
 });
 it('does not guess ambiguous title links',()=>{
  const list=[note('a','X','[[Study]]'),note('b','Study'),note('c','Study')];
  expect(resolveWiki(list[0]!,list)[0]?.status).toBe('ambiguous');
 });
 it('skips Markdown code examples',()=>{
  expect(wikiTargets('`[[Inline]]`\n```md\n[[Fence]]\n```\n[[Actual]]')).toEqual(['Actual']);
 });
 it('supports KEEP heading and alias targets without new resource IDs',()=>{
  const a=note('a','Root','[[Essay#Introduction|Start]] and [[note:b#Source|Ref]]');
  const b=note('b','Essay');
  expect(resolveWiki(a,[a,b]).map(x=>x.targetId)).toEqual(['b','b']);
 });
 it('keeps missing targets unresolved',()=>expect(resolveWiki(note('a','A','[[Nope]]'),[])[0]?.targetId).toBeNull());
 it('shows explicit linked tasks and backlinks only',()=>{
  const list=[note('a','A','[[note:b]]'),note('b','B'),note('c','C')];
  const desk=knowledgeDesk(list,[task('t1','[[note:b]]'),task('t2','Nothing')],'b');
  expect(desk.backlinks.map(n=>n.id)).toEqual(['a']);
  expect(desk.tasks.map(t=>t.id)).toEqual(['t1']);
 });
 it('does not conflate duplicate title task relations',()=>{
  const list=[note('a','Repeat'),note('b','Repeat')];
  expect(knowledgeDesk(list,[task('t','[[Repeat]]')],'a').tasks).toEqual([]);
 });
 it('searches without altering canonical records',()=>{
  const list=[note('a','Math','Proof'),note('b','Home')], before=JSON.stringify(list);
  expect(knowledgeDesk(list,[],null,'proof').matches.map(n=>n.id)).toEqual(['a']);
  expect(JSON.stringify(list)).toBe(before);
 });
 it('does not surface disappeared note contents',()=>{
  expect(knowledgeDesk([note('a','A')],[],'gone').selected).toBeNull();
 });
});
