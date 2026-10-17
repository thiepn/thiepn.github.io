/**
 * Session-only Focus working pad. Not a planner, note engine, event, progress
 * tracker or academic assessment. The original task and note writers remain
 * authoritative, and this draft is never persisted or sent to providers.
 */
import type {Task} from './types';

export interface FocusWorkDraft {
  observations:string;
  blocker:string;
  nextStep:string;
}
export const EMPTY_FOCUS_WORK:Readonly<FocusWorkDraft>=Object.freeze({
  observations:'',blocker:'',nextStep:'',
});
export const FOCUS_WORK_LIMITS={observations:1200,blocker:350,nextStep:350} as const;
export type FocusWorkField=keyof FocusWorkDraft;
export function focusWorkInput(
  prior:Readonly<FocusWorkDraft>,field:string,value:string,
):FocusWorkDraft {
  if(field!=='observations'&&field!=='blocker'&&field!=='nextStep')
    throw new Error('Unknown working-pad field.');
  return {...prior,[field]:value.slice(0,FOCUS_WORK_LIMITS[field])};
}
export function hasFocusWork(draft:Readonly<FocusWorkDraft>):boolean {
  return Object.values(draft).some(value=>value.trim().length>0);
}
export function focusWorkNoteSeed(task:Task,draft:Readonly<FocusWorkDraft>):{
  title:string;body:string;
} {
  if(task.completedAt)throw new Error('Reopen the original task before preparing a work note.');
  if(!hasFocusWork(draft))throw new Error('Write a working note, blocker or next step first.');
  const lines=[
    'Source task (Hub local, not a linked record): '+task.title,
    draft.observations.trim()?'Working notes:\n'+draft.observations.trim():'',
    draft.blocker.trim()?'Blocker:\n'+draft.blocker.trim():'',
    draft.nextStep.trim()?'Next action to review:\n'+draft.nextStep.trim():'',
    'Review this note before saving it in the original Hub Notes section.',
  ].filter(Boolean);
  return {title:('Focus work · '+task.title).slice(0,240),
    body:lines.join('\n\n')};
}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]!));
const input=(name:FocusWorkField,label:string,value:string,placeholder:string)=>{
  const max=FOCUS_WORK_LIMITS[name];
  return '<label class="ws-focus-work-field"><span>'+label+'</span>'+
    (name==='observations'?'<textarea rows="4"':'<textarea rows="2"')+
    ' maxlength="'+max+'" data-focus-work-field="'+name+'" aria-label="'+label+
    '" placeholder="'+esc(placeholder)+'">'+esc(value)+'</textarea></label>';
};
export function renderFocusWorkHandoff(
  task:Task|null|undefined,draft:Readonly<FocusWorkDraft>,elapsed:boolean,
):string {
  if(!task)return '<section class="ws-focus-work" data-focus-work><h3>Working session</h3>'+
    '<p>Choose an unfinished Hub task to capture session notes and decide your next action.</p></section>';
  return '<section class="ws-focus-work" data-focus-work data-source-task="'+esc(task.id)+'">'+
    '<header><div><p class="ws-home-eyebrow">Active task · temporary session pad</p>'+
    '<h3>Work, then decide what is next</h3></div>'+
    (elapsed?'<span role="status">Focus timer elapsed · task remains open</span>':'')+'</header>'+
    '<p class="ws-focus-work-help">Record what you learned, what blocked you, and your next step. '+
    'The pad stays only in this tab and is cleared on identity change, privacy lock or closing the tab. '+
    'It is not saved automatically.</p>'+
    '<div class="ws-focus-work-fields">'+
    input('observations','Working notes',draft.observations,'What did you work on?')+
    input('blocker','Blocker / question',draft.blocker,'What needs clarification?')+
    input('nextStep','Next step',draft.nextStep,'What will you do in the next session?')+
    '</div>'+
    '<div class="ws-focus-work-actions">'+
    '<button type="button" data-action="focus-work-note" class="ws-focus-button"'+
      (!hasFocusWork(draft)?' disabled':'')+'>Review as Hub note</button>'+
    '<button type="button" data-action="focus-work-plan" class="ws-focus-button">Review task plan</button>'+
    '<button type="button" data-action="focus-work-knowledge" class="ws-focus-button">Open task context</button>'+
    '<button type="button" data-action="focus-work-clear" class="ws-focus-button"'+
      (!hasFocusWork(draft)?' disabled':'')+'>Discard working pad</button></div>'+
    '<p class="ws-focus-work-provenance">A Hub note is created only after you review and save its original form. '+
    'Review task plan uses the existing conflict-safe writer. No StudyOS score, KEEP vault edit or time log is inferred.</p>'+
    '</section>';
}
