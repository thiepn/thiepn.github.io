import { reviewDay, reviewWeek } from './planning-review';
import { taskCounts } from './task-flow';
import { focusTasks } from './daily-focus';
import type { WorkspaceState, Task, CalendarEvent } from './types';

export type HomeJourneyMode = 'today'|'focus'|'review'|'workspace';
export const HOME_JOURNEY_MODES:readonly HomeJourneyMode[]=['today','focus','review','workspace'];
export interface JourneyStatus {
  offline:boolean;
  dirty:boolean;
  conflict:boolean;
  storageReady:boolean;
  hasCapture:boolean;
  hasLayoutDraft:boolean;
  accountLabel:string;
}
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]!));
const textButton=(action:string,label:string,id?:string)=>`<button type="button" data-action="${action}"${id?` data-id="${esc(id)}"`:''} class="ws-unified-action">${esc(label)}</button>`;
function taskRow(task:Task,today:string) {
  const status=!task.due?'Inbox · not scheduled':task.due<today?'Overdue · '+task.due:task.due===today?'Due today':'Due '+task.due;
  return `<li class="ws-unified-task">
    <label class="ws-unified-task-toggle"><input type="checkbox" data-task-toggle="${esc(task.id)}" aria-label="Complete ${esc(task.title)}"/></label>
    <div class="ws-unified-task-body"><strong>${esc(task.title)}</strong><small>${esc(status)} · ${esc(task.priority)} priority${task.time?' · task clock '+esc(task.time):''}</small></div>
    <div class="ws-unified-task-actions">${textButton('unified-focus-task','Focus',task.id)}</div>
  </li>`;
}
const humanDate=(day:string)=>new Date(day+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'});
function eventRow(e:CalendarEvent,zone:string) {
  const hour=e.allDay?'All day':new Date(e.start).toLocaleTimeString(undefined,{timeZone:zone,hour:'2-digit',minute:'2-digit'});
  return `<li class="ws-unified-event"><div><strong>${esc(e.title)}</strong><small>${esc(hour)}</small></div>
    ${textButton('context-event','Next',e.id)}</li>`;
}
function nextTask(state:WorkspaceState,today:string) {
  return focusTasks(state,today,'due')[0]??focusTasks(state,today,'inbox')[0]??focusTasks(state,today,'priority')[0];
}
export function renderUnifiedJourneyNav(mode:HomeJourneyMode,state:WorkspaceState,today:string,status:JourneyStatus) {
  const counts=taskCounts(state.tasks,today);
  const modes:{id:HomeJourneyMode;title:string;detail:string}[]=[
    {id:'today',title:'Today',detail:(counts.today+counts.inbox)+' to triage'},
    {id:'focus',title:'Focus',detail:'One task at a time'},
    {id:'review',title:'Review',detail:'Weekly review'},
    {id:'workspace',title:'Workspace',detail:'Notes, apps & widgets'}
  ];
  const warning=status.conflict?'Another tab changed saved records':status.dirty?'Unsaved changes in this tab':
    !status.storageReady?'Local storage unavailable':status.offline?'Offline · Hub records only':'Hub local records · no connected calendar queried';
  const alert=status.conflict||status.dirty||!status.storageReady;
  return `<nav class="ws-mode-bar" aria-label="Hub work modes"><div role="group" aria-label="Home presentation">${modes.map(item=>`<button type="button" data-action="unified-mode" data-id="${item.id}" aria-pressed="${item.id===mode}">${item.title}</button>`).join('')}</div>${alert?`<span role="status">${esc(warning)}</span>`:''}</nav>`;
}
export function renderUnifiedToday(state:WorkspaceState,today:string,status:JourneyStatus) {
  const counts=taskCounts(state.tasks,today);
  const plan=reviewDay(state,today);
  const due=focusTasks(state,today,'due').slice(0,5);
  const inbox=focusTasks(state,today,'inbox').slice(0,4);
  const events=[...plan.timed,...plan.allDay].slice(0,4);
  const pending=state.captureDraft.trim().length>0;
  return `<section class="ws-unified-today ws-today-compact" id="ws-unified-today" aria-labelledby="ws-unified-title" data-unified-today>
    <header class="ws-unified-heading">
      <h2 id="ws-unified-title">Your day</h2>
      <div class="ws-unified-head-actions">
        ${textButton('capture-task','Add task')}
        ${textButton('new-event','Add event')}
      </div>
    </header>
    ${pending?`<div class="ws-unified-draft"><strong>Unfinished note</strong>${textButton('capture','Resume draft')}</div>`:''}
    ${status.hasLayoutDraft?`<div class="ws-unified-draft"><strong>Unfinished layout edit</strong>${textButton('review-return','Review recovery')}</div>`:''}
    <div class="ws-unified-columns">
      <section class="ws-unified-group"><header><h3>Due · ${counts.today}</h3><a href="/home/tasks/?filter=today">All tasks</a></header>
        ${due.length?`<ul>${due.map(t=>taskRow(t,today)).join('')}</ul>`:
          `<p class="ws-unified-empty">Nothing due.</p>`}
        ${counts.today>due.length?`<small>${due.length} of ${counts.today} shown</small>`:''}
      </section>
      ${counts.inbox?`<section class="ws-unified-group"><header><h3>Inbox · ${counts.inbox}</h3><a href="/home/tasks/?filter=inbox">All inbox tasks</a></header>
        <ul>${inbox.map(t=>taskRow(t,today)).join('')}</ul>
        ${counts.inbox>inbox.length?`<small>${inbox.length} of ${counts.inbox} shown</small>`:''}
      </section>`:''}
    </div>
    ${events.length||plan.overlaps.length?`<section class="ws-unified-group ws-unified-events"><header><h3>Calendar · ${plan.events.length}</h3><a href="/home/calendar/">All events</a></header>
      ${events.length?`<ul>${events.map(e=>eventRow(e,state.preferences.timezone)).join('')}</ul>`:''}
      ${plan.overlaps.length?`<p class="ws-unified-overlap">${plan.overlaps.length} possible time overlap${plan.overlaps.length===1?'':'s'} · <a href="/home/calendar/">Review times</a></p>`:''}
    </section>`:''}
  </section>`;
}
