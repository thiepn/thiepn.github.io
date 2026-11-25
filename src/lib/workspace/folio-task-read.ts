/** Folio owns every task row. Hub validates and displays only this temporary
 * same-device projection; it never persists, edits, syncs or imports the rows. */
export const FOLIO_TASK_READ_MESSAGE='thiepn:folio-hub-tasks-read:v1' as const;
export const FOLIO_LIVE_GRANT_KEY='folio:hub:task-read-consent:v1' as const;
export const FOLIO_TASK_READ_MAX_AGE_MS=90_000;
export type FolioTaskBucket='today'|'inbox'|'upcoming'|'later';
export type FolioTaskFilter=FolioTaskBucket|'all'|'completed';
export type FolioReadStatus='disconnected'|'connecting'|'reading'|'ready'|'paused'|'unavailable';
export const FOLIO_TASK_BUCKETS:readonly FolioTaskBucket[]=['today','inbox','upcoming','later'];
export interface FolioReadTask {
  id:string;title:string;status:'todo'|'inbox';priority:'normal'|'high'|'critical';
  updatedAt:string;plannedDate?:string;deadline?:string;bucket:FolioTaskBucket;
  recurring?:boolean;hasSubtasks?:boolean;
  projectId?:string;projectName?:string;listId?:string;listName?:string;
}
export interface FolioTaskReadSnapshot {
  schema:'thiepn:folio-hub-tasks';version:1;source:'folio-local-device';
  date:string;generatedAt:string;totalCount:number;
  counts:Record<FolioTaskBucket,number>;truncated:boolean;tasks:readonly FolioReadTask[];
  recentCompleted?:readonly {id:string;title:string;priority:'normal'|'high'|'critical';updatedAt:string;completedAt?:string;plannedDate?:string}[];
  availableProjects?:readonly {id:string;name:string}[];
  availableLists?:readonly {id:string;name:string}[];
  contextTruncated?:boolean;
}
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const day=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const text=(v:unknown,max:number)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const count=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=100_000;
function localDay(now:number):string {
  const d=new Date(now);
  return [String(d.getFullYear()).padStart(4,'0'),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
export function freshFolioTaskRead(value:FolioTaskReadSnapshot|null,now=Date.now()):value is FolioTaskReadSnapshot {
  if(!value||!Number.isFinite(now))return false;
  const at=Date.parse(value.generatedAt);
  return Number.isFinite(at)&&at<=now&&now-at<FOLIO_TASK_READ_MAX_AGE_MS&&value.date===localDay(now);
}
export function parseFolioTaskRead(raw:unknown,now=Date.now()):FolioTaskReadSnapshot {
  if(!obj(raw)||raw.schema!=='thiepn:folio-hub-tasks'||raw.version!==1||
     raw.source!=='folio-local-device'||!day(raw.date)||typeof raw.generatedAt!=='string'||
     !count(raw.totalCount)||!obj(raw.counts)||typeof raw.truncated!=='boolean'||
     !Array.isArray(raw.tasks)||raw.tasks.length>160)throw Error('Invalid Folio task read');
  const counts=raw.counts as Record<string,unknown>;
  if(FOLIO_TASK_BUCKETS.some(b=>!count(counts[b]))||
    FOLIO_TASK_BUCKETS.reduce((n,b)=>n+Number(counts[b]),0)!==raw.totalCount||
    raw.truncated!==(Number(raw.totalCount)>raw.tasks.length))throw Error('Invalid Folio task counts');
  const seen=new Set<string>(),visible:{[key:string]:number}={today:0,inbox:0,upcoming:0,later:0};
  for(const value of raw.tasks as unknown[]){
    if(!obj(value)||!text(value.id,128)||!text(value.title,160)||!text(value.updatedAt,64)||
      !Number.isFinite(Date.parse(value.updatedAt as string))||
      !['todo','inbox'].includes(String(value.status))||
      !['normal','high','critical'].includes(String(value.priority))||
      !FOLIO_TASK_BUCKETS.includes(value.bucket as FolioTaskBucket)||
      (value.deadline!==undefined&&!day(value.deadline))||
      (value.plannedDate!==undefined&&!day(value.plannedDate))||
      (value.recurring!==undefined&&typeof value.recurring!=='boolean')||
      (value.hasSubtasks!==undefined&&typeof value.hasSubtasks!=='boolean')||
      (value.projectId!==undefined&&!text(value.projectId,128))||
      (value.projectName!==undefined&&!text(value.projectName,120))||
      (value.projectName!==undefined&&value.projectId===undefined)||
      (value.listId!==undefined&&!text(value.listId,128))||
      (value.listName!==undefined&&!text(value.listName,120))||
      (value.listName!==undefined&&value.listId===undefined)||
      seen.has(value.id as string))throw Error('Invalid Folio task');
    seen.add(value.id as string);
    visible[value.bucket as string]!++;
  }
  if(FOLIO_TASK_BUCKETS.some(b=>visible[b]!>Number(counts[b])))throw Error('Invalid Folio bucket coverage');
  if(raw.recentCompleted!==undefined){
    if(!Array.isArray(raw.recentCompleted)||raw.recentCompleted.length>20)throw Error('Invalid Folio completed tasks');
    const completeIds=new Set<string>();
    for(const completed of raw.recentCompleted){
      if(!obj(completed)||!text(completed.id,128)||!text(completed.title,160)||
         !text(completed.updatedAt,64)||!Number.isFinite(Date.parse(completed.updatedAt as string))||
         !['normal','high','critical'].includes(String(completed.priority))||
         (completed.plannedDate!==undefined&&!day(completed.plannedDate))||
         (completed.completedAt!==undefined&&!Number.isFinite(Date.parse(String(completed.completedAt))))||
         seen.has(completed.id as string)||completeIds.has(completed.id as string))throw Error('Invalid recently completed Folio task');
      completeIds.add(completed.id as string);
    }
  }
  for(const key of ['availableProjects','availableLists'] as const){
    if(raw[key]!==undefined){
      const values=raw[key];
      if(!Array.isArray(values)||values.length>80)throw Error('Invalid Folio source context');
      const ids=new Set<string>();
      for(const entry of values){
        if(!obj(entry)||!text(entry.id,128)||!text(entry.name,120)||ids.has(entry.id as string))
          throw Error('Invalid Folio source context entry');
        ids.add(entry.id as string);
      }
    }
  }
  if(raw.contextTruncated!==undefined&&typeof raw.contextTruncated!=='boolean')
    throw Error('Invalid Folio context completeness');
  const parsed=raw as unknown as FolioTaskReadSnapshot;
  if(!freshFolioTaskRead(parsed,now))throw Error('Expired Folio task read');
  return parsed;
}
