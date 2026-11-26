// Real narrow-change experiment. Never qualifies a release or bypasses full CI.
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBaseline,normalizeReport,compareCases} from './baseline.mjs';
import {parseChanges,classify,shadowInventory} from './fast-shadow.mjs';
import {treeDigest} from './parallel-qualification.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const need=(v,m)=>{if(!v)throw Error(m);};
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
const hash=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=a=>[...a].sort();
const key=c=>JSON.stringify([c.project,c.file,c.title]);
export function experimentChanges(contract,changes,original,current){
  need(contract.schemaVersion===1&&contract.scope==='NARROW_CHANGE_EXPERIMENT_ONLY'&&contract.activation===false&&contract.releaseEvidence===false,'Unexpected experiment scope');
  need(contract.source==='src/lib/workspace/app-personalization.ts'&&contract.expectedDomain==='launch','Unexpected experiment domain');
  need(hash(Buffer.from(original))===contract.sourceBlob,'Original source blob mismatch');
  need(original.split(contract.before).length===2&&original.replace(contract.before,contract.after)===current,'Unexpected source edit');
  const additions=changes.filter(c=>c.status==='A'&&c.paths.length===1).map(c=>c.paths[0]);
  need(equal(sorted(additions),sorted(contract.toolingAdditions)),'Unexpected experiment tooling additions');
  const relevant=changes.filter(c=>c.status!=='A');
  need(relevant.length===1&&relevant[0].status==='M'&&equal(relevant[0].paths,[contract.source]),'Unexpected source diff');
  return relevant;
}
function playwright(output,args){
  const fd=openSync(output,'w');
  try{
    const result=spawnSync('npx',['--no-install','playwright','test','-c','playwright.studio.config.ts',...args,'--reporter=json'],{cwd:root,stdio:['ignore',fd,'inherit'],env:process.env});
    if(result.error)throw result.error;
    need(result.status===0,'Playwright failed: '+output);
  }finally{closeSync(fd);}
}
function main(){
  const out=process.argv[2];need(out,'Missing evidence output directory');
  const c=read(join(root,'config/ci/narrow-experiment-v1.json'));
  const b=validateBaseline(read(join(root,'config/ci/baseline-v1.json')));
  need(c.base==='33f5aa3f0602c63987e9a3e2c5bd4bc8a521e0b2'&&c.baseTree==='f49ef245193c3e9a562727704566927ec2115a7f','Reviewed successor tree changed');
  need(git('rev-parse',c.base+'^{tree}').trim()===c.baseTree,'Pinned successor tree mismatch');
  need(process.env.GITHUB_REPOSITORY==='thiepn/thiepn.github.io'&&git('rev-parse','HEAD').trim()===process.env.GITHUB_SHA,'Unexpected tested checkout');
  git('merge-base','--is-ancestor',c.base,'HEAD');
  const original=git('show',c.base+':'+c.source),current=readFileSync(join(root,c.source),'utf8');
  const changes=parseChanges(git('diff','--name-status','-z','-M',c.base,'HEAD'));
  const sourceChanges=experimentChanges(c,changes,original,current);
  const historical=b.quality.stages.at(-1).cases;
  const policy=read(join(root,'config/ci/test-impact-v1.json'));
  const knownPaths=git('ls-tree','-r','--name-only','-z',c.base).split('\0').filter(Boolean);
  const studioFiles=[...new Set(historical.map(x=>x.file))].sort();
  const currentFiles=git('ls-files','-z','tests/studio').split('\0').filter(x=>x.endsWith('.spec.ts')).sort();
  need(equal(studioFiles,currentFiles),'Studio file drift');
  mkdirSync(out,{recursive:true});
  const save=(file,x)=>writeFileSync(join(out,file),JSON.stringify(x,null,2)+'\n');
  const build=treeDigest(join(root,'dist'));
  playwright(join(out,'full-discovery.json'),['--list']);
  const full=normalizeReport([read(join(out,'full-discovery.json'))],historical,'discovery');
  const fullParity=compareCases(historical,full,'discovery');
  need(fullParity.ok&&full.length===c.expectedFullCases,'Full discovery parity failed');
  // The historical selector itself is unchanged. The experimentally reviewed
  // base is the exact immutable merged cutover tree, not an arbitrary branch.
  const plan=classify({changes:sourceChanges,policy,knownPaths,studioFiles,drift:[]});
  need(plan.mode==='TARGETED_SHADOW'&&plan.fullQualityRequired&&plan.releaseEvidence===false&&plan.allUnitsRequired&&plan.domains.includes(c.expectedDomain),'Narrow experiment did not classify as expected');
  const selectedExpected=full.filter(x=>plan.selectedFiles.includes(x.file));
  need(selectedExpected.length===c.expectedSelectedCases,'Selected count drift: '+selectedExpected.length);
  const args=plan.selectedFiles.map(p=>p.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&')+'$');
  save('plan.json',{...plan,scope:c.scope,base:c.base,actualChanges:changes,sourceChanges,expectedFullCases:full.length,expectedSelectedCases:selectedExpected.length,build,activation:false});
  save('full-discovery-parity.json',fullParity);
  playwright(join(out,'selected-discovery.json'),['--list',...args]);
  const selected=normalizeReport([read(join(out,'selected-discovery.json'))],historical,'discovery');
  const expected=shadowInventory(full,selected,plan).map(x=>historical.find(h=>key(h)===key(x)));
  need(expected.every(Boolean),'Historical expected outcome missing');
  const started=Date.now();
  playwright(join(out,'selected-execution.json'),args);
  const seconds=(Date.now()-started)/1000;
  const actual=normalizeReport([read(join(out,'selected-execution.json'))],expected,'execution');
  const parity=compareCases(expected,actual,'execution');
  save('selected-execution-parity.json',parity);
  need(parity.ok,'Targeted execution parity failed');
  need(equal(treeDigest(join(root,'dist')),build),'Build changed during test');
  need(git('diff','--name-only','HEAD').trim()==='','Tracked source changed during qualification');
  const result={scope:c.scope,status:'TARGETED_EXPERIMENT_PASSED_FULL_QUALITY_STILL_REQUIRED',testedSha:git('rev-parse','HEAD').trim(),tree:git('rev-parse','HEAD^{tree}').trim(),base:c.base,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,build,fullCases:full.length,selectedCases:expected.length,passed:actual.filter(x=>x.status==='passed').length,skipped:actual.filter(x=>x.status==='skipped').length,targetedExecutionSeconds:seconds,releaseEvidence:false,activation:false};
  save('qualification.json',result);console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(e){console.error('Narrow experiment: '+e.message);process.exitCode=1;}
}
