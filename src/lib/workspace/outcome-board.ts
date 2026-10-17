/** Hub-owned outcome metadata references original local tasks and trackers; never copies their data. */
import {uid,stamp,type WorkspaceState,type Widget} from './types';
import {validDate,trackerTotal} from './model';
export interface Outcome {id:string;title:string;target:string;archived:boolean;taskIds:string[];trackerIds:string[];}
export type OutcomeDraft=Pick<Outcome,'title'|'target'|'taskIds'|'trackerIds'>;
export const MAX_OUTCOMES=8;
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ids=(v:unknown,max:number):v is string[]=>Array.isArray(v)&&v.length<=max&&v.every(x=>typeof x==='string'&&x.length>0&&x.length<=128)&&new Set(v).size===v.length;
function valid(o:unknown):o is Outcome {
 if(!o||typeof o!=='object'||Array.isArray(o))return false;
 const v=o as Record<string,unknown>;
 return Object.keys(v).sort().join(',')==='archived,id,target,taskIds,title,trackerIds'&&
 typeof v.id==='string'&&v.id.length>0&&v.id.length<=128&&typeof v.title==='string'&&!!v.title.trim()&&v.title.length<=100&&
 typeof v.target==='string'&&(!v.target||validDate(v.target))&&typeof v.archived==='boolean'&&
 ids(v.taskIds,16)&&ids(v.trackerIds,8);
}
export const validOutcomeConfig=(value:unknown):boolean=>value===undefined||(
 Array.isArray(value)&&value.length<=MAX_OUTCOMES&&value.every(valid)&&new Set(value.map((o:Outcome)=>o.id)).size===value.length);
export const outcomeBoard=(s:WorkspaceState):Widget|null=>s.workspaces.find(w=>w.id===s.active)?.widgets.find(w=>w.type==='outcome-board'&&w.typeVersion===1)??null;
export function outcomes(s:WorkspaceState):Outcome[]{
 const value=outcomeBoard(s)?.config.outcomes;
 return validOutcomeConfig(value)?(value as Outcome[]|undefined)?.map(o=>({...o,taskIds:[...o.taskIds],trackerIds:[...o.trackerIds]}))??[]:[];
}
function ensure(s:WorkspaceState){
 const old=outcomeBoard(s);if(old)return old;
 const w=s.workspaces.find(x=>x.id===s.active);if(!w)throw Error('Workspace changed.');
 if(w.widgets.length>=32)throw Error('The workspace already has 32 widgets.');
 const y=Math.max(0,...w.widgets.map(x=>x.desktop.y+x.desktop.h));if(y>9964)throw Error('No layout room.');
 const board:Widget={id:uid(),type:'outcome-board',typeVersion:1,view:'detailed',config:{outcomes:[]},desktop:{x:0,y,w:6,h:36},order:w.widgets.length};
 w.widgets.push(board);return board;
}
function changed(s:WorkspaceState){const w=s.workspaces.find(x=>x.id===s.active)!;w.revision++;w.updatedAt=stamp();}
export function saveOutcome(s:WorkspaceState,id:string|null,draft:OutcomeDraft,snapshot:string|null) {
 const list=outcomes(s),previous=id?list.find(o=>o.id===id):undefined;
 if(id&&(!previous||JSON.stringify(previous)!==snapshot))throw Error('Outcome changed. Reopen it.');
 if(!id&&list.length>=MAX_OUTCOMES)throw Error('Eight outcomes maximum. Remove one first.');
 const next:Outcome={...draft,title:draft.title.trim(),taskIds:[...draft.taskIds],trackerIds:[...draft.trackerIds],id:id??uid(),archived:previous?.archived??false};
 if(!valid(next))throw Error('Invalid title, target date or original record selection.');
 if(next.taskIds.some(k=>!s.tasks.some(t=>t.id===k))||next.trackerIds.some(k=>!s.trackers.some(t=>t.id===k)))throw Error('A source record changed or was removed.');
 const w=ensure(s);w.config.outcomes=previous?list.map(x=>x.id===id?next:x):[...list,next];changed(s);return next.id;
}
export function changeOutcome(s:WorkspaceState,id:string,snapshot:string,remove=false){
 const list=outcomes(s),old=list.find(o=>o.id===id);
 if(!old||JSON.stringify(old)!==snapshot)throw Error('Outcome changed. Reopen it.');
 const w=outcomeBoard(s);if(!w)throw Error('Outcome board unavailable.');
 w.config.outcomes=remove?list.filter(o=>o.id!==id):list.map(o=>o.id===id?{...o,archived:!o.archived}:o);changed(s);
}
export function outcomeProgress(s:WorkspaceState,o:Outcome,today:string){
 const ts=o.taskIds.map(id=>s.tasks.find(t=>t.id===id));
 const hs=o.trackerIds.map(id=>s.trackers.find(t=>t.id===id));
 return {total:ts.filter(Boolean).length,done:ts.filter(t=>t?.completedAt).length,
 missing:ts.filter(t=>!t).length+hs.filter(t=>!t).length,
 open:ts.filter((t):t is NonNullable<typeof t>=>!!t&&!t.completedAt),
 trackers:hs.filter((t):t is NonNullable<typeof t>=>!!t).map(t=>({id:t.id,title:t.title,value:trackerTotal(s,t.id,today),goal:t.goal,unit:t.unit,cadence:t.cadence}))};
}
function row(s:WorkspaceState,o:Outcome,today:string,compact:boolean){
 const p=outcomeProgress(s,o,today);
 const deadline=o.target?(o.target<today?'Target passed · ':'Target ')+o.target:'No target date';
 return '<li class="ws-outcome-row" data-outcome-id="'+esc(o.id)+'"><header><div><strong>'+esc(o.title)+'</strong><small>'+esc(o.archived?'Archived':deadline)+'</small></div><span>'+p.done+'/'+p.total+' linked tasks complete</span></header>'+
 (p.total?'<progress max="'+p.total+'" value="'+p.done+'" aria-label="Linked tasks completed for '+esc(o.title)+'"></progress>':'<p>No linked tasks.</p>')+
 (p.missing?'<p role="status">'+p.missing+' original reference(s) unavailable.</p>':'')+
 (p.open.length?'<ul>'+p.open.slice(0,compact?1:4).map(t=>'<li><button type="button" data-action="context-task" data-id="'+esc(t.id)+'">'+esc(t.title)+'</button></li>').join('')+'</ul>':'')+
 (!compact&&p.trackers.length?'<ul>'+p.trackers.map(t=>'<li>'+esc(t.title)+' · '+t.value+'/'+t.goal+' '+esc(t.unit)+' ('+t.cadence+') <button type="button" data-action="log-tracker" data-id="'+esc(t.id)+'">Log</button></li>').join('')+'</ul>':'')+
 '<div class="ws-outcome-actions"><button type="button" data-action="edit-outcome" data-id="'+esc(o.id)+'">Edit</button><button type="button" data-action="toggle-outcome" data-id="'+esc(o.id)+'">'+(o.archived?'Restore':'Archive')+'</button>'+
 (compact?'':'<button type="button" data-action="remove-outcome" data-id="'+esc(o.id)+'">Remove</button>')+'</div></li>';
}
export function renderOutcomes(s:WorkspaceState,today:string,compact=false){
 const list=outcomes(s),active=list.filter(o=>!o.archived).sort((a,b)=>(a.target||'9999').localeCompare(b.target||'9999')),archived=list.filter(o=>o.archived);
 const shown=compact?active.slice(0,2):active;
 return '<section class="ws-outcome-board" data-outcome-board'+(compact?' data-today-outcomes':'')+'>'+
 (compact?'<header><h3>Outcomes</h3><small>'+active.length+' active · original Hub records</small></header>':'')+
 (!outcomeBoard(s)?'<p>Connect long-term outcomes to existing tasks and trackers.</p>':shown.length?'<ol class="ws-outcome-list">'+shown.map(o=>row(s,o,today,compact)).join('')+'</ol>':'<p>No active outcomes.</p>')+
 (compact&&shown.length<active.length?'<p>Showing 2 of '+active.length+' active outcomes.</p>':'')+
 (!compact&&archived.length?'<details><summary>'+archived.length+' archived outcomes</summary><ol class="ws-outcome-list">'+archived.map(o=>row(s,o,today,false)).join('')+'</ol></details>':'')+
 '<button type="button" data-action="new-outcome"'+(list.length>=MAX_OUTCOMES?' disabled':'')+'>Create outcome</button>'+
 '<p class="ws-record-pin-disclosure">Hub-owned grouping only. Linked tasks and tracker logs stay with their original records; progress is not overall goal-achievement scoring.</p></section>';
}
