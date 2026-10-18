import {describe,it,expect} from 'vitest';
import {initialState,parseState} from '../../src/lib/workspace/model';
import {saveOutcome} from '../../src/lib/workspace/outcome-board';
import {saveDecision} from '../../src/lib/workspace/decision-register';
import {confirmedHubBacklinks,renderConfirmedHubBacklinks} from '../../src/lib/workspace/confirmed-hub-backlinks';
function original(){
 const s=initialState([],null);
 s.tasks.push({id:'task-a',title:'Read <sources>',notes:'private task details',due:'',time:'',priority:'high',completedAt:null});
 s.notes.push({id:'note-a',title:'Draft & research',body:'confidential text',updatedAt:'2026-10-18T12:00:00Z'});
 s.trackers.push({id:'tracker-a',title:'Learning',kind:'count',unit:'problems',goal:3,cadence:'daily'});
 return s;
}
describe('original Hub record backlinks',()=>{
 it('projects confirmed source-ID outcomes and decisions, not inferred topic matches',()=>{
  const s=original();
  const outcome=saveOutcome(s,null,{title:'Analysis <III>',target:'',taskIds:['task-a'],trackerIds:['tracker-a']},null);
  const decision=saveDecision(s,null,{title:'Choose & focus',context:'private rationale',options:['A','B'],review:'',taskId:'task-a',noteId:'note-a'},null);
  const links=confirmedHubBacklinks(parseState(JSON.stringify(s)),'task','task-a');
  expect(links.map(x=>[x.kind,x.id])).toEqual([['decision',decision],['outcome',outcome]]);
  const html=renderConfirmedHubBacklinks(s,'task','task-a');
  expect(html).toContain('Analysis &lt;III&gt;');expect(html).toContain('Choose &amp; focus');
  expect(html).not.toContain('confidential text');expect(html).not.toContain('private rationale');
  expect(confirmedHubBacklinks(s,'note','note-a').map(x=>x.kind)).toEqual(['decision']);
  expect(confirmedHubBacklinks(s,'tracker','tracker-a').map(x=>x.kind)).toEqual(['outcome']);
 });
 it('does not surface phantom or cross-workspace relationships',()=>{
  const s=original();saveDecision(s,null,{title:'Review',context:'',options:['A','B'],review:'',taskId:'task-a',noteId:''},null);
  expect(confirmedHubBacklinks(s,'task','missing')).toEqual([]);
  expect(renderConfirmedHubBacklinks(s,'note','note-a')).toBe('');
  const w=structuredClone(s.workspaces[0]!);w.id='separate';w.widgets=[];
  s.workspaces.push(w);s.active='separate';
  expect(confirmedHubBacklinks(s,'task','task-a')).toEqual([]);
 });
 it('removing linked grouping updates navigation without touching original source IDs',()=>{
  const s=original();const id=saveOutcome(s,null,{title:'Learn',target:'',taskIds:['task-a'],trackerIds:[]},null);
  expect(confirmedHubBacklinks(s,'task','task-a')[0]?.id).toBe(id);
  const b=s.workspaces[0]!.widgets.find(w=>w.type==='outcome-board')!;
  b.config.outcomes=[];
  expect(confirmedHubBacklinks(s,'task','task-a')).toHaveLength(0);
  expect(s.tasks.map(t=>t.id)).toEqual(['task-a']);
 });
});
