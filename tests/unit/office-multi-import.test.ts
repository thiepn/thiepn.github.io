import {describe,it,expect} from 'vitest';
import {MAX_MULTI_IMPORT_FILES,MAX_MULTI_IMPORT_BYTES,parseMarkdownBatch} from '../../src/lib/office/multi-import';
const entry=(name:string,text:string)=>({name,data:new TextEncoder().encode(text).buffer});
describe('Office O8 multi-Markdown preflight',()=>{
 it('preserves all files, Unicode source text and original filename order',()=>{
  const result=parseMarkdownBatch([entry('one.md','# Hello'),entry('two.markdown','# 한국어')]);
  expect(result.documents.map(doc=>doc.title)).toEqual(['one','two']);
  expect(result.documents.map(doc=>doc.body)).toEqual(['# Hello','# 한국어']);
  expect(result.bytes).toBe(new TextEncoder().encode('# Hello# 한국어').length);
 });
 it('permits duplicate human-facing names without inventing original Office IDs',()=>{
  const docs=parseMarkdownBatch([entry('same.md','First'),entry('same.md','Second')]).documents;
  expect(docs.map(doc=>doc.title)).toEqual(['same','same']);
  expect(docs[0]?.body).toBe('First');
  expect(docs[1]?.body).toBe('Second');
 });
 it('fails the whole preflight on one malicious or damaged file',()=>{
  expect(()=>parseMarkdownBatch([entry('okay.md','# Good'),entry('evil.md','<!doctype html><script>bad</script>')])).toThrow('File 2');
  expect(()=>parseMarkdownBatch([entry('okay.md','# Good'),{name:'bad.md',data:new Uint8Array([255,0]).buffer}])).toThrow('UTF-8');
 });
 it('limits item count and total size without partial results',()=>{
  expect(()=>parseMarkdownBatch([])).toThrow('between 1 and 20');
  expect(()=>parseMarkdownBatch(Array.from({length:MAX_MULTI_IMPORT_FILES+1},(_,i)=>entry('a'+i+'.md','x')))).toThrow('between 1 and 20');
  expect(()=>parseMarkdownBatch(Array.from({length:20},(_,i)=>entry('p'+i+'.md','x'.repeat(220000))))).toThrow('4 MB');
  expect(MAX_MULTI_IMPORT_BYTES).toBe(4_000_000);
 });
});
