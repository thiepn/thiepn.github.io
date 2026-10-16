import type { Note, Task } from './types';
import { knowledgeDesk } from './knowledge-spine';
import { classifyKeepPlanningNote, deriveKeepProjectProgress, keepTasksFromHubNote } from './keep-b3-source';
import { parseOwnerRef, SOURCE_ADAPTERS } from './keep-b3-owner-refs';
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const act=(action:string,label:string,id='')=>'<button type="button" class="ws-button" data-action="'+action+'" data-id="'+esc(id)+'">'+esc(label)+'</button>';
export interface KnowledgeViewState {
  selectedId:string|null;
  create:boolean;
  query:string;
  draft:{id:string|null;title:string;body:string;revision:string}|null;
}
export function renderKnowledge(notes:readonly Note[],tasks:readonly Task[],view:KnowledgeViewState):string{
  const selected=view.create?null:(notes.find(n=>n.id===view.selectedId)??[...notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]??null);
  const desk=knowledgeDesk(notes,tasks,selected?.id??null,view.query);
  const draft=view.draft?.id===(selected?.id??null)?view.draft:null;
  const projects=notes.filter(n=>classifyKeepPlanningNote(n)==='project');
  const projectList=projects.map(n=>'<li>'+act('knowledge-open',n.title,n.id)+'</li>').join('');
  const classified=selected?classifyKeepPlanningNote(selected):null;
  const progress=selected&&classified==='project'?deriveKeepProjectProgress(selected):null;
  const nativeTasks=selected?keepTasksFromHubNote(selected):[];
  const taskRows=nativeTasks.map(t=>'<li><span>'+esc(t.text)+' '+(t.dueDate?' · due '+esc(t.dueDate):'')+'</span>'+
    act('knowledge-toggle-task',t.completed?'Mark incomplete':'Complete',t.id)+'</li>').join('');
  const ownerRefs=selected?[...new Set((selected.body.match(/thiepn:\/\/[a-z-]+\/[a-z-]+\/[a-z-]+\/[A-Za-z0-9%._~-]+\?v=1/gu)??[]))]
    .map(raw=>parseOwnerRef(raw.replace(/[.,;]+$/u,''))).filter((ref):ref is NonNullable<typeof ref>=>!!ref):[];
  const ownerRows=ownerRefs.map(ref=>'<li><strong>'+esc(SOURCE_ADAPTERS[ref.source].label)+'</strong><span>'+esc(ref.kind)+' · External owner reference, not connected</span></li>').join('');
  const list=desk.matches.map(n=>'<button type="button" class="ws-knowledge-item" data-action="knowledge-open" data-id="'+esc(n.id)+'" aria-current="'+String(n.id===selected?.id&&!view.create)+'"><strong>'+esc(n.title)+'</strong><small>'+esc(n.body.slice(0,100).replace(/\s+/gu,' '))+'</small></button>').join('');
  const outgoing=desk.outgoing.map(l=>'<li>'+(l.status==='resolved'?act('knowledge-open',l.title,l.targetId!):'<span>'+esc(l.title)+' · '+l.status+'</span>')+'</li>').join('');
  const incoming=desk.backlinks.map(n=>'<li>'+act('knowledge-open',n.title,n.id)+'</li>').join('');
  const related=desk.tasks.map(t=>'<li><span>'+esc(t.title)+(t.completedAt?' · completed':'')+'</span>'+act('edit-task','Edit',t.id)+'</li>').join('');
  let detail='<p>Select a note or create one. Hub and KEEP vault records remain separate until migration is authorized.</p>';
  if(view.create||selected){
    detail='<header><h2>'+(view.create?'New Hub note':esc(selected!.title))+'</h2><p class="ws-muted">Original Hub note · explicit save</p></header>'+
      '<form data-knowledge-form><label>Title<input name="title" required maxlength="240" value="'+esc(draft?.title??selected?.title??'')+'"></label>'+
      '<label>Markdown body<textarea name="body" maxlength="10000" spellcheck="true">'+esc(draft?.body??selected?.body??'')+'</textarea></label>'+
      '<p class="ws-muted">Link with [[Note title]] or [[note:original-id]]. Changes are saved only after Save.</p>'+
      '<div class="ws-knowledge-controls"><button type="submit" class="ws-primary">Save note</button>'+
      (view.create?act('knowledge-cancel','Cancel'):act('knowledge-linked-task','Create linked task',selected!.id))+
      '<span data-knowledge-dirty class="ws-muted">'+(draft?'Unsaved draft':'')+'</span></div></form>';
    if(!view.create)detail+='<div class="ws-knowledge-relations">'+
      (classified?'<p class="ws-muted">KEEP B3 planning type: '+esc(classified)+'</p>':'')+
      (progress?'<p class="ws-muted">Project task progress: '+(progress.percent===null?'Not configured':progress.percent+'%')+' · '+progress.completed+' / '+progress.total+' complete'+(progress.nextAction?' · Next: '+esc(progress.nextAction.text):'')+'</p>':'')+
      '<h3>Markdown tasks in this note</h3><ul>'+(taskRows||'<li>No Markdown tasks</li>')+'</ul>'+ 
      '<h3>KEEP owner references</h3><ul>'+(ownerRows||'<li>No source references</li>')+'</ul>';<h3>Outgoing links</h3><ul>'+(outgoing||'<li>No links</li>')+'</ul><h3>Backlinks</h3><ul>'+(incoming||'<li>No backlinks</li>')+'</ul><h3>Linked Hub tasks</h3><ul>'+(related||'<li>No explicitly linked tasks</li>')+'</ul></div>';
  }
  return '<div class="ws-knowledge" data-knowledge><section class="ws-surface" aria-label="Hub knowledge navigation"><header><h2>Knowledge</h2><p class="ws-muted">Native Hub notes · KEEP-style linked navigation · no vault synchronization</p></header>'+
    '<label class="ws-field">Search notes<input data-knowledge-search type="search" maxlength="150" value="'+esc(view.query)+'" placeholder="Title or content"></label>'+
    '<p class="ws-muted">'+desk.matches.length+' of '+notes.length+' Hub notes</p>'+act('knowledge-new','+ New note')+
    '<div class="ws-knowledge-list" data-knowledge-list>'+(list||'<p>No notes match.</p>')+'</div>'+ 
    '<div class="ws-knowledge-projects"><h3>KEEP P49 projects</h3><ul>'+(projectList||'<li>No project notes yet</li>')+'</ul>'+act('knowledge-new-project','+ New project')+'</div></section>'+
    '<section class="ws-surface ws-knowledge-editor" aria-label="Hub knowledge editor">'+detail+'</section></div>';
}
