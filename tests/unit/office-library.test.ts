import {describe,it,expect} from 'vitest';
import {findDocuments,outlineFor,backupDocuments} from '../../src/lib/office/library';
import {newDocument,nextDocument} from '../../src/lib/office/documents';
const stamp='2026-10-18T19:00:00.000Z';
const a=nextDocument(newDocument('a',stamp),0,'Stochastik','# Probability\n## Conditional\nReview Bayes',stamp);
const b=nextDocument(newDocument('b',stamp),0,'Differentialgleichungen','# DGL\nSolve equations',stamp);
describe('Hub Office O3 library projections without schema changes',()=>{
 it('searches titles and content with all terms, without mutating authoritative records',()=>{
  const docs=[a,b],before=JSON.stringify(docs);
  expect(findDocuments(docs,'  PROBABILITY  ')[0]?.doc.id).toBe('a');
  expect(findDocuments(docs,'  solve equations ')[0]?.doc.id).toBe('b');
  expect(findDocuments(docs,'Stochastik missing')).toHaveLength(0);
  expect(JSON.stringify(docs)).toBe(before);
 });
 it('sorts by title, tie-breaks stably, and only exposes bounded snippets',()=>{
  expect(findDocuments([a,b],'','title').map(h=>h.doc.id)).toEqual(['b','a']);
  expect(findDocuments([a,b],'Bayes')[0]?.snippet.length).toBeLessThanOrEqual(125);
 });
 it('extracts heading offsets while excluding fenced Markdown code headings',()=>{
  const source='# Top\n'+'~~~md\n# Not a heading\n~~~\n'+'## Section\nparagraph';
  const result=outlineFor(source);
  expect(result.map(h=>h.title)).toEqual(['Top','Section']);
  expect(source.slice(result[1]!.offset)).toMatch(/^## Section/);
 });
 it('exports complete original documents and history without an owner or new IDs',()=>{
  const json=backupDocuments([a,b],stamp),backup=JSON.parse(json);
  expect(backup.kind).toBe('thiepn-hub-office-backup');
  expect(backup.documents).toEqual([a,b]);
  expect(backup).not.toHaveProperty('owner');
 });
 it('rejects duplicate documents and impossible dates instead of writing partial backups',()=>{
  expect(()=>backupDocuments([a,a],stamp)).toThrow('Duplicate');
  expect(()=>backupDocuments([a],'not-a-date')).toThrow();
 });
});
