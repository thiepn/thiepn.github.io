import { addDays, dayKey } from './model';
import { taskCounts } from './task-flow';
import {renderHubPinboard} from './record-pinboard';
import {renderOutcomes} from './outcome-board';
import type { AppShortcut, Task, Widget, WorkspaceState } from './types';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const action = (name:string,label:string,id='') => `<button type="button" class="ws-widget-action" data-action="${esc(name)}"${id ? ` data-id="${esc(id)}"` : ''}>${esc(label)}</button>`;
const blank = (message:string,name:string,label:string) => `<div class="ws-widget-blank"><p>${esc(message)}</p>${action(name,label)}</div>`;
const limit = (w:Widget) => typeof w.config.itemLimit === 'number' && Number.isInteger(w.config.itemLimit) ? Math.max(2,Math.min(12,w.config.itemLimit)) : w.view === 'compact' ? 3 : 6;
const dateLabel = (date:string) => new Date(date+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',month:'short',day:'numeric',weekday:'short'});
const priorityOrder = {high:0,medium:1,low:2,none:3};
const cleanTasks = (tasks:Task[]) => tasks.filter(t=>!t.completedAt);
const dateOrder = (a:Task,b:Task) => (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31') ||
    priorityOrder[a.priority]-priorityOrder[b.priority] || a.time.localeCompare(b.time) || a.title.localeCompare(b.title);
const rowTask = (t:Task,when:string,extra='') => `<div class="ws-widget-record">
    <input type="checkbox" data-task-toggle="${esc(t.id)}" aria-label="Complete ${esc(t.title)}"/>
    <div class="ws-widget-record-main"><button type="button" class="ws-widget-record-title" data-action="edit-task" data-id="${esc(t.id)}">${esc(t.title)}</button>
      <small>${esc(when)}${t.priority==='high'?' · High priority':''}</small>${extra}</div>
    <button type="button" class="ws-handoff-inline" data-action="context-task" data-id="${esc(t.id)}">Next</button>
    </div>`;
function inbox(w:Widget,state:WorkspaceState):string {
    const pending=cleanTasks(state.tasks).filter(t=>!t.due).sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority] || a.title.localeCompare(b.title));
    const total=pending.length,items=pending.slice(0,limit(w));
    return `<div class="ws-widget-utility">
      <div class="ws-widget-metrics"><strong>${total}</strong><span>unscheduled tasks</span><a href="/home/tasks/?filter=inbox">Open Inbox</a></div>
      ${items.length ? items.map(t=>`<div class="ws-widget-plan-row">${rowTask(t,'Not scheduled')}<div class="ws-widget-plan-actions">${action('task-plan-today','Today',t.id)}${action('task-plan-tomorrow','Tomorrow',t.id)}${action('task-plan-week','In 7 days',t.id)}</div></div>`).join('') : blank('All unscheduled tasks are processed.','capture-task','Capture a task')}
      ${total>items.length?`<a class="ws-widget-more" href="/home/tasks/?filter=inbox">${total-items.length} more in Inbox →</a>`:''}
      </div>`;
}
function priorities(w:Widget,state:WorkspaceState,today:string):string {
    const counts=taskCounts(state.tasks,today);
    const active=cleanTasks(state.tasks).filter(t=>t.due && t.due<=addDays(today,14));
    if(w.view==='compact')active.sort(dateOrder);
    else active.sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority] || dateOrder(a,b));
    const items=active.slice(0,limit(w));
    const times=(t:Task)=>t.due<today?'Overdue · '+dateLabel(t.due):t.due===today?'Due today':dateLabel(t.due);
    return `<div class="ws-widget-utility">
      <div class="ws-widget-metrics"><strong>${counts.today}</strong><span>due or overdue</span><a href="/home/tasks/">All tasks</a></div>
      ${items.length?items.map(t=>rowTask(t,times(t))).join(''):blank('No scheduled priorities in the next two weeks.','new-task','Add task')}
      ${active.length>items.length?`<a class="ws-widget-more" href="/home/tasks/">${active.length-items.length} more tasks →</a>`:''}
      </div>`;
}
type Commitment = { id:string; kind:'event'|'task'; title:string; startDay:string; time:string; allDay:boolean; duration:string };
function commitments(w:Widget,state:WorkspaceState,today:string):string {
    const days=[3,7,14].includes(Number(w.config.dateRange))?Number(w.config.dateRange):7;
    const end=addDays(today,days-1),zone=state.preferences.timezone;
    const agenda:Commitment[]=[];
    for (const t of state.tasks) {
        if(t.completedAt || !t.due || t.due<today || t.due>end)continue;
        agenda.push({id:t.id,kind:'task',title:t.title,startDay:t.due,time:t.time,allDay:!t.time,duration:'Due '+dateLabel(t.due)});
    }
    for (const e of state.events) {
        const first=e.allDay?e.date:dayKey(zone,new Date(e.start));
        const last=e.allDay?e.endDate:dayKey(zone,new Date(e.end));
        if(last<today || first>end)continue;
        const day=first<today?today:first;
        const time=e.allDay?'All day':new Date(e.start).toLocaleTimeString(undefined,{timeZone:zone,hour:'2-digit',minute:'2-digit'});
        agenda.push({id:e.id,kind:'event',title:e.title,startDay:day,time,allDay:e.allDay,duration:e.allDay?'Hub local all-day event':zone});
    }
    agenda.sort((a,b)=>a.startDay.localeCompare(b.startDay) || Number(!a.allDay)-Number(!b.allDay) ||
        a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
    const items=agenda.slice(0,limit(w));
    return `<div class="ws-widget-utility">
      <div class="ws-widget-metrics"><strong>${agenda.length}</strong><span>Hub commitments · ${days} days</span><a href="/home/calendar/">Calendar</a></div>
      ${items.length?items.map(item=>`<div class="ws-widget-record ws-widget-agenda">
        <span class="ws-widget-date">${esc(dateLabel(item.startDay))}</span>
        <div class="ws-widget-record-main"><button type="button" class="ws-widget-record-title" data-action="${item.kind==='task'?'edit-task':'edit-event'}" data-id="${esc(item.id)}">${esc(item.title)}</button>
           <small>${item.kind==='task'?'Task':'Event'} · ${esc(item.time||item.duration)} </small></div>
        <button type="button" class="ws-handoff-inline" data-action="${item.kind==='task'?'context-task':'context-event'}" data-id="${esc(item.id)}">Next</button></div>`).join(''):blank('No Hub events or task deadlines within this range.','new-event','Add event')}
      ${agenda.length>items.length?`<a class="ws-widget-more" href="/home/calendar/">${agenda.length-items.length} more in calendar →</a>`:''}
      </div>`;
}
function captures(w:Widget,state:WorkspaceState):string {
    const kind=w.config.sourceKind==='notes'||w.config.sourceKind==='tasks'?w.config.sourceKind:'both';
    const items=[
      ...(kind!=='tasks'?state.notes.map(n=>({id:n.id,title:n.title,at:n.updatedAt,kind:'note' as const})):[]),
      ...(kind!=='notes'?state.activity.filter(a=>a.kind==='task' && a.title.startsWith('Captured task:'))
        .map(a=>({id:'',title:a.title.slice('Captured task: '.length),at:a.at,kind:'task' as const})):[]),
    ].filter(item=>Number.isFinite(Date.parse(item.at))).sort((a,b)=>b.at.localeCompare(a.at));
    // Captured-task history is an activity log, never a live task record or a navigable task ID.
    const shown=items.slice(0,limit(w));
    return `<div class="ws-widget-utility">
      ${shown.length?shown.map(item=>`<div class="ws-widget-record ws-widget-capture"><div class="ws-widget-record-main">
         ${item.kind==='note'?`<button class="ws-widget-record-title" type="button" data-action="edit-note" data-id="${esc(item.id)}">${esc(item.title)}</button>`:`<strong class="ws-widget-record-title">${esc(item.title)}</strong>`}
         <small>${item.kind==='note'?'Note':'Task captured'} · ${esc(new Date(item.at).toLocaleDateString())}</small>
         </div>${item.kind==='note'?`<button type="button" class="ws-handoff-inline" data-action="context-note" data-id="${esc(item.id)}">Next</button>`:''}</div>`).join(''):blank('No captures yet.','capture','Capture')}
      ${state.captureDraft?`<p class="ws-widget-draft">Draft available. ${action('capture','Resume draft')}</p>`:''}
      </div>`;
}
function quickPlan(w:Widget,state:WorkspaceState):string {
    const tasks=cleanTasks(state.tasks).filter(t=>!t.due).sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority]||a.title.localeCompare(b.title));
    const items=tasks.slice(0,limit(w));
    return `<div class="ws-widget-utility">
      <div class="ws-widget-shortcuts">${action('capture-task','Capture task')}${action('new-task','Dated task')}<a href="/home/tasks/?filter=inbox">Full Inbox</a></div>
      ${items.length?items.map(t=>`<div class="ws-widget-plan-row">${rowTask(t,'Choose a day')}
        <div class="ws-widget-plan-actions">${action('task-plan-today','Today',t.id)}${action('task-plan-tomorrow','Tomorrow',t.id)}${action('task-plan-week','7 days',t.id)}</div></div>`).join(''):blank('No tasks await planning.','capture-task','Capture to Inbox')}
      </div>`;
}
function ownerHandoffs(w:Widget,apps:readonly AppShortcut[]):string {
    const ids=Array.isArray(w.config.ownerSources)?w.config.ownerSources:['notes','library','tms60'];
    const choices=[{id:'notes',slug:'notes',label:'Notes',route:'/home/connections/',detail:'Account grant for titles · no per-note deep link'},
        {id:'library',slug:'thiepn-library',label:'Library',route:'/home/#reading',detail:'Device consent · reading pilot on /home/'},
        {id:'tms60',slug:'tms60',label:'TMS60',route:'/home/connections/',detail:'Translation-specific consent for references'}];
    const shown=choices.filter(c=>ids.includes(c.id));
    return `<div class="ws-widget-utility ws-widget-owner">

      ${shown.map(c=>{const app=apps.find(a=>a.id===c.slug);return app?`<a class="ws-widget-handoff" href="${esc(app.action?.url??app.url)}" rel="noreferrer"><strong>${c.label} ↗</strong></a><a class="ws-widget-connection" href="${c.route}">Review ${c.label} access →</a>`:''}).join('')}
      ${!shown.length?'<p class="ws-widget-ownership">No apps selected.</p>':''}
      <div data-owner-widget-live data-owner-widget-sources="${esc(shown.map(c=>c.id).join(','))}" class="ws-widget-owner-live"><p class="ws-widget-ownership">No shared activity. <a href="/home/connections/">Manage connections</a></p></div>

      </div>`;
}
/** Pure view over the existing workspace; actions delegate to workspace-home's sole writer. */
export function utilityWidget(w:Widget,state:WorkspaceState,apps:readonly AppShortcut[],today:string):string|null {
    if(w.type==='task-inbox')return inbox(w,state);
    if(w.type==='task-priorities')return priorities(w,state,today);
    if(w.type==='upcoming-commitments')return commitments(w,state,today);
    if(w.type==='recent-captures')return captures(w,state);
    if(w.type==='quick-plan')return quickPlan(w,state);
    if(w.type==='owner-handoffs')return ownerHandoffs(w,apps);
    if(w.type==='record-pinboard')return renderHubPinboard(state);
    if(w.type==='outcome-board')return renderOutcomes(state,today,w.view==='compact');
    return null;
}
