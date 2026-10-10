import {lstat,readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {reconcileH15ExternalIntake} from '../src/lib/prism/h15-physical-evidence-intake.mjs';

// One-shot, offline, explicitly supplied local JSON. No credential prompts,
// production calls, external trust enrollment, original uploads or decisions.
const [mode,arg]=process.argv.slice(2);
if(!['--check','--rehearse','--intake'].includes(mode)||
   (mode==='--intake'?!arg||process.argv.length!==4:process.argv.length!==3)){
 process.stderr.write('Usage: node scripts/h15-external-intake.mjs --check|--rehearse|--intake <local-evidence.json>\n');
 process.exitCode=2;
}else try{
 const path=resolve(mode==='--intake'?arg:'docs/evidence/HUB_V1_1_H15_EXTERNAL_INTAKE.json');
 const stat=await lstat(path);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>131072)
  throw Error('Refuse symlink, non-file or unbounded external evidence');
 const packet=JSON.parse(await readFile(path,'utf8'));
 const result=reconcileH15ExternalIntake(packet);
 if(result.preCutover==='GO'||result.precutover!=='NO_GO'||
    result.postrelease!=='NOT_REQUESTED'||result.releaseAllowed||
    result.rollbackAllowed||result.mergeAllowed||result.deployAllowed||
    result.rollbackExecuted||result.realOwnerApprovals!==0)
  throw Error('H15 non-executing custody default-denial violated');
 if(mode==='--rehearse'){
  if(!result.schemaValid||result.status!=='AWAITING_EXTERNAL_EVIDENCE')
   throw Error('Bundled H15 evidence must be empty and valid');
  await mkdir(resolve('.cache/prism-h15'),{recursive:true});
  await writeFile(resolve('.cache/prism-h15/external-intake-no-go.json'),
   JSON.stringify(result,null,2)+'\n',{mode:0o600});
 }
 // Output is only a digest/count/conflict-index report; original external
 // observation records and any protected device/backup content remain off repo.
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(!result.schemaValid)process.exitCode=1;
 else if(result.conflicts.length)process.exitCode=3;
}catch(e){
 process.stderr.write('H15 intake denied: '+(e instanceof Error?e.message:'invalid packet')+'\n');
 process.exitCode=1;
}
