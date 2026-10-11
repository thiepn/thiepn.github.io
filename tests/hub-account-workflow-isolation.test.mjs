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

const affectedWorkflowPaths = [
  'hub-capture-browser.yml',
  'hub-inbox-browser.yml',
  'hub-notes-browser.yml',
  'hub-tms60-browser.yml',
  'hub-workflows-browser.yml',
];

test('every additional Account-dependent browser workflow denies private access to PRs', () => {
  for (const name of affectedWorkflowPaths) {
    const workflow = YAML.parse(readFileSync(
      new URL('../.github/workflows/' + name, import.meta.url), 'utf8'));
    assert.ok(Object.hasOwn(workflow.on, 'pull_request'), name);
    assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'), name);
    assert.deepEqual(workflow.permissions, { contents: 'read' }, name);
    const publicJob = workflow.jobs['public-contract'];
    assert.ok(publicJob, name + ' needs public contract evidence');
    assert.equal(publicJob.if, undefined, name);
    assert.doesNotMatch(JSON.stringify(publicJob), /secrets\.|HUB_ACCOUNT_READ_TOKEN|thiepn\/account/, name);
    assert.match(JSON.stringify(publicJob), /hub-account-workflow-isolation\.test\.mjs/, name);
    const paired = workflow.jobs['staged-paired'];
    assert.ok(paired, name + ' original paired suite must remain');
    for (const gate of ['workflow_dispatch', 'refs/heads/main', 'github.actor', 'github.triggering_actor']) {
      assert.ok(paired.if.includes(gate), name + ' missing gate ' + gate);
    }
    assert.doesNotMatch(paired.if, /pull_request|\|\||push/, name);
    const checkout = paired.steps.find(step => step.with?.repository === 'thiepn/account');
    assert.ok(checkout, name + ' must retain paired Account fixture');
    assert.match(checkout.with.ref, /^[a-f0-9]{40}$/, name);
    assert.equal(checkout.with.token, '${{ secrets.HUB_ACCOUNT_READ_TOKEN }}', name);
    assert.equal(checkout.with['persist-credentials'], false, name);
    const protection = paired.steps.findIndex(step => step.name?.startsWith('Require authorized private Account read token'));
    assert.ok(protection >= 0 && protection < paired.steps.indexOf(checkout), name + ' missing pre-check');
    assert.match(paired.steps[protection].run, /exit 1/, name);
    assert.match(JSON.stringify(paired), /playwright test/, name + ' must preserve actual browser acceptance');
    for (const step of paired.steps) {
      if (step === checkout || step === paired.steps[protection]) continue;
      assert.doesNotMatch(JSON.stringify(step), /secrets\.|HUB_ACCOUNT_READ_TOKEN/, name);
    }
  }
});
