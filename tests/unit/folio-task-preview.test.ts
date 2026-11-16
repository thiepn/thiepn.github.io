import { expect, it } from 'vitest';
import { freshFolioDeviceSnapshot, FOLIO_DEVICE_FRESH_MS, type FolioDeviceSnapshot } from '../../src/lib/workspace/folio-device';
import { renderFolioTaskPreview } from '../../src/lib/workspace/folio-panel';

const now = Date.parse('2026-10-16T12:00:00.000Z');
function localDay(value:number){
  const d=new Date(value);
  return [String(d.getFullYear()).padStart(4,'0'),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function snapshot(overrides:Partial<FolioDeviceSnapshot>={}):FolioDeviceSnapshot{
  return {
    schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
    generatedAt:new Date(now).toISOString(),date:localDay(now),
    pendingCount:15,overdueCount:2,
    tasks:Array.from({length:12},(_,i)=>({id:'folio-'+i,title:i===0?'<img src=x onerror=alert(1)>':'Owner task '+i,
      priority:i===0?'critical':'normal',plannedToday:true,deadline:localDay(now)})),
    events:[],notes:[],habits:[],...overrides,
  };
}
it('expires an approved share after five minutes and at a local-day boundary',()=>{
  const s=snapshot();
  expect(freshFolioDeviceSnapshot(s,now)).toBe(true);
  expect(freshFolioDeviceSnapshot(s,now+FOLIO_DEVICE_FRESH_MS-1)).toBe(true);
  expect(freshFolioDeviceSnapshot(s,now+FOLIO_DEVICE_FRESH_MS)).toBe(false);
  expect(freshFolioDeviceSnapshot(s,now-1)).toBe(false);
  expect(freshFolioDeviceSnapshot(snapshot({date:'2026-10-15'}),now)).toBe(false);
});
it('displays bounded Folio tasks as read-only without silently losing the true total',()=>{
  const html=renderFolioTaskPreview('ready',snapshot(),now);
  expect(html).toContain('Showing 12 of 15 planned/due Folio tasks');
  expect(html).toContain('remaining 3');
  expect(html).toContain('2 overdue');
  expect(html.toLowerCase()).toContain('read-only');
  expect(html).toContain('/folio/?view=today');
  expect(html).not.toContain('<img src=x');
  expect(html).toContain('&lt;img');
  expect(html).not.toContain('type="checkbox"');
  expect(html).not.toContain('data-action="complete');
  expect(html).not.toContain('data-task-toggle');
});
it('hides expired content and preserves explicit unavailable/awaiting feedback',()=>{
  const s=snapshot();
  expect(renderFolioTaskPreview('ready',s,now+FOLIO_DEVICE_FRESH_MS)).not.toContain('Owner task');
  expect(renderFolioTaskPreview('ready',s,now+FOLIO_DEVICE_FRESH_MS)).toContain('expired');
  expect(renderFolioTaskPreview('awaiting',null,now)).toContain('Approve the one-time share');
  expect(renderFolioTaskPreview('disconnected',null,now)).toContain('not copy tasks into Hub');
});
