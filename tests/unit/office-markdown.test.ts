import {describe,it,expect} from 'vitest';
import {formatSelection} from '../../src/lib/office/markdown';
describe('Office Markdown formatting contracts',()=>{
 it('wraps selection and returns caret within bounded output',()=>{
  const result=formatSelection('Alpha',0,5,'bold');
  expect(result.value).toBe('**Alpha**');expect(result.start).toBe(result.value.length);
 });
 it('headings and list transforms do not discard adjacent lines',()=>{
  expect(formatSelection('one\ntwo\nthree',4,7,'bullet').value).toBe('one\n- two\nthree');
  expect(formatSelection('## Topic',0,8,'heading').value).toBe('# Topic');
 });
 it('inserts a structurally valid table without losing surrounding content',()=>{
  const r=formatSelection('intro\nend',6,6,'table').value;
  expect(r).toContain('| --- | --- |');expect(r).toContain('intro\n');expect(r).toContain('end');
 });
 it('uses explicit URL placeholder, never treats selected text as a URL',()=>{
  expect(formatSelection('bad?x=1',0,7,'link').value).toBe('[bad?x=1](https://example.com)');
 });
 it('rejects invalid offsets',()=>expect(()=>formatSelection('x',2,0,'italic')).toThrow());
});
