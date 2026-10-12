import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

const workflows = [
  "hub-integration.yml",
  "hub-notes-browser.yml",
  "hub-tms60-browser.yml",
  "hub-inbox-browser.yml",
  "hub-capture-browser.yml",
  "hub-workflows-browser.yml"
];
const root = new URL('../.github/workflows/', import.meta.url);
const parse = name => YAML.parse(readFileSync(new URL(name, root), 'utf8'));

// Public contracts cannot attest to browser acceptance against private Account.
// Keep original pinned suites inert until moved to an independently trusted runner.
function validate(workflow) {
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.ok(Object.hasOwn(workflow.on, 'pull_request'));
  assert.ok(!Object.hasOwn(workflow.on, 'pull_request_target'));
  assert.doesNotMatch(JSON.stringify(workflow.env ?? {}), /secrets\./);
  const publicJob = workflow.jobs['public-contract'];
  assert.ok(publicJob, 'Missing public contract job');
  assert.equal(publicJob.if, undefined);
  assert.equal(publicJob['continue-on-error'], undefined);
  assert.doesNotMatch(JSON.stringify(publicJob), /secrets\.|thiepn\/account|HUB_ACCOUNT_READ_TOKEN/);
  assert.ok(publicJob.steps.some(s => s.run?.startsWith('npx vitest run tests/unit/')));
  assert.ok(publicJob.steps.some(s => s.run?.includes('NOT_EXECUTED')));
  let privateJobs = 0;
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job.uses, undefined, 'Unreviewed reusable workflow');
    const privateSteps = (job.steps ?? []).filter(s => s.with?.repository === 'thiepn/account');
    if (privateSteps.length) {
      ++privateJobs;
      assert.equal(job.if, '${{ false }}', 'Private Account suites must be inert');
      assert.equal(job.env, undefined);
      for (const step of privateSteps) {
        assert.match(step.with.ref, /^[a-f0-9]{40}$/);
        assert.equal(step.with.token, undefined);
      }
      assert.ok(job.steps.some(s => s.run?.includes('playwright test')), 'Keep paired suite');
    } else {
      assert.doesNotMatch(JSON.stringify(job), /secrets\.|thiepn\/account/);
    }
  }
  assert.equal(privateJobs, 1, 'Preserve exactly one private paired suite');
  assert.doesNotMatch(JSON.stringify(workflow), /secrets\.|pull_request_target/);
}
for (const name of workflows) test(name + ' separates public contracts from inert private suite', () => validate(parse(name)));

test('reject private execution, missing guards, and credential exposure', () => {
  for (const mutate of [
    w => { w.jobs.paired.if = '${{ true }}'; },
    w => { delete w.jobs.paired.if; },
    w => { w.permissions.contents = 'write'; },
    w => { w.env = { TOKEN: '${{ secrets.PRIVATE_TOKEN }}' }; },
    w => { w.jobs['public-contract'].env = { TOKEN: '${{ secrets.PRIVATE_TOKEN }}' }; },
    w => { w.jobs['public-contract'].steps.push({uses: 'actions/checkout@v4', with: {repository: 'thiepn/account'}}); },
    w => { w.jobs['public-contract']['continue-on-error'] = true; },
    w => { w.jobs.additional = {uses: 'attacker/workflow@main'}; },
  ]) {
    const value = parse('hub-integration.yml');
    mutate(value);
    assert.throws(() => validate(value));
  }
});

test('Quality enforces this boundary before browser suites', () => {
  const quality = parse('quality.yml');
  const runs = quality.jobs.quality.steps.map(s => s.run);
  assert.ok(runs.indexOf('node --test tests/hub-account-ci-boundaries.test.mjs') >= 0);
  assert.ok(runs.indexOf('node --test tests/hub-account-ci-boundaries.test.mjs') < runs.indexOf('npm run audit:studio'));
});
