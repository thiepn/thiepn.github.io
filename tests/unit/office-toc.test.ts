import {describe,it,expect} from 'vitest';
import {officeHeadingReferences,generateOfficeToc,insertOfficeHeadingLink,TOC_START,TOC_END} from '../../src/lib/office/toc';
describe('O18 original-source contents and internal cross references',()=>{
 const document='# Project\nSummary\n## Methods\nWork\n### Analysis\nDetail\n## Methods\nAgain';
 it('builds stable collision-safe IDs and indented links to authentic headings',()=>{
  const refs=officeHeadingReferences(document);
  expect(refs.map(h=>h.id)).toEqual(['office-ref-project','office-ref-methods','office-ref-analysis','office-ref-methods-2']);
  const toc=generateOfficeToc(document);
  expect(toc).toMatchObject({mode:'insert',headings:4});
  expect(toc.value).toContain('- [Project](#office-ref-project)');
  expect(toc.value).toContain('  - [Methods](#office-ref-methods)');
  expect(toc.value).toContain('    - [Analysis](#office-ref-analysis)');
  expect(toc.value).toContain('  - [Methods](#office-ref-methods-2)');
  expect(toc.value).toContain('# Project\n\n'+TOC_START+'\n');
  expect(toc.value).toContain(TOC_END+'\n\nSummary');
  expect(officeHeadingReferences(toc.value).map(h=>h.id)).toEqual(refs.map(h=>h.id));
 });
 it('updates only the explicitly managed section and preserves surrounding bytes and IDs',()=>{
  const created=generateOfficeToc(document);
  const withNew=created.value+'\n### Update\nBody';
  const updated=generateOfficeToc(withNew);
  expect(updated.mode).toBe('update');
  expect(updated.value).toContain('[Update](#office-ref-update)');
  expect(updated.value.slice(updated.end)).toBe(withNew.slice(withNew.indexOf(TOC_END)+TOC_END.length));
  expect(updated.value.split(TOC_START)).toHaveLength(2);
  expect(updated.value.split(TOC_END)).toHaveLength(2);
 });
 it('ignores fenced pseudo-headings including four-backtick blocks and manages Unicode labels',()=>{
  const tick=String.fromCharCode(96);
  const doc=['# 시작','~~~md','## FAKE','~~~',tick.repeat(4)+'md',tick.repeat(3),'## ALSO FAKE',tick.repeat(4),'## 日本語 heading'].join('\n');
  const refs=officeHeadingReferences(doc);
  expect(refs.map(x=>x.title)).toEqual(['시작','日本語 heading']);
  expect(refs[0]?.id).toMatch(/^office-ref-u/);
  expect(generateOfficeToc(doc).headings).toBe(2);
 });
 it('rejects incomplete or duplicate markers and too many headings without modifying source',()=>{
  expect(()=>generateOfficeToc('# A\n'+TOC_START)).toThrow('incomplete');
  expect(()=>generateOfficeToc('# A\n'+TOC_END)).toThrow('incomplete');
  expect(()=>generateOfficeToc('# A\n'+TOC_START+'\n'+TOC_START+'\n'+TOC_END)).toThrow('duplicated');
  expect(()=>generateOfficeToc(Array.from({length:121},(_,i)=>'# Heading '+i).join('\n'))).toThrow('120');
  expect(()=>generateOfficeToc('plain')).toThrow('genuine');
 });
 it('keeps normal heading preview functional if a user has an incomplete TOC marker',()=>{
  const partial='# Real\n'+TOC_START+'\n## Next';
  expect(officeHeadingReferences(partial).map(x=>x.title)).toEqual(['Real','Next']);
  expect(()=>generateOfficeToc(partial)).toThrow('incomplete');
 });
 it('inserts original internal links without inferring external destinations or rewriting siblings',()=>{
  const start=document.indexOf('Summary');
  const link=insertOfficeHeadingLink(document,start,start+7,'office-ref-methods-2');
  expect(link.value).toContain('[Methods](#office-ref-methods-2)');
  expect(link.value).toContain('### Analysis\nDetail\n## Methods\nAgain');
  expect(()=>insertOfficeHeadingLink(document,0,0,'office-ref-stale')).toThrow('no longer');
  expect(()=>insertOfficeHeadingLink(document,0,999,'office-ref-project')).toThrow('Invalid');
 });
 it('enforces canonical source body limit before inserting any contents or reference',()=>{
  const full='# Title\n'+'x'.repeat(199992);
  expect(full).toHaveLength(200000);
  expect(()=>generateOfficeToc(full)).toThrow('limit');
  expect(()=>insertOfficeHeadingLink(full,0,0,'office-ref-title')).toThrow('limit');
 });
});
