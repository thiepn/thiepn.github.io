import type { NotesDeviceSummary } from './notes-device';
export type NotesDeviceStatus = 'disconnected' | 'awaiting' | 'ready' | 'unavailable';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
export function renderNotesDevice(status:NotesDeviceStatus,snapshot:NotesDeviceSummary|null):string{
  const action='<button type="button" class="ws-text-button" data-action="connect-notes-source">'+
    (snapshot?'Refresh from Notes':'Share from Notes')+'</button>';
  const header='<section class="ws-brief-card ws-brief-notes-source" data-notes-source>'+
    '<header><h3>Notes app</h3></header>';
  if(!snapshot)return header+'<p class="ws-muted" role="status">'+
    (status==='awaiting'?'Review the sharing request in the unlocked Notes tab.':
     status==='unavailable'?'No summary received. Check the Notes tab and retry.':
     'Not connected')+
    '</p>'+action+'<a class="ws-source-deep-link" href="/notes/">Open Notes</a></section>';
  const notes=snapshot.notes.map(n=>'<div class="ws-brief-item"><strong>'+
    esc(n.title)+'</strong><small>'+esc(n.pinned?'Pinned · ':'')+
    esc(new Date(n.updatedAt).toLocaleDateString())+'</small></div>').join('');
  const reminders=snapshot.reminders.map(r=>'<div class="ws-brief-item"><small class="ws-brief-time">'+
    esc(new Date(r.dueAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}))+
    '</small><strong>'+esc(r.title)+'</strong></div>').join('');
  return header+'<p class="ws-muted">Shared '+esc(new Date(snapshot.generatedAt).toLocaleTimeString())+
    ' · '+snapshot.activeCount+' items · snapshot</p>'+
    '<div class="ws-notes-source-grid"><div><h4>Recently edited</h4>'+
    (notes||'<p class="ws-muted">No active Notes items.</p>')+'</div><div><h4>Active reminders</h4>'+
    (reminders||'<p class="ws-muted">No active reminders.</p>')+'</div></div>'+
    '<div class="ws-brief-actions">'+action+
    '<button type="button" class="ws-text-button" data-action="clear-notes-source">Clear shared Notes</button>'+
    '<a href="/notes/">Continue in Notes</a></div></section>';
}
