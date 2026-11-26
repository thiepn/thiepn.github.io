// CI-04: public contracts only; original workflows remain authoritative.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {validateBaseline} from './baseline.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const need=(ok,m)=>{if(!ok)throw Error(m);};
const stable=x=>[...new Set(x)].sort();
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const unit=name=>'tests/unit/'+name+'.test.ts';
const commands=j=>j.steps.flatMap(s=>s.run?[s.run]:[]);
const sha=/^[a-f0-9]{40}$/;
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const blob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const marker='NOT_EXECUTED';
// Pinned Account it.each has four inputs without a title placeholder (artifact 15113588680).
const repeatedFile='tests/unit/hub-account.test.ts';
const repeatedName='H10 code callback boundary rejects invalid codes';
const repeatedCount=4;
const suiteIds=['account','notes-owner','managed-notes','inbox','capture','tms60','cross-app'];

export function validateManifest(m){
  need(m.schemaVersion===1&&m.scope==='PUBLIC_CONTRACTS_SHADOW_ONLY'&&m.releaseEvidence===false&&m.privateStatus===marker&&m.nodeMajor===24,'Invalid integration scope');
  need(sha.test(m.parent)&&equal(m.contracts.map(c=>c.id),suiteIds),'Missing or reordered public contracts');
  need(equal(m.independent,['hub-library-browser.yml','hub-reading-pilot-browser.yml']),'Independent paired scope changed');
  need(new Set(m.contracts.map(c=>c.workflow)).size===7,'Duplicate contract workflow');
  for(const c of m.contracts){
    need(/^hub-[a-z0-9-]+\.yml$/.test(c.workflow)&&['paired','owner-contract','staged-paired'].includes(c.disabledJob),'Invalid workflow identity');
    need(Array.isArray(c.files)&&c.files.length>0&&new Set(c.files).size===c.files.length,'Invalid contract files');
    need(c.originalTrigger===(c.id==='cross-app'?'path-filtered-pr-and-dispatch':'regular'),'Changed original trigger classification');
    for(const f of c.files)need(/^[a-z0-9-]+$/.test(f)&&Number.isInteger(m.expectedCounts[f])&&m.expectedCounts[f]>0,'Invalid expected test inventory');
  }
  const files=stable(m.contracts.flatMap(c=>c.files));
  need(files.length===8&&equal(files,Object.keys(m.expectedCounts).sort()),'Unexpected unique public file inventory');
  return files.map(unit);
}
export function inspectOriginal(c,yaml){
  need(equal(yaml.permissions,{contents:'read'})&&!Object.hasOwn(yaml.on,'pull_request_target'),'Original permissions or event drift: '+c.id);
  if(c.originalTrigger==='regular'){
    need(equal(Object.keys(yaml.on).sort(),['pull_request','push'])&&yaml.on.pull_request===null&&equal(yaml.on.push,{branches:['main']}),'Original regular trigger drift: '+c.id);
  }else{
    need(equal(Object.keys(yaml.on).sort(),['pull_request','workflow_dispatch'])&&Array.isArray(yaml.on.pull_request.paths)&&yaml.on.pull_request.paths.length>0&&yaml.on.workflow_dispatch===null,'Original cross-app trigger drift');
  }
  need(equal(Object.keys(yaml.jobs).sort(),['public-contract',c.disabledJob].sort()),'Original job inventory drift: '+c.id);
  const pub=yaml.jobs['public-contract'],priv=yaml.jobs[c.disabledJob];
  need(pub.if===undefined&&pub.permissions===undefined&&pub['continue-on-error']===undefined&&pub['runs-on']==='ubuntu-latest'&&pub['timeout-minutes']===15,'Public job semantics changed: '+c.id);
  need(priv.if==='$'+'{{ false }}','Private execution enabled: '+c.id);
  need(!pub.uses&&pub.steps.length===6,'Public step inventory changed: '+c.id);
  const [checkout,setup,install,boundary,tests,notice]=pub.steps;
  need(checkout.uses==='actions/checkout@v4'&&equal(checkout.with,{'persist-credentials':false}),'Public checkout changed');
  need(setup.uses==='actions/setup-node@v4'&&equal(setup.with,{'node-version':'24',cache:'npm'}),'Public Node profile changed');
  need(install.run==='npm ci --no-audit --no-fund'&&boundary.run==='node --test tests/hub-account-ci-boundaries.test.mjs','Public prerequisite changed');
  need(tests.run==='npx vitest run '+c.files.map(unit).join(' '),'Original test selection changed: '+c.id);
  need(typeof notice.run==='string'&&notice.run.includes(marker),'Private status notice missing: '+c.id);
  for(const s of pub.steps)need(s.if===undefined&&s.env===undefined&&s['working-directory']===undefined&&s['continue-on-error']===undefined,'Public step conditional/env drift');
  const pins=priv.steps.filter(s=>s.uses==='actions/checkout@v4'&&s.with?.repository).map(s=>{
    need(sha.test(s.with.ref)&&!s.with.token,'Private owner pin or credentials changed: '+c.id);
    return {repository:s.with.repository,ref:s.with.ref,path:s.with.path};
  });
  need(pins.length>0,'Missing private pin: '+c.id);
  return {id:c.id,workflow:c.workflow,originalTrigger:yaml.on,publicFiles:c.files.map(unit),privateJob:c.disabledJob,privateStatus:marker,privatePins:pins};
}
export function verifyReport(report,m,checkoutRoot){
  const files=validateManifest(m);
  const total=Object.values(m.expectedCounts).reduce((n,v)=>n+v,0);
  need(report?.success===true&&Array.isArray(report.testResults),'Missing or unsuccessful Vitest report');
  for(const [field,value] of Object.entries({numTotalTests:total,numPassedTests:total,numFailedTests:0,numPendingTests:0,numTodoTests:0}))
    need(report[field]===value,'Vitest aggregate mismatch: '+field);
  const byFile=new Map();
  const prefix=checkoutRoot.replaceAll('\\','/').replace(/\/$/,'')+'/';
  for(const suite of report.testResults){
    need(typeof suite.name==='string','Missing suite name');
    const path=suite.name.replaceAll('\\','/');
    const rel=path.startsWith(prefix)?path.slice(prefix.length):path.replace(/^\.\//,'');
    need(files.includes(rel)&&!byFile.has(rel),'Unexpected or duplicate suite: '+rel);
    need(suite.status==='passed'&&Array.isArray(suite.assertionResults),'Unsuccessful suite: '+rel);
    const name=rel.slice('tests/unit/'.length,-'.test.ts'.length);
    need(suite.assertionResults.length===m.expectedCounts[name],'Wrong assertion count: '+rel);
    const seen=new Map(),identities=[];
    for(const test of suite.assertionResults){
      need(typeof test.fullName==='string'&&test.fullName.length>0,'Missing assertion identity: '+rel);
      const count=(seen.get(test.fullName)??0)+1;
      const allowed=rel===repeatedFile&&test.fullName===repeatedName?repeatedCount:1;
      need(count<=allowed,'Unexpected duplicate assertion identity: '+rel+' '+test.fullName);
      seen.set(test.fullName,count);
      need(test.status==='passed','Unexpected assertion outcome: '+rel+' '+test.fullName);
      identities.push({fullName:test.fullName,occurrence:count});
    }
    if(rel===repeatedFile)need(seen.get(repeatedName)===repeatedCount,'Known parameterized assertion multiplicity mismatch: '+rel);
    byFile.set(rel,{file:rel,count:identities.length,identities:identities.sort((a,b)=>a.fullName<b.fullName?-1:a.fullName>b.fullName?1:a.occurrence-b.occurrence)});
  }
  need(equal([...byFile.keys()].sort(),files),'Incomplete suite inventory');
  return {scope:m.scope,releaseEvidence:false,uniqueFiles:files.length,uniqueTests:total,files:files.map(f=>byFile.get(f)),contracts:m.contracts.map(c=>({id:c.id,workflow:c.workflow,publicStatus:'PASSED',privateStatus:marker,files:c.files.map(unit),passed:c.files.reduce((n,f)=>n+m.expectedCounts[f],0)}))};
}
function inspect(m,b){
  const files=validateManifest(m);
  const pins=new Map(b.sourceFiles.map(f=>[f.path,f.blob]));
  // Preserve every original workflow and the eight historical contract sources.
  const paths=[...b.sourceFiles.filter(f=>f.path.startsWith('.github/workflows/')).map(f=>f.path),...files,'tests/hub-account-ci-boundaries.test.mjs','package-lock.json','package.json'];
  for(const path of paths)need(pins.has(path)&&blob(readFileSync(join(root,path)))===pins.get(path),'Reviewed source pin drift: '+path);
  const actual=m.contracts.map(c=>inspectOriginal(c,parse(readFileSync(join(root,'.github/workflows',c.workflow),'utf8'))));
  return {scope:m.scope,originalWorkflowPins:paths.filter(p=>p.startsWith('.github/workflows/')).length,sourcePins:paths.length,contracts:actual,independent:m.independent.map(path=>({path,status:'UNCHANGED_INDEPENDENT_WORKFLOW',blob:pins.get('.github/workflows/'+path)})),releaseEvidence:false};
}
function main(){
  const [command,out]=process.argv.slice(2);
  need(out&&['inspect','run'].includes(command),'Usage: public-integration.mjs <inspect|run> <output-directory>');
  const m=read(join(root,'config/ci/public-integration-v1.json'));
  const b=validateBaseline(read(join(root,'config/ci/baseline-v1.json')));
  mkdirSync(out,{recursive:true});
  const inventory=inspect(m,b);
  writeFileSync(join(out,'original-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
  if(command==='inspect'){console.log(JSON.stringify(inventory,null,2));return;}
  need(process.env.GITHUB_REPOSITORY==='thiepn/thiepn.github.io'&&git('rev-parse','HEAD')===process.env.GITHUB_SHA,'Unexpected checkout context');
  need(process.versions.node.split('.')[0]==='24','Original Node 24 profile required');
  need(/^[1-9]\d*$/.test(process.env.GITHUB_RUN_ID??'')&&/^[1-9]\d*$/.test(process.env.GITHUB_RUN_ATTEMPT??''),'Missing workflow run identity');
  const reportPath=resolve(out,'vitest.json');
  const files=validateManifest(m);
  const result=spawnSync('npx',['--no-install','vitest','run',...files,'--reporter=json','--outputFile='+reportPath],{cwd:root,stdio:'inherit',env:process.env});
  if(result.error)throw result.error;
  need(result.status===0,'Public contract execution failed');
  const verified=verifyReport(read(reportPath),m,root);
  inspect(m,b);
  const evidence={...verified,testedSha:git('rev-parse','HEAD'),treeSha:git('rev-parse','HEAD^{tree}'),runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,node:process.version,lockSha256:sha256(join(root,'package-lock.json')),reportSha256:sha256(reportPath),status:'PUBLIC_CONTRACTS_PASSED_PRIVATE_NOT_EXECUTED_EXISTING_WORKFLOWS_REQUIRED'};
  writeFileSync(join(out,'qualification.json'),JSON.stringify(evidence,null,2)+'\n');
  for(const c of evidence.contracts)console.log(c.id+': '+c.passed+' public tests PASSED; private '+c.privateStatus);
  console.log(evidence.status+'; '+evidence.uniqueTests+' unique public tests in '+evidence.uniqueFiles+' files');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(e){console.error('CI-04: '+e.message);process.exitCode=1;}
}
