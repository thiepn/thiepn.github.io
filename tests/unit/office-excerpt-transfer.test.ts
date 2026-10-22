import {describe,it,expect} from 'vitest';
import {newDocument,nextDocument,MAX_BODY,type OfficeDocument} from '../../src/lib/office/documents';
import {reviewOfficeTransferSource,previewOfficeExcerptTransfer,MAX_OFFICE_TRANSFER_PARAGRAPHS} from '../../src/lib/office/excerpt-transfer';
const source=(body:string,title='Original research'):OfficeDocument=>
  nextDocument(newDocument('original-001','2026-10-20T12:00:00.000Z'),0,title,body,'2026-10-20T12:05:00.000Z');

describe('O36 original owner-scoped cross-document prose transfer',()=>{
 it('reads genuine source paragraphs with original line and section offsets, omitting fenced pseudo-prose',()=>{
  const doc=source('# Topic\r\nFirst one.\r\nSecond line.\r\n\r\n~~~md\r\nFake data.\r\n~~~\r\n## Results\r\nActual data.');
  const r=reviewOfficeTransferSource(doc);
  expect(r.sourceId).toBe(doc.id);
  expect(r.sourceRevision).toBe(1);
  expect(r.passages.map(p=>[p.line,p.section])).toEqual([[2,'Topic'],[9,'Topic › Results']]);
  expect(r.eligible).toBe(2);
  expect(doc.body.slice(r.passages[0]!.offset,r.passages[0]!.end)).toBe('First one.\r\nSecond line.');
 });
 it('appends selected genuine prose as local-document attributed inert Markdown quotes without modifying either input',()=>{
  const doc=source('# Research\nA paragraph with **emphasis**.\n\nAnother multilingual 한국어 sentence.','Source Notes');
  const passages=reviewOfficeTransferSource(doc).passages;
  const before='# Draft\nTarget stays intact.';
  const changed=previewOfficeExcerptTransfer(before,doc,[passages[1]!.offset,passages[0]!.offset]);
  expect(changed.value).toBe('# Draft\nTarget stays intact.\n\n'+
   '> Office source: Source Notes · line 2\n> A paragraph with **emphasis**.\n\n'+
   '> Office source: Source Notes · line 4\n> Another multilingual 한국어 sentence.\n');
  expect(changed.count).toBe(2);
  expect(changed.offsets).toEqual(passages.map(p=>p.offset));
  expect(doc.body).toContain('Another multilingual 한국어');
  expect(before).toBe('# Draft\nTarget stays intact.');
 });
 it('does not transplant local footnote ids, even if source references are defined',()=>{
  const doc=source('# Research\nClaim[^one].\n\n[^one]: Only defined in original\n\nSafe excerpt.');
  const r=reviewOfficeTransferSource(doc);
  expect(r.passages.map(p=>p.eligible)).toEqual([false,true]);
  expect(r.passages[0]?.reason).toContain('footnote');
  expect(()=>previewOfficeExcerptTransfer('',doc,[r.passages[0]!.offset])).toThrow('citation-free');
  expect(previewOfficeExcerptTransfer('',doc,[r.passages[1]!.offset]).value)
    .toContain('> Safe excerpt.');
 });
 it('rejects original in-document heading references but keeps genuine external links',()=>{
  const doc=source('# Outline\n[Related](#office-ref-outline) is local.\n\n[Original source](https://example.org/research) is external.');
  const r=reviewOfficeTransferSource(doc);
  expect(r.passages[0]?.eligible).toBe(false);
  expect(r.passages[1]?.eligible).toBe(true);
  const change=previewOfficeExcerptTransfer('',doc,[r.passages[1]!.offset]);
  expect(change.value).toContain('[Original source](https://example.org/research)');
 });
 it('rejects duplicates, missing original paragraph offsets, malformed selections and unrelated positions',()=>{
  const doc=source('# A\nFirst.\n\nSecond.');
  const p=reviewOfficeTransferSource(doc).passages;
  expect(()=>previewOfficeExcerptTransfer('',doc,[])).toThrow('1–12');
  expect(()=>previewOfficeExcerptTransfer('',doc,[p[0]!.offset,p[0]!.offset])).toThrow('distinct');
  expect(()=>previewOfficeExcerptTransfer('',doc,[9999])).toThrow('changed');
  expect(()=>previewOfficeExcerptTransfer('',doc,[p[0]!.offset+1])).toThrow('changed');
  expect(()=>previewOfficeExcerptTransfer('',doc,Array.from({length:13},(_,i)=>i))).toThrow('1–12');
  expect(()=>previewOfficeExcerptTransfer('',doc,[NaN])).toThrow('changed');
 });
 it('bounds original paragraphs, source limit, target limit and accounts for result length',()=>{
  const doc=source('# Long\n'+'A'.repeat(3201));
  const r=reviewOfficeTransferSource(doc);
  expect(r.eligible).toBe(0);
  expect(r.passages[0]?.reason).toContain('3,200');
  expect(()=>previewOfficeExcerptTransfer('',doc,[r.passages[0]!.offset])).toThrow('citation-free');
  const fine=source('Safe data.');
  expect(()=>previewOfficeExcerptTransfer('x'.repeat(MAX_BODY),fine,[0])).toThrow('200,000-character');
  expect(()=>reviewOfficeTransferSource({...fine,body:'x'.repeat(MAX_BODY+1)})).toThrow('damaged');
  expect(MAX_OFFICE_TRANSFER_PARAGRAPHS).toBe(12);
 });
 it('does not lose multiline excerpt text, quotes or Unicode when using CRLF original source',()=>{
  const doc=source('# Original\r\nRésumé.\r\nRésumé continued.\r\n\r\nAfter passage.');
  const excerpt=reviewOfficeTransferSource(doc).passages[0]!;
  const value=previewOfficeExcerptTransfer('Existing\r\ntext',doc,[excerpt.offset]).value;
  expect(value).toBe('Existing\r\ntext\n\n> Office source: Original research · line 2\n'+
    '> Résumé.\n> Résumé continued.\n');
  expect(value.slice(0,'Existing\r\ntext'.length)).toBe('Existing\r\ntext');
 });
});
