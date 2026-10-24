import {describe,expect,it} from 'vitest';
import {initialState,parseState} from '../../src/lib/workspace/model';
import {saveOutcome} from '../../src/lib/workspace/outcome-board';
import {saveDecision} from '../../src/lib/workspace/decision-register';
import {
  WEEKLY_REVIEW_STAGES,EMPTY_WEEKLY_REVIEW,REVIEW_DRAFT_LIMITS,weeklyReviewSnapshot,
  weeklyReviewNoteSeed,weeklyReviewField,renderWeeklyReview,
} from '../../src/lib/workspace/weekly-review-journey';
import type {WorkspaceState} from '../../src/lib/workspace/types';
import type {NotesDeviceSummary} from '../../src/lib/workspace/notes-device';
import type {FolioDeviceSnapshot} from '../../src/lib/workspace/folio-device';
const DAY='2026-10-18',NOW=Date.parse('2026-10-18T09:00:00Z');
function fixture():WorkspaceState{
 const s=initialState([],null);s.preferences.timezone='Europe/Berlin';
 s.tasks.push({id:'inbox-task',title:'Prepare <thesis>',notes:'SECRET TASK BODY',due:'',
  time:'',priority:'high',completedAt:null},{id:'late-task',title:'Late & important',
  notes:'',due:'2026-10-16',time:'',priority:'medium',completedAt:null},
  {id:'due-task',title:'University assignment',notes:'',due:'2026-10-20',
  time:'',priority:'high',completedAt:null},
  {id:'completed',title:'Finished',notes:'',due:'2026-10-20',time:'',priority:'low',
  completedAt:'2026-10-17T11:00:00Z'});
 s.events.push({id:'event-1',title:'Research seminar',date:'2026-10-19',
  endDate:'2026-10-19',zone:'Europe/Berlin',allDay:false,
  start:'2026-10-19T08:00:00Z',end:'2026-10-19T09:00:00Z'});
 s.notes.push({id:'note-1',title:'Study <ideas>',body:'SECRET NOTE BODY',
  updatedAt:'2026-10-17T10:00:00Z'});
 s.trackers.push({id:'tracker-1',title:'Practice',kind:'count',unit:'sessions',
  goal:5,cadence:'weekly'});
 s.logs.push({id:'log-1',trackerId:'tracker-1',date:'2026-10-17',value:3,note:'PRIVATE'});
 saveOutcome(s,null,{title:'Finish coursework',target:'2026-10-30',
  taskIds:['due-task'],trackerIds:['tracker-1']},null);
 saveDecision(s,null,{title:'Choose thesis direction',context:'PRIVATE CONTEXT',
  options:['Math','Statistics'],review:'2026-10-18',
  taskId:'inbox-task',noteId:'note-1'},null);
 return s;
}
function notes():NotesDeviceSummary{return {
 schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',
 generatedAt:new Date(NOW).toISOString(),activeCount:1,notes:[],
 reminders:[{id:'outside-owner',noteId:'other',title:'Private owner reminder',
   dueAt:'2026-10-20T11:00:00Z'}]
};}
function folio():FolioDeviceSnapshot{return {
 schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
 generatedAt:new Date(NOW).toISOString(),date:DAY,pendingCount:0,overdueCount:0,
 tasks:[],events:[],notes:[],habits:[]
};}
describe('native guided Hub weekly review over original records',()=>{
 it('reports a bounded rolling seven-day window and original owner counts without mutation',()=>{
  const state=fixture(),before=JSON.stringify(state);
  const p=weeklyReviewSnapshot(state,DAY);
  expect(p).toMatchObject({start:DAY,end:'2026-10-24',inbox:1,overdue:1,
   due:1,eventCount:1,trackers:1,outcomes:1,unfinishedOutcomeTasks:1,
   decisionOpen:1,decisionDue:1,recentNotes:1});
  expect(JSON.stringify(state)).toBe(before);
  expect(parseState(JSON.stringify(state)).workspaces[0]?.widgets.length).toBeGreaterThan(0);
 });
 it('provides real editable task actions and no automatic completion on triage',()=>{
  const s=fixture(),before=JSON.stringify(s.tasks);
  const html=renderWeeklyReview(s,DAY,'triage');
  expect(html).toContain('data-weekly-review');
  expect(html).toContain('data-action="unified-triage" data-id="inbox-task"');
  expect(html).toContain('data-action="context-task" data-id="inbox-task"');
  expect(html).toContain('Late &amp; important');
  expect(html).toContain('Prepare &lt;thesis&gt;');
  expect(html).not.toContain('SECRET TASK BODY');
  expect(html).not.toContain('data-task-toggle="completed"');
  expect(JSON.stringify(s.tasks)).toBe(before);
 });
 it('renders seven local days and only explicitly shared bounded source coverage',()=>{
  const s=fixture();
  const html=renderWeeklyReview(s,DAY,'calendar',EMPTY_WEEKLY_REVIEW,folio(),notes(),NOW);
  expect(html).toContain('2026-10-24');
  expect(html).toContain('data-action="review-event-time" data-id="event-1"');
  expect(html).toContain('1 of 1 shared reminders inside this week');
  expect(html).toContain('One-time planning share approved');
  expect(html).not.toContain('Private owner reminder');
  expect(html).not.toContain('outside-owner');
  const expired=renderWeeklyReview(s,DAY,'calendar',EMPTY_WEEKLY_REVIEW,
   folio(),notes(),NOW+20*60_000);
  expect(expired).toContain('Not shared or expired');
  expect(expired).toContain('No current approved reminder share');
 });
 it('shows actual tracker logs and outcome/decision actions, never copies bodies',()=>{
  const s=fixture(),before=JSON.stringify(s);
  const routines=renderWeeklyReview(s,DAY,'routines');
  expect(routines).toContain('3 / 5 sessions');
  expect(routines).toContain('Finish coursework');
  expect(routines).toContain('data-action="log-tracker" data-id="tracker-1"');
  expect(routines).toContain('data-action="context-task" data-id="due-task"');
  const review=renderWeeklyReview(s,DAY,'decisions');
  expect(review).toContain('Choose thesis direction');
  expect(review).toContain('Consider options');
  expect(review).toContain('Study &lt;ideas&gt;');
  expect(review).toContain('data-action="context-note" data-id="note-1"');
  expect(review).not.toContain('PRIVATE CONTEXT');
  expect(review).not.toContain('SECRET NOTE BODY');
  expect(JSON.stringify(s)).toBe(before);
 });
 it('makes the review note an editable seed, never a saved completion or inferred provider result',()=>{
  const s=fixture(),before=JSON.stringify(s),draft={
   reflection:'Better understanding of analysis & algebra',
   priority:'Practice <series> exercises'
  };
  const content=renderWeeklyReview(s,DAY,'finish',draft);
  expect(content).toContain('data-weekly-review-field="reflection"');
  expect(content).toContain('Practice &lt;series&gt; exercises');
  expect(content).toContain('data-action="weekly-review-note"');
  expect(content).not.toContain('Practice <series>');
  const seed=weeklyReviewNoteSeed(s,DAY,draft);
  expect(seed.title).toBe('Weekly review · 2026-10-18 – 2026-10-24');
  expect(seed.body).toContain('Practice <series> exercises');
  expect(seed.body).toContain('No actions are automatically completed.');
  expect(seed.body).not.toContain('SECRET TASK BODY');
  expect(seed.body).not.toContain('PRIVATE CONTEXT');
  expect(JSON.stringify(s)).toBe(before);
 });
 it('guards bounded unsaved review inputs and preserves navigation without a second store',()=>{
  expect(WEEKLY_REVIEW_STAGES).toEqual(['triage','calendar','routines','decisions','finish']);
  const reflection=weeklyReviewField(EMPTY_WEEKLY_REVIEW,'reflection','R'.repeat(1300));
  expect(reflection.reflection).toHaveLength(REVIEW_DRAFT_LIMITS.reflection);
  const result=weeklyReviewField(reflection,'priority','P'.repeat(1000));
  expect(result.priority).toHaveLength(REVIEW_DRAFT_LIMITS.priority);
  expect(EMPTY_WEEKLY_REVIEW.priority).toBe('');
  expect(()=>weeklyReviewField(reflection,'ownerToken','bad')).toThrow('Unknown');
  const html=renderWeeklyReview(fixture(),DAY,'finish');
  expect(html).toContain('data-action="weekly-review-stage" data-id="triage"');
  expect(html).toContain('aria-current="step"');
  expect(html).not.toContain('data-action="finish-completed"');
 });
});
