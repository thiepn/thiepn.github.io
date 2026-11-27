import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {matrix,aggregate,assertContext,checkBuildManifest,treeDigest} from '../../scripts/ci/parallel-qualification.mjs';
const context={repository:'thiepn/thiepn.github.io',runId:'123',attempt:'1',testedSha:'a'.repeat(40),treeSha:'b'.repeat(40),lockSha256:'c'.repeat(64),node:'v22.22.0',platform:'linux',arch:'x64',playwright:'1.61.1'};
const build={schemaVersion:1,scope:'CI03_SHADOW_ONLY',context,archiveSha256:'d'.repeat(64),dist:{files:1,sha256:'e'.repeat(64)},discoverySha256:'f'.repeat(64)};
const expected=matrix.map((s,i)=>({project:s.project,file:'tests/studio/example.spec.ts',title:'case '+i,status:i===3?'skipped':'passed',...(i===3?{skipReason:'Chromium only'}:{})}));
const make=()=>matrix.map((s,i)=>{
  const c=expected[i],skipped=c.status==='skipped';
  return {meta:{schemaVersion:1,scope:'CI03_SHADOW_ONLY',...s,context:{...context},archiveSha256:build.archiveSha256,distSha256:build.dist.sha256,discoverySha256:build.discoverySha256},discovery:[{...c}],execution:[{...c,expectedStatus:c.status,outcome:skipped?'skipped':'expected',durationMs:skipped?0:10,skipReasons:skipped?[c.skipReason]:[]}]};
});
test('matrix aggregate preserves unique inventory and documented skips',()=>{
  checkBuildManifest(build,context);
  const result=aggregate(build,make(),expected);
  assert.equal(result.expected,4);assert.equal(result.passed,3);assert.equal(result.skipped,1);assert.equal(result.releaseEvidence,false);
  assert(result.discoveryParity.ok&&result.executionParity.ok);
});
test('missing, duplicate, or extra matrix artifacts cannot qualify',()=>{
  assert.throws(()=>aggregate(build,make().slice(1),expected),/Missing or extra/);
  const duplicate=make();duplicate[3]=duplicate[2];assert.throws(()=>aggregate(build,duplicate,expected),/Missing or duplicate/);
  assert.throws(()=>aggregate(build,[...make(),make()[0]],expected),/Missing or extra/);
});
test('reject wrong run, attempt, tested commit, tree, lockfile, or browser toolchain',()=>{
  for(const f of ['runId','attempt','testedSha','treeSha','lockSha256','playwright','node','platform','arch','repository']){
    const slots=make();slots[0].meta.context[f]='wrong';
    assert.throws(()=>aggregate(build,slots,expected),/Context mismatch/);
  }
  assert.throws(()=>assertContext({...context,runId:'0'},{...context,runId:'0'}),/Invalid run/);
});
test('reject wrong shared build, discovery artifact, matrix slot and project',()=>{
  for(const f of ['archiveSha256','distSha256','discoverySha256','project','shard']){
    const slots=make();slots[0].meta[f]='wrong';
    assert.throws(()=>aggregate(build,slots,expected),/Wrong/);
  }
  const slots=make();slots[0].discovery[0].project='webkit';
  assert.throws(()=>aggregate(build,slots,expected),/wrong-project/);
});
test('reject cross-shard overlap, missed test, unexpected case or empty shard',()=>{
  const overlap=make();overlap[3].discovery=overlap[2].discovery;overlap[3].execution=overlap[2].execution;
  assert.throws(()=>aggregate(build,overlap,expected),/Duplicate/);
  const empty=make();empty[0].discovery=[];assert.throws(()=>aggregate(build,empty,expected),/Empty/);
  const added=make();added[0].discovery[0].title='not in baseline';assert.throws(()=>aggregate(build,added,expected),/Unknown shard test/);
  const missed=[...expected,{...expected[0],title:'missing'}];assert.throws(()=>aggregate(build,make(),missed),/Full matrix discovery parity failed/);
});
test('reject failed tests, newly skipped cases, changed skip reasons and absent execution',()=>{
  for(const status of ['failed','skipped','timedOut','interrupted']){
    const slots=make();slots[0].execution[0].status=status;assert.throws(()=>aggregate(build,slots,expected),/execution parity failed/);
  }
  const skip=make();skip[3].execution[0].skipReasons=['different'];assert.throws(()=>aggregate(build,skip,expected),/execution parity failed/);
  const no=make();no[0].execution=[];assert.throws(()=>aggregate(build,no,expected),/execution parity failed/);
});
test('build digest is deterministic, path/content-sensitive and rejects symlinks',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ci03-build-'));
  try{
    assert.throws(()=>treeDigest(dir),/Empty/);
    mkdirSync(join(dir,'nested'));writeFileSync(join(dir,'nested','a'),'alpha');writeFileSync(join(dir,'b'),'beta');
    const original=treeDigest(dir);assert.equal(original.files,2);assert.deepEqual(treeDigest(dir),original);
    writeFileSync(join(dir,'b'),'BETA');assert.notEqual(treeDigest(dir).sha256,original.sha256);
    symlinkSync(join(dir,'b'),join(dir,'link'));assert.throws(()=>treeDigest(dir),/Unexpected build file type/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
