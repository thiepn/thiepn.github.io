import {describe,it,expect} from 'vitest';
import {buildFaithReviewSignals} from '../../src/lib/workspace/faith-weekly';
import type {FolioDeviceSnapshot} from '../../src/lib/workspace/folio-device';
const now=Date.parse('2026-10-16T20:00:00.000Z');
const folio:FolioDeviceSnapshot={
 schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
 generatedAt:new Date(now).toISOString(),date:'2026-10-16',
 tasks:[],pendingCount:0,overdueCount:0,events:[],notes:[],
 habits:[{id:'original-folio-habit',title:'Prayer',target:1,value:1,status:'completed'}]
};
const mdd={date:'2026-10-16',observedAt:new Date(now).toISOString(),
 expiresAt:new Date(now+60000).toISOString(),
 reading:{status:'assigned' as const,completed:2,assigned:4},reflection:{exists:true}};
const tms={dueTaskCount:3,dueVerseCount:2,newVerseCount:1,
 observedAt:new Date(now).toISOString(),expiresAt:new Date(now+60000).toISOString()};
describe('FD1 review provenance without fabricated weekly spiritual metrics',()=>{
 it('does not imply whole-week totals from one-day owner snapshots',()=>{
   const rows=buildFaithReviewSignals({folio,mdd,tms},now);
   expect(rows).toHaveLength(3);
   expect(rows.every(row=>row.status==='available')).toBe(true);
   expect(rows[0]!.detail).toContain('Not a weekly total');
   expect(rows[1]!.detail).toContain('One-day snapshot');
   expect(rows[2]!.detail).toContain('not a weekly-completion measure');
   expect(JSON.stringify(rows)).not.toContain('holinessScore');
 });
 it('fails closed on missing or expired owner authorization',()=>{
   const rows=buildFaithReviewSignals({folio,mdd,tms},now+360000);
   expect(rows.every(row=>row.status==='unavailable')).toBe(true);
 });
});
