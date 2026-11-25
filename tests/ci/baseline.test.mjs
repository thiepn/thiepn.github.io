import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBaseline,normalizeReport,compareCases,measureJobs,summarizeStudio} from '../../scripts/ci/baseline.mjs';
const b=JSON.parse(readFileSync(new URL('../../config/ci/baseline-v1.json',import.meta.url),'utf8'));
const row={project:'chromium',file:'tests/studio/example.spec.ts',title:'nested › example',status:'passed',durationMs:500};
const skip={...row,project:'webkit',status:'skipped',durationMs:null,skipReason:'Chromium only'};
function jsonReport({project='chromium',outcome='expected',status='passed',expectedStatus='passed',annotations=[],results=[{status,duration:500,retry:0}]}={}){
  return {errors:[],suites:[{title:'example.spec.ts',file:'example.spec.ts',specs:[],suites:[{title:'nested',specs:[{file:'example.spec.ts',title:'example',tests:[{projectName:project,status:outcome,expectedStatus,annotations,results}]}]}]}]};
}
test('exact historical evidence is structurally complete and smoke coverage is contained in full studio',()=>{
  validateBaseline(b);
  const studio=b.quality.stages.at(-1).cases;
  const keys=new Set(studio.map(c=>JSON.stringify([c.project,c.file,c.title])));
  for(const stage of b.quality.stages.slice(0,-1))for(const c of stage.cases)assert(keys.has(JSON.stringify([c.project,c.file,c.title])));
  assert.equal(studio.filter(c=>c.status==='passed').length,1202);
  assert.equal(studio.filter(c=>c.status==='skipped').length,4);
  assert.equal(Object.values(summarizeStudio(studio)).reduce((n,x)=>n+x.cases,0),1206);
});
test('baseline rejects duplicates and changes in count or release identity',()=>{
  const changed=structuredClone(b);changed.quality.stages.at(-1).cases.push(changed.quality.stages.at(-1).cases[0]);
  assert.throws(()=>validateBaseline(changed),/Duplicate/);
  const wrong=structuredClone(b);wrong.quality.event='pull_request';assert.throws(()=>validateBaseline(wrong),/exact-main/);
});
test('discovery can verify identities but does not establish execution',()=>{
  const rows=normalizeReport([jsonReport({results:[]})],[row],'discovery');
  assert.equal(compareCases([row],rows,'discovery').ok,true);
  assert.throws(()=>normalizeReport([jsonReport({results:[]})],[row],'execution'),/Missing result/);
});
test('merged shards require every unique test identity and all expected passes',()=>{
  const reports=[jsonReport(),jsonReport({project:'webkit'})];
  const rows=normalizeReport(reports,[row,skip],'execution');
  assert.equal(compareCases([row,skip],rows,'execution').ok,true);
  assert.equal(compareCases([row,skip],rows.slice(0,1),'execution').ok,false);
  assert.throws(()=>compareCases([row,skip],[...rows,rows[0]],'execution'),/Duplicate/);
  assert.equal(compareCases([row],rows,'execution').ok,false);
});
test('new skip, changed skip reason, expected failure, retries and global errors fail closed',()=>{
  const skipped=reason=>jsonReport({project:'webkit',outcome:'skipped',status:'skipped',expectedStatus:'skipped',annotations:[{type:'skip',description:reason}]});
  assert(compareCases([skip],normalizeReport([skipped('Chromium only')],[skip],'execution'),'execution').ok);
  assert(!compareCases([skip],normalizeReport([skipped('changed')],[skip],'execution'),'execution').ok);
  const newSkip=jsonReport({outcome:'skipped',status:'skipped',expectedStatus:'skipped',annotations:[{type:'skip',description:'new'}]});
  assert(!compareCases([row],normalizeReport([newSkip],[row],'execution'),'execution').ok);
  const expectedFailure=jsonReport({status:'failed',expectedStatus:'failed'});
  assert(!compareCases([row],normalizeReport([expectedFailure],[row],'execution'),'execution').ok);
  assert.throws(()=>normalizeReport([jsonReport({results:[{status:'failed',retry:0,duration:1},{status:'passed',retry:1,duration:2}]})],[row],'execution'),/retry/);
  assert.throws(()=>normalizeReport([{...jsonReport(),errors:[{message:'server crashed'}]}],[row],'execution'),/global reporter errors/);
});
test('timing measures parallel runner time separately from elapsed execution span',()=>{
  const base={status:'completed',conclusion:'success',steps:[]};
  const a={...base,id:1,name:'a',started_at:'2026-11-25T00:00:00Z',completed_at:'2026-11-25T00:02:00Z'};
  const c={...base,id:2,name:'b',started_at:'2026-11-25T00:01:00Z',completed_at:'2026-11-25T00:03:00Z'};
  const s={...base,id:3,name:'private',conclusion:'skipped'};
  const measured=measureJobs({total_count:3,jobs:[a,c,s]});
  assert.equal(measured.runnerSeconds,240);assert.equal(measured.executionSpanSeconds,180);
  assert.equal(measured.jobs[2].durationSeconds,null);
  assert.throws(()=>measureJobs({total_count:4,jobs:[a,c,s]}),/paginated/);
  assert.throws(()=>measureJobs({jobs:[{...a,status:'in_progress'}]}),/not completed/);
  assert.throws(()=>measureJobs({jobs:[{...a,completed_at:a.started_at.replace('25','24')}]}),/timestamps/);
});
