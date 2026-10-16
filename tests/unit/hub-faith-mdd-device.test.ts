import {describe,it,expect} from 'vitest';
import {acceptMddReply,MDD_FD1_MESSAGE} from '../../src/lib/workspace/mdd-device';
describe('MDD source-owned one-shot device handoff',()=>{
  const nonce='0123456789abcdef0123456789abcdef';
  const now=Date.parse('2026-10-16T19:00:00Z');
  const payload={
    type:MDD_FD1_MESSAGE,nonce,source:'mdd-device-local',
    observedAt:new Date(now).toISOString(),expiresAt:new Date(now+60000).toISOString(),
    evidence:{schema:'thiepn.mdd.discipline.local',version:1,date:'2026-10-16',
      coverage:'device-local',reading:{status:'assigned',completed:2,assigned:4},
      reflection:{exists:true}},
  };
  it('accepts only exact short-lived, owner-shaped metadata',()=>{
    expect(acceptMddReply(payload,nonce,now)?.reading.completed).toBe(2);
    expect(acceptMddReply(payload,'fedcba9876543210fedcba9876543210',now)).toBeNull();
    expect(acceptMddReply(payload,nonce,now+60001)).toBeNull();
  });
  it('rejects invented completion, journal bodies and mismatched schema',()=>{
    expect(acceptMddReply({...payload,evidence:{...payload.evidence,reading:{...payload.evidence.reading,completed:7}}},nonce,now)).toBeNull();
    expect(acceptMddReply({...payload,evidence:{...payload.evidence,coverage:'cloud'}},nonce,now)).toBeNull();
    const extra={...payload,evidence:{...payload.evidence,privateBody:'not shared'}};
    expect(JSON.stringify(acceptMddReply(extra,nonce,now))).not.toContain('not shared');
  });
});
