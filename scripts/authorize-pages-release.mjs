import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const OWNER = 'thiepn';
const REPO = 'thiepn/thiepn.github.io';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const QUALITY_PATH = '.github/workflows/quality.yml';

// Fail closed. This verifies release authorization, not just that a branch was built.
export async function authorizePagesRelease(env = process.env, request = fetch) {
  const sha = env.HUB_RELEASE_EXPECTED_SHA;
  assert.match(sha || '', SHA_PATTERN, 'A complete, lowercase 40-character release SHA is required');
  assert.equal(env.GITHUB_REPOSITORY, REPO, 'Unexpected GitHub repository');
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch', 'Production requires manual dispatch');
  assert.equal(env.GITHUB_REF, 'refs/heads/main', 'Dispatch must target main');
  assert.equal(env.GITHUB_ACTOR, OWNER, 'Only the repository owner may initiate the release');
  assert.equal(env.GITHUB_TRIGGERING_ACTOR, OWNER, 'Only the owner may rerun the release');
  assert.equal(env.GITHUB_SHA, sha, 'Dispatch SHA differs from the requested main commit');
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  assert.ok(token, 'A read-only GitHub API token is required');

  async function readGitHub(endpoint) {
    const url = 'https://api.github.com/repos/' + REPO + '/' + endpoint;
    const response = await request(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        'X-GitHub-Api-Version': '2022-11-28'
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('GitHub authorization check failed (HTTP ' + response.status + ')');
    return response.json();
  }

  const branch = await readGitHub('branches/main');
  assert.equal(branch.commit?.sha, sha, 'Main has moved since release was requested');

  const runs = await readGitHub('actions/workflows/quality.yml/runs?head_sha=' + sha + '&per_page=100');
  assert.ok(Array.isArray(runs.workflow_runs), 'Quality workflow results unavailable');
  const qualified = runs.workflow_runs.find(run =>
    run.path === QUALITY_PATH &&
    run.name === 'Quality' &&
    run.head_sha === sha &&
    run.head_branch === 'main' &&
    run.event === 'push' &&
    run.status === 'completed' &&
    run.conclusion === 'success'
  );
  assert.ok(qualified, 'No successful main-push Quality run for this exact commit');
  return {
    releaseSha: sha,
    qualityRunId: qualified.id,
    qualityRunUrl: qualified.html_url || ('https://github.com/' + REPO + '/actions/runs/' + qualified.id)
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const result = await authorizePagesRelease();
    console.log('Owner-approved Hub release qualified: ' + result.releaseSha);
    console.log('Exact-main Quality evidence: ' + result.qualityRunUrl);
  } catch (error) {
    console.error('Production release rejected: ' + error.message);
    process.exitCode = 1;
  }
}
