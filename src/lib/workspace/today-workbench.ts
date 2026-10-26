/**
 * Owner-native Today continuation: a bounded seven-day review, tracker check-in,
 * and recent-note handoff. This is a projection of the original Hub WorkspaceState;
 * no new engine, IDs, source copies, scheduler or persistence.
 */
import { addDays, formatTrackerValue, trackerTotal } from './model';
import { reviewDay } from './planning-review';
import { freshFolioPlanningShare, folioDayLoad, folioConflictActions } from './folio-continuity';
import type { FolioDeviceSnapshot } from './folio-device';
import {renderNotesTodayHorizon} from './notes-reminder-continuity';
import type {NotesDeviceSummary} from './notes-device';
import type { WorkspaceState, Task, Note, Tracker } from './types';

const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
const priority:Record<Task['priority'],number>={high:0,medium:1,low:2,none:3};
const label=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString(undefined,
  {timeZone:'UTC',weekday:'short',month:'short',day:'numeric'});
export interface WorkbenchDay {
  date:string;
  taskCount:number;
  eventCount:number;
  overlappingEventPairs:number;
  tasks:readonly Task[];
}
export interface FolioWorkbenchDay {
  date:string;
  tasks:readonly {title:string;kind:'planned'|'deadline'}[];
  events:readonly {title:string;allDay:boolean}[];
  taskCount:number;
  blockCount:number;
  overlaps:number;
}
/** No persistent owner records and no source API reads. Missing/stale consent stays empty. */
export function projectFolioWorkbench(
  state:WorkspaceState,day:string,shared:FolioDeviceSnapshot|null,now=Date.now(),
):readonly FolioWorkbenchDay[] {
  const snapshot=freshFolioPlanningShare(shared,now);
  if(!snapshot)return [];
  return Array.from({length:7},(_,offset)=>{
    const date=addDays(day,offset);
    const source=folioDayLoad(snapshot,date,state.preferences.timezone,state);
    return {
      date,taskCount:source.tasks.length,blockCount:source.blocks.length,
      tasks:source.tasks.map(t=>({title:t.title,kind:t.kind})),
      events:source.blocks.map(e=>({title:e.title,allDay:e.allDay})),
      overlaps:source.overlapPairs,
    };
  });
}
export interface WorkbenchTracker {
  tracker:Tracker;
  logged:number;
  goal:number;
  label:string;
}
export interface TodayWorkbench {
  days:readonly WorkbenchDay[];
  nextTasks:readonly Task[];
  recentNotes:readonly Note[];
  trackers:readonly WorkbenchTracker[];
  upcomingCount:number;
  trackerCount:number;
  noteCount:number;
}
/** Use only real local Hub records; never infer an appointment from a task clock. */
export function projectTodayWorkbench(state:WorkspaceState,day:string):TodayWorkbench {
  const days=Array.from({length:7},(_,i)=>{
    const date=addDays(day,i);
    const plan=reviewDay(state,date);
    return {
      date,taskCount:plan.deadlines.length,eventCount:plan.events.length,
      overlappingEventPairs:plan.overlaps.length,tasks:plan.deadlines,
    };
  });
  const horizon=days[6]!.date;
  const future=state.tasks.filter(t=>!t.completedAt && t.due>day && t.due<=horizon)
    .sort((a,b)=>a.due.localeCompare(b.due)||priority[a.priority]-priority[b.priority]||
      a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  const recentNotes=[...state.notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||
    a.id.localeCompare(b.id));
  const trackers=state.trackers.map(tracker=>({
    tracker,logged:trackerTotal(state,tracker.id,day),goal:tracker.goal,
    label:tracker.cadence==='weekly'?'This calendar week':'Today',
  }));
  return {
    days,nextTasks:future.slice(0,5),recentNotes:recentNotes.slice(0,4),
    trackers:trackers.slice(0,6),upcomingCount:future.length,
    trackerCount:trackers.length,noteCount:recentNotes.length,
  };
}
const btn=(action:string,name:string,id:string)=>'<button type="button" data-action="'+
  action+'" data-id="'+esc(id)+'" class="ws-unified-action">'+esc(name)+'</button>';
export function renderTodayWorkbench(
  state:WorkspaceState,day:string,shared:FolioDeviceSnapshot|null=null,now=Date.now(),
  notesShare:NotesDeviceSummary|null=null,
  nativeOnly=false,
):string {
  const data=projectTodayWorkbench(state,day);
  const approved=freshFolioPlanningShare(nativeOnly?null:shared,now);
  const folioDays=projectFolioWorkbench(state,day,approved,now);
  const sharedByDate=new Map(folioDays.map(row=>[row.date,row]));
  const conflicts=folioConflictActions(state,data.days.map(row=>row.date),approved,now);
  const conflictPanel=conflicts.length?'<section class="ws-folio-conflict-actions" data-today-folio-conflicts>'+
    '<header><h4>Cross-calendar conflicts to review</h4><small>Hub event changes only · approved Folio share</small></header>'+
    '<ul>'+conflicts.map(c=>'<li class="ws-folio-conflict-row"><div><strong>'+esc(c.hubTitle)+
      '</strong><small>'+esc(c.day)+' · Folio: '+esc(c.folioTitle)+' · '+
      c.minutes+' min overlap</small></div>'+
      btn('review-event-time','Review Hub event',c.hubEventId)+'</li>').join('')+'</ul>'+
    '<p>Only source-shared conflicts are shown; no Folio appointment is edited.</p></section>':'';
  const days=data.days.map((entry,index)=>{
    const owner=sharedByDate.get(entry.date);
    const folioSummary=owner?'<div class="ws-workbench-source-day" data-folio-workbench-day="'+esc(entry.date)+'">'+
      '<small><strong>Folio · shared</strong> · '+owner.taskCount+' task'+(owner.taskCount===1?'':'s')+
      ' · '+owner.blockCount+' block'+(owner.blockCount===1?'':'s')+'</small>'+
      (owner.overlaps?'<small class="ws-workbench-conflict">'+owner.overlaps+
        ' possible Hub/Folio time overlap'+(owner.overlaps===1?'':'s')+'</small>':'')+
      (owner.tasks.length?'<small>'+owner.tasks.slice(0,2).map(t=>esc(t.title)).join(' · ')+
        (owner.tasks.length>2?' · +'+(owner.tasks.length-2)+' more':'')+'</small>':'')+
      (owner.events.length?'<small>'+owner.events.slice(0,2).map(e=>esc(e.title)).join(' · ')+
        (owner.events.length>2?' · +'+(owner.events.length-2)+' more':'')+'</small>':'')+
      '</div>':'';
    const taskTitles=entry.tasks.slice(0,2).map(t=>esc(t.title)).join(' · ');
    const rest=entry.tasks.length>2?' · +'+(entry.tasks.length-2)+' more':'';
    return '<li class="ws-workbench-day">'+
      '<a href="/home/calendar/?date='+encodeURIComponent(entry.date)+'" aria-label="'+
      esc('Open Hub calendar for '+entry.date)+'">'+
      '<strong>'+(index===0?'Today':esc(label(entry.date)))+'</strong><span>'+
      entry.taskCount+' task'+(entry.taskCount===1?'':'s')+' due · '+entry.eventCount+
      ' local event'+(entry.eventCount===1?'':'s')+'</span></a>'+
      (entry.overlappingEventPairs?'<small class="ws-workbench-conflict">'+entry.overlappingEventPairs+
        ' possible Hub event overlap'+(entry.overlappingEventPairs===1?'':'s')+'</small>':'')+
      (taskTitles?'<small class="ws-workbench-day-titles">'+taskTitles+rest+'</small>':'')+
      folioSummary+'</li>';
  }).join('');
  const tasks=data.nextTasks.map(t=>'<li class="ws-workbench-action-row"><div><strong>'+
    esc(t.title)+'</strong><small>Due '+esc(t.due)+' · '+esc(t.priority)+
    ' priority'+(t.time?' · task clock '+esc(t.time):'')+'</small></div>'+
    btn('unified-triage','Review plan',t.id)+btn('unified-focus-task','Focus',t.id)+btn('context-task','Context',t.id)+'</li>').join('');
  const trackers=data.trackers.map(({tracker,logged,goal,label})=>{
    const amount=formatTrackerValue(tracker,logged),target=formatTrackerValue(tracker,goal);
    return '<li class="ws-workbench-action-row ws-workbench-tracker"><div><strong>'+
      esc(tracker.title)+'</strong><small>'+esc(label)+' · '+esc(amount)+' of '+esc(target)+
      ' '+esc(tracker.unit)+'</small>'+
      '<progress aria-label="'+esc(tracker.title)+' progress" value="'+
      Math.max(0,logged)+'" max="'+Math.max(1,goal)+'"></progress></div>'+
      btn('log-tracker','Log progress',tracker.id)+'</li>';
  }).join('');
  const notes=data.recentNotes.map(note=>'<li class="ws-workbench-action-row"><div><strong>'+
    esc(note.title)+'</strong><small>Last changed '+esc(note.updatedAt.slice(0,10))+
    ' · Hub local note</small></div>'+btn('edit-note','Continue',note.id)+btn('context-note','Related work',note.id)+'</li>').join('');
  return '<section class="ws-today-workbench" data-today-workbench aria-labelledby="ws-workbench-heading">'+
    '<header><div>'+
    '<h3 id="ws-workbench-heading">Next seven days</h3></div>'+
    '<a href="/home/calendar/?mode=week">Open full week planner</a></header>'+
    (nativeOnly?'':('<div class="ws-workbench-source-actions" data-workbench-source-actions><p>'+
    (approved?'Folio shared once · '+esc(approved.date)+' · up to 12 tasks and 12 blocks. Dates may have omitted items.':
      shared?'Folio share expired; refresh explicitly to include its owner work.':
      'Hub-only view. Folio time and tasks are absent until you approve a one-time share.')+
    '</p><div><button type="button" data-action="connect-folio" class="ws-unified-action">'+
    (approved?'Refresh Folio':'Share Folio')+'</button>'+
    (shared?'<button type="button" data-action="disconnect-folio" class="ws-unified-action">Clear share</button>':'')+
    '<a href="/home/calendar/?mode=week">Compare in Week</a></div></div>'))+
    '<ol class="ws-workbench-week" aria-label="Next seven calendar days">'+days+'</ol>'+
    conflictPanel+'<div class="ws-workbench-panels">'+
    '<section aria-labelledby="ws-next-tasks"><header><h4 id="ws-next-tasks">Coming up</h4><a href="/home/tasks/?filter=upcoming">All upcoming ('+
    data.upcomingCount+')</a></header>'+(tasks?'<ul>'+tasks+'</ul>':
      '<p class="ws-unified-empty">No additional Hub task deadlines over the next six days.</p>')+
    (data.upcomingCount>data.nextTasks.length?'<small>Showing '+data.nextTasks.length+
      ' of '+data.upcomingCount+' tasks.</small>':'')+'</section>'+
    '<section aria-labelledby="ws-tracker-pulse"><header><h4 id="ws-tracker-pulse">Tracker check-in</h4>'+
    '<a href="/home/trackers/">All trackers ('+data.trackerCount+')</a></header>'+
    (trackers?'<ul>'+trackers+'</ul>':
      '<p class="ws-unified-empty">No Hub trackers yet. <a href="/home/trackers/">Create a tracker</a>.</p>')+
    (data.trackerCount>data.trackers.length?'<small>Showing '+data.trackers.length+
      ' of '+data.trackerCount+' trackers.</small>':'')+'</section>'+
    '<section aria-labelledby="ws-notes-continue"><header><h4 id="ws-notes-continue">Pick up a note</h4>'+
    '<a href="/home/?mode=workspace">Open workspace</a></header>'+
    (notes?'<ul>'+notes+'</ul>':
      '<p class="ws-unified-empty">No local Hub notes yet.</p>')+
    (data.noteCount>data.recentNotes.length?'<small>Showing '+data.recentNotes.length+
      ' of '+data.noteCount+' notes.</small>':'')+'</section></div>'+
    (nativeOnly?'':'<p class="ws-workbench-disclosure">Folio data requires a one-time share; source records remain in Folio. A task clock is not a calendar block. No external records are modified.</p>')+
    (nativeOnly?'':renderNotesTodayHorizon(day,state.preferences.timezone,notesShare,now))+
    '</section>';
}
