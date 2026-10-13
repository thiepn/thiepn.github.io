import { buildHomeSummary } from './home-summary';
import { taskCounts } from './task-flow';
import type { WorkspaceState, EditDraft, Task, Note } from './types';

export interface ReturnContext {
  today: string;
  storageReady: boolean;
  dirty: boolean;
  conflict: boolean;
  offline: boolean;
  editing: boolean;
  recoveryDraft: EditDraft | null;
  account: boolean;
}
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[character]!);
const button=(action:string,label:string,id?:string)=>`<button type="button" data-action="${esc(action)}"${id?` data-id="${esc(id)}"`:''} class="ws-return-action">${esc(label)}</button>`;
const dayLabel=(day:string)=>new Date(day+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',month:'short',day:'numeric'});
const validInstant=(iso:string)=>Number.isFinite(Date.parse(iso));
const localTime=(iso:string)=>validInstant(iso)?new Date(iso).toLocaleString():'Unknown time';

function latestOpenTask(tasks:readonly Task[],today:string):Task|undefined {
  return [...tasks].filter(t=>!t.completedAt).sort((a,b)=>{
    const rank=(t:Task)=>!t.due?3:t.due<today?0:t.due===today?1:2;
    const priority={high:0,medium:1,low:2,none:3} as const;
    return rank(a)-rank(b)||priority[a.priority]-priority[b.priority]||
      (a.due||'9999-12-31').localeCompare(b.due||'9999-12-31')||a.title.localeCompare(b.title);
  })[0];
}
function latestNote(notes:readonly Note[]):Note|undefined {
  return [...notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
}
/**
 * Return journey is only a projection of original Hub records and existing draft data.
 * Does not persist an activity cursor, create progress, or infer an owner-app continuation.
 */
export function renderReturnJourney(state:WorkspaceState, context:ReturnContext):string {
  const counts=taskCounts(state.tasks,context.today);
  const summary=buildHomeSummary(state,context.today);
  const task=latestOpenTask(state.tasks,context.today);
  const note=latestNote(state.notes);
  const last=state.activity.find(a=>validInstant(a.at));
  const savedDraft=state.captureDraft.trim().length>0;
  const recover=context.recoveryDraft;
  const workspace=state.workspaces.find(w=>w.id===state.active);
  const diverged=!!recover && state.workspaces.find(w=>w.id===recover.workspaceId)?.revision!==recover.baseRevision;
  const blocked=context.dirty||context.conflict||!context.storageReady;
  const surface = blocked?'attention':savedDraft||recover||context.editing?'resume':'ready';
  return `<section class="ws-return" data-return-status="${surface}" aria-labelledby="ws-return-title">
    <header class="ws-return-heading">
      <div><p class="ws-home-eyebrow">Return to Hub · this browser</p>
        <h2 id="ws-return-title">${blocked?'Review this session before leaving':savedDraft||recover?'You have something to continue':'Continue where you left off'}</h2>
        <p>${last?'Last recorded Hub action: '+esc(last.title)+' · '+esc(localTime(last.at)): 'No saved activity yet. Your tasks, notes and calendar stay on this device.'}</p>
      </div>
      <div class="ws-return-source"><span>${context.account?'Account-scoped local workspace':'Guest workspace · this device'}</span><small>${context.offline?'Offline · no external sources checked':'Hub records only · no owner-app data fetched'}</small></div>
    </header>
    <div class="ws-return-stats" aria-label="Current Hub tasks">
      <a href="/home/tasks/?filter=today"><strong>${counts.today}</strong><span>Due + overdue</span></a>
      <a href="/home/tasks/?filter=inbox"><strong>${counts.inbox}</strong><span>Task inbox</span></a>
      <a href="/home/calendar/"><strong>${summary.upcomingEvents.length}</strong><span>Upcoming local events shown</span></a>
    </div>
    <div class="ws-return-rows">
      ${savedDraft?`<section class="ws-return-row"><div><strong>Unfinished Hub capture</strong><p>${state.captureDraft.length} characters saved in the original capture field · not sent to Notes</p></div><div>${button('capture','Resume draft')}${button('save-capture-draft','Save now')}</div></section>`:''}
      ${recover?`<section class="ws-return-row"><div><strong>Interrupted layout edit</strong><p>Workspace: ${esc(state.workspaces.find(w=>w.id===recover.workspaceId)?.title??'Unavailable')} · ${diverged?'Saved layout changed since this draft; review before replacing.':'Draft still belongs to the original saved layout.'}</p></div><div>${!diverged?button('resume-draft','Resume layout'):button('recover-draft-as-new','Save draft as new layout')}${button('review-return','Review recovery')}</div></section>`:''}
      ${context.conflict?`<section class="ws-return-row"><div><strong>Another tab changed your saved workspace</strong><p>Current in-memory edits are not automatically merged into another tab's version.</p></div><div>${button('review-return','Compare saved')}${button('export','Export first')}</div></section>`:''}
      ${!context.storageReady?`<section class="ws-return-row"><div><strong>Local storage is unavailable</strong><p>Changes may exist only in this tab. Back them up before reloading or closing.</p></div><div>${button('export','Download backup')}${button('retry','Retry storage')}</div></section>`:''}
      ${context.dirty&&context.storageReady&&!context.conflict?`<section class="ws-return-row"><div><strong>Local edits not yet confirmed saved</strong><p>Export this session or retry the original storage writer. Do not assume another tab has these changes.</p></div><div>${button('retry','Retry save')}${button('export','Export')}</div></section>`:''}
      ${task?`<section class="ws-return-row"><div><strong>Next actual task</strong><p>${esc(task.title)} · ${task.due?'Due '+esc(dayLabel(task.due)):'No deadline'} · ${esc(task.priority)} priority</p></div><div>${button('edit-task','Open task',task.id)}${button('return-focus','Focus')}</div></section>`:''}
      ${note?`<section class="ws-return-row"><div><strong>Last edited local note</strong><p>${esc(note.title)} · ${esc(localTime(note.updatedAt))}</p></div><div>${button('edit-note','Open note',note.id)}</div></section>`:''}
      ${!savedDraft&&!recover&&!task&&!note?`<section class="ws-return-row"><div><strong>Your local workspace is ready</strong><p>Capture a first thought, add a task, or open your own apps to continue there.</p></div><div>${button('capture','Quick capture')}${button('capture-task','Inbox task')}</div></section>`:''}
    </div>
    <footer class="ws-return-footer">
      <span>Hub: ${esc(workspace?.title??'Local workspace')} · ${context.storageReady?(context.dirty?'unsaved changes':'local storage connected'):'storage not connected'}</span>
      <a href="#ws-owner-continue">Check owner source freshness ↓</a><a href="/home/connections/">Owner-app connections ↗</a>
      <span>External progress is not inferred from app links.</span>
    </footer>
  </section>`;
}

/** Read-only comparison of the original in-memory state and canonical IndexedDB record. */
export function renderSavedComparison(current: WorkspaceState, saved: WorkspaceState|null):string {
  if(!saved) return '<p>No saved workspace record was found for the current identity. Export this tab before any reload.</p>';
  const categories = [
    {name:'Tasks',left:current.tasks,right:saved.tasks},
    {name:'Notes',left:current.notes,right:saved.notes},
    {name:'Calendar events',left:current.events,right:saved.events},
    {name:'Layouts',left:current.workspaces,right:saved.workspaces},
  ];
  const sections = categories.map(category=>{
    const original=new Map(category.right.map(value=>[value.id,JSON.stringify(value)]));
    const left=new Map(category.left.map(value=>[value.id,JSON.stringify(value)]));
    const newRecords=category.left.filter(item=>!original.has(item.id));
    const different=category.left.filter(item=>original.has(item.id)&&original.get(item.id)!==JSON.stringify(item));
    const missing=category.right.filter(item=>!left.has(item.id));
    return `<tr><th scope="row">${esc(category.name)}</th>
      <td>${category.left.length}</td><td>${category.right.length}</td>
      <td>${newRecords.length} new · ${different.length} changed · ${missing.length} only in saved</td></tr>`;
  }).join('');
  return `<p>The comparison reads only the existing account-scoped saved record. It does not apply changes, resolve conflicts or copy external app content.</p>
    <table class="ws-return-diff"><thead><tr><th scope="col">Local source</th><th scope="col">This tab</th><th scope="col">Saved</th><th scope="col">Differences</th></tr></thead><tbody>${sections}</tbody></table>
    <p>Revision: this tab ${current.revision}; saved record ${saved.revision}. A difference is not automatically safe to merge. Export the in-memory copy, then decide whether to reload.</p>`;
}
export function renderRecoveryStrip(state:WorkspaceState,context:ReturnContext,privateView:boolean):string {
  if (!context.dirty && !context.conflict && context.storageReady && !context.recoveryDraft && !context.editing) return '';
  const messages = [
    context.conflict?'A different tab modified this account-scoped workspace. Your current copy is not automatically merged.':null,
    !context.storageReady?'Browser storage is unavailable. This tab may contain the only remaining copy.':null,
    context.dirty?'Unsaved changes exist in this tab. Export before discarding them.':null,
    context.recoveryDraft?'An interrupted layout draft is available for review.':null,
    context.editing?'A layout edit is open. Save or cancel it before switching workspaces.':null,
  ].filter(Boolean);
  return `<aside class="ws-return-strip" aria-label="Workspace recovery">
    <div><strong>${privateView?'Workspace recovery needs attention':'Review your saved workspace'}</strong>
       <p>${privateView?'Show personal content to review details. No private records are displayed here.':esc('Workspace '+(state.workspaces.find(w=>w.id===state.active)?.title??'local')+'. '+messages.join(' '))}</p></div>
    <div>${button('export','Export backup')}${context.conflict?button('review-return','Compare records'):''}${context.storageReady?button('reload','Review reload'):button('retry','Retry storage')}${context.recoveryDraft&&!privateView?button('review-return','Review layout'):''}</div>
  </aside>`;
}
