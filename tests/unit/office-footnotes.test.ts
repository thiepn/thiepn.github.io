import {describe,it,expect} from 'vitest';
import {analyzeOfficeReferences,insertOfficeFootnote,defineMissingOfficeFootnote,retargetBrokenOfficeHeading,officeCitationInventory,insertExistingOfficeCitation,renameOfficeCitation,updateOfficeFootnoteDefinition,compareOfficeCitationRevisions,previewOfficeCitationRecovery,previewOfficeCitationReconciliation,reviewOfficeCitationThreeWay,previewOfficeCitationThreeWay,traceOfficeReferenceIssues,inspectOfficeDuplicateFootnotes,previewOfficeDuplicateResolution} from '../../src/lib/office/footnotes';
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


 it('O25 flags divergent original edits and requires an explicit decision for every candidate',()=>{
  const base='# R\nA[^a] B[^b]\n[^a]: Old 한국어\n[^b]: Old B';
  const proposed=base.replace('Old 한국어','Proposed 日本語').replace('Old B','Proposed B');
  const current=base.replace('Old 한국어','Current 내용').replace('Old B','Current B')+'\nUnrelated current';
  const review=reviewOfficeCitationThreeWay(base,proposed,current);
  expect(review).toMatchObject({safe:0,conflicts:2,blocked:0,alreadyApplied:0});
  expect(review.rows.map(row=>[row.id,row.status])).toEqual([['a','conflict'],['b','conflict']]);
  expect(()=>previewOfficeCitationThreeWay(base,proposed,current,{a:'use-proposed'})).toThrow('Choose Keep current');
  const result=previewOfficeCitationThreeWay(base,proposed,current,{a:'use-proposed',b:'keep-current'});
  expect(result.ids).toEqual(['a']);
  expect(result.kept).toEqual(['b']);
  expect(result.conflictsResolved).toBe(2);
  expect(result.value).toBe(current.replace('Current 내용','Proposed 日本語'));
  expect(()=>previewOfficeCitationThreeWay(base,proposed,current,{a:'keep-current',b:'keep-current'})).toThrow('No proposed');
 });
 it('O25 distinguishes safe upstream changes and already applied citations from genuine conflicts',()=>{
  const base='C[^c] A[^a] B[^b]\n[^a]: Base A\n[^b]: Base B\n[^c]: Base C';
  const proposed=base.replace('Base A','Proposed A').replace('Base B','Proposed B').replace('Base C','Proposed C');
  const current=base.replace('Base B','Proposed B').replace('Base C','Local C');
  const review=reviewOfficeCitationThreeWay(base,proposed,current);
  expect(review.rows.map(row=>[row.id,row.status])).toEqual([['a','safe'],['b','already-applied'],['c','conflict']]);
  const result=previewOfficeCitationThreeWay(base,proposed,current,{a:'use-proposed',c:'keep-current'});
  expect(result.value).toContain('[^a]: Proposed A');
  expect(result.value).toContain('[^b]: Proposed B');
  expect(result.value).toContain('[^c]: Local C');
  expect(result.value).not.toContain('Base A');
 });
 it('O25 blocks additions, deletions, duplicates, fenced definitions and unsafe resolutions',()=>{
  const base='A[^a]\n[^a]: Old',proposed='A[^a]\n[^a]: New',current='A[^a]\n[^a]: Mine';
  expect(reviewOfficeCitationThreeWay(base,proposed,current).conflicts).toBe(1);
  expect(reviewOfficeCitationThreeWay(base,'A[^a]',current).blocked).toBe(1);
  expect(reviewOfficeCitationThreeWay('A[^a]',proposed,current).blocked).toBe(1);
  expect(reviewOfficeCitationThreeWay(base,proposed,current+'\n[^a]: Duplicate').blocked).toBe(1);
  expect(()=>previewOfficeCitationThreeWay(base,proposed,current+'\n[^a]: Duplicate',{a:'use-proposed'}))
    .toThrow('Blocked citation');
  expect(()=>previewOfficeCitationThreeWay(base,proposed,current,{a:'unsupported' as any}))
    .toThrow('Choose Keep current');
  expect(()=>previewOfficeCitationThreeWay(base,proposed,current,{a:'use-proposed',z:'keep-current'}))
    .toThrow('Choose Keep current');
  const fence=String.fromCharCode(96).repeat(3);
  const fencedBase=base+'\n'+fence+'\n[^fake]: Hidden\n'+fence;
  expect(reviewOfficeCitationThreeWay(fencedBase,proposed,current).conflicts).toBe(1);
 });
 it('O25 compares actual three-source limits and refuses overlarge unsafe sets',()=>{
  expect(()=>reviewOfficeCitationThreeWay('x'.repeat(200001),'','')).toThrow('safe reference limit');
  const ids=Array.from({length:13},(_,i)=>'a'+i);
  const make=(value:string)=>ids.map(id=>'Text[^'+id+']\n[^'+id+']: '+value).join('\n');
  expect(()=>reviewOfficeCitationThreeWay(make('Base'),make('Proposed'),make('Local'))).toThrow('More than 12');
 });


 it('O26 tracks introduced, persisting, reintroduced and resolved source problems',()=>{
  const docs=[
    {revision:1,body:'A[^a] C[^c]\n[^unused]: Definition'},
    {revision:2,body:'A[^a]\n[^a]: Fixed'},
    {revision:4,body:'A[^a] C[^c]\n[^a]: Fixed\n[^unused]: Definition'},
    {revision:8,body:'A[^a] C[^c]\n[^a]: Fixed\n[^unused]: Definition\n[^new]: Another'}];
  const result=traceOfficeReferenceIssues(docs);
  expect(result).toMatchObject({firstRevision:1,currentRevision:8,retainedCount:4,unresolved:3,resolved:1});
  expect(result.rows.find(row=>row.id==='a'&&row.kind==='missing-footnote')?.status).toBe('resolved');
  const keyed=(id:string)=>result.rows.find(x=>x.id===id)!;
  expect(keyed('c').status).toBe('persisting');
  expect(keyed('unused').status).toBe('persisting');
  expect(keyed('new').status).toBe('introduced');
  expect(keyed('c').observed.map(x=>x.revision)).toEqual([1,4,8]);
  const resurrected=traceOfficeReferenceIssues(docs.slice(0,3));
  expect(resurrected.rows.find(x=>x.id==='c')?.status).toBe('reintroduced');
  const resolved=traceOfficeReferenceIssues(docs.slice(0,2));
  expect(resolved.rows.find(x=>x.id==='c')?.status).toBe('resolved');
  expect(resolved.rows.find(x=>x.id==='unused')?.current).toBeNull();
 });
 it('O26 combines duplicate occurrences with exact source line and avoids fake fenced issues',()=>{
  const tick=String.fromCharCode(96).repeat(3);
  const old='# A\nRef[^x]\n[^x]: One\n[^x]: Duplicate\n'+tick+'\n[^ghost]\n'+tick;
  const next='# A\r\nRef[^x]\r\n[^x]: One\r\n[^x]: Duplicate\r\n[^x]: Three\r\n'+tick+'\r\n[^ghost]\r\n'+tick;
  const report=traceOfficeReferenceIssues([{revision:2,body:old},{revision:3,body:next}]);
  expect(report.rows).toHaveLength(1);
  expect(report.rows[0]).toMatchObject({id:'x',kind:'duplicate-footnote',status:'persisting'});
  expect(report.rows[0]?.observed.map(x=>x.count)).toEqual([1,2]);
  expect(report.rows[0]?.current?.offset).toBe(next.indexOf('[^x]: Duplicate'));
 });
 it('O26 includes authentic broken heading provenance and never assumes an expired revision existed',()=>{
  const first='[Go](#office-ref-not-real)\n# Heading';
  const second='# Heading\n[Go](#office-ref-not-real)';
  const result=traceOfficeReferenceIssues([{revision:4,body:first},{revision:10,body:second}]);
  const issue=result.rows.find(x=>x.kind==='broken-heading')!;
  expect(issue).toMatchObject({status:'persisting',id:'office-ref-not-real',firstObserved:4,lastObserved:10});
  expect(issue.current?.offset).toBe(second.indexOf('[Go]'));
  expect(result.firstRevision).toBe(4);
 });
 it('O26 rejects unsupported versions, duplicate IDs and over-limit source and issue counts',()=>{
  expect(()=>traceOfficeReferenceIssues([])).toThrow('between 1 and 13');
  expect(()=>traceOfficeReferenceIssues([{revision:1,body:''},{revision:1,body:''}])).toThrow('unique');
  expect(()=>traceOfficeReferenceIssues([{revision:-1,body:''}])).toThrow('unique');
  expect(()=>traceOfficeReferenceIssues([{revision:4,body:'x'.repeat(200001)}])).toThrow('limited');
  const many=Array.from({length:161},(_,i)=>'[^x'+i+']').join('\n');
  expect(()=>traceOfficeReferenceIssues([{revision:1,body:many}])).toThrow('Too many distinct');
  expect(()=>traceOfficeReferenceIssues(Array.from({length:14},(_,i)=>({revision:i,body:''})))).toThrow('between 1 and 13');
 });


 it('O27 inspects only genuine competing source definitions and exposes exact CRLF offsets',()=>{
  const tick=String.fromCharCode(96).repeat(4);
  const source='See[^cite] again[^cite]\r\n'+
    '[^cite]: Original 한국어\r\n'+tick+'md\r\n[^cite]: Code fake\r\n'+tick+'\r\n'+
    '  [^cite]: Alternative 日本語\r\n[^unique]: Single\r\n';
  const report=inspectOfficeDuplicateFootnotes(source);
  expect(report.limited).toBe(false);
  expect(report.groups).toHaveLength(1);
  const group=report.groups[0]!;
  expect(group).toMatchObject({id:'cite',uses:2});
  expect(group.definitions.map(row=>[row.line,row.offset,row.content,row.lineEnding])).toEqual([
   [2,source.indexOf('[^cite]: Original'), 'Original 한국어','\r\n'],
   [6,source.indexOf('  [^cite]: Alternative'),'Alternative 日本語','\r\n']
  ]);
 });
 it('O27 preserves chosen original line and every citation use while deleting only competing lines',()=>{
  const source='First[^a] & again[^a]\n[^a]: Alpha\nA paragraph\n  [^a]: Beta\n[^a]: Gamma\nEnding';
  const candidates=inspectOfficeDuplicateFootnotes(source).groups[0]!.definitions;
  const keep=candidates[1]!;
  const preview=previewOfficeDuplicateResolution(source,'a',keep.offset);
  expect(preview.removed.map(row=>row.content)).toEqual(['Alpha','Gamma']);
  expect(preview.usesPreserved).toBe(2);
  expect(preview.value).toBe('First[^a] & again[^a]\nA paragraph\n  [^a]: Beta\nEnding');
  expect(preview.start).toBe(preview.value.indexOf('  [^a]: Beta'));
  expect(analyzeOfficeReferences(preview.value).problems).toHaveLength(0);
  expect(previewOfficeDuplicateResolution(preview.value,'a',keep.offset)).toThrow('multiple genuine');
 });
 it('O27 handles code fences, CR only, Unicode and definition at EOF without altering neighboring Markdown',()=>{
  const tilde='~~~~';
  const source='Claim[^x]\r'+tilde+'\r[^x]: Fake\r'+tilde+
    '\r[^x]: 선택한 원본\r## Heading\r  [^x]: Другой';
  const group=inspectOfficeDuplicateFootnotes(source).groups[0]!;
  const chosen=group.definitions[1]!;
  const result=previewOfficeDuplicateResolution(source,'x',chosen.offset);
  expect(result.value).toBe('Claim[^x]\r'+tilde+'\r[^x]: Fake\r'+tilde+'\r## Heading\r  [^x]: Другой');
  expect(result.start).toBe(result.value.indexOf('  [^x]: Другой'));
  expect(result.removed[0]?.lineEnding).toBe('\r');
  expect(result.value).toContain('[^x]: Fake'); // genuine code-fenced pseudo-definition remains untouched
 });
 it('O27 rejects selection against a different original source, nonexistent ID or unbounded candidates',()=>{
  const source='Cite[^x]\n[^x]: First\n[^x]: Second';
  const rows=inspectOfficeDuplicateFootnotes(source).groups[0]!.definitions;
  expect(()=>previewOfficeDuplicateResolution(source,'x',rows[1]!.offset+1)).toThrow('stale');
  expect(()=>previewOfficeDuplicateResolution(source,'other',rows[0]!.offset)).toThrow('multiple genuine');
  expect(()=>previewOfficeDuplicateResolution(source,'Bad ID',0)).toThrow('Invalid original');
  expect(()=>previewOfficeDuplicateResolution(source.replace('First','Edited first'),'x',rows[0]!.offset))
   .toThrow('stale');
  const many='Claim[^x]\n'+Array.from({length:21},(_,i)=>'[^x]: '+i).join('\n');
  expect(inspectOfficeDuplicateFootnotes(many).limited).toBe(true);
  expect(()=>previewOfficeDuplicateResolution(many,'x',many.indexOf('[^x]:'))).toThrow('limits');
 });
 it('O27 refuses ambiguous continuation blocks and malformed retained definition text',()=>{
  const multiline='Claim[^x]\n[^x]: First\n    extra context\n[^x]: Second';
  const keep=inspectOfficeDuplicateFootnotes(multiline).groups[0]!.definitions[1]!;
  expect(()=>previewOfficeDuplicateResolution(multiline,'x',keep.offset)).toThrow('Possible multiline');
  const empty='Claim[^x]\n[^x]: \n[^x]: Valid';
  const emptyKeep=inspectOfficeDuplicateFootnotes(empty).groups[0]!.definitions[0]!;
  expect(()=>previewOfficeDuplicateResolution(empty,'x',emptyKeep.offset)).toThrow('single-line text');
  const long='Claim[^x]\n[^x]: '+('a'.repeat(1001))+'\n[^x]: OK';
  const longKeep=inspectOfficeDuplicateFootnotes(long).groups[0]!.definitions[0]!;
  expect(()=>previewOfficeDuplicateResolution(long,'x',longKeep.offset)).toThrow('single-line text');
  expect(inspectOfficeDuplicateFootnotes('x'.repeat(200001)).limited).toBe(true);
 });

});