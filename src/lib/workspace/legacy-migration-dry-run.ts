import type {WorkspaceState} from './types';
import {inspectOriginalOwnerExport,type OriginalExportPreflight} from './legacy-full-export-preflight';

/** Read-only plan: original ID is retained, never rewritten or allocated here. */
export interface OwnerDryRunRow {
 readonly kind:'task'|'event'|'note'|'tracker';
 readonly originalId:string;
 readonly proposedOriginalId:string;
 readonly status:'ID_COLLISION'|'TITLE_AMBIGUITY'|'SOURCE_ONLY'|'MISSING_RELATION';
 readonly sourceRelations:readonly string[];
 readonly originalAttachmentIds:readonly string[];
 readonly destinationWrites:0;
}
export interface OwnerDryRun {
 readonly owner:'folio'|'notes';
 readonly originalFileSha256:string;
 readonly hubRevision:number;
 readonly counts:Readonly<Record<OwnerDryRunRow['status'],number>>;
 readonly rows:readonly OwnerDryRunRow[];
 readonly blocked:true;
 readonly writes:0;
 readonly sourceAuthenticated:false;
 readonly approvalRequired:true;
 readonly reasons:readonly string[];
}
type PlanWorkspace=Pick<WorkspaceState,'revision'|'tasks'|'events'|'notes'|'trackers'>;
type SourceObject=Record<string,unknown>;
const obj=(v:unknown):v is SourceObject=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const table=(d:SourceObject,key:string):SourceObject[]=>
  (d[key] as unknown[]).map(v=>v as SourceObject);
const key=(kind:string,title:string)=>kind+'\u0000'+title.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/gu,' ');
const hasId=(v:unknown):v is string=>typeof v==='string'&&v.length>0;
const fields={
 folio:[
  {kind:'task',table:'tasks',relations:['projectId','parentTaskId','seriesId']},
  {kind:'note',table:'notes',relations:['sourceTaskId']},
  {kind:'tracker',table:'habits',relations:['groupId']},
 ] as const,
 notes:[{kind:'note',table:'notes',relations:[]} ] as const,
} as const;
export async function makeOriginalOwnerDryRun(
 bytes:Uint8Array,workspace:PlanWorkspace,now=Date.now(),
):Promise<{preflight:OriginalExportPreflight;plan:OwnerDryRun}>{
 const preflight=await inspectOriginalOwnerExport(bytes,workspace,now);
 // This parse remains strictly in memory: all owner records and titles die with
 // the current tab. Preflight verified the format, bounded size and graph.
 const raw:SourceObject=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as SourceObject;
 if(!obj(raw.data))throw new Error('Validated export envelope became unavailable.');
 const data=raw.data;
 const current=[
  ...workspace.tasks.map(x=>({kind:'task',id:x.id,title:x.title})),
  ...workspace.events.map(x=>({kind:'event',id:x.id,title:x.title})),
  ...workspace.notes.map(x=>({kind:'note',id:x.id,title:x.title})),
  ...workspace.trackers.map(x=>({kind:'tracker',id:x.id,title:x.title})),
 ];
 const hubIds=new Set(current.map(x=>x.id));
 const hubTitles=new Set(current.map(x=>key(x.kind,x.title)));
 const sourceIds=new Map<string,Set<string>>();
 const allTables=Object.entries(data).filter(([,v])=>Array.isArray(v));
 for(const [name,rawRecords] of allTables)
  sourceIds.set(name,new Set((rawRecords as unknown[]).filter(obj).map(x=>String(x.id))));
 const references=(entity:SourceObject,kind:string):string[]=>{
  if(preflight.owner!=='folio')return [];
  const out:string[]=[];
  const requireReference=(field:string,sourceTable:string)=>{
   const v=entity[field];
   if(hasId(v)&&!sourceIds.get(sourceTable)?.has(v))
    out.push(field+' absent from '+sourceTable);
  };
  if(kind==='task'){
   requireReference('projectId','projects');
   requireReference('parentTaskId','tasks');
   requireReference('seriesId','recurringSeries');
  }
  if(kind==='note')requireReference('sourceTaskId','tasks');
  if(kind==='tracker')requireReference('groupId','habitGroups');
  return out;
 };
 const rows=fields[preflight.owner].flatMap(({table:tableName,kind})=>
  table(data,tableName).map(record=>{
   const originalId=String(record.id);
   const title=typeof record.title==='string'?record.title:'';
   const sourceRelations=references(record,kind);
   const originalAttachmentIds=table(data,'attachments').filter(attachment=>
     preflight.owner==='folio'
       ?(kind==='task'||kind==='note')&&attachment.ownerType===kind&&attachment.ownerId===originalId
       :kind==='note'&&attachment.noteId===originalId
   ).map(attachment=>String(attachment.id)).sort();
   const status:OwnerDryRunRow['status']=hubIds.has(originalId)?'ID_COLLISION'
      :sourceRelations.length?'MISSING_RELATION'
      :hubTitles.has(key(kind,title))?'TITLE_AMBIGUITY':'SOURCE_ONLY';
   return {kind,originalId,proposedOriginalId:originalId,status,sourceRelations,originalAttachmentIds,destinationWrites:0 as const};
  }));
 const counts={ID_COLLISION:0,TITLE_AMBIGUITY:0,SOURCE_ONLY:0,MISSING_RELATION:0};
 rows.forEach(row=>{counts[row.status]++});
 return {preflight,plan:{
  owner:preflight.owner,originalFileSha256:preflight.sha256,hubRevision:workspace.revision,
  counts,rows,blocked:true,writes:0,sourceAuthenticated:false,approvalRequired:true,
  reasons:[
   'Original IDs are never rewritten, generated, replaced or silently merged.',
   'Conflicts require source-owner export proof, full relationship/attachment validation, and an independently verified destination backup.',
   'This preview has no commit pathway and cannot modify the original owner, encrypted vault, Hub or production.',
  ],
 }};
}
export function renderOriginalOwnerDryRun(plan:OwnerDryRun):string{
 return '<section data-legacy-dry-run aria-label="Read-only migration collision plan">'+
 '<h4>Conflict-safe dry run</h4><p>'+plan.rows.length+' candidate original records · '+
 plan.counts.ID_COLLISION+' matching IDs · '+plan.counts.TITLE_AMBIGUITY+
 ' ambiguous titles · '+plan.counts.MISSING_RELATION+
 ' missing source relations · '+plan.counts.SOURCE_ONLY+' source-only records</p>'+
 '<p>Original IDs retained. No records imported or merged; every candidate is held for authorization and independent backup review.</p></section>';
}
