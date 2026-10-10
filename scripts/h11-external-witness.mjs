import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectH11Preparation,prepareH11NoGo } from '../src/lib/prism/h11-external-witness.mjs';
if(process.argv.length!==3||!['--check','--rehearse'].includes(process.argv[2])){
  process.stderr.write('Usage: node scripts/h11-external-witness.mjs --check|--rehearse\n');
  process.exitCode=2;
}else{
  try{
    const packet=JSON.parse(await readFile(resolve('docs/evidence/HUB_V1_1_H11_EXTERNAL_WITNESS.json'),'utf8'));
    const audit=inspectH11Preparation(packet);
    if(!audit.valid)throw Error(audit.errors.join('; '));
    const denied=prepareH11NoGo(packet);
    if(denied.releaseDecision!=='NO_GO'||denied.rollbackDecision!=='NOT_EXECUTED'||
      denied.mergeAllowed||denied.deployAllowed||denied.migrationAllowed||denied.purgeAllowed)
      throw Error('Nonexecuting H11 release/rollback guard rejected');
    if(process.argv[2]==='--rehearse'){
      await mkdir(resolve('.cache/prism-h11'),{recursive:true});
      await writeFile(resolve('.cache/prism-h11/external-witness-no-go.json'),
        JSON.stringify(denied,null,2)+'\n');
    }
    process.stdout.write(JSON.stringify({audit,denied},null,2)+'\n');
  }catch(error){
    process.stderr.write('H11 fail-closed: '+(error instanceof Error?error.message:'invalid packet')+'\n');
    process.exitCode=1;
  }
}
