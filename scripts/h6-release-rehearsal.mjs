import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectH6Evidence, rehearseH6Rollback } from '../src/lib/prism/h6-release-evidence.mjs';

const allowed = new Set(['--check', '--rehearse']);
if (process.argv.length !== 3 || !allowed.has(process.argv[2])) {
  process.stderr.write('Usage: node scripts/h6-release-rehearsal.mjs --check|--rehearse\n');
  process.exitCode = 2;
} else {
  try {
    const path = resolve('docs/evidence/HUB_V1_1_H6_RELEASE_EVIDENCE.json');
    const evidence = JSON.parse(await readFile(path, 'utf8'));
    const audit = inspectH6Evidence(evidence);
    if (!audit.valid) throw new Error(audit.errors.join('; '));
    const receipt = rehearseH6Rollback(evidence);
    if (receipt.publishAllowed || receipt.candidateAllowed || receipt.rollbackExecuted) {
      throw new Error('Danger: a non-deploying rehearsal attempted to authorize a real action');
    }
    process.stdout.write(JSON.stringify({ audit, receipt }, null, 2) + '\n');
    if (process.argv[2] === '--rehearse') {
      const dir = resolve('.cache/prism-h6');
      await mkdir(dir, { recursive: true });
      // Small privacy-safe, immutable-decision receipt; no provider content.
      await writeFile(resolve(dir, 'nondeploy-rehearsal.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'w' });
    }
  } catch (error) {
    process.stderr.write(`H6 evidence gate rejected: ${error instanceof Error ? error.message : 'unknown invalid evidence'}\n`);
    process.exitCode = 1;
  }
}
