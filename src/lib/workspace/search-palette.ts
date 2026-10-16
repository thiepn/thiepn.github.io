import { dayKey } from './model';
import type { ApprovedSourceRow } from './approved-source-search';
import type { AppShortcut, WorkspaceState, Task } from './types';

export type PaletteScope = 'all'|'actions'|'apps'|'tasks'|'notes'|'calendar'|'sources';
export const PALETTE_SCOPES: readonly PaletteScope[] = ['all','actions','apps','tasks','notes','calendar','sources'];
export type PaletteGroup = Exclude<PaletteScope,'all'>;
export interface PaletteAction { label:string; command:string; id?:string }
export interface PaletteResult {
  id: string;
  group: PaletteGroup;
  title: string;
  detail: string;
  score: number;
  command?: string;
  resourceId?: string;
  href?: string;
  icon: string;
  extra?: PaletteAction[];
}
export interface PaletteOptions {
  apps: readonly AppShortcut[];
  sources?: readonly ApprovedSourceRow[];
  state: WorkspaceState | null;
  query: string;
  scope: PaletteScope;
  route: string;
  today: string;
}
export interface PaletteResults {
  results: PaletteResult[];
  restricted: boolean;
  truncated: boolean;
  actualScope: PaletteScope;
  query: string;
}
export const GROUP_NAMES: Record<PaletteGroup,string> = {
  actions:'Actions',apps:'Apps',tasks:'Hub tasks',notes:'Hub local notes',calendar:'Hub local calendar',sources:'Approved source snapshots'
};
const MAX_QUERY = 100;
const MAX_PER_GROUP = 8;
const MAX_RESULTS = 32;
const fold = (text:string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
const PRIORITY = {high:3,medium:2,low:1,none:0} as const;
function relevance(query:string,title:string,context='',hint='') {
  if(!query) return 1;
  const text=fold(title), words=query.split(' ').filter(Boolean), desc=fold(context).slice(0,1000);
  if(text===query) return 140;
  if(text.startsWith(query)) return 105;
  if(text.split(/[^\p{L}\p{N}]+/u).some(w=>w.startsWith(query))) return 85;
  if(text.includes(query)) return 65;
  if(words.every(w=>text.includes(w))) return 55;
  if(words.every(w=>text.includes(w)||desc.includes(w))) return 28;
  return fold(hint).includes(query) ? 30 : 0;
}
function action(id:string,title:string,detail:string,route:string,query:string,command?:string):PaletteResult|null {
  const score=relevance(query,title,detail);
  return score?{id,group:'actions',title,detail,score:score+8,
    ...(command?{command}:{href:route}),icon:'action'}:null;
}
function dueLabel(task:Task,today:string) {
  if(task.completedAt) return 'Completed · Hub local task';
  return task.due?task.due<today?'Overdue · '+task.due:
    task.due===today?'Due today':'Due '+task.due:'Inbox · unscheduled';
}
/** Builds results on demand from the original workspace. No retained index or provider reads. */
export function findPalette(options:PaletteOptions):PaletteResults {
  const raw=options.query.trim().slice(0,MAX_QUERY);
  let scope=options.scope, query=raw;
  if(raw.startsWith('>')){scope='actions';query=raw.slice(1).trim();}
  else if(raw.startsWith('@')){scope='apps';query=raw.slice(1).trim();}
  else if(raw.startsWith('#')){scope='tasks';query=raw.slice(1).trim();}
  else if(raw.startsWith('~')){scope='sources';query=raw.slice(1).trim();}
  query=fold(query);
  const state=options.state;
  const restricted=!state;
  const rows:PaletteResult[]=[];
  const add=(item:PaletteResult|null)=>{if(item)rows.push(item);};
  const route=options.route;
  const commands=[
    ['capture-note','Capture a note','Save a local Hub note · Ctrl/⌘ Shift Space','', 'capture'],
    ['capture-task','Capture task to Inbox','Create a task without a due date','', 'capture-task'],
    ['new-task','Add dated task','Create a Hub-local task with a due date','', 'new-task'],
    ['new-event','Add local calendar event','Calendar on this device, not Google','', 'new-event'],
    ['task-inbox','Process task Inbox','Plan unscheduled local tasks','/home/tasks/?filter=inbox',''],
    ['task-today','Today and overdue','Open Hub tasks due now','/home/tasks/?filter=today',''],
    ['task-upcoming','Upcoming tasks','Open future Hub task deadlines','/home/tasks/?filter=upcoming',''],
    ['open-calendar','Open calendar','View Hub-local events and external import panel','/home/calendar/',''],
    ['open-workspace','Open Home','Return to personal dashboard','/',''],
    ['open-apps','Browse apps','Reviewed THIEPN app directory','/apps/',''],
    ['open-connections','App connections','Grant access using existing owner applications','/home/connections/',''],
    ['open-settings','Workspace settings','Privacy, layout and backups','/home/settings/','']
  ] as const;
  if(scope==='all'||scope==='actions'){
    for(const [id,title,description,url,command] of commands) {
      if(restricted && (!url || ['task-inbox','task-today','task-upcoming'].includes(id)))continue;
      const item=action(id,title,description,url,query,command||undefined);
      if(item)item.score+=!query && ((route==='/home/tasks/' && id==='task-inbox')||(route==='/home/calendar/'&&id==='new-event')||(route==='/'&&id==='capture-note'))?20:0;
      add(item);
    }
  }
  if(scope==='all'||scope==='apps') {
    for(const app of options.apps) {
      const score=relevance(query,app.title,app.category+' '+app.id);
      if(!score)continue;
      rows.push({id:'app:'+app.id,group:'apps',title:app.title,detail:'Reviewed app link · '+app.category,
        href:app.url,icon:app.icon,score:score+3});
    }
  }
  if(state && (scope==='all'||scope==='tasks')) {
    for(const task of state.tasks) {
      const score=relevance(query,task.title,task.notes);
      if(!score)continue;
      const extra:PaletteAction[]=task.completedAt?[]:[
        {label:'Today',command:'task-plan-today',id:task.id},
        {label:'Tomorrow',command:'task-plan-tomorrow',id:task.id},
        ...(task.priority==='high'?[]:[{label:'High',command:'task-plan-high',id:task.id}])
      ];
      rows.push({id:'task:'+task.id,group:'tasks',title:task.title,
        detail:dueLabel(task,options.today)+(task.priority!=='none'?' · '+task.priority+' priority':''),
        command:'edit-task',resourceId:task.id,extra,icon:'check-square',
        score:score+(task.completedAt?-15:task.due&&task.due<=options.today?15:5)+PRIORITY[task.priority]});
    }
  }
  if(state && (scope==='all'||scope==='notes')) {
    for(const note of state.notes) {
      const score=relevance(query,note.title,note.body);
      if(!score)continue;
      rows.push({id:'note:'+note.id,group:'notes',title:note.title,detail:'Hub local note · '+new Date(note.updatedAt).toLocaleDateString(),
        command:'edit-note',resourceId:note.id,icon:'notebook',score:score+2});
    }
  }
  if(state && (scope==='all'||scope==='calendar')) {
    const zone=state.preferences.timezone;
    for(const event of state.events) {
      const score=relevance(query,event.title);
      if(!score)continue;
      const day=event.allDay?event.date:dayKey(zone,new Date(event.start));
      rows.push({id:'event:'+event.id,group:'calendar',title:event.title,
        detail:'Hub local event · '+day+(event.allDay?' · all day':' · '+new Date(event.start).toLocaleTimeString(undefined,{timeZone:zone,hour:'2-digit',minute:'2-digit'})),
        command:'edit-event',resourceId:event.id,icon:'calendar-blank',score:score+(day>=options.today?8:0)});
    }
  }
  if(state && (scope==='all'||scope==='sources')) {
    for(const source of options.sources ?? []) {
      const score=relevance(query,source.title,source.searchHint+' '+source.detail);
      if(!score)continue;
      rows.push({id:'source:'+source.id,group:'sources',title:source.title,
        detail:source.detail,href:source.href,icon:source.icon,score:score+4});
    }
  }
  const order:PaletteGroup[]=['actions','tasks','calendar','notes','sources','apps'];
  const weighted=rows.sort((a,b)=>b.score-a.score||order.indexOf(a.group)-order.indexOf(b.group)||a.title.localeCompare(b.title));
  const limits=new Map<PaletteGroup,number>(),result:PaletteResult[]=[];
  for(const item of weighted) {
    const count=limits.get(item.group)??0;
    if(count>=MAX_PER_GROUP)continue;
    limits.set(item.group,count+1);
    result.push(item);
    if(result.length===MAX_RESULTS)break;
  }
  return {results:result,restricted,truncated:rows.length>result.length,actualScope:scope,query};
}
