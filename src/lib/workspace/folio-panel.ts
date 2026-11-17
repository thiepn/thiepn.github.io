import { freshFolioDeviceSnapshot, type FolioDeviceSnapshot } from './folio-device';
import { freshFolioTaskRead, FOLIO_TASK_BUCKETS, type FolioTaskReadSnapshot, type FolioReadStatus, type FolioTaskFilter } from './folio-task-read';
import {DEFAULT_FOLIO_TASK_VIEW,selectFolioTaskView,type FolioTaskView} from './folio-task-ux';
import type {FolioTaskQueryResult} from './folio-task-query';
import type {FolioReadTask} from './folio-task-read';
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
    write?:{enabled:boolean;pending:boolean;message:string;failed:boolean;undoId:string|null};
    view?:FolioTaskView;
    paging?:{active:boolean;loading:boolean;error:boolean;result:FolioTaskQueryResult|null}},
):string {
  if(live && live.status!=='disconnected')return renderFolioLiveTaskPreview(live.status,live.snapshot,live.filter,now,live.write,live.view,live.paging);
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
  view:FolioTaskView=DEFAULT_FOLIO_TASK_VIEW,
  paging?:{active:boolean;loading:boolean;error:boolean;result:FolioTaskQueryResult|null},
):string {
  const fresh=freshFolioTaskRead(snapshot,now)?snapshot:null;
  const current=fresh&&status==='ready'?fresh:null;
  const canWrite=Boolean(write?.enabled&&current&&!write?.pending);
  const heading='<header class="ws-folio-tasks-heading"><div><h2>Folio tasks</h2>'+
    '<p class="ws-muted">Folio owns these tasks. Hub tasks above remain separate.</p></div>'+
    '<a class="ws-text-button" href="/folio/?view=today">Open Folio</a></header>';
  const actions='<div class="ws-folio-tasks-actions">'+
    '<button type="button" class="ws-button" data-action="folio-read-refresh">Refresh now</button>'+
    '<button type="button" class="ws-text-button" data-action="folio-read-disconnect">Disconnect</button></div>';
  const note='<p class="ws-muted">Same-device tab only · refreshed while visible · '+
    (write?.enabled?'Folio-authorized task actions. No cloud sync or reminder changes.':
      'Read-only until Folio separately authorizes task actions.')+'</p>';
  const grant=write?.enabled?'':status==='ready'?
    '<div class="ws-folio-write-gate"><p class="ws-muted">Editing requires separate Folio consent.</p>'+
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
  const options=(rows:readonly {id:string;name:string}[]|undefined,chosen='')=>
    (rows??[]).map(x=>'<option value="'+esc(x.id)+'"'+(chosen===x.id?' selected':'')+'>'+esc(x.name)+'</option>').join('');
  const sourcePage=paging?.active&&paging.result ? paging.result : null;
  const completed=sourcePage&&filter==='completed'?
    sourcePage.rows.filter(t=>t.status==='completed'):paging?.active?[]:current.recentCompleted??[];
  const filters:readonly FolioTaskFilter[]=write?.enabled?
    ['today','inbox','upcoming','later','completed','all']:['today','inbox','upcoming','later','all'];
  const label:Record<FolioTaskFilter,string>={today:'Today',inbox:'Inbox',upcoming:'Next 7 days',
    later:'Later',completed:'Recently completed',all:'All'};
  const count=(f:FolioTaskFilter)=>f==='completed'?completed.length:
    f==='all'?current.totalCount:current.counts[f];
  const tabs='<div class="ws-task-filter-list ws-folio-filter-list" role="group" aria-label="Folio task filters">'+
    filters.map(key=>'<button type="button" class="ws-task-filter-button'+(filter===key?' active':'')+
      '" aria-pressed="'+(filter===key)+'" data-action="folio-read-filter" data-id="'+key+'">'+
      label[key]+' <strong>'+count(key)+'</strong></button>').join('')+'</div>';
  const finder=filter==='completed'?'':'<div class="ws-folio-finder">'+
    '<label>Find Folio tasks<input type="search" data-folio-search aria-label="Find Folio tasks"'+
      ' placeholder="Title, project or list" maxlength="100" value="'+esc(view.search)+'" autocomplete="off"></label>'+
    '<label>Project<select data-folio-project aria-label="Filter Folio project">'+
      '<option value="all">All projects</option>'+
      '<option value="none"'+(view.projectId==='none'?' selected':'')+'>No project</option>'+
      options(current.availableProjects,view.projectId)+'</select></label>'+
    '<label>Group<select data-folio-group aria-label="Group Folio tasks">'+
      '<option value="bucket"'+(view.group==='bucket'?' selected':'')+'>By day</option>'+
      '<option value="project"'+(view.group==='project'?' selected':'')+'>By project</option>'+
      '<option value="none"'+(view.group==='none'?' selected':'')+'>No grouping</option></select></label></div>';
  const queryRows:readonly FolioReadTask[]=sourcePage?
    sourcePage.rows.filter(t=>t.status!=='completed') as readonly FolioReadTask[]:
    paging?.active?[]:current.tasks;
  const selection=selectFolioTaskView({...current,tasks:queryRows},filter,view);
  const selectedRows=selection.rows;
  const rowHTML=(task:(typeof current.tasks)[number])=>{
    const details=[
      task.deadline?'Deadline '+task.deadline:'',
      task.plannedDate?'Planned '+task.plannedDate:'',
      task.projectName?'Project: '+task.projectName:'',
      task.listName?'List: '+task.listName:'',
      task.priority!=='normal'?'Priority: '+task.priority:'',
      task.recurring?'Recurring — completion may create another occurrence':'',
      task.hasSubtasks?'Parent task — completing also completes subtasks':'',
    ].filter(Boolean).map(esc).join(' · ');
    const controls=write?.enabled?
      '<div class="ws-folio-row-actions"><button class="ws-text-button" type="button" data-action="folio-action-complete" data-id="'+
      esc(task.id)+'" data-version="'+esc(task.updatedAt)+'"'+(canWrite?'':' disabled')+'>Complete</button>'+
      '<button class="ws-text-button" type="button" data-action="folio-action-today" data-id="'+esc(task.id)+'" data-version="'+esc(task.updatedAt)+'"'+(canWrite?'':' disabled')+'>Today</button>'+
      '<button class="ws-text-button" type="button" data-action="folio-action-tomorrow" data-id="'+esc(task.id)+'" data-version="'+esc(task.updatedAt)+'"'+(canWrite?'':' disabled')+'>Tomorrow</button>'+
      '<label class="ws-folio-inline-date">Plan for<input type="date" aria-label="Plan '+esc(task.title)+' for" data-folio-plan-id="'+
      esc(task.id)+'" value="'+esc(task.plannedDate??'')+'"'+(canWrite?'':' disabled')+'></label>'+
      '<button class="ws-text-button" type="button" data-action="folio-action-reschedule" data-id="'+
      esc(task.id)+'" data-version="'+esc(task.updatedAt)+'"'+(canWrite?'':' disabled')+'>Set date</button></div>':'';
    return '<li class="ws-folio-task-row" data-folio-source-task="'+esc(task.id)+'">'+
      '<span class="ws-folio-task-mark" aria-hidden="true"></span>'+
      '<div class="ws-folio-task-copy"><strong>'+esc(task.title)+'</strong><small>'+details+'</small></div>'+
      controls+'</li>';
  };
  const items=filter==='completed'?completed.map(task=>
    '<li class="ws-folio-task-row"><div><strong>'+esc(task.title)+
    '</strong><small>Completed'+(task.completedAt?' · '+esc(new Date(task.completedAt).toLocaleDateString()):'')+'</small></div>'+
    (write?.enabled?'<button class="ws-text-button" type="button" data-action="folio-action-reopen" data-id="'+
      esc(task.id)+'" data-version="'+esc(task.updatedAt)+'"'+(canWrite?'':' disabled')+'>Reopen</button>':'')+
    '</li>').join(''):selection.sections.map(section=>
    '<section class="ws-folio-task-section" aria-label="'+esc(section.title)+'">'+
    (view.group==='none'?'':'<h3>'+esc(section.title)+' <span>'+section.rows.length+'</span></h3>')+
    '<ul class="ws-folio-task-list">'+section.rows.map(rowHTML).join('')+'</ul></section>'
  ).join('');
  const form=write?.enabled?'<form class="ws-folio-create-form" data-folio-create-form>'+
    '<div class="ws-folio-quick-add"><label>Quick capture to Folio'+
    '<input name="title" type="text" maxlength="160" required aria-label="Folio task title" placeholder="Add a task…" autocomplete="off"></label>'+
    '<button type="submit" class="ws-button"'+(canWrite?'':' disabled')+'>Create in Folio</button>'+
    '<button type="submit" class="ws-text-button" data-folio-submit="inbox"'+(canWrite?'':' disabled')+'>Capture to Inbox</button></div>'+
    '<details class="ws-folio-create-advanced"><summary>Options · date, priority, project and list</summary>'+
    '<div class="ws-folio-create-fields">'+
    '<label>Send to<select name="status" aria-label="Folio task destination"><option value="todo">Planned tasks</option><option value="inbox">Inbox</option></select></label>'+
    '<label>Planned day<input name="plannedDate" type="date" aria-label="Folio planned day" value="'+esc(current.date)+'"></label>'+
    '<label>Priority<select name="priority" aria-label="Folio priority"><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>'+
    '<label>Project<select name="projectId" aria-label="Folio create project"><option value="">None</option>'+
    options(current.availableProjects)+'</select></label>'+
    '<label>List<select name="listId" aria-label="Folio create list"><option value="">None</option>'+
    options(current.availableLists)+'</select></label>'+
    '</div></details>'+
    '<p class="ws-muted ws-folio-shortcut-help">Enter saves · Alt+Shift+N focuses quick capture</p></form>':'';
  const sourceTotal=sourcePage?sourcePage.total:filter==='completed'?completed.length:selection.sourceCount;
  const shown=filter==='completed'?completed.length:selectedRows.length;
  const narrowed=filter!=='completed'&&selection.isNarrowed;
  const totalText=paging?.active?
    sourcePage?'Showing '+(shown?sourcePage.page*40+1:0)+'–'+
      (sourcePage.page*40+shown)+' of '+sourceTotal+' source-matched Folio tasks':
      paging.loading?'Searching all Folio tasks…':
      'Full Folio search unavailable. Retry or open Folio.':
    narrowed?'Showing '+shown+' matching of '+selection.loadedCount+' loaded Folio tasks':
    'Showing '+shown+' of '+sourceTotal+' Folio tasks';
  const completeness=!paging?.active&&filter!=='completed'&&current.truncated?
    '<p class="ws-muted">This preview contains only 160 tasks. Complete source search is available above.</p>':'';
  const pageNavigation=paging?.active?'<nav class="ws-folio-pages" aria-label="Folio source result pages">'+
    '<span>'+ (sourcePage?'Page '+(sourcePage.page+1)+' · '+sourcePage.total+' results':
      paging.loading?'Reading Folio source…':'No verified source page')+'</span>'+
    '<button type="button" class="ws-text-button" data-action="folio-page-previous"'+
       (!sourcePage||sourcePage.page===0?' disabled':'')+'>Previous page</button>'+
    '<button type="button" class="ws-text-button" data-action="folio-page-next"'+
       (!sourcePage||!sourcePage.hasMore?' disabled':'')+'>Next page</button>'+
    (paging.error?'<button type="button" class="ws-button" data-action="folio-page-retry">Retry source search</button>':'')+
    '</nav>':'';
  return '<section class="ws-surface ws-folio-task-preview" data-folio-task-preview data-folio-live aria-label="Folio tasks">'+
    heading+grant+response+form+tabs+finder+
    '<p role="status" class="ws-muted">'+totalText+
    ' · updated '+esc(new Date(current.generatedAt).toLocaleTimeString())+'</p>'+
    (items?filter==='completed'?'<ul class="ws-folio-task-list">'+items+'</ul>':items:
      '<p class="ws-muted">No tasks match this view.</p>')+
    completeness+pageNavigation+
    (current.contextTruncated?'<p class="ws-muted">Only the first 80 active projects and lists are offered for creation. Open Folio for others.</p>':'')+
    note+actions+'</section>';
}
