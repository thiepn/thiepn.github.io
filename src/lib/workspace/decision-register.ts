/** Native Hub decision register. Stores bounded deliberation, not app-owner copies or calendar reminders. */
import {uid,stamp,type Widget,type WorkspaceState} from './types';
import {validDate} from './model';

export const MAX_DECISIONS=12;
export interface HubDecision {
  id:string;title:string;context:string;options:string[];choice:string;reason:string;
  review:string;status:'open'|'decided'|'archived';taskId:string;noteId:string;updatedAt:string;
}
export type DecisionDraft=Pick<HubDecision,'title'|'context'|'options'|'review'|'taskId'|'noteId'>;
const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const id=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=128;
function valid(value:unknown):value is HubDecision {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 return Object.keys(v).sort().join(',')==='choice,context,id,noteId,options,reason,review,status,taskId,title,updatedAt'&&
  id(v.id)&&typeof v.title==='string'&&v.title.trim().length>0&&v.title.length<=100&&
  typeof v.context==='string'&&v.context.length<=300&&
  Array.isArray(v.options)&&v.options.length>=2&&v.options.length<=4&&
  v.options.every((x:unknown)=>typeof x==='string'&&x.trim().length>0&&x.length<=90)&&
  new Set(v.options).size===v.options.length&&
  typeof v.choice==='string'&&v.choice.length<=90&&
  typeof v.reason==='string'&&v.reason.length<=500&&
  typeof v.review==='string'&&(!v.review||validDate(v.review))&&
  ['open','decided','archived'].includes(String(v.status))&&
  (v.status==='open'?v.choice===''&&v.reason==='':v.options.includes(v.choice))&&
  typeof v.taskId==='string'&&(!v.taskId||id(v.taskId))&&
  typeof v.noteId==='string'&&(!v.noteId||id(v.noteId))&&
  typeof v.updatedAt==='string'&&v.updatedAt.length<=100&&Number.isFinite(Date.parse(v.updatedAt));
}
export const validDecisionConfig=(value:unknown):boolean=>
 value===undefined||(Array.isArray(value)&&value.length<=MAX_DECISIONS&&
   value.every(valid)&&new Set(value.map((v:HubDecision)=>v.id)).size===value.length);
export function decisionBoard(state:WorkspaceState):Widget|null {
 return state.workspaces.find(w=>w.id===state.active)?.widgets.find(w=>w.type==='decision-register'&&w.typeVersion===1)??null;
}
export function decisions(state:WorkspaceState):HubDecision[] {
 const value=decisionBoard(state)?.config.decisions;
 return validDecisionConfig(value)?(value as HubDecision[]|undefined)?.map(v=>({...v,options:[...v.options]}))??[]:[];
}
function board(state:WorkspaceState):Widget {
 const old=decisionBoard(state);if(old)return old;
 const workspace=state.workspaces.find(w=>w.id===state.active);
 if(!workspace)throw Error('Workspace changed.');
 if(workspace.widgets.length>=32)throw Error('The workspace already has 32 widgets.');
 const y=Math.max(0,...workspace.widgets.map(w=>w.desktop.y+w.desktop.h));
 if(y>9966)throw Error('No room for another widget.');
 const widget:Widget={id:uid(),type:'decision-register',typeVersion:1,view:'detailed',
  config:{decisions:[]},desktop:{x:0,y,w:6,h:34},order:workspace.widgets.length};
 workspace.widgets.push(widget);return widget;
}
function changed(state:WorkspaceState){
 const w=state.workspaces.find(x=>x.id===state.active)!;w.revision++;w.updatedAt=stamp();
}
/** Source references are checked before any mutation; JSON snapshot prevents silent stale edits. */
export function saveDecision(state:WorkspaceState,originalId:string|null,draft:DecisionDraft,snapshot:string|null):string {
 const list=decisions(state),old=originalId?list.find(x=>x.id===originalId):null;
 if(originalId&&(!old||JSON.stringify(old)!==snapshot))throw Error('Decision changed. Reopen the latest version.');
 if(!originalId&&list.length>=MAX_DECISIONS)throw Error('Decision register is full (12 records).');
 const next:HubDecision={
  id:originalId??uid(),title:draft.title.trim(),context:draft.context,options:draft.options.map(v=>v.trim()),
  choice:old?.choice??'',reason:old?.reason??'',review:draft.review,
  status:old?.status??'open',taskId:draft.taskId,noteId:draft.noteId,updatedAt:stamp()
 };
 if(!valid(next))throw Error('Provide a title, two to four distinct options and valid source links; a decided choice must remain an option.');
 if(next.taskId&&!state.tasks.some(t=>t.id===next.taskId))throw Error('Linked original task is unavailable.');
 if(next.noteId&&!state.notes.some(n=>n.id===next.noteId))throw Error('Linked original note is unavailable.');
 const widget=board(state);
 widget.config.decisions=old?list.map(x=>x.id===old.id?next:x):[...list,next];changed(state);
 return next.id;
}
export function decide(state:WorkspaceState,idValue:string,snapshot:string,choice:string,reason:string) {
 const list=decisions(state),old=list.find(x=>x.id===idValue);
 if(!old||JSON.stringify(old)!==snapshot)throw Error('Decision changed. Reopen the latest version.');
 if(old.status==='archived')throw Error('Restore the decision before revising it.');
 const next={...old,status:'decided' as const,choice,reason:reason.trim(),updatedAt:stamp()};
 if(!valid(next)||!next.reason.trim())throw Error('Choose an existing option and record why you chose it.');
 decisionBoard(state)!.config.decisions=list.map(x=>x.id===idValue?next:x);changed(state);
}
export function transitionDecision(state:WorkspaceState,idValue:string,snapshot:string,mode:'reopen'|'archive'|'restore'|'remove') {
 const list=decisions(state),old=list.find(x=>x.id===idValue);
 if(!old||JSON.stringify(old)!==snapshot)throw Error('Decision changed. Reopen the latest version.');
 if(mode==='restore'&&old.status!=='archived')throw Error('This decision is not archived.');
 if(mode==='reopen'&&old.status!=='decided')throw Error('Only decided entries can be reopened.');
 if(mode==='archive'&&old.status==='archived')throw Error('Already archived.');
 const next:HubDecision=mode==='reopen'?{...old,status:'open',choice:'',reason:'',updatedAt:stamp()}:
  {...old,status:mode==='archive'?'archived':'decided',updatedAt:stamp()};
 decisionBoard(state)!.config.decisions=mode==='remove'?list.filter(x=>x.id!==idValue):
  list.map(x=>x.id===idValue?next:x);changed(state);
}
export function renderDecisions(state:WorkspaceState,today:string,compact=false):string {
 const list=decisions(state),live=list.filter(x=>x.status!=='archived');
 const due=live.filter(x=>x.review&&x.review<=today);
 const active=[...live].sort((a,b)=>{
  const rank=(x:HubDecision)=>x.review&&x.review<=today?0:x.status==='open'?1:2;
  return rank(a)-rank(b)||(a.review||'9999').localeCompare(b.review||'9999')||a.title.localeCompare(b.title);
 });
 const shown=compact?active.slice(0,3):active;
 const row=(d:HubDecision)=> {
  const task=d.taskId?state.tasks.find(t=>t.id===d.taskId):null;
  const note=d.noteId?state.notes.find(n=>n.id===d.noteId):null;
  const missing=(d.taskId&&!task?1:0)+(d.noteId&&!note?1:0);
  return '<li class="ws-decision-row" data-decision-id="'+escape(d.id)+'"><header><strong>'+escape(d.title)+'</strong>'+
   '<small>'+escape(d.status)+' · '+escape(d.review?(d.review<=today?'Review due ':'Review ')+d.review:'No review date')+'</small></header>'+
   (compact?'':'<p>'+escape(d.context||'No context recorded.')+'</p>')+
   '<p>'+escape(d.status==='open'?d.options.length+' options to consider':'Selected: '+d.choice)+'</p>'+
   (!compact&&d.reason?'<p>Reason: '+escape(d.reason)+'</p>':'')+
   (missing?'<p role="status">'+missing+' original link(s) unavailable; no cached content shown.</p>':'')+
   (!compact&&(task||note)?'<div class="ws-decision-links">'+(task?'<button type="button" data-action="context-task" data-id="'+escape(task.id)+'">Original task: '+escape(task.title)+'</button>':'')+
     (note?'<button type="button" data-action="edit-note" data-id="'+escape(note.id)+'">Original note: '+escape(note.title)+'</button>':'')+'</div>':'')+
   '<div class="ws-decision-actions"><button type="button" data-action="edit-decision" data-id="'+escape(d.id)+'">Edit</button>'+
   (d.status!=='archived'?'<button type="button" data-action="choose-decision" data-id="'+escape(d.id)+'">'+(d.status==='decided'?'Change choice':'Decide')+'</button>':'')+
   (d.status==='decided'?'<button type="button" data-action="reopen-decision" data-id="'+escape(d.id)+'">Reopen</button>':'')+
   (d.status==='archived'?'<button type="button" data-action="restore-decision" data-id="'+escape(d.id)+'">Restore</button>':
     '<button type="button" data-action="archive-decision" data-id="'+escape(d.id)+'">Archive</button>')+
   (!compact?'<button type="button" data-action="remove-decision" data-id="'+escape(d.id)+'">Remove</button>':'')+'</div></li>';
 };
 return '<section class="ws-decision-board" data-decision-board'+(compact?' data-today-decisions':'')+'>'+
  (compact?'<header><h3>Decisions</h3><small>'+due.length+' review due · '+live.filter(x=>x.status==='open').length+' open</small></header>':'')+
  (shown.length?'<ol class="ws-decision-list">'+shown.map(row).join('')+'</ol>':'<p>No active decisions in this workspace.</p>')+
  (compact&&shown.length<active.length?'<p>Showing '+shown.length+' of '+active.length+' active decisions. Open Workspace for the full register.</p>':'')+
  (!compact&&list.some(x=>x.status==='archived')?'<details><summary>Archived decisions</summary><ol class="ws-decision-list">'+list.filter(x=>x.status==='archived').map(row).join('')+'</ol></details>':'')+
  '<button type="button" data-action="new-decision"'+(list.length>=MAX_DECISIONS?' disabled':'')+'>New decision</button>'+
  '<p class="ws-record-pin-disclosure">Local Hub decision records. Review dates are informational, not calendar events or notification reminders. Linked original IDs stay with their own owners.</p></section>';
}
