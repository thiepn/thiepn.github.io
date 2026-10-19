import {describe,it,expect} from 'vitest';
import {analyzeOfficeReferences,insertOfficeFootnote,defineMissingOfficeFootnote,retargetBrokenOfficeHeading,officeCitationInventory,insertExistingOfficeCitation,renameOfficeCitation} from '../../src/lib/office/footnotes';
describe('Office O19 source-backed footnotes and broken-reference diagnostics',()=>{
 it('tracks actual references and definitions, including Unicode footnote text',()=>{
  const source='# Research\nAn observation[^a] and another[^a].\n\n[^a]: 출처 and evidence';
  const r=analyzeOfficeReferences(source);
  expect(r.problems).toHaveLength(0);
  expect(r.references.filter(x=>x.kind==='footnote')).toHaveLength(2);
  expect(r.definitions[0]).toMatchObject({id:'a',content:'출처 and evidence',count:1});
  expect(r.references[0]?.offset).toBe(source.indexOf('[^a]'));
 });
 it('reports duplicate, missing, unused and broken heading refs using original offsets',()=>{
  const source='# Actual\nClaim[^missing].\n[^unused]: Unused\n[^unused]: Duplicate\nSee [gone](#office-ref-gone)';
  const r=analyzeOfficeReferences(source);
  expect(r.problems.map(x=>x.kind)).toEqual(['missing-footnote','unused-footnote','duplicate-footnote','broken-heading']);
  expect(r.problems.some(x=>x.kind==='duplicate-footnote'&&x.line===4)).toBe(true);
  expect(r.problems.some(x=>x.kind==='broken-heading'&&x.offset===source.indexOf('[gone]'))).toBe(true);
 });
 it('ignores pseudo references in triple and longer fences and inline code',()=>{
  const tick=String.fromCharCode(96);
  const source=['# Real',tick.repeat(4)+'md','[^fake]','[^fake]: Fake',tick.repeat(3),'[^alsofake]',tick.repeat(4),'Inline '+tick+'[^inline]'+tick,'## Genuine','Content[^valid]','[^valid]: Useful'].join('\n');
  const r=analyzeOfficeReferences(source);
  expect(r.problems).toHaveLength(0);
  expect(r.references).toHaveLength(1);
  expect(r.references[0]?.id).toBe('valid');
 });
 it('inserts one uniquely named footnote and definition atomically in original source',()=>{
  const start='# Title\nBody';
  const first=insertOfficeFootnote(start,start.length,start.length,'Original source https://example.com');
  expect(first).toMatchObject({id:'note-1',start:start.length});
  expect(first.value).toBe('# Title\nBody[^note-1]\n\n[^note-1]: Original source https://example.com\n');
  expect(analyzeOfficeReferences(first.value).problems).toHaveLength(0);
  const second=insertOfficeFootnote(first.value,0,0,'Another', '');
  expect(second.id).toBe('note-2');
  expect(second.value).toContain('[^note-2]: Another');
  expect(()=>insertOfficeFootnote(first.value,0,0,'Duplicate','note-1')).toThrow('already exists');
 });
 it('fails closed for invalid ID, multiline definition, stale selection and oversized source',()=>{
  expect(()=>insertOfficeFootnote('a',0,0,'Valid','Bad-ID')).toThrow('lowercase');
  expect(()=>insertOfficeFootnote('a',0,0,'Line\nbreak')).toThrow('one line');
  expect(()=>insertOfficeFootnote('a',0,5,'Valid')).toThrow('selection');
  expect(()=>insertOfficeFootnote('a'.repeat(200000),0,0,'Valid')).toThrow('200,000');
  expect(analyzeOfficeReferences('x'.repeat(200001)).limited).toBe(true);
 });
 it('repairs existing missing citations without duplicating markers, and rejects obsolete repairs',()=>{
  const source='# Notes\nSee[^source] and later[^source].';
  const fixed=defineMissingOfficeFootnote(source,'source','Primary evidence and 한국어');
  expect(fixed.value).toBe(source+'\n\n[^source]: Primary evidence and 한국어\n');
  expect(analyzeOfficeReferences(fixed.value).problems).toHaveLength(0);
  expect(()=>defineMissingOfficeFootnote(fixed.value,'source','Changed')).toThrow('no longer missing');
  expect(()=>defineMissingOfficeFootnote(source,'source','Unsafe\nline')).toThrow('one line');
  expect(()=>defineMissingOfficeFootnote(source,'another','Invented')).toThrow('no longer missing');
 });
 it('repairs only the selected broken heading link while preserving labels and intact links',()=>{
  const source='# Heading\n[old](#office-ref-missing) and [old](#office-ref-missing) and [real](#office-ref-heading)';
  const offset=source.indexOf('[old]');
  const fixed=retargetBrokenOfficeHeading(source,offset,'office-ref-heading');
  expect(fixed.value).toBe('# Heading\n[old](#office-ref-heading) and [old](#office-ref-missing) and [real](#office-ref-heading)');
  expect(analyzeOfficeReferences(fixed.value).problems.map(x=>x.kind)).toEqual(['broken-heading']);
  expect(()=>retargetBrokenOfficeHeading(fixed.value,offset,'office-ref-heading')).toThrow('no longer broken');
  expect(()=>retargetBrokenOfficeHeading(source,offset,'office-ref-absent')).toThrow('existing original heading');
 });
 it('preserves CRLF source offsets, and never repairs references only present inside fenced code',()=>{
  const source='# Heading\r\nLine[^missing]\r\nSee [gone](#office-ref-lost)';
  const issues=analyzeOfficeReferences(source).problems;
  expect(issues.map(x=>x.offset)).toEqual([source.indexOf('[^missing]'),source.indexOf('[gone]')]);
  expect(defineMissingOfficeFootnote(source,'missing','Real').value).toContain('[^missing]: Real');
  expect(()=>defineMissingOfficeFootnote('\x60\x60\x60\n[^hidden]\n\x60\x60\x60','hidden','No')).toThrow('no longer missing');
  expect(()=>retargetBrokenOfficeHeading(source,source.indexOf('[gone]'),'office-ref-fake')).toThrow('existing original heading');
 });

 it('O20 live inventory excludes fenced and inline pseudo citations with correct CRLF offsets',()=>{
  const tick=String.fromCharCode(96);
  const source=['# References','α[^ref] β[^ref]',tick.repeat(4),'ignore[^ref]','[^fake]: none',tick.repeat(4),
    'Inline '+tick+'[^ref]'+tick,'[^ref]: 한국어 primary source'].join('\r\n');
  const inventory=officeCitationInventory(source);
  expect(inventory.limited).toBe(false);
  expect(inventory.entries).toHaveLength(1);
  expect(inventory.entries[0]).toMatchObject({id:'ref',definitionLine:8,excerpt:'한국어 primary source',definitionCount:1});
  const first=source.indexOf('[^ref]');
  expect(inventory.entries[0]!.uses.map(row=>row.offset)).toEqual([first,source.indexOf('[^ref]',first+1)]);
 });
 it('O20 reuses a real definition while refusing missing or ambiguous citation authority',()=>{
  const source='# Research\nEvidence\n[^a]: Primary';
  const inserted=insertExistingOfficeCitation(source,19,19,'a');
  expect(inserted.value).toContain('[^a]');
  expect(inserted.value.match(/\[\^a\]:/g)).toHaveLength(1);
  expect(()=>insertExistingOfficeCitation(source,0,0,'unknown')).toThrow('unique original');
  expect(()=>insertExistingOfficeCitation(source+'\n[^a]: Duplicate',0,0,'a')).toThrow('unique original');
  expect(()=>insertExistingOfficeCitation(source,0,999,'a')).toThrow('selection');
 });
 it('O20 renames all and only genuine original citation markers without changing code',()=>{
  const tick=String.fromCharCode(96);
  const source=['# Actual','α[^old] and [^old]',tick+'[^old]'+tick,tick.repeat(4)+'md','[^old]',tick.repeat(4),
    '[^old]: Korean 한국어'].join('\r\n');
  const next=renameOfficeCitation(source,'old','renamed-source');
  expect(next.referenceCount).toBe(2);
  expect(next.value).toContain('α[^renamed-source] and [^renamed-source]');
  expect(next.value).toContain(tick+'[^old]'+tick);
  expect(next.value).toContain(tick.repeat(4)+'md\r\n[^old]\r\n'+tick.repeat(4));
  expect(next.value).toContain('[^renamed-source]: Korean 한국어');
  expect(officeCitationInventory(next.value).entries[0]!.uses).toHaveLength(2);
  expect(next.start).toBe(next.value.indexOf('[^renamed-source]:'));
 });
 it('O20 refuses collisions, invalid IDs, duplicates, source limits and obsolete renames',()=>{
  const source='See[^a] and [^b]\n[^a]: One';
  expect(()=>renameOfficeCitation(source,'a','b')).toThrow('already in use');
  expect(()=>renameOfficeCitation(source,'a','Bad-ID')).toThrow('lowercase');
  expect(()=>renameOfficeCitation(source,'a','a')).toThrow('different');
  expect(()=>renameOfficeCitation(source+'\n[^a]: Duplicate','a','valid')).toThrow('unique original');
  expect(()=>renameOfficeCitation('x'.repeat(200001),'a','valid')).toThrow('limited');
  const full='[^a]: x'+'.'.repeat(200000-'[^a]: x'.length);
  expect(()=>renameOfficeCitation(full,'a','longer')).toThrow('source limit');
  expect(officeCitationInventory('x'.repeat(200001)).limited).toBe(true);
 });

});
