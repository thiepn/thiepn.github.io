import {describe,it,expect} from 'vitest';
import {initialState,parseState} from '../../src/lib/workspace/model';
import {saveOutcome,changeOutcome,outcomes,outcomeProgress,renderOutcomes,validOutcomeConfig} from '../../src/lib/workspace/outcome-board';
const draft={title:'DGL milestone',target:'2026-10-25',taskIds:['a','b'],trackerIds:['h']};
function fixture(){const s=initialState([],null);
 s.tasks.push({id:'a',title:'Review <proof>',notes:'private',due:'',time:'',priority:'high',completedAt:null},
 {id:'b',title:'Problem sheet',notes:'secret',due:'',time:'',priority:'high',completedAt:'2026-10-17T10:00:00Z'});
 s.trackers.push({id:'h',title:'Study rhythm',kind:'count',unit:'sessions',goal:3,cadence:'weekly'});
 s.logs.push({id:'log',trackerId:'h',date:'2026-10-17',value:2,note:'private reflection'});
 return s;}
describe('native original-record outcome board',()=>{
 it('persists in existing v1 workspace and projects current original completion',()=>{
  const s=fixture(),sources=JSON.stringify({tasks:s.tasks,trackers:s.trackers,logs:s.logs});
  const id=saveOutcome(s,null,draft,null);
  expect(outcomes(parseState(JSON.stringify(s)))[0]).toMatchObject({...draft,id});
  expect(outcomeProgress(s,outcomes(s)[0]!,'2026-10-17')).toMatchObject({total:2,done:1,missing:0});
  expect(renderOutcomes(s,'2026-10-26')).toContain('Target passed');
  expect(renderOutcomes(s,'2026-10-17')).toContain('Review &lt;proof&gt;');
  expect(JSON.stringify(s.workspaces[0]!.widgets)).not.toContain('private');
  expect(JSON.stringify({tasks:s.tasks,trackers:s.trackers,logs:s.logs})).toBe(sources);
 });
 it('rejects stale editor, invalid config and nonexistent references',()=>{
  const s=fixture(),id=saveOutcome(s,null,draft,null);
  expect(()=>saveOutcome(s,id,{...draft,title:'changed'},'old')).toThrow('changed');
  expect(()=>saveOutcome(s,null,{...draft,taskIds:['external']},null)).toThrow();
  expect(()=>saveOutcome(s,null,{...draft,taskIds:['a','a']},null)).toThrow();
  expect(validOutcomeConfig([{id:'x',title:'t',target:'',archived:false,taskIds:['a','a'],trackerIds:[]}])).toBe(false);
 });
 it('archives, restores and removes only grouping metadata',()=>{
  const s=fixture(),id=saveOutcome(s,null,draft,null),before=JSON.stringify(s.tasks);
  changeOutcome(s,id,JSON.stringify(outcomes(s)[0]));
  expect(outcomes(s)[0]?.archived).toBe(true);
  changeOutcome(s,id,JSON.stringify(outcomes(s)[0]));
  expect(outcomes(s)[0]?.archived).toBe(false);
  changeOutcome(s,id,JSON.stringify(outcomes(s)[0]),true);
  expect(outcomes(s)).toHaveLength(0);expect(JSON.stringify(s.tasks)).toBe(before);
 });
 it('keeps missing original references explicit, never fabricates tasks',()=>{
  const s=fixture();saveOutcome(s,null,draft,null);s.tasks.splice(0,1);
  expect(outcomeProgress(s,outcomes(s)[0]!,'2026-10-17').missing).toBe(1);
  expect(renderOutcomes(s,'2026-10-17')).toContain('original reference(s) unavailable');
 });
});
