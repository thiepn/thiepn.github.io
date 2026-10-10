import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectH11DefaultPacket, prepareH11Denial } from '../src/lib/prism/h11-external-witness-intake.mjs';

// CI is not a person, physical device, signing authority, source-rights holder
// or release operator. No network, secret, backend, deployment or purge access.
if(process.argv.length!==3||!['--check','--rehearse'].includes(process.argv[2])){
  process.stderr.write('Usage: node scripts/h11-external-witness-intake.mjs --check|--rehearse\n');
  process.exitCode=2;
}else{
  try{
    const json=JSON.parse(await readFile(resolve('docs/evidence/HUB_V1_1_H11_EXTERNAL_WITNESS.json'),'utf8'));
    const audit=inspectH11DefaultPacket(json);
    if(!audit.valid)throw new Error(audit.errors.join('; '));
    const denied=prepareH11Denial(json);
    if(denied.decision!=='NO_GO'||denied.realPackets!==0||denied.realSigners!==0||
      denied.publishAllowed||denied.mergeAllowed||denied.deployAllowed||
      denied.rollbackExecuted||denied.rightsAccepted||denied.previousStableRestored)
      throw new Error('Unapproved external evidence or release decision leaked into CI');
    process.stdout.write(JSON.stringify({audit,denied},null,2)+'\n');
    if(process.argv[2]==='--rehearse'){
      const dir=resolve('.cache/prism-h11');
      await mkdir(dir,{recursive:true});
      await writeFile(resolve(dir,'external-witness-no-go.json'),JSON.stringify(denied,null,2)+'\n');
    }
  }catch(error){
    process.stderr.write('H11 witness/recovery acceptance denied: '+
      (error instanceof Error?error.message:'invalid packet')+'\n');
    process.exitCode=1;
  }
}