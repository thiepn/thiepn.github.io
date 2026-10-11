import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { classifyAccountCIContext, PRIVATE_ACCOUNT_GATE } from '../../scripts/hub-account-ci-boundary.mjs';

const repo = 'thiepn/thiepn.github.io';
const workflows = {
  'hub-integration.yml': '19abe54a605ee7fe121d91e4b5cbef0f0b74763b',
  'hub-notes-browser.yml': '19abe54a605ee7fe121d91e4b5cbef0f0b74763b',
  'hub-tms60-browser.yml': '19abe54a605ee7fe121d91e4b5cbef0f0b74763b',
  'hub-inbox-browser.yml': '5b426c40e9e174c11c36604c1ef2c18a6aa155d8',
  'hub-capture-browser.yml': '676413adfeef68f50e2bae95364fd43afbb6b497',
  'hub-workflows-browser.yml': '9cddcbcdb36e6260be3761ae35b221b1a7b8e271',
};
describe('Hub CI R1 Account trust boundary', () => {
  it('denies public PRs, including potentially privileged same-repo PRs', () => {
    for (const eventName of ['pull_request', 'pull_request_target', 'merge_group']) {
      const decision = classifyAccountCIContext({ eventName, ref: 'refs/pull/123/merge', repository: repo });
      expect(decision.code).toBe('BLOCKED_UNTRUSTED_PR');
    }
  });
  it('denies main push absent a separately authorized trusted CI system', () => {
    expect(classifyAccountCIContext({
      eventName: 'push', ref: 'refs/heads/main', repository: repo,
    }).code).toBe('BLOCKED_OWNER_CREDENTIAL_HANDOFF');
    expect(classifyAccountCIContext({
      eventName: 'push', ref: 'refs/heads/dev', repository: repo,
    }).code).toBe('BLOCKED_UNAPPROVED_EVENT');
    expect(classifyAccountCIContext({
      eventName: 'workflow_dispatch', ref: 'refs/heads/main', repository: repo,
    }).code).toBe('BLOCKED_UNAPPROVED_EVENT');
  });
  it('rejects other repositories and never returns a success policy', () => {
    expect(PRIVATE_ACCOUNT_GATE).toBe('BLOCKED_PRIVATE_ACCOUNT_CI');
    expect(classifyAccountCIContext({
      eventName: 'push', ref: 'refs/heads/main', repository: 'example/other',
    }).code).toBe('BLOCKED_WRONG_REPOSITORY');
  });
  it('preserves all six pinned paired suites, puts the gate before private checkout, and never references secrets', () => {
    const gate = 'run: node scripts/hub-account-ci-boundary.mjs';
    for (const [file, sha] of Object.entries(workflows)) {
      const yaml = readFileSync(new URL('../../.github/workflows/' + file, import.meta.url), 'utf8');
      const gatePos = yaml.indexOf(gate);
      const privatePos = yaml.indexOf('repository: thiepn/account');
      expect(gatePos, file).toBeGreaterThan(0);
      expect(privatePos, file).toBeGreaterThan(gatePos);
      expect(yaml).toContain('ref: ' + sha);
      expect(yaml).toContain('permissions:\n  contents: read');
      expect(yaml).toContain('pull_request:');
      expect(yaml).not.toContain('pull_request_target:');
      expect(yaml).not.toMatch(/(?:token:\s*\$\{\{\s*secrets\.|continue-on-error:\s*true)/);
      expect(yaml).toMatch(/npx playwright test -c playwright\./);
      expect((yaml.match(/CI R1 private Account fail-closed trust boundary/g) ?? []).length).toBe(1);
    }
  });
});
