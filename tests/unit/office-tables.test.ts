import {describe,it,expect} from 'vitest';
import {MAX_BODY} from '../../src/lib/office/documents';
import {officeTableCells,officeTableDivider} from '../../src/lib/office/markdown';
import {reviewOfficeTables,previewOfficeTableChange} from '../../src/lib/office/tables';

describe('O34 original Markdown table workbench',()=>{
 const t='| Name | Count |\r\n| --- | --- |\r\n| Äpfel | 2 |\r\n| Pear | 3 |';
 it('shares actual inert Markdown table tokens, preserving original CRLF and offsets',()=>{
  expect(officeTableCells('| A | B |')).toEqual(['A','B']);
  expect(officeTableDivider.test('| --- | :---: |')).toBe(true);
  const source='# Report\r\n'+t+'\r\n\r\n~~~md\r\n| Fake | Cell |\r\n| --- | --- |\r\n| No | 9 |\r\n~~~';
  const report=reviewOfficeTables(source);
  expect(report).toHaveLength(1);
  expect(report[0]?.line).toBe(2);
  expect(report[0]?.offset).toBe(source.indexOf('| Name'));
  expect(report[0]?.rows.map(r=>r.line)).toEqual([4,5]);
  expect(report[0]?.rows[0]?.offset).toBe(source.indexOf('| Äpfel'));
  expect(report[0]?.headers).toEqual(['Name','Count']);
 });
 it('edits one real cell, retains exact row spacing, Unicode, original line endings and other cells',()=>{
  const source='| Name | Count |\r\n| --- | --- |\r\n|  Äpfel  |  2  |\r\n| Pear | 3 |';
  const result=previewOfficeTableChange(source,0,'cell',0,0,'Äpfel neu');
  expect(result.rowCount).toBe(2);
  expect(result.value).toBe('| Name | Count |\r\n| --- | --- |\r\n|  Äpfel neu  |  2  |\r\n| Pear | 3 |');
  expect(reviewOfficeTables(result.value)[0]?.rows[0]?.cells).toEqual(['Äpfel neu','2']);
 });
 it('appends real multi-column data before the original newline without modifying adjacent prose',()=>{
  const source='# Data\n| A | B |\n| --- | --- |\n| one | 1 |\n\nNarrative';
  const changed=previewOfficeTableChange(source,7,'append-row',0,0,['two','2']);
  expect(changed.value).toBe('# Data\n| A | B |\n| --- | --- |\n| one | 1 |\n| two | 2 |\n\nNarrative');
  expect(changed.rowCount).toBe(2);
  expect(reviewOfficeTables(changed.value)[0]?.rows[1]?.cells).toEqual(['two','2']);
 });
 it('deletes an exact original row including terminal no-newline cases',()=>{
  const first='| A | B |\r\n| --- | --- |\r\n| one | 1 |\r\n| two | 2 |\r\n| three | 3 |';
  const middle=previewOfficeTableChange(first,0,'delete-row',1,0,'');
  expect(middle.value).toBe('| A | B |\r\n| --- | --- |\r\n| one | 1 |\r\n| three | 3 |');
  const last=previewOfficeTableChange(middle.value,0,'delete-row',1,0,'');
  expect(last.value).toBe('| A | B |\r\n| --- | --- |\r\n| one | 1 |');
  expect(()=>previewOfficeTableChange(last.value,0,'delete-row',0,0,'')).toThrow('at least one');
 });
 it('rejects unsupported source and malformed data safely without silently truncating',()=>{
  expect(()=>reviewOfficeTables('| A | B |\n| --- | --- |\n| only |')).toThrow('same column');
  expect(()=>reviewOfficeTables('| A | B |\n| --- | --- |\n| foo \\| bar | baz |')).toThrow('pipe');
  expect(()=>reviewOfficeTables('| A | B |\r\n| --- | --- |\n| a | b |')).toThrow('line endings');
  expect(()=>reviewOfficeTables('x'.repeat(MAX_BODY+1))).toThrow('200,000');
  expect(()=>reviewOfficeTables('| A | B |\n| --- | --- |\n'+('| a | b |\n').repeat(41))).toThrow('40 rows');
  const source='| A | B |\n| --- | --- |\n| a | b |';
  expect(()=>previewOfficeTableChange(source,999,'cell',0,0,'x')).toThrow('no longer');
  expect(()=>previewOfficeTableChange(source,0,'cell',0,0,'a')).toThrow('unchanged');
  for(const invalid of ['a|b','a\nb','a\x60b','x'.repeat(241)])
   expect(()=>previewOfficeTableChange(source,0,'cell',0,0,invalid)).toThrow();
  expect(()=>previewOfficeTableChange(source,0,'append-row',0,0,['not enough'])).toThrow('each');
  expect(()=>previewOfficeTableChange(source,0,'append-row',0,0,['',''])).toThrow('nonempty');
  expect(()=>previewOfficeTableChange(source,0,'delete-row',0,0,'')).toThrow('at least one');
 });
 it('does not mistake fenced pseudo-tables for actual editable Markdown tables',()=>{
  const source='~~~md\n| Fake | Table |\n| --- | --- |\n| no | 0 |\n~~~\n'+
   '| Real | Data |\n| --- | --- |\n| yes | 1 |';
  const report=reviewOfficeTables(source);
  expect(report).toHaveLength(1);
  expect(report[0]?.line).toBe(6);
  expect(report[0]?.headers).toEqual(['Real','Data']);
  const result=previewOfficeTableChange(source,report[0]!.offset,'cell',0,1,'2');
  expect(result.value).toContain('| yes | 2 |');
  expect(result.value).toContain('| no | 0 |');
 });
 it('refuses row count overflow, unsupported syntax and source-size overflow',()=>{
  const base='| A | B |\n| --- | --- |\n'+('| x | y |\n').repeat(40);
  expect(()=>previewOfficeTableChange(base,0,'append-row',0,0,['x','y'])).toThrow('40 rows');
  const rows='| X | Y |\n| --- | --- |\n| a | b |\n';
  const almost=rows+'x'.repeat(MAX_BODY-rows.length);
  expect(()=>previewOfficeTableChange(almost,0,'append-row',0,0,['very long','new data'])).toThrow('limit');
  expect(()=>reviewOfficeTables('note\n'+('| A | B |\n| --- | --- |\n| a | b |\n\n').repeat(21))).toThrow('20 tables');
 });
});
