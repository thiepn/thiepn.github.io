import {describe,it,expect} from 'vitest';
import {acceptMddReply,MDD_FD1_MESSAGE} from '../../src/lib/workspace/mdd-device';
import {buildFaithReviewSignals} from '../../src/lib/workspace/faith-weekly';
const now=Date.parse('2026-10-17T09:00:00.000Z');
const nonce='0123456789abcdef0123456789abcdef';
const dates=Array.from({length:7},(_,i)=>{
 const d=new Date('2026-10-17T12:00:00Z');d.setUTCDate(d.getUTCDate()-6+i);
 return {date:d.toISOString().slice(0,10),
  reading:{status:i===6?'assigned':'history-unavailable',completed:i===6?2:null,assigned:i===6?4:null},
  reflection:{exists:i===0||i===6}};
});
const message={
 type:MDD_FD1_MESSAGE,source:'mdd-device-local',nonce,
 observedAt:new Date(now).toISOString(),expiresAt:new Date(now+60_000).toISOString(),
 evidence:{schema:'thiepn.mdd.discipline.local',version:1,coverage:'device-local',
 date:'2026-10-17',reading:dates[6]!.reading,reflection:dates[6]!.reflection,
 week:{schema:'thiepn.mdd.discipline.week.local',version:1,coverage:'device-local',
  from:'2026-10-11',through:'2026-10-17',dates}}
};
describe('FD1 original MDD seven-date evidence acceptance',()=>{
 it('accepts one-time approved, exact seven-day owner rows',()=>{
  const evidence=acceptMddReply(message,nonce,now);
  expect(evidence?.week?.dates).toHaveLength(7);
  const signal=buildFaithReviewSignals({folio:null,mdd:evidence!,tms:null},now)[1];
  expect(signal!.detail).toContain('2 of 4 assigned passages currently marked complete');
  expect(signal!.detail).toContain('6 self-paced historical date(s) unavailable');
  expect(signal!.detail).toContain('not a completion-time log');
 });
 it('rejects fabricated or inconsistent weeks',()=>{
  expect(acceptMddReply({...message,evidence:{...message.evidence,
   week:{...message.evidence.week,dates:[...dates.slice(0,5),dates[5],dates[5]]}}},nonce,now)).toBeNull();
  expect(acceptMddReply({...message,evidence:{...message.evidence,
   week:{...message.evidence.week,dates:[...dates.slice(0,6),{...dates[6],reading:{...dates[6]!.reading,completed:10}}]}}},nonce,now)).toBeNull();
  expect(acceptMddReply(message,nonce,now+61_000)).toBeNull();
  expect(acceptMddReply(message,'00000000000000000000000000000000',now)).toBeNull();
 });
 it('does not accept or project prayer/reflective bodies',()=>{
  const approved=acceptMddReply({...message,evidence:{...message.evidence,
    privateJournalBody:'sensitive',privatePrayerText:'sensitive'}},nonce,now);
  expect(JSON.stringify(approved)).not.toContain('sensitive');
 });
});
