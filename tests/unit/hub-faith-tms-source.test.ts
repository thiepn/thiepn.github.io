import {describe,it,expect} from 'vitest';
import {clearFaithTmsDue,publishFaithTmsDue,getFaithTmsDue} from '../../src/lib/workspace/faith-source-session';

describe('FD1 original TMS60 grant and expiry',()=>{
  const now=Date.parse('2026-10-16T19:00:00Z');
  const snapshot={
    status:'ready',
    observedAt:new Date(now).toISOString(),expiresAt:new Date(now+45_000).toISOString(),
    data:{dueTaskCount:7,dueVerseCount:4,newVerseCount:2},
  };
  it('never accepts ungranted or invented review counts',()=>{
    clearFaithTmsDue();
    expect(publishFaithTmsDue(snapshot,false,now)).toBe(false);
    expect(getFaithTmsDue(now)).toBeNull();
    expect(publishFaithTmsDue({...snapshot,data:{...snapshot.data,dueVerseCount:-1}},true,now)).toBe(false);
    expect(getFaithTmsDue(now)).toBeNull();
  });
  it('expires the real owner snapshot instead of turning unknown into zero',()=>{
    expect(publishFaithTmsDue(snapshot,true,now)).toBe(true);
    expect(getFaithTmsDue(now)?.dueTaskCount).toBe(7);
    expect(getFaithTmsDue(now+46_000)).toBeNull();
    clearFaithTmsDue();
  });
  it('fails closed after revocation',()=>{
    expect(publishFaithTmsDue(snapshot,true,now)).toBe(true);
    clearFaithTmsDue();
    expect(getFaithTmsDue(now)).toBeNull();
  });
});
