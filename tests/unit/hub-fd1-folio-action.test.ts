import { describe,it,expect } from 'vitest';
import { parseFolioDeviceSnapshot } from '../../src/lib/workspace/folio-device';
describe('FD1 owner-approved action source revision',()=>{
 const now=Date.parse('2026-10-17T08:00:00.000Z');
 const v={schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
   generatedAt:new Date(now).toISOString(),date:'2026-10-17',
   pendingCount:0,overdueCount:0,tasks:[],events:[],notes:[],
   habits:[{id:'original-habit-1',title:'Prayer',target:1,value:0,
     status:'open',updatedAt:new Date(now-1000).toISOString()}]};
 it('retains optional original habit revision without fabricating it',()=>{
   expect(parseFolioDeviceSnapshot(v,now).habits[0].updatedAt).toBe(v.habits[0].updatedAt);
   const old={...v,habits:[{id:'id',title:'Practice',target:1,value:0,status:'open'}]};
   expect(parseFolioDeviceSnapshot(old,now).habits[0].updatedAt).toBeUndefined();
 });
 it('refuses malformed CAS metadata before rendering owner actions',()=>{
   expect(()=>parseFolioDeviceSnapshot({...v,habits:[{...v.habits[0],updatedAt:'fake'}]},now)).toThrow();
 });
});
