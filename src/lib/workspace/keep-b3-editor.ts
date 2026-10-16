import type {KeepDeviceResult,KeepOwnerNote} from './keep-b3-device';
import {classifyKeepPlanningNote,deriveKeepProjectProgress,keepTasksFromHubNote} from './keep-b3-source';
import {resolveWiki} from './knowledge-spine';
import type {Note} from './types';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const act=(action:string,text:string,id='')=>'<button type="button" class="ws-button" data-action="'+action+'" data-id="'+esc(id)+'">'+esc(text)+'</button>';
export interface KeepOwnerEditor {
  status:KeepDeviceResult | null;
  selectedId:string|null;
  creating:boolean;
  draft:{id:string;revision:string;title:string;content:string;pinned:boolean}|null;
}
export function renderKeepOwnerEditor(view:KeepOwnerEditor):string{
  if(!view.status)return '<div class="ws-keep-owner-empty"><h2>Original KEEP notes</h2>'+
    '<p>The original KEEP B3 uses a separate local database and encrypted-vault lifecycle. Hub does not copy its notes or unlock vaults.</p>'+
    '<p>Connect only if KEEP uses this browser and origin. Permission is for this tab and this Hub identity only.</p>'+
    act('knowledge-keep-connect','Open this device’s original KEEP records')+'</div>';
  if(view.status.status!=='ready')return '<div class="ws-keep-owner-empty"><h2>KEEP unavailable</h2>'+
    '<p>'+esc(view.status.detail)+'</p>'+
    '<p>No records were changed. Locked encrypted vaults must be opened in original KEEP; Hub does not handle KEEP passphrases.</p>'+
    act('knowledge-keep-connect','Recheck local source')+'</div>';
  const notes=view.status.notes,selected=view.creating?null:(notes.find(n=>n.id===view.selectedId)??notes[0]??null);
  const list=notes.map(n=>act('knowledge-keep-open',n.title,n.id)).join('');
  const draft=view.draft?.id===(view.creating?'new':selected?.id)?view.draft:null;
  const title=selected?.title??'',content=selected?.content??'';
  const tags=selected?.tags.join(', ')??'';
  const proxy=(n:KeepOwnerNote):Note=>({id:n.id,title:n.title,body:n.content,updatedAt:n.updatedAt});
  const views=notes.map(proxy),own=selected?proxy(selected):null;
  const planning=own?classifyKeepPlanningNote(own):null;
  const progress=planning==='project'&&own?deriveKeepProjectProgress(own):null;
  const tasks=own?keepTasksFromHubNote(own):[];
  const outgoing=own?resolveWiki(own,views):[];
  const backlinks=own?views.filter(n=>n.id!==own.id&&resolveWiki(n,views).some(l=>l.targetId===own.id)):[];
  const ownLinks=selected?.linkedNoteIds?.filter(id=>notes.some(n=>n.id===id))??[];
  const context='<div class="ws-knowledge-relations">'+
    (planning?'<p class="ws-muted">KEEP original planning type: '+esc(planning)+'</p>':'')+
    (progress?'<p>Source progress: '+(progress.percent===null?'Unconfigured':progress.percent+'%')+
       ' · '+progress.completed+' / '+progress.total+' tasks complete</p>':'')+
    '<h3>Original Markdown tasks</h3><ul>'+ (tasks.map(t=>'<li><span>'+esc(t.text)+'</span>'+
       act('knowledge-keep-task',t.completed?'Mark incomplete':'Complete',t.id)+'</li>').join('')||'<li>No source tasks</li>')+
    '</ul><h3>Outgoing KEEP links</h3><ul>'+
      (outgoing.map(l=>'<li>'+(l.targetId?act('knowledge-keep-open',l.title,l.targetId):'<span>'+esc(l.raw)+' · '+esc(l.status)+'</span>')+'</li>').join('')||'<li>No links</li>')+
    '</ul><h3>Backlinks</h3><ul>'+
      (backlinks.map(n=>'<li>'+act('knowledge-keep-open',n.title,n.id)+'</li>').join('')||'<li>No backlinks</li>')+
    '</ul><p class="ws-muted">Original linkedNoteIds: '+ownLinks.length+' resolved links. Original records were not copied.</p></div>';
  return '<div class="ws-keep-owner" data-keep-owner>'+
    '<section class="ws-surface ws-keep-list"><h2>Original KEEP · '+notes.length+' notes</h2>'+
    '<p class="ws-muted">Original IDs · no Hub record copies · this device only</p>'+
    '<div class="ws-knowledge-list">'+(list||'<p>No editable unlocked notes in this KEEP database.</p>')+'</div>'+
    act('knowledge-keep-new','+ New original KEEP note')+act('knowledge-keep-refresh','Refresh source')+'</section>'+
    '<section class="ws-surface ws-knowledge-editor">'+(selected||view.creating?
      '<header><h2>'+(view.creating?'New KEEP note':esc(title))+'</h2><p class="ws-muted">'+(view.creating?'Original KEEP source note creation':'KEEP note ID '+esc(selected!.id)+' · source record')+'</p></header>'+
      '<form data-keep-owner-form><label>KEEP title<input name="title" required maxlength="1000" value="'+esc(draft?.title??title)+'"></label>'+
      '<div class="ws-keep-markdown-tools" role="toolbar" aria-label="KEEP Markdown formatting">'+
        act('knowledge-keep-format','Bold','bold')+act('knowledge-keep-format','Italic','italic')+
        act('knowledge-keep-format','Heading','heading')+act('knowledge-keep-format','Task','task')+
        act('knowledge-keep-format','Link','link')+act('knowledge-keep-format','Code','code')+'</div>'+
      '<label>KEEP Markdown<input name="kind" type="hidden" value="'+esc(selected?.type??'text')+'">'+
      '<textarea name="content" maxlength="500000">'+esc(draft?.content??content)+'</textarea></label>'+
      '<label><input type="checkbox" name="pinned" '+((draft?.pinned??selected?.pinned??false)?'checked':'')+'> Pinned in KEEP</label>'+
      '<p class="ws-muted">Tags: '+esc(tags)+(selected?.type==='checklist'?' · Original checklist items remain unchanged.':'')+
      (selected?.images.length?' · Original image attachments remain unchanged.':'')+'</p>'+
      '<p class="ws-muted">KEEP vault encryption is not active. Hub changes only title, Markdown body and pinned state with source revision checks.</p>'+
      '<div class="ws-knowledge-controls"><button type="submit" class="ws-primary">'+(view.creating?'Create in original KEEP':'Save to original KEEP')+'</button><span data-keep-dirty class="ws-muted">'+(draft?'Unsaved draft':'')+'</span></div></form>'+context:
      '<p>There are no unencrypted, unlocked KEEP notes available on this device.</p>')+
    '</section></div>';
}
