import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {verifyCutoverSources,historicalSource,reverseReviewedEdit} from '../../scripts/ci/cutover-source.mjs';
const root=new URL('../../',import.meta.url);
const load=p=>readFileSync(new URL(p,root));
const baseline=JSON.parse(load('config/ci/baseline-v1.json'));
const manifest=JSON.parse(load('config/ci/cutover-routing-v1.json'));
const wf=n=>'.github/workflows/'+n+'.yml';
const legacy=['hub-integration','hub-notes-integration','hub-notes-browser','hub-inbox-browser','hub-capture-browser','hub-tms60-browser','hub-workflows-browser'];
const config=n=>parse(load(wf(n)).toString());
const mutate=(path,fn)=>p=>p===path?Buffer.from(fn(load(p).toString())):load(p);
test('candidate preserves all 27 historical workflow pins and exact legacy private job bodies',()=>{
  const result=verifyCutoverSources(baseline);
  assert.deepEqual(result,{scope:'REVIEWABLE_CUTOVER_CANDIDATE',activationAuthorized:false,legacyManual:7,pr:'FULL_PARALLEL',main:'SEQUENTIAL_QUALITY',targetedOnly:false,originalWorkflows:27});
  for(const name of legacy){
    const old=parse(historicalSource(wf(name)).toString());
    const now=config(name);
    assert.deepEqual(now.on,{workflow_dispatch:null});
    assert.deepEqual(now.jobs,old.jobs);
    assert.equal(Object.keys(now.jobs).length,2);
    const privateJob=Object.entries(now.jobs).find(([id])=>id!=='public-contract')[1];
    assert.equal(privateJob.if,'$'+'{{ false }}');
  }
});
test('full parallel runs on every PR state transition; sequential Quality retains main and recovery dispatch',()=>{
  const sequential=config('quality'),parallel=config('quality-parallel-shadow');
  assert.equal(sequential.name,'Quality');
  assert.deepEqual(sequential.on,{push:{branches:['main']},workflow_dispatch:null});
  assert.deepEqual(sequential.jobs,parse(historicalSource(wf('quality')).toString()).jobs);
  assert.deepEqual(parallel.on.pull_request,{types:['opened','synchronize','reopened','ready_for_review']});
  assert.equal(parallel.on.push,undefined);
  assert.equal(parallel.jobs.browser.strategy.matrix.include.length,4);
  assert.deepEqual(parallel.jobs.qualification.needs,['prepare','browser']);
});
test('consolidated public checks are automatic on main and PR without a private route',()=>{
  const y=config('hub-public-integration-shadow');
  assert.deepEqual(y.on.push,{branches:['main']});
  assert.deepEqual(y.on.pull_request,{types:['opened','synchronize','reopened','ready_for_review']});
  assert.deepEqual(Object.keys(y.jobs),['public-contracts']);
  assert.equal(y.jobs['public-contracts'].if,undefined);
  assert.equal(y.jobs['public-contracts'].uses,undefined);
  assert.deepEqual(y.permissions,{contents:'read'});
  assert.equal(config('ci-fast').name,'CI Fast (shadow)');
});
test('projection rejects unapproved source drift and wrong original digests',()=>{
  const edit=manifest.edits.find(e=>e.path===wf('hub-integration'));
  assert.throws(()=>reverseReviewedEdit(load(edit.path),{...edit,originalBlob:'0'.repeat(40)}),/Original blob mismatch/);
  assert.throws(()=>verifyCutoverSources(baseline,mutate(edit.path,s=>s+'\n# unreviewed change')),/Original blob mismatch/);
  assert.throws(()=>verifyCutoverSources(baseline,mutate(edit.path,s=>s.replace('workflow_dispatch:','pull_request:'))),/reviewed candidate anchor/);
  assert.throws(()=>verifyCutoverSources(baseline,mutate(wf('deploy'),s=>s+'\n# changed')),/Historical workflow drift/);
});
test('reject private activation, changed main trigger, changed parallel coverage or release authorization',()=>{
  assert.throws(()=>verifyCutoverSources(baseline,mutate(wf('hub-integration'),s=>s.replace('$'+'{{ false }}','$'+'{{ true }}'))),/Original blob mismatch/);
  assert.throws(()=>verifyCutoverSources(baseline,mutate(wf('quality'),s=>s.replace('branches: [main]','branches: [feature]'))),/reviewed candidate anchor/);
  assert.throws(()=>verifyCutoverSources(baseline,mutate(wf('quality-parallel-shadow'),s=>s+'\n# changed')),/Parent protection pin drift/);
  assert.throws(()=>verifyCutoverSources(baseline,mutate('scripts/authorize-pages-release.mjs',s=>s+'\n// changed')),/Parent protection pin drift/);
});
