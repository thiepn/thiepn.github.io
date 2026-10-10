// Offline, non-deploying validation of an inspected evidence receipt.
// This validates integrity/shape of the recorded sources, NOT live GitHub state
// or human approvals. Exact-head CI remains an independent required gate.
export const REQUIRED_WORKFLOWS = Object.freeze([
  'Quality',
  'Hub Account integration',
  'Hub device Library browsers',
  'Hub Notes Inbox browsers',
  'Hub Notes capture browsers',
  'Hub managed Notes browsers',
  'Hub managed TMS60 browsers',
  'Hub Notes integration',
]);
export const REQUIRED_EXTERNAL_GATES = Object.freeze([
  'real-two-owner-oauth',
  'android-ios-physical-devices',
  'talkback-voiceover-operator',
  'security-privacy-approval',
  'locked-prism-visual-signoff',
  'release-owner-authorization',
]);
// Independent pins from the previously inspected GitHub CI/log/artifact evidence.
// A plausible-looking replacement ID or SHA must not satisfy offline validation.
export const PINNED_PREDECESSORS = Object.freeze([
  {
    head: 'b67a9590a5cf01c144caf00ac7f98c6c07642ef9',
    runs: [37998329510, 37998329395, 37998329335, 37998329246, 37998329266, 37998329410, 37998329273, 37998329245],
    artifacts: [11648765383, 11648540751],
  },
  {
    head: '10d964fcd232f604110aa4105bd397923ff9e57e',
    runs: [38000467101, 38000467150, 38000467240, 38000467177, 38000467092, 38000467176, 38000467157, 38000467249],
    artifacts: [11648778460, 11648851794],
  },
  {
    head: '501b91bd742da3e7014fc4bba304edf77764b6d5',
    runs: [38002555366, 38002555320, 38002555400, 38002555306, 38002555468, 38002555313, 38002555411, 38002555374],
    artifacts: [11650326047, 11649508062],
    digests: [
      'e4da781d3950eebc945eca11fbeeb84d20ba1e2824031bf4f45e20d5c16f15bb',
      'f2f9a4a0f3e34f5ad485319024ae2ba8bd9ec2ca651a55c5ded2e86d3b29ee5b',
    ],
  },
]);
const REPO = 'thiepn/thiepn.github.io';
const sha = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
const pos = value => Number.isSafeInteger(value) && value > 0;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const base = `https://github.com/${REPO}/actions/runs/`;

export function inspectH6Evidence(manifest) {
  const errors = [];
  if (!plain(manifest)) return { valid: false, errors: ['Manifest is not an object'], releaseEligible: false, externalPending: [] };
  if (manifest.schemaVersion !== 1 || manifest.repository !== REPO || manifest.intent !== 'nondeploying-release-rehearsal') {
    errors.push('Wrong schema, repository or non-deploy intent');
  }
  if (manifest.releaseAuthorization !== 'denied') errors.push('Release authorization must be explicitly denied');
  if (manifest.h6ExactHead !== null) errors.push('H6 exact head must be filled only in separately inspected certification; release candidate is not approved');
  const phases = manifest.parents;
  if (!Array.isArray(phases) || phases.length !== 3) errors.push('Exactly H3, H4, H5 evidence must be recorded');
  const observedRunIds = new Set();
  const observedArtifacts = new Set();
  if (Array.isArray(phases)) for (const [i, phase] of phases.entries()) {
    if (!plain(phase) || phase.phase !== ['H3', 'H4', 'H5'][i] || phase.pr !== [98, 97, 99][i] || !sha(phase.head) || phase.head !== PINNED_PREDECESSORS[i]?.head) {
      errors.push(`Invalid predecessor identity at index ${i}`);
      continue;
    }
    if (!Array.isArray(phase.checks) || phase.checks.length !== REQUIRED_WORKFLOWS.length) {
      errors.push(`Expected eight source-linked checks for ${phase.phase}`);
    } else {
      const seen = new Set();
      for (const check of phase.checks) {
        if (!plain(check) || !REQUIRED_WORKFLOWS.includes(check.name) || seen.has(check.name) ||
          !pos(check.runId) || observedRunIds.has(check.runId) ||
          check.runId !== PINNED_PREDECESSORS[i].runs[REQUIRED_WORKFLOWS.indexOf(check.name)] ||
          check.conclusion !== 'success' ||
          check.url !== base + check.runId) {
          errors.push(`Invalid/duplicate exact-head CI receipt for ${phase.phase}`);
          continue;
        }
        seen.add(check.name);
        observedRunIds.add(check.runId);
      }
      if (seen.size !== REQUIRED_WORKFLOWS.length) errors.push(`Missing CI workflow for ${phase.phase}`);
    }
    if (!Array.isArray(phase.artifacts) || phase.artifacts.length !== 2) {
      errors.push(`Expected Quality and Notes receipts for ${phase.phase}`);
    } else {
      const seenNames = new Set();
      for (const artifact of phase.artifacts) {
        if (!plain(artifact) || !['studio-certification','hub-notes-contract-evidence'].includes(artifact.name) ||
          seenNames.has(artifact.name) || !pos(artifact.id) || observedArtifacts.has(artifact.id) ||
          artifact.id !== PINNED_PREDECESSORS[i].artifacts[['studio-certification','hub-notes-contract-evidence'].indexOf(artifact.name)] ||
          (i === 2 && artifact.sha256 !== PINNED_PREDECESSORS[i].digests[['studio-certification','hub-notes-contract-evidence'].indexOf(artifact.name)]) ||
          !(Array.isArray(phase.checks) && phase.checks.some(check => check && check.runId === artifact.runId &&
            check.name === (artifact.name === 'studio-certification' ? 'Quality' : 'Hub Notes integration'))) ||
          artifact.url !== base + artifact.runId ||
          (artifact.sha256 !== undefined && !/^[0-9a-f]{64}$/.test(artifact.sha256))) {
          errors.push(`Invalid/duplicate artifact source for ${phase.phase}`);
          continue;
        }
        seenNames.add(artifact.name);
        observedArtifacts.add(artifact.id);
      }
      if (seenNames.size !== 2) errors.push(`Incomplete artifact receipts for ${phase.phase}`);
    }
  }
  const pending = [];
  if (!Array.isArray(manifest.externalGates) || manifest.externalGates.length !== REQUIRED_EXTERNAL_GATES.length) {
    errors.push('All external/human acceptance gates must be present');
  } else {
    const seen = new Set();
    for (const gate of manifest.externalGates) {
      if (!plain(gate) || !REQUIRED_EXTERNAL_GATES.includes(gate.id) || seen.has(gate.id)) {
        errors.push('Unknown or duplicate human acceptance gate');
        continue;
      }
      seen.add(gate.id);
      // This preparation phase never treats claims, links or synthetic fixtures as approval.
      // Real-world signoff is independently adjudicated in a future authorized phase.
      if (gate.status !== 'pending' || gate.evidence !== null) errors.push(`Unverified operator approval for ${gate.id}`);
      pending.push(gate.id);
    }
    if (seen.size !== REQUIRED_EXTERNAL_GATES.length) errors.push('Missing external acceptance gate');
  }
  return {
    valid: errors.length === 0,
    errors,
    inspectedPredecessorRuns: observedRunIds.size,
    artifactReceipts: observedArtifacts.size,
    externalPending: pending,
    releaseEligible: false,
    productionActionsPermitted: false,
  };
}

export function rehearseH6Rollback(manifest) {
  const audit = inspectH6Evidence(manifest);
  if (!audit.valid) throw new Error(`Evidence invalid: ${audit.errors.join('; ')}`);
  // Pure data output only: NO network, branch mutation, migration, purge,
  // credentials, deployment, external API, filesystem modification or rollback.
  return {
    kind: 'H6_NONDEPLOYING_ROLLBACK_REHEARSAL',
    checkedPredecessorRuns: audit.inspectedPredecessorRuns,
    checkedArtifactReceipts: audit.artifactReceipts,
    candidateAllowed: false,
    publishAllowed: false,
    rollbackExecuted: false,
    externalPending: audit.externalPending,
    decision: 'BLOCKED_AWAITING_H6_CI_AND_HUMAN_ACCEPTANCE',
    steps: [
      'Maintain H3/H4/H5 as separate unmerged draft branches',
      'Verify H6 exact-head CI and independently re-fetch immutable predecessor evidence',
      'Have an authorized operator compare published canonical Prism visuals with signed-off reference',
      'If acceptance ever fails, leave the deployed version untouched and preserve rollback instructions for operator review',
      'Do not register OAuth clients, activate APIs, run live migrations, purge caches or deploy',
    ],
  };
}
