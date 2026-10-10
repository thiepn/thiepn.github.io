import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {inspectH13Preparation,prepareH13NoGo} from '../src/lib/prism/h13-external-acceptance-review.mjs';

// Local-only receipt. Never call production APIs, obtain signing keys,
// authenticate owners, accept protected objects or execute rollback/deploy.
const mode=process.argv[2];
if(process.argv.length!==3||!['--check','--rehearse'].includes(mode)){
 process.stderr.write('Usage: node scripts/h13-external-acceptance.mjs --check|--rehearse\n');
 process.exitCode=2;
}else{
 try{
  const packet=JSON.parse(await readFile(resolve('docs/evidence/HUB_V1_1_H13_EXTERNAL_ACCEPTANCE.json'),'utf8'));
  const audit=inspectH13Preparation(packet);
  if(!audit.valid)throw Error(audit.errors.join('; '));
  const denied=prepareH13NoGo(packet);
  if(denied.releaseDecision!=='NO_GO'||denied.postreleaseRollback!=='NOT_REQUESTED'||
   denied.realExternalReviews!==0||denied.independentlyAuthenticatedOwners!==0||
   denied.releaseAllowed||denied.rollbackAllowed||denied.rollbackExecuted||
   denied.deployAllowed||denied.mergeAllowed||denied.migrationAllowed||denied.purgeAllowed)
    throw Error('H13 default denial has been bypassed');
  if(mode==='--rehearse'){
    await mkdir(resolve('.cache/prism-h13'),{recursive:true});
    await writeFile(resolve('.cache/prism-h13/external-acceptance-no-go.json'),
      JSON.stringify(denied,null,2)+'\n');
  }
  process.stdout.write(JSON.stringify({audit,denied},null,2)+'\n');
 }catch(e){
  process.stderr.write('H13 external witness/release custody denial: '+
   (e instanceof Error?e.message:'untrusted original source')+'\n');
  process.exitCode=1;
 }
}
