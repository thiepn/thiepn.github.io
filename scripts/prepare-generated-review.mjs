import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const OUTPUTS = Object.freeze({
  'brand-icons': ['public/favicon-32x32.png', 'public/apple-touch-icon.png', 'public/icon-192.png', 'public/icon-512.png'],
  'capture-hub-media': ['src/assets/hub', 'src/generated/hub-media.json'],
  'capture-previews': ['public/projects'],
  'capture-project-media': ['public/projects/the-bible-challenge', 'public/projects/pdf-studio', 'public/projects/wordstrike', 'public/projects/micro-arcade', 'public/projects/voidcut', 'src/generated'],
  'og-assets': ['public/og', 'src/generated/og-raster-manifest.json'],
  'refresh-generated': ['src/generated', 'public/og']
});

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: null, maxBuffer: 100 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(
    'git ' + args[0] + ' failed (' + result.status + '): ' + (result.stderr || '').toString('utf8').slice(0, 500)
  );
  return result.stdout;
}

export async function prepareGeneratedReview(profile, {
  cwd = process.cwd(), env = process.env
} = {}) {
  assert.ok(Object.hasOwn(OUTPUTS, profile), 'Unknown generated artifact profile');
  if (env.GITHUB_ACTIONS === 'true') {
    assert.equal(env.GITHUB_REPOSITORY, 'thiepn/thiepn.github.io', 'Unexpected repository');
    assert.equal(env.GITHUB_REF, 'refs/heads/main', 'Only main source may produce the canonical artifact');
    assert.ok(['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME), 'Unexpected event type');
  }

  const paths = OUTPUTS[profile];
  const baseSha = git(['rev-parse', 'HEAD'], cwd).toString('utf8').trim();
  assert.match(baseSha, /^[a-f0-9]{40}$/);
  const alreadyStaged = git(['diff', '--cached', '--name-only', '-z'], cwd);
  assert.equal(alreadyStaged.length, 0, 'Unexpected pre-staged changes; refusing ambiguous patch');

  // Stage only the same generated paths used by the original workflow.
  git(['add', '-A', '--', ...paths], cwd);
  const changedPaths = git(['diff', '--cached', '--no-renames', '--name-only', '-z', '--', ...paths], cwd)
    .toString('utf8').split('\0').filter(Boolean);
  const patch = git(['diff', '--cached', '--no-renames', '--binary', '--full-index', '--no-ext-diff', '--', ...paths], cwd);
  const changes = git(['diff', '--cached', '--no-renames', '--name-status', '-z', '--', ...paths], cwd)
    .toString('utf8').split('\0').filter(Boolean);

  assert.equal(changes.length, changedPaths.length * 2, 'Unexpected git change manifest');
  assert.equal(patch.length === 0, changedPaths.length === 0, 'Patch/changed-file mismatch');
  const items = changedPaths.map((name, i) => {
    assert.equal(changes[i * 2 + 1], name, 'Unexpected path mapping');
    assert.match(changes[i * 2], /^[AMD]$/, 'Unexpected change status');
    assert.ok(paths.some(prefix => name === prefix || name.startsWith(prefix + '/')), 'Generated path outside allowlist');
    return { status: changes[i * 2], path: name };
  });

  const folder = path.join(cwd, '.cache', 'generated-review', profile);
  await mkdir(folder, { recursive: true });
  const patchFile = path.join(folder, 'review.patch');
  await writeFile(patchFile, patch);
  const manifest = {
    schema: 'thiepn-hub-generated-review-v1',
    profile, baseSha,
    changed: items.length > 0,
    files: items,
    sha256: createHash('sha256').update(patch).digest('hex'),
    patchBytes: patch.length,
    replay: 'On exact baseSha checkout, run git apply --check --binary review.patch then git apply --binary review.patch; review diff and CI before merging.'
  };
  await writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const report = await prepareGeneratedReview(process.argv[2]);
    console.log(JSON.stringify({ profile: report.profile, baseSha: report.baseSha,
      changed: report.changed, files: report.files.length, patchSha256: report.sha256 }));
    if (process.env.GITHUB_STEP_SUMMARY) {
      const { appendFile } = await import('node:fs/promises');
      await appendFile(process.env.GITHUB_STEP_SUMMARY,
        '## Generated output: ' + report.profile + '\n' +
        '- Source: ' + report.baseSha + '\n' +
        '- Files changed: ' + report.files.length + '\n' +
        '- Review patch SHA-256: ' + report.sha256 + '\n' +
        '- No git push, PR creation, release dispatch or production deployment is performed.\n');
    }
  } catch (error) {
    console.error('Generated artifact preparation rejected: ' + error.message);
    process.exitCode = 1;
  }
}
