import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseChanges,classify,validatePolicy,shadowInventory} from '../../scripts/ci/fast-shadow.mjs';
const policy=JSON.parse(readFileSync(new URL('../../config/ci/test-impact-v1.json',import.meta.url),'utf8'));
const baseline=JSON.parse(readFileSync(new URL('../../config/ci/baseline-v1.json',import.meta.url),'utf8'));
const studioFiles=[...new Set(baseline.quality.stages.at(-1).cases.map(c=>c.file))];
const knownPaths=[...studioFiles,...baseline.sourceFiles.map(c=>c.path),...Object.values(policy.domains).flatMap(d=>d.paths),'src/lib/office/authoring.ts','src/scripts/workspace-home.ts','src/lib/hub-auth.ts','src/styles/global.css','README.md'];
const p=(paths,drift=[])=>classify({changes:paths.map(path=>({status:'M',paths:[path]})),policy,knownPaths,studioFiles,drift});
test('NUL diff includes both rename paths and rejects truncation or unsafe input',()=>{
  assert.deepEqual(parseChanges('M\0src/x.ts\0R100\0old.ts\0new.ts\0D\0gone.ts\0'),[{status:'M',paths:['src/x.ts']},{status:'R100',paths:['old.ts','new.ts']},{status:'D',paths:['gone.ts']}]);
  assert.deepEqual(parseChanges(''),[]);
  for(const input of ['M\0x','R100\0a\0','M\0../escape\0','Q\0x\0','M\0bad\nname\0'])assert.throws(()=>parseChanges(input));
});
test('known planner CSS correction includes continuity and transitive affected domains',()=>{
  const plan=p(['src/styles/workspace-unified-h20.css']);
  assert.equal(plan.mode,'TARGETED_SHADOW');
  for(const name of ['hub-continuity','workspace','daily-home','hub-calendar-c1','hub-sync','hub-shortcuts','hub-notes-device','office-writing-first'])assert(plan.selectedFiles.includes('tests/studio/'+name+'.spec.ts'),name);
  assert(!plan.selectedFiles.includes('tests/studio/office-documents.spec.ts'));
  assert.equal(plan.fullQualityRequired,true);assert.equal(plan.releaseEvidence,false);assert.equal(plan.allUnitsRequired,true);
});
test('Office-specific changes include the large Office suite and Account protection',()=>{
  const plan=p(['src/lib/office/authoring.ts']);
  assert.equal(plan.mode,'TARGETED_SHADOW');
  for(const name of ['office-documents','office-writing-first','hub-sync','hub-continuity'])assert(plan.selectedFiles.includes('tests/studio/'+name+'.spec.ts'));
});
test('shared runtime, security, lockfile and unknown paths fail conservatively',()=>{
  for(const path of ['src/scripts/workspace-home.ts','src/lib/hub-auth.ts','src/styles/global.css','package-lock.json','.github/workflows/quality.yml','src/lib/office/new-unreviewed.ts','tests/studio/launch-fixture.ts']){
    const plan=p([path]);assert.equal(plan.mode,'FULL_QUALITY_REQUIRED',path);assert.deepEqual(plan.requiredFullFiles,[...studioFiles].sort());assert(plan.fallback.length>0);
  }
});
test('additions, deletions, renames, copies and baseline drift require full Quality',()=>{
  for(const status of ['A','D','R100','C90','T','U']){
    const plan=classify({changes:[{status,paths:['src/styles/workspace.css',...(status.startsWith('R')||status.startsWith('C')?['src/styles/other.css']:[])]}],policy,knownPaths,studioFiles});
    assert.equal(plan.mode,'FULL_QUALITY_REQUIRED');
  }
  assert.equal(p(['README.md'],['studio discovery identity drift']).mode,'FULL_QUALITY_REQUIRED');
});
test('selection is deterministic across changes and dependency cycles terminate',()=>{
  const paths=['src/styles/workspace-unified-h20.css','src/lib/office/authoring.ts'];
  assert.deepEqual(p(paths).selectedFiles,p(paths.reverse()).selectedFiles);
  const cyclic=structuredClone(policy);cyclic.domains.account.dependsOn=['shell'];
  const result=classify({changes:[{status:'M',paths:['src/styles/workspace.css']}],policy:cyclic,knownPaths,studioFiles});
  assert.equal(result.mode,'TARGETED_SHADOW');
  const bad=structuredClone(policy);bad.domains.shell.dependsOn.push('missing');
  assert.throws(()=>validatePolicy(bad,knownPaths,studioFiles),/Unknown domain dependency/);
});
test('changed existing studio test is included, unit-only changes still run sentinels',()=>{
  assert(p(['tests/studio/office-documents.spec.ts']).selectedFiles.includes('tests/studio/office-documents.spec.ts'));
  const unit=p(['tests/unit/hub-account.test.ts']);assert.equal(unit.allUnitsRequired,true);assert.equal(unit.mode,'TARGETED_SHADOW');
});
test('shadow coverage rejects missing, duplicated, extra and absent-browser discovery',()=>{
  const full=baseline.quality.stages.at(-1).cases;
  const plan=p(['tests/studio/hub-continuity.spec.ts']);
  const selected=full.filter(c=>plan.selectedFiles.includes(c.file));
  assert.equal(shadowInventory(full,selected,plan).length,selected.length);
  assert.throws(()=>shadowInventory(full,selected.slice(1),plan),/mismatch/);
  assert.throws(()=>shadowInventory(full,[...selected,selected[0]],plan),/Duplicate/);
  assert.throws(()=>shadowInventory(full,[...selected,full.find(c=>!plan.selectedFiles.includes(c.file))],plan),/mismatch/);
  assert.throws(()=>shadowInventory(full.filter(c=>c.project!=='webkit'),selected.filter(c=>c.project!=='webkit'),plan),/missing browser/);
});
