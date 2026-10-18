import {describe,it,expect} from 'vitest';
import {adjacentDocumentHeading,documentSectionAt,insertOfficeSection} from '../../src/lib/office/section-authoring';
import {documentSections} from '../../src/lib/office/navigation';

describe('Office O16 source-owned section insertion and heading keyboard navigation',()=>{
 const source=['# Root','intro','## First','one','### Inner','detail','## Second','two','# Later','end',''].join('\n');
 it('inserts a new sibling following an entire nested subtree without rewriting original source',()=>{
  const old=documentSections(source).find(section=>section.title==='First')!;
  const inserted=insertOfficeSection(source,old.offset,'Third · 한국어','sibling');
  expect(inserted.level).toBe(2);
  expect(inserted.value).toContain('### Inner\ndetail\n\n## Third · 한국어\n\n## Second');
  expect(inserted.value.slice(inserted.start,inserted.end)).toBe('Third · 한국어');
  expect(documentSections(inserted.value).find(s=>s.title==='Third · 한국어')?.parent).toBe(documentSections(inserted.value)[0]?.offset);
  expect(source).toContain('## Second\ntwo');
 });
 it('inserts a child at the correct original parent boundary and preserves later siblings',()=>{
  const first=documentSections(source).find(s=>s.title==='First')!;
  const added=insertOfficeSection(source,first.offset,'Research questions','child');
  expect(added.level).toBe(3);
  expect(added.value).toContain('### Inner\ndetail\n\n### Research questions\n\n## Second');
  expect(documentSections(added.value).find(s=>s.title==='Research questions')?.parent).toBe(first.offset);
 });
 it('supports terminal headings and preserves every original byte in source order',()=>{
  const result=insertOfficeSection('# Heading\nExisting',0,'Appendix','sibling');
  expect(result.value).toBe('# Heading\nExisting\n\n# Appendix\n');
  expect(result.offset).toBe('# Heading\nExisting\n\n'.length);
  expect(result.value.slice(result.start,result.end)).toBe('Appendix');
 });
 it('does not treat headings inside code fences as sections or navigation stops',()=>{
  const original=['# Real','~~~md','## not a heading','~~~','## Authentic','content'].join('\n');
  const sections=documentSections(original);
  expect(sections.map(section=>section.title)).toEqual(['Real','Authentic']);
  expect(documentSectionAt(original,original.indexOf('not a heading')).title).toBe('Real');
  expect(adjacentDocumentHeading(original,0,'next')).toBe(original.indexOf('## Authentic'));
  expect(()=>adjacentDocumentHeading(original,0,'previous')).toThrow('No previous');
  expect(()=>insertOfficeSection(original,original.indexOf('## not a heading'),'Forbidden','child')).toThrow('no longer');
 });
 it('navigates genuine previous/next headings without stepping into fenced Markdown',()=>{
  const target=source.indexOf('## Second');
  expect(adjacentDocumentHeading(source,target,'previous')).toBe(source.indexOf('### Inner'));
  expect(adjacentDocumentHeading(source,target,'next')).toBe(source.indexOf('# Later'));
  expect(documentSectionAt(source,source.indexOf('detail')).title).toBe('Inner');
  expect(documentSectionAt(source,source.length).title).toBe('Later');
  expect(()=>adjacentDocumentHeading(source,source.length,'next')).toThrow('No next');
 });
 it('fails closed on invalid title, depth, stale offset and size without partial edits',()=>{
  const deepest='# One\n## Two\n### Three\n#### Four\n##### Five\n###### Six\nBody';
  const last=documentSections(deepest).at(-1)!;
  expect(()=>insertOfficeSection(deepest,last.offset,'No level seven','child')).toThrow('level-6');
  expect(()=>insertOfficeSection(source,0,'Danger\n# Injected','sibling')).toThrow('one line');
  expect(()=>insertOfficeSection(source,0,' ','sibling')).toThrow('1–100');
  expect(()=>insertOfficeSection(source,98765,'Missing','sibling')).toThrow('no longer');
  const full='# Root\n'+'x'.repeat(199993);
  expect(full).toHaveLength(200000);
  expect(()=>insertOfficeSection(full,0,'Too long','sibling')).toThrow('200,000');
  expect(()=>documentSectionAt(source,-1)).toThrow('Invalid');
 });
});
