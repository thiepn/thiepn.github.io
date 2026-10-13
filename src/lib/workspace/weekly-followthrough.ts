import { addDays, validDate, weekDays } from './model';
import { applyTaskPlan } from './task-flow';
import { reviewWeek } from './planning-review';
import type { Task, WorkspaceState } from './types';

export type WeekTaskFilter = 'carry' | 'week' | 'inbox' | 'later' | 'all';
export const WEEK_FILTERS:readonly WeekTaskFilter[] = ['carry','week','inbox','later','all'];
export type TaskBeforeMove = Pick<Task,'id'|'title'|'due'|'time'|'priority'|'completedAt'>;
export const MAX_WEEK_BATCH = 25;
export const MAX_WEEK_ROWS = 40;

const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]!));
const weekEnd=(day:string)=>addDays(weekDays(day)[0]!,6);
const monday=(day:string)=>weekDays(day)[0]!;
const priorityRank={high:0,medium:1,low:2,none:3} as const;
const label=(day:string)=>new Date(day+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',month:'short',day:'numeric'});

export function weeklyTaskBucket(task:Task,anchor:string):Exclude<WeekTaskFilter,'all'> {
  const from=monday(anchor),to=weekEnd(anchor);
  if(!task.due)return 'inbox';
  if(task.due<from)return 'carry';
  if(task.due<=to)return 'week';
  return 'later';
}
export function eligibleWeekTasks(state:WorkspaceState,anchor:string,filter:WeekTaskFilter):Task[] {
  return state.tasks.filter(t=>!t.completedAt && (filter==='all'||weeklyTaskBucket(t,anchor)===filter))
    .sort((a,b)=>(a.due||'9999-12-31').localeCompare(b.due||'9999-12-31')||
      priorityRank[a.priority]-priorityRank[b.priority]||a.title.localeCompare(b.title));
}
export function weekPlanningSummary(state:WorkspaceState,anchor:string) {
  const days=reviewWeek(state,anchor),open=state.tasks.filter(t=>!t.completedAt);
  const categories={carry:0,week:0,inbox:0,later:0};
  for(const t of open)categories[weeklyTaskBucket(t,anchor)]++;
  return {days,categories,open:open.length,
    timedOccurrences:days.reduce((n,d)=>n+d.timed.length,0),
    allDayOccurrences:days.reduce((n,d)=>n+d.allDay.length,0),
    overlapOccurrences:days.reduce((n,d)=>n+d.overlaps.length,0),
    completedInWeek:state.tasks.filter(t=>t.completedAt&&validDate(t.completedAt.slice(0,10))&&
      t.completedAt.slice(0,10)>=monday(anchor)&&t.completedAt.slice(0,10)<=weekEnd(anchor)).length};
}
export function taskSnapshot(task:Task):TaskBeforeMove {
  return {id:task.id,title:task.title,due:task.due,time:task.time,
    priority:task.priority,completedAt:task.completedAt};
}
export interface WeekChange {id:string;title:string;before:string;after:string;clearedTime:string;}
/** Validate all selections before changing any task; qualified only by the original task writer. */
export function prepareWeeklyShift(tasks:readonly Task[],snapshots:readonly TaskBeforeMove[],target:string):WeekChange[] {
  if(!validDate(target))throw new Error('Choose a valid target date.');
  if(!snapshots.length||snapshots.length>MAX_WEEK_BATCH)
    throw new Error(`Select between 1 and ${MAX_WEEK_BATCH} unfinished Hub tasks.`);
  const ids=new Set<string>(),changes:WeekChange[]=[];
  for(const original of snapshots){
    if(ids.has(original.id))throw new Error('A task was selected twice.');
    ids.add(original.id);
    const current=tasks.find(t=>t.id===original.id);
    if(!current||current.completedAt)
      throw new Error('A selected task was removed or completed. Review the current task list.');
    if(JSON.stringify(taskSnapshot(current))!==JSON.stringify(original))
      throw new Error(`The task "${original.title}" changed since review. Reopen the planning preview.`);
    if(current.due!==target || !!current.time)changes.push({
      id:current.id,title:current.title,before:current.due||'Inbox',after:target,clearedTime:current.time
    });
  }
  if(!changes.length)throw new Error('All selected tasks already have this due date and no clock to clear.');
  return changes;
}
/** Existing H12 mutator; only call after explicit user confirmation inside existing CAS writer. */
export function applyWeeklyShift(tasks:Task[],snapshots:readonly TaskBeforeMove[],target:string):WeekChange[] {
  const changes=prepareWeeklyShift(tasks,snapshots,target);
  for(const change of changes){
    const task=tasks.find(t=>t.id===change.id)!;
    applyTaskPlan(task,'today',target);
  }
  return changes;
}
const action=(name:string,title:string)=>`<button type="button" class="ws-week-action" data-action="${name}">${esc(title)}</button>`;
const filters:Record<WeekTaskFilter,string>={
  carry:'Before this week',week:'Due this week',inbox:'Inbox',later:'After this week',all:'All unfinished'
};
export function renderWeeklyFollowThrough(state:WorkspaceState,anchor:string,today:string,
  selectedIds:ReadonlySet<string>,filter:WeekTaskFilter):string {
  const first=monday(anchor),last=weekEnd(anchor),nextMonday=addDays(first,7);
  const summary=weekPlanningSummary(state,anchor);
  const available=eligibleWeekTasks(state,anchor,filter),visible=available.slice(0,MAX_WEEK_ROWS);
  const selectedOpen=state.tasks.filter(t=>selectedIds.has(t.id)&&!t.completedAt);
  const counts:{[K in Exclude<WeekTaskFilter,'all'>]:number}=summary.categories;
  const todayInWeek=today>=first && today<=last;
  const items=visible.map(t=>`<li class="ws-week-task">
    <label><input type="checkbox" data-week-task-id="${esc(t.id)}" ${selectedIds.has(t.id)?'checked':''} aria-label="Select task ${esc(t.title)} for due-date review"/>
      <span><strong>${esc(t.title)}</strong><small>${t.due?'Due '+esc(t.due):'Inbox · no due date'} · ${esc(t.priority)} priority${t.time?' · task clock '+esc(t.time):''}</small></span>
    </label>
    <button type="button" class="ws-week-inline" data-action="context-task" data-id="${esc(t.id)}">Next</button>
  </li>`).join('');
  return `<section class="ws-week-followthrough" data-week-followthrough aria-labelledby="ws-week-title">
    <header><div><p class="ws-home-eyebrow">Weekly follow-through · Hub tasks only</p>
      <h2 id="ws-week-title">Review unfinished work</h2>
      <p>${esc(label(first))} – ${esc(label(last))} · ${todayInWeek?'This is the current week.':'Reviewing a different week.'}
        Only tasks you select can be changed, after a separate confirmation.</p></div>
      <span class="ws-week-source">${summary.open} unfinished local task${summary.open===1?'':'s'} · no external data</span>
    </header>
    <div class="ws-week-workload">
      <div><strong>${summary.categories.carry}</strong><span>Due before week</span></div>
      <div><strong>${summary.categories.week}</strong><span>Due in week</span></div>
      <div><strong>${summary.categories.inbox}</strong><span>Unscheduled</span></div>
      <div><strong>${summary.timedOccurrences}</strong><span>Timed event-day appearances</span></div>
      <div><strong>${summary.allDayOccurrences}</strong><span>All-day event appearances</span></div>
      <div><strong>${summary.overlapOccurrences}</strong><span>Potential timed overlaps across days</span></div>
    </div>
    <p class="ws-week-source-note">Workload is a count of actual Hub records, not expected hours or calendar availability. Task deadlines are not reserved time. Multi-day events may appear on multiple dates; external calendars were not queried.</p>
    <div class="ws-week-filters" role="group" aria-label="Weekly task categories">
      ${WEEK_FILTERS.map(value=>`<button type="button" data-action="week-filter" data-id="${value}" aria-pressed="${filter===value}">
        ${filters[value]} <span>${value==='all'?summary.open:counts[value]}</span></button>`).join('')}
    </div>
    <div class="ws-week-toolbar"><span>${selectedOpen.length} selected unfinished task${selectedOpen.length===1?'':'s'} · maximum ${MAX_WEEK_BATCH} per review</span>
      <div>${action('week-select-visible','Select shown')}${action('week-clear','Clear selection')}${action('week-preview','Review selected changes')}</div></div>
    ${items?`<ul class="ws-week-tasks">${items}</ul>`:
       `<div class="ws-week-empty"><strong>No tasks in this category</strong><p>Choose another filter, add a Hub task, or use the existing Inbox and calendar planners.</p>
       <a href="/home/tasks/?filter=inbox">Open task Inbox</a></div>`}
    ${available.length>visible.length?`<p class="ws-week-limited">Showing ${visible.length} of ${available.length} matching tasks. Narrow the category or open Tasks for the rest.</p>`:''}
    <div class="ws-week-actions">
      <span>Carryover suggestion: next Monday, ${esc(nextMonday)}. You can choose any valid date in the review form.</span>
      <button type="button" data-action="week-preview" class="ws-week-primary">Review selected tasks →</button>
    </div>
    <footer><a href="/home/tasks/">Open native Tasks</a><a href="/home/calendar/">Local Calendar</a>
      <span>Selection is temporary in this tab. No dates change until you confirm the review.</span></footer>
  </section>`;
}
