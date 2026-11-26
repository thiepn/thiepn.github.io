import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectReadiness,proposeRoute} from '../../scripts/ci/cutover-rehearsal.mjs';
const contract=JSON.parse(readFileSync(new URL('../../config/ci/cutover-rehearsal-v1.json',import.meta.url)));
const fixture=()=>contract.runs.map(s=>{
  const p=contract.parent;
  const run={id:s.id,repository:{full_name:contract.repository},head_repository:{full_name:contract.repository},path:'.github/workflows/'+s.path,event:'pull_request',head_sha:p.head,head_branch:p.branch,pull_requests:[{number:p.pr,head:{sha:p.head},base:{sha:p.base}}],status:'completed',conclusion:'success',run_attempt:1};
  const jobs=[...s.jobs,...(s.privateSkipped??[])].map(name=>({name,status:'completed',conclusion:s.privateSkipped?.includes(name)?'skipped':'success',run_id:s.id,run_attempt:1}));
  return {run,jobs:{total_count:jobs.length,jobs}};
});
test('all exact-parent original and shadow jobs must pass before readiness',()=>{
  const r=inspectReadiness(contract,fixture());
  assert.equal(r.allParentRunsPassed,true);
  assert.equal(r.checks.length,11);
  assert.equal(r.activation,false);assert.equal(r.releaseEvidence,false);
});
test('missing, pending, failed or foreign source runs cannot qualify',()=>{
  let e=fixture();e.pop();assert.equal(inspectReadiness(contract,e).checks.at(-1).status,'MISSING');
  e=fixture();e[0].run.status='in_progress';assert.equal(inspectReadiness(contract,e).checks[0].status,'PENDING');
  e=fixture();e[0].run.conclusion='failure';assert.equal(inspectReadiness(contract,e).checks[0].status,'FAILED');
  for(const [key,value] of [['head_sha','a'.repeat(40)],['event','workflow_dispatch'],['head_branch','wrong'],['path','.github/workflows/deploy.yml']]){
    e=fixture();e[0].run[key]=value;assert.equal(inspectReadiness(contract,e).checks[0].status,'IDENTITY_MISMATCH');
  }
  e=fixture();e[0].run.pull_requests[0].base.sha='b'.repeat(40);assert.equal(inspectReadiness(contract,e).checks[0].status,'IDENTITY_MISMATCH');
});
test('incomplete, missing, duplicated and wrong-attempt jobs are rejected',()=>{
  let e=fixture();e[1].jobs.total_count++;assert.equal(inspectReadiness(contract,e).checks[1].status,'INCOMPLETE_JOB_EVIDENCE');
  e=fixture();e[1].jobs.jobs[1].name=e[1].jobs.jobs[0].name;assert.equal(inspectReadiness(contract,e).checks[1].status,'JOB_INVENTORY_MISMATCH');
  e=fixture();e[0].jobs.jobs[0].run_attempt=2;assert.equal(inspectReadiness(contract,e).checks[0].status,'JOB_OUTCOME_MISMATCH');
  e=fixture();e[0].jobs.jobs[0].conclusion='skipped';assert.equal(inspectReadiness(contract,e).checks[0].status,'JOB_OUTCOME_MISMATCH');
  e=fixture();e.push(e[0]);assert.throws(()=>inspectReadiness(contract,e),/Duplicate/);
});
test('original private owner jobs must remain skipped, never claimed as qualified',()=>{
  const e=fixture(),i=contract.runs.findIndex(s=>s.privateSkipped?.length);
  e[i].jobs.jobs.find(j=>j.conclusion==='skipped').conclusion='success';
  assert.equal(inspectReadiness(contract,e).checks[i].status,'JOB_OUTCOME_MISMATCH');
});
test('all rollout phases preserve sequential main Quality and prohibit release evidence',()=>{
  for(const phase of ['shadow','public-consolidation','parallel-pr','fast-draft']){
    const r=proposeRoute({event:'push',ref:'refs/heads/main',phase,narrowProof:true,selection:'TARGETED_SHADOW'});
    assert.equal(r.route,'SEQUENTIAL_FULL');assert.equal(r.fullQualityRequired,true);assert.equal(r.exactMainPushQualityRequired,true);assert.equal(r.releaseEvidence,false);assert.equal(r.activation,false);
  }
});
test('ready PRs always qualify in full and draft fallback is never sentinel-only',()=>{
  for(const phase of ['parallel-pr','fast-draft']){
    assert.equal(proposeRoute({event:'pull_request',draft:false,phase,narrowProof:true,selection:'TARGETED_SHADOW'}).route,'PARALLEL_FULL');
    for(const selection of ['FULL_QUALITY_REQUIRED','UNKNOWN']){
      assert.equal(proposeRoute({event:'pull_request',draft:true,phase,narrowProof:true,selection}).route,'PARALLEL_FULL');
    }
  }
  assert.equal(proposeRoute({event:'pull_request',draft:true,phase:'fast-draft',selection:'TARGETED_SHADOW'}).route,'PARALLEL_FULL');
  assert.equal(proposeRoute({event:'pull_request',draft:true,phase:'fast-draft',selection:'TARGETED_SHADOW',narrowProof:true}).route,'TARGETED_WITH_FULL_ON_READY');
});
test('public consolidation keeps seven logical contracts and independent owner suites',()=>{
  for(const phase of ['public-consolidation','parallel-pr','fast-draft']){
    const r=proposeRoute({event:'pull_request',draft:false,phase});
    assert.equal(r.publicContracts,'CONSOLIDATED_ALL_SEVEN');assert.equal(r.retainIndependentLibrary,true);assert.equal(r.retainIndependentReadingPilot,true);assert.equal(r.privateStatus,'NOT_EXECUTED');
  }
});
test('manual and unsupported events cannot bypass full qualification or authorize activation',()=>{
  const r=proposeRoute({event:'workflow_dispatch',phase:'fast-draft',selection:'TARGETED_SHADOW',narrowProof:true});
  assert.equal(r.route,'SEQUENTIAL_FULL');assert.equal(r.releaseEvidence,false);
  assert.equal(proposeRoute({event:'pull_request_target',phase:'fast-draft'}).route,'UNSUPPORTED');
  assert.throws(()=>proposeRoute({event:'pull_request',phase:'fast-draft'}),/Missing PR draft/);
  assert.throws(()=>proposeRoute({event:'push',ref:'refs/heads/main',phase:'unapproved'}),/Unknown rollout/);
});
