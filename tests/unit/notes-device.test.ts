import {expect,it} from 'vitest';
import {parseNotesDeviceSummary,acceptNotesReply,NOTES_DEVICE_MESSAGE} from '../../src/lib/workspace/notes-device';
const now=Date.parse('2026-10-16T08:00:00Z');
const fixture=()=>({
  schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',
  generatedAt:'2026-10-16T08:00:00Z',activeCount:1,
  notes:[{id:'n1',title:'Source-owned note',updatedAt:'2026-10-15T11:00:00Z',pinned:false}],
  reminders:[{id:'r1',noteId:'n1',title:'Source-owned note',dueAt:'2026-10-17T13:00:00Z'}],
});
it('accepts only the genuine source schema, nonce and bounded titles',()=>{
  expect(parseNotesDeviceSummary(fixture(),now).activeCount).toBe(1);
  expect(acceptNotesReply({type:NOTES_DEVICE_MESSAGE,nonce:'a',snapshot:fixture()},'a',now).notes).toHaveLength(1);
  expect(()=>acceptNotesReply({type:NOTES_DEVICE_MESSAGE,nonce:'b',snapshot:fixture()},'a',now)).toThrow();
  expect(()=>parseNotesDeviceSummary({...fixture(),notes:[{id:'n',title:'<script>',updatedAt:'2026-10-15T11:00:00Z',pinned:false}]},now)).toThrow();
  expect(()=>parseNotesDeviceSummary({...fixture(),notes:Array(9).fill(fixture().notes[0])},now)).toThrow();
  expect(()=>parseNotesDeviceSummary(fixture(),now+6*60_000)).toThrow();
});
