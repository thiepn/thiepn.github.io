import {describe,it,expect} from 'vitest';
import {analyzeOfficeReferences,insertOfficeFootnote,defineMissingOfficeFootnote,retargetBrokenOfficeHeading,officeCitationInventory,insertExistingOfficeCitation,renameOfficeCitation,updateOfficeFootnoteDefinition,compareOfficeCitationRevisions,previewOfficeCitationRecovery,previewOfficeCitationReconciliation} from '../../src/lib/office/footnotes';
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

 it('O21 edits one genuine definition in-place while preserving references, Unicode, and CRLF',()=>{
  const source='# Research\r\nParagraph[^source] and again[^source]\r\n  [^source]: \tOriginal 한국어\r\nMore text';
  const original=analyzeOfficeReferences(source).definitions[0]!;
  const result=updateOfficeFootnoteDefinition(source,'source',original.content,'Updated référence 日本語',original.offset);
  expect(result.value).toBe(source.replace('Original 한국어','Updated référence 日本語'));
  expect(result.start).toBe(result.value.indexOf('Updated référence'));
  expect(analyzeOfficeReferences(result.value).references.filter(row=>row.kind==='footnote')).toHaveLength(2);
  expect(analyzeOfficeReferences(result.value).problems).toHaveLength(0);
 });
 it('O21 refuses edits to duplicate, missing, fenced, obsolete and malformed definitions',()=>{
  const source='# Notes\nClaim[^a]\n[^a]: Old';
  const at=analyzeOfficeReferences(source).definitions[0]!.offset;
  expect(()=>updateOfficeFootnoteDefinition(source,'a','Stale','New',at)).toThrow('changed');
  expect(()=>updateOfficeFootnoteDefinition(source,'a','Old','New',at+1)).toThrow('changed');
  expect(()=>updateOfficeFootnoteDefinition(source,'a','Old','Old',at)).toThrow('unchanged');
  expect(()=>updateOfficeFootnoteDefinition(source,'a','Old','Line\nTwo',at)).toThrow('one line');
  expect(()=>updateOfficeFootnoteDefinition(source,'a','Old','   ',at)).toThrow('one line');
  expect(()=>updateOfficeFootnoteDefinition(source,'a','Old','x'.repeat(1001),at)).toThrow('one line');
  expect(()=>updateOfficeFootnoteDefinition(source,'missing','Old','New',at)).toThrow('unique original');
  expect(()=>updateOfficeFootnoteDefinition(source+'\n[^a]: Duplicate','a','Old','New',at)).toThrow('unique original');
  const tick=String.fromCharCode(96).repeat(3);
  const fake=tick+'\n[^a]: Hidden\n'+tick;
  expect(()=>updateOfficeFootnoteDefinition(fake,'a','Hidden','New',fake.indexOf('[^a]'))).toThrow('unique original');
 });
 it('O21 exact-source size allows reducing an existing draft but rejects growth beyond capacity',()=>{
  const huge='[^a]: x'+'.'.repeat(200000-'[^a]: x'.length);
  const original=analyzeOfficeReferences(huge).definitions[0]!;
  const shorter=updateOfficeFootnoteDefinition(huge,'a',original.content,'updated',original.offset);
  expect(shorter.value).toBe('[^a]: updated');
  const full='[^a]: Evidence\n'+'.'.repeat(200000-'[^a]: Evidence\n'.length);
  const initial=analyzeOfficeReferences(full).definitions[0]!;
  expect(()=>updateOfficeFootnoteDefinition(full,'a',initial.content,'Longer original evidence',initial.offset)).toThrow('source limit');
  expect(()=>updateOfficeFootnoteDefinition('x'.repeat(200001),'a','x','New',0)).toThrow('size limit');
 });
 it('O22 audits original content and use changes without inventing citation renames',()=>{
  const before='# Report\nClaim[^old] and again[^old]\n[^old]: Original 한국어';
  const now='# Report\nClaim[^new] and again[^new]\n[^new]: Updated 日本語';
  const audit=compareOfficeCitationRevisions(before,now);
  expect(audit.limited).toBe(false);
  expect(audit.changes.map(row=>row.id)).toEqual(['new','old']);
  expect(audit.changes.find(row=>row.id==='old')!.after.definitionCount).toBe(0);
  expect(audit.changes.find(row=>row.id==='new')!.before.definitionCount).toBe(0);
  expect(audit.changes.find(row=>row.id==='new')!.after.useCount).toBe(2);
 });
 it('O22 diagnoses change in missing/duplicate/unused citations and preserves original offsets',()=>{
  const before='# R\nClaim[^a]\n[^a]: Original';
  const after='# R\r\nClaim[^a] and [^missing]\r\n[^a]: Revised\r\n[^a]: Duplicate\r\n[^unused]: Unused';
  const audit=compareOfficeCitationRevisions(before,after);
  expect(audit.changes.map(row=>row.id)).toEqual(['a','missing','unused']);
  const a=audit.changes[0]!;
  expect(a.changes).toContain('Definition text changed');
  expect(a.after.definitionCount).toBe(2);
  expect(a.after.diagnostics).toContain('duplicate-footnote');
  expect(a.after.firstUseOffset).toBe(after.indexOf('[^a]'));
  expect(audit.changes.find(row=>row.id==='missing')!.after.diagnostics).toContain('missing-footnote');
  expect(audit.changes.find(row=>row.id==='unused')!.after.diagnostics).toContain('unused-footnote');
 });
 it('O22 ignores pseudo references in source code and reports unchanged original citations',()=>{
  const tick=String.fromCharCode(96);
  const base='# Heading\nBody[^real]\n[^real]: Evidence\n'+tick.repeat(3)+'\n[^fake]\n'+tick.repeat(3);
  const after=base.replace('[^fake]','[^different]');
  const audit=compareOfficeCitationRevisions(base,after);
  expect(audit.changes).toHaveLength(0);
  expect(audit.unchanged).toBe(1);
 });
 it('O22 limits malformed or excessive source comparisons and never silently truncates',()=>{
  expect(compareOfficeCitationRevisions('x'.repeat(200001),'Claim[^a]').limited).toBe(true);
  const many=Array.from({length:161},(_,i)=>'Text[^id'+i+']').join('\n');
  expect(compareOfficeCitationRevisions(many,'').limited).toBe(true);
  expect(compareOfficeCitationRevisions('','').changes).toHaveLength(0);
 });

 it('O23 restores one historical definition and preserves genuine uses, Unicode and unrelated CRLF source',()=>{
  const historical='# Report\r\nClaim[^a] and another[^a]\r\n[^a]: Original 한국어\r\n## More\r\nUnrelated';
  const current='# Report\r\nClaim[^a] and another[^a]\r\n[^a]: Updated 日本語\r\n## More\r\nUnrelated changed';
  const preview=previewOfficeCitationRecovery(historical,current,'a');
  expect(preview).toMatchObject({id:'a',previousText:'Updated 日本語',historicalText:'Original 한국어',usesPreserved:2});
  expect(preview.value).toBe(current.replace('Updated 日本語','Original 한국어'));
  expect(preview.start).toBe(preview.value.indexOf('Original 한국어'));
  expect(analyzeOfficeReferences(preview.value).problems).toHaveLength(0);
  expect(()=>previewOfficeCitationRecovery(historical,preview.value,'a')).toThrow('unchanged');
 });
 it('O23 fails closed for absent, duplicate, code-fenced, unsupported and stale originals',()=>{
  const real='# Original\nClaim[^a]\n[^a]: Safe',edited='# Updated\nClaim[^a]\n[^a]: New';
  expect(()=>previewOfficeCitationRecovery('',edited,'a')).toThrow('unique original');
  expect(()=>previewOfficeCitationRecovery(real,'Claim[^a]','a')).toThrow('unique original');
  expect(()=>previewOfficeCitationRecovery(real+'\n[^a]: Duplicate',edited,'a')).toThrow('unique original');
  expect(()=>previewOfficeCitationRecovery(real,edited+'\n[^a]: Duplicate','a')).toThrow('unique original');
  expect(()=>previewOfficeCitationRecovery(real.replace('Safe',' Bad '),edited,'a')).toThrow('cannot be recovered exactly');
  expect(()=>previewOfficeCitationRecovery(real.replace('Safe',''),edited,'a')).toThrow('cannot be recovered exactly');
  const tick=String.fromCharCode(96).repeat(3);
  expect(()=>previewOfficeCitationRecovery(tick+'\n[^a]: Hidden\n'+tick,edited,'a')).toThrow('unique original');
 });
 it('O23 conservatively enforces historical single-line and current source bounds',()=>{
  const original='# Doc\nClaim[^a]\n[^a]: Old',now=original.replace('Old','New');
  expect(()=>previewOfficeCitationRecovery(original,original,'a')).toThrow('unchanged');
  expect(()=>previewOfficeCitationRecovery(original,now+'x'.repeat(200001),'a')).toThrow('limited');
  expect(()=>previewOfficeCitationRecovery(original.replace('Old','z'.repeat(1001)),now,'a')).toThrow('supported single line');
 });


 it('O24 reconciles selected original citations together without reverting other writing or references',()=>{
  const historical='# Report\r\nA[^a] B[^b] C[^c]\r\n[^a]: Old 한국어\r\n[^b]: Previous 日本語\r\n[^c]: Keep\r\nOther';
  const now='# Report\r\nA[^a] B[^b] C[^c]\r\n[^a]: New alpha\r\n[^b]: New beta\r\n[^c]: Keep\r\nOther current';
  const recovered=previewOfficeCitationReconciliation(historical,now,['b','a']);
  expect(recovered.ids).toEqual(['a','b']);
  expect(recovered.value).toBe(now.replace('New alpha','Old 한국어').replace('New beta','Previous 日本語'));
  expect(recovered.usesPreserved).toBe(2);
  expect(recovered.changes.map(row=>row.id)).toEqual(['a','b']);
  expect(analyzeOfficeReferences(recovered.value).problems).toHaveLength(0);
  const one=previewOfficeCitationReconciliation(historical,now,['a']);
  expect(one.value).toContain('[^b]: New beta');
  expect(one.value).toContain('Other current');
 });
 it('O24 rejects duplicate, invalid, empty or excessive choices without applying partial edits',()=>{
  const historical='A[^a] B[^b]\n[^a]: Historical\n[^b]: Old',current='A[^a] B[^b]\n[^a]: Current\n[^b]: New';
  expect(()=>previewOfficeCitationReconciliation(historical,current,[])).toThrow('between 1 and 12');
  expect(()=>previewOfficeCitationReconciliation(historical,current,['a','a'])).toThrow('valid and unique');
  expect(()=>previewOfficeCitationReconciliation(historical,current,['Bad'])).toThrow('valid and unique');
  expect(()=>previewOfficeCitationReconciliation(historical,current,Array.from({length:13},(_,i)=>'a'+i))).toThrow('between 1 and 12');
  expect(()=>previewOfficeCitationReconciliation(historical,current,['a','missing'])).toThrow('unique original');
  expect(()=>previewOfficeCitationReconciliation(historical,current+'\n[^b]: Duplicate',['a','b'])).toThrow('unique original');
  expect(()=>previewOfficeCitationReconciliation(historical,current,['b','a','missing'])).toThrow('unique original');
 });
 it('O24 preserves source fences and fails closed when a selected historical definition is invalid',()=>{
  const tick=String.fromCharCode(96).repeat(3);
  const historic='Claim[^a]\n[^a]: History\n'+tick+'\n[^hidden]: Fake\n'+tick;
  const current='Claim[^a]\n[^a]: Current\n'+tick+'\n[^hidden]: Different\n'+tick;
  const p=previewOfficeCitationReconciliation(historic,current,['a']);
  expect(p.value).toContain('[^hidden]: Different');
  expect(()=>previewOfficeCitationReconciliation(historic,current,['hidden'])).toThrow('unique original');
  expect(()=>previewOfficeCitationReconciliation(historic.replace('History','x'.repeat(1001)),current,['a'])).toThrow('supported single line');
  expect(()=>previewOfficeCitationReconciliation(historic,current+'x'.repeat(200001),['a'])).toThrow('limited');
 });

});