import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  QUALIFIED_H6_HEAD, QUALIFIED_H6_MERGE, QUALIFIED_H6_ARCHIVE, REQUIRED_H6_CI,
  REQUIRED_OPERATOR_GATES, inspectH7OperatorPacket, rehearseH7ReleaseDecision,
} from '../../src/lib/prism/h7-operator-decision.mjs';

const packet = JSON.parse(readFileSync(
  new URL('../../docs/evidence/HUB_V1_1_H7_OPERATOR_PACKET.json', import.meta.url), 'utf8'));
const changed = edit => { const value=structuredClone(packet);edit(value);return value; };

describe('H7 evidence-backed independent operator decision', () => {
  it('pins real H6 exact-head and checked PR merge tree, preserving all unapproved gates', () => {
    expect(packet.qualifiedH6.head).toBe(QUALIFIED_H6_HEAD);
    expect(packet.qualifiedH6.testedPrMergeTree).toBe(QUALIFIED_H6_MERGE);
    expect(packet.qualifiedH6.artifacts[0].reportedArchiveDigest).toBe(QUALIFIED_H6_ARCHIVE);
    expect(inspectH7OperatorPacket(packet)).toMatchObject({
      valid:true,sourceLinkedChecks:8,verifiedArtifact:true,
      releaseAllowed:false,deployAllowed:false,rollbackExecuted:false,
    });
    expect(packet.operatorGates.map(g=>g.id)).toEqual([...REQUIRED_OPERATOR_GATES]);
    expect(packet.qualifiedH6.checks.map(x=>x.runId)).toEqual(REQUIRED_H6_CI.map(x=>x[1]));
  });

  it('denies forged exact-head, merge tree and plausible replacement artifact digest', () => {
    for(const invalid of [
      changed(p=>{p.qualifiedH6.head='a'.repeat(40);}),
      changed(p=>{p.qualifiedH6.testedPrMergeTree='b'.repeat(40);}),
      changed(p=>{p.qualifiedH6.artifacts[0].reportedArchiveDigest='c'.repeat(64);}),
      changed(p=>{p.qualifiedH6.artifacts[0].independentlyRechecked=false;}),
      changed(p=>{p.qualifiedH6.artifacts[0].archiveZipCrcValid=false;}),
      changed(p=>{p.qualifiedH6.artifacts[0].rehearsalPublishAllowed=true;}),
    ]) expect(inspectH7OperatorPacket(invalid).valid).toBe(false);
  });

  it('rejects substituted or omitted CI runs, failed checks, and wrong repository links', () => {
    for(const invalid of [
      changed(p=>{p.qualifiedH6.checks[0].runId=123456; p.qualifiedH6.checks[0].url='https://github.com/thiepn/thiepn.github.io/actions/runs/123456';}),
      changed(p=>{p.qualifiedH6.checks[1].conclusion='failure';}),
      changed(p=>{p.qualifiedH6.checks[2].name='Quality';}),
      changed(p=>{p.qualifiedH6.checks.pop();}),
      changed(p=>{p.qualifiedH6.checks[4].url='https://untrusted.invalid/runs/38007120451';}),
    ]) expect(inspectH7OperatorPacket(invalid).valid).toBe(false);
  });

  it('never upgrades unsupported human and physical-device claims', () => {
    for(const invalid of [
      changed(p=>{p.operatorGates[0].status='APPROVED';}),
      changed(p=>{p.operatorGates[1].proof={url:'https://example.org/fake-proof'};}),
      changed(p=>{p.operatorGates[2].reviewer='Fictional operator';}),
      changed(p=>{p.operatorGates[3].observedAt='2026-10-10T00:00:00Z';}),
      changed(p=>{p.operatorGates[4].observation='Looks good';}),
      changed(p=>{p.operatorGates[5].id=p.operatorGates[6].id;}),
      changed(p=>{p.approvalSignatures=['unsigned or synthetic'];}),
      changed(p=>{p.operatorChallenge='replayed-challenge';}),
    ]) expect(inspectH7OperatorPacket(invalid).valid).toBe(false);
  });

  it('prevents all publication, migration, merge or rollback operations', () => {
    for (const key of ['publicationAllowed','mergeAllowed','migrationAllowed','rollbackExecuted','releaseAuthorization']) {
      const invalid=changed(p=>{p[key]=true;});
      expect(inspectH7OperatorPacket(invalid).valid).toBe(false);
      expect(()=>rehearseH7ReleaseDecision(invalid)).toThrow();
    }
    expect(inspectH7OperatorPacket(changed(p=>{p.releaseDecision='GO';})).valid).toBe(false);
  });

  it('produces an independently reviewable NO-GO packet with no private subjects', () => {
    const receipt=rehearseH7ReleaseDecision(packet);
    expect(receipt).toMatchObject({
      decision:'NO_GO_PENDING_REAL_WORLD_AND_INDEPENDENT_SIGNOFF',
      sourceLinkedChecks:8,releaseAllowed:false,mergeAllowed:false,
      deployAllowed:false,rollbackExecuted:false,
      realAccountReviewed:false,physicalDeviceReviewed:false,humanSignoffCollected:false,
    });
    expect(receipt.externalOpen).toHaveLength(7);
    expect(JSON.stringify(receipt)).not.toMatch(/access_token|refresh_token|password|service_role|accountId|deviceId|privateKey/i);
  });
});
