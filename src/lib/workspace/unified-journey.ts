import { reviewDay, reviewWeek } from './planning-review';
import { taskCounts } from './task-flow';
import { focusTasks } from './daily-focus';
import {renderHubPinboard} from './record-pinboard';
import {renderOutcomes} from './outcome-board';
import {renderDecisions} from './decision-register';
import { renderTodayWorkbench } from './today-workbench';
import type { FolioDeviceSnapshot } from './folio-device';
import type { NotesDeviceSummary } from './notes-device';
import type { WorkspaceState, Task, CalendarEvent } from './types';

export type HomeJourneyMode = 'today'|'focus'|'workspace';
export const HOME_JOURNEY_MODES:readonly HomeJourneyMode[]=['today','focus','workspace'];
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
    <div class="ws-unified-task-actions">${textButton('unified-triage','Plan',task.id)}${textButton('unified-focus-task','Focus',task.id)}${textButton('context-task','Knowledge & next',task.id)}</div>
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
    {id:'workspace',title:'Workspace',detail:'Notes, apps & widgets'}
  ];
  const warning=status.conflict?'Another tab changed saved records':status.dirty?'Unsaved changes in this tab':
    !status.storageReady?'Local storage unavailable':status.offline?'Offline · Hub records only':'Hub local records · no connected calendar queried';
  const alert=status.conflict||status.dirty||!status.storageReady;
  return `<nav class="ws-mode-bar" aria-label="Hub work modes"><div role="group" aria-label="Home presentation">${modes.map(item=>`<button type="button" data-action="unified-mode" data-id="${item.id}" aria-pressed="${item.id===mode}">${item.title}</button>`).join('')}</div><a href="/home/calendar/?mode=week">Plan the week →</a>${alert?`<span role="status">${esc(warning)}</span>`:''}</nav>`;
}
export function renderUnifiedToday(state:WorkspaceState,today:string,status:JourneyStatus,folio:FolioDeviceSnapshot|null=null,notes:NotesDeviceSummary|null=null) {
  const counts=taskCounts(state.tasks,today);
  const plan=reviewDay(state,today);
  const due=focusTasks(state,today,'due').slice(0,5);
  const inbox=focusTasks(state,today,'inbox').slice(0,4);
  const events=[...plan.timed,...plan.allDay].slice(0,4);
  const first=nextTask(state,today);

  const pending=state.captureDraft.trim().length>0;
  return `<section class="ws-unified-today" id="ws-unified-today" aria-labelledby="ws-unified-title" data-unified-today>
    <header class="ws-unified-heading"><div><p class="ws-home-eyebrow">Today · ${esc(humanDate(today))}</p>
      <h2 id="ws-unified-title">What needs your attention?</h2></div>
      <div class="ws-unified-head-actions">
        ${textButton('capture-task','Inbox task')}
        ${textButton('capture','Quick note')}
        <a href="/home/calendar/?mode=week" class="ws-unified-action">Plan the week</a>
      </div></header>
    ${pending?`<div class="ws-unified-draft"><strong>Unfinished local capture</strong><span>${state.captureDraft.length} characters</span>${textButton('capture','Resume draft')}</div>`:''}
    ${status.hasLayoutDraft?`<div class="ws-unified-draft"><strong>Interrupted layout draft</strong><span>Review the original saved layout before replacing anything.</span>${textButton('review-return','Review recovery')}</div>`:''}
    <div class="ws-unified-metrics" aria-label="Actual Hub work">
      <a href="/home/tasks/?filter=today"><strong>${counts.today}</strong><span>Due or overdue</span></a>
      <a href="/home/tasks/?filter=inbox"><strong>${counts.inbox}</strong><span>Unscheduled</span></a>
      <a href="/home/calendar/"><strong>${plan.events.length}</strong><span>Events today</span></a>
    </div>
    <div class="ws-unified-columns">
      <section class="ws-unified-group"><header><h3>Due now</h3><a href="/home/tasks/?filter=today">All tasks</a></header>
        ${due.length?`<ul>${due.map(t=>taskRow(t,today)).join('')}</ul>`:
          `<p class="ws-unified-empty">No tasks due.</p>`}
        ${counts.today>due.length?`<small>Showing ${due.length} of ${counts.today} due or overdue tasks.</small>`:''}
      </section>
      <section class="ws-unified-group"><header><h3>Inbox decisions</h3><a href="/home/tasks/?filter=inbox">Open Inbox</a></header>
        ${inbox.length?`<ul>${inbox.map(t=>taskRow(t,today)).join('')}</ul>`:
          `<p class="ws-unified-empty">Inbox is clear.</p>`}
        ${counts.inbox>inbox.length?`<small>Showing ${inbox.length} of ${counts.inbox} unscheduled tasks.</small>`:''}
      </section>
    </div>
    <section class="ws-unified-group ws-unified-events"><header><h3>Calendar today</h3><a href="/home/calendar/">Open day</a></header>
      ${events.length?`<ul>${events.map(e=>eventRow(e,state.preferences.timezone)).join('')}</ul>`:
        `<p class="ws-unified-empty">No events today.</p>`}
      ${plan.overlaps.length?`<p class="ws-unified-overlap">${plan.overlaps.length} possible local timed overlap${plan.overlaps.length===1?'':'s'} · <a href="/home/calendar/">Review event times</a></p>`:''}
    </section>
    ${renderTodayWorkbench(state,today,folio,Date.now(),notes)}
    ${renderHubPinboard(state,true)}
    ${renderOutcomes(state,today,true)}
    ${renderDecisions(state,today,true)}
    <footer>
      <div>${first?textButton('unified-focus-task','Focus on next task',first.id):textButton('new-task','Add first task')}
        <a href="/home/calendar/?mode=week">Weekly review →</a></div></footer>
  </section>`;
}
