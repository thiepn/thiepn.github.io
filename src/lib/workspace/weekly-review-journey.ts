/**
 * Guided Weekly Review across original Hub work, routines and decisions.
 *
 * A deliberate review journey rather than another owner index: all actions
 * operate on original records through existing controller handlers. The
 * chosen stage and reflection are tab-only UI state. No shadow progress
 * record, external provider writer, calendar availability or time tracking.
 */
import {addDays,dayKey,trackerTotal} from './model';
import {reviewDay} from './planning-review';
import {outcomes,outcomeProgress} from './outcome-board';
import {decisions} from './decision-register';
import {freshFolioPlanningShare} from './folio-continuity';
import {freshNotesReminderShare,projectNotesReminders} from './notes-reminder-continuity';
import type {FolioDeviceSnapshot} from './folio-device';
import type {NotesDeviceSummary} from './notes-device';
import type {WorkspaceState} from './types';

export const WEEKLY_REVIEW_STAGES=['triage','calendar','routines','decisions','finish'] as const;
export type WeeklyReviewStage=typeof WEEKLY_REVIEW_STAGES[number];
export interface WeeklyReviewDraft {reflection:string;priority:string;}
export const EMPTY_WEEKLY_REVIEW:Readonly<WeeklyReviewDraft>={reflection:'',priority:''};
export const REVIEW_DRAFT_LIMITS={reflection:1000,priority:500} as const;
export function weeklyReviewField(
  old:Readonly<WeeklyReviewDraft>,field:string,value:string,
):WeeklyReviewDraft {
  if(field!=='reflection'&&field!=='priority')throw new Error('Unknown review field.');
  return {...old,[field]:value.slice(0,REVIEW_DRAFT_LIMITS[field])};
}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
const btn=(action:string,title:string,id='')=>
  '<button type="button" data-action="'+action+'"'+(id?' data-id="'+esc(id)+'"':'')+
  ' class="ws-unified-action">'+esc(title)+'</button>';
const link=(href:string,name:string)=>'<a href="'+href+'">'+esc(name)+'</a>';
const labels:Record<WeeklyReviewStage,string>={
  triage:'Collect & triage',calendar:'Review commitments',routines:'Check momentum',
  decisions:'Resolve decisions',finish:'Close the loop',
};
const priorities={high:0,medium:1,low:2,none:3} as const;
export interface WeeklyReviewSnapshot {
  start:string;end:string;
  inbox:number;overdue:number;due:number;
  eventCount:number;eventOverlaps:number;
  trackers:number;outcomes:number;unfinishedOutcomeTasks:number;
  decisionOpen:number;decisionDue:number;recentNotes:number;
}
/** All numbers originate in the unchanged Hub WorkspaceState. */
export function weeklyReviewSnapshot(state:WorkspaceState,day:string):WeeklyReviewSnapshot {
  const days=Array.from({length:7},(_,i)=>reviewDay(state,addDays(day,i)));
  const open=state.tasks.filter(t=>!t.completedAt);
  const liveOutcomes=outcomes(state).filter(o=>!o.archived);
  const liveDecisions=decisions(state).filter(d=>d.status!=='archived');
  return {
    start:day,end:addDays(day,6),
    inbox:open.filter(t=>!t.due).length,
    overdue:open.filter(t=>t.due&&t.due<day).length,
    due:open.filter(t=>t.due>=day&&t.due<=addDays(day,6)).length,
    eventCount:days.reduce((n,r)=>n+r.events.length,0),
    eventOverlaps:days.reduce((n,r)=>n+r.overlaps.length,0),
    trackers:state.trackers.length,outcomes:liveOutcomes.length,
    unfinishedOutcomeTasks:liveOutcomes.reduce((n,o)=>n+outcomeProgress(state,o,day).open.length,0),
    decisionOpen:liveDecisions.filter(d=>d.status==='open').length,
    decisionDue:liveDecisions.filter(d=>d.review&&d.review<=day).length,
    recentNotes:state.notes.length,
  };
}
export function weeklyReviewNoteSeed(state:WorkspaceState,day:string,draft:Readonly<WeeklyReviewDraft>){
  const s=weeklyReviewSnapshot(state,day);
  return {
    title:'Weekly review · '+s.start+' – '+s.end,
    body:[
      'Hub weekly review · original local records only',
      'Review window: '+s.start+' to '+s.end,
      'Unscheduled tasks: '+s.inbox+'; overdue tasks: '+s.overdue+
        '; upcoming deadlines: '+s.due,
      'Hub event occurrences: '+s.eventCount+'; possible timed overlaps: '+s.eventOverlaps,
      'Active outcomes: '+s.outcomes+'; related unfinished tasks: '+s.unfinishedOutcomeTasks,
      'Open decisions: '+s.decisionOpen+'; decisions with review due: '+s.decisionDue,
      'My reflection:\n'+(draft.reflection.trim()||'(add a reflection before saving)'),
      'My next-week priority:\n'+(draft.priority.trim()||'(choose a priority before saving)'),
      'Review and edit in the original Hub Notes form before saving. No actions are automatically completed.',
    ].join('\n\n'),
  };
}
function list(title:string,items:readonly string[],total:number,empty:string):string {
  return '<section class="ws-review-group"><h4>'+esc(title)+
    ' <small>'+total+'</small></h4>'+(items.length?'<ul>'+items.join('')+'</ul>':
    '<p>'+esc(empty)+'</p>')+
    (total>items.length?'<p>Showing '+items.length+' of '+total+
      ' original records; open the source section for more.</p>':'')+'</section>';
}
const entry=(title:string,meta:string,actions:string)=>
  '<li class="ws-review-item"><div><strong>'+esc(title)+'</strong>'+
  '<small>'+esc(meta)+'</small></div><div>'+actions+'</div></li>';
function stageBody(
  state:WorkspaceState,day:string,stage:WeeklyReviewStage,draft:Readonly<WeeklyReviewDraft>,
  folio:FolioDeviceSnapshot|null,notes:NotesDeviceSummary|null,now:number,
):string {
  const end=addDays(day,6),active=state.tasks.filter(t=>!t.completedAt);
  if(stage==='triage'){
    const inbox=active.filter(t=>!t.due).sort((a,b)=>priorities[a.priority]-priorities[b.priority]||a.title.localeCompare(b.title));
    const overdue=active.filter(t=>t.due&&t.due<day).sort((a,b)=>a.due.localeCompare(b.due));
    return '<p>Process real Hub tasks first. Planning changes are reviewed in the original task form; no task is completed just by advancing.</p>'+
      list('Unscheduled Inbox',inbox.slice(0,8).map(t=>entry(t.title,'Original Hub task · '+t.priority+' priority',
        btn('unified-triage','Review due date',t.id)+btn('context-task','Next actions',t.id))),inbox.length,'Inbox is clear.')+
      list('Past-due work',overdue.slice(0,8).map(t=>entry(t.title,'Due '+t.due,
        btn('unified-triage','Review plan',t.id)+btn('unified-focus-task','Focus',t.id))),overdue.length,'No overdue tasks.')+
      '<div class="ws-review-shortcuts">'+btn('capture-task','Capture missing task')+
        link('/home/tasks/?filter=inbox','Open complete Inbox')+'</div>';
  }
  if(stage==='calendar'){
    const days=Array.from({length:7},(_,i)=>reviewDay(state,addDays(day,i)));
    const local=days.flatMap(d=>d.events.map(e=>({e,day:d.date})));
    const folioActive=freshFolioPlanningShare(folio,now);
    const notesActive=freshNotesReminderShare(notes,now);
    const reminders=projectNotesReminders(notesActive,days.map(d=>d.date),state.preferences.timezone,now,day);
    return '<p>Compare real local commitments, task deadlines and visible owner shares. Unshared time is not free time.</p>'+
      '<ol class="ws-review-days">'+days.map(d=>'<li><strong>'+esc(d.date)+'</strong>'+
        '<span>'+d.events.length+' Hub event'+(d.events.length===1?'':'s')+' · '+
        d.deadlines.length+' task deadline'+(d.deadlines.length===1?'':'s')+
        (d.overlaps.length?' · '+d.overlaps.length+' Hub overlap'+(d.overlaps.length===1?'':'s'):'')+
        '</span>'+link('/home/calendar/?date='+encodeURIComponent(d.date),'Review day')+'</li>').join('')+'</ol>'+
      list('Local events to review',local.slice(0,6).map(({e,day:d})=>entry(e.title,
        'Original Hub event · '+d,btn('review-event-time','Review time',e.id)+
        btn('context-event','Preparation',e.id))),local.length,'No local events in this window.')+
      '<section class="ws-review-group"><h4>Original owner calendars and reminders</h4>'+
        '<p>Folio: '+(folioActive?'One-time planning share approved.':'Not shared or expired.')+
        ' '+link('/folio/?view=planner','Open Folio planner')+'</p>'+
        '<p>Notes: '+(notesActive?
          String(reminders.inRange)+' of '+String(reminders.count)+' shared reminders inside this week':
          'No current approved reminder share')+
        '. '+link('/notes/','Open Notes')+'</p>'+
        (reminders.overdue.length?'<p>'+reminders.overdue.length+' earlier Notes reminder(s) in this limited share.</p>':'')+
        '<p>External appointments and reminders are never copied into Hub event IDs.</p></section>';
  }
  if(stage==='routines'){
    const trackers=state.trackers.slice(0,8);
    const activeOutcomes=outcomes(state).filter(o=>!o.archived).sort((a,b)=>(a.target||'9999').localeCompare(b.target||'9999'));
    return '<p>Inspect actual tracker logs and grouped outcome work. Counts are snapshots, not a new progress score.</p>'+
      list('Tracker check-ins',trackers.map(t=>entry(t.title,
        String(trackerTotal(state,t.id,day))+' / '+t.goal+' '+t.unit+' · '+t.cadence,
        btn('log-tracker','Log in Hub',t.id))),state.trackers.length,'No Hub trackers yet.')+
      list('Active outcomes',activeOutcomes.slice(0,6).map(o=>{
        const p=outcomeProgress(state,o,day);
        return entry(o.title,String(p.done)+' / '+p.total+' linked tasks complete'+
          (o.target?' · target '+o.target:'')+(p.missing?' · source missing':''),
          btn('edit-outcome','Review grouping',o.id)+
          (p.open[0]?btn('context-task','Work on next task',p.open[0].id):''));
      }),activeOutcomes.length,'No active outcomes. You can start one in Workspace.')+
      link('/home/trackers/','Open all Hub trackers');
  }
  if(stage==='decisions'){
    const live=decisions(state).filter(d=>d.status!=='archived').sort((a,b)=>{
      const rank=(x:typeof a)=>x.review&&x.review<=day?0:x.status==='open'?1:2;
      return rank(a)-rank(b)||(a.review||'9999').localeCompare(b.review||'9999');
    });
    const notesLocal=[...state.notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,6);
    return '<p>Review existing decisions and recent research context. Recording a choice is a separate confirmed action in Hub.</p>'+
      list('Decision review',live.slice(0,8).map(d=>entry(d.title,d.status+
          (d.review?' · review '+d.review:' · no review date'),
          btn(d.status==='open'?'choose-decision':'edit-decision',
            d.status==='open'?'Consider options':'Review decision',d.id))),live.length,
        'No active decisions in this workspace.')+
      list('Recently changed local notes',notesLocal.map(n=>entry(n.title,
        'Edited '+n.updatedAt.slice(0,10),btn('context-note','Review connected work',n.id))),
        state.notes.length,'No local Hub notes yet.')+
      '<p>KEEP encrypted material and StudyOS assessments are not imported or inferred.</p>';
  }
  const total=weeklyReviewSnapshot(state,day);
  return '<p>The review does not automatically mark anything done. Decide whether to save a personal reflection in the original Hub Notes editor.</p>'+
    '<div class="ws-review-summary"><p><strong>'+total.inbox+'</strong> Inbox</p>'+
    '<p><strong>'+total.overdue+'</strong> overdue</p>'+
    '<p><strong>'+total.due+'</strong> upcoming</p>'+
    '<p><strong>'+total.eventOverlaps+'</strong> event overlaps</p>'+
    '<p><strong>'+total.decisionDue+'</strong> decision reviews due</p></div>'+
    '<div class="ws-review-fields">'+
      '<label>What changed this week?<textarea data-weekly-review-field="reflection" rows="4" maxlength="'+
        REVIEW_DRAFT_LIMITS.reflection+'" placeholder="Progress, blockers and lessons">'+
        esc(draft.reflection)+'</textarea></label>'+
      '<label>What is my next-week priority?<textarea data-weekly-review-field="priority" rows="3" maxlength="'+
        REVIEW_DRAFT_LIMITS.priority+'" placeholder="One concrete direction or commitment">'+
        esc(draft.priority)+'</textarea></label></div>'+
    '<div class="ws-review-shortcuts">'+btn('weekly-review-note','Review as Hub note')+
      btn('unified-mode','Return to Today','today')+
      link('/home/calendar/?mode=week','Open full Calendar Week')+'</div>'+
    '<p>The reflection is temporary tab state. It is only saved if you explicitly confirm the original Hub note editor.</p>';
}
export function renderWeeklyReview(
  state:WorkspaceState,day:string,stage:WeeklyReviewStage='triage',
  draft:Readonly<WeeklyReviewDraft>=EMPTY_WEEKLY_REVIEW,
  folio:FolioDeviceSnapshot|null=null,notes:NotesDeviceSummary|null=null,
  now=Date.now(),
):string {
  const current=WEEKLY_REVIEW_STAGES.includes(stage)?stage:'triage';
  const index=WEEKLY_REVIEW_STAGES.indexOf(current);
  const summary=weeklyReviewSnapshot(state,day);
  const next=WEEKLY_REVIEW_STAGES[index+1],previous=WEEKLY_REVIEW_STAGES[index-1];
  return '<section class="ws-weekly-review" data-weekly-review data-review-stage="'+current+
    '" aria-labelledby="ws-review-title"><header>'+
    '<div><p class="ws-home-eyebrow">Native Hub · guided review · original owners</p>'+
    '<h2 id="ws-review-title">Weekly review</h2>'+
    '<p>'+esc(summary.start)+' to '+esc(summary.end)+
    ' · live Hub records, not a completed-review audit</p></div>'+
    link('/home/calendar/?mode=week','Calendar Week')+'</header>'+
    '<nav aria-label="Review steps"><ol class="ws-review-stages">'+
      WEEKLY_REVIEW_STAGES.map((name,i)=>'<li><button type="button" data-action="weekly-review-stage" data-id="'+name+
        '" aria-current="'+(current===name?'step':'false')+'">'+
        '<span>'+String(i+1)+'</span>'+esc(labels[name])+'</button></li>').join('')+'</ol></nav>'+
    '<section class="ws-review-stage" aria-labelledby="ws-review-stage-title"><header><div>'+
      '<p>Step '+String(index+1)+' of '+WEEKLY_REVIEW_STAGES.length+'</p>'+
      '<h3 id="ws-review-stage-title">'+esc(labels[current])+'</h3></div>'+
      '<span>Updates only through original Hub forms</span></header>'+
    stageBody(state,day,current,draft,folio,notes,now)+'</section>'+
    '<footer>'+ (previous?btn('weekly-review-stage','Previous: '+labels[previous],previous):'<span>Start with actual pending work</span>')+
      (next?btn('weekly-review-stage','Next: '+labels[next],next):link('/','Return to Today'))+'</footer>'+
    '<p class="ws-review-disclosure">No shadow task statuses, external source IDs, duplicate planners, reminders, hidden Account transfer or automatically completed review records.</p></section>';
}
