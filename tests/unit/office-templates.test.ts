import {describe,it,expect} from 'vitest';
import {OFFICE_TEMPLATES,getOfficeTemplate} from '../../src/lib/office/templates';
import {newDocument,validateDocument,MAX_BODY} from '../../src/lib/office/documents';
describe('Office O4 built-in template contracts',()=>{
 const date='2026-10-18T18:00:00.000Z';
 it('starts with valid original version-1 records without artificial revisions',()=>{
  expect(new Set(OFFICE_TEMPLATES.map(item=>item.id)).size).toBe(OFFICE_TEMPLATES.length);
  for(const entry of OFFICE_TEMPLATES){
   expect(entry.title.length).toBeLessThanOrEqual(120);
   expect(entry.body.length).toBeLessThanOrEqual(MAX_BODY);
   const doc=validateDocument({...newDocument('test',date),title:entry.title,body:entry.body});
   expect(doc.revision).toBe(0);expect(doc.history).toEqual([]);
  }
 });
 it('rejects unidentified templates instead of creating fallback data',()=>{
  expect(()=>getOfficeTemplate('outside')).toThrow();
  expect(getOfficeTemplate('study').body).toContain('## Definitions');
  expect(getOfficeTemplate('report').body).toContain('## Recommendations');
 });
});
