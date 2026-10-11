import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

const source = readFileSync(new URL('../.github/workflows/hub-integration.yml', import.meta.url), 'utf8');
const config = YAML.parse(source);

test('public PR runs carry no private source checkout or private credentials', () => {
  assert.ok(Object.hasOwn(config.on, 'pull_request'));
  assert.ok(Object.hasOwn(config.on, 'push'));
  assert.ok(Object.hasOwn(config.on, 'workflow_dispatch'));
  assert.deepEqual(config.permissions, { contents: 'read' });
  assert.equal(config.jobs['public-contract'].if, undefined);
  const publicJob = JSON.stringify(config.jobs['public-contract']);
  assert.doesNotMatch(publicJob, /thiepn\/account|HUB_ACCOUNT_READ_TOKEN|secrets\.|H2_ACCOUNT_DIST/);
  assert.match(publicJob, /tests\/account-platform/);
  assert.match(publicJob, /validate-account-consumer/);
  assert.match(publicJob, /hub-account-workflow-isolation\.test\.mjs/);
  assert.match(publicJob, /npm run build/);
});

test('private checkout is exclusively gated behind manually approved main execution', () => {
  const jobs = Object.entries(config.jobs);
  const privateJobs = jobs.filter(([, job]) =>
    (job.steps || []).some(step => step.with?.repository === 'thiepn/account'));
  assert.equal(privateJobs.length, 1);
  assert.equal(privateJobs[0][0], 'paired');
  const paired = config.jobs.paired;
  const expected = ['github.event_name', 'workflow_dispatch', 'github.ref',
    'refs/heads/main', 'github.actor', 'github.triggering_actor', 'thiepn'];
  for (const part of expected) assert.ok(paired.if.includes(part), `Missing private job gate: ${part}`);
  assert.doesNotMatch(paired.if, /pull_request|\|\||push/);
  const checkout = paired.steps.find(step => step.with?.repository === 'thiepn/account');
  assert.equal(checkout.with.ref, '28159b0966f86fd5e1b6c4a99011e174f0ef06f0');
  assert.equal(checkout.with.token, '${{ secrets.HUB_ACCOUNT_READ_TOKEN }}');
  assert.equal(checkout.with['persist-credentials'], false);
  assert.ok(paired.steps.findIndex(step => step.name?.startsWith('Require an independently')) <
    paired.steps.findIndex(step => step.with?.repository === 'thiepn/account'));
  const required = paired.steps.find(step => step.name?.startsWith('Require an independently'));
  assert.match(required.run, /exit 1/);
  assert.match(JSON.stringify(paired), /H2_ACCOUNT_DIST/);
  assert.match(JSON.stringify(paired), /hub-account-paired/);
});

test('private-job token is scoped to the checkout and existence guard, not build or Playwright', () => {
  const paired = config.jobs.paired;
  assert.equal(paired.env, undefined);
  for (const step of paired.steps) {
    if (step.with?.repository === 'thiepn/account') continue;
    if (step.name?.startsWith('Require an independently')) continue;
    assert.doesNotMatch(JSON.stringify(step), /HUB_ACCOUNT_READ_TOKEN|ACCOUNT_READ_TOKEN|secrets\./);
  }
  assert.doesNotMatch(source, /pull_request_target|repository_dispatch|deploy-pages|vercel deploy/);
});
