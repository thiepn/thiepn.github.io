import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {matrix,aggregate} from '../../scripts/ci/parallel-qualification.mjs';
const load=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const original=parse(load('.github/workflows/quality.yml'));
const shadow=parse(load('.github/workflows/quality-parallel-shadow.yml'));
const baseline=JSON.parse(load('config/ci/baseline-v1.json'));
const commands=j=>j.steps.flatMap(s=>(s.run??'').split('\n').filter(Boolean));
test('parallel shadow retains original source, browser and final gates without production privileges',()=>{
  assert.deepEqual(shadow.permissions,{contents:'read'});
  assert(!Object.hasOwn(shadow.on,'pull_request_target'));
  assert(!Object.hasOwn(shadow.on,'push'));
  assert.notEqual(shadow.name,original.name);
  const jobs=shadow.jobs;
  assert.deepEqual(jobs.browser.strategy.matrix.include,matrix);
  assert.equal(jobs.browser.strategy['fail-fast'],false);
  assert.equal(jobs.browser.needs,'prepare');
  assert.deepEqual(jobs.qualification.needs,['prepare','browser']);
  assert.equal(jobs.qualification.if,'always()');
  const pre=commands(jobs.prepare),post=commands(jobs.qualification);
  const originalCommands=commands(original.jobs.quality);
  for(const command of originalCommands){
    if(command==='npm run audit:studio')continue;
    if(command.startsWith('npx playwright test ')){
      const adapted=command.replace('npx playwright','npx --no-install playwright')+' --reporter=json';
      assert(pre.some(c=>c.startsWith(adapted)),command);
      continue;
    }
    if(command==='node --test tests/release-project-availability.test.mjs && npm run release:source'){
      assert(pre.includes('node --test tests/release-project-availability.test.mjs')&&pre.includes('npm run release:source'));
      continue;
    }
    assert([...pre,...post].includes(command),command);
  }
  for(const command of baseline.packageScripts['audit:studio'].split(' && ')){
    if(command==='npm run test:e2e')continue;
    assert(pre.includes(command),command);
  }
  assert.equal(pre.filter(c=>c==='npm run build').length,1);
  assert(post.includes('test "$PREPARE_RESULT" = success')&&post.includes('test "$MATRIX_RESULT" = success'));
  const raw=load('.github/workflows/quality-parallel-shadow.yml');
  assert.doesNotMatch(raw,/secrets\.|pages:\s*write|id-token:\s*write|deploy-pages|pull_request_target|continue-on-error|git push/);
  for(const job of Object.values(jobs)){
    assert.equal(job.permissions,undefined);
    const checkout=job.steps.find(s=>s.uses?.startsWith('actions/checkout@'));
    assert.equal(checkout.with.ref,'\${{ github.sha }}'.replace('\\',''));
    assert.equal(checkout.with['persist-credentials'],false);
  }
});
test('full historical 1206-case inventory survives exact four-slot partition',()=>{
  const expected=baseline.quality.stages.at(-1).cases;
  const context={repository:'thiepn/thiepn.github.io',runId:'123',attempt:'1',testedSha:'a'.repeat(40),treeSha:'b'.repeat(40),lockSha256:'c'.repeat(64),node:'v22.22.0',platform:'linux',arch:'x64',playwright:'1.61.1'};
  const build={context,archiveSha256:'d'.repeat(64),dist:{sha256:'e'.repeat(64)},discoverySha256:'f'.repeat(64)};
  const slots=matrix.map(s=>{
    const cases=expected.filter(c=>c.project===s.project);
    const selected=s.project==='webkit'?cases.slice(s.id==='webkit-1'?0:201,s.id==='webkit-1'?201:402):cases;
    return {meta:{schemaVersion:1,scope:'CI03_SHADOW_ONLY',...s,context,archiveSha256:build.archiveSha256,distSha256:build.dist.sha256,discoverySha256:build.discoverySha256},discovery:selected,execution:selected.map(c=>({...c,expectedStatus:c.status,outcome:c.status==='skipped'?'skipped':'expected',durationMs:c.durationMs??0,skipReasons:c.skipReason?[c.skipReason]:[]}))};
  });
  const result=aggregate(build,slots,expected);
  assert.equal(result.expected,1206);assert.equal(result.passed,1202);assert.equal(result.skipped,4);
  assert.deepEqual(result.shards.map(s=>s.expected),[402,402,201,201]);
});
