import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectH9SourcePacket, rehearseH9DeniedDecision } from '../src/lib/prism/h9-custody-acceptance.mjs';

// This job cannot contact live accounts, generate trust roots, manipulate CDN,
// accept physical-device signoffs, merge/deploy or execute rollback.
if(process.argv.length!==3||!['--check','--rehearse'].includes(process.argv[2])){
  process.stderr.write('Usage: node scripts/h9-custody-acceptance.mjs --check|--rehearse\n');
  process.exitCode=2;
}else{
  try{
    const data=JSON.parse(await readFile(resolve('docs/evidence/HUB_V1_1_H9_CUSTODY_ACCEPTANCE.json'),'utf8'));
    const audit=inspectH9SourcePacket(data);
    if(!audit.valid)throw new Error(audit.errors.join('; '));
    const decision=rehearseH9DeniedDecision(data);
    if(decision.releaseDecision!=='NO_GO'||decision.publicationAllowed||
      decision.mergeAllowed||decision.deployAllowed||decision.rollbackExecuted||
      decision.verifiedRealSignatures!==0)throw new Error('Unsafe release/custody decision in CI');
    process.stdout.write(JSON.stringify({audit,decision},null,2)+'\n');
    if(process.argv[2]==='--rehearse'){
      const dir=resolve('.cache/prism-h9');
      await mkdir(dir,{recursive:true});
      await writeFile(resolve(dir,'custody-acceptance-no-go.json'),JSON.stringify(decision,null,2)+'\n');
    }
  }catch(error){
    process.stderr.write(`H9 evidence gate rejected: ${error instanceof Error?error.message:'invalid packet'}\n`);
    process.exitCode=1;
  }
}
