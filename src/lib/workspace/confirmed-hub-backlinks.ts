/**
 * Reversible navigation from an original Hub task or note to confirmed
 * relationships already saved in the active workspace. No copied source
 * content, inferred keywords, owner data or new metadata store.
 */
import type {WorkspaceState} from './types';
import {outcomes} from './outcome-board';
import {decisions} from './decision-register';

type OriginalKind='task'|'note'|'tracker';
export interface ConfirmedHubBacklink {
  kind:'outcome'|'decision';id:string;title:string;detail:string;
  action:'edit-outcome'|'edit-decision';
}
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,ch=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]!));

export function confirmedHubBacklinks(state:WorkspaceState,kind:OriginalKind,id:string):ConfirmedHubBacklink[]{
 if(!state.workspaces.some(w=>w.id===state.active))return [];
 const exists=kind==='task'?state.tasks.some(x=>x.id===id):
   kind==='note'?state.notes.some(x=>x.id===id):state.trackers.some(x=>x.id===id);
 if(!exists)return [];
 const outcomeMatches=kind==='note'?[]:outcomes(state)
   .filter(o=>(kind==='task'?o.taskIds:o.trackerIds).includes(id))
   .map(o=>({kind:'outcome' as const,id:o.id,title:o.title,
     detail:o.archived?'Archived outcome':o.target?'Outcome · target '+o.target:'Active outcome',
     action:'edit-outcome' as const}));
 const decisionMatches=kind==='tracker'?[]:decisions(state)
   .filter(d=>(kind==='task'?d.taskId:d.noteId)===id)
   .map(d=>({kind:'decision' as const,id:d.id,title:d.title,
     detail:'Decision · '+d.status+(d.review?' · review '+d.review:''),
     action:'edit-decision' as const}));
 return [...outcomeMatches,...decisionMatches]
   .sort((a,b)=>a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
}
export function renderConfirmedHubBacklinks(state:WorkspaceState,kind:OriginalKind,id:string):string{
 const links=confirmedHubBacklinks(state,kind,id);
 if(!links.length)return '';
 return '<section class="ws-confirmed-backlinks" data-confirmed-backlinks aria-label="Confirmed Hub relationships">'+
   '<h4>Confirmed relationships <small>'+links.length+'</small></h4>'+
   ''+
   '<ul>'+links.map(row=>'<li data-related-kind="'+row.kind+'"><span><strong>'+esc(row.title)+
     '</strong><small>'+esc(row.detail)+'</small></span>'+
     '<button type="button" data-action="'+row.action+'" data-id="'+esc(row.id)+'">'+
      (row.kind==='outcome'?'Open outcome':'Open decision')+'</button></li>').join('')+'</ul></section>';
}
