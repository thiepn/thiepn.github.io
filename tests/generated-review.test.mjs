import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUTPUTS, prepareGeneratedReview } from '../scripts/prepare-generated-review.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
const put = (cwd, filename, bytes) => {
  const dest = path.join(cwd, filename);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, bytes);
};
const fixture = () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'hub-m4-writer-'));
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.name', 'M4 Test');
  git(cwd, 'config', 'user.email', 'm4@example.invalid');
  return cwd;
};
const commit = cwd => { git(cwd, 'add', '-A'); git(cwd, 'commit', '-qm', 'Original generated output'); };
const local = { GITHUB_ACTIONS: 'false' };

test('binary patch retains changed, added and deleted image bytes but excludes unrelated source', async () => {
  const cwd = fixture();
  try {
    const initial = Buffer.from([0, 255, 129, 0, 19, 99, 250]);
    const updated = Buffer.from([255, 0, 128, 23, 18, 92, 0, 78]);
    const added = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 255]);
    for (const f of OUTPUTS['brand-icons'].slice(0, 3)) put(cwd, f, initial);
    put(cwd, 'src/private-sensitive.txt', 'must never enter patch');
    commit(cwd);
    const baseSha = git(cwd, 'rev-parse', 'HEAD').trim();
    put(cwd, OUTPUTS['brand-icons'][0], updated);
    unlinkSync(path.join(cwd, OUTPUTS['brand-icons'][1]));
    put(cwd, OUTPUTS['brand-icons'][3], added);
    put(cwd, 'src/private-sensitive.txt', 'unrelated private modifications');
    const result = await prepareGeneratedReview('brand-icons', { cwd, env: local });
    assert.equal(result.changed, true);
    assert.equal(result.baseSha, baseSha);
    assert.deepEqual(result.files, [
      { status: 'M', path: OUTPUTS['brand-icons'][0] },
      { status: 'D', path: OUTPUTS['brand-icons'][1] },
      { status: 'A', path: OUTPUTS['brand-icons'][3] }
    ].sort((a, b) => a.path.localeCompare(b.path)));
    const folder = path.join(cwd, '.cache/generated-review/brand-icons');
    const patch = path.join(folder, 'review.patch');
    assert.equal(result.patchBytes > 0, true);
    assert.deepEqual(JSON.parse(readFileSync(path.join(folder, 'manifest.json'), 'utf8')), result);
    assert.equal(git(cwd, 'diff', '--cached', '--name-only').includes('src/private-sensitive.txt'), false);
    git(cwd, 'reset', '--hard', 'HEAD');
    git(cwd, 'apply', '--check', '--binary', patch);
    git(cwd, 'apply', '--binary', patch);
    assert.deepEqual(readFileSync(path.join(cwd, OUTPUTS['brand-icons'][0])), updated);
    assert.equal(existsSync(path.join(cwd, OUTPUTS['brand-icons'][1])), false);
    assert.deepEqual(readFileSync(path.join(cwd, OUTPUTS['brand-icons'][3])), added);
    assert.equal(readFileSync(path.join(cwd, 'src/private-sensitive.txt'), 'utf8'), 'must never enter patch');
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('unchanged canonical output still retains explicit zero-change manifest', async () => {
  const cwd = fixture();
  try {
    put(cwd, 'src/generated/current.json', '{"ok":true}');
    put(cwd, 'public/og/existing.png', Buffer.from([0, 255, 2, 1]));
    commit(cwd);
    const out = await prepareGeneratedReview('refresh-generated', { cwd, env: local });
    assert.equal(out.changed, false);
    assert.deepEqual(out.files, []);
    assert.equal(out.patchBytes, 0);
    assert.ok(existsSync(path.join(cwd, '.cache/generated-review/refresh-generated/manifest.json')));
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('unknown profiles, staging collisions and noncanonical Actions context fail closed', async () => {
  const cwd = fixture();
  try {
    put(cwd, 'public/icon-192.png', Buffer.from([8, 7, 6]));
    commit(cwd);
    await assert.rejects(prepareGeneratedReview('deploy-prod', { cwd, env: local }), /Unknown/);
    await assert.rejects(prepareGeneratedReview('brand-icons', { cwd, env: {
      GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'attacker/project',
      GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push'
    }}), /Unexpected repository/);
    put(cwd, 'unrelated.txt', 'unrelated staged update');
    git(cwd, 'add', 'unrelated.txt');
    await assert.rejects(prepareGeneratedReview('brand-icons', { cwd, env: local }), /pre-staged/);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});


test('Actions source SHA and main/event context must match the checkout', async () => {
  const cwd = fixture();
  try {
    put(cwd, 'public/icon-192.png', Buffer.from([8, 7, 6]));
    commit(cwd);
    const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'thiepn/thiepn.github.io',
      GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push', GITHUB_SHA: 'a'.repeat(40) };
    await assert.rejects(prepareGeneratedReview('brand-icons', { cwd, env }), /source SHA/);
    env.GITHUB_REF = 'refs/heads/feature';
    await assert.rejects(prepareGeneratedReview('brand-icons', { cwd, env }), /Only main/);
    env.GITHUB_REF = 'refs/heads/main';
    env.GITHUB_EVENT_NAME = 'pull_request';
    await assert.rejects(prepareGeneratedReview('brand-icons', { cwd, env }), /event type/);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('reject executable and symlink assets', async () => {
  const { chmodSync, symlinkSync } = await import('node:fs');
  for (const kind of ['executable', 'symlink']) {
    const cwd = fixture();
    try {
      for (const name of OUTPUTS['brand-icons']) put(cwd, name, Buffer.from([0, 1, 2]));
      commit(cwd);
      const filename = path.join(cwd, OUTPUTS['brand-icons'][0]);
      if (kind === 'executable') chmodSync(filename, 0o755);
      else { unlinkSync(filename); symlinkSync('/etc/passwd', filename); }
      await assert.rejects(prepareGeneratedReview('brand-icons', { cwd, env: local }), /regular non-executable/);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  }
});
