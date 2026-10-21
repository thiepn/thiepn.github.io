import {describe,it,expect} from 'vitest';
import {MAX_BODY} from '../../src/lib/office/documents';
import {reviewOfficeChecklists,previewOfficeChecklistChange} from '../../src/lib/office/checklists';

describe('O35 genuine original Markdown checklist operations',()=>{
 it('finds original Unicode task offsets, CRLF lines, sections and true completed status',()=>{
  const source='# Tasks\r\n- [ ] Äpfel kaufen\r\n* [X] Révision\r\n## Week two\r\n+ [x] 한국어 읽기\r\n';
  const review=reviewOfficeChecklists(source);
  expect(review.items).toHaveLength(3);
  expect(review.items.map(x=>[x.line,x.completed,x.section])).toEqual([
   [2,false,'Tasks'],[3,true,'Tasks'],[5,true,'Tasks › Week two']]);
  expect(review.open).toBe(1);expect(review.completed).toBe(2);
  for(const task of review.items)
   expect(source[task.markerOffset]).toBe(task.completed?
     (task.line===3?'X':'x'):' ');
 });
 it('excludes fenced pseudo-tasks, blockquote, plain lists, ordered lists and unmarked prose',()=>{
  const source='~~~md\n- [ ] code\n~~~\n'+
   '> - [x] quote\n1. [ ] ordered\n- plain list\nSome - [ ] prose\n'+
   '\x60- [x] inline string\x60\n- [ ] real\n';
  const review=reviewOfficeChecklists(source);
  expect(review.items.map(x=>x.label)).toEqual(['real']);
  expect(review.items[0]?.line).toBe(9);
 });
 it('selectively changes exact marker bytes without touching Unicode, citations or CRLF',()=>{
  const source='# Plan\r\n- [ ] Design[^note]\r\n- [x] Ship\r\n- [ ] 한국어\r\n\r\n[^note]: Source';
  const tasks=reviewOfficeChecklists(source).items;
  const result=previewOfficeChecklistChange(source,[tasks[2]!.markerOffset,tasks[0]!.markerOffset],true);
  expect(result.offsets).toEqual([tasks[0]!.markerOffset,tasks[2]!.markerOffset]);
  expect(result.count).toBe(2);
  expect(result.value).toBe('# Plan\r\n- [x] Design[^note]\r\n- [x] Ship\r\n- [x] 한국어\r\n\r\n[^note]: Source');
  expect(result.value.length).toBe(source.length);
  expect(reviewOfficeChecklists(result.value).completed).toBe(3);
 });
 it('reopens only selected already-completed tasks while keeping ordinary list prefixes and text',()=>{
  const source='* [X] Alpha\n+ [x] Bêta\n- [ ] Pending';
  const review=reviewOfficeChecklists(source);
  const changed=previewOfficeChecklistChange(source,[review.items[0]!.markerOffset],false);
  expect(changed.value).toBe('* [ ] Alpha\n+ [x] Bêta\n- [ ] Pending');
  expect(reviewOfficeChecklists(changed.value).open).toBe(2);
 });
 it('rejects stale offsets, mixed-state selections and malformed plans atomically',()=>{
  const source='- [ ] alpha\n- [x] beta';
  const list=reviewOfficeChecklists(source).items,first=list[0]!.markerOffset,second=list[1]!.markerOffset;
  expect(()=>previewOfficeChecklistChange(source,[first,first],true)).toThrow('distinct');
  expect(()=>previewOfficeChecklistChange(source,[],true)).toThrow('Choose');
  expect(()=>previewOfficeChecklistChange(source,[first,999],true)).toThrow('no longer');
  expect(()=>previewOfficeChecklistChange(source,[first,second],true)).toThrow('already applied');
  expect(()=>previewOfficeChecklistChange(source,[first],false)).toThrow('already applied');
  expect(()=>previewOfficeChecklistChange(source,[first],'yes' as unknown as boolean)).toThrow('state');
  expect(source).toBe('- [ ] alpha\n- [x] beta');
 });
 it('refuses over-limit review and extra-long source rather than scanning incompletely',()=>{
  const max='- [ ] x\n'.repeat(120);
  expect(reviewOfficeChecklists(max).items).toHaveLength(120);
  expect(()=>reviewOfficeChecklists(max+'- [ ] overflow')).toThrow('120');
  expect(()=>reviewOfficeChecklists('a'.repeat(MAX_BODY+1))).toThrow('200,000');
  const tasks=reviewOfficeChecklists(max).items;
  expect(previewOfficeChecklistChange(max,tasks.map(x=>x.markerOffset),true).count).toBe(120);
  expect(()=>previewOfficeChecklistChange(max,Array.from({length:121},(_,i)=>i),true)).toThrow('120');
 });
 it('source offset integrity does not cross inline code, headings and fenced gaps',()=>{
  const source='## First\n- [ ] original \x60- [x] fake\x60\n'+
   '~~~\n- [ ] ignored\n~~~\n### Second\n- [X] finish';
  const tasks=reviewOfficeChecklists(source).items;
  expect(tasks).toHaveLength(2);
  expect(tasks.map(t=>t.section)).toEqual(['First','First › Second']);
  const result=previewOfficeChecklistChange(source,[tasks[0]!.markerOffset],true);
  expect(result.value).toContain('- [x] original \x60- [x] fake\x60');
  expect(result.value).toContain('- [ ] ignored');
 });
});
