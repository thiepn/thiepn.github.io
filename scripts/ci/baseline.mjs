// Read-only CI-01 evidence helpers. No workflow, runner, repository or release mutations.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const fail = message => { throw new Error(message); };
const requireThat = (condition, message) => { if (!condition) fail(message); };
const key = row => JSON.stringify([row.project, row.file, row.title]);
const root = fileURLToPath(new URL('../../', import.meta.url));
const baselinePath = resolve(root, 'config/ci/baseline-v1.json');
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
const git = (...args) => execFileSync('git', args, {cwd:root, encoding:'utf8', maxBuffer:32*1024*1024});
const additions = new Set([
  'config/ci/baseline-v1.json', 'scripts/ci/baseline.mjs',
  'tests/ci/baseline.test.mjs', 'docs/ci/CI-01.md'
]);

export function validateBaseline(b) {
  requireThat(b.schemaVersion===1 && b.repository==='thiepn/thiepn.github.io', 'Unknown baseline schema or repository');
  requireThat(/^[a-f0-9]{40}$/.test(b.baseCommit) && /^[a-f0-9]{40}$/.test(b.baseTree), 'Invalid base pin');
  requireThat(b.quality.commit===b.baseCommit && b.quality.event==='push' && b.quality.conclusion==='success', 'Not exact-main historical success');
  const source = new Set();
  for (const f of b.sourceFiles) {
    requireThat(typeof f.path==='string' && !f.path.startsWith('/') && !f.path.split('/').includes('..') && /^[a-f0-9]{40}$/.test(f.blob) && /^(100644|100755|120000)$/.test(f.mode), 'Invalid source pin');
    requireThat(!source.has(f.path), 'Duplicate source pin: '+f.path); source.add(f.path);
  }
  requireThat([...source].filter(p=>p.startsWith('.github/workflows/')).length===27, 'Workflow inventory incomplete');
  requireThat(b.quality.stages.map(s=>s.name).join(',')==='calendar-smoke,account-smoke,curated-smoke,layout-smoke,studio', 'Unexpected stages');
  for (const stage of b.quality.stages) {
    const seen = new Set();
    for (const c of stage.cases) {
      requireThat(['chromium','firefox','webkit'].includes(c.project) && source.has(c.file) && typeof c.title==='string' && c.title.length>0, 'Invalid test identity');
      requireThat(!seen.has(key(c)), 'Duplicate baseline identity: '+key(c)); seen.add(key(c));
      requireThat(c.status==='passed' ? Number.isFinite(c.durationMs)&&c.durationMs>=0 : c.status==='skipped' && c.durationMs===null && typeof c.skipReason==='string' && c.skipReason.length>0, 'Invalid historical outcome: '+key(c));
    }
  }
  const counts=b.quality.stages.map(s=>s.cases.length);
  requireThat(counts.join(',')==='3,9,51,6,1206', 'Historical stage counts differ');
  const studio=b.quality.stages.at(-1);
  requireThat(studio.cases.filter(c=>c.status==='skipped').length===4, 'Historical skip inventory differs');
  return b;
}

export function normalizeReport(reports, expectedCases, mode) {
  requireThat(['discovery','execution'].includes(mode), 'Mode must be discovery or execution');
  requireThat(Array.isArray(reports)&&reports.length>0, 'No reports');
  const files=[...new Set(expectedCases.map(c=>c.file))];
  const rows=[];
  const resolveFile = raw => {
    requireThat(typeof raw==='string' && raw.length>0, 'Missing reporter file');
    const path=raw.replaceAll('\\','/').replace(/^\.\//,'');
    const candidates=files.filter(f=>f===path || path.endsWith('/'+f) || f.endsWith('/'+path));
    requireThat(candidates.length===1, 'Unknown or ambiguous reporter file: '+raw);
    return candidates[0];
  };
  for (const report of reports) {
    requireThat(Array.isArray(report.suites) && Array.isArray(report.errors) && report.errors.length===0, 'Incomplete report or global reporter errors');
    const walk=(suite, parents, isRoot) => {
      // Top-level suite is the file. Nested describe titles belong to the identity.
      const chain=isRoot?parents:[...parents,suite.title];
      requireThat(chain.every(t=>typeof t==='string'&&t.length>0), 'Invalid suite title');
      for (const spec of suite.specs??[]) {
        const file=resolveFile(spec.file??suite.file);
        requireThat(typeof spec.title==='string' && Array.isArray(spec.tests) && spec.tests.length>0, 'Malformed spec');
        for (const test of spec.tests) {
          const row={project:test.projectName,file,title:[...chain,spec.title].join(' › ')};
          requireThat(typeof row.project==='string'&&row.project.length>0, 'Missing project identity');
          if(mode==='execution') {
            requireThat(Array.isArray(test.results)&&test.results.length===1, 'Missing result or retry: '+key(row));
            const result=test.results[0];
            requireThat(result.retry===0 || result.retry===undefined, 'Retried result: '+key(row));
            row.status=result.status;
            row.expectedStatus=test.expectedStatus;
            row.outcome=test.status;
            row.durationMs=result.duration;
            row.skipReasons=[...(test.annotations??[]),...(result.annotations??[])].filter(a=>a.type==='skip').map(a=>a.description);
          }
          rows.push(row);
        }
      }
      for(const child of suite.suites??[])walk(child,chain,false);
    };
    for(const suite of report.suites)walk(suite,[],true);
  }
  return rows;
}

export function compareCases(expected, actual, mode) {
  requireThat(['discovery','execution'].includes(mode),'Invalid comparison mode');
  const e=new Map(),a=new Map();
  for(const row of expected){const k=key(row);requireThat(!e.has(k),'Duplicate baseline case: '+k);e.set(k,row);}
  for(const row of actual){const k=key(row);requireThat(!a.has(k),'Duplicate reported case: '+k);a.set(k,row);}
  const missing=[...e.keys()].filter(k=>!a.has(k)),unexpected=[...a.keys()].filter(k=>!e.has(k));
  const mismatches=[];
  if(mode==='execution')for(const [k,old] of e){
    const now=a.get(k);if(!now)continue;
    if(old.status==='passed'){
      if(now.status!=='passed'||now.expectedStatus!=='passed'||now.outcome!=='expected')mismatches.push({key:k,reason:'Previously passing case is not an expected pass'});
    }else if(old.status==='skipped'){
      // A newly executed and passing formerly skipped case is welcome; it is not a new skip.
      const passed=now.status==='passed'&&now.expectedStatus==='passed'&&now.outcome==='expected';
      const allowed=now.status==='skipped'&&now.expectedStatus==='skipped'&&now.outcome==='skipped'&&now.skipReasons?.includes(old.skipReason);
      if(!passed&&!allowed)mismatches.push({key:k,reason:'Existing skip changed reason or unexpected outcome'});
    }else mismatches.push({key:k,reason:'Unknown baseline status'});
    if(!Number.isFinite(now.durationMs)||now.durationMs<0)mismatches.push({key:k,reason:'Invalid duration'});
  }
  return {mode,expected:e.size,actual:a.size,missing,unexpected,mismatches,ok:missing.length===0&&unexpected.length===0&&mismatches.length===0};
}

export function measureJobs(payload) {
  requireThat(Array.isArray(payload.jobs)&&payload.jobs.length>0,'No jobs in API payload');
  requireThat(!Number.isInteger(payload.total_count)||payload.total_count===payload.jobs.length,'Incomplete paginated job response');
  const jobs=[],ids=new Set();
  const interval=(start,end)=>{
    const a=Date.parse(start),b=Date.parse(end);
    requireThat(Number.isFinite(a)&&Number.isFinite(b)&&b>=a,'Missing or invalid execution timestamps');
    return {startMs:a,endMs:b,durationSeconds:(b-a)/1000};
  };
  for(const j of payload.jobs){
    requireThat(Number.isInteger(j.id)&&!ids.has(j.id),'Invalid or duplicate job ID');ids.add(j.id);
    requireThat(j.status==='completed'&&typeof j.conclusion==='string','Job not completed: '+j.name);
    if(j.conclusion==='skipped'){jobs.push({id:j.id,name:j.name,conclusion:j.conclusion,durationSeconds:null});continue;}
    const duration=interval(j.started_at,j.completed_at);
    const steps=(j.steps??[]).map(s=>({name:s.name,conclusion:s.conclusion,durationSeconds:s.conclusion==='skipped'?null:interval(s.started_at,s.completed_at).durationSeconds}));
    jobs.push({id:j.id,name:j.name,conclusion:j.conclusion,...duration,steps});
  }
  const executed=jobs.filter(j=>j.durationSeconds!==null);
  return {jobs,runnerSeconds:executed.reduce((sum,j)=>sum+j.durationSeconds,0),executionSpanSeconds:executed.length?(Math.max(...executed.map(j=>j.endMs))-Math.min(...executed.map(j=>j.startMs)))/1000:0,scope:'Raw job execution time; excludes billing rounding and pre-start queue time'};
}

export function summarizeStudio(cases){
  const groups={};
  for(const c of cases){
    const g=groups[c.project]??={cases:0,passed:0,skipped:0,durationMs:0,files:{}};
    g.cases++;g[c.status]++;g.durationMs+=c.durationMs??0;
    g.files[c.file]=(g.files[c.file]??0)+(c.durationMs??0);
  }
  return groups;
}

function verifySource(b){
  requireThat(git('rev-parse',b.baseCommit+'^{tree}').trim()===b.baseTree,'Baseline tree unavailable or changed; fetch full history');
  const entries=new Map();
  for(const entry of git('ls-tree','-rz','HEAD').split('\0').filter(Boolean)){
    const m=entry.match(/^(\d+) blob ([a-f0-9]{40})\t([\s\S]+)$/);
    if(m)entries.set(m[3],{mode:m[1],blob:m[2]});
  }
  for(const pin of b.sourceFiles){
    const actual=entries.get(pin.path);
    requireThat(actual?.blob===pin.blob&&actual.mode===pin.mode,'Baseline source drift: '+pin.path);
  }
  for(const line of git('diff','--name-status','--no-renames',b.baseCommit,'HEAD').trim().split('\n').filter(Boolean)){
    const [status,path]=line.split('\t');
    requireThat(status==='A'&&additions.has(path),'Out-of-scope CI-01 change: '+line);
  }
  requireThat(git('status','--porcelain','--untracked-files=normal').trim()==='','Dirty working tree; commit or clean before source verification');
  return {ok:true,head:git('rev-parse','HEAD').trim(),base:b.baseCommit,verifiedPins:b.sourceFiles.length,workflows:27,scope:'CI-01 additive source integrity only; not release authorization'};
}

async function inventory(b){
  const {parse}=await import('yaml');
  const pinned=path=>git('show',b.baseCommit+':'+path);
  const workflows=b.sourceFiles.filter(f=>f.path.startsWith('.github/workflows/')).map(f=>{
    const definition=parse(pinned(f.path));
    requireThat(definition&&typeof definition.name==='string'&&definition.jobs,'Invalid workflow: '+f.path);
    return {path:f.path,blob:f.blob,name:definition.name,triggers:definition.on,permissions:definition.permissions??null,concurrency:definition.concurrency??null,jobs:Object.entries(definition.jobs).map(([id,job])=>({id,definition:job}))};
  });
  const pkg=JSON.parse(pinned('package.json'));
  requireThat(JSON.stringify(pkg.scripts)===JSON.stringify(b.packageScripts),'Pinned package command inventory differs');
  return {baseCommit:b.baseCommit,workflows,packageScripts:pkg.scripts,browserConfigs:b.sourceFiles.filter(f=>/^playwright.*config\.ts$/.test(f.path)).map(f=>({...f,source:pinned(f.path)})),testSources:b.sourceFiles.filter(f=>f.path.startsWith('tests/')),observations:b.quality,otherObservedRuns:b.otherObservedRuns,scope:'Full pinned workflow job definitions including disabled jobs, exact command strings and test source pins. Observed case identities only where available; no inferred private execution.'};
}

async function main(args){
  const b=validateBaseline(readJSON(baselinePath));
  const [command,...rest]=args;
  let report;
  switch(command){
    case 'verify': requireThat(rest.length===0,'Usage: verify');report=verifySource(b);break;
    case 'inventory':requireThat(rest.length===0,'Usage: inventory');report=await inventory(b);break;
    case 'compare':{
      const [stage,mode,...paths]=rest;
      const target=b.quality.stages.find(s=>s.name===stage);requireThat(target,'Unknown stage');
      report=compareCases(target.cases,normalizeReport(paths.map(readJSON),target.cases,mode),mode);
      if(!report.ok)process.exitCode=1;
      break;
    }
    case 'timings':
      requireThat(rest.length<=1,'Usage: timings [jobs.json]');
      report={historical:{runId:b.quality.runId,durationSeconds:b.quality.durationSeconds,steps:b.quality.steps,browsers:summarizeStudio(b.quality.stages.at(-1).cases),otherObservedRuns:b.otherObservedRuns,comparisonSamples:b.comparisonSamples},...(rest.length?{measured:measureJobs(readJSON(rest[0]))}:{})};
      break;
    default:fail('Usage: node scripts/ci/baseline.mjs verify | inventory | compare <stage> <discovery|execution> <report.json>... | timings [jobs.json]');
  }
  console.log(JSON.stringify(report,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error('CI-01: '+error.message);process.exitCode=1;});
