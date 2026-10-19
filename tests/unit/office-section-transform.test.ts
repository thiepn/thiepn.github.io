import {describe,it,expect} from 'vitest';
import {transformOfficeSection} from '../../src/lib/office/section-transform';
import {documentSections} from '../../src/lib/office/navigation';
describe('Office O17 authentic source section transformations',()=>{
 const original=['# Project','Preamble','## Alpha','Intro','### Deep','Nested','## Beta','Other','# After','Tail'].join('\n');
 const find=(body:string,title:string)=>documentSections(body).find(s=>s.title===title)!.offset;
 it('duplicates a complete source subtree, preserving originals and later headings byte-for-byte',()=>{
  const start=find(original,'Alpha');
  const output=transformOfficeSection(original,start,'duplicate');
  expect(output.affectedHeadings).toBe(2);
  expect(output.value).toBe(['# Project','Preamble','## Alpha','Intro','### Deep','Nested','','## Alpha','Intro','### Deep','Nested','## Beta','Other','# After','Tail'].join('\n'));
  expect(output.value.slice(output.offset)).toContain('## Alpha\nIntro');
  expect(original).toContain('## Beta\nOther');
 });
 it('promotes a full nested subtree without touching a sibling or fake heading in code',()=>{
  const code=['# Project','Preamble','## Alpha','~~~md','### Fake','~~~','### Deep','Nested','## Beta','Other'].join('\n');
  const output=transformOfficeSection(code,find(code,'Alpha'),'promote');
  expect(output.value).toContain('# Alpha\n~~~md\n### Fake\n~~~\n## Deep\nNested\n## Beta');
  expect(output.affectedHeadings).toBe(2);
  expect(documentSections(output.value).some(s=>s.title==='Fake')).toBe(false);
 });
 it('demotes only when the selected section has an earlier sibling and preserves child depths',()=>{
  const output=transformOfficeSection(original,find(original,'Beta'),'demote');
  expect(output.value).toContain('## Alpha\nIntro\n### Deep\nNested\n### Beta\nOther\n# After');
  expect(documentSections(output.value).find(s=>s.title==='Beta')?.parent).toBe(find(original,'Alpha'));
  expect(()=>transformOfficeSection(original,find(original,'Alpha'),'demote')).toThrow('earlier sibling');
 });
 it('rejects invalid depth, stale offsets and oversized duplicate without modifying caller text',()=>{
  expect(()=>transformOfficeSection(original,9999,'promote')).toThrow('no longer available');
  expect(()=>transformOfficeSection(original,find(original,'Project'),'promote')).toThrow('between 1 and 6');
  const nested='# Root\n## Child\n### Grand\n#### Great\n##### Deep\n###### Limit\nEnd';
  expect(()=>transformOfficeSection(nested,find(nested,'Child'),'demote')).toThrow();
  const max='# Root\n'+'x'.repeat(199993);
  expect(max.length).toBe(200000);
  expect(()=>transformOfficeSection(max,0,'duplicate')).toThrow('200,000');
 });
 it('handles Unicode and terminal heading with newline and returns original offset',()=>{
  const source='# 日本語\n내용\n## End\n';
  const duplicate=transformOfficeSection(source,find(source,'End'),'duplicate');
  expect(duplicate.value.endsWith('## End\n\n## End\n')).toBe(true);
  const single=transformOfficeSection(source,find(source,'End'),'promote');
  expect(single.value).toBe('# 日本語\n내용\n# End\n');
 });
});
