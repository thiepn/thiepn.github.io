import type { NotesDeviceSummary } from './notes-device';
import type { NotesDeviceStatus } from './notes-panel';
import type { FolioDeviceSnapshot } from './folio-device';
import type { FolioDeviceStatus } from './folio-panel';
import type { HubLanguageCard } from './language-read';
import { HUB_LANGUAGE_IDS,HUB_LANGUAGE_OWNER_ROUTES,ownerLanguageLink } from './language-read';
import type { AppShortcut, CalendarEvent } from './types';
import { buildSourceQueue } from './daily-source-queue';
import { dayKey } from './model';
import { compareApprovedFolioTime } from './source-time-review';

export interface SourceTodayInputs {
  folio: {status:FolioDeviceStatus;snapshot:FolioDeviceSnapshot|null};
  notes: {status:NotesDeviceStatus;snapshot:NotesDeviceSummary|null};
  languages: {status:'signed-out'|'loading'|'ready'|'unavailable';cards:readonly HubLanguageCard[]};
  apps: readonly AppShortcut[];
  hubEvents?: readonly CalendarEvent[];
  day?: string;
  timezone?: string;
}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
const button=(action:string,label:string)=>'<button type="button" data-action="'+action+'" class="ws-unified-action">'+esc(label)+'</button>';
const stamp=(s:string)=>new Date(s).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
const shortDate=(s:string)=>new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const info=(s:string)=>'<p class="ws-source-today-empty">'+esc(s)+'</p>';
const tile=(title:string,detail:string)=>'<li><strong>'+esc(title)+'</strong><small>'+esc(detail)+'</small></li>';
export function renderSourceToday(sources:SourceTodayInputs):string{
  const {folio,notes,languages,apps}=sources;
  let folioBody='';
  if(folio.snapshot){
    const s=folio.snapshot;
    const preview=[
      ...s.tasks.slice(0,3).map(x=>tile(x.title,x.deadline&&x.deadline<s.date?'Overdue Folio task':'Folio plan')),
      ...s.events.slice(0,3).map(x=>tile(x.title,shortDate(x.start)+' · '+(x.allDay?'All day':stamp(x.start)))),
      ...s.habits.filter(x=>x.status==='completed').slice(0,2).map(x=>tile(x.title,'Habit recorded in Folio')),
    ];
    const comparisons=compareApprovedFolioTime(sources.hubEvents??[],s);
    const comparisonMarkup='<div class="ws-source-time-review"><strong>Hub + approved Folio blocks</strong>'+
      (comparisons.length?
        '<p>'+comparisons.length+' possible timed overlap'+(comparisons.length===1?'':'s')+
        ' among the shared entries (up to 24 shown). Neither source was changed.</p>'+
        '<ul>'+comparisons.slice(0,4).map(pair=>tile(pair.hubTitle,
          'Hub with Folio: '+pair.folioTitle+' · '+pair.minutes+' min overlap')).join('')+'</ul>':
        '<p>No overlaps among the limited timed entries currently shared; not a complete availability check.</p>')+
      '<p>Folio remains the owner. This private comparison is discarded when its summary is cleared.</p></div>';
    folioBody='<p class="ws-source-today-stat">'+s.pendingCount+' Folio tasks due/planned'+
      (s.overdueCount?' · '+s.overdueCount+' overdue':'')+'</p>'+
      (preview.length?'<ul>'+preview.join('')+'</ul>':info('No currently shared Folio plans or events.'))+
      comparisonMarkup+
      '<p class="ws-source-today-time">One-time Folio snapshot · '+esc(stamp(s.generatedAt))+'</p>'+
      button('connect-folio','Refresh Folio')+button('disconnect-folio','Clear');
  } else {
    folioBody=info(folio.status==='awaiting'?'Confirm the one-time share in Folio.':
      'Not connected')+
      button('connect-folio',folio.status==='awaiting'?'Reopen Folio':'Share from Folio');
  }
  let notesBody='';
  if(notes.snapshot){
    const s=notes.snapshot;
    const all=[
      ...s.reminders.slice(0,3).map(x=>tile(x.title,'Reminder · '+shortDate(x.dueAt)+' '+stamp(x.dueAt))),
      ...s.notes.slice(0,3).map(x=>tile(x.title,'Note last edited '+shortDate(x.updatedAt))),
    ];
    notesBody='<p class="ws-source-today-stat">'+s.activeCount+' active Notes items · '+s.reminders.length+
      ' shared reminders</p>'+(all.length?'<ul>'+all.join('')+'</ul>':info('No active Notes titles or reminders shared.'))+
      '<p class="ws-source-today-time">One-time Notes snapshot · '+esc(stamp(s.generatedAt))+'</p>'+
      button('connect-notes-source','Refresh Notes')+button('clear-notes-source','Clear');
  } else {
    notesBody=info(notes.status==='awaiting'?'Confirm the one-time share inside unlocked Notes.':
      'Not connected')+
      button('connect-notes-source',notes.status==='awaiting'?'Reopen Notes':'Share from Notes');
  }
  const languageRows=languages.status==='signed-out'?info('Connect Account to view progress.'):
    HUB_LANGUAGE_IDS.map(id=>{
      const item=languages.cards.find(x=>x.appId===id),app=apps.find(x=>x.id===id);
      const title=item?.name??id[0]!.toUpperCase()+id.slice(1);
      const original=app?.url??HUB_LANGUAGE_OWNER_ROUTES[id];
      const link=original?ownerLanguageLink(original,item?.action.route):null;
      const verified=!!item&&languages.status!=='loading';
      const desc=verified?item.due+' due · '+item.todayEvents+' study events · '+
        (item.stale||languages.status==='unavailable'?'source snapshot outdated':item.streakDays+'-day source streak'):
        languages.status==='loading'?'Checking owner progress':'No authorized published summary';
      return '<li><div><strong>'+esc(title)+'</strong><small>'+esc(desc)+'</small></div>'+
        (link?'<a href="'+esc(link)+'" rel="noreferrer">Open app</a>':'')+'</li>';
    }).join('');
  const timezone=sources.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone;
  const day=sources.day??dayKey(timezone,new Date());
  const queue=buildSourceQueue({day,timezone,folio,notes,languages});
  const items=queue.rows.map(row=>'<li class="ws-source-queue-item" data-source-kind="'+esc(row.source.toLowerCase())+'">'+
    '<div><strong>'+esc(row.title)+'</strong><small>'+esc(row.source)+' · '+esc(row.detail)+'</small></div>'+
    '<a href="'+esc(row.href)+'" rel="noreferrer">Open '+esc(row.source)+'</a></li>').join('');
  const queueHtml='<section class="ws-source-queue" aria-labelledby="ws-source-queue-heading" data-source-queue>'+
    '<header><div><h3 id="ws-source-queue-heading">Next actions</h3></div>'+
    '<small>'+queue.connectedSources+' of 3 sources available</small></header>'+
    (items?'<ul>'+items+'</ul>':info(queue.connectedSources?
      'No due items in the currently shared summaries. Disconnected apps and unshared records are not checked.':
      'No owner summaries are available. Share from Folio or Notes, or sign in to access published language reviews.'))+
    (queue.available>queue.rows.length?'<p>'+esc(String(queue.available-queue.rows.length))+
      ' more source items · open the original apps to review the full workload.</p>':'')+
    '<p class="ws-source-queue-coverage">'+(queue.incomplete?
      'Partial coverage · disconnected, stale, or truncated owners may have additional work.':
      'Only authorized published or explicitly shared owner summaries are included.')+
      ' Actions open the original app; no Hub task, reminder or study result is created.</p></section>';
  return '<section class="ws-source-today" data-source-today aria-labelledby="source-today-heading">'+
    '<header><h2 id="source-today-heading">Continue across your apps</h2>'+
    '</header>'+queueHtml+
    '<div class="ws-source-today-grid">'+
      '<section data-source-today-folio aria-label="Folio owner"><h3>Folio plans</h3><a href="/folio/">Go to Folio</a>'+
      folioBody+'</section>'+
      '<section data-source-today-notes aria-label="Notes owner"><h3>Notes and reminders</h3><a href="/notes/">Go to Notes</a>'+
      notesBody+'</section>'+
      '<section data-source-today-languages aria-label="Language owners"><h3>Language learning</h3>'+
      (languages.status==='signed-out'?languageRows:'<ul>'+languageRows+'</ul>')+
      '</section></div></section>';
}
