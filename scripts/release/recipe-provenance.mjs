import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

export const RECIPE_RELEASE_SHA='b9cf98453a017145d36c7d0ebb6c8b3054a8fd5b';
export const PINNED_SQL=Object.freeze([
  ['20261006082742_recipe_p1_domain_foundation.sql','8b008b1726094bfe17b4be3a150e585d1553789c',18113],
  ['20261006082826_recipe_p1_fk_index_hardening.sql','60c223f1fd2442a8e6aeaaea0cd6880c547a81ca',1673],
  ['20261006092205_recipe_p2_identity_sync_gateway.sql','91b961586c2b0697b2128731ced2a2e50470e43b',26961],
  ['20261006150337_recipe_p2_validation_error_hardening.sql','1c9564f513091aa5b22394df302d9580cf2b77ae',964],
  ['20261006155910_recipe_p3_collection_book.sql','c7f26cb8ddc74c97db6f6f112b43ee6c9a9ff95b',9490],
  ['20261006162350_recipe_p3_collection_lifecycle_hardening.sql','c3ebe54dcc6c6644ccd7cd453b5450b5d186cdf8',1299],
  ['20261006163029_recipe_p3_collection_lint_hardening.sql','d4d33fae2ef3d6a23e06c752d6647f30cf96badf',5732],
]);
export const P3_TERMINATOR_FILE=PINNED_SQL.at(-1)[0];
function blobHash(bytes){return createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');}
export function verifyPinnedRecipeMigrations(repoRoot,{requireExactCommit=true}={}){
  assert.equal(typeof repoRoot,'string');
  if(requireExactCommit){
    const head=execFileSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'}).trim();
    assert.equal(head,RECIPE_RELEASE_SHA,'Recipe HEAD differs from frozen production revision');
  }
  const folder=join(repoRoot,'supabase','migrations');
  const paths=readdirSync(folder).filter(x=>x.endsWith('.sql')).sort();
  assert.deepEqual(paths,PINNED_SQL.map(e=>e[0]),'Recipe migration set, order or names drifted');
  const rows=[];
  for(const [name,expectedSha,size] of PINNED_SQL){
    const bytes=readFileSync(join(folder,name));
    assert.equal(bytes.length,size,'Recipe original SQL size drift: '+name);
    assert.equal(blobHash(bytes),expectedSha,'Recipe original Git object bytes drift: '+name);
    if(name===P3_TERMINATOR_FILE){
      assert.ok(bytes.subarray(-5).equals(Buffer.from([36,36,59,92,110])),'Expected original P3 terminator bytes $$;\\n not present');
      // Only the two final literal ASCII bytes 0x5c,0x6e can be replaced in a *disposable* copy.
      const changed=Buffer.concat([bytes.subarray(0,-2),Buffer.from('\n')]);
      assert.ok(changed.subarray(0,-1).equals(bytes.subarray(0,-2)),'Correction touched nonterminal SQL');
      assert.equal(changed.length,bytes.length-1);
      rows.push({file:name,gitBlobSha:expectedSha,bytes:size,requiresOwnerCorrection:true,normalizedBytes:changed.length});
    } else {
      rows.push({file:name,gitBlobSha:expectedSha,bytes:size,requiresOwnerCorrection:false});
    }
  }
  return rows;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const dir=process.argv[2];
  assert.ok(dir,'Pass frozen Recipe checkout root');
  console.log(JSON.stringify({recipeSha:RECIPE_RELEASE_SHA,verified:verifyPinnedRecipeMigrations(dir)},null,2));
}
