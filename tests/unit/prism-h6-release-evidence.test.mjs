import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  inspectH6Evidence, rehearseH6Rollback, REQUIRED_EXTERNAL_GATES,
  REQUIRED_WORKFLOWS,
} from '../../src/lib/prism/h6-release-evidence.mjs';

const snapshot = JSON.parse(readFileSync(
  new URL('../../docs/evidence/HUB_V1_1_H6_RELEASE_EVIDENCE.json', import.meta.url), 'utf8'));
const mutate = fn => { const result = structuredClone(snapshot); fn(result); return result; };

describe('H6 independent evidence integrity and nondeploy rehearsal', () => {
  it('recognizes only source-linked, exact-head H3/H4/H5 evidence; never accepts release', () => {
    const result = inspectH6Evidence(snapshot);
    expect(result).toMatchObject({
      valid: true, inspectedPredecessorRuns: 24, artifactReceipts: 6,
      releaseEligible: false, productionActionsPermitted: false,
    });
    expect(result.externalPending).toEqual([...REQUIRED_EXTERNAL_GATES]);
    for (const phase of snapshot.parents) {
      expect(phase.checks.map(check => check.name)).toEqual([...REQUIRED_WORKFLOWS]);
      expect(new Set(phase.checks.map(check => check.runId)).size).toBe(8);
    }
  });

  it('fails closed on forged/changed source link, result or duplicate GitHub run', () => {
    for (const edited of [
      mutate(m => { m.parents[0].checks[0].conclusion = 'pending'; }),
      mutate(m => { m.parents[1].checks[2].url = 'https://outside.example/forged'; }),
      mutate(m => { m.parents[2].checks[3].runId = m.parents[0].checks[3].runId; }),
      mutate(m => { m.parents[2].checks[1].name = m.parents[2].checks[0].name; }),
      mutate(m => { m.parents[1].head = 'a'.repeat(39); }),
      mutate(m => { m.parents[1].pr = 999; }),
    ]) {
      expect(inspectH6Evidence(edited).valid).toBe(false);
    }
  });

  it('rejects missing workflow, malformed fields and missing quality artifact without crashing', () => {
    for (const edited of [
      mutate(m => { m.parents[0].checks.pop(); }),
      mutate(m => { m.parents[1].checks = {}; }),
      mutate(m => { m.parents[2].artifacts[0].id = m.parents[0].artifacts[0].id; }),
      mutate(m => { m.parents[0].artifacts[0].name = 'hub-notes-contract-evidence'; }),
      mutate(m => { m.parents[2].artifacts[0].sha256 = 'unsafe'; }),
    ]) {
      expect(inspectH6Evidence(edited).valid).toBe(false);
    }
  });

  it('rejects all synthetic human approval attempts, including a plausible-looking URL', () => {
    for (const edited of [
      mutate(m => { m.externalGates[0].status = 'approved'; }),
      mutate(m => {
        m.externalGates[0].status = 'approved';
        m.externalGates[0].evidence = { reviewer: 'unknown', url: 'https://example.org/audit' };
      }),
      mutate(m => { m.externalGates[2].evidence = 'synthetic'; }),
      mutate(m => { m.releaseAuthorization = 'approved'; }),
      mutate(m => { m.h6ExactHead = 'a'.repeat(40); }),
    ]) {
      expect(inspectH6Evidence(edited).valid).toBe(false);
    }
  });

  it('runs only a dry rollback decision that never authorizes a production write', () => {
    const result = rehearseH6Rollback(snapshot);
    expect(result).toMatchObject({
      kind: 'H6_NONDEPLOYING_ROLLBACK_REHEARSAL', checkedPredecessorRuns: 24,
      checkedArtifactReceipts: 6, candidateAllowed: false, publishAllowed: false,
      rollbackExecuted: false, decision: 'BLOCKED_AWAITING_H6_CI_AND_HUMAN_ACCEPTANCE',
    });
    expect(result.externalPending).toHaveLength(6);
    expect(JSON.stringify(result)).not.toMatch(/ownerId|accountId|deviceId|token|password|PRIVATE_KEY/);
    expect(() => rehearseH6Rollback(mutate(m => { m.externalGates[0].status = 'approved'; }))).toThrow();
  });

  it('is isolated from real deploy APIs, accounts, network endpoints and secret material', () => {
    expect(Object.keys(snapshot).sort()).toEqual([
      'externalGates','h6ExactHead','intent','parents','provenance','releaseAuthorization',
      'repository','schemaVersion',
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(/access_token|refresh_token|password|client_secret|supabase\.co|service_role|privateKey/i);
  });
});
