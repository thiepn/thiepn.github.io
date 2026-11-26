// CI-03 shadow qualification. Artifacts are same-run evidence, never release credentials.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync,lstatSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBaseline,normalizeReport,compareCases} from './baseline.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const need=(v,m)=>{if(!v)throw new Error(m);};
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hash=/^[a-f0-9]{64}$/;
export const matrix=Object.freeze([
  {id:'chromium-1',project:'chromium',shard:'1/1'},
  {id:'firefox-1',project:'firefox',shard:'1/1'},
  {id:'webkit-1',project:'webkit',shard:'1/2'},
  {id:'webkit-2',project:'webkit',shard:'2/2'}
].map(Object.freeze));
const fields=['repository','runId','attempt','testedSha','treeSha','lockSha256','node','platform','arch','playwright'];
const id=c=>JSON.stringify([c.project,c.file,c.title]);

export function assertContext(actual,expected){
  need(actual&&expected,'Missing context');
  for(const f of fields)need(typeof expected[f]==='string'&&expected[f].length>0&&actual[f]===expected[f],'Context mismatch: '+f);
  need(actual.repository==='thiepn/thiepn.github.io','Unexpected repository');
  need(/^[1-9]\d*$/.test(actual.runId)&&/^[1-9]\d*$/.test(actual.attempt),'Invalid run identity');
  need(/^[a-f0-9]{40}$/.test(actual.testedSha)&&/^[a-f0-9]{40}$/.test(actual.treeSha)&&hash.test(actual.lockSha256),'Invalid source identity');
}
function context(){
  const c={repository:process.env.GITHUB_REPOSITORY,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,testedSha:git('rev-parse','HEAD'),treeSha:git('rev-parse','HEAD^{tree}'),lockSha256:digest(join(root,'package-lock.json')),node:process.version,platform:process.platform,arch:process.arch,playwright:read(join(root,'node_modules/@playwright/test/package.json')).version};
  assertContext(c,c);
  need(c.testedSha===process.env.GITHUB_SHA,'Checkout differs from tested workflow SHA');
  need(git('diff','--name-only','HEAD')==='','Tracked source changed during qualification');
  return c;
}
export function treeDigest(dir){
  need(lstatSync(dir).isDirectory(),'Build directory missing');
  const records=[];
  const visit=(folder,prefix='')=>{
    for(const name of readdirSync(folder).sort()){
      const full=join(folder,name),relative=prefix+name,stat=lstatSync(full);
      if(stat.isDirectory())visit(full,relative+'/');
      else{need(stat.isFile(),'Unexpected build file type: '+relative);records.push([relative,stat.size,digest(full)]);}
    }
  };
  visit(dir);
  need(records.length>0,'Empty build output');
  return {files:records.length,sha256:createHash('sha256').update(JSON.stringify(records)).digest('hex')};
}
function baseline(){return validateBaseline(read(join(root,'config/ci/baseline-v1.json'))).quality.stages.at(-1).cases;}
function assertParity(expected,actual,mode,label){
  const parity=compareCases(expected,actual,mode);
  need(parity.ok,label+' '+mode+' parity failed: '+JSON.stringify(parity));
  return parity;
}
export function checkBuildManifest(manifest,expectedContext){
  need(manifest?.schemaVersion===1&&manifest.scope==='CI03_SHADOW_ONLY','Invalid build manifest');
  assertContext(manifest.context,expectedContext);
  need(hash.test(manifest.archiveSha256)&&hash.test(manifest.dist?.sha256)&&Number.isInteger(manifest.dist.files)&&manifest.dist.files>0,'Invalid build digest');
  need(hash.test(manifest.discoverySha256),'Missing discovery digest');
}
export function verifyShard(meta,build,slot,discovery,execution,expected){
  need(meta?.schemaVersion===1&&meta.scope==='CI03_SHADOW_ONLY','Invalid shard manifest');
  assertContext(meta.context,build.context);
  need(meta.id===slot.id&&meta.project===slot.project&&meta.shard===slot.shard,'Wrong matrix slot: '+slot.id);
  need(meta.archiveSha256===build.archiveSha256&&meta.distSha256===build.dist.sha256&&meta.discoverySha256===build.discoverySha256,'Wrong shared build: '+slot.id);
  need(Array.isArray(discovery)&&discovery.length>0&&discovery.every(c=>c.project===slot.project),'Empty or wrong-project shard: '+slot.id);
  const byId=new Map(expected.map(c=>[id(c),c]));
  const selected=discovery.map(c=>{const known=byId.get(id(c));need(known,'Unknown shard test: '+id(c));return known;});
  assertParity(selected,discovery,'discovery',slot.id);
  assertParity(selected,execution,'execution',slot.id);
  return {id:slot.id,project:slot.project,shard:slot.shard,expected:selected.length,passed:execution.filter(c=>c.status==='passed').length,skipped:execution.filter(c=>c.status==='skipped').length,durationMs:execution.reduce((n,c)=>n+c.durationMs,0)};
}
export function aggregate(build,slots,expected){
  need(Array.isArray(slots)&&slots.length===matrix.length,'Missing or extra matrix slots');
  const summaries=[],allDiscovery=[],allExecution=[],seen=new Set();
  for(const slot of matrix){
    const matches=slots.filter(s=>s.meta.id===slot.id);
    need(matches.length===1,'Missing or duplicate shard: '+slot.id);
    const s=matches[0];
    need(!seen.has(s.meta.id),'Duplicate shard');seen.add(s.meta.id);
    summaries.push(verifyShard(s.meta,build,slot,s.discovery,s.execution,expected));
    allDiscovery.push(...s.discovery);allExecution.push(...s.execution);
  }
  const discoveryParity=assertParity(expected,allDiscovery,'discovery','Full matrix');
  const executionParity=assertParity(expected,allExecution,'execution','Full matrix');
  return {scope:'CI03_SHADOW_ONLY',releaseEvidence:false,expected:expected.length,passed:allExecution.filter(c=>c.status==='passed').length,skipped:allExecution.filter(c=>c.status==='skipped').length,discoveryParity,executionParity,shards:summaries};
}
function readBuild(dir,checkArchive=true){
  const b=read(join(dir,'build.json'));
  checkBuildManifest(b,context());
  need(digest(join(dir,'full-discovery.json'))===b.discoverySha256,'Full discovery artifact changed');
  assertParity(baseline(),normalizeReport([read(join(dir,'full-discovery.json'))],baseline(),'discovery'),'discovery','Shared discovery');
  if(checkArchive)need(digest(join(dir,'dist.tar.gz'))===b.archiveSha256,'Build archive digest mismatch');
  return b;
}
function verifyDist(b){
  const d=treeDigest(join(root,'dist'));
  need(d.sha256===b.dist.sha256&&d.files===b.dist.files,'Extracted build tree mismatch');
}
function loadSlot(dir,build,slot,expected){
  const meta=read(join(dir,'shard.json'));
  need(digest(join(dir,'discovery.json'))===meta.listSha256&&digest(join(dir,'execution.json'))===meta.reportSha256,'Shard report digest mismatch: '+slot.id);
  const discovery=normalizeReport([read(join(dir,'discovery.json'))],expected,'discovery');
  const execution=normalizeReport([read(join(dir,'execution.json'))],expected,'execution');
  verifyShard(meta,build,slot,discovery,execution,expected);
  return {meta,discovery,execution};
}
function main(){
  const [command,buildDir,arg,output]=process.argv.slice(2);
  need(buildDir,'Missing build evidence directory');
  const expected=baseline();
  if(command==='prepare'){
    const ctx=context();
    const discovery=normalizeReport([read(join(buildDir,'full-discovery.json'))],expected,'discovery');
    assertParity(expected,discovery,'discovery','Build discovery');
    const b={schemaVersion:1,scope:'CI03_SHADOW_ONLY',context:ctx,dist:treeDigest(join(root,'dist')),archiveSha256:digest(join(buildDir,'dist.tar.gz')),discoverySha256:digest(join(buildDir,'full-discovery.json'))};
    checkBuildManifest(b,ctx);write(join(buildDir,'build.json'),b);console.log(JSON.stringify(b));
  }else if(command==='verify-build'){
    readBuild(buildDir);console.log('Shared build manifest and archive verified');
  }else if(command==='verify-dist'){
    verifyDist(readBuild(buildDir));console.log('Shared build tree verified');
  }else if(command==='seal'){
    const slot=matrix.find(s=>s.id===arg);need(slot&&output,'Unknown slot or missing report directory');
    const b=readBuild(buildDir);verifyDist(b);
    const meta={schemaVersion:1,scope:'CI03_SHADOW_ONLY',...slot,context:context(),archiveSha256:b.archiveSha256,distSha256:b.dist.sha256,discoverySha256:b.discoverySha256,listSha256:digest(join(output,'discovery.json')),reportSha256:digest(join(output,'execution.json'))};
    write(join(output,'shard.json'),meta);
    const s=loadSlot(output,b,slot,expected);
    console.log(JSON.stringify(verifyShard(s.meta,b,slot,s.discovery,s.execution,expected)));
  }else if(command==='aggregate'){
    need(arg&&output,'Missing shard root or output');
    const b=readBuild(buildDir);verifyDist(b);
    const names=readdirSync(arg).sort();
    need(JSON.stringify(names)===JSON.stringify(matrix.map(s=>s.id).sort()),'Missing or unexpected shard artifact directory');
    const slots=matrix.map(s=>loadSlot(join(arg,s.id),b,s,expected));
    const result=aggregate(b,slots,expected);
    write(output,{...result,context:b.context,buildDigest:b.dist.sha256,status:'BROWSER_PARITY_PASSED_FINAL_GATES_STILL_REQUIRED'});
    console.log(JSON.stringify(result,null,2));
  }else throw new Error('Unknown CI-03 command');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(e){console.error('CI-03: '+e.message);process.exitCode=1;}
}
