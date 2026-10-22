import {describe,expect,it} from 'vitest';
import {MAX_BODY} from '../../src/lib/office/documents';
import {reviewOfficeExternalLinks,previewOfficeExternalLinkChange} from '../../src/lib/office/external-links';

describe('O32 original Markdown external-link workbench',()=>{
 const old='http://research.example.test/one';
 const fresh='https://research.example.test/new?x=1&y=2';
 it('groups exact targets and preserves original UTF-16 and CRLF positions',()=>{
  const text='Übersicht [One]('+old+')\r\n[Deux]('+old+')\r\n[Other](https://other.example/x)';
  const report=reviewOfficeExternalLinks(text);
  expect(report.useCount).toBe(3);
  expect(report.targets).toHaveLength(2);
  expect(report.targets[0]?.scheme).toBe('http');
  const uses=report.targets[0]!.uses;
  expect(uses.map(use=>use.line)).toEqual([1,2]);
  expect(uses.map(use=>text.slice(use.hrefOffset,use.hrefOffset+old.length))).toEqual([old,old]);
  expect(uses[1]?.offset).toBe(text.indexOf('[Deux]'));
 });
 it('follows original inert Markdown tokens, ignoring inline and fenced code',()=>{
  const text='[Real]('+old+') \x60[Inline]('+old+')\x60\n~~~md\n[Fake]('+old+')\n~~~\n'+
   '\x60\x60\x60\x60md\n[Hidden]('+old+')\n\x60\x60\x60\n[Still hidden]('+old+')\n\x60\x60\x60\x60\n'+
   '[Internal](#office-ref-title)\n[Not supported](javascript:alert)\n'+
   'Plain '+old;
  const report=reviewOfficeExternalLinks(text);
  expect(report.useCount).toBe(1);
  expect(report.targets[0]?.uses[0]?.label).toBe('Real');
 });
 it('replaces only original hrefs; preserves labels, code, plain URLs and CRLF',()=>{
  const text='[Old '+old+']('+old+')\r\n\x60[code]('+old+')\x60\r\n[Again]('+old+')\n'+old;
  const result=previewOfficeExternalLinkChange(text,old,fresh);
  expect(result.count).toBe(2);
  expect(result.value).toBe('[Old '+old+']('+fresh+')\r\n\x60[code]('+old+')\x60\r\n[Again]('+fresh+')\n'+old);
  expect(reviewOfficeExternalLinks(result.value).targets.some(row=>row.href===old)).toBe(false);
 });
 it('keeps unrelated original links and combines target groups when appropriate',()=>{
  const source='[A]('+old+')\n[B]('+fresh+')';
  const result=previewOfficeExternalLinkChange(source,old,fresh);
  expect(result.value).toBe('[A]('+fresh+')\n[B]('+fresh+')');
  expect(reviewOfficeExternalLinks(result.value).targets[0]?.uses).toHaveLength(2);
 });
 it('rejects unchanged, missing and malformed/unsafe destinations',()=>{
  const source='[A]('+old+')';
  expect(()=>previewOfficeExternalLinkChange(source,old,old)).toThrow();
  expect(()=>previewOfficeExternalLinkChange(source,'https://missing.example',fresh)).toThrow('not found');
  for(const url of ['http://new.example','https://user:secret@new.example',
    'https://new.example/path name','https://new.example/a)b','javascript:alert(1)']){
   expect(()=>previewOfficeExternalLinkChange(source,old,url)).toThrow();
  }
  expect(source).toContain(old);
 });
 it('fails closed at original source, use-count, target-count and replacement limits',()=>{
  expect(()=>reviewOfficeExternalLinks('x'.repeat(MAX_BODY+1))).toThrow();
  expect(()=>reviewOfficeExternalLinks(('[L]('+old+')\n').repeat(241))).toThrow('240');
  expect(()=>reviewOfficeExternalLinks(Array.from({length:81},(_,i)=>
   '[x](https://domain'+i+'.example)\n').join(''))).toThrow('80');
  const many=('[L]('+old+')\n').repeat(200);
  const almost=many+'A'.repeat(MAX_BODY-many.length-100);
  expect(()=>previewOfficeExternalLinkChange(almost,old,'https://new.example/'+
   'x'.repeat(2028))).toThrow();
 });
 it('keeps source positions without claiming remote validity',()=>{
  const report=reviewOfficeExternalLinks('[Citation](https://example.com/?ref=unknown)');
  expect(report.targets[0]?.uses).toEqual([{
   label:'Citation',href:'https://example.com/?ref=unknown',offset:0,hrefOffset:11,line:1
  }]);
 });
});
