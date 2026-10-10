import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectH10Preparation, prepareH10ReleaseDenial } from '../src/lib/prism/h10-release-reconciliation.mjs';

// No signer/root provisioning, no web/network actions, no migration, and no
// production/personal data. Writes only an explicit local denied decision.
if(process.argv.length!==3||!['--check','--rehearse'].includes(process.argv[2])){
  process.stderr.write('Usage: node scripts/h10-release-reconciliation.mjs --check|--rehearse\n');
  process.exitCode=2;
}else{
  try{
    const packet=JSON.parse(await readFile(resolve('docs/evidence/HUB_V1_1_H10_RELEASE_RECONCILIATION.json'),'utf8'));
    const audit=inspectH10Preparation(packet);
    if(!audit.valid)throw new Error(audit.errors.join('; '));
    const denied=prepareH10ReleaseDenial(packet);
    if(denied.decision!=='NO_GO'||denied.publicationAllowed||denied.mergeAllowed||
      denied.deployAllowed||denied.rollbackExecuted||denied.realWitnessedCustodyCount)
      throw new Error('H10 receipt must never authorize a live action');
    process.stdout.write(JSON.stringify({audit,denied},null,2)+'\n');
    if(process.argv[2]==='--rehearse'){
      const dir=resolve('.cache/prism-h10');
      await mkdir(dir,{recursive:true});
      await writeFile(resolve(dir,'release-readiness-no-go.json'),JSON.stringify(denied,null,2)+'\n');
    }
  }catch(err){
    process.stderr.write('H10 release denied: '+(err instanceof Error?err.message:'invalid packet')+'\n');
    process.exitCode=1;
  }
}