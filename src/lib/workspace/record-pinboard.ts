/**
 * One Hub-local record pinboard across task, note, calendar and tracker views.
 * Store only original record references inside the existing active Workspace
 * widget config. Never clone titles, content, external owner IDs or credentials.
 */
import {uid,stamp,type Widget,type WorkspaceState} from './types';
export type PinKind='task'|'note'|'event'|'tracker';
export type PinDirection=-1|1;
export const PINBOARD_TYPE='record-pinboard';
export const MAX_HUB_PINS=20;
const KINDS:readonly PinKind[]=['task','note','event','tracker'];
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
export function parseHubPin(value:unknown):{kind:PinKind;id:string}|null {
 if(typeof value!=='string'||value.length<6||value.length>144)return null;
 const split=value.indexOf(':');
 const kind=value.slice(0,split),id=value.slice(split+1);
 if(!KINDS.includes(kind as PinKind)||!id||id.length>128||!/^[-a-zA-Z0-9_:]+$/.test(id))
   return null;
 return {kind:kind as PinKind,id};
}
export function validateHubPinConfig(value:unknown):boolean {
 return value===undefined||(Array.isArray(value)&&value.length<=MAX_HUB_PINS&&
   new Set(value).size===value.length&&value.every(x=>parseHubPin(x)!==null));
}
export function hubPinnedKeys(widget:Widget|null|undefined):string[] {
 if(!widget||widget.type!==PINBOARD_TYPE||!validateHubPinConfig(widget.config.pins))
   return [];
 return (widget.config.pins as string[]|undefined)?.slice()??[];
}
export function hubPinboard(state:WorkspaceState):Widget|null {
 const active=state.workspaces.find(w=>w.id===state.active);
 return active?.widgets.find(w=>w.type===PINBOARD_TYPE&&w.typeVersion===1)??null;
}
export function hasHubPin(state:WorkspaceState,key:string):boolean {
 return hubPinnedKeys(hubPinboard(state)).includes(key);
}
function originalExists(state:WorkspaceState,kind:PinKind,id:string):boolean {
 return (kind==='task'?state.tasks:kind==='note'?state.notes:
   kind==='event'?state.events:state.trackers).some(x=>x.id===id);
}
function makePinboard(state:WorkspaceState):Widget {
 const workspace=state.workspaces.find(w=>w.id===state.active);
 if(!workspace)throw new Error('Original workspace unavailable.');
 const current=hubPinboard(state);if(current)return current;
 if(workspace.widgets.length>=32)throw new Error('Workspace has the maximum 32 widgets.');
 const bottom=Math.max(0,...workspace.widgets.map(w=>w.desktop.y+w.desktop.h));
 if(bottom>9966)throw new Error('Workspace is too tall to add a pinboard.');
 const board:Widget={
  id:uid(),type:PINBOARD_TYPE,typeVersion:1,view:'detailed',config:{pins:[]},
  desktop:{x:0,y:bottom,w:6,h:34},order:workspace.widgets.length
 };
 workspace.widgets.push(board);workspace.revision++;workspace.updatedAt=stamp();
 return board;
}
export function enableHubPinboard(state:WorkspaceState):void {
 makePinboard(state);
}
export function toggleHubRecordPin(state:WorkspaceState,key:string):boolean {
 const parsed=parseHubPin(key);
 if(!parsed)throw new Error('Unsupported record pin.');
 const old=hubPinboard(state);
 const previous=hubPinnedKeys(old);
 if(!previous.includes(key)&&!originalExists(state,parsed.kind,parsed.id))
   throw new Error('This original record no longer exists.');
 const board=old??makePinboard(state);
 const pins=hubPinnedKeys(board);
 const next=pins.includes(key)?pins.filter(k=>k!==key):[...pins,key];
 if(next.length>MAX_HUB_PINS)throw new Error('Pinboard holds up to 20 records.');
 board.config.pins=next;
 const workspace=state.workspaces.find(w=>w.id===state.active)!;
 workspace.revision++;workspace.updatedAt=stamp();
 return next.includes(key);
}
export function moveHubRecordPin(state:WorkspaceState,key:string,direction:PinDirection):boolean {
 const board=hubPinboard(state);if(!board)return false;
 const pins=hubPinnedKeys(board),at=pins.indexOf(key),other=at+direction;
 if(at<0||other<0||other>=pins.length)return false;
 [pins[at],pins[other]]=[pins[other]!,pins[at]!];
 board.config.pins=pins;
 const workspace=state.workspaces.find(w=>w.id===state.active)!;
 workspace.revision++;workspace.updatedAt=stamp();
 return true;
}
export interface HubPinRow {key:string;kind:PinKind;id:string;title:string;
 detail:string;available:boolean;action:string;actionLabel:string;}
export function projectedHubPins(state:WorkspaceState):HubPinRow[] {
 return hubPinnedKeys(hubPinboard(state)).map(key=>{
  const pin=parseHubPin(key)!;
  const record=pin.kind==='task'?state.tasks.find(x=>x.id===pin.id):
   pin.kind==='note'?state.notes.find(x=>x.id===pin.id):
   pin.kind==='event'?state.events.find(x=>x.id===pin.id):
   state.trackers.find(x=>x.id===pin.id);
  if(!record)return {key,...pin,title:'Original record unavailable',
   detail:'Removed or missing; clear this reference',available:false,action:'',
   actionLabel:''};
  if(pin.kind==='task'){
   const item=state.tasks.find(x=>x.id===pin.id)!;
   return {key,...pin,title:item.title,
    detail:item.completedAt?'Completed original task':item.due?'Due '+item.due:'Inbox · original Hub task',
    available:true,action:'context-task',actionLabel:'Next actions'};
  }
  if(pin.kind==='note'){
   const item=state.notes.find(x=>x.id===pin.id)!;
   return {key,...pin,title:item.title,detail:'Original Hub note · '+item.updatedAt.slice(0,10),
    available:true,action:'edit-note',actionLabel:'Continue note'};
  }
  if(pin.kind==='event'){
   const item=state.events.find(x=>x.id===pin.id)!;
   return {key,...pin,title:item.title,detail:'Original Hub event · '+item.date,
    available:true,action:'context-event',actionLabel:'Next actions'};
  }
  const item=state.trackers.find(x=>x.id===pin.id)!;
  return {key,...pin,title:item.title,detail:'Original Hub tracker · '+item.cadence,
   available:true,action:'log-tracker',actionLabel:'Log'};
 });
}
function pinRows(state:WorkspaceState):string {
 const rows=projectedHubPins(state);
 if(!rows.length)return '<p>No records pinned yet. Open an original task, note, event or tracker and select Pin.</p>';
 return '<ol class="ws-record-pin-rows">'+rows.map((r,i)=>'<li data-record-pin="'+esc(r.key)+'">'+
  '<div class="ws-record-pin-main"><strong>'+esc(r.title)+'</strong>'+
  '<small>'+esc(r.kind)+' · '+esc(r.detail)+'</small></div>'+
  '<div class="ws-record-pin-actions">'+
  (r.available?'<button type="button" data-action="'+r.action+'" data-id="'+esc(r.id)+'">'+r.actionLabel+'</button>':'')+
  (i?'<button type="button" data-action="move-record-pin-up" data-id="'+esc(r.key)+'" aria-label="Move '+esc(r.title)+' earlier">↑</button>':'')+
  (i<rows.length-1?'<button type="button" data-action="move-record-pin-down" data-id="'+esc(r.key)+'" aria-label="Move '+esc(r.title)+' later">↓</button>':'')+
  '<button type="button" data-action="toggle-record-pin" data-id="'+esc(r.key)+'" aria-label="Unpin '+esc(r.title)+'">Unpin</button></div></li>').join('')+'</ol>';
}
export function renderHubPinboard(state:WorkspaceState,forToday=false):string {
 const board=hubPinboard(state),count=hubPinnedKeys(board).length;
 return '<section class="ws-record-pinboard" data-record-pinboard'+
   (forToday?' data-today-pinboard':'')+'>'+
  (forToday?'<header><div><p class="ws-home-eyebrow">Original Hub records · this workspace</p>'+
      '<h3>Pinned work</h3></div><small>'+count+' of '+MAX_HUB_PINS+' pinned</small></header>':'')+
  (!board?'<p>Pin original Hub records to keep them accessible across Today, Tasks, Calendar and Workspace.</p>'+
    '<button type="button" data-action="enable-record-pinboard">Add pinboard to Workspace</button>':
    pinRows(state))+
  '<p class="ws-record-pin-disclosure">Only original Hub record IDs are saved in this workspace widget. No copied content or external-owner pins. Removing an original record leaves a removable reference, not a restored copy.</p>'+
  '</section>';
}
