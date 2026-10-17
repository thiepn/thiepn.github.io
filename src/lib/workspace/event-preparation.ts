/**
 * Original Hub calendar event → explicitly reviewed preparation and follow-through.
 * Uses existing task/note/event IDs, existing form writers, and only fresh owner
 * approvals. Topic matches are suggestions, not persisted relationships.
 */
import {addDays, validDate} from './model';
import {topicTokens} from './knowledge-work-context';
import {approvedSourceRows} from './approved-source-search';
import type {ContextOwnerInput} from './knowledge-work-context';
import type {WorkspaceState, CalendarEvent, Task, Note} from './types';

const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
const matchScore=(tokens:ReadonlySet<string>,title:string,detail='')=>{
  if(!tokens.size)return 0;
  const other=topicTokens(title+' '+detail);
  let hits=0;
  for(const token of tokens)if(other.has(token))hits++;
  return hits;
};
export interface EventPreparation {
  event:CalendarEvent;
  openTasks:readonly {id:string;title:string;due:string;score:number}[];
  completedTasks:readonly {id:string;title:string;score:number}[];
  notes:readonly {id:string;title:string;score:number}[];
  owners:readonly {source:string;title:string;href:string;detail:string}[];
  totalOpen:number;
  totalNotes:number;
  firstDate:string;
}
/**
 * No metadata copying, provider reads, fuzzy link authority, or calendar writes.
 * Each original local record is bounded and sorted using its existing ID.
 */
export function projectEventPreparation(state:WorkspaceState,event:CalendarEvent,
  sources:ContextOwnerInput={folio:null,notes:null}):EventPreparation {
  const tokens=topicTokens(event.title);
  const relatedTasks=state.tasks.map(task=>({
    task,score:matchScore(tokens,task.title,task.notes.slice(0,800))
  })).filter(row=>row.score>0).sort((a,b)=>
    b.score-a.score||(a.task.due||'9999-12-31').localeCompare(b.task.due||'9999-12-31')||
    a.task.id.localeCompare(b.task.id));
  const active=relatedTasks.filter(x=>!x.task.completedAt);
  const completed=relatedTasks.filter(x=>!!x.task.completedAt);
  const notes=state.notes.map(note=>({
    note,score:matchScore(tokens,note.title,note.body.slice(0,800))
  })).filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||b.note.updatedAt.localeCompare(a.note.updatedAt)||
      a.note.id.localeCompare(b.note.id));
  const sourceRows=approvedSourceRows({
    folio:sources.folio,notes:sources.notes,languages:[],apps:[],
    now:sources.now??Date.now(),
  }).filter(row=>matchScore(tokens,row.title)>0).slice(0,6);
  return {
    event,firstDate:event.date,
    openTasks:active.slice(0,5).map(x=>({
      id:x.task.id,title:x.task.title,due:x.task.due,score:x.score,
    })),
    completedTasks:completed.slice(0,3).map(x=>({
      id:x.task.id,title:x.task.title,score:x.score,
    })),
    notes:notes.slice(0,5).map(x=>({
      id:x.note.id,title:x.note.title,score:x.score,
    })),
    owners:sourceRows.map(row=>({
      source:row.id.split(':')[0]!,title:row.title,href:row.href,detail:row.detail,
    })),
    totalOpen:active.length,totalNotes:notes.length,
  };
}
export function preparationTaskSeed(event:CalendarEvent,today:string,
  mode:'prepare'|'followup'):Pick<Task,'title'|'notes'|'due'|'priority'> {
  const date=validDate(event.date)?event.date:today;
  const soon=validDate(today)&&date>=today;
  // A chosen date is a visible, editable form suggestion, never an automatic change.
  const due=mode==='prepare'
    ? soon?(addDays(date,-1)>=today?addDays(date,-1):date):''
    : soon?addDays(date,1):'';
  const title=(mode==='prepare'?'Prepare for ':'Follow up: ')+event.title;
  const notes=(mode==='prepare'?'Preparation':'Follow-up')+
    ' for original Hub calendar event: '+event.title+
    '\nEvent starts: '+event.date+
    '\nOriginal event ID is not copied or linked; review this task before saving.';
  return {title:title.slice(0,240),notes:notes.slice(0,2000),due,priority:'medium'};
}
export function preparationNoteSeed(event:CalendarEvent) {
  return {
    title:('Event notes · '+event.title).slice(0,240),
    body:'Original Hub calendar event: '+event.title+
      '\nDate: '+event.date+'\n\nPreparation questions:\n\nDecisions / meeting notes:\n\n'+
      'Follow-up actions:\n\nThis note is a draft, not an automatic calendar link.',
  };
}
const button=(action:string,label:string,id:string)=>
  '<button type="button" class="ws-button" data-action="'+action+'" data-id="'+esc(id)+'">'+
    esc(label)+'</button>';
export function renderEventPreparation(state:WorkspaceState,event:CalendarEvent,
  sources:ContextOwnerInput={folio:null,notes:null}):string {
  const item=projectEventPreparation(state,event,sources);
  const rows=item.openTasks.map(t=>'<li><span><strong>'+esc(t.title)+'</strong>'+
    '<small>Original unfinished Hub task · '+(t.due?'due '+esc(t.due):'Inbox')+
    ' · possible topic match</small></span>'+
    button('context-task','Next actions',t.id)+'</li>').join('');
  const finished=item.completedTasks.map(t=>'<li><span><strong>'+esc(t.title)+'</strong>'+
    '<small>Completed Hub task · possible topic match</small></span>'+
    button('edit-task','View original',t.id)+'</li>').join('');
  const notes=item.notes.map(n=>'<li><span><strong>'+esc(n.title)+'</strong>'+
    '<small>Original Hub note · possible topic match</small></span>'+
    button('edit-note','Continue note',n.id)+'</li>').join('');
  const ownerRows=item.owners.map(r=>'<li data-context-owner="'+esc(r.source)+'">'+
    '<span><strong>'+esc(r.title)+'</strong><small>'+esc(r.detail)+
    ' · original owner only</small></span>'+
    '<a href="'+esc(r.href)+'" rel="noreferrer">Open '+esc(r.source)+'</a></li>').join('');
  return '<section class="ws-event-preparation" data-event-preparation>'+
    '<header><div><p class="ws-home-eyebrow">Original Hub event · preparation</p>'+
    '<h3>Prepare, capture, follow through</h3></div>'+
    '<p>'+esc(event.date)+(event.endDate!==event.date?' – '+esc(event.endDate):'')+
    (event.allDay?' · All day':' · Time in Hub calendar')+'</p></header>'+
    '<div class="ws-event-prep-actions">'+
    button('prep-event-task','Draft preparation task',event.id)+
    button('followup-event-task','Draft follow-up task',event.id)+
    button('prep-event-note','Draft event note',event.id)+
    button('review-event-time','Review event time',event.id)+'</div>'+
    '<div class="ws-event-prep-columns"><section><h4>Existing related Hub work</h4>'+
    (rows?'<ul>'+rows+'</ul>':'<p>No unfinished Hub tasks with matching topic keywords.</p>')+
    (item.totalOpen>item.openTasks.length?'<small>Showing '+item.openTasks.length+
      ' of '+item.totalOpen+' possible matches.</small>':'')+
    (finished?'<h5>Previously completed</h5><ul>'+finished+'</ul>':'')+'</section>'+
    '<section><h4>Knowledge to bring</h4>'+
    (notes?'<ul>'+notes+'</ul>':'<p>No original Hub notes with matching keywords.</p>')+
    (item.totalNotes>item.notes.length?'<small>Showing '+item.notes.length+
      ' of '+item.totalNotes+' possible matches.</small>':'')+
    '<h5>Approved owner references</h5>'+
    (ownerRows?'<ul>'+ownerRows+'</ul>':
      '<p>No matching shared owner titles. Open Folio or Notes to review their full records.</p>')+
    '</section></div>'+
    '<p class="ws-event-prep-disclosure">Keyword matches are suggestions, not verified relationships. '+
    'Drafting opens original Hub forms and saves nothing until confirmed. Folio/Notes sources remain read-only; '+
    'no StudyOS assignments, KEEP entries or external meeting availability are inferred.</p></section>';
}
export function upcomingEventPreparation(state:WorkspaceState,today:string,limit=5):CalendarEvent[] {
  if(!validDate(today))return [];
  const end=addDays(today,6);
  const cap=Number.isSafeInteger(limit)&&limit>0?Math.min(limit,10):5;
  return state.events.filter(e=>e.date>=today&&e.date<=end)
    .sort((a,b)=>a.date.localeCompare(b.date)||(a.allDay?0:1)-(b.allDay?0:1)||
      a.start.localeCompare(b.start)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id))
    .slice(0,cap);
}
export function renderUpcomingEventPreparation(state:WorkspaceState,today:string):string {
  const upcoming=upcomingEventPreparation(state,today);
  const all=state.events.filter(e=>e.date>=today&&e.date<=addDays(today,6));
  return '<section class="ws-upcoming-event-prep" data-upcoming-event-prep>'+
    '<header><h4>Prepare for upcoming calendar events</h4>'+
      '<a href="/home/calendar/?mode=week">Full calendar</a></header>'+
    (upcoming.length?'<ul>'+upcoming.map(event=>{
      const data=projectEventPreparation(state,event);
      return '<li><span><strong>'+esc(event.title)+'</strong><small>Starts '+esc(event.date)+
        ' · '+data.totalOpen+' possibly related unfinished Hub task'+(data.totalOpen===1?'':'s')+
        ' · '+data.totalNotes+' Hub note match'+(data.totalNotes===1?'':'es')+
        '</small></span>'+button('context-event','Prepare / follow up',event.id)+'</li>';
    }).join('')+'</ul>':
      '<p>No new Hub calendar event starts in the next seven days.</p>')+
    (all.length>upcoming.length?'<p>Showing '+upcoming.length+' of '+all.length+
      ' events starting in this period.</p>':'')+
    '<p>Only actual Hub events are listed. Potential topic matches are not confirmed event attachments.</p>'+
    '</section>';
}
