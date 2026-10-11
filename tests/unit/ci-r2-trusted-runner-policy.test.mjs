import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { R2_EXPECTED, R2_GATE, validateR2StaticPlan } from '../../scripts/ci-r2-trusted-runner-policy.mjs';

const manifestPath = new URL('../../evidence/ci-r2/trusted-runner-design.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const workflows = Object.fromEntries(Object.keys(R2_EXPECTED).map(n => [
  n, readFileSync(new URL('../../.github/workflows/' + n, import.meta.url), 'utf8'),
]));
function copy() { return JSON.parse(JSON.stringify(manifest)); }

describe('CI R2 unactivated trusted-runner plan', () => {
  it('verifies all six inherited Account SHA pins and R1 fail-closed jobs', () => {
    expect(validateR2StaticPlan(manifest, workflows)).toEqual([]);
    expect(manifest.status).toBe('DESIGN_ONLY_BLOCKED');
    expect(manifest.activation).toBe('NOT_AUTHORIZED');
    expect(R2_GATE).toBe('BLOCKED_OWNER_PREREQUISITES');
  });
  it('rejects switching from design-only to executable or approved state', () => {
    for (const [property, value] of [
      ['status','READY'], ['activation','AUTHORIZED'], ['execution','TRUSTED'],
      ['ownerApproval','APPROVED'], ['controlPlane','PUBLIC_PR_RUNNER'],
    ]) {
      const changed = copy();
      changed[property] = value;
      expect(validateR2StaticPlan(changed, workflows), property).not.toEqual([]);
    }
  });
  it('rejects wider tokens, public PR access and candidate-controlled trusted runner code', () => {
    const invalid = [
      ['tokenPolicy','permission','contents:write'],
      ['tokenPolicy','onlyRepository','thiepn/thiepn.github.io'],
      ['tokenPolicy','credentialProvisioned',true],
      ['tokenPolicy','allowedInPublicPr',true],
      ['tokenPolicy','allowedInCandidateProcess',true],
      ['tokenPolicy','revokedBeforeCandidateExecution',false],
      ['candidatePolicy','runnerCodeFromCandidate',true],
      ['candidatePolicy','untrustedPullRequestAccess',true],
      ['candidatePolicy','separateOwnerReview',false],
      ['executionPolicy','privateSourceToPublicArtifacts',true],
      ['executionPolicy','untrustedPrCandidateExecution',true],
      ['evidencePolicy','tokenOrSourceDisclosureAllowed',true],
    ];
    for (const [field, key, value] of invalid) {
      const changed = copy();
      changed[field][key] = value;
      expect(validateR2StaticPlan(changed, workflows), field + '.' + key).not.toEqual([]);
    }
  });
  it('rejects dropped, duplicated, or silently altered immutable paired tests', () => {
    const omitted = copy();
    omitted.suites.pop();
    expect(validateR2StaticPlan(omitted, workflows)).not.toEqual([]);
    const swapped = copy();
    swapped.suites[0].accountSha = 'a'.repeat(40);
    expect(validateR2StaticPlan(swapped, workflows)).not.toEqual([]);
    const duplicates = copy();
    duplicates.suites[0] = {...duplicates.suites[1]};
    expect(validateR2StaticPlan(duplicates, workflows)).not.toEqual([]);
    const drifted = {...workflows, 'hub-integration.yml': workflows['hub-integration.yml'].replace(
      'run: node scripts/hub-account-ci-boundary.mjs', 'run: true')};
    expect(validateR2StaticPlan(manifest, drifted)).not.toEqual([]);
  });
  it('rejects privileged events, injected secrets and deleted browser suites', () => {
    const name = 'hub-workflows-browser.yml';
    const cases = [
      workflows[name] + '\npull_request_target:\n',
      workflows[name] + '\ntoken: \${{ secrets.ACCOUNT_PRIVATE_READ }}\n',
      workflows[name].replace('npx playwright test -c playwright.hub-workflows.config.ts', 'echo bypass'),
    ];
    for (const mutated of cases) expect(validateR2StaticPlan(manifest, {...workflows, [name]:mutated})).not.toEqual([]);
  });
});
