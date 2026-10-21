import {describe,it,expect} from 'vitest';
import {decodeMarkdownImport,validateMarkdownImport,MAX_IMPORT_BYTES} from '../../src/lib/office/import';
describe('Office O5 bounded Markdown import',()=>{
 it('preserves literal Markdown and never executes raw HTML',()=>{
  const source='# Notes\n\n<script>alert(1)</script>';
  const record=validateMarkdownImport('Lecture.md',source,new TextEncoder().encode(source).length);
  expect(record.body).toBe(source);expect(record.title).toBe('Lecture');
 });
 it('decodes UTF-8 and leading BOM',()=>{
  const bytes=new TextEncoder().encode('\ufeff# Résumé');
  expect(decodeMarkdownImport('résumé.markdown',bytes.buffer).body).toBe('# Résumé');
 });
 it('rejects binary, invalid UTF-8, HTML documents and incorrect extensions',()=>{
  expect(()=>decodeMarkdownImport('invalid.md',new Uint8Array([255,0]).buffer)).toThrow('UTF-8');
  expect(()=>validateMarkdownImport('invalid.md','a\u0000b',3)).toThrow('Binary');
  expect(()=>validateMarkdownImport('page.md','<!doctype html><html>',22)).toThrow('HTML');
  expect(()=>validateMarkdownImport('file.html','# Heading',9)).toThrow();
 });
 it('enforces safe sizes and empty document checks',()=>{
  expect(()=>validateMarkdownImport('big.md','x',MAX_IMPORT_BYTES+1)).toThrow('256 KB');
  expect(()=>validateMarkdownImport('long.md','x'.repeat(200_001),200_001)).toThrow('200,000');
  expect(()=>validateMarkdownImport('blank.md',' ',1)).toThrow('Empty');
 });
});
