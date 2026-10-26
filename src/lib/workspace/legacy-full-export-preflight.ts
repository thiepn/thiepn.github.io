import type {WorkspaceState} from './types';

/**
 * Strict, read-only preflight for actual owner backups. A local file hash is
 * evidence of byte identity, NOT evidence of origin or author authorization.
 * This module deliberately contains no writer or migration executor.
 */
export const ORIGINAL_EXPORT_SOURCE = {
  folio:{repository:'thiepn/folio',format:'folio-backup',version:24,
    serviceBlob:'b52153a6e4bffbd68da2d7c72d9730714ce99429',
    schemaBlob:'c93743d7d2028b44035fd72b940cc943686b4df5'},
  notes:{repository:'thiepn/notes',format:'thiepn.notes.backup',version:2,
    databaseVersion:3,formatBlob:'3f37c0fdb65111f3c75bc71ed8258dd4db9462ce'},
} as const;
const MAX_BYTES=64*1024*1024;
type TableCounts=Record<string,number>;
export interface OriginalExportPreflight {
  readonly owner:'folio'|'notes';
  readonly sourceRevision:string;
  readonly bytes:number;
  readonly sha256:string;
  readonly exportedAt:string;
  readonly counts:TableCounts;
  readonly sameIdCount:number;
  readonly sameTitleCount:number;
  readonly reviewHolds:readonly string[];
  readonly eligibleToMigrate:false;
  readonly originAuthenticated:false;
}
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown)=>typeof v==='string'&&v.length>0;
const noteTables=['notes','checklistItems','labels','noteLabels','attachments','reminders','revisions','settings'] as const;
const folioTables=['tasks','projects','habits','habitEntries','timeBlocks','dailyPlans','dailyPlanItems','focusSessions','recurringSeries','settings','importBatches','reviewRecords','reminders','reminderOccurrences','folders','lists','sections','tags','notes','attachments','habitGroups','habitTemplates'] as const;
const titleKey=(kind:string,v:string)=>kind+'\u0000'+v.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/gu,' ');
const hex=(data:ArrayBuffer)=>[...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,'0')).join('');
function requireIds(rows:readonly unknown[],owner:string,table:string){
  const ids=new Set<string>();
  for(const row of rows){
    if(!object(row)||!text(row.id))throw new Error(owner+' '+table+' contains an invalid source ID');
    if(ids.has(row.id as string))throw new Error(owner+' '+table+' contains duplicate source IDs');
    ids.add(row.id as string);
  }
  return ids;
}
export async function inspectOriginalOwnerExport(
 bytes:Uint8Array,workspace:Pick<WorkspaceState,'tasks'|'events'|'notes'|'trackers'>,
 now=Date.now(),
):Promise<OriginalExportPreflight>{
 if(!(bytes instanceof Uint8Array)||bytes.length===0||bytes.length>MAX_BYTES)
  throw new Error('Bounded export preflight accepts only nonempty JSON files up to 64 MiB; preserve a larger original backup unchanged.');
 let raw:unknown;
 try{raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{throw new Error('Owner export is not valid UTF-8 JSON');}
 if(!object(raw)||!text(raw.format)||!object(raw.data))throw new Error('No recognized original owner backup envelope');
 const owner=raw.format===ORIGINAL_EXPORT_SOURCE.folio.format?'folio':raw.format===ORIGINAL_EXPORT_SOURCE.notes.format?'notes':null;
 if(!owner)throw new Error('Unsupported owner backup format; no data was changed');
 const contract=ORIGINAL_EXPORT_SOURCE[owner];
 if(raw.version!==undefined&&owner==='notes')throw new Error('Unexpected Notes backup version field');
 if(owner==='folio'&&raw.version!==contract.version)throw new Error('Folio export requires exact v24 owner schema for this preflight');
 if(owner==='notes'&&(raw.formatVersion!==contract.version||raw.databaseVersion!==3))throw new Error('Notes export requires v2 format / database v3');
 const stamp=owner==='notes'?typeof raw.exportedAt==='number'?raw.exportedAt:NaN:Date.parse(String(raw.exportedAt??''));
 if(!Number.isFinite(stamp)||stamp<0||stamp>now+5*60_000)throw new Error('Owner export has an invalid or future timestamp');
 const tables=owner==='notes'?noteTables:folioTables;
 const records:Record<string,unknown[]>={};
 for(const name of tables){
  const part=raw.data[name];
  if(!Array.isArray(part))throw new Error('Owner export is incomplete: '+name);
  records[name]=part;
 }
 const ids:Record<string,Set<string>>={};
 for(const name of tables)ids[name]=requireIds(records[name]!,owner,name);
 if(owner==='notes'){
  for(const table of ['checklistItems','attachments','reminders','revisions','noteLabels']){
   for(const row of records[table]!)if(!ids.notes!.has((row as Record<string,unknown>).noteId as string))
    throw new Error('Notes '+table+' refers to a missing original note');
  }
  for(const row of records.noteLabels!)if(!ids.labels!.has((row as Record<string,unknown>).labelId as string))
   throw new Error('Notes labels are missing from the original backup');
  for(const row of records.attachments!) {
   const item=row as Record<string,unknown>;
   if(typeof item.dataBase64!=='string'||typeof item.dataSha256!=='string'||!(/^([a-f0-9]{64})$/u.test(item.dataSha256)))
    throw new Error('Notes backup attachment integrity fields are incomplete');
   if(item.dataBase64.length>48*1024*1024)throw new Error('Large Notes attachment needs original-owner validation');
   let decoded:Uint8Array;
   try{decoded=Uint8Array.from(atob(item.dataBase64),c=>c.charCodeAt(0));}
   catch{throw new Error('Notes backup attachment base64 is invalid');}
   if(decoded.length!==item.size||hex(await crypto.subtle.digest('SHA-256',decoded.buffer))!==item.dataSha256)
    throw new Error('Notes backup attachment failed original SHA-256/size validation');
  }
 }
 const current=[
  ...workspace.tasks.map(r=>({kind:'task',id:r.id,title:r.title})),
  ...workspace.events.map(r=>({kind:'event',id:r.id,title:r.title})),
  ...workspace.notes.map(r=>({kind:'note',id:r.id,title:r.title})),
  ...workspace.trackers.map(r=>({kind:'tracker',id:r.id,title:r.title})),
 ];
 const ownerKinds=owner==='folio'
  ?[{table:'tasks',kind:'task'},{table:'notes',kind:'note'},{table:'habits',kind:'tracker'}]
  :[{table:'notes',kind:'note'}];
 const originalRows=ownerKinds.flatMap(({table,kind})=>records[table]!.map(record=>{
  const r=record as Record<string,unknown>;
  return {kind,id:String(r.id),title:typeof r.title==='string'?r.title:''};
 }));
 const currentIds=new Set(current.map(x=>x.id));
 const currentTitles=new Set(current.map(x=>titleKey(x.kind,x.title)));
 const sha=hex(await crypto.subtle.digest('SHA-256',Uint8Array.from(bytes).buffer));
 const holds=[
  'Local file SHA-256 proves byte identity, not original-owner authenticity or consent.',
  'Original owner validators, complete backup custody and an independent Hub backup must be verified.',
  'Original IDs, relations, attachments, reminder history and encryption ownership cannot be safely flattened into Hub.',
  'Any same-title or same-ID entry requires explicit human resolution; no writes are authorized.',
 ];
 if(owner==='folio')holds.push('Full Folio attachment bytes and cross-table relationships need original-owner validation.');
 else holds.push('Notes backup graph, source revisions and original attachment validators must run in the Notes owner.');
 return {
  owner,sourceRevision:owner==='folio'?ORIGINAL_EXPORT_SOURCE.folio.serviceBlob:ORIGINAL_EXPORT_SOURCE.notes.formatBlob,
  bytes:bytes.length,sha256:sha,exportedAt:new Date(stamp).toISOString(),
  counts:Object.fromEntries(tables.map(name=>[name,records[name]!.length])),
  sameIdCount:originalRows.filter(x=>currentIds.has(x.id)).length,
  sameTitleCount:originalRows.filter(x=>currentTitles.has(titleKey(x.kind,x.title))).length,
  reviewHolds:holds,eligibleToMigrate:false,originAuthenticated:false,
 };
}
export function renderOriginalExportPreflight(r:OriginalExportPreflight):string{
 const html=(v:string)=>v.replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 const rows=Object.entries(r.counts).map(([k,v])=>'<li>'+html(k)+': '+v+'</li>').join('');
 return '<section data-owner-export-result aria-label="Original owner export preview">'+
 '<h3>'+html(r.owner==='folio'?'Folio':'Notes')+' export · inspection only</h3>'+
 '<p>File: '+r.bytes+' bytes · SHA-256 <code>'+r.sha256+'</code></p>'+
 '<p>Exported: '+html(r.exportedAt)+' · owner source revision <code>'+r.sourceRevision+'</code></p>'+
 '<p>'+r.sameIdCount+' matching IDs · '+r.sameTitleCount+' possible same-title matches</p>'+
 '<ul>'+rows+'</ul><p>Source authenticity not verified · Migration not authorized.</p>'+
 '<ul>'+r.reviewHolds.map(h=>'<li>'+html(h)+'</li>').join('')+'</ul></section>';
}
