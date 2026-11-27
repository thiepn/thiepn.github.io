// Reviewed trigger-only migration. Historical baseline remains immutable.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
const root=new URL('../../',import.meta.url);
const load=path=>readFileSync(new URL(path,root));
const manifest=JSON.parse(load('config/ci/cutover-routing-v1.json'));
const need=(v,m)=>{if(!v)throw Error(m);};
const hash=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const legacy=['hub-integration','hub-notes-integration','hub-notes-browser','hub-inbox-browser','hub-capture-browser','hub-tms60-browser','hub-workflows-browser'];
const wf=name=>'.github/workflows/'+name+'.yml';
const guard='tests/hub-account-ci-boundaries.test.mjs';
const integrated=wf('hub-public-integration-shadow');
const sorted=xs=>[...xs].sort();
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const allowed=[...legacy.map(wf),wf('quality'),guard,integrated];
export function reverseReviewedEdit(bytes,edit){
  let text=bytes.toString('utf8');
  for(const {before,after} of [...edit.patches].reverse()){
    need(typeof before==='string'&&before&&typeof after==='string'&&after&&before!==after,'Invalid patch');
    need(text.split(after).length===2,'Expected exactly one reviewed candidate anchor: '+edit.path);
    text=text.replace(after,before);
  }
  const original=Buffer.from(text,'utf8');
  need(hash(original)===edit.originalBlob,'Original blob mismatch after projection: '+edit.path);
  return original;
}
export function historicalSource(path,read=load){
  const bytes=read(path),edit=manifest.edits.find(e=>e.path===path);
  return edit?reverseReviewedEdit(bytes,edit):bytes;
}
export function verifyCutoverSources(b,read=load){
  need(manifest.schemaVersion===1&&manifest.scope==='REVIEWABLE_CUTOVER_CANDIDATE'&&manifest.activationAuthorized===false&&manifest.parent==='e4daf3f1ee23f3b46ac35da06507247356444550','Unexpected cutover review contract');
  need(equal(sorted(manifest.edits.map(e=>e.path)),sorted(allowed)),'Cutover edit inventory mismatch');
  const pins=new Map(b.sourceFiles.map(f=>[f.path,f.blob]));
  for(const e of manifest.edits){
    if(e.path!==integrated)need(pins.get(e.path)===e.originalBlob,'Historical pin mismatch: '+e.path);
    const original=historicalSource(e.path,read);
    if(e.path.startsWith('.github/workflows/')){
      const old=parse(original.toString()),now=parse(read(e.path).toString());
      // Only routing and one explicit consolidated status notice may change.
      if(e.path!==integrated)need(equal(old.jobs,now.jobs),'Original workflow job drift: '+e.path);
      need(equal(now.permissions,{contents:'read'})&&now.on.pull_request_target===undefined,'Unsafe workflow permissions: '+e.path);
      if(legacy.map(wf).includes(e.path))need(equal(now.on,{workflow_dispatch:null}),'Legacy workflows must be manual only');
      if(e.path===wf('quality')){
        need(now.name==='Quality'&&equal(now.on,{push:{branches:['main']},workflow_dispatch:null}),'Exact-main sequential Quality changed');
      }
      if(e.path===integrated){
        need(equal(sorted(Object.keys(now.on)),['pull_request','push','workflow_dispatch'])&&equal(now.on.push,{branches:['main']})&&equal(now.on.pull_request.types,['opened','synchronize','reopened','ready_for_review']),'Consolidated trigger mismatch');
        need(equal(Object.keys(now.jobs),['public-contracts'])&&now.jobs['public-contracts'].if===undefined,'Consolidated public job is not unconditional');
      }
    }
  }
  const expectedUnchanged=[wf('quality-parallel-shadow'),wf('ci-fast'),'scripts/authorize-pages-release.mjs'];
  need(equal(sorted(manifest.unchangedParentPins.map(e=>e.path)),sorted(expectedUnchanged)),'Unchanged parent inventory mismatch');
  for(const e of manifest.unchangedParentPins)need(hash(read(e.path))===e.blob,'Parent protection pin drift: '+e.path);
  const parallel=parse(read(wf('quality-parallel-shadow')).toString());
  need(equal(parallel.on.pull_request.types,['opened','synchronize','reopened','ready_for_review'])&&!parallel.on.push&&equal(parallel.permissions,{contents:'read'}),'Full PR matrix route changed');
  // Every original workflow, including independent owner suites and deploy, is
  // verified against its historical blob after exact reviewed projection.
  for(const f of b.sourceFiles.filter(x=>x.path.startsWith('.github/workflows/')))need(hash(historicalSource(f.path,read))===f.blob,'Historical workflow drift: '+f.path);
  return {scope:manifest.scope,activationAuthorized:false,legacyManual:legacy.length,pr:'FULL_PARALLEL',main:'SEQUENTIAL_QUALITY',targetedOnly:false,originalWorkflows:b.sourceFiles.filter(x=>x.path.startsWith('.github/workflows/')).length};
}
