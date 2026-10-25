import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,cpSync,rmSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {verifyPinnedRecipeMigrations,PINNED_SQL,P3_TERMINATOR_FILE,RECIPE_RELEASE_SHA} from '../scripts/release/recipe-provenance.mjs';
const repo=resolve(process.env.RECIPE_SOURCE_ROOT || 'recipe');
const original=()=>verifyPinnedRecipeMigrations(repo);
const withCopy=action=>{
  const root=mkdtempSync(join(tmpdir(),'recipe-p5-provenance-'));
  try{
    const folder=join(root,'supabase','migrations');
    mkdirSync(folder,{recursive:true});
    cpSync(join(repo,'supabase','migrations'),folder,{recursive:true,force:true});
    return action(root,folder);
  }finally{rmSync(root,{recursive:true,force:true});}
};
test('all seven unchanged original production migrations are pinned by verified git blob sha and order',()=>{
  const result=original();
  assert.equal(result.length,7);
  assert.equal(result.at(-1).file,P3_TERMINATOR_FILE);
  assert.equal(result.at(-1).requiresOwnerCorrection,true);
  assert.ok(RECIPE_RELEASE_SHA.match(/^[a-f0-9]{40}$/));
});
test('only two literal terminator bytes may be normalized; every previous byte preserved',()=>{
  const path=join(repo,'supabase','migrations',P3_TERMINATOR_FILE);
  const bytes=readFileSync(path);
  assert.deepEqual([...bytes.subarray(-5)],[36,36,59,92,110]);
  const corrected=Buffer.concat([bytes.subarray(0,-2),Buffer.from('\n')]);
  assert.equal(corrected.length,bytes.length-1);
  assert.ok(corrected.subarray(0,-1).equals(bytes.subarray(0,-2)));
  assert.notDeepEqual(corrected.subarray(-4),bytes.subarray(-4));
});
test('reject bytes replaced without changing SQL length',()=>withCopy((root,folder)=>{
  const path=join(folder,PINNED_SQL[0][0]),bytes=readFileSync(path);
  bytes[9]=bytes[9]===65?66:65;writeFileSync(path,bytes);
  assert.throws(()=>verifyPinnedRecipeMigrations(root,{requireExactCommit:false}),/Git object bytes drift/);
}));
test('reject unknown appended migration and loss of original migration',()=>withCopy((root,folder)=>{
  writeFileSync(join(folder,'20990101000000_unapproved.sql'),'select 1;');
  assert.throws(()=>verifyPinnedRecipeMigrations(root,{requireExactCommit:false}),/set, order or names drifted/);
  rmSync(join(folder,'20990101000000_unapproved.sql'));
  rmSync(join(folder,PINNED_SQL[1][0]));
  assert.throws(()=>verifyPinnedRecipeMigrations(root,{requireExactCommit:false}),/set, order or names drifted/);
}));
test('reject silently repaired owner SQL even if semantically equivalent',()=>withCopy((root,folder)=>{
  const path=join(folder,P3_TERMINATOR_FILE);
  const bytes=readFileSync(path);writeFileSync(path,Buffer.concat([bytes.subarray(0,-2),Buffer.from('\n')]));
  assert.throws(()=>verifyPinnedRecipeMigrations(root,{requireExactCommit:false}),/size drift/);
}));
test('reject renamed/reordered original migration paths',()=>withCopy((root,folder)=>{
  renameSync(join(folder,PINNED_SQL[0][0]),join(folder,'20261005000000_premature.sql'));
  assert.throws(()=>verifyPinnedRecipeMigrations(root,{requireExactCommit:false}),/set, order or names drifted/);
}));
