
import { reviewDay, reviewWeek, type AgendaMode, type DayPlan } from './planning-review';
import { weekDays } from './model';
import type { CalendarEvent, WorkspaceState, Task } from './types';
import { renderWeeklyFollowThrough, type WeekTaskFilter } from './weekly-followthrough';

const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const label=(day:string)=>new Date(day+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',month:'short',day:'numeric',weekday:'short'});
const navButton=(action:string,text:string,id='')=>`<button type="button" class="ws-plan-button" data-action="${action}"${id?` data-id="${esc(id)}"`:''}>${esc(text)}</button>`;
const clock=(at:string,zone:string)=>new Date(at).toLocaleTimeString(undefined,{timeZone:zone,hour:'2-digit',minute:'2-digit'});
function overlapWarning(plan:DayPlan,events:readonly CalendarEvent[]):string {
    if(!plan.overlaps.length)return '';
    return `<section class="ws-plan-overlap" aria-label="Possible local event overlaps">
      <strong>${plan.overlaps.length} possible timed overlap${plan.overlaps.length===1?'':'s'} on ${esc(label(plan.date))}</strong>
      <ul>${plan.overlaps.slice(0,6).map(pair=>{
        const a=events.find(x=>x.id===pair.first),b=events.find(x=>x.id===pair.second);
        return `<li>${esc(a?.title??'Event')} + ${esc(b?.title??'Event')} · ${pair.minutes} min
          ${a?navButton('review-event-time','Review first',a.id):''}</li>`;
      }).join('')}</ul>
      ${plan.overlaps.length>6?`<p>${plan.overlaps.length-6} further overlapping pairs are not listed here.</p>`:''}
    </section>`;
}
function eventRow(e:CalendarEvent,zone:string):string {
    const detail=e.allDay?`All day · ${esc(e.date)}${e.endDate!==e.date?' – '+esc(e.endDate):''}`:
      `${esc(clock(e.start,zone))} – ${esc(clock(e.end,zone))} · ${esc(zone)}`;
    return `<li class="ws-plan-record"><span><strong>${esc(e.title)}</strong><small>${detail}</small></span>
      <div>${navButton('review-event-time','Review time',e.id)}${navButton('context-event','Prepare / follow up',e.id)}</div></li>`;
}
function deadlineRow(t:Task,selected:string):string {
    return `<li class="ws-plan-record"><span><strong>${esc(t.title)}</strong><small>Task due ${esc(t.due)} · ${esc(t.priority)} priority${t.time?' · task clock '+esc(t.time):''}</small></span>
      <div>${navButton('context-task','Next actions',t.id)}${navButton('plan-task-event','Review calendar block',t.id)}${t.due!==selected?navButton('planning-task-selected','Move due to selected day',t.id):''}</div></li>`;
}
function section(name:string,rows:string,count:number,empty:string):string {
    return `<section class="ws-plan-group"><header><h3>${esc(name)} <span>${count}</span></h3></header>
      ${rows?`<ul class="ws-plan-records">${rows}</ul>`:`<p class="ws-plan-empty">${esc(empty)}</p>`}</section>`;
}
function dayBody(state:WorkspaceState,selected:string,today:string):string {
    const plan=reviewDay(state,selected),zone=state.preferences.timezone;
    const overdue=selected===today?plan.overdue.slice(0,4):[];
    const inbox=selected===today?state.tasks.filter(t=>!t.completedAt&&!t.due).slice(0,4):[];
    const overdueRows=overdue.map(t=>`<li class="ws-plan-record"><span><strong>${esc(t.title)}</strong><small>Overdue since ${esc(t.due)}</small></span><div>${navButton('context-task','Next',t.id)}${navButton('planning-task-selected','Due today',t.id)}</div></li>`).join('');
    const inboxRows=inbox.map(t=>`<li class="ws-plan-record"><span><strong>${esc(t.title)}</strong><small>No due date</small></span><div>${navButton('planning-task-selected','Due today',t.id)}${navButton('context-task','Next',t.id)}</div></li>`).join('');
    return `<div class="ws-plan-day">
      ${overlapWarning(plan,plan.events)}
      ${section('Timed calendar blocks',plan.timed.map(e=>eventRow(e,zone)).join(''),plan.timed.length,'No timed events.')}
      ${section('All-day commitments',plan.allDay.map(e=>eventRow(e,zone)).join(''),plan.allDay.length,'No all-day events.')}
      ${section('Task deadlines',plan.deadlines.map(t=>deadlineRow(t,selected)).join(''),plan.deadlines.length,'No tasks due.')}
      ${selected===today?`<div class="ws-plan-extras">
        ${section('Overdue',overdueRows,plan.overdue.length,'No overdue tasks.')}
        ${section('Unscheduled Inbox',inboxRows,plan.inboxCount,'Your task Inbox is clear.')}
      </div>`:''}
    </div>`;
}
function weekBody(state:WorkspaceState,selected:string,today:string):string {
    const days=reviewWeek(state,selected);
    return `<div class="ws-plan-week">
      ${days.map(plan=>`<section class="ws-plan-week-day" data-plan-day="${esc(plan.date)}">
        <header><button type="button" data-action="planning-jump-day" data-id="${esc(plan.date)}" class="ws-plan-week-date" aria-label="Review ${esc(label(plan.date))}">
          <strong>${esc(label(plan.date))}</strong>${plan.date===today?'<small>Today</small>':''}</button>
          <span>${plan.timed.length} timed · ${plan.allDay.length} all-day · ${plan.deadlines.length} due</span></header>
        ${plan.overlaps.length?`<p class="ws-plan-week-warning">${plan.overlaps.length} timed overlap${plan.overlaps.length===1?'':'s'} · review this day</p>`:''}
        <div class="ws-plan-week-samples">
          ${plan.timed.slice(0,2).map(e=>`<span>Calendar · ${esc(e.title)} · ${esc(clock(e.start,state.preferences.timezone))}</span>`).join('')}
          ${plan.allDay.slice(0,1).map(e=>`<span>All day · ${esc(e.title)}</span>`).join('')}
          ${plan.deadlines.slice(0,2).map(t=>`<span>Task due · ${esc(t.title)}</span>`).join('')}
          ${!plan.events.length&&!plan.deadlines.length?'<small>No local blocks or task deadlines</small>':''}
        </div><div>${navButton('planning-jump-day','Open day',plan.date)}</div></section>`).join('')}
    </div>`;
}
/** Native day/week view over the original records. No writes and no data caching. */
export function renderPlanningReview(state:WorkspaceState,selected:string,mode:AgendaMode,today:string,
    selectedTaskIds:ReadonlySet<string>=new Set<string>(),taskFilter:WeekTaskFilter='carry',
    returnWeekDate:string|null=null):string {
    const range=mode==='week'?reviewWeek(state,selected):[reviewDay(state,selected)];
    const totals=range.reduce((sum,p)=>({event:sum.event+p.events.length,due:sum.due+p.deadlines.length,overlap:sum.overlap+p.overlaps.length}),{event:0,due:0,overlap:0});
    return `<section class="ws-planning-review" data-planning-review aria-label="Hub local planning review">
      <header class="ws-plan-header">
        <div><h2>${mode==='day'?esc(label(selected)):esc(label(range[0]!.date))+' – '+esc(label(range[6]!.date))}</h2>
          <p>${totals.event} event occurrence${totals.event===1?'':'s'} · ${totals.due} task deadline${totals.due===1?'':'s'} · ${totals.overlap} possible timed overlap${totals.overlap===1?'':'s'}</p></div>
        <div class="ws-plan-nav">
          <div role="group" aria-label="Agenda display"><button type="button" class="ws-plan-button" data-action="planning-day" aria-pressed="${mode==='day'}">Day</button><button type="button" class="ws-plan-button" data-action="planning-week" aria-pressed="${mode==='week'}">Week</button></div>
          <div role="group" aria-label="Move planning date">
            ${navButton('planning-prev',mode==='week'?'Previous week':'Previous day')}
            ${navButton('planning-today','Today')}
            ${navButton('planning-tomorrow','Tomorrow')}
            ${navButton('planning-next',mode==='week'?'Next week':'Next day')}
            ${mode==='week'?navButton('week-scroll-review','Review unfinished tasks'):''}
            ${returnWeekDate && weekDays(selected)[0]!==returnWeekDate ? navButton('week-return','Return to reviewed week') : ''}
          </div>
        </div>
      </header>
      ${mode==='week'?weekBody(state,selected,today)+renderWeeklyFollowThrough(state,selected,today,selectedTaskIds,taskFilter):dayBody(state,selected,today)}
      <footer>${navButton('new-event','Add event')} ${navButton('new-task','Add task')} <a href="/home/tasks/?filter=inbox">Task Inbox</a></footer>
    </section>`;
}
export function renderPlannerReviewSummary(state:WorkspaceState,selected:string):string {
    const p=reviewDay(state,selected);
    return `<div class="ws-plan-sidebar">
      ${p.overlaps.length?`<strong>${p.overlaps.length} possible timed overlap${p.overlaps.length===1?'':'s'}</strong>`:''}
      <div>${navButton('planning-prev-day','← Day')}${navButton('planning-today','Today')}${navButton('planning-next-day','Day →')}</div>
      <a href="/home/calendar/">Open full day/week review →</a>
    </div>`;
}
