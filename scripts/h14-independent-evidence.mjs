import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {inspectH14Default,prepareH14NoGo} from '../src/lib/prism/h14-independent-evidence-decision.mjs';

// Deterministic source-only rehearsal. NEVER authorize human owners, signers,
// physical phones, CDN/PWA restore or protected original objects.
const mode=process.argv[2];
if(process.argv.length!==3||!['--check','--rehearse'].includes(mode)){
 process.stderr.write('Usage: node scripts/h14-independent-evidence.mjs --check|--rehearse\n');
 process.exitCode=2;
}else try{
 const packet=JSON.parse(await readFile(resolve('docs/evidence/HUB_V1_1_H14_EVIDENCE_DECISION.json'),'utf8'));
 const audit=inspectH14Default(packet),denial=prepareH14NoGo(packet);
 if(!audit.valid||denial.decision!=='NO_GO'||denial.postreleaseRollback!=='NOT_REQUESTED'||
   denial.realExternalReviewers!==0||denial.realEvidencePackets!==0||
   denial.releaseAllowed||denial.rollbackAllowed||denial.deployAllowed||
   denial.mergeAllowed||denial.migrationAllowed||denial.purgeAllowed||
   denial.rollbackExecuted)throw Error('H14 default-denied custody release bypass');
 if(mode==='--rehearse'){
   await mkdir(resolve('.cache/prism-h14'),{recursive:true});
   await writeFile(resolve('.cache/prism-h14/independent-evidence-no-go.json'),
     JSON.stringify(denial,null,2)+'\n');
 }
 process.stdout.write(JSON.stringify({audit,denial},null,2)+'\n');
}catch(e){
 process.stderr.write('H14 unqualified external rights/custody/recovery: '+(e instanceof Error?e.message:'unknown')+'\n');
 process.exitCode=1;
}
