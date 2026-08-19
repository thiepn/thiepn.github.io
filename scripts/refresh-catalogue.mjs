import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SCRIPT_ROOT, parseArgs } from './lib/catalogue-files.mjs';

const args = parseArgs();
const tasks = [
  'generate-catalogue-stats.mjs',
  'generate-search-index.mjs',
  'generate-public-catalogue.mjs',
  'generate-route-manifest.mjs',
  'generate-og.mjs',
];
for (const task of tasks) {
  const taskArgs = args.check ? ['--check'] : [];
  const result = spawnSync(process.execPath, [path.join(SCRIPT_ROOT, 'scripts', task), ...taskArgs], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
