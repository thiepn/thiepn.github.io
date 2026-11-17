import { freshFolioDeviceSnapshot, type FolioDeviceSnapshot } from './folio-device';
import { freshFolioTaskRead, FOLIO_TASK_BUCKETS, type FolioTaskReadSnapshot, type FolioReadStatus, type FolioTaskFilter } from './folio-task-read';
export type FolioDeviceStatus='disconnected'|'awaiting'|'ready'|'unavailable';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const fixedLink=(view:'today'|'planner'|'notes'|'habits')=>'/folio/?view='+view;
export function renderFolioDevice(status:FolioDeviceStatus,snapshot:FolioDeviceSnapshot|null):string{
  const button='<button type="button" class="ws-text-button" data-action="connect-folio">'+
    (status==='ready'?'Refresh from Folio':'Share from Folio')+'</button>';
  const heading='<section class="ws-brief-card ws-brief-folio" data-folio-device><header><h3>Folio planner</h3>'+
    '</header>';
  if(!snapshot)return heading+'<p class="ws-muted" role="status">'+
    (status==='awaiting'?'Confirm sharing in Folio.':
     status==='unavailable'?'No summary received. Check the Folio tab and retry.':
     'Not connected')+'</p>'+button+'</section>';
  const tasks=snapshot.tasks.slice(0,5).map(t=>'<div class="ws-brief-item"><span class="ws-brief-time">'+
    (t.deadline&&t.deadline<snapshot.date?'Overdue':t.plannedToday?'Planned':'Due')+'</span><strong>'+
    esc(t.title)+'</strong></div>').join('');
  const todayEvents=snapshot.events.slice(0,5).map(e=>'<div class="ws-brief-item"><span class="ws-brief-time">'+
    esc(new Date(e.start).toLocaleDateString(undefined,{month:'short',day:'numeric'}))+'</span><strong>'+
    esc(e.title)+'</strong></div>').join('');
  const notes=snapshot.notes.slice(0,3).map(n=>'<div class="ws-brief-item"><strong>'+esc(n.title)+'</strong></div>').join('');
  const habits=snapshot.habits.slice(0,5).map(h=>'<div class="ws-brief-item"><strong>'+esc(h.title)+'</strong><small>'+
    esc(h.status==='skipped'?'Skipped':h.status==='completed'?'Completed':h.value+' / '+h.target)+'</small></div>').join('');
  return heading+'<p class="ws-muted">Shared '+esc(new Date(snapshot.generatedAt).toLocaleTimeString())+
    ' · snapshot</p>'+
    '<div class="ws-folio-summary"><div><h4>'+snapshot.pendingCount+' planned/due tasks'+
    (snapshot.overdueCount?' · '+snapshot.overdueCount+' overdue':'')+'</h4>'+ (tasks||'<p class="ws-muted">No planned or due tasks.</p>')+
    '<a href="'+fixedLink('today')+'">Open Folio Today</a></div>'+
    '<div><h4>Upcoming calendar</h4>'+(todayEvents||'<p class="ws-muted">No upcoming blocks.</p>')+
    '<a href="'+fixedLink('planner')+'">Open Folio Planner</a></div>'+
    '<div><h4>Recent notes</h4>'+(notes||'<p class="ws-muted">No recent notes.</p>')+
    '<a href="'+fixedLink('notes')+'">Open Folio Notes</a></div>'+
    '<div><h4>Habits logged today</h4>'+(habits||'<p class="ws-muted">No active habits.</p>')+
    '<a href="'+fixedLink('habits')+'">Open Folio Habits</a></div></div>'+
    '<div class="ws-brief-actions">'+button+'<button type="button" class="ws-text-button" data-action="disconnect-folio">Clear shared summary</button></div></section>';
}

/** An explicitly shared, read-only Folio preview. Never converts source task IDs
 * into native Hub tasks, exposes a completion toggle, or claims live synchronization. */
export function renderFolioTaskPreview(
  status:FolioDeviceStatus, snapshot:FolioDeviceSnapshot|null, now=Date.now(),
  live?:{status:FolioReadStatus;snapshot:FolioTaskReadSnapshot|null;filter:FolioTaskFilter;
    write?:{enabled:boolean;pending:boolean;message:string;failed:boolean;undoId:string|null}},
):string {
  if(live && live.status!=='disconnected')return renderFolioLiveTaskPreview(live.status,live.snapshot,live.filter,now,live.write);
  const current=freshFolioDeviceSnapshot(snapshot,now)?snapshot:null;
  const state=current?'ready':snapshot?'unavailable':status;
  const heading='<header class="ws-folio-tasks-heading"><div><h2>Folio tasks</h2>'+
    '<p class="ws-muted">Read-only, one-time share from Folio. Hub tasks above are separate.</p></div>'+
    '<a class="ws-text-button" href="/folio/?view=today">Open Folio</a></header>';
  const refresh='<div class="ws-folio-tasks-actions">'+
    '<button type="button" class="ws-button" data-action="connect-folio">'+
    (state==='awaiting'?'Reopen Folio':'Share from Folio')+'</button>'+
    (current?'<button type="button" class="ws-text-button" data-action="disconnect-folio">Clear share</button>':'')+
    '</div>';
  if(!current){
    const message=state==='awaiting'?'Approve the one-time share in the Folio tab.':
      state==='unavailable'?'The Folio share expired or could not be received. Share again to see current tasks.':
      'No Folio tasks shared on this tab. Sharing does not copy tasks into Hub.';
    return '<section class="ws-surface ws-folio-task-preview" data-folio-task-preview aria-label="Read-only Folio tasks">'+
      heading+'<p role="status" class="ws-muted">'+message+'</p>'+refresh+'</section>';
  }
  const rows=current.tasks.map(task=>{
    const details=[
      task.deadline&&task.deadline<current.date?'Overdue':
        task.deadline?'Deadline '+task.deadline:'',
      task.plannedDate?'Planned '+task.plannedDate:task.plannedToday?'Planned today':'',
      task.priority!=='normal'?'Priority: '+task.priority:'',
    ].filter(Boolean).map(esc).join(' · ');
    return '<li class="ws-folio-task-row"><span class="ws-folio-task-mark" aria-hidden="true"></span>'+
      '<div><strong>'+esc(task.title)+'</strong>'+
      (details?'<small>'+details+'</small>':'')+'</div></li>';
  }).join('');
  const missing=Math.max(0,current.pendingCount-current.tasks.length);
  const count='Showing '+current.tasks.length+' of '+current.pendingCount+' planned/due Folio tasks';
  const completeness=missing?'<p class="ws-muted">Only the first '+current.tasks.length+
    ' are in this bounded share. Open Folio to see the remaining '+missing+'.</p>':'';
  return '<section class="ws-surface ws-folio-task-preview" data-folio-task-preview aria-label="Read-only Folio tasks">'+
    heading+'<p role="status" class="ws-muted">'+count+
    (current.overdueCount?' · '+current.overdueCount+' overdue':'')+'</p>'+
    (rows?'<ul class="ws-folio-task-list">'+rows+'</ul>':
      '<p class="ws-muted">No planned or due Folio tasks in this share.</p>')+
    completeness+'<p class="ws-muted">Shared once at '+
    esc(new Date(current.generatedAt).toLocaleTimeString())+
    '. Not a live task list; Folio remains the task and reminder authority.</p>'+
    refresh+'</section>';
}

/** A Folio-owned projection. Buttons below are active only after separate Folio
 * write permission; no native Hub Task or workspace store is involved. */
export function renderFolioLiveTaskPreview(
  status:FolioReadStatus, snapshot:FolioTaskReadSnapshot|null, filter:FolioTaskFilter='today', now=Date.now(),
  write?:{enabled:boolean;pending:boolean;message:string;failed:boolean;undoId:string|null},
):string {
  const fresh=freshFolioTaskRead(snapshot,now)?snapshot:null;
  const current=fresh&&status==='ready'?fresh:null;
  const canWrite=Boolean(write?.enabled&&current&&!write?.pending);
  const heading='<header class="ws-folio-tasks-heading"><div><h2>Folio tasks</h2>'+
    '<p class="ws-muted">Owned by Folio on this device. Hub tasks above remain separate.</p></div>'+
    '<a class="ws-text-button" href="/folio/?view=today">Open Folio</a></header>';
  const actions='<div class="ws-folio-tasks-actions">'+
    '<button type="button" class="ws-button" data-action="folio-read-refresh">Refresh now</button>'+
    '<button type="button" class="ws-text-button" data-action="folio-read-disconnect">Disconnect</button></div>';
  const note='<p class="ws-muted">Same-device tab only. Automatic reads while visible. '+
    (write?.enabled?'Task actions require Folio approval. No cloud sync or direct reminder changes.':
      'No task edits, cloud synchronization or reminder changes until separately authorized.')+'</p>';
  const grant=write?.enabled?'':status==='ready'?
    '<div class="ws-folio-write-gate"><p class="ws-muted">Task actions are disabled until you approve them separately in Folio.</p>'+
    '<button type="button" class="ws-button" data-action="folio-write-request">Enable Folio task actions</button></div>':'';
  const response=write?.message?'<div role="'+(write.failed?'alert':'status')+
    '" class="ws-folio-action-feedback">'+esc(write.message)+
    (write.undoId&&write.enabled?'<button class="ws-text-button" type="button" data-action="folio-action-undo" data-id="'+
      esc(write.undoId)+'">Undo last Folio action</button>':'')+'</div>':'';
  if(!current){
    const message=status==='connecting'?'Connecting to Folio on this device…':
      status==='reading'?'Reading tasks from Folio…':
      status==='paused'?'Task reads are paused while Hub is in the background.':
      'Folio tasks are unavailable or stale. Refresh or reconnect. Older titles are hidden.';
    return '<section class="ws-surface ws-folio-task-preview" data-folio-task-preview data-folio-live aria-label="Folio tasks">'+
      heading+'<p role="status" class="ws-muted">'+message+'</p>'+response+note+actions+'</section>';
  }
  const completed=current.recentCompleted??[];
  const filters:readonly FolioTaskFilter[]=write?.enabled?
    ['today','inbox','upcoming','completed','all']:['today','inbox','upcoming','all'];
  const label:Record<FolioTaskFilter,string>={today:'Today',inbox:'Inbox',upcoming:'Next 7 days',
    later:'Later',completed:'Recently completed',all:'All'};
  const count=(f:FolioTaskFilter)=>f==='completed'?completed.length:
    f==='all'?current.totalCount:current.counts[f];
  const tabs='<div class="ws-task-filter-list ws-folio-filter-list" role="group" aria-label="Folio task filters">'+
    filters.map(key=>'<button type="button" class="ws-task-filter-button'+(filter===key?' active':'')+
      '" aria-pressed="'+(filter===key)+'" data-action="folio-read-filter" data-id="'+key+'">'+
      label[key]+' <strong>'+count(key)+'</strong></button>').join('')+'</div>';
  const rows=filter==='completed'?[]:current.tasks.filter(task=>filter==='all'||task.bucket===filter);
  const total=count(filter);
  const items=filter==='completed'?completed.map(task=>
    '<li class="ws-folio-task-row"><div><strong>'+esc(task.title)+
    '</strong><small>Completed'+(task.completedAt?' · '+esc(new Date(task.completedAt).toLocaleDateString()):'')+'</small></div>'+
    (write?.enabled?'<button class="ws-text-button" type="button" data-action="folio-action-reopen" data-id="'+
      esc(task.id)+'" data-version="'+esc(task.updatedAt)+'"'+(canWrite?'':' disabled')+'>Reopen</button>':'')+
    '</li>').join(''):rows.map(task=>{
    const details=[
      task.bucket==='today'?'Today':task.bucket==='inbox'?'Inbox':task.bucket==='upcoming'?'Upcoming':'Later',
      task.deadline?'Deadline '+task.deadline:'',
      task.plannedDate?'Planned '+task.plannedDate:'',
      task.priority!=='normal'?'Priority: '+task.priority:'',
    ].filter(Boolean).map(esc).join(' · ');
    const controls=write?.enabled?
      '<div class="ws-folio-row-actions"><button class="ws-text-button" type="button" data-action="folio-action-complete" data-id="'+
      esc(task.id)+'" data-version="'+esc(task.updatedAt)+'"'+(canWrite?'':' disabled')+'>Complete</button>'+
      '<label class="ws-folio-inline-date">Plan for<input type="date" aria-label="Plan '+esc(task.title)+' for" data-folio-plan-id="'+
      esc(task.id)+'" value="'+esc(task.plannedDate??'')+'"'+(canWrite?'':' disabled')+'></label>'+
      '<button class="ws-text-button" type="button" data-action="folio-action-reschedule" data-id="'+
      esc(task.id)+'" data-version="'+esc(task.updatedAt)+'"'+(canWrite?'':' disabled')+'>Set date</button></div>':'';
    return '<li class="ws-folio-task-row"><span class="ws-folio-task-mark" aria-hidden="true"></span>'+
      '<div class="ws-folio-task-copy"><strong>'+esc(task.title)+'</strong><small>'+details+'</small></div>'+
      controls+'</li>';
  }).join('');
  const form=write?.enabled?'<form class="ws-folio-create-form" data-folio-create-form>'+
    '<h3>Create in Folio</h3><div class="ws-folio-create-fields">'+
    '<label>Task title<input name="title" type="text" maxlength="160" required aria-label="Folio task title" autocomplete="off"></label>'+
    '<label>Send to<select name="status" aria-label="Folio task destination"><option value="todo">Planned tasks</option><option value="inbox">Inbox</option></select></label>'+
    '<label>Planned day<input name="plannedDate" type="date" aria-label="Folio planned day" value="'+esc(current.date)+'"></label>'+
    '<label>Priority<select name="priority" aria-label="Folio priority"><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>'+
    '</div><button type="submit" class="ws-button"'+(canWrite?'':' disabled')+'>Create in Folio</button></form>':'';
  return '<section class="ws-surface ws-folio-task-preview" data-folio-task-preview data-folio-live aria-label="Folio tasks">'+
    heading+grant+response+form+tabs+
    '<p role="status" class="ws-muted">Showing '+(filter==='completed'?completed.length:rows.length)+
    ' of '+total+' Folio tasks'+(current.truncated?' · bounded local read':'')+
    ' · updated '+esc(new Date(current.generatedAt).toLocaleTimeString())+'</p>'+
    (items?'<ul class="ws-folio-task-list">'+items+'</ul>':'<p class="ws-muted">No tasks in this view.</p>')+
    (filter!=='completed'&&total>rows.length?'<p class="ws-muted">'+(total-rows.length)+
      ' more in Folio; open the source app for the complete list.</p>':'')+
    note+actions+'</section>';
}
