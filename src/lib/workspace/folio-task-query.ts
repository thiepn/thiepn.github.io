import {FOLIO_TASK_READ_MAX_AGE_MS, FOLIO_TASK_BUCKETS,
  type FolioReadTask,type FolioTaskFilter} from './folio-task-read';
/** Independent, revocable Folio read-only paging contract. No Hub task records
 * are created, imported or persisted. */
export const FOLIO_TASK_QUERY_MESSAGE='thiepn:folio-hub-tasks-query:v1' as const;
export const FOLIO_TASK_QUERY_PAGE_SIZE=40;
export type FolioTaskQueryInput={filter:FolioTaskFilter;search:string;projectId:string;page:number};
export type FolioQueryTask=Omit<FolioReadTask,'bucket'|'status'> & {
  bucket:FolioReadTask['bucket']|'completed';status:FolioReadTask['status']|'completed';
  completedAt?:string;
};
export type FolioTaskQueryResult=FolioTaskQueryInput & {
  schema:'thiepn:folio-hub-task-query';version:1;source:'folio-local-device';
  generatedAt:string;date:string;pageSize:40;total:number;hasMore:boolean;
  rows:readonly FolioQueryTask[];
};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,n:number):v is string=>typeof v==='string'&&v.length<=n&&!/[\u0000-\u001f]/.test(v);
const bounded=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=1_000_000;
const day=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function validFolioTaskQueryInput(value:unknown):value is FolioTaskQueryInput{
 if(!object(value))return false;
 return [...FOLIO_TASK_BUCKETS,'all','completed'].includes(String(value.filter))&&
   text(value.search,100)&&text(value.projectId,128)&&value.projectId.length>0&&
   Number.isSafeInteger(value.page)&&Number(value.page)>=0&&Number(value.page)<=9999;
}
export function parseFolioTaskQueryResult(raw:unknown,expected:FolioTaskQueryInput,now=Date.now()):FolioTaskQueryResult{
 if(!object(raw)||raw.schema!=='thiepn:folio-hub-task-query'||raw.version!==1||
   raw.source!=='folio-local-device'||!date(raw.generatedAt)||!day(raw.date)||
   raw.filter!==expected.filter||raw.search!==expected.search||
   raw.projectId!==expected.projectId||raw.page!==expected.page||
   raw.pageSize!==FOLIO_TASK_QUERY_PAGE_SIZE||!bounded(raw.total)||
   typeof raw.hasMore!=='boolean'||!Array.isArray(raw.rows)||
   raw.rows.length>FOLIO_TASK_QUERY_PAGE_SIZE)throw Error('Invalid Folio page');
 const freshAt=Date.parse(raw.generatedAt);
 const d=new Date(now);
 const local=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 if(raw.date!==local||freshAt>now||now-freshAt>=FOLIO_TASK_READ_MAX_AGE_MS)throw Error('Expired Folio page');
 const start=expected.page*FOLIO_TASK_QUERY_PAGE_SIZE;
 if(start<raw.total && raw.rows.length!==Math.min(40,Number(raw.total)-start)||
    start>=raw.total && raw.rows.length!==0||
    raw.hasMore!==(start+raw.rows.length<raw.total))throw Error('Incomplete Folio page');
 const ids=new Set<string>();
 for(const row of raw.rows){
   if(!object(row)||!text(row.id,128)||!row.id||!text(row.title,160)||!row.title||
      !text(row.updatedAt,64)||!date(row.updatedAt)||
      !['normal','high','critical'].includes(String(row.priority))||
      !['todo','inbox','completed'].includes(String(row.status))||
      ![...FOLIO_TASK_BUCKETS,'completed'].includes(String(row.bucket))||
      (row.status==='completed')!==(row.bucket==='completed')||
      (row.bucket!=='completed'&&row.status==='completed')||
      (row.plannedDate!==undefined&&!day(row.plannedDate))||
      (row.deadline!==undefined&&!day(row.deadline))||
      (row.completedAt!==undefined&&!date(row.completedAt))||
      (row.recurring!==undefined&&typeof row.recurring!=='boolean')||
      (row.hasSubtasks!==undefined&&typeof row.hasSubtasks!=='boolean')||
      (row.projectId!==undefined&&(!text(row.projectId,128)||!row.projectId))||
      (row.listId!==undefined&&(!text(row.listId,128)||!row.listId))||
      (row.projectName!==undefined&&(!text(row.projectName,120)||!row.projectId))||
      (row.listName!==undefined&&(!text(row.listName,120)||!row.listId))||
      ids.has(row.id))throw Error('Invalid Folio task page row');
   ids.add(row.id);
   if(expected.filter==='completed' && row.status!=='completed'||
      expected.filter!=='completed' && row.status==='completed'||
      expected.filter!=='all'&&expected.filter!=='completed'&&row.bucket!==expected.filter||
      expected.projectId==='none'&&row.projectId||
      expected.projectId!=='none'&&expected.projectId!=='all'&&row.projectId!==expected.projectId)
      throw Error('Folio page scope mismatch');
 }
 return raw as FolioTaskQueryResult;
}
