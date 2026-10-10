import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {inspectH12Preparation,prepareH12NoGo} from '../src/lib/prism/h12-multiparty-reconciliation.mjs';

// No network/production actions, no operator registration, no private objects.
// Strictly validates an empty external witness and human acceptance registry.
if(process.argv.length!==3||!['--check','--rehearse'].includes(process.argv[2])){
 process.stderr.write('Usage: node scripts/h12-precutover-reconciliation.mjs --check|--rehearse\n');
 process.exitCode=2;
}else{
 try{
  const p=JSON.parse(await readFile(resolve('docs/evidence/HUB_V1_1_H12_PRECUTOVER_RECONCILIATION.json'),'utf8'));
  const audit=inspectH12Preparation(p);
  if(!audit.valid)throw Error(audit.errors.join('; '));
  const denied=prepareH12NoGo(p);
  if(denied.precutoverDecision!=='NO_GO'||denied.postreleaseRollback!=='NOT_REQUESTED'||
    denied.registeredOperators!==0||denied.realExternalWitnesses!==0||
    denied.mergeAllowed||denied.deployAllowed||denied.rollbackExecuted||
    denied.migrationAllowed||denied.purgeAllowed)
    throw Error('Invalid or elevated owner/recovery decision');
  if(process.argv[2]==='--rehearse'){
    await mkdir(resolve('.cache/prism-h12'),{recursive:true});
    await writeFile(resolve('.cache/prism-h12/multiparty-precutover-no-go.json'),
      JSON.stringify(denied,null,2)+'\n');
  }
  process.stdout.write(JSON.stringify({audit,denied},null,2)+'\n');
 }catch(e){
   process.stderr.write('H12 default-denied evidence review: '+
    (e instanceof Error?e.message:'invalid preparation')+'\n');
   process.exitCode=1;
 }
}
