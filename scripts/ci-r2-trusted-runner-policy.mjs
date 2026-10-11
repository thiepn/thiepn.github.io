/**
 * CI R2: STATIC source-only trust design validation, NOT a credential or runner.
 * Successful validation means only that the unactivated design satisfies
 * hard-coded review constraints. It must never issue a token or execute CI.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

export const R2_GATE = 'BLOCKED_OWNER_PREREQUISITES';
export const R2_EXPECTED = Object.freeze({
  'hub-integration.yml': ['account', '19abe54a605ee7fe121d91e4b5cbef0f0b74763b', 'playwright.hub-account.config.ts'],
  'hub-notes-browser.yml': ['managed-notes', '19abe54a605ee7fe121d91e4b5cbef0f0b74763b', 'playwright.hub-notes.config.ts'],
  'hub-tms60-browser.yml': ['managed-tms60', '19abe54a605ee7fe121d91e4b5cbef0f0b74763b', 'playwright.hub-tms60.config.ts'],
  'hub-inbox-browser.yml': ['notes-inbox', '5b426c40e9e174c11c36604c1ef2c18a6aa155d8', 'playwright.hub-inbox.config.ts'],
  'hub-capture-browser.yml': ['notes-capture', '676413adfeef68f50e2bae95364fd43afbb6b497', 'playwright.hub-capture.config.ts'],
  'hub-workflows-browser.yml': ['cross-app', '9cddcbcdb36e6260be3761ae35b221b1a7b8e271', 'playwright.hub-workflows.config.ts'],
});

function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function hasExactKeys(record, keys) {
  return isRecord(record) && Object.keys(record).length === keys.length
    && keys.every(key => Object.prototype.hasOwnProperty.call(record, key));
}

/** Returns issues; does not make or infer any authorization decision. */
export function validateR2StaticPlan(plan, workflowSources) {
  const issues = [];
  const requireValue = (value, expected, path) => {
    if (value !== expected) issues.push(path + ': expected ' + String(expected));
  };
  if (!isRecord(plan)) return ['plan must be an object'];
  requireValue(plan.schemaVersion, 1, 'schemaVersion');
  requireValue(plan.phase, 'THIEPN_HUB_CI_R2', 'phase');
  requireValue(plan.status, 'DESIGN_ONLY_BLOCKED', 'status');
  requireValue(plan.activation, 'NOT_AUTHORIZED', 'activation');
  requireValue(plan.execution, 'NONE', 'execution');
  requireValue(plan.ownerApproval, 'NOT_GIVEN', 'ownerApproval');
  requireValue(plan.controlPlane, 'INDEPENDENT_PROTECTED_PRIVATE_REPOSITORY', 'controlPlane');
  requireValue(plan.prerequisiteR1Head, 'ba011df894ec44a583e3d8eb55b90e8a1f1c40e2', 'prerequisiteR1Head');
  requireValue(plan.hubRepository, 'thiepn/thiepn.github.io', 'hubRepository');
  requireValue(plan.accountRepository, 'thiepn/account', 'accountRepository');
  const candidate = plan.candidatePolicy;
  if (!hasExactKeys(candidate, ['selection', 'runnerCodeFromCandidate', 'untrustedPullRequestAccess', 'publicPrTokenAccess', 'forbiddenEvents', 'separateOwnerReview'])) {
    issues.push('candidatePolicy schema invalid');
  } else {
    requireValue(candidate.selection, 'EXACT_SHA_OWNER_REVIEW_REQUIRED', 'candidate.selection');
    for (const k of ['runnerCodeFromCandidate', 'untrustedPullRequestAccess', 'publicPrTokenAccess']) requireValue(candidate[k], false, 'candidate.' + k);
    requireValue(candidate.separateOwnerReview, true, 'candidate.separateOwnerReview');
    const expected = ['pull_request', 'pull_request_target', 'merge_group', 'unreviewed_workflow_dispatch'];
    if (!Array.isArray(candidate.forbiddenEvents) || candidate.forbiddenEvents.length !== expected.length ||
      expected.some(e => !candidate.forbiddenEvents.includes(e))) issues.push('candidate.forbiddenEvents mismatch');
  }
  const token = plan.tokenPolicy;
  if (!hasExactKeys(token, ['kind', 'onlyRepository', 'permission', 'maxLifetimeMinutes', 'credentialProvisioned', 'allowedInPublicPr', 'allowedInCandidateProcess', 'revokedBeforeCandidateExecution'])) {
    issues.push('tokenPolicy schema invalid');
  } else {
    requireValue(token.kind, 'SHORT_LIVED_GITHUB_APP_INSTALLATION', 'token.kind');
    requireValue(token.onlyRepository, 'thiepn/account', 'token.onlyRepository');
    requireValue(token.permission, 'contents:read', 'token.permission');
    requireValue(token.maxLifetimeMinutes, 60, 'token.maxLifetimeMinutes');
    for (const k of ['credentialProvisioned', 'allowedInPublicPr', 'allowedInCandidateProcess']) requireValue(token[k], false, 'token.' + k);
    requireValue(token.revokedBeforeCandidateExecution, true, 'token.revokedBeforeCandidateExecution');
  }
  const execution = plan.executionPolicy;
  if (!hasExactKeys(execution, ['privateFetchWorkspace','candidateTestEnvironment','untrustedPrCandidateExecution','privateSourceToPublicArtifacts','cleanupRequired'])) {
    issues.push('executionPolicy schema invalid');
  } else {
    requireValue(execution.privateFetchWorkspace, 'TRUSTED_EPHEMERAL_ONLY', 'execution.privateFetchWorkspace');
    requireValue(execution.candidateTestEnvironment, 'NETWORK_ISOLATED_AFTER_REVIEW', 'execution.candidateTestEnvironment');
    requireValue(execution.untrustedPrCandidateExecution, false, 'execution.untrustedPrCandidateExecution');
    requireValue(execution.privateSourceToPublicArtifacts, false, 'execution.privateSourceToPublicArtifacts');
    requireValue(execution.cleanupRequired, true, 'execution.cleanupRequired');
  }
  const evidence = plan.evidencePolicy;
  if (!hasExactKeys(evidence, ['retention','exactHubShaRequired','exactAccountShasRequired','perSuiteLogsAndDigestsRequired','tokenOrSourceDisclosureAllowed','reviewerDecisionRequired'])) {
    issues.push('evidencePolicy schema invalid');
  } else {
    requireValue(evidence.retention, 'PRIVATE_ALLOWLIST_ONLY', 'evidence.retention');
    for (const k of ['exactHubShaRequired','exactAccountShasRequired','perSuiteLogsAndDigestsRequired','reviewerDecisionRequired'])
      requireValue(evidence[k], true, 'evidence.' + k);
    requireValue(evidence.tokenOrSourceDisclosureAllowed, false, 'evidence.tokenOrSourceDisclosureAllowed');
  }
  const entries = plan.suites;
  if (!Array.isArray(entries) || entries.length !== 6) {
    issues.push('must preserve exactly six paired suites');
  } else {
    const seen = new Set();
    for (const entry of entries) {
      if (!hasExactKeys(entry, ['id','workflow','accountSha','testConfig'])) {
        issues.push('suite entry shape invalid');
        continue;
      }
      if (seen.has(entry.workflow)) issues.push('duplicate workflow: ' + entry.workflow);
      seen.add(entry.workflow);
      const expected = R2_EXPECTED[entry.workflow];
      if (!expected) { issues.push('unknown workflow: ' + entry.workflow); continue; }
      if (entry.id !== expected[0] || entry.accountSha !== expected[1] || entry.testConfig !== expected[2])
        issues.push('suite identity/SHA/test config mismatch: ' + entry.workflow);
      const source = workflowSources?.[entry.workflow];
      if (typeof source !== 'string') { issues.push('missing workflow source: ' + entry.workflow); continue; }
      const guard = source.indexOf('run: node scripts/hub-account-ci-boundary.mjs');
      const checkout = source.indexOf('repository: thiepn/account');
      if (guard < 0 || checkout <= guard) issues.push('guard absent or after private checkout: ' + entry.workflow);
      if (!source.includes('ref: ' + expected[1])) issues.push('Account pin changed: ' + entry.workflow);
      if (!source.includes('npx playwright test -c ' + expected[2])) issues.push('original paired suite lost: ' + entry.workflow);
      if (!source.includes('permissions:\n  contents: read')) issues.push('workflow permissions changed: ' + entry.workflow);
      if (/pull_request_target\s*:/.test(source)) issues.push('privileged PR event detected: ' + entry.workflow);
      if (/token:\s*\$\{\{\s*secrets\.|continue-on-error:\s*true/.test(source))
        issues.push('secret or soft-fail found: ' + entry.workflow);
    }
    for (const name of Object.keys(R2_EXPECTED)) if (!seen.has(name)) issues.push('missing expected suite: ' + name);
  }
  return issues;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(readFileSync(resolve(root, 'evidence/ci-r2/trusted-runner-design.json'), 'utf8'));
  const sources = Object.fromEntries(Object.keys(R2_EXPECTED).map(n =>
    [n, readFileSync(resolve(root, '.github/workflows', n), 'utf8')]));
  const issues = validateR2StaticPlan(manifest, sources);
  if (issues.length) {
    for (const issue of issues) process.stderr.write('R2 DESIGN INVALID: ' + issue + '\n');
    process.exitCode = 1;
  } else {
    process.stdout.write('R2 STATIC DESIGN CONTRACT PASS; ' + R2_GATE + '; NO privileged workflow, credentials, or paired tests executed.\n');
  }
}
