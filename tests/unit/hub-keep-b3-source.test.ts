import {describe,it,expect} from 'vitest';
import {classifyKeepPlanningNote,deriveKeepProjectProgress,keepTasksFromHubNote,toggleKeepTaskLine,keepFrontmatter} from '../../src/lib/workspace/keep-b3-source';
import type { Note } from '../../src/lib/workspace/types';
const make=(body:string):Note=>({id:'stable-hub-note-id',title:'University project',body,updatedAt:'2026-10-16T12:00:00.000Z'});
describe('original KEEP P25/P49 source semantics adapted to Hub canonical notes',()=>{
 it('uses frontmatter type and identity without duplicate project records',()=>{
   const n=make('---\ntype: project\nprogress: tasks\n---\n## Next actions\n- [ ] Read paper');
   expect(classifyKeepPlanningNote(n)).toBe('project');
   expect(keepFrontmatter(n.body).progress).toBe('tasks');
   expect(deriveKeepProjectProgress(n)).toMatchObject({total:1,completed:0,open:1,percent:0});
   expect(n.id).toBe('stable-hub-note-id');
 });
 it('never fabricates task progress when mode is absent',()=>{
   const n=make('---\ntype: project\n---\n- [x] Finished\n- [ ] Next');
   const r=deriveKeepProjectProgress(n);
   expect(r.percent).toBeNull();expect(r.nextAction?.text).toBe('Next');
 });
 it('prioritizes explicit urgent next action but preserves original line numbers',()=>{
   const n=make('- [ ] Ordinary\n- [ ] Urgent !urgent');
   const tasks=keepTasksFromHubNote(n);
   expect(deriveKeepProjectProgress(n).nextAction?.line).toBe(1);
   expect(tasks[0]?.id).toContain(n.id);
 });
 it('does not parse fenced code, inline frontmatter and math tasks',()=>{
   const n=make('---\ntype: project\n---\n```md\n- [ ] Code only\n```\n$$\n- [ ] Math only\n$$\n- [ ] Real');
   expect(keepTasksFromHubNote(n).map(t=>t.text)).toEqual(['Real']);
 });
 it('reads source due date, priority, and block anchors',()=>{
   const n=make('## Lecture\n- [ ] Study !high @due(2026-11-17) ^review');
   expect(keepTasksFromHubNote(n)[0]).toMatchObject({line:1,heading:'Lecture',dueDate:'2026-11-17',blockId:'review',priority:'high'});
 });
 it('rejects impossible dates without throwing',()=>{
   const n=make('- [ ] Bad @due(2026-02-30)');
   expect(keepTasksFromHubNote(n)[0]?.dueDate).toBeUndefined();
 });
 it('edits exact original Markdown line only',()=>{
   const n=make('Keep this\n- [ ] Original ^a\n- [ ] Original ^b');
   const task=keepTasksFromHubNote(n)[1]!;
   const updated=toggleKeepTaskLine(n,task);
   expect(updated).toContain('- [x] Original ^b');
   expect(updated).toContain('- [ ] Original ^a');
   expect(n.body).toContain('- [ ] Original ^b');
 });
 it('blocks stale, missing or forged task changes',()=>{
   const n=make('- [ ] Source'); const task=keepTasksFromHubNote(n)[0]!;
   expect(toggleKeepTaskLine({...n,body:'- [ ] Another task'},task)).toBeNull();
   expect(toggleKeepTaskLine({...n,id:'different'},task)).toBeNull();
 });
 it('offers completion suggestion only after real task completion',()=>{
   const n=make('---\ntype: project\nprogress: tasks\n---\n- [x] One');
   expect(deriveKeepProjectProgress(n)).toMatchObject({total:1,completed:1,percent:100,canSuggestCompletion:true});
 });
 it('does not offer completion for empty note',()=>{
   expect(deriveKeepProjectProgress(make('---\ntype: project\n---'))).toMatchObject({total:0,canSuggestCompletion:false});
 });
});
