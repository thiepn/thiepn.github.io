import {MAX_DOCUMENTS,validateDocument,type OfficeDocument} from './documents';
export const OFFICE_BUNDLE_LIMIT=24_000_000;
interface ZipEntry {name:Uint8Array;data:Uint8Array;checksum:number;offset:number}
function crc32(data:Uint8Array):number{
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
function safeName(title:string,id:string,encode:TextEncoder):string{
 const normalized=title.normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'-').replace(/[. ]+$/g,'').trim();
 const suffix='-'+id+'.md';
 let stem=(normalized||'document').slice(0,55);
 while(stem.length>0&&encode.encode('docs/'+stem+suffix).length>240)stem=stem.slice(0,-1);
 if(!stem)stem='document';
 return 'docs/'+stem+suffix;
}
export interface OfficeBundle {bytes:Uint8Array;documentCount:number;byteLength:number}
export function exportOfficeBundle(input:readonly OfficeDocument[],date:string):OfficeBundle{
 if(!input.length||input.length>MAX_DOCUMENTS)throw new Error('Select between 1 and 100 saved Office documents.');
 if(!Number.isFinite(Date.parse(date))||date.length>40)throw new Error('Invalid Office export time.');
 const encoder=new TextEncoder(),ids=new Set<string>(),paths=new Set<string>();
 const files:{name:string;body:Uint8Array}[]=[];
 let total=22;
 const manifest:{id:string;title:string;filename:string;revision:number;updatedAt:string}[]=[];
 for(const raw of input){
  const doc=validateDocument(raw);
  if(ids.has(doc.id))throw new Error('The export selection contains a duplicate document ID.');
  ids.add(doc.id);
  const filename=safeName(doc.title,doc.id,encoder);
  if(paths.has(filename))throw new Error('A generated export filename collides.');
  paths.add(filename);
  const body=encoder.encode(doc.body);
  const name=encoder.encode(filename);
  total+=76+2*name.length+body.length;
  if(total>OFFICE_BUNDLE_LIMIT)throw new Error('Selected Markdown exceeds the 24 MB export limit. Select fewer documents.');
  files.push({name:filename,body});
  manifest.push({id:doc.id,title:doc.title,filename,revision:doc.revision,updatedAt:doc.updatedAt});
 }
 const metadata=encoder.encode(JSON.stringify({kind:'thiepn-hub-office-markdown-bundle',schemaVersion:1,exportedAt:date,documents:manifest},null,2));
 files.push({name:'office-export-manifest.json',body:metadata});
 total+=76+2*encoder.encode('office-export-manifest.json').length+metadata.length;
 if(total>OFFICE_BUNDLE_LIMIT)throw new Error('Office export would exceed 24 MB.');
 const entries:ZipEntry[]=files.map(file=>({name:encoder.encode(file.name),data:file.body,checksum:crc32(file.body),offset:0}));
 const bytes=new Uint8Array(total),view=new DataView(bytes.buffer);
 let cursor=0;
 const u16=(n:number)=>{view.setUint16(cursor,n,true);cursor+=2;};
 const u32=(n:number)=>{view.setUint32(cursor,n>>>0,true);cursor+=4;};
 const write=(arr:Uint8Array)=>{bytes.set(arr,cursor);cursor+=arr.length;};
 for(const entry of entries){
  entry.offset=cursor;
  u32(0x04034b50);u16(20);u16(0x0800);u16(0);u16(0);u16(0);
  u32(entry.checksum);u32(entry.data.length);u32(entry.data.length);
  u16(entry.name.length);u16(0);write(entry.name);write(entry.data);
 }
 const startCentral=cursor;
 for(const entry of entries){
  u32(0x02014b50);u16(20);u16(20);u16(0x0800);u16(0);u16(0);u16(0);
  u32(entry.checksum);u32(entry.data.length);u32(entry.data.length);
  u16(entry.name.length);u16(0);u16(0);u16(0);u16(0);u32(0);u32(entry.offset);write(entry.name);
 }
 const centralSize=cursor-startCentral;
 u32(0x06054b50);u16(0);u16(0);u16(entries.length);u16(entries.length);
 u32(centralSize);u32(startCentral);u16(0);
 if(cursor!==total)throw new Error('Office ZIP layout length mismatch. No download was created.');
 return {bytes,documentCount:input.length,byteLength:bytes.byteLength};
}
