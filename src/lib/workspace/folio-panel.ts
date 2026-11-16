import { freshFolioDeviceSnapshot, type FolioDeviceSnapshot } from './folio-device';
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
):string {
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
