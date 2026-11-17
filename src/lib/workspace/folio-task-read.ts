/** Folio owns every task row. Hub validates and displays only this temporary
 * same-device projection; it never persists, edits, syncs or imports the rows. */
export const FOLIO_TASK_READ_MESSAGE='thiepn:folio-hub-tasks-read:v1' as const;
export const FOLIO_LIVE_GRANT_KEY='folio:hub:task-read-consent:v1' as const;
export const FOLIO_TASK_READ_MAX_AGE_MS=90_000;
export type FolioTaskBucket='today'|'inbox'|'upcoming'|'later';
export type FolioTaskFilter=FolioTaskBucket|'all';
export type FolioReadStatus='disconnected'|'connecting'|'reading'|'ready'|'paused'|'unavailable';
export const FOLIO_TASK_BUCKETS:readonly FolioTaskBucket[]=['today','inbox','upcoming','later'];
export interface FolioReadTask {
  id:string;title:string;status:'todo'|'inbox';priority:'normal'|'high'|'critical';
  updatedAt:string;plannedDate?:string;deadline?:string;bucket:FolioTaskBucket;
}
export interface FolioTaskReadSnapshot {
  schema:'thiepn:folio-hub-tasks';version:1;source:'folio-local-device';
  date:string;generatedAt:string;totalCount:number;
  counts:Record<FolioTaskBucket,number>;truncated:boolean;tasks:readonly FolioReadTask[];
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
      seen.has(value.id as string))throw Error('Invalid Folio task');
    seen.add(value.id as string);
    visible[value.bucket as string]!++;
  }
  if(FOLIO_TASK_BUCKETS.some(b=>visible[b]!>Number(counts[b])))throw Error('Invalid Folio bucket coverage');
  const parsed=raw as unknown as FolioTaskReadSnapshot;
  if(!freshFolioTaskRead(parsed,now))throw Error('Expired Folio task read');
  return parsed;
}
