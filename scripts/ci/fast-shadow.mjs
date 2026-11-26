// CI-02: deterministic shadow selector. No release qualification or workflow writes.
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBaseline,normalizeReport,compareCases} from './baseline.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const demand=(ok,message)=>{if(!ok)throw new Error(message);};
const sorted=values=>[...new Set(values)].sort();
const identity=c=>JSON.stringify([c.project,c.file,c.title]);
const studioPath=name=>'tests/studio/'+name+'.spec.ts';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
const sha=/^[a-f0-9]{40}$/;
const safePath=p=>typeof p==='string'&&p.length>0&&!p.startsWith('/')&&!p.includes('\\')&&!/[\u0000-\u001f\u007f]/.test(p)&&!p.split('/').some(x=>x==='..'||x==='.'||!x);

export function parseChanges(raw){
  demand(typeof raw==='string','Missing NUL-delimited diff');
  if(!raw)return [];
  demand(raw.endsWith('\0'),'Truncated NUL-delimited diff');
  const fields=raw.slice(0,-1).split('\0'),rows=[];
  for(let i=0;i<fields.length;){
    const status=fields[i++];
    demand(/^(?:[AMDTUXB]|[RC][0-9]{1,3})$/.test(status),'Unsupported diff status: '+status);
    const paths=fields.slice(i,i+(/^[RC]/.test(status)?2:1));i+=/^[RC]/.test(status)?2:1;
    demand(paths.length===(/^[RC]/.test(status)?2:1)&&paths.every(safePath),'Malformed changed path');
    rows.push({status,paths});
  }
  return rows;
}

export function validatePolicy(policy,knownPaths,studioFiles){
  demand(policy.schemaVersion===1&&policy.domains&&Array.isArray(policy.alwaysSpecs),'Unknown impact policy');
  const known=new Set(knownPaths),files=new Set(studioFiles);
  demand(policy.alwaysSpecs.length>0,'Missing mandatory sentinel');
  for(const name of policy.alwaysSpecs)demand(files.has(studioPath(name)),'Unknown sentinel '+name);
  for(const [name,d] of Object.entries(policy.domains)){
    demand(Array.isArray(d.paths)&&Array.isArray(d.dependsOn)&&Array.isArray(d.specs)&&d.specs.length>0,'Invalid domain '+name);
    for(const p of d.paths)demand(safePath(p)&&known.has(p),'Unknown pinned path '+p);
    for(const p of d.prefixes??[])demand(typeof p==='string'&&p.endsWith('/')&&knownPaths.some(x=>x.startsWith(p)),'Unknown pinned prefix '+p);
    for(const s of d.specs)demand(files.has(studioPath(s)),'Unknown studio suite '+s);
    for(const dep of d.dependsOn)demand(Object.hasOwn(policy.domains,dep),'Unknown domain dependency '+dep);
  }
}

export function classify({changes,policy,knownPaths,studioFiles,drift=[]}){
  validatePolicy(policy,knownPaths,studioFiles);
  const known=new Set(knownPaths),files=new Set(studioFiles);
  const selected=new Set(policy.alwaysSpecs.map(studioPath)),reasons=[],domains=new Set(),fallback=[];
  const addDomain=name=>{
    if(domains.has(name))return;
    domains.add(name);
    for(const s of policy.domains[name].specs)selected.add(studioPath(s));
    for(const dep of policy.domains[name].dependsOn)addDomain(dep);
  };
  for(const change of changes){
    const {status,paths}=change;
    demand(Array.isArray(paths)&&paths.length>0&&paths.every(safePath),'Invalid change');
    if(status!=='M'){fallback.push({paths,reason:'Structural change: '+status});continue;}
    const p=paths[0];
    if(!known.has(p)){fallback.push({paths,reason:'Path not in reviewed baseline'});continue;}
    if(files.has(p)){selected.add(p);reasons.push({path:p,reason:'Changed studio specification'});continue;}
    if(/^tests\/unit\/[^/]+\.test\.ts$/.test(p)){reasons.push({path:p,reason:'Covered by mandatory complete unit suite'});continue;}
    if(/^(?:docs\/.*\.md|README\.md|CONTRIBUTING\.md)$/.test(p)){reasons.push({path:p,reason:'Documentation; mandatory sentinels retained'});continue;}
    const matching=Object.entries(policy.domains).filter(([,d])=>d.paths.includes(p)||(d.prefixes??[]).some(prefix=>p.startsWith(prefix))).map(([name])=>name);
    if(!matching.length){fallback.push({paths,reason:'Shared, security-sensitive or unmapped path'});continue;}
    matching.forEach(addDomain);reasons.push({path:p,reason:'Reviewed domain closure',domains:matching.sort()});
  }
  for(const p of drift)fallback.push({paths:[p],reason:'Baseline or discovery drift; refresh before trusting selection'});
  const fullRequired=fallback.length>0;
  // Full fallback is already provided by the unchanged Quality workflow. The
  // shadow job executes sentinels only in that case, never a second full suite.
  const planned=fullRequired?policy.alwaysSpecs.map(studioPath):[...selected];
  return {schemaVersion:1,mode:fullRequired?'FULL_QUALITY_REQUIRED':'TARGETED_SHADOW',releaseEvidence:false,allUnitsRequired:true,fullQualityRequired:true,selectedFiles:sorted(planned),impactFiles:sorted(selected),domains:sorted(domains),reasons,fallback,requiredFullFiles:sorted(studioFiles)};
}

export function shadowInventory(full,selected,plan){
  const expected=full.filter(c=>plan.selectedFiles.includes(c.file));
  demand(expected.length>0,'No selected cases discovered');
  for(const file of plan.selectedFiles)demand(expected.some(c=>c.file===file),'Selected suite has no discovered cases: '+file);
  for(const project of ['chromium','firefox','webkit'])demand(expected.some(c=>c.project===project),'Selected suite missing browser: '+project);
  const result=compareCases(expected,selected,'discovery');
  demand(result.ok,'Selected discovery mismatch: '+JSON.stringify(result));
  return expected;
}
function playwright(output,args){
  const fd=openSync(output,'w');
  try{
    const result=spawnSync('npx',['--no-install','playwright','test','-c','playwright.studio.config.ts',...args,'--reporter=json'],{cwd:root,stdio:['ignore',fd,'inherit'],env:process.env});
    if(result.error)throw result.error;
    demand(result.status===0,'Playwright failed ('+(result.status??result.signal)+'): '+output);
  }finally{closeSync(fd);}
}
const escapeRegex=p=>p.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&')+'$';

function main(){
  const [base,head,out]=process.argv.slice(2);
  demand(sha.test(base??'')&&sha.test(head??'')&&out,'Usage: fast-shadow.mjs <base-sha> <tested-sha> <report-directory>');
  demand(git('rev-parse','HEAD').trim()===head,'Checkout differs from tested SHA');
  git('merge-base','--is-ancestor',base,head);
  const b=validateBaseline(json(resolve(root,'config/ci/baseline-v1.json')));
  const policy=json(resolve(root,'config/ci/test-impact-v1.json'));
  const pinned=git('ls-tree','-r','--name-only','-z',b.baseCommit).split('\0').filter(Boolean);
  const files=git('ls-files','-z','tests/studio').split('\0').filter(p=>p.endsWith('.spec.ts'));
  const historical=b.quality.stages.at(-1).cases;
  const historicalFiles=sorted(historical.map(c=>c.file));
  const changes=parseChanges(git('diff','--name-status','-z','-M',base,head));
  // On a future base, review any intervening changes outside CI-only additions
  // before allowing this fixed impact map to select a narrow suite.
  const baseDrift=parseChanges(git('diff','--name-status','-z','-M',b.baseCommit,base)).flatMap(c=>c.paths).filter(p=>!(/^(?:config\/ci\/|scripts\/ci\/|tests\/ci\/|docs\/ci\/)/.test(p)||p==='.github/workflows/ci-fast.yml'));
  mkdirSync(out,{recursive:true});
  const write=(name,value)=>writeFileSync(join(out,name),JSON.stringify(value,null,2)+'\n');
  playwright(join(out,'full-discovery.json'),['--list']);
  const full=normalizeReport([json(join(out,'full-discovery.json'))],files.map(file=>({file})),'discovery');
  const parity=compareCases(historical,full,'discovery');
  write('baseline-discovery-parity.json',parity);
  const drift=[...baseDrift,...(parity.ok?[]:['studio discovery identity drift'])];
  // The map is validated against the pinned baseline, not a potentially deleted candidate file.
  const plan=classify({changes,policy,knownPaths:pinned,studioFiles:historicalFiles,drift});
  plan.requiredFullFiles=sorted(files);
  plan.testedSha=head;plan.baseSha=base;plan.baselineSha=b.baseCommit;
  plan.fullDiscoveredCases=full.length;
  plan.status='PLANNED_NOT_QUALIFIED';
  write('plan.json',plan);
  console.log(JSON.stringify(plan,null,2));
  const args=plan.selectedFiles.map(escapeRegex);
  playwright(join(out,'selected-discovery.json'),['--list',...args]);
  const selected=normalizeReport([json(join(out,'selected-discovery.json'))],files.map(file=>({file})),'discovery');
  const expected=shadowInventory(full,selected,plan);
  const baselineById=new Map(historical.map(c=>[identity(c),c]));
  const expectedOutcomes=expected.map(c=>baselineById.get(identity(c))??{...c,status:'passed'});
  write('selected-expected.json',expectedOutcomes);
  playwright(join(out,'selected-execution.json'),args);
  const actual=normalizeReport([json(join(out,'selected-execution.json'))],expectedOutcomes,'execution');
  const result=compareCases(expectedOutcomes,actual,'execution');
  write('selected-parity.json',result);
  demand(result.ok,'Selected execution parity failure: '+JSON.stringify(result));
  plan.selectedCases=expected.length;
  plan.status=plan.mode==='FULL_QUALITY_REQUIRED'?'SENTINELS_PASSED_FULL_QUALITY_STILL_REQUIRED':'TARGETED_PASSED_FULL_QUALITY_STILL_REQUIRED';
  write('plan.json',plan);
  console.log(plan.status+'; '+plan.selectedCases+' selected / '+full.length+' discovered; not release evidence');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(error){console.error('CI-02: '+error.message);process.exitCode=1;}
}
