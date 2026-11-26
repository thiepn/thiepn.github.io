// CI-05: read-only rehearsal. Never edits workflows, settings, refs or releases.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=/^[0-9a-f]{40}$/;
const valid=(condition,msg)=>{if(!condition)throw Error(msg);};
const sorted=xs=>[...xs].sort();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function inspectReadiness(contract,evidence){
  valid(contract.schemaVersion===1&&contract.repository==='thiepn/thiepn.github.io'&&contract.scope==='CUTOVER_REHEARSAL_ONLY'&&contract.activation===false&&contract.releaseEvidence===false,'Unsupported rehearsal contract');
  const p=contract.parent;
  valid(sha.test(p.head)&&sha.test(p.base)&&Number.isInteger(p.pr),'Invalid parent pin');
  valid(contract.runs.length===11&&new Set(contract.runs.map(x=>x.id)).size===11,'Incomplete run contract');
  valid(Array.isArray(evidence)&&new Set(evidence.map(x=>x.run?.id)).size===evidence.length,'Duplicate or missing run identity');
  valid(evidence.every(x=>contract.runs.some(r=>r.id===x.run?.id)),'Unexpected run');
  const checks=contract.runs.map(spec=>{
    const data=evidence.find(x=>x.run.id===spec.id);
    if(!data)return {path:spec.path,status:'MISSING'};
    const {run,jobs}=data;
    const pr=run.pull_requests?.find(x=>x.number===p.pr);
    const identity=run.repository?.full_name===contract.repository&&run.head_repository?.full_name===contract.repository&&run.path==='.github/workflows/'+spec.path&&run.event==='pull_request'&&run.head_sha===p.head&&run.head_branch===p.branch&&pr?.head?.sha===p.head&&pr?.base?.sha===p.base&&Number.isInteger(run.run_attempt)&&run.run_attempt>0;
    if(!identity)return {path:spec.path,id:spec.id,status:'IDENTITY_MISMATCH'};
    if(run.status!=='completed')return {path:spec.path,id:spec.id,status:'PENDING'};
    if(run.conclusion!=='success')return {path:spec.path,id:spec.id,status:'FAILED',conclusion:run.conclusion};
    if(!Array.isArray(jobs?.jobs)||jobs.total_count!==jobs.jobs.length)return {path:spec.path,id:spec.id,status:'INCOMPLETE_JOB_EVIDENCE'};
    const expected=[...spec.jobs,...(spec.privateSkipped??[])];
    if(!same(sorted(jobs.jobs.map(x=>x.name)),sorted(expected)))return {path:spec.path,id:spec.id,status:'JOB_INVENTORY_MISMATCH'};
    const ok=jobs.jobs.every(j=>j.run_id===spec.id&&j.status==='completed'&&j.conclusion===(spec.privateSkipped?.includes(j.name)?'skipped':'success')&&(j.run_attempt===undefined||j.run_attempt===run.run_attempt));
    return {path:spec.path,id:spec.id,status:ok?'PASSED':'JOB_OUTCOME_MISMATCH'};
  });
  return {scope:contract.scope,revision:p.head,checks,allParentRunsPassed:checks.every(x=>x.status==='PASSED'),activation:false,releaseEvidence:false};
}
// This is a proposed routing simulation only. No result is a merge or release gate.
export function proposeRoute({event,ref,draft,selection='UNKNOWN',narrowProof=false,phase='shadow'}){
  valid(['shadow','public-consolidation','parallel-pr','fast-draft'].includes(phase),'Unknown rollout phase');
  valid(['TARGETED_SHADOW','FULL_QUALITY_REQUIRED','UNKNOWN'].includes(selection),'Unknown selector result');
  const pr=event==='pull_request';
  const main=event==='push'&&ref==='refs/heads/main';
  const dispatch=event==='workflow_dispatch';
  if(pr)valid(typeof draft==='boolean','Missing PR draft status');
  // Unsupported and manual events must never qualify a release or bypass checks.
  if(!pr&&!main&&!dispatch)return {scope:'PROPOSED_ONLY',route:'UNSUPPORTED',fullQualityRequired:true,releaseEvidence:false,activation:false};
  const consolidated=phase!=='shadow';
  const parallel=phase==='parallel-pr'||phase==='fast-draft';
  const targeted=pr&&draft&&phase==='fast-draft'&&narrowProof===true&&selection==='TARGETED_SHADOW';
  const browser=main||dispatch||!parallel?'SEQUENTIAL_FULL':targeted?'TARGETED_WITH_FULL_ON_READY':'PARALLEL_FULL';
  return {scope:'PROPOSED_ONLY',route:browser,fullQualityRequired:!targeted,publicContracts:consolidated?'CONSOLIDATED_ALL_SEVEN':'ORIGINAL_TRIGGER_RULES',retainIndependentLibrary:true,retainIndependentReadingPilot:true,privateStatus:'NOT_EXECUTED',exactMainPushQualityRequired:true,releaseEvidence:false,activation:false};
}
async function readGitHub(contract){
  const base='https://api.github.com/repos/'+contract.repository;
  const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'thiepn-ci-cutover-rehearsal'};
  if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
  const get=async path=>{const res=await fetch(base+path,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('GitHub evidence unavailable: '+res.status+' '+path);return res.json();};
  const parent=await get('/pulls/'+contract.parent.pr);
  valid(parent.head?.sha===contract.parent.head&&parent.base?.sha===contract.parent.base&&parent.draft===true&&parent.state==='open'&&parent.merged===false,'Parent changed; re-pin after review');
  const result=[];
  for(const spec of contract.runs){
    const run=await get('/actions/runs/'+spec.id);
    const jobs=run.status==='completed'?await get('/actions/runs/'+spec.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100'):null;
    result.push({run,jobs});
  }
  return result;
}
async function main(){
  const [command,file]=process.argv.slice(2);
  valid(['inspect','plan'].includes(command),'Usage: cutover-rehearsal.mjs inspect [evidence.json] | plan');
  const contract=JSON.parse(readFileSync(resolve(root,'config/ci/cutover-rehearsal-v1.json'),'utf8'));
  if(command==='inspect'){
    const evidence=file?JSON.parse(readFileSync(file,'utf8')):await readGitHub(contract);
    const status=inspectReadiness(contract,evidence);
    console.log(JSON.stringify({...status,remainingPrerequisites:contract.blockers.filter(b=>b!=='independent-repaired-revision-regressions'||!status.allParentRunsPassed)},null,2));
    if(!status.allParentRunsPassed)process.exitCode=1;
  }else{
    const events=[{event:'pull_request',draft:true,selection:'TARGETED_SHADOW',narrowProof:false},{event:'pull_request',draft:true,selection:'TARGETED_SHADOW',narrowProof:true},{event:'pull_request',draft:true,selection:'FULL_QUALITY_REQUIRED'},{event:'pull_request',draft:false,selection:'TARGETED_SHADOW',narrowProof:true},{event:'push',ref:'refs/heads/main'},{event:'workflow_dispatch'}];
    const phases=['shadow','public-consolidation','parallel-pr','fast-draft'];
    console.log(JSON.stringify({scope:contract.scope,activation:false,routes:phases.flatMap(phase=>events.map(e=>({phase,input:e,...proposeRoute({...e,phase})}))),prerequisites:contract.blockers},null,2));
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('CI-05: '+e.message);process.exitCode=1;});
