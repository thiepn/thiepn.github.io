/**
 * Contextual work/knowledge handoffs over EXISTING Hub records and short-lived
 * explicitly shared owner titles. No second task/note engine, fuzzy identity
 * linking, provider fetch, indexing, synchronization, or automatically created
 * academic assessment.
 */
import type {WorkspaceState,Task,Note} from './types';
import type {FolioDeviceSnapshot} from './folio-device';
import type {NotesDeviceSummary} from './notes-device';
import {freshFolioPlanningShare} from './folio-continuity';

export interface ContextOwnerInput {
  folio:FolioDeviceSnapshot|null;
  notes:NotesDeviceSummary|null;
  now?:number;
}
export interface ContextLocalNote {id:string;title:string;score:number;}
export interface ContextLocalTask {id:string;title:string;due:string;score:number;}
export interface ContextOwnerRow {
  source:'Folio'|'Notes';title:string;type:string;href:string;score:number;
}
export interface TaskKnowledgeContext {
  localNotes:readonly ContextLocalNote[]; ownerRows:readonly ContextOwnerRow[];
  matchedNotes:boolean; incomplete:boolean;
}
export interface NoteWorkContext {
  localTasks:readonly ContextLocalTask[]; ownerRows:readonly ContextOwnerRow[];
  matchedTasks:boolean; incomplete:boolean;
}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
const COMMON=new Set(['with','that','this','from','your','have','will','into','then','today','task',
  'notes','note','work','about','for','the','and','und','der','die','das','eine','einer',
  'zum','zur','von','mit','dem','den','auf','für','study','learn','review','plan']);
const fold=(v:string)=>v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g,' ').trim();
export function topicTokens(value:string):ReadonlySet<string> {
  return new Set(fold(value).split(/\s+/).filter(v=>v.length>=4 && !COMMON.has(v)).slice(0,35));
}
const relevance=(tokens:ReadonlySet<string>,sample:string)=>{
  if(!tokens.size)return 0;
  const hay=topicTokens(sample);let n=0;
  for(const token of tokens)if(hay.has(token))n++;
  return n;
};
const MAX_LOCAL=4,MAX_OWNER=6;
const safeNotes=(s:NotesDeviceSummary|null,now:number)=>{
  if(!s||s.schema!=='thiepn:notes-hub-local'||s.source!=='notes-local-device')return null;
  const age=now-Date.parse(s.generatedAt);
  return Number.isFinite(age)&&age>=0&&age<=5*60_000?s:null;
};
function sourceRows(tokens:ReadonlySet<string>,src:ContextOwnerInput):ContextOwnerRow[] {
  const now=src.now??Date.now();
  const rows:ContextOwnerRow[]=[];
  const folio=freshFolioPlanningShare(src.folio,now);
  if(folio){
    for(const item of folio.notes.slice(0,5))rows.push({
      source:'Folio',title:item.title,type:'Original Folio note',href:'/folio/?view=notes',
      score:relevance(tokens,item.title),
    });
    for(const item of folio.tasks.slice(0,12))rows.push({
      source:'Folio',title:item.title,type:'Original Folio plan',href:'/folio/?view=today',
      score:relevance(tokens,item.title),
    });
  }
  const notes=safeNotes(src.notes,now);
  if(notes){
    for(const item of notes.notes.slice(0,8))rows.push({
      source:'Notes',title:item.title,type:'Original Notes item',href:'/notes/',
      score:relevance(tokens,item.title),
    });
    for(const item of notes.reminders.slice(0,6))rows.push({
      source:'Notes',title:item.title,type:'Original Notes reminder',href:'/notes/',
      score:relevance(tokens,item.title),
    });
  }
  return rows.filter(row=>row.score>0)
    .sort((a,b)=>b.score-a.score||a.source.localeCompare(b.source)||a.title.localeCompare(b.title))
    .slice(0,MAX_OWNER);
}
/** Suggestions are title/keyword matches, NOT a durable or verified task-note relation. */
export function taskKnowledgeContext(
  state:WorkspaceState,task:Task,source:ContextOwnerInput,
):TaskKnowledgeContext {
  const tokens=topicTokens(task.title+' '+task.notes.slice(0,1000));
  const matched=state.notes.map(item=>({
    id:item.id,title:item.title,score:relevance(tokens,item.title+' '+item.body.slice(0,1000)),
    updatedAt:item.updatedAt,
  })).sort((a,b)=>b.score-a.score||b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
  const matches=matched.filter(item=>item.score>0);
  // If no apparent topic match, offer genuinely recent Hub notes without
  // presenting the unrelated records as academic references.
  const local=matches.length?matches:matched.slice(0,3);
  return {
    localNotes:local.slice(0,MAX_LOCAL).map(({id,title,score})=>({id,title,score})),
    ownerRows:sourceRows(tokens,source),matchedNotes:matches.length>0,
    incomplete:!freshFolioPlanningShare(source.folio,source.now??Date.now())||
      !safeNotes(source.notes,source.now??Date.now()),
  };
}
export function noteWorkContext(
  state:WorkspaceState,note:Note,source:ContextOwnerInput,
):NoteWorkContext {
  const tokens=topicTokens(note.title+' '+note.body.slice(0,1000));
  const rows=state.tasks.filter(task=>!task.completedAt).map(task=>({
    id:task.id,title:task.title,due:task.due,
    score:relevance(tokens,task.title+' '+task.notes.slice(0,1000)),
  })).filter(task=>task.score>0)
    .sort((a,b)=>b.score-a.score||(a.due||'9999-12-31').localeCompare(b.due||'9999-12-31')||
      a.id.localeCompare(b.id)).slice(0,MAX_LOCAL);
  return {localTasks:rows,matchedTasks:rows.length>0,ownerRows:sourceRows(tokens,source),
    incomplete:!freshFolioPlanningShare(source.folio,source.now??Date.now())||
      !safeNotes(source.notes,source.now??Date.now())};
}
const action=(kind:string,id:string,label:string)=>
  '<button type="button" data-action="'+kind+'" data-id="'+esc(id)+'" class="ws-button">'+esc(label)+'</button>';
function owners(rows:readonly ContextOwnerRow[],incomplete:boolean) {
  const groups=(['Folio','Notes'] as const).map(owner=>{
    const items=rows.filter(row=>row.source===owner);
    if(!items.length)return '';
    return '<section class="ws-knowledge-owner" data-context-owner="'+owner.toLowerCase()+'">'+
      '<h4>'+owner+' · approved source titles</h4><ul>'+
      items.map(item=>'<li><span><strong>'+esc(item.title)+'</strong><small>'+
        esc(item.type)+' · keyword match, not a linked record</small></span>'+
        '<a href="'+esc(item.href)+'" rel="noreferrer">Open '+owner+'</a></li>').join('')+
      '</ul></section>';
  }).join('');
  return '<section class="ws-knowledge-owner-list" data-context-owner-list>'+
    '<h4>Other app matches</h4>'+
    (groups||'<p>No matching approved owner titles in this tab.</p>')+
    '<p>Matches use visible title keywords only. Original Notes and Folio apps keep their IDs, permissions and content.'+
    (incomplete?' Some sources are unshared, expired or only partially covered.':'')+
    '</p></section>';
}
export function renderTaskKnowledgeContext(
  state:WorkspaceState,task:Task,source:ContextOwnerInput,
):string {
  const result=taskKnowledgeContext(state,task,source);
  const notes=result.localNotes.map(item=>'<li><span><strong>'+esc(item.title)+'</strong>'+
    '<small>'+(item.score?'Matching local Hub note':'Recently edited Hub note · not a topic match')+
    '</small></span>'+action('edit-note',item.id,'Continue note')+'</li>').join('');
  return '<div class="ws-knowledge-context" data-task-knowledge-context>'+
    '<section><header><h4>Related local notes</h4></header>'+
    (notes?'<ul>'+notes+'</ul>':
      '<p>No Hub notes yet. Draft a note from the original task to begin.</p>')+
    '</section>'+owners(result.ownerRows,result.incomplete)+
    '</div>';
}
export function renderNoteWorkContext(
  state:WorkspaceState,note:Note,source:ContextOwnerInput,
):string {
  const result=noteWorkContext(state,note,source);
  const tasks=result.localTasks.map(item=>'<li><span><strong>'+esc(item.title)+'</strong>'+
    '<small>Original Hub task'+(item.due?' · due '+esc(item.due):' · Inbox')+
    ' · keyword match only</small></span>'+action('context-task',item.id,'Next actions')+'</li>').join('');
  return '<div class="ws-knowledge-context" data-note-work-context>'+
    '<section><header><h4>Related unfinished tasks</h4></header>'+
    (tasks?'<ul>'+tasks+'</ul>':
      '<p>No matching Hub task. You can draft a new one from this note after reviewing its content.</p>')+
    '</section>'+owners(result.ownerRows,result.incomplete)+
    '</div>';
}
