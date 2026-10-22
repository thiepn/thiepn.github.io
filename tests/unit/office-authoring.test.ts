import {describe,it,expect} from 'vitest';
import {insertAuthoringBlock,sourcePositionAtLine,sourceWritingStats} from '../../src/lib/office/authoring';
describe('Office O15 source-based long-document authoring',()=>{
 it('navigates one-based line offsets including empty last line',()=>{
  const doc='# Title\n한국어\n\nEnd\n';
  expect(sourcePositionAtLine(doc,1)).toBe(0);
  expect(sourcePositionAtLine(doc,2)).toBe(8);
  expect(sourcePositionAtLine(doc,5)).toBe(doc.length);
  expect(()=>sourcePositionAtLine(doc,6)).toThrow('exceeds');
  expect(()=>sourcePositionAtLine(doc,0)).toThrow('valid');
 });
 it('reports word, paragraph, line and character statistics',()=>{
  const doc='# Heading\n\nOne two 한국어\n\nLast';
  expect(sourceWritingStats(doc)).toEqual({characters:doc.length,words:5,lines:5,paragraphs:3});
  expect(sourceWritingStats('')).toEqual({characters:0,words:0,lines:1,paragraphs:0});
 });
 it('escapes code fence collisions and preserves selected text',()=>{
  const doc='Before X after';
  const result=insertAuthoringBlock(doc,7,8,'code',2,2,'ts');
  expect(result.value).toBe('Before \n```ts\nX\n```\n after');
  expect(result.value.slice(result.start,result.end)).toBe('X');
  const internal='one ``` two';
  expect(insertAuthoringBlock(internal,0,internal.length,'code').value).toContain('````');
  expect(()=>insertAuthoringBlock('',0,0,'code',2,2,'<script>')).toThrow('safe');
 });
 it('builds bounded Markdown tables without altering surrounding text',()=>{
  const doc='Start\n\nEnd',result=insertAuthoringBlock(doc,6,6,'table',2,3);
  expect(result.value).toContain('| Column 1 | Column 2 | Column 3 |');
  expect(result.value).toContain('| --- | --- | --- |');
  expect(result.value.match(/\| Value \| Value \| Value \|/g)).toHaveLength(2);
  expect(result.value.startsWith('Start\n')).toBe(true);
  expect(result.value.endsWith('End')).toBe(true);
  expect(()=>insertAuthoringBlock('',0,0,'table',13,2)).toThrow('1–12');
  expect(()=>insertAuthoringBlock('',0,0,'table',2,7)).toThrow('2–6');
 });
 it('converts selected complete source lines into checklist rows',()=>{
  const doc='Top\nTask one\nTask two\nBottom';
  const result=insertAuthoringBlock(doc,5,22,'tasks');
  expect(result.value).toBe('Top\n- [ ] Task one\n- [ ] Task two\nBottom');
  expect(insertAuthoringBlock('',0,0,'tasks').value).toBe('- [ ] Task');
 });
 it('rejects invalid source selections and oversized edits atomically',()=>{
  expect(()=>insertAuthoringBlock('a',0,3,'rule')).toThrow('Invalid');
  expect(()=>insertAuthoringBlock('a'.repeat(200000),0,0,'table',1,2)).toThrow('200,000');
  expect(insertAuthoringBlock('plain',5,5,'rule').value).toBe('plain\n---');
 });
});
