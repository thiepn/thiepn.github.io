import test from 'node:test';
import assert from 'node:assert/strict';
import {
  safeOrigin, validateManifest, chooseProductionDeployment, checkIdentity, checkCiContract,
  checkJourneys, checkReview, aggregate, outcome, GATES
} from '../scripts/release-readiness-core.mjs';

const SHA='a'.repeat(40), OLD='b'.repeat(40);
const WORKFLOW='.github/workflows/gated-pages-release.yml';
const app={id:'tms60',repo:'thiepn/tms60',productionUrl:'https://tms60.thiepn.dev/',
  hosting:{provider:'cloudflare-pages',project:'tms60'},expectedTitle:'TMS 60',appSelector:'#app-frame',
  ci:[{workflow:WORKFLOW,job:'Test candidate before deployment',step:'Run release-blocking regression suite'}],
  requiredJourneys:['start-review'],journeyEvidence:[],review:null};
const project={name:'tms60',source:{type:'github',config:{owner:'thiepn',repo_name:'tms60'}},
  production_branch:'main',domains:['tms60.pages.dev','tms60.thiepn.dev']};
const deployment=(branch,environment,sha=SHA,date='2026-10-20T00:00:00Z',status='success')=>({
  id:`${branch}-${environment}`,environment,created_on:date,latest_stage:{status},
  deployment_trigger:{metadata:{branch,commit_hash:sha}}
});
const run={id:42,head_sha:SHA,path:WORKFLOW,status:'completed',conclusion:'success',html_url:'https://github.com/thiepn/tms60/actions/runs/42'};
const jobs={42:[{id:7,name:'Test candidate before deployment',conclusion:'success',steps:[{name:'Run release-blocking regression suite',status:'completed',conclusion:'success'}]}]};
const copy=x=>structuredClone(x);

test('candidate manifest allows separate two-app inventory, not legacy app count',()=>{
  const m={schemaVersion:1,apps:[app]};
  assert.equal(validateManifest(m),m);
});
test('duplicate IDs and unsupported repository are rejected',()=>{
  assert.throws(()=>validateManifest({schemaVersion:1,apps:[app,copy(app)]}),/Duplicate/);
  const a=copy(app);a.repo='other/repo';
  assert.throws(()=>validateManifest({schemaVersion:1,apps:[a]}),/unsupported repository/);
});
test('URLs must be bounded, canonical, HTTPS and under approved host',()=>{
  assert.equal(safeOrigin('https://tms60.thiepn.dev/'),'https://tms60.thiepn.dev/');
  for(const u of ['https://attacker.com/','http://tms60.thiepn.dev/','https://user:pass@tms60.thiepn.dev/','https://tms60.thiepn.dev/?x=1','https://tms60.thiepn.dev/subpath','https://tms60.thiepn.dev:8443/'])assert.throws(()=>safeOrigin(u));
});
test('cannot configure fabricated/empty required journey set',()=>{
  const a=copy(app);a.requiredJourneys=[];
  assert.throws(()=>validateManifest({schemaVersion:1,apps:[a]}));
});
test('preview newer than production is never selected',()=>{
  const actual=chooseProductionDeployment([
    deployment('main','production',SHA,'2026-10-20T00:00:00Z'),
    deployment('feature','preview',OLD,'2026-10-25T00:00:00Z')],'main');
  assert.equal(actual.result.state,'PASS');
  assert.equal(actual.result.evidence.sha,SHA);
});
test('production on a different branch blocks historical qualified deployment',()=>{
  const actual=chooseProductionDeployment([
    deployment('main','production',SHA,'2026-10-20T00:00:00Z'),
    deployment('feature','production',OLD,'2026-10-25T00:00:00Z')],'main');
  assert.equal(actual.result.state,'FAIL');
});
test('latest production failing blocks older successful deployment',()=>{
  const actual=chooseProductionDeployment([
    deployment('main','production',SHA,'2026-10-20T00:00:00Z'),
    deployment('main','production',OLD,'2026-10-25T00:00:00Z','failure')],'main');
  assert.equal(actual.result.state,'FAIL');
});
test('missing production or unknown stage cannot pass',()=>{
  assert.equal(chooseProductionDeployment([deployment('x','preview')],'main').result.state,'NOT_TESTED');
  assert.equal(chooseProductionDeployment([deployment('main','production',SHA,'2026-10-25T00:00:00Z','idle')],'main').result.state,'NOT_TESTED');
});
test('missing sha in successful deployment cannot pass',()=>{
  assert.equal(chooseProductionDeployment([deployment('main','production','unknown')],'main').result.state,'NOT_TESTED');
});
test('canonical domain and source repo must match Pages project',()=>{
  assert.equal(checkIdentity(app,project).state,'PASS');
  const hijacked=copy(project);hijacked.source.config.repo_name='another-app';
  assert.equal(checkIdentity(app,hijacked).state,'FAIL');
  const noDomain=copy(project);noDomain.domains=['tms60.pages.dev'];
  assert.equal(checkIdentity(app,noDomain).state,'FAIL');
});
test('no credentials or inaccessible API is NOT_TESTED instead of success',()=>{
  assert.equal(checkIdentity(app,null).state,'NOT_TESTED');
  assert.equal(checkCiContract(app,SHA,null,{}).state,'NOT_TESTED');
});
test('CI success requires exact source SHA, named workflow, job and completed step',()=>{
  assert.equal(checkCiContract(app,SHA,[run],jobs).state,'PASS');
  assert.equal(checkCiContract(app,OLD,[run],jobs).state,'NOT_TESTED');
  assert.equal(checkCiContract(app,SHA,[{...run,path:'.github/workflows/other.yml'}],jobs).state,'NOT_TESTED');
  assert.equal(checkCiContract(app,SHA,[run],{42:[{...jobs[42][0],name:'unrelated'}]}).state,'NOT_TESTED');
  assert.equal(checkCiContract(app,SHA,[run],{42:[{...jobs[42][0],steps:[{...jobs[42][0].steps[0],conclusion:'skipped'}]}]}).state,'NOT_TESTED');
});
test('failed exact-SHA CI blocks but unrelated failed SHA does not',()=>{
  assert.equal(checkCiContract(app,SHA,[{...run,conclusion:'failure'}],{}).state,'FAIL');
  assert.equal(checkCiContract(app,SHA,[{...run,head_sha:OLD,conclusion:'failure'}],{}).state,'NOT_TESTED');
});
test('successful workflow without actual job evidence cannot certify',()=>{
  assert.equal(checkCiContract(app,SHA,[run],{}).state,'NOT_TESTED');
  assert.equal(checkCiContract(app,SHA,[run],{42:[]}).state,'NOT_TESTED');
});
test('no authored CI release contract cannot be treated as pass',()=>{
  assert.equal(checkCiContract({...app,ci:[]},SHA,[],{}).state,'NOT_TESTED');
});
test('journey references must be exact-sha, exact run and passing step',()=>{
  const a=copy(app);a.journeyEvidence=[{id:'start-review',sha:SHA,runUrl:'https://github.com/thiepn/tms60/actions/runs/42',job:'Test candidate before deployment',step:'Run release-blocking regression suite'}];
  assert.equal(checkJourneys(a,SHA,[run],jobs).state,'PASS');
  assert.equal(checkJourneys(a,OLD,[run],jobs).state,'NOT_TESTED');
  assert.equal(checkJourneys(a,SHA,[{...run,conclusion:'failure'}],jobs).state,'NOT_TESTED');
  assert.equal(checkJourneys(a,SHA,[run],{42:[]}).state,'NOT_TESTED');
});
test('journey evidence from another repository is invalid',()=>{
  const a=copy(app);a.journeyEvidence=[{id:'start-review',sha:SHA,runUrl:'https://github.com/thiepn/another-app/actions/runs/42',job:'Test candidate before deployment',step:'Run release-blocking regression suite'}];
  assert.equal(checkJourneys(a,SHA,[run],jobs).state,'NOT_TESTED');
});
test('release approval cannot be borrowed from older SHA',()=>{
  const a=copy(app);a.review={sha:OLD,reviewer:'thiepn',decision:'approve',reviewedAt:'2026-10-24T00:00:00Z',blockers:[]};
  assert.equal(checkReview(a,SHA).state,'NOT_TESTED');
});
test('owner hold or blockers override approval',()=>{
  const a=copy(app);a.review={sha:SHA,reviewer:'thiepn',decision:'approve',reviewedAt:'2026-10-24T00:00:00Z',blockers:['hardware unresolved']};
  assert.equal(checkReview(a,SHA).state,'FAIL');
  a.review.blockers=[];a.review.decision='hold';
  assert.equal(checkReview(a,SHA).state,'FAIL');
  a.review.decision='approve';
  assert.equal(checkReview(a,SHA).state,'PASS');
});
test('aggregation blocks on FAIL, holds on missing, qualifies only complete',()=>{
  const passed=Object.fromEntries(GATES.map(g=>[g,outcome('PASS','verified')]));
  assert.equal(aggregate(app,passed,SHA).decision,'QUALIFIED');
  assert.equal(aggregate(app,{...passed,journeys:outcome('NOT_TESTED','unknown')},SHA).decision,'HOLD');
  assert.equal(aggregate(app,{...passed,ci:outcome('FAIL','failed'),journeys:outcome('NOT_TESTED','missing')},SHA).decision,'BLOCKED');
  assert.throws(()=>aggregate(app,{identity:outcome('PASS','only one')},SHA));
});
