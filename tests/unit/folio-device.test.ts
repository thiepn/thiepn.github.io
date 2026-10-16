import {expect,it} from 'vitest';
import {parseFolioDeviceSnapshot,safeFolioBridgeReply,FOLIO_DEVICE_MESSAGE} from '../../src/lib/workspace/folio-device';
const now=Date.parse('2026-10-16T09:00:00Z');
const data=()=>({
 schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
 generatedAt:'2026-10-16T09:00:00.000Z',date:'2026-10-16',
 pendingCount:1,overdueCount:0,
 tasks:[{id:'owner-1',title:'Canonical Folio task',priority:'high',plannedToday:true}],
 events:[{id:'block-1',title:'Lecture',start:'2026-10-16T12:00:00Z',end:'2026-10-16T13:00:00Z',kind:'event',allDay:false}],
 notes:[{id:'note-1',title:'Owned by Folio',updatedAt:'2026-10-16T08:30:00Z'}],
 habits:[{id:'habit-1',title:'Exercise',target:1,value:1,status:'completed'}]
});
it('accepts only a bounded Folio-owned schema and handoff nonce',()=>{
 expect(parseFolioDeviceSnapshot(data(),now).pendingCount).toBe(1);
 expect(safeFolioBridgeReply({type:FOLIO_DEVICE_MESSAGE,nonce:'abc',snapshot:data()},'abc',now).tasks).toHaveLength(1);
 expect(()=>safeFolioBridgeReply({type:FOLIO_DEVICE_MESSAGE,nonce:'wrong',snapshot:data()},'abc',now)).toThrow();
 expect(()=>parseFolioDeviceSnapshot({...data(),notes:[{id:'n',title:'x',updatedAt:'bad'}]},now)).toThrow();
 expect(()=>parseFolioDeviceSnapshot({...data(),tasks:Array(13).fill(data().tasks[0])},now)).toThrow();
 expect(()=>parseFolioDeviceSnapshot(data(),now+6*60_000)).toThrow();
});
