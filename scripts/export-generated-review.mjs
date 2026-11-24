import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

// The caller stages only the generator's declared outputs. This script never
// commits, pushes, opens PRs, deploys, or changes repository settings.
const { RUNNER_TEMP, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY } = process.env;
if (!RUNNER_TEMP || !GITHUB_OUTPUT) throw new Error('Expected an Actions review workspace');
const git = (...args) => execFileSync('git', args, { maxBuffer: 128 * 1024 * 1024 });
const base = git('rev-parse', 'HEAD').toString().trim();
if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Invalid review base SHA');
const paths = git('diff', '--cached', '--name-status').toString().trim();
if (!paths) {
  appendFileSync(GITHUB_OUTPUT, 'changed=false\n');
  console.log('Generated outputs are already current.');
} else {
  const patch = git('diff', '--cached', '--binary', '--full-index', '--no-ext-diff', '--no-textconv');
  if (!patch.length) throw new Error('Staged changes produced an empty patch');
  const dir = join(RUNNER_TEMP, 'generated-review');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'changes.patch'), patch);
  writeFileSync(join(dir, 'review.json'), JSON.stringify({ schemaVersion: 1, baseSha: base, workflow: process.env.GITHUB_WORKFLOW ?? null, runId: process.env.GITHUB_RUN_ID ?? null }, null, 2) + '\n');
  writeFileSync(join(dir, 'changed-files.txt'), paths + '\n');
  appendFileSync(GITHUB_OUTPUT, 'changed=true\n');
  const note = 'Generated changes are staged for review only. Apply changes.patch to a branch based on ' + base + ', review the diff and open a normal pull request. Do not apply directly to main. Full PR Quality, reviewed merge, exact-main push Quality and owner dispatch remain required.';
  console.log(note);
  if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, note + '\n');
}
