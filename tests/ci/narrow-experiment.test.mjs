import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {experimentChanges} from '../../scripts/ci/narrow-experiment.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const c=JSON.parse(readFileSync(root+'config/ci/narrow-experiment-v1.json','utf8'));
const current=readFileSync(root+c.source,'utf8');
// Reverse the exact patch locally; the verifier checks the immutable blob hash.
const original=current.replace(c.after,c.before);
const changes=[{status:'M',paths:[c.source]},...c.toolingAdditions.map(p=>({status:'A',paths:[p]}))];
test('reviewed actual source diff excludes only the five exact experimental tooling additions',()=>{
  assert.deepEqual(experimentChanges(c,changes,original,current),[changes[0]]);
});
test('reject extra files, changed source scope and altered source content',()=>{
  assert.throws(()=>experimentChanges(c,[...changes,{status:'A',paths:['src/unreviewed.ts']}],original,current),/tooling additions/);
  assert.throws(()=>experimentChanges(c,[...changes,{status:'M',paths:['src/lib/hub-auth.ts']}],original,current),/source diff/);
  assert.throws(()=>experimentChanges(c,changes,original,current+'\n// unexpected'),/source edit/);
  assert.throws(()=>experimentChanges(c,changes,original+'\n',current),/blob mismatch/);
});
