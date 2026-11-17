import type {FolioTaskFilter,FolioTaskReadSnapshot,FolioReadTask} from './folio-task-read';

export type FolioTaskGrouping='bucket'|'project'|'none';
export type FolioTaskScope='all'|string;
export interface FolioTaskView {search:string;projectId:FolioTaskScope;group:FolioTaskGrouping}
export interface FolioTaskViewResult {
  rows:readonly FolioReadTask[];
  sections:readonly {key:string;title:string;rows:readonly FolioReadTask[]}[];
  sourceCount:number;
  isNarrowed:boolean;
  loadedCount:number;
  truncated:boolean;
}
const bucketNames:{[key:string]:string}={today:'Today & overdue',inbox:'Inbox',upcoming:'Next 7 days',later:'Later'};
export const DEFAULT_FOLIO_TASK_VIEW:Readonly<FolioTaskView>={search:'',projectId:'all',group:'bucket'};
function normalize(value:string){return value.normalize('NFKD').toLocaleLowerCase().replace(/[\u0300-\u036f]/g,'').trim();}
export function selectFolioTaskView(snapshot:FolioTaskReadSnapshot,filter:FolioTaskFilter,view:FolioTaskView):FolioTaskViewResult {
  const query=normalize(view.search.slice(0,100));
  const active=filter==='completed'?[]:snapshot.tasks.filter(task=>filter==='all'||task.bucket===filter);
  const sourceCount=filter==='all'?snapshot.totalCount:filter==='completed'?(snapshot.recentCompleted??[]).length:snapshot.counts[filter];
  const narrowed=!!query||view.projectId!=='all';
  const rows=active.filter(task=>
    (view.projectId==='all'||task.projectId===view.projectId) &&
    (!query||normalize([task.title,task.projectName??'',task.listName??''].join(' ')).includes(query))
  );
  const groups=new Map<string,{key:string;title:string;rows:FolioReadTask[]}>();
  for(const task of rows){
    const key=view.group==='bucket'?task.bucket:view.group==='project'?task.projectId??'none':'all';
    const title=view.group==='bucket'?bucketNames[task.bucket]??task.bucket:
      view.group==='project'?task.projectName??'No project':'Tasks';
    if(!groups.has(key))groups.set(key,{key,title,rows:[]});
    groups.get(key)!.rows.push(task);
  }
  const sections=[...groups.values()].sort((a,b)=>
    view.group==='bucket'?(['today','inbox','upcoming','later'].indexOf(a.key)-
      ['today','inbox','upcoming','later'].indexOf(b.key)):
    view.group==='project'?a.title.localeCompare(b.title):0
  );
  return {rows,sections,sourceCount,isNarrowed:narrowed,
    loadedCount:active.length,truncated:snapshot.truncated};
}
