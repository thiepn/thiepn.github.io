#!/usr/bin/env node
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  validateManifest, safeOrigin, chooseProductionDeployment,
  checkIdentity, checkCiContract, checkJourneys, checkReview,
  aggregate, outcome
} from './release-readiness-core.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const args = process.argv.slice(2);
const value = key => { const i=args.indexOf(key); return i<0 ? null : args[i+1]; };
const appId = value('--app');
if (!appId || args.includes('--help')) {
  console.log('Usage: node scripts/release-readiness.mjs --app <id> [--browser] [--out <path>] [--json]');
  process.exit(appId?0:2);
}

const manifest = validateManifest(JSON.parse(await fs.readFile(path.join(ROOT,'ops/release-candidates.json'),'utf8')));
const app = manifest.apps.find(x=>x.id===appId);
if (!app) { console.error(`Unknown release candidate: ${appId}`); process.exit(2); }

const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const cfToken = process.env.CLOUDFLARE_API_TOKEN;
const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
const recordedAt = new Date().toISOString();
const failures=[];

async function jsonGet(url, headers) {
  const response = await fetch(url,{headers:{Accept:'application/json',...headers},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw Error(`HTTP ${response.status} on read-only API request`);
  return response.json();
}
async function gh(route) {
  if(!githubToken) throw Error('Missing GITHUB_TOKEN/GH_TOKEN');
  return jsonGet(`https://api.github.com${route}`,{
    Authorization:`Bearer ${githubToken}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'THIEPN-release-readiness/1.0'
  });
}
async function cf(route) {
  if(!cfToken || !cfAccount) throw Error('Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID');
  const result=await jsonGet(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfAccount)}${route}`,{Authorization:`Bearer ${cfToken}`});
  if(!result.success) throw Error('Cloudflare API did not confirm success');
  return result;
}

async function discoverCloudflare() {
  const proj=await cf(`/pages/projects/${app.hosting.project}`);
  const deployments=[];
  let truncated=false;
  for (let page=1;page<=5;page++) {
    const result=await cf(`/pages/projects/${app.hosting.project}/deployments?page=${page}`);
    if(!Array.isArray(result.result)) throw Error('Cloudflare deployments response lacks an array');
    deployments.push(...result.result);
    const info=result.result_info;
    if(info?.total_pages && page>=info.total_pages) break;
    if(result.result.length < (info?.per_page || 10)) break;
    if(page===5) truncated=true;
  }
  return { project:proj.result, deployments, truncated };
}

async function ciEvidence(sha) {
  if (!githubToken) throw Error('Missing GitHub token');
  const runs=[];
  for(let page=1;page<=3;page++){
    const result=await gh(`/repos/${app.repo}/actions/runs?head_sha=${sha}&per_page=100&page=${page}`);
    if(!Array.isArray(result.workflow_runs)) throw Error('GitHub workflow listing unavailable');
    runs.push(...result.workflow_runs);
    if(runs.length>=result.total_count || result.workflow_runs.length<100) break;
    if(page===3) throw Error('Too many GitHub runs; cannot establish exhaustive CI evidence');
  }
  const relevant=runs.filter(r=>app.ci.some(e=>e.workflow===r.path) || (app.journeyEvidence||[]).some(e=>e.runUrl.endsWith('/'+r.id)));
  const jobsByRun={};
  for(const run of relevant.slice(0,25)) {
    const jobs=[];
    for(let page=1;page<=3;page++) {
      const result=await gh(`/repos/${app.repo}/actions/runs/${run.id}/jobs?per_page=100&page=${page}`);
      if(!Array.isArray(result.jobs)) throw Error('GitHub workflow job listing unavailable');
      jobs.push(...result.jobs);
      if(jobs.length>=result.total_count || result.jobs.length<100)break;
      if(page===3)throw Error('Too many jobs to establish exhaustive CI evidence');
    }
    jobsByRun[run.id]=jobs;
  }
  if(relevant.length>25) throw Error('Too many relevant CI runs; evidence requires a narrower query');
  return {runs, jobsByRun};
}

async function liveEvidence() {
  const target=safeOrigin(app.productionUrl);
  try {
    const response=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'text/html','User-Agent':'THIEPN-release-readiness/1.0'}});
    if(response.status>=300 && response.status<400) return outcome('FAIL','Unexpected redirect; canonical URL must serve directly');
    if(!response.ok) return outcome('FAIL',`Production URL returned HTTP ${response.status}`);
    if(!(response.headers.get('content-type')||'').includes('text/html')) return outcome('FAIL','Production URL did not serve HTML');
    const size=Number(response.headers.get('content-length')||0);
    if(size>1_000_000) return outcome('NOT_TESTED','HTML exceeded bounded size budget');
    const html=await response.text();
    if(html.length>1_000_000) return outcome('NOT_TESTED','HTML exceeded bounded size budget');
    if(!html.toLowerCase().includes(app.expectedTitle.toLowerCase())) return outcome('FAIL','Expected app identity absent from HTML');
    if(!args.includes('--browser')) return outcome('NOT_TESTED','HTTP identity confirmed; real browser smoke not requested');
    let chromium;
    try { ({chromium}=await import('@playwright/test')); }
    catch { return outcome('NOT_TESTED','Playwright not installed or unavailable'); }
    let browser;
    try {
      browser=await chromium.launch({headless:true});
      const page=await browser.newPage({viewport:{width:390,height:844}});
      const pageErrors=[];
      page.on('pageerror',e=>pageErrors.push(String(e.message).slice(0,200)));
      const res=await page.goto(target,{waitUntil:'domcontentloaded',timeout:15000});
      if(!res?.ok() || page.url()!==target) return outcome('FAIL','Browser did not load expected canonical origin');
      try { await page.locator(app.appSelector).first().waitFor({state:'attached',timeout:8000}); }
      catch { return outcome('FAIL','Expected application entry element did not appear'); }
      if(!((await page.title()).toLowerCase().includes(app.expectedTitle.toLowerCase()))) return outcome('FAIL','Browser document title lacks app identity');
      if(pageErrors.length) return outcome('FAIL','Uncaught browser errors in anonymous entry',{errors:pageErrors});
      return outcome('PASS','Anonymous mobile-viewport entry point loaded (not device or functional certification)');
    } catch(error) { return outcome('NOT_TESTED',`Browser check unavailable or inconclusive: ${String(error.message).slice(0,160)}`); }
    finally {await browser?.close().catch(()=>{});}
  } catch(e) {return outcome('NOT_TESTED',`Production HTTP check unavailable: ${String(e.message).slice(0,180)}`);}
}

let project=null, deploy=null, sha=null;
let gates={};
try {
  const cfState=await discoverCloudflare(); project=cfState.project;
  gates.identity=checkIdentity(app,project);
  if(cfState.truncated) gates.deployment=outcome('NOT_TESTED','Deployment history exceeded bounded pagination');
  else {
    const selected=chooseProductionDeployment(cfState.deployments,project?.production_branch);
    deploy=selected.deployment; gates.deployment=selected.result;
    if(selected.result.state==='PASS') sha=deploy.deployment_trigger.metadata.commit_hash;
  }
} catch(e) {
  failures.push(`Cloudflare metadata: ${e.message}`);
  gates.identity=outcome('NOT_TESTED','Cloudflare metadata unavailable');
  gates.deployment=outcome('NOT_TESTED','Cloudflare deployment history unavailable');
}

let runs=null,jobsByRun={};
if(sha && (app.ci.length || app.journeyEvidence?.length)) {
  try { ({runs,jobsByRun}=await ciEvidence(sha)); }
  catch(e) { failures.push(`GitHub CI: ${e.message}`); }
}
gates.ci=checkCiContract(app,sha,runs,jobsByRun);
gates.live=await liveEvidence();
gates.journeys=checkJourneys(app,sha,runs,jobsByRun);
gates.review=checkReview(app,sha);
const report={...aggregate(app,gates,sha),generatedAt:recordedAt,
  provenance:{provider:'cloudflare-pages',project:app.hosting.project,deploymentId:deploy?.id||null,productionBranch:project?.production_branch||null},
  limitations:failures};

if(args.includes('--json'))console.log(JSON.stringify(report,null,2));
else {
  console.log(`${app.id}: ${report.decision} (${sha||'unknown production SHA'})`);
  for(const [name,result] of Object.entries(gates))console.log(` ${result.state.padEnd(10)} ${name.padEnd(11)} ${result.reason}`);
  for(const item of failures) console.log(` limitation: ${item}`);
}
const dest=value('--out');
if(dest){
  const target=path.resolve(dest);
  if(target===path.join(ROOT,'ops/release-candidates.json'))throw Error('Cannot overwrite source manifest');
  await fs.mkdir(path.dirname(target),{recursive:true});
  const tmp=target+'.tmp-'+process.pid;
  try {await fs.writeFile(tmp,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await fs.rename(tmp,target);}
  finally {await fs.rm(tmp,{force:true});}
}
process.exitCode=report.decision==='QUALIFIED'?0:report.decision==='BLOCKED'?1:2;
