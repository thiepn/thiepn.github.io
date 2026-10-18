import {describe,it,expect} from 'vitest';
import {documentSections,findEditorText,replaceEditorText,moveDocumentSection} from '../../src/lib/office/navigation';
describe('Office O9 original Markdown editor navigation',()=>{
 it('finds literal punctuation, Unicode, and exact case using UTF-16 offsets',()=>{
  const source='# Title\nA.b? A.b? 한국어';
  expect(findEditorText(source,'A.b?').matches).toEqual([{start:8,end:12},{start:13,end:17}]);
  expect(findEditorText(source,'한국어').matches).toHaveLength(1);
  expect(findEditorText(source,'[').matches).toHaveLength(0);
  expect(findEditorText(source,'')).toEqual({matches:[],truncated:false});
  expect(findEditorText('A a A','A',true).matches).toHaveLength(2);
 });
 it('replaces only literal matches, without interpreting replacement dollars',()=>{
  expect(replaceEditorText('One one ONE','one','$&')).toEqual({value:'$& $& $&',count:3});
  expect(replaceEditorText('One one ONE','one','X',true)).toEqual({value:'One X ONE',count:1});
  expect(replaceEditorText('# Text','absent','other')).toEqual({value:'# Text',count:0});
 });
 it('fails closed on an excessive number of matches or body overflows',()=>{
  expect(findEditorText('x'.repeat(510),'x')).toMatchObject({truncated:true});
  expect(()=>replaceEditorText('x'.repeat(510),'x','a')).toThrow('500 matches');
  expect(()=>replaceEditorText('a'.repeat(10000),'aa','x'.repeat(120))).toThrow('500 matches');
  expect(()=>replaceEditorText('a'.repeat(200000),'a'.repeat(120),'x'.repeat(130))).toThrow();
 });
 it('identifies nested section spans and excludes fenced-code headings',()=>{
  const doc=['# Root','intro','## A','alpha','### Child','child','~~~md','## not real','~~~','## B','beta','# Next',''].join('\n');
  const sections=documentSections(doc);
  expect(sections.map(s=>s.title)).toEqual(['Root','A','Child','B','Next']);
  const a=sections[1]!,b=sections[3]!;
  expect(doc.slice(a.offset,a.end)).toContain('### Child');
  expect(a.end).toBe(b.offset);
  expect(sections[2]?.parent).toBe(a.offset);
 });
 it('moves complete same-parent sections, preserving nested source exactly',()=>{
  const doc=['# Root','preamble','## First','F','### Inner','I','## Second','S','# Later',''].join('\n');
  const second=documentSections(doc).find(s=>s.title==='Second')!;
  const up=moveDocumentSection(doc,second.offset,'earlier');
  expect(up.value).toBe(['# Root','preamble','## Second','S','## First','F','### Inner','I','# Later',''].join('\n'));
  const back=moveDocumentSection(up.value,up.offset,'later');
  expect(back.value).toBe(doc);
  expect(()=>moveDocumentSection(doc,documentSections(doc)[0]!.offset,'earlier')).toThrow('No adjacent');
 });
});
