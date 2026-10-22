import {describe,it,expect} from 'vitest';
import {newDocument,nextDocument} from '../../src/lib/office/documents';
import {exportOfficeBundle,OFFICE_BUNDLE_LIMIT} from '../../src/lib/office/bundle';
const at='2026-10-18T18:00:00.000Z';
const a=nextDocument(newDocument('id-a',at),0,'Same title','# Αλφά\nHello',at);
const b=nextDocument(newDocument('id-b',at),0,'Same title','# 第二章\nWorld',at);
function entries(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder(),result=new Map<string,string>();
 let at=0;
 while(view.getUint32(at,true)===0x04034b50){
  const method=view.getUint16(at+8,true),size=view.getUint32(at+18,true),nameLen=view.getUint16(at+26,true),extraLen=view.getUint16(at+28,true);
  expect(method).toBe(0);
  const filename=decoder.decode(bytes.subarray(at+30,at+30+nameLen));
  const start=at+30+nameLen+extraLen;
  result.set(filename,decoder.decode(bytes.subarray(start,start+size)));
  at=start+size;
 }
 expect(view.getUint32(at,true)).toBe(0x02014b50);
 const eocd=bytes.length-22;
 expect(view.getUint32(eocd,true)).toBe(0x06054b50);
 expect(view.getUint16(eocd+10,true)).toBe(result.size);
 return result;
}
describe('Office O7 interoperable selected-document bundle',()=>{
 it('exports individual Unicode Markdown unchanged with unique IDs and a manifest',()=>{
  const zip=exportOfficeBundle([a,b],at);
  expect(zip.documentCount).toBe(2);expect(zip.byteLength).toBe(zip.bytes.length);
  const files=entries(zip.bytes);
  expect(files.get('docs/Same title-id-a.md')).toBe('# Αλφά\nHello');
  expect(files.get('docs/Same title-id-b.md')).toBe('# 第二章\nWorld');
  const manifest=JSON.parse(files.get('office-export-manifest.json')??'{}');
  expect(manifest.documents.map((d:{id:string})=>d.id)).toEqual(['id-a','id-b']);
  expect(manifest.documents[0].revision).toBe(a.revision);
  expect(manifest).not.toHaveProperty('owner');
 });
 it('makes deterministic ZIPs for the same original records without mutating them',()=>{
  const before=JSON.stringify([a,b]);
  expect(exportOfficeBundle([a,b],at).bytes).toEqual(exportOfficeBundle([a,b],at).bytes);
  expect(JSON.stringify([a,b])).toBe(before);
 });
 it('fails before export on empty, duplicate, oversized or damaged input',()=>{
  expect(()=>exportOfficeBundle([],at)).toThrow('Select');
  expect(()=>exportOfficeBundle([a,a],at)).toThrow('duplicate');
  expect(()=>exportOfficeBundle([{...a,body:'x'.repeat(200001)}],at)).toThrow();
  expect(()=>exportOfficeBundle(Array.from({length:100},(_,i)=>({...a,id:'id-'+i,body:'é'.repeat(200000)})),at)).toThrow('24 MB');
  expect(OFFICE_BUNDLE_LIMIT).toBeLessThan(25_000_000);
 });
 it('removes unsafe filename characters and retains original IDs',()=>{
  const record={...a,title:'../a\\b?*'};
  const names=[...entries(exportOfficeBundle([record],at).bytes).keys()];
  expect(names[0]).not.toContain('..');
  expect(names[0]).toContain('id-a.md');
 });
});
