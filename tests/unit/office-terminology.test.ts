import {describe,expect,it} from 'vitest';
import {MAX_BODY} from '../../src/lib/office/documents';
import {reviewOfficeTerminology,previewOfficeTerminologyChange} from '../../src/lib/office/terminology';

describe('O33 selective original prose terminology harmonization',()=>{
 it('locates true body prose and source offsets in headed CRLF and Unicode passages',()=>{
  const source='# Einführung\r\nÜbung uses Begriff in a paragraph.\r\nNoch ein Begriff here.\r\n## Further\r\nBegriff in next section';
  const review=reviewOfficeTerminology(source,'Begriff');
  expect(review.uses.map(u=>u.line)).toEqual([2,3,5]);
  expect(review.uses.map(u=>source.slice(u.offset,u.offset+7))).toEqual(['Begriff','Begriff','Begriff']);
  expect(review.uses[0]?.section).toBe('Einführung');
  expect(review.uses[2]?.section).toBe('Einführung › Further');
 });
 it('ignores literal tokens and citation metadata without touching those owners',()=>{
  const source='# Begriff heading\nPlain Begriff and [Begriff](https://example.org/Begriff) and '+
   '\x60Begriff\x60 and [^begriff] and https://example.org/Begriff.\n'+
   '~~~\nBegriff fenced\n~~~\n'+
   '[^begriff]: Begriff in footnote\n'+
   '- Begriff in a list\n> Begriff in quote\n'+
   'Normal Begriff inside **Begriff** text.';
  const report=reviewOfficeTerminology(source,'Begriff');
  expect(report.uses.map(x=>x.line)).toEqual([2,9,9]);
  const result=previewOfficeTerminologyChange(source,'Begriff','Concept',report.uses.map(x=>x.offset));
  expect(result.count).toBe(3);
  expect(result.value).toContain('[Begriff](https://example.org/Begriff)');
  expect(result.value).toContain('\x60Begriff\x60');
  expect(result.value).toContain('# Begriff heading');
  expect(result.value).toContain('[^begriff]: Begriff in footnote');
  expect(result.value).toContain('**Concept**');
 });
 it('changes a selected subset only, preserving unselected spelling and line endings',()=>{
  const source='First term in prose.\r\nSecond term in prose.\r\nA third term.';
  const review=reviewOfficeTerminology(source,'term');
  const result=previewOfficeTerminologyChange(source,'term','concept',[review.uses[1]!.offset]);
  expect(result.value).toBe('First term in prose.\r\nSecond concept in prose.\r\nA third term.');
  expect(result.selectedOffsets).toEqual([review.uses[1]!.offset]);
 });
 it('uses word boundaries and does not silently change capitalization',()=>{
  const source='Model models Modelled and Model. model is separate.\nModel is cited.';
  const review=reviewOfficeTerminology(source,'Model');
  expect(review.uses).toHaveLength(3);
  expect(review.uses.map(u=>u.line)).toEqual([1,1,2]);
 });
 it('rejects missing offsets, duplicates, empty choices, unsupported source and syntax',()=>{
  const src='Original term in prose. Another term.';
  const review=reviewOfficeTerminology(src,'term');
  expect(()=>previewOfficeTerminologyChange(src,'term','new',[])).toThrow();
  expect(()=>previewOfficeTerminologyChange(src,'term','new',[review.uses[0]!.offset,review.uses[0]!.offset])).toThrow();
  expect(()=>previewOfficeTerminologyChange(src,'term','new',[999])).toThrow();
  expect(()=>previewOfficeTerminologyChange(src,'term','term',[review.uses[0]!.offset])).toThrow();
  expect(()=>previewOfficeTerminologyChange(src,'term','new\nline',[review.uses[0]!.offset])).toThrow();
  expect(()=>reviewOfficeTerminology(src,'[*]')).toThrow();
  expect(()=>reviewOfficeTerminology('x'.repeat(MAX_BODY+1),'term')).toThrow();
 });
 it('fails closed rather than presenting truncated source choices or oversized results',()=>{
  const src=('term in a sentence.\n').repeat(121);
  expect(()=>reviewOfficeTerminology(src,'term')).toThrow('120');
  const almost='term here.'+'x'.repeat(MAX_BODY-10);
  const report=reviewOfficeTerminology(almost,'term');
  expect(()=>previewOfficeTerminologyChange(almost,'term','long replacement',[report.uses[0]!.offset])).toThrow('limit');
 });
});
