import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { authorizePagesRelease } from '../scripts/authorize-pages-release.mjs';

const SHA = 'a'.repeat(40);
const OWNER_ENV = {
  GITHUB_REPOSITORY: 'thiepn/thiepn.github.io',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_ACTOR: 'thiepn',
  GITHUB_TRIGGERING_ACTOR: 'thiepn',
  GITHUB_SHA: SHA,
  HUB_RELEASE_EXPECTED_SHA: SHA,
  GH_TOKEN: 'fixture-only-no-network'
};
const quality = {
  id: 12345,
  html_url: 'https://github.com/thiepn/thiepn.github.io/actions/runs/12345',
  name: 'Quality',
  path: '.github/workflows/quality.yml',
  head_sha: SHA,
  head_branch: 'main',
  event: 'push',
  status: 'completed',
  conclusion: 'success'
};

function fakeApi({ head = SHA, runs = [quality], status = 200 } = {}) {
  const requested = [];
  const request = async url => {
    requested.push(url);
    return {
      ok: status === 200,
      status,
      json: async () =>
        url.includes('/branches/main') ? { commit: { sha: head } } : { workflow_runs: runs }
    };
  };
  return { request, requested };
}

test('manual, owner-started, exact-main release with successful push CI is allowed', async () => {
  const { request, requested } = fakeApi();
  const result = await authorizePagesRelease(OWNER_ENV, request);
  assert.equal(result.releaseSha, SHA);
  assert.equal(result.qualityRunId, 12345);
  assert.equal(requested.length, 2);
  assert.match(requested[1], /actions\/workflows\/quality\.yml\/runs\?head_sha=/);
});

test('only manually dispatched main releases by the initiating and rerunning owner qualify', async () => {
  for (const field of ['GITHUB_EVENT_NAME', 'GITHUB_REF', 'GITHUB_ACTOR', 'GITHUB_TRIGGERING_ACTOR', 'GITHUB_REPOSITORY']) {
    const { request, requested } = fakeApi();
    const env = { ...OWNER_ENV, [field]: 'untrusted-value' };
    await assert.rejects(authorizePagesRelease(env, request));
    assert.equal(requested.length, 0, field + ' must reject before API calls');
  }
});

test('invalid, stale, or altered SHA fails closed', async () => {
  for (const env of [
    { ...OWNER_ENV, HUB_RELEASE_EXPECTED_SHA: 'branch-name' },
    { ...OWNER_ENV, HUB_RELEASE_EXPECTED_SHA: 'A'.repeat(40) },
    { ...OWNER_ENV, GITHUB_SHA: 'b'.repeat(40) },
    { ...OWNER_ENV, GH_TOKEN: undefined }
  ]) await assert.rejects(authorizePagesRelease(env, fakeApi().request));
  await assert.rejects(authorizePagesRelease(OWNER_ENV, fakeApi({ head: 'b'.repeat(40) }).request), /Main has moved/);
});

test('PR-only, failed, wrong-branch, and old Quality evidence cannot authorize production', async () => {
  for (const override of [
    { event: 'pull_request' },
    { conclusion: 'failure' },
    { head_branch: 'feature' },
    { head_sha: 'b'.repeat(40) },
    { path: '.github/workflows/other.yml' },
    { status: 'in_progress' }
  ]) {
    const { request } = fakeApi({ runs: [{ ...quality, ...override }] });
    await assert.rejects(authorizePagesRelease(OWNER_ENV, request), /No successful main-push Quality run/);
  }
  await assert.rejects(authorizePagesRelease(OWNER_ENV, fakeApi({ runs: [] }).request), /No successful main-push Quality run/);
  await assert.rejects(authorizePagesRelease(OWNER_ENV, fakeApi({ status: 403 }).request), /HTTP 403/);
});

test('release YAML requires manual dispatch, exact-main approval and does not mutate Pages configuration', () => {
  const source = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const config = YAML.parse(source);
  assert.deepEqual(Object.keys(config.on), ['workflow_dispatch']);
  assert.equal(config.jobs.build.needs, 'authorize');
  assert.equal(config.jobs.deploy.needs, 'build');
  assert.equal(config.jobs.deploy.environment.name, 'github-pages');
  assert.match(config.jobs.authorize.if, /refs\/heads\/main/);
  assert.match(config.jobs.authorize.if, /triggering_actor/);
  assert.match(source, /actions\/deploy-pages@v5/);
  assert.doesNotMatch(source, /gh api --method PUT|git push|vercel deploy/);
  const steps = config.jobs.deploy.steps;
  const guard = steps.findIndex(s => s.run === 'node scripts/authorize-pages-release.mjs');
  const publish = steps.findIndex(s => s.uses === 'actions/deploy-pages@v5');
  assert.ok(guard >= 0 && publish > guard, 'final guard must precede deployment');
});
