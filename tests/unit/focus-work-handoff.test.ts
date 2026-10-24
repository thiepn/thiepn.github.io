import {describe,it,expect} from 'vitest';
import {
  EMPTY_FOCUS_WORK,FOCUS_WORK_LIMITS,focusWorkInput,focusWorkNoteSeed,
  hasFocusWork,renderFocusWorkHandoff,
} from '../../src/lib/workspace/focus-work-handoff';
import {renderFocusPanel, type FocusPresentation} from '../../src/lib/workspace/daily-focus';
import {initialState} from '../../src/lib/workspace/model';
import type {Task} from '../../src/lib/workspace/types';

const task=(id='source-task'):Task=>({
 id,title:'Differential Equations <review>',notes:'Original task only',
 due:'2026-10-17',time:'09:00',priority:'high',completedAt:null,
});
const focus:FocusPresentation={
 queue:'due',limit:3,duration:25,quiet:false,selectedId:'source-task',
 remainingMs:300000,running:false,elapsed:true,
};
describe('original Hub Focus working pad and next-action handoff',()=>{
 it('keeps empty pad disabled and exposes working questions only for a selected task',()=>{
  expect(hasFocusWork(EMPTY_FOCUS_WORK)).toBe(false);
  expect(renderFocusWorkHandoff(null,EMPTY_FOCUS_WORK,false)).toContain('Choose an unfinished Hub task');
  const result=renderFocusWorkHandoff(task(),EMPTY_FOCUS_WORK,false);
  expect(result).toContain('data-source-task="source-task"');
  expect(result).toContain('data-action="focus-work-note" class="ws-focus-button" disabled');
  expect(result).toContain('data-focus-work-field="observations"');
  expect(result).toContain('data-focus-work-field="blocker"');
  expect(result).toContain('data-focus-work-field="nextStep"');
 });
 it('updates exactly one input field without changing the prior scratch and enforces limits',()=>{
  const first=focusWorkInput(EMPTY_FOCUS_WORK,'observations','Summary '.repeat(300));
  expect(first.observations).toHaveLength(FOCUS_WORK_LIMITS.observations);
  const second=focusWorkInput(first,'nextStep','Read chapter 2');
  expect(second.observations).toBe(first.observations);
  expect(second.blocker).toBe('');
  expect(EMPTY_FOCUS_WORK.observations).toBe('');
  expect(()=>focusWorkInput(first,'ownerId','fake')).toThrow('Unknown');
 });
 it('requires meaningful scratch, explicit editor review and original local task availability',()=>{
  expect(()=>focusWorkNoteSeed(task(),EMPTY_FOCUS_WORK)).toThrow('Write a working note');
  const draft=focusWorkInput(EMPTY_FOCUS_WORK,'blocker','Which theorem?');
  const result=focusWorkNoteSeed(task(),draft);
  expect(result.title).toContain('Focus work · Differential Equations');
  expect(result.body).toContain('Blocker:\nWhich theorem?');
  expect(result.body).toContain('not a linked record');
  expect(result.body).toContain('Review this note before saving it');
  expect(()=>focusWorkNoteSeed({...task(),completedAt:'2026-10-17T09:00:00Z'},draft)).toThrow('Reopen');
 });
 it('escapes scratch and original task metadata in the focus UI, no external provider fields',()=>{
  const draft={observations:'Proof <script>alert(1)</script>',blocker:'A & B',nextStep:'Retry'};
  const source=task();
  const markup=renderFocusWorkHandoff(source,draft,true);
  expect(markup).toContain('Proof &lt;script&gt;alert(1)&lt;/script&gt;');
  expect(markup).toContain('A &amp; B');
  expect(markup).not.toContain('<script>');
  expect(markup).toContain('Focus timer elapsed · task remains open');
  expect(markup).toContain('data-action="focus-work-note" class="ws-focus-button">');
  expect(markup).not.toContain('data-action="save-progress"');
 });
 it('renders in existing Focus view without changing task completion or recording study time',()=>{
  const state=initialState([],null);
  state.tasks.push(task());
  const original=JSON.stringify(state);
  const draft={observations:'Summarize the proof',blocker:'',nextStep:'Work examples'};
  const view=renderFocusPanel(state,'2026-10-17',focus,draft);
  expect(view).toContain('data-focus-work');
  expect(view).toContain('data-action="focus-work-plan"');
  expect(view).toContain('data-action="focus-work-knowledge"');
  expect(view).toContain('data-task-toggle="source-task"');
  expect(JSON.stringify(state)).toBe(original);
 });
});
