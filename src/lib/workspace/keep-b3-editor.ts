import type {KeepDeviceResult,KeepOwnerNote} from './keep-b3-device';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const act=(action:string,text:string,id='')=>'<button type="button" class="ws-button" data-action="'+action+'" data-id="'+esc(id)+'">'+esc(text)+'</button>';
export interface KeepOwnerEditor {
  status:KeepDeviceResult | null;
  selectedId:string|null;
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
  const notes=view.status.notes,selected=notes.find(n=>n.id===view.selectedId)??notes[0]??null;
  const list=notes.map(n=>act('knowledge-keep-open',n.title,n.id)).join('');
  const draft=view.draft?.id===selected?.id?view.draft:null;
  const title=selected?.title??'',content=selected?.content??'';
  const tags=selected?.tags.join(', ')??'';
  return '<div class="ws-keep-owner" data-keep-owner>'+
    '<section class="ws-surface ws-keep-list"><h2>Original KEEP · '+notes.length+' notes</h2>'+
    '<p class="ws-muted">Original IDs · no Hub record copies · this device only</p>'+
    '<div class="ws-knowledge-list">'+(list||'<p>No editable unlocked notes in this KEEP database.</p>')+'</div>'+
    act('knowledge-keep-refresh','Refresh source')+'</section>'+
    '<section class="ws-surface ws-knowledge-editor">'+(selected?
      '<header><h2>'+esc(title)+'</h2><p class="ws-muted">KEEP note ID '+esc(selected.id)+' · source record</p></header>'+
      '<form data-keep-owner-form><label>KEEP title<input name="title" required maxlength="1000" value="'+esc(draft?.title??title)+'"></label>'+
      '<div class="ws-keep-markdown-tools" role="toolbar" aria-label="KEEP Markdown formatting">'+
        act('knowledge-keep-format','Bold','bold')+act('knowledge-keep-format','Italic','italic')+
        act('knowledge-keep-format','Heading','heading')+act('knowledge-keep-format','Task','task')+
        act('knowledge-keep-format','Link','link')+act('knowledge-keep-format','Code','code')+'</div>'+
      '<label>KEEP Markdown<input name="kind" type="hidden" value="'+esc(selected.type)+'">'+
      '<textarea name="content" maxlength="500000">'+esc(draft?.content??content)+'</textarea></label>'+
      '<label><input type="checkbox" name="pinned" '+((draft?.pinned??selected.pinned)?'checked':'')+'> Pinned in KEEP</label>'+
      '<p class="ws-muted">Tags: '+esc(tags)+(selected.type==='checklist'?' · Original checklist items remain unchanged.':'')+
      (selected.images.length?' · Original image attachments remain unchanged.':'')+'</p>'+
      '<p class="ws-muted">KEEP vault encryption is not active. Hub changes only title, Markdown body and pinned state with source revision checks.</p>'+
      '<div class="ws-knowledge-controls"><button type="submit" class="ws-primary">Save to original KEEP</button><span data-keep-dirty class="ws-muted">'+(draft?'Unsaved draft':'')+'</span></div></form>':
      '<p>There are no unencrypted, unlocked KEEP notes available on this device.</p>')+
    '</section></div>';
}
