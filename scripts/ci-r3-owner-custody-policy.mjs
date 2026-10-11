/**
 * R3 validates a fixed, source-only NO_GO owner custody dossier.
 * It NEVER collects signatures, issues credentials or runs paired suites.
 * Claiming owner approval in this public PR must fail, not become an attestation.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { R2_EXPECTED, validateR2StaticPlan } from './ci-r2-trusted-runner-policy.mjs';

export const R3_STATE = 'PREPARATION_ONLY_NO_GO';
export const R3_OWNER_BLOCK = 'BLOCKED_OWNER_AUTHORIZATION';
const heads = Object.freeze({
  r2Head:'978e70c6960d2f8dff561bffbe0d49dfef046931',
  r1Head:'ba011df894ec44a583e3d8eb55b90e8a1f1c40e2',
  habitsV1Head:'dd31fd8d153cb4d9ba06b6e55a5deea0aaeb7b4f',
  habitsV0Head:'114ecb845dcd59bfe76be9f3aaa8aa00322e19da',
  lastObservedMain:'29537702c4e3698cb780bcc3c479e385d29bd3c8',
});
const gates = Object.freeze([
  'two-owner-oauth-consent','physical-android-ios','screen-reader-keyboard',
  'device-local-reconsent','security-review','prism-visual-owner',
  'release-owner-authorization',
]);
const physical = Object.freeze([
  'android-chrome','android-samsung-internet','ios-safari','android-talkback',
  'ios-voiceover','physical-keyboard',
]);
export function expectedR3Dossier() {
  return {
    schemaVersion:1,kind:'THIEPN_HUB_CI_R3_OWNER_CUSTODY_PREPARATION',status:R3_STATE,
    baseline:{...heads},
    owner:{controlPlane:'NOT_SELECTED',branchProtection:'UNVERIFIED',
      workflowProtection:'NOT_VERIFIED',independentReviewer:'NOT_ASSIGNED',
      approval:'NOT_GIVEN',signedCustodyRecord:'NOT_COLLECTED',candidateSha:null,
      approvalNonce:null,disposition:'NO_GO'},
    token:{githubAppInstalled:false,tokenIssued:false,onlyRepository:'thiepn/account',
      onlyPermission:'contents:read',allowedInPublicPR:false,
      allowedInCandidateProcess:false,revocationObserved:'NOT_TESTED'},
    execution:{trustedRunnerExecuted:false,pairedSuitesStatus:'BLOCKED_NOT_EXECUTED',
      originalLogsCollected:0,privateArtifactsCollected:0,witness:'NOT_GIVEN',
      verifiedCleanup:'NOT_TESTED',privateSourceToPublicArtifacts:false},
    sixSuites:Object.entries(R2_EXPECTED).map(([workflow,entry])=>({
      workflow,accountSha:entry[1],testConfig:entry[2],status:'NOT_EXECUTED',
    })),
    humanGates:gates.map(id=>({id,status:'OPEN'})),
    physicalObservations:physical.map(id=>({id,status:'NOT_TESTED'})),
    release:{status:'NO_GO',mergeAllowed:false,deployAllowed:false,
      migrationAllowed:false,purgeAllowed:false,rollbackAllowed:false},
  };
}
function stable(value) {
  if (Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.keys(value).sort()
    .map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export function validateR3Dossier(dossier,r2Plan,workflowSources) {
  const errors = [];
  if (stable(dossier)!==stable(expectedR3Dossier()))
    errors.push('Public R3 dossier is not the exact unapproved NO_GO preparation state');
  for (const e of validateR2StaticPlan(r2Plan,workflowSources))
    errors.push('Inherited R2 security contract: '+e);
  return errors;
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const dossier=JSON.parse(readFileSync(resolve(root,'evidence/ci-r3/owner-custody-preparation.json'),'utf8'));
  const r2=JSON.parse(readFileSync(resolve(root,'evidence/ci-r2/trusted-runner-design.json'),'utf8'));
  const workflowSources=Object.fromEntries(Object.keys(R2_EXPECTED).map(name=>[
    name,readFileSync(resolve(root,'.github/workflows',name),'utf8'),
  ]));
  const errors=validateR3Dossier(dossier,r2,workflowSources);
  if (errors.length) {
    for (const e of errors) process.stderr.write('R3 POLICY INVALID: '+e+'\n');
    process.exitCode=1;
  } else {
    process.stdout.write('R3 STATIC SOURCE CONTRACT PASS; '+R3_OWNER_BLOCK+'; NO privileged runner, approval, private integration or release.\n');
  }
}
