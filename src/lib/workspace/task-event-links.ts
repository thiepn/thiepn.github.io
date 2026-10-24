/**
 * Durable references between original Hub-local task IDs and calendar event IDs.
 * Explicit relation authority is limited to the active Hub workspace widget;
 * neither record is cloned, rescheduled, completed, nor externally transmitted.
 */
import {uid,stamp,type WorkspaceState,type Widget} from './types';
export const MAX_TASK_EVENT_LINKS=32;
export type RelationRole='work'|'prepare'|'followup';
export interface TaskEventLink {id:string;taskId:string;eventId:string;role:RelationRole;}
export type RelationDraft=Pick<TaskEventLink,'taskId'|'eventId'|'role'>;
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const id=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=128&&/^[A-Za-z0-9_:-]+$/.test(v);
const key=(r:RelationDraft)=>r.taskId+'|'+r.eventId+'|'+r.role;
export function validRelationConfig(raw:unknown):boolean {
 if(raw===undefined)return true;
 if(!Array.isArray(raw)||raw.length>MAX_TASK_EVENT_LINKS)return false;
 const tuples=new Set<string>(),identifiers=new Set<string>();
 for(const item of raw){
  if(!item||typeof item!=='object'||Array.isArray(item))return false;
  const r=item as Record<string,unknown>;
  if(Object.keys(r).sort().join(',')!=='eventId,id,role,taskId'||
    !id(r.id)||!id(r.taskId)||!id(r.eventId)||!['work','prepare','followup'].includes(String(r.role)))return false;
  const tuple=key(r as unknown as TaskEventLink);
  if(tuples.has(tuple)||identifiers.has(String(r.id)))return false;
  tuples.add(tuple);identifiers.add(String(r.id));
 }
 return true;
}
export function relationBoard(state:WorkspaceState):Widget|null {
 return state.workspaces.find(w=>w.id===state.active)?.widgets.find(w=>w.type==='task-event-links'&&w.typeVersion===1)??null;
}
export function taskEventLinks(state:WorkspaceState):TaskEventLink[]{
 const raw=relationBoard(state)?.config.links;
 return validRelationConfig(raw)?(raw as TaskEventLink[]|undefined)?.map(x=>({...x}))??[]:[];
}
function ensure(state:WorkspaceState):Widget {
 const existing=relationBoard(state);if(existing)return existing;
 const ws=state.workspaces.find(w=>w.id===state.active);if(!ws)throw Error('Workspace unavailable.');
 if(ws.widgets.length>=32)throw Error('Workspace has 32 widgets. Remove a widget before linking.');
 const y=Math.max(0,...ws.widgets.map(w=>w.desktop.y+w.desktop.h));
 if(y>9966)throw Error('There is no room for another widget.');
 const result:Widget={id:uid(),type:'task-event-links',typeVersion:1,view:'detailed',config:{links:[]},
   desktop:{x:0,y,w:6,h:34},order:ws.widgets.length};
 ws.widgets.push(result);return result;
}
function touched(state:WorkspaceState) {
 const ws=state.workspaces.find(w=>w.id===state.active)!;ws.revision++;ws.updatedAt=stamp();
}
/** CAS is provided by the existing mutation writer; checking source IDs prevents stale relations. */
export function linkTaskEvent(state:WorkspaceState,draft:RelationDraft):string {
 if(!id(draft.taskId)||!id(draft.eventId)||!['work','prepare','followup'].includes(draft.role))
   throw Error('Link requires original Hub task, event, and relationship role.');
 const task=state.tasks.find(t=>t.id===draft.taskId),event=state.events.find(e=>e.id===draft.eventId);
 if(!task||!event)throw Error('An original record changed or was removed. Reopen the review.');
 const previous=taskEventLinks(state);
 if(previous.some(x=>key(x)===key(draft)))throw Error('These original records are already linked in this role.');
 if(previous.length>=MAX_TASK_EVENT_LINKS)throw Error('Maximum 32 task-event relationships. Unlink one first.');
 const widget=ensure(state),record:TaskEventLink={id:uid(),...draft};
 widget.config.links=[...previous,record];touched(state);return record.id;
}
export function unlinkTaskEvent(state:WorkspaceState,idValue:string,expected:string):void {
 const old=taskEventLinks(state).find(x=>x.id===idValue);
 if(!old||JSON.stringify(old)!==expected)throw Error('Relationship changed. Reopen the current originals.');
 const w=relationBoard(state);if(!w)throw Error('Relationship board unavailable.');
 w.config.links=taskEventLinks(state).filter(x=>x.id!==idValue);touched(state);
}
export function projectRelations(state:WorkspaceState){
 return taskEventLinks(state).map(x=>{
   const task=state.tasks.find(t=>t.id===x.taskId),event=state.events.find(e=>e.id===x.eventId);
   return {...x,task:task??null,event:event??null,missing:!task||!event};
 });
}
function label(role:RelationRole){return role==='prepare'?'Preparation':role==='followup'?'Follow-up':'Scheduled work';}
function rows(state:WorkspaceState,filter:((x:TaskEventLink)=>boolean)|null,compact:boolean){
 const current=projectRelations(state).filter(x=>!filter||filter(x));
 if(!current.length)return '<p>No confirmed task–event relationships here.</p>';
 const shown=compact?current.slice(0,4):current;
 return '<ol class="ws-task-event-rows">'+shown.map(x=>
   '<li data-task-event-id="'+esc(x.id)+'"><strong>'+esc(label(x.role))+'</strong>'+
   (x.missing?'<p role="status">Original task or calendar event removed. This reference can be unlinked; no copy is restored.</p>':
    '<div class="ws-task-event-source">'+
      '<button type="button" data-action="context-task" data-id="'+esc(x.task!.id)+'">'+esc(x.task!.title)+'</button>'+
      '<span>↔</span><button type="button" data-action="context-event" data-id="'+esc(x.event!.id)+'">'+esc(x.event!.title)+' · '+esc(x.event!.date)+'</button>'+
      '<small>'+esc(x.task!.completedAt?'Completed task':'Open task')+' · '+esc(x.event!.allDay?'All day':'Timed Hub event')+'</small></div>')+
   '<button type="button" data-action="unlink-task-event" data-id="'+esc(x.id)+'">Unlink</button></li>'
 ).join('')+'</ol>'+
 (shown.length<current.length?'<p>Showing '+shown.length+' of '+current.length+' links. Open Workspace for the full list.</p>':'');
}
export function renderTaskEventBoard(state:WorkspaceState,compact=false){
 return '<section class="ws-task-event-board" data-task-event-board'+(compact?' data-today-task-event':'')+'>'+
  (compact?'<header><h3>Tasks and calendar blocks</h3><small>'+taskEventLinks(state).length+' explicit links</small></header>':'')+
  rows(state,null,compact)+
  '<button type="button" data-action="review-task-event-link">Link existing records</button>'+
  '</section>';
}
export function renderTaskEventContext(state:WorkspaceState,kind:'task'|'event',idValue:string){
 const count=taskEventLinks(state).filter(x=>kind==='task'?x.taskId===idValue:x.eventId===idValue).length;
 return '<section class="ws-task-event-context" data-task-event-context>'+
   '<h4>Confirmed task–event links ('+count+')</h4>'+
   rows(state,x=>kind==='task'?x.taskId===idValue:x.eventId===idValue,false)+
   '<button type="button" data-action="review-task-event-link" data-id="'+esc(kind+':'+idValue)+'">Link to existing '+(kind==='task'?'calendar event':'task')+'</button>'+
   '</section>';
}
