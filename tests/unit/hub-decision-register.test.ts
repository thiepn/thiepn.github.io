import {describe,it,expect} from 'vitest';
import {initialState,parseState} from '../../src/lib/workspace/model';
import {saveDecision,decide,transitionDecision,decisions,renderDecisions,validDecisionConfig,MAX_DECISIONS} from '../../src/lib/workspace/decision-register';
const draft={title:'Research direction',context:'Choose a focus area <script>',options:['Statistics','AI'],
 review:'2026-10-19',taskId:'task-1',noteId:'note-1'};
function fixture(){
 const s=initialState([],null);
 s.tasks.push({id:'task-1',title:'Read papers <focus>',notes:'secret',due:'',time:'',priority:'high',completedAt:null});
 s.notes.push({id:'note-1',title:'Literature & ideas',body:'private',updatedAt:'2026-10-18T12:00:00Z'});
 return s;
}
describe('Hub source-safe decision register',()=>{
 it('creates decisions in existing schema-v1 workspace and escapes content',()=>{
  const s=fixture(),id=saveDecision(s,null,draft,null);
  expect(decisions(parseState(JSON.stringify(s)))[0]).toMatchObject({...draft,id,status:'open'});
  expect(JSON.stringify(s.workspaces[0]!.widgets)).not.toContain('secret');
  expect(renderDecisions(s,'2026-10-20')).toContain('&lt;script&gt;');
  expect(renderDecisions(s,'2026-10-20')).toContain('Review due');
  expect(renderDecisions(s,'2026-10-20')).not.toContain('private');
 });
 it('records explicit option and rationale, and rejects stale or unreviewed choices',()=>{
  const s=fixture(),id=saveDecision(s,null,draft,null),snapshot=JSON.stringify(decisions(s)[0]);
  expect(()=>decide(s,id,snapshot,'Not an option','Because')).toThrow();
  decide(s,id,snapshot,'AI','Better long-term fit');
  expect(decisions(s)[0]).toMatchObject({choice:'AI',reason:'Better long-term fit',status:'decided'});
  expect(()=>decide(s,id,snapshot,'Statistics','Changed')).toThrow('changed');
  expect(()=>saveDecision(s,id,{...draft,options:['Statistics','Economics']},JSON.stringify(decisions(s)[0]))).toThrow();
 });
 it('reopens, archives, restores and removes only decision metadata',()=>{
  const s=fixture(),id=saveDecision(s,null,draft,null),before=JSON.stringify({tasks:s.tasks,notes:s.notes});
  decide(s,id,JSON.stringify(decisions(s)[0]),'AI','Explicit rationale');
  transitionDecision(s,id,JSON.stringify(decisions(s)[0]),'reopen');expect(decisions(s)[0]).toMatchObject({status:'open',choice:''});
  transitionDecision(s,id,JSON.stringify(decisions(s)[0]),'archive');
  expect(decisions(s)[0]?.status).toBe('archived');
  transitionDecision(s,id,JSON.stringify(decisions(s)[0]),'restore');
  expect(decisions(s)[0]?.status).toBe('decided');
  transitionDecision(s,id,JSON.stringify(decisions(s)[0]),'remove');
  expect(decisions(s)).toHaveLength(0);
  expect(JSON.stringify({tasks:s.tasks,notes:s.notes})).toBe(before);
 });
 it('fails closed on malformed, duplicate, unowned references, and max capacity',()=>{
  const s=fixture();
  expect(()=>saveDecision(s,null,{...draft,taskId:'external'},null)).toThrow();
  expect(()=>saveDecision(s,null,{...draft,options:['AI','AI']},null)).toThrow();
  expect(validDecisionConfig([{id:'x',unknown:'owner-secret'}])).toBe(false);
  for(let i=0;i<MAX_DECISIONS;i++)saveDecision(s,null,{...draft,title:'Decision '+i},null);
  expect(()=>saveDecision(s,null,draft,null)).toThrow('full');
 });
 it('shows unavailable source links without copying their former content or contaminating other workspaces',()=>{
  const s=fixture();saveDecision(s,null,draft,null);s.tasks=[];
  expect(renderDecisions(s,'2026-10-20')).toContain('original link(s) unavailable');
  const w=structuredClone(s.workspaces[0]!);w.id='different';w.widgets=[];
  s.workspaces.push(w);s.active='different';expect(decisions(s)).toHaveLength(0);
 });
});
