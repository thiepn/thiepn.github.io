import type { Task, WorkspaceState } from './types';
import { taskCounts } from './task-flow';
import {renderFocusWorkHandoff,EMPTY_FOCUS_WORK,type FocusWorkDraft} from './focus-work-handoff';

export type FocusQueue = 'due' | 'priority' | 'inbox' | 'all';
export type FocusDuration = 15 | 25 | 45;
export type FocusLimit = 3 | 5 | 8;
export interface FocusPresentation {
  queue: FocusQueue;
  limit: FocusLimit;
  duration: FocusDuration;
  quiet: boolean;
  selectedId: string | null;
  remainingMs: number;
  running: boolean;
  elapsed: boolean;
}
const priorityOrder = {high:0,medium:1,low:2,none:3} as const;
const esc=(value:unknown) => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const pretty=(day:string)=>new Date(day+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',month:'short',day:'numeric'});
export function focusTasks(state: WorkspaceState, today: string, queue: FocusQueue): Task[] {
  return state.tasks.filter(t => {
    if(t.completedAt)return false;
    if(queue==='due')return !!t.due && t.due<=today;
    if(queue==='inbox')return !t.due;
    if(queue==='priority')return t.priority==='high';
    return true;
  }).sort((a,b) =>
    (a.due&&a.due<today?0:a.due===today?1:a.due?2:3)-
    (b.due&&b.due<today?0:b.due===today?1:b.due?2:3) ||
    priorityOrder[a.priority]-priorityOrder[b.priority] ||
    (a.due||'9999-12-31').localeCompare(b.due||'9999-12-31') ||
    a.title.localeCompare(b.title));
}
export function focusClock(milliseconds:number):string {
  const seconds=Math.max(0,Math.ceil(milliseconds/1000));
  return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function taskStatus(task:Task,today:string):string {
  if(!task.due)return 'Inbox · not scheduled';
  return task.due<today?'Overdue · '+pretty(task.due):
    task.due===today?'Due today':'Due '+pretty(task.due);
}
function btn(action:string,label:string,id='') {
  return `<button type="button" class="ws-focus-button" data-action="${action}"${id?` data-id="${esc(id)}"`:''}>${esc(label)}</button>`;
}
/** Pure projection of existing Hub task records. No focus record or progress authority. */
export function renderFocusPanel(state:WorkspaceState,today:string,p:FocusPresentation,workDraft:Readonly<FocusWorkDraft>=EMPTY_FOCUS_WORK):string {
  const tasks=focusTasks(state,today,p.queue),counts=taskCounts(state.tasks,today);
  const selected=p.selectedId?state.tasks.find(t=>t.id===p.selectedId&&!t.completedAt):undefined;
  const visible=tasks.slice(0,p.limit);
  const queueNames:Record<FocusQueue,string>={due:'Today + overdue',priority:'High priority',inbox:'Inbox',all:'All open'};
  const queueButtons=(['due','priority','inbox','all'] as FocusQueue[]).map(value=>
    `<button type="button" class="ws-focus-chip" data-action="focus-queue" data-id="${value}" aria-pressed="${p.queue===value}">${queueNames[value]}<span>${value==='due'?counts.today:value==='inbox'?counts.inbox:value==='priority'?state.tasks.filter(t=>!t.completedAt&&t.priority==='high').length:state.tasks.filter(t=>!t.completedAt).length}</span></button>`).join('');
  const list=visible.length ? visible.map((task,index)=>`<li class="ws-focus-candidate ${selected?.id===task.id?'is-selected':''}">
    <button type="button" data-action="focus-select" data-id="${esc(task.id)}" aria-pressed="${selected?.id===task.id}" class="ws-focus-pick">
      <span class="ws-focus-position">${index+1}</span><span><strong>${esc(task.title)}</strong><small>${esc(taskStatus(task,today))}${task.priority!=='none'?' · '+esc(task.priority)+' priority':''}</small></span>
    </button>
    ${btn('edit-task','Edit',task.id)}
  </li>`).join('') : `<li class="ws-focus-empty">${p.queue==='inbox'?'No unscheduled Hub tasks.':'Nothing in this queue.'} ${p.queue==='inbox'?btn('capture-task','Capture to Inbox'):btn('new-task','Add local task')}</li>`;
  const selectedMarkup=selected?`
    <div class="ws-focus-selected-label">Selected Hub task · ${esc(taskStatus(selected,today))}</div>
    <strong class="ws-focus-selected-title">${esc(selected.title)}</strong>
    <div class="ws-focus-selected-actions">
      <label class="ws-focus-check"><input type="checkbox" data-task-toggle="${esc(selected.id)}"/>Mark task complete</label>
      ${btn('edit-task','Edit task',selected.id)}
      ${!selected.due?btn('task-plan-today','Schedule today',selected.id):btn('task-plan-tomorrow','Move to tomorrow',selected.id)}
      ${btn('focus-next','Choose next')}
    </div>` : `<p class="ws-focus-empty">Choose a task.</p>`;
  return `<section class="ws-daily-focus" id="ws-daily-focus" aria-labelledby="ws-focus-title" data-focus-panel>
    <header class="ws-focus-heading"><div><h2 id="ws-focus-title">Focus</h2></div>
      <div class="ws-focus-heading-actions">
        <button type="button" class="ws-focus-button ws-focus-quiet-toggle" data-action="focus-quiet" aria-pressed="${p.quiet}">${p.quiet?'Exit quiet view':'Quiet view'}</button>
        <a href="/home/tasks/">Task manager ↗</a>
      </div>
    </header>
    <div class="ws-focus-main">
      <section class="ws-focus-primary" aria-label="Selected task and optional focus timer">
        ${selectedMarkup}
        ${renderFocusWorkHandoff(selected,workDraft,p.elapsed)}
        <div class="ws-focus-timer">
          <span class="ws-focus-clock" role="timer" aria-label="Remaining focus time" data-focus-clock>${focusClock(p.remainingMs)}</span>
          <div class="ws-focus-timer-controls">
            <label>Session length <select data-focus-duration aria-label="Session duration">${([15,25,45] as FocusDuration[]).map(d=>`<option value="${d}"${d===p.duration?' selected':''}>${d} minutes</option>`).join('')}</select></label>
            ${p.running?btn('focus-pause','Pause'):btn('focus-start',p.elapsed?'Start again':p.remainingMs<p.duration*60000?'Resume':'Start')}
            ${btn('focus-reset','Reset')}
          </div>
          <p class="ws-focus-timer-note" data-focus-session-status>${p.running?'Running · pauses when you leave this tab':p.elapsed?'Session ended':'Paused'}</p>
        </div>
      </section>
      <section class="ws-focus-queue" aria-label="Hub task queue">
        <div class="ws-focus-queue-header"><h3>Choose what to work on</h3><label>Show <select data-focus-limit aria-label="Tasks in focus queue">${([3,5,8] as FocusLimit[]).map(n=>`<option value="${n}"${n===p.limit?' selected':''}>${n}</option>`).join('')}</select></label></div>
        <div class="ws-focus-chips" role="group" aria-label="Focus queue filters">${queueButtons}</div>
        <ol class="ws-focus-list">${list}</ol>
        ${tasks.length>visible.length?`<p class="ws-focus-footnote">Showing ${visible.length} of ${tasks.length} Hub tasks. Increase the list limit or open Tasks for the remainder.</p>`:''}
      </section>
    </div>
    <footer class="ws-focus-footer"><span>Source: Hub tasks in this browser · user-selected focus only</span><span>Quiet view and timer stay in this tab · no background notifications, grading, cloud sync or new stores</span></footer>
  </section>`;
}
