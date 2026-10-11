import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { expectedR3Dossier, validateR3Dossier, R3_STATE } from '../../scripts/ci-r3-owner-custody-policy.mjs';
import { R2_EXPECTED } from '../../scripts/ci-r2-trusted-runner-policy.mjs';
const dossier=JSON.parse(readFileSync(new URL('../../evidence/ci-r3/owner-custody-preparation.json',import.meta.url),'utf8'));
const r2=JSON.parse(readFileSync(new URL('../../evidence/ci-r2/trusted-runner-design.json',import.meta.url),'utf8'));
const workflows=Object.fromEntries(Object.keys(R2_EXPECTED).map(name=>[
  name,readFileSync(new URL('../../.github/workflows/'+name,import.meta.url),'utf8'),
]));
const mutate=f=>{const x=structuredClone(dossier);f(x);return x;};
const denied=x=>expect(validateR3Dossier(x,r2,workflows)).not.toEqual([]);
describe('CI R3 static owner custody and release refusal',()=>{
  it('keeps the source manifest identical to unapproved and unexecuted baseline',()=>{
    expect(R3_STATE).toBe('PREPARATION_ONLY_NO_GO');
    expect(dossier).toEqual(expectedR3Dossier());
    expect(validateR3Dossier(dossier,r2,workflows)).toEqual([]);
    expect(dossier.sixSuites).toHaveLength(6);
    expect(dossier.humanGates).toHaveLength(7);
    expect(dossier.physicalObservations).toHaveLength(6);
  });
  it('denies simulated owner signatures, branch protection and private tokens',()=>{
    for (const f of [
      x=>x.owner.approval='APPROVED',
      x=>x.owner.controlPlane='ACTIVE',
      x=>x.owner.branchProtection='VERIFIED',
      x=>x.owner.candidateSha='a'.repeat(40),
      x=>x.owner.signedCustodyRecord='fake',
      x=>x.token.githubAppInstalled=true,
      x=>x.token.tokenIssued=true,
      x=>x.token.allowedInPublicPR=true,
      x=>x.execution.trustedRunnerExecuted=true,
      x=>x.execution.pairedSuitesStatus='PASS',
      x=>x.execution.originalLogsCollected=6,
    ]) denied(mutate(f));
  });
  it('denies missing/changed suite pins, claimed physical approval and release overrides',()=>{
    for (const f of [
      x=>x.sixSuites.pop(),
      x=>x.sixSuites[0].accountSha='b'.repeat(40),
      x=>x.sixSuites[0].status='PASS',
      x=>x.humanGates.pop(),
      x=>x.humanGates[0].status='PASS',
      x=>x.physicalObservations[0].status='WAIVED',
      x=>x.release.status='GO',
      x=>x.release.mergeAllowed=true,
      x=>x.release.deployAllowed=true,
      x=>x.baseline.r2Head='c'.repeat(40),
      x=>x.owner.signature='fabricated',
    ]) denied(mutate(f));
  });
  it('inherits and checks R2 policy and the original R1 Account guards',()=>{
    const broken=structuredClone(r2);
    broken.tokenPolicy.allowedInPublicPr=true;
    expect(validateR3Dossier(dossier,broken,workflows)).not.toEqual([]);
    const file='hub-integration.yml';
    const changed={...workflows,[file]:workflows[file].replace(
      'run: node scripts/hub-account-ci-boundary.mjs','run: true')};
    expect(validateR3Dossier(dossier,r2,changed)).not.toEqual([]);
  });
});
