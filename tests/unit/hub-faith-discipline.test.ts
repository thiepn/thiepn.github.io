import { describe, expect, it } from 'vitest';
import { renderFaithDiscipline } from '../../src/lib/workspace/faith-discipline';
import type { FolioDeviceSnapshot } from '../../src/lib/workspace/folio-device';

const snapshot: FolioDeviceSnapshot = {
  schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
  generatedAt:'2026-10-16T12:00:00Z',date:'2026-10-16',tasks:[],
  pendingCount:0,overdueCount:0,events:[],notes:[],
  habits:[{id:'owner-h1',title:'Private practice',target:1,value:1,status:'completed'}],
};
describe('FD1 source-safe Hub presentation',()=>{
 it('never shows fabricated owner progress when disconnected',()=>{
   const html=renderFaithDiscipline(null,[]);
   expect(html).toContain('progress is unavailable');
   expect(html).not.toContain('marked complete');
   expect(html).toContain('no authorized MDD progress projection yet');
 });
 it('shows only explicitly approved Folio habit statuses',()=>{
   const html=renderFaithDiscipline(snapshot,[]);
   expect(html).toContain('Private practice');
   expect(html).toContain('recorded');
   expect(html).not.toContain('holiness score:');
 });
 it('uses an approved Hub launch rather than inventing an MDD URL',()=>{
   const apps=[{id:'my-daily-devotion',title:'My Daily Devotion',url:'https://example.test/authorized',icon:'book',category:'faith'}];
   expect(renderFaithDiscipline(null,apps)).toContain('https://example.test/authorized');
 });
});
