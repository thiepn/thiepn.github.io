import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import {validateManifest,inspectOriginal,verifyReport} from '../../scripts/ci/public-integration.mjs';
import {historicalSource,verifyCutoverSources} from '../../scripts/ci/cutover-source.mjs';
const load=p=>readFileSync(new URL('../../'+p,import.meta.url));
const m=JSON.parse(load('config/ci/public-integration-v1.json'));
const baseline=JSON.parse(load('config/ci/baseline-v1.json'));
const original=c=>parse(historicalSource('.github/workflows/'+c.workflow).toString());
const clone=structuredClone;
const root='/checkout';
const fixture=()=>{
  const files=validateManifest(m);
  const total=Object.values(m.expectedCounts).reduce((n,v)=>n+v,0);
  return {success:true,numTotalTests:total,numPassedTests:total,numFailedTests:0,numPendingTests:0,numTodoTests:0,testResults:files.map(file=>{
    const count=m.expectedCounts[file.slice('tests/unit/'.length,-'.test.ts'.length)];
    return {name:root+'/'+file,status:'passed',assertionResults:Array.from({length:count},(_,i)=>({fullName:file==='tests/unit/hub-account.test.ts'&&i<4?'H10 code callback boundary rejects invalid codes':file+' assertion '+i,status:'passed'}))};
  })};
};
test('seven original public contracts reduce to exactly eight distinct files and 128 observed tests',()=>{
  const files=validateManifest(m);
  assert.equal(m.contracts.length,7);assert.equal(files.length,8);
  assert.equal(Object.values(m.expectedCounts).reduce((n,v)=>n+v,0),128);
  const logical=m.contracts.reduce((n,c)=>n+c.files.reduce((k,f)=>k+m.expectedCounts[f],0),0);
  assert.equal(logical,217);
  const invalid=clone(m);invalid.contracts.pop();assert.throws(()=>validateManifest(invalid),/Missing or reordered/);
  const extra=clone(m);extra.expectedCounts.extra=1;assert.throws(()=>validateManifest(extra),/Unexpected unique/);
});
test('all original workflow and contract-source pins remain exact after reviewed routing projection',()=>{
  verifyCutoverSources(baseline);
  const paths=[...baseline.sourceFiles.filter(f=>f.path.startsWith('.github/workflows/')).map(f=>f.path),...validateManifest(m),'tests/hub-account-ci-boundaries.test.mjs','package.json','package-lock.json'];
  assert.equal(paths.length,38);
  for(const path of paths){
    const bytes=historicalSource(path),actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(actual,baseline.sourceFiles.find(f=>f.path===path)?.blob,path);
  }
});
test('public source mapping matches original job commands, Node profile, and private pin conditions',()=>{
  const inventories=m.contracts.map(c=>inspectOriginal(c,original(c)));
  assert.equal(inventories.length,7);
  assert(inventories.every(c=>c.privateStatus==='NOT_EXECUTED'&&c.privatePins.length>0));
  assert.equal(inventories.find(c=>c.id==='cross-app').privatePins.length,3);
  assert.equal(inventories.find(c=>c.id==='tms60').privatePins.length,2);
});
test('reject public contract drift, trigger widening, or re-enabled private owner',()=>{
  const c=m.contracts[0];
  let y=original(c);y.jobs[c.disabledJob].if=true;assert.throws(()=>inspectOriginal(c,y),/Private execution enabled/);
  y=original(c);y.permissions.contents='write';assert.throws(()=>inspectOriginal(c,y),/permissions/);
  y=original(c);y.jobs['public-contract'].steps[4].run='npx vitest run tests/unit/hub-providers.test.ts';assert.throws(()=>inspectOriginal(c,y),/test selection/);
  y=original(c);y.jobs['public-contract'].steps[1].with['node-version']='22';assert.throws(()=>inspectOriginal(c,y),/Node profile/);
  y=original(c);y.on.push.branches=['*'];assert.throws(()=>inspectOriginal(c,y),/trigger drift/);
  y=original(c);y.jobs[c.disabledJob].steps.find(s=>s.with?.repository).with.ref='main';assert.throws(()=>inspectOriginal(c,y),/pin or credentials/);
});
test('single execution yields seven public statuses and never private qualification',()=>{
  const report=verifyReport(fixture(),m,root);
  assert.equal(report.uniqueTests,128);assert.equal(report.uniqueFiles,8);
  assert.equal(report.contracts.length,7);
  assert(report.contracts.every(c=>c.publicStatus==='PASSED'&&c.privateStatus==='NOT_EXECUTED'));
  assert.equal(report.contracts.find(c=>c.id==='notes-owner').passed,59);
  assert.equal(report.contracts.find(c=>c.id==='cross-app').passed,20);
  assert.equal(report.releaseEvidence,false);
});
test('reject missing, duplicate, or unexpected report suites and assertion identities',()=>{
  let r=fixture();r.testResults.pop();assert.throws(()=>verifyReport(r,m,root),/Incomplete suite/);
  r=fixture();r.testResults.push(r.testResults[0]);assert.throws(()=>verifyReport(r,m,root),/duplicate suite/);
  r=fixture();r.testResults[0].name='/untrusted/tests/unit/hub-account.test.ts';assert.throws(()=>verifyReport(r,m,root),/Unexpected or duplicate suite/);
  r=fixture();r.testResults[0].assertionResults[4].fullName=r.testResults[0].assertionResults[5].fullName;assert.throws(()=>verifyReport(r,m,root),/duplicate assertion/);
  r=fixture();r.testResults[0].assertionResults.pop();assert.throws(()=>verifyReport(r,m,root),/assertion count/);
});
test('reject failed, skipped, todo, or incomplete executions despite successful file selection',()=>{
  for(const status of ['failed','skipped','pending','todo']){
    const r=fixture();r.testResults[0].assertionResults[0].status=status;
    assert.throws(()=>verifyReport(r,m,root),/Unexpected assertion outcome/);
  }
  let r=fixture();r.success=false;assert.throws(()=>verifyReport(r,m,root),/unsuccessful/);
  for(const field of ['numFailedTests','numPendingTests','numTodoTests']){
    r=fixture();r[field]=1;assert.throws(()=>verifyReport(r,m,root),/aggregate mismatch/);
  }
});
test('consolidated workflow has only the unprivileged public job and explicit non-release status',()=>{
  const raw=load('.github/workflows/hub-public-integration-shadow.yml').toString(),y=parse(raw);
  assert.deepEqual(y.permissions,{contents:'read'});
  assert.deepEqual(Object.keys(y.on).sort(),['pull_request','push','workflow_dispatch']);
  assert.deepEqual(y.on.push,{branches:['main']});
  assert.deepEqual(Object.keys(y.jobs),['public-contracts']);
  const job=y.jobs['public-contracts'];
  assert.equal(job.if,undefined);assert.equal(job.permissions,undefined);
  const steps=job.steps;
  assert.equal(steps[0].uses,'actions/checkout@v4');
  assert.deepEqual(steps[0].with,{ref:'$'+'{{ github.sha }}','persist-credentials':false});
  assert.equal(steps[1].with['node-version'],'24');
  const cmds=steps.flatMap(s=>s.run?[s.run]:[]);
  assert.equal(cmds.filter(s=>s==='npm ci --no-audit --no-fund').length,1);
  assert.equal(cmds.filter(s=>s==='node --test tests/hub-account-ci-boundaries.test.mjs').length,1);
  assert.equal(cmds.filter(s=>s.startsWith('node scripts/ci/public-integration.mjs run ')).length,1);
  assert.doesNotMatch(raw,/secrets\.|pages:\s*write|id-token:\s*write|deploy-pages|pull_request_target|continue-on-error|git push|repository:\s*thiepn\//);
  assert(raw.includes('NOT_EXECUTED'));
});

test('preserve exactly four known parameterized Account cases with repeated display names',()=>{
  const name='H10 code callback boundary rejects invalid codes';
  const file='tests/unit/hub-account.test.ts';
  const result=verifyReport(fixture(),m,root).files.find(f=>f.file===file);
  assert.deepEqual(result.identities.filter(x=>x.fullName===name).map(x=>x.occurrence),[1,2,3,4]);
  const fewer=fixture();fewer.testResults[0].assertionResults[0].fullName='different unique name';
  assert.throws(()=>verifyReport(fewer,m,root),/multiplicity mismatch/);
  const more=fixture();more.testResults[0].assertionResults[4].fullName=name;
  assert.throws(()=>verifyReport(more,m,root),/duplicate assertion/);
});
