import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const workflowDir = new URL('../.github/workflows/', import.meta.url);
const generators = ['brand-icons','capture-hub-media','capture-previews','capture-project-media','og-assets','refresh-generated'];
test('generated media and catalogue workflows can only export review patches', () => {
  for (const name of generators) {
    const source = readFileSync(new URL(name + '.yml', workflowDir), 'utf8');
    const config = YAML.parse(source);
    assert.deepEqual(config.permissions, { contents: 'read' }, name);
    for (const job of Object.values(config.jobs)) {
      assert.equal(job.permissions, undefined, name);
      const checkout = job.steps.find(s => s.uses?.startsWith('actions/checkout@'));
      assert.equal(checkout.with['persist-credentials'], false, name);
      assert(job.steps.some(s => s.run?.includes('node scripts/export-generated-review.mjs')), name);
      assert(job.steps.some(s => s.uses === 'actions/upload-artifact@v4' && s.with?.path === '${{ runner.temp }}/generated-review/' && s.if === "steps.review.outputs.changed == 'true'"), name);
    }
    assert.doesNotMatch(source, /git\s+(?:push|commit|pull)|gh\s+(?:pr|workflow|api)|secrets\.[A-Z_]*(?:PAT|TOKEN)/, name);
  }
});
test('no repository workflow can silently write contents or pull requests', () => {
  for (const name of readdirSync(workflowDir).filter(n => /\.ya?ml$/.test(n))) {
    const config = YAML.parse(readFileSync(new URL(name, workflowDir), 'utf8'));
    for (const permissions of [config.permissions, ...Object.values(config.jobs ?? {}).map(job => job.permissions)]) {
      assert.notEqual(permissions, 'write-all', name);
      assert.notEqual(permissions?.contents, 'write', name);
      assert.notEqual(permissions?.['pull-requests'], 'write', name);
    }
  }
});
test('generated review preserves exact base and binary staged changes without modifying HEAD', () => {
  const root = mkdtempSync(join(tmpdir(), 'hub-generated-review-'));
  try {
    const repo = join(root, 'repo'), runner = join(root, 'runner');
    mkdirSync(repo); mkdirSync(runner);
    const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
    writeFileSync(join(repo, 'media.bin'), Buffer.from([0,1,2,3]));
    git('add', 'media.bin'); git('commit', '-qm', 'base');
    const base = git('rev-parse', 'HEAD').toString().trim();
    const output = join(root, 'output'); writeFileSync(output, '');
    const run = () => execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/export-generated-review.mjs', import.meta.url))], { cwd: repo, env: { ...process.env, RUNNER_TEMP: runner, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: '' } });
    run();
    assert.equal(readFileSync(output, 'utf8'), 'changed=false\n');
    assert(!existsSync(join(runner, 'generated-review')));
    const updated = Buffer.from([0,9,8,7,6]); writeFileSync(join(repo, 'media.bin'), updated);
    git('add', 'media.bin'); writeFileSync(output, ''); run();
    assert.equal(readFileSync(output, 'utf8'), 'changed=true\n');
    assert.equal(git('rev-parse', 'HEAD').toString().trim(), base);
    const dir = join(runner, 'generated-review');
    assert.equal(JSON.parse(readFileSync(join(dir, 'review.json'), 'utf8')).baseSha, base);
    git('reset', '--hard', base); git('apply', '--check', join(dir, 'changes.patch')); git('apply', join(dir, 'changes.patch'));
    assert.deepEqual(readFileSync(join(repo, 'media.bin')), updated);
    assert.equal(git('rev-parse', 'HEAD').toString().trim(), base);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
