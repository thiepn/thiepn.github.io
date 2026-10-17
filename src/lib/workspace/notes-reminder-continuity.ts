/**
 * One-time Notes reminder continuity inside original Hub Calendar and Today.
 * All due timestamps and titles remain Notes-owned, bounded, read-only and
 * in RAM. A reminder is not a Hub task, completion record or calendar block.
 */
import {addDays,dayKey,validDate,weekDays} from './model';
import type {NotesDeviceSummary} from './notes-device';
import type {AgendaMode} from './planning-review';

export const NOTES_REMINDER_MAX_AGE_MS=5*60_000;
export interface SharedNotesReminder {
  title:string; dueAt:string; dueDay:string; localTime:string;
}
export interface NotesReminderDay {
  day:string; reminders:readonly SharedNotesReminder[];
}
export interface NotesReminderProjection {
  days:readonly NotesReminderDay[];
  overdue:readonly SharedNotesReminder[];
  count:number; inRange:number; truncated:boolean;
}
/** Caller must also enforce exact opener/nonce and same Hub owner identity. */
export function freshNotesReminderShare(
  shared:NotesDeviceSummary|null,now=Date.now(),
):NotesDeviceSummary|null {
  if(!shared||shared.schema!=='thiepn:notes-hub-local'||shared.version!==1||
     shared.source!=='notes-local-device')return null;
  const age=now-Date.parse(shared.generatedAt);
  return Number.isFinite(age)&&age>=-30_000&&age<=NOTES_REMINDER_MAX_AGE_MS?shared:null;
}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
const headingDay=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString(
  undefined,{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'});
function sourceRows(shared:NotesDeviceSummary,zone:string):SharedNotesReminder[] {
  return shared.reminders.slice(0,6).flatMap(reminder=>{
    const at=new Date(reminder.dueAt);
    if(!Number.isFinite(at.getTime()))return [];
    try {
      return [{title:reminder.title,dueAt:reminder.dueAt,dueDay:dayKey(zone,at),
        localTime:new Intl.DateTimeFormat(undefined,{
          timeZone:zone,hour:'2-digit',minute:'2-digit',
        }).format(at)}];
    } catch{return [];}
  }).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)||a.title.localeCompare(b.title));
}
export function projectNotesReminders(
  shared:NotesDeviceSummary|null,days:readonly string[],zone:string,now=Date.now(),
  overdueBefore:string|null=null,
):NotesReminderProjection {
  const snapshot=freshNotesReminderShare(shared,now);
  const dates=days.filter(validDate).slice(0,7);
  const unique=[...new Set(dates)];
  if(!snapshot) return {days:unique.map(day=>({day,reminders:[]})),
    overdue:[],count:0,inRange:0,truncated:false};
  const items=sourceRows(snapshot,zone);
  const result=unique.map(day=>({day,reminders:items.filter(item=>item.dueDay===day)}));
  const overdue=overdueBefore&&validDate(overdueBefore)?
    items.filter(item=>item.dueDay<overdueBefore):[];
  return {days:result,overdue,count:items.length,
    inRange:result.reduce((sum,row)=>sum+row.reminders.length,0),
    truncated:snapshot.reminders.length>6};
}
function entries(rows:readonly SharedNotesReminder[],overdue=false):string {
  return rows.map(row=>'<li class="ws-notes-reminder-item">'+
    '<div><strong>'+esc(row.title)+'</strong><small>'+
    (overdue?'Earlier Notes reminder · ':'Notes reminder due · ')+
    esc(row.dueDay)+' · '+esc(row.localTime)+'</small></div>'+
    '<a href="/notes/" rel="noreferrer">Open Notes</a></li>').join('');
}
function controls(hasShare:boolean):string {
  return '<div class="ws-notes-reminder-actions">'+
    '<button type="button" data-action="connect-notes-source" class="ws-unified-action">'+
      (hasShare?'Refresh Notes':'Share Notes')+'</button>'+
    (hasShare?'<button type="button" data-action="clear-notes-source" class="ws-unified-action">Clear share</button>':'')+
    '<a href="/notes/" rel="noreferrer">Go to Notes</a></div>';
}
const disclosure='Notes owns every reminder and its completion status. Only up to six explicitly shared reminders can be compared here. Due times are not calendar reservations; no Notes item was imported, completed or rescheduled. This is not a full availability check.';
export function renderNotesCalendarContinuity(
  selected:string,mode:AgendaMode,today:string,zone:string,
  shared:NotesDeviceSummary|null,now=Date.now(),
):string {
  const snapshot=freshNotesReminderShare(shared,now);
  const dates=mode==='week'?weekDays(selected):[selected];
  const currentIncluded=dates.includes(today);
  const overdueBefore=currentIncluded?(mode==='week'?dates[0]!:today):null;
  const result=projectNotesReminders(snapshot,dates,zone,now,overdueBefore);
  const content=snapshot?'<div class="ws-notes-reminder-days">'+
    result.days.map(row=>'<section data-notes-reminder-day="'+esc(row.day)+'">'+
      '<header><strong>'+esc(headingDay(row.day))+'</strong><small>'+
        row.reminders.length+' Notes reminder'+(row.reminders.length===1?'':'s')+'</small></header>'+
      (row.reminders.length?'<ul>'+entries(row.reminders)+'</ul>':
        '<p>No reminders in this limited share for this date.</p>')+'</section>').join('')+
    '</div>'+
    (result.overdue.length?'<section class="ws-notes-reminder-earlier">'+
      '<h4>Earlier owner reminders ('+result.overdue.length+')</h4>'+
      '<ul>'+entries(result.overdue,true)+'</ul></section>':'')+
    (result.count>result.inRange+result.overdue.length?
      '<p>Other shared Notes reminders fall outside the selected period.</p>':''):
    '<p>'+(shared?'The previous one-time Notes share has expired. Share again to review due reminders.':
      'Share a bounded Notes summary explicitly to compare its original reminders with your Hub plan.')+'</p>';
  return '<section class="ws-notes-reminder-continuity" data-notes-reminder-continuity>'+
    '<header><div><p class="ws-home-eyebrow">Original Notes · read-only</p>'+
      '<h3>Notes reminders beside your plan</h3></div>'+controls(!!shared)+'</header>'+
      content+'<p class="ws-notes-reminder-provenance">'+disclosure+'</p></section>';
}
export function renderNotesTodayHorizon(
  day:string,zone:string,shared:NotesDeviceSummary|null,now=Date.now(),
):string {
  const snapshot=freshNotesReminderShare(shared,now);
  const days=Array.from({length:7},(_,i)=>addDays(day,i));
  const result=projectNotesReminders(snapshot,days,zone,now,day);
  const upcoming=result.days.flatMap(x=>x.reminders);
  return '<section class="ws-notes-reminder-horizon" data-notes-reminder-horizon>'+
    '<header><div><h4>Notes reminders · next seven days</h4>'+
      '<small>Separate source deadlines, not Hub tasks or appointments</small></div>'+
      controls(!!shared)+'</header>'+
    (snapshot?
      (result.overdue.length?'<div class="ws-notes-reminder-earlier"><h5>Earlier shared reminders</h5>'+
        '<ul>'+entries(result.overdue,true)+'</ul></div>':'')+
      (upcoming.length?'<ul>'+entries(upcoming)+'</ul>':
        '<p>No upcoming reminders in the limited Notes share.</p>'):
      '<p>'+(shared?'Notes share expired. Refresh explicitly to see owner reminders.':
        'Share from Notes to include its upcoming reminders in this week.')+'</p>')+
    '<p class="ws-notes-reminder-provenance">'+disclosure+'</p></section>';
}
