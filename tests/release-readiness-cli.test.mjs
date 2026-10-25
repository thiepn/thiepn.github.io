import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const root=fileURLToPath(new URL('../',import.meta.url));
const cli=fileURLToPath(new URL('../scripts/release-readiness.mjs',import.meta.url));
const preload=fileURLToPath(new URL('./fixtures/release-readiness-http.mjs',import.meta.url));

function run(app,scenario=app,extra=[],env={}){
 const run=spawnSync(process.execPath,['--import',preload,cli,'--app',app,'--json',...extra],{
  cwd:root,encoding:'utf8',timeout:12000,
  env:{...process.env,GITHUB_TOKEN:'fixture-not-real',CLOUDFLARE_API_TOKEN:'fixture-not-real',
   CLOUDFLARE_ACCOUNT_ID:'fixture-account',THIEPN_RELEASE_TEST_FIXTURE:scenario,...env}
 });
 assert.equal(run.error,undefined,run.error?.message);
 assert(run.stdout.trim(),`CLI produced no JSON: ${run.stderr}`);
 return {exit:run.status,output:JSON.parse(run.stdout),stderr:run.stderr};
}

test('TMS60 CLI follows real production snapshot, rejects unrelated exact-SHA successful workflows',()=>{
 const r=run('tms60');
 assert.equal(r.exit,2);
 assert.equal(r.output.decision,'HOLD');
 assert.equal(r.output.deployedSha,'12343b974417c3ba23b64f592961c151e52f7ede');
 assert.equal(r.output.provenance.deploymentId,'24c8b827-b6a8-42bc-8c16-a2b1c14ed4be');
 assert.equal(r.output.gates.identity.state,'PASS');
 assert.equal(r.output.gates.deployment.state,'PASS');
 assert.equal(r.output.gates.ci.state,'NOT_TESTED');
 assert.equal(r.output.gates.live.state,'NOT_TESTED');
 assert.equal(r.output.gates.journeys.state,'NOT_TESTED');
 assert.equal(r.output.gates.review.state,'NOT_TESTED');
});

test('ROOMTONE CLI follows production snapshot without promoting missing CI or hardware evidence',()=>{
 const r=run('roomtone-karaoke');
 assert.equal(r.exit,2);
 assert.equal(r.output.decision,'HOLD');
 assert.equal(r.output.deployedSha,'0503e5c500d9e69f72cb75d3ed1e04d49ed8fd35');
 assert.equal(r.output.provenance.deploymentId,'2995c7f3-94a9-4385-8cb0-05f2a165981e');
 assert.deepEqual([r.output.gates.identity.state,r.output.gates.deployment.state],['PASS','PASS']);
 assert.deepEqual([r.output.gates.ci.state,r.output.gates.live.state,r.output.gates.journeys.state,r.output.gates.review.state],
  ['NOT_TESTED','NOT_TESTED','NOT_TESTED','NOT_TESTED']);
});

test('CLI blocks wrong repository identity even with otherwise successful deployment',()=>{
 const r=run('tms60','wrong-repository');
 assert.equal(r.exit,1);
 assert.equal(r.output.decision,'BLOCKED');
 assert.equal(r.output.gates.identity.state,'FAIL');
});

test('CLI blocks a genuine HTTP 500 rather than misreporting it as untested',()=>{
 const r=run('tms60','http-failure');
 assert.equal(r.exit,1);
 assert.equal(r.output.gates.live.state,'FAIL');
 assert.equal(r.output.decision,'BLOCKED');
});

test('CLI fails closed for unavailable provider without a fabricated production SHA',()=>{
 const r=run('tms60','offline');
 assert.equal(r.exit,2);
 assert.equal(r.output.deployedSha,null);
 assert.equal(r.output.gates.identity.state,'NOT_TESTED');
 assert.equal(r.output.gates.deployment.state,'NOT_TESTED');
 assert.equal(r.output.decision,'HOLD');
 assert(r.output.limitations.some(x=>x.includes('Mock network inaccessible')));
});

test('CLI writes reproducible JSON report only to explicitly requested file',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'thiepn-readiness-'));
 try {
  const target=path.join(dir,'assessment.json');
  const r=run('tms60','tms60',['--out',target]);
  assert.equal(r.exit,2);
  assert.deepEqual(JSON.parse(fs.readFileSync(target,'utf8')),r.output);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
