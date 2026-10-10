import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { evaluateH8Attestations, prepareH8NonexecutingDecision } from '../src/lib/prism/h8-operator-attestation.mjs';

// CI is deliberately unable to introduce a signer trust root. No network,
// hardware, OAuth, database, deployment or credential access occurs.
if (process.argv.length!==3 || !['--check','--rehearse'].includes(process.argv[2])){
  process.stderr.write('Usage: node scripts/h8-evidence-intake.mjs --check|--rehearse\n');
  process.exitCode=2;
}else{
  try{
    const registry=JSON.parse(await readFile(resolve('docs/evidence/HUB_V1_1_H8_ATTESTATION_REGISTRY.json'),'utf8'));
    const audit=evaluateH8Attestations(registry,{trustedSpkiDigests:[],priorNonceDigests:[]});
    if(!audit.valid)throw new Error(audit.errors.join('; '));
    const receipt=prepareH8NonexecutingDecision(registry);
    if(receipt.publicationAllowed||receipt.mergeAllowed||receipt.deployAllowed||receipt.rollbackExecuted||
      receipt.signaturesCollected||receipt.operatorApproved)throw new Error('Operator-only approval leaked into CI');
    process.stdout.write(JSON.stringify({audit,receipt},null,2)+'\n');
    if(process.argv[2]==='--rehearse'){
      const dir=resolve('.cache/prism-h8');
      await mkdir(dir,{recursive:true});
      await writeFile(resolve(dir,'offline-intake-no-go.json'),JSON.stringify(receipt,null,2)+'\n');
    }
  }catch(e){
    process.stderr.write(`H8 blocked: ${e instanceof Error?e.message:'invalid evidence'}\n`);
    process.exitCode=1;
  }
}
