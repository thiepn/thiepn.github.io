/**
 * One-time Folio -> Hub day/week planning continuity.
 * Source records are projections only: original IDs never become Hub task/event IDs.
 * No Folio store, background reads, inferred availability, or source write authority.
 */
import {dayKey, validDate, weekDays} from './model';
import {reviewDay, type AgendaMode} from './planning-review';
import {compareApprovedFolioTime} from './source-time-review';
import type {FolioDeviceSnapshot} from './folio-device';
import type {WorkspaceState} from './types';

export const FOLIO_PLANNING_MAX_AGE_MS=15*60_000;
export interface FolioDayLoad {
  day:string;
  tasks:readonly {id:string;title:string;kind:'planned'|'deadline'}[];
  blocks:readonly FolioDeviceSnapshot['events'][number][];
  timed:number;
  allDay:number;
  overlapPairs:number;
}
export function freshFolioPlanningShare(
  snapshot:FolioDeviceSnapshot|null, now=Date.now(),
):FolioDeviceSnapshot|null {
  if(!snapshot)return null;
  const age=now-Date.parse(snapshot.generatedAt);
  return Number.isFinite(age)&&age>=0&&age<=FOLIO_PLANNING_MAX_AGE_MS?snapshot:null;
}
/** Each source task is at most one row per day; planned and due dates are not timed slots. */
export function folioDayLoad(snapshot:FolioDeviceSnapshot,day:string,zone:string,
  hub:WorkspaceState):FolioDayLoad {
  const tasks: {id:string;title:string;kind:'planned'|'deadline'}[]=[];
  for(const task of snapshot.tasks) {
    const planned=task.plannedDate===day ||
      (!task.plannedDate&&task.plannedToday&&snapshot.date===day);
    const due=task.deadline===day;
    if(planned||due)tasks.push({id:task.id,title:task.title,kind:due?'deadline':'planned'});
  }
  const blocks=snapshot.events.filter(e=>{
    const from=Date.parse(e.start),to=Date.parse(e.end);
    if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return false;
    return dayKey(zone,new Date(from))<=day && dayKey(zone,new Date(to-1))>=day;
  });
  const local=reviewDay(hub,day);
  const startOfDay=local.timed;
  const sourceForDay={...snapshot,events:blocks};
  return {day,tasks,blocks,timed:blocks.filter(e=>!e.allDay).length,
    allDay:blocks.filter(e=>e.allDay).length,
    overlapPairs:compareApprovedFolioTime(startOfDay,sourceForDay).length};
}
export interface FolioConflictReview {
  day:string;hubEventId:string;hubTitle:string;folioTitle:string;minutes:number;
}
/** Read only original Hub and fresh approved Folio event IDs; never modify the source. */
export function folioConflictActions(state:WorkspaceState,days:readonly string[],
  shared:FolioDeviceSnapshot|null,now=Date.now(),limit=12):readonly FolioConflictReview[] {
  const active=freshFolioPlanningShare(shared,now);if(!active)return [];
  const result:FolioConflictReview[]=[],seen=new Set<string>();
  const max=Number.isSafeInteger(limit)&&limit>0?Math.min(limit,24):12;
  for(const day of days.slice(0,7)){
    if(!validDate(day)||seen.has(day))continue;seen.add(day);
    const source=folioDayLoad(active,day,state.preferences.timezone,state);
    const pairs=compareApprovedFolioTime(reviewDay(state,day).timed,
      {...active,events:source.blocks});
    for(const pair of pairs){
      // Only the original local Hub event can enter the existing reviewed writer.
      if(!state.events.some(e=>e.id===pair.hubEventId))continue;
      result.push({day,hubEventId:pair.hubEventId,hubTitle:pair.hubTitle,
        folioTitle:pair.folioTitle,minutes:pair.minutes});
      if(result.length>=max)return result;
    }
  }
  return result;
}
export function folioPlanningDays(
  snapshot:FolioDeviceSnapshot,anchor:string,mode:AgendaMode,hub:WorkspaceState,
):FolioDayLoad[] {
  const dates=mode==='day'?[anchor]:weekDays(anchor);
  return dates.map(date=>folioDayLoad(snapshot,date,hub.preferences.timezone,hub));
}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
const dayName=(key:string)=>new Date(key+'T12:00:00Z').toLocaleDateString(undefined,
  {timeZone:'UTC',weekday:'short',month:'short',day:'numeric'});
/** All links open an original Folio view; there is no invented record-deep-link contract. */
export function renderFolioPlanningContinuity(
  state:WorkspaceState,selected:string,mode:AgendaMode,
  shared:FolioDeviceSnapshot|null,now=Date.now(),
):string {
  const active=freshFolioPlanningShare(shared,now);
  const open='<a href="/folio/?view=planner" rel="noreferrer">Open Folio planner</a>';
  const buttons='<button type="button" data-action="connect-folio">Share / refresh Folio</button>'+
    (shared?'<button type="button" data-action="disconnect-folio">Clear share</button>':'');
  if(!active)return '<section class="ws-folio-continuity" data-folio-continuity>'+
    '<header><div><p class="ws-home-eyebrow">Original Folio · read-only</p>'+
    '<h3>Folio beside your Hub plan</h3></div><div>'+buttons+open+'</div></header>'+
    '<p class="ws-plan-provenance">'+(shared?'The one-time Folio share is too old for planning. Refresh explicitly.':
      'Share a bounded Folio snapshot explicitly to compare its owner tasks and blocks here.')+
    ' No account or Folio storage was queried.</p></section>';
  const days=folioPlanningDays(active,selected,mode,state);
  const rows=days.map(row=>{
    const taskRows=row.tasks.slice(0,4).map(t=>'<li><span><strong>'+esc(t.title)+'</strong>'+
      '<small>Folio '+esc(t.kind)+' · original record remains in Folio</small></span>'+
      '<a href="/folio/?view=today" rel="noreferrer">Open Folio</a></li>').join('');
    const events=row.blocks.slice(0,4).map(e=>'<li><span><strong>'+esc(e.title)+'</strong>'+
      '<small>'+esc(e.allDay?'Folio all-day entry':'Folio time block')+' · '+
      esc(new Date(e.start).toLocaleTimeString(undefined,{
        timeZone:state.preferences.timezone,hour:'2-digit',minute:'2-digit'}))+
      '</small></span><a href="/folio/?view=planner" rel="noreferrer">Open Folio</a></li>').join('');
    const visible=taskRows+events;
    return '<li class="ws-folio-day" data-folio-day="'+esc(row.day)+'">'+
      '<header><strong>'+esc(dayName(row.day))+'</strong><small>'+row.tasks.length+
      ' Folio task'+(row.tasks.length===1?'':'s')+' · '+row.blocks.length+
      ' source block'+(row.blocks.length===1?'':'s')+'</small></header>'+
      (row.overlapPairs?'<p class="ws-folio-overlap">'+row.overlapPairs+
       ' possible Hub/Folio timed overlap'+(row.overlapPairs===1?'':'s')+'</p>':'')+
      (visible?'<ul>'+visible+'</ul>':'<p>No entries from this bounded share for this day.</p>')+
      (row.tasks.length>4||row.blocks.length>4?'<p>More shared items may exist; open Folio for the full view.</p>':'')+
      '</li>';
  }).join('');
  const conflicts=folioConflictActions(state,days.map(d=>d.day),active,now);
  const reviews=conflicts.map(c=>'<li class="ws-folio-conflict-row"><div><strong>'+
    esc(c.hubTitle)+'</strong><small>'+esc(c.day)+' · Folio: '+esc(c.folioTitle)+
    ' · '+c.minutes+' min overlap</small></div><button type="button" class="ws-unified-action"'+
    ' data-action="review-event-time" data-id="'+esc(c.hubEventId)+'">Review Hub event</button></li>').join('');
  const reviewPanel='<section class="ws-folio-conflict-actions" data-folio-conflict-review>'+
    '<header><h4>Review overlapping calendar commitments</h4><small>Hub event only · Folio read-only</small></header>'+
    (reviews?'<ul>'+reviews+'</ul>':'<p>No conflicts found in this limited share; not a free-time check.</p>')+
    (conflicts.length>=12?'<p>Up to 12 conflicts shown; check both owners for more.</p>':'')+
    '<p>Opens the original Hub event review. Changes require explicit confirmation and never modify Folio.</p></section>';
  return '<section class="ws-folio-continuity" data-folio-continuity>'+
    '<header><div><p class="ws-home-eyebrow">One-time owner share · '+esc(active.date)+'</p>'+
    '<h3>Folio beside your Hub plan</h3></div><div>'+buttons+open+'</div></header>'+
    reviewPanel+'<ol class="ws-folio-days">'+rows+'</ol>'+
    '<p class="ws-plan-provenance">Folio owns every displayed task and event. Its share contains up to '+
    '12 tasks and 12 event blocks, may omit additional work, and does not prove free time. '+
    'Nothing shown here is imported, completed, rescheduled, or synced into Hub. '+
    'You can separately opt into Folio load hints when reviewing distribution of Hub tasks.</p>'+
    '</section>';
}
