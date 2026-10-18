/** Native P3 read-only Hub note browser. All note writes use original editNote/mutate. */
import type {WorkspaceState,Note} from './types';
import {noteWorkContext} from './knowledge-work-context';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const btn=(action:string,label:string,id='')=>'<button type="button" class="ws-button" data-action="'+action+'"'+(id?' data-id="'+esc(id)+'"':'')+'>'+esc(label)+'</button>';
export const KNOWLEDGE_PAGE_SIZE=60;
export function projectHubKnowledge(state:WorkspaceState,query:string,selectedId:string|null){
 const search=query.toLocaleLowerCase().trim().slice(0,100);
 const originals=[...state.notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
 const matched=search?originals.filter(n=>(n.title+'\n'+n.body).toLocaleLowerCase().includes(search)):originals;
 const visible=matched.slice(0,KNOWLEDGE_PAGE_SIZE);
 const selected=(selectedId?originals.find(n=>n.id===selectedId):null)??visible[0]??null;
 return {total:originals.length,count:matched.length,notes:visible,selected,truncated:matched.length>visible.length};
}
export function renderHubKnowledgeList(state:WorkspaceState,query:string,selectedId:string|null){
 const data=projectHubKnowledge(state,query,selectedId);
 const rows=data.notes.map(note=>'<li><button type="button" class="ws-knowledge-item" data-action="knowledge-open" data-id="'+esc(note.id)+'" aria-pressed="'+(data.selected?.id===note.id)+'"><strong>'+esc(note.title)+'</strong><small>'+esc(note.updatedAt.slice(0,10))+' · Hub original</small></button></li>').join('');
 return '<p class="ws-knowledge-count" role="status">'+data.count+' of '+data.total+' Hub notes'+(data.truncated?' · first '+data.notes.length+' shown, refine search':'')+'</p>'+
 (rows?'<ul class="ws-knowledge-items">'+rows+'</ul>':'<p class="ws-knowledge-empty">No matching Hub notes. Original records are unchanged.</p>');
}
export function renderHubKnowledgePreview(state:WorkspaceState,note:Note){
 const context=noteWorkContext(state,note,{folio:null,notes:null});
 const links=context.localTasks.map(t=>'<li><span><strong>'+esc(t.title)+'</strong><small>'+(t.due?'Due '+esc(t.due):'Inbox')+' · keyword suggestion, not a saved link</small></span>'+btn('context-task','Open original task',t.id)+'</li>').join('');
 return '<article data-knowledge-original="'+esc(note.id)+'" aria-labelledby="ws-knowledge-preview-title"><header class="ws-knowledge-document-header">'+
 '<p class="ws-knowledge-kicker">HUB / ORIGINAL NOTE</p><h3 id="ws-knowledge-preview-title" tabindex="-1">'+esc(note.title)+'</h3>'+
 '<p>Updated '+esc(note.updatedAt.slice(0,10))+' · '+note.body.length+' characters · original Hub record</p>'+
 '<div class="ws-knowledge-document-actions">'+btn('edit-note','Edit original',note.id)+btn('context-note','Work context',note.id)+'</div></header>'+
 '<div class="ws-knowledge-note-body" aria-label="Full original Hub note text">'+
 (note.body?'<pre>'+esc(note.body)+'</pre>':'<p>No body yet. Open the original editor to continue writing.</p>')+'</div>'+
 '<section class="ws-knowledge-related" aria-label="Suggested Hub work"><h4>Related Hub tasks</h4>'+
 (links?'<ul>'+links+'</ul>':'<p>No matching open Hub tasks. No relationship is inferred or saved.</p>')+'</section></article>';
}
export function renderHubKnowledge(state:WorkspaceState,selectedId:string|null,query:string){
 const data=projectHubKnowledge(state,query,selectedId);
 const content=data.selected?renderHubKnowledgePreview(state,data.selected):
 '<div class="ws-knowledge-blank"><h3>No Hub notes yet</h3><p>Capture a local Hub note. KEEP and Notes remain separate source owners.</p>'+btn('edit-note','Create Hub note')+'</div>';
 return '<section class="ws-knowledge-native" data-hub-knowledge aria-labelledby="ws-knowledge-title">'+
 '<header class="ws-knowledge-header"><div><p class="ws-knowledge-kicker">03 / KNOWLEDGE · HUB ORIGINALS</p><h2 id="ws-knowledge-title">Knowledge</h2>'+
 '<p>Read and continue original Hub notes, without copying them to another store.</p></div>'+btn('edit-note','New Hub note')+'</header>'+
 '<div class="ws-knowledge-layout"><aside class="ws-knowledge-browser" aria-label="Hub note browser">'+
 '<label for="ws-knowledge-query">Find in Hub notes</label><input id="ws-knowledge-query" data-knowledge-query type="search" maxlength="100" autocomplete="off" spellcheck="false" placeholder="Search titles and text" value="'+esc(query)+'"/>'+
 '<div data-knowledge-results>'+renderHubKnowledgeList(state,query,data.selected?.id??null)+'</div></aside>'+
 '<div class="ws-knowledge-document" data-knowledge-document>'+content+'</div></div>'+
 '<footer class="ws-knowledge-footer">Original Hub records and original save/recovery controls only. External Notes, Folio and the locked KEEP vault are not editable here; keyword suggestions are not verified backlinks.</footer></section>';
}
