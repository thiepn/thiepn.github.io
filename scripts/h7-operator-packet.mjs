import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectH7OperatorPacket, rehearseH7ReleaseDecision } from '../src/lib/prism/h7-operator-decision.mjs';

if (process.argv.length!==3 || !['--check','--rehearse'].includes(process.argv[2])) {
  process.stderr.write('Usage: node scripts/h7-operator-packet.mjs --check|--rehearse\n');
  process.exitCode=2;
} else {
  try {
    const json=JSON.parse(await readFile(resolve('docs/evidence/HUB_V1_1_H7_OPERATOR_PACKET.json'),'utf8'));
    const checked=inspectH7OperatorPacket(json);
    if (!checked.valid) throw new Error(checked.errors.join('; '));
    const decision=rehearseH7ReleaseDecision(json);
    if (decision.releaseAllowed||decision.mergeAllowed||decision.deployAllowed||decision.rollbackExecuted)
      throw new Error('H7 operator packet may not execute or approve any live action');
    process.stdout.write(JSON.stringify({ checked, decision },null,2)+'\n');
    if (process.argv[2]==='--rehearse') {
      const directory=resolve('.cache/prism-h7');
      await mkdir(directory,{recursive:true});
      // Only an explicit, privacy-safe local decision receipt; not a live release.
      await writeFile(resolve(directory,'operator-no-go.json'),JSON.stringify(decision,null,2)+'\n');
    }
  } catch(error) {
    process.stderr.write(`H7 acceptance blocked: ${error instanceof Error?error.message:'invalid packet'}\n`);
    process.exitCode=1;
  }
}
