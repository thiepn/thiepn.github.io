import {expect,it} from 'vitest';
import {renderSourceToday} from '../../src/lib/workspace/source-today';
const data={schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',generatedAt:'2026-10-16T08:00:00Z',activeCount:1,
notes:[{id:'n',title:'Notes < confidential >',updatedAt:'2026-10-16T07:00:00Z',pinned:false}],
reminders:[{id:'r',noteId:'n',title:'Remember <text>',dueAt:'2026-10-17T08:00:00Z'}]} as const;
it('offers source-only consent when no owner-approved snapshots exist',()=>{
  const html=renderSourceToday({folio:{status:'disconnected',snapshot:null},notes:{status:'disconnected',snapshot:null},
    languages:{status:'signed-out',cards:[]},apps:[]});
  expect(html).toContain('Share from Folio');
  expect(html).toContain('Share from Notes');
  expect(html).toContain('No cross-app grades');
  expect(html).not.toContain('Notes < confidential >');
});
it('renders approved Notes titles escaped, with no forged local data',()=>{
  const html=renderSourceToday({folio:{status:'disconnected',snapshot:null},notes:{status:'ready',snapshot:data},
    languages:{status:'signed-out',cards:[]},apps:[]});
  expect(html).toContain('Notes &lt; confidential &gt;');
  expect(html).toContain('Remember &lt;text&gt;');
  expect(html).toContain('data-action="clear-notes-source"');
  expect(html).not.toContain('< confidential >');
});
