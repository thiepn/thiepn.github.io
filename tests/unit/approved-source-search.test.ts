import { describe, expect, it } from 'vitest';
import { approvedSourceRows } from '../../src/lib/workspace/approved-source-search';
import { findPalette } from '../../src/lib/workspace/search-palette';
import type { WorkspaceState } from '../../src/lib/workspace/types';
import type { NotesDeviceSummary } from '../../src/lib/workspace/notes-device';
import type { FolioDeviceSnapshot } from '../../src/lib/workspace/folio-device';
import type { HubLanguageCard } from '../../src/lib/workspace/language-read';

const now = Date.parse('2026-10-16T12:00:00.000Z');
const generatedAt = '2026-10-16T12:00:00.000Z';
const notes: NotesDeviceSummary = {
  schema: 'thiepn:notes-hub-local', version: 1, source: 'notes-local-device',
  generatedAt, activeCount: 2,
  notes: [{id:'note-a',title:'<Lecture> outline',updatedAt:generatedAt,pinned:true}],
  reminders: [{id:'rem-a',noteId:'note-a',title:'Review chapter',dueAt:generatedAt}],
};
const folio: FolioDeviceSnapshot = {
  schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
  generatedAt,date:'2026-10-16',pendingCount:1,overdueCount:0,
  tasks:[{id:'task-a',title:'Submit proposal',priority:'high',plannedToday:true}],
  events:[{id:'event-a',title:'Seminar',start:generatedAt,end:'2026-10-16T13:00:00.000Z',kind:'event',allDay:false}],
  notes:[{id:'folio-note-a',title:'Reading outline',updatedAt:generatedAt}],
  habits:[{id:'habit-a',title:'Meditation',target:1,value:1,status:'completed'}],
};
const japanese: HubLanguageCard = {
  appId:'japanese',name:'Japanese',due:4,todayEvents:2,streakDays:3,
  lastStudiedAt:generatedAt,metrics:[],
  action:{label:'Continue native practice',route:'/japanese/'},
  generatedAt,storedAt:generatedAt,stale:false,
};
describe('owner-approved search candidates', () => {
  it('never searches unconsented app contents or creates a shadow index', () => {
    const rows = approvedSourceRows({folio:null,notes:null,languages:[],apps:[],now});
    expect(rows).toEqual([]);
  });
  it('projects bounded source-owned titles, reminders, tasks, events, habits, and action links', () => {
    const rows = approvedSourceRows({folio,notes,languages:[],apps:[],now});
    expect(rows.map(r=>r.id)).toEqual([
      'folio:task:task-a','folio:event:event-a','folio:note:folio-note-a',
      'folio:habit:habit-a','notes:note:note-a','notes:reminder:rem-a',
    ]);
    expect(rows.find(r=>r.id==='notes:note:note-a')?.href).toBe('/notes/');
    expect(rows.find(r=>r.id==='folio:event:event-a')?.href).toBe('/folio/?view=planner');
    expect(rows.find(r=>r.id==='folio:habit:habit-a')?.detail).toContain('Logged');
    expect(rows.every(r=>!/(?:secret|body|content|token|accountId)/i.test(r.detail))).toBe(true);
  });
  it('rejects expired owner snapshots instead of inferring live progress', () => {
    const rows = approvedSourceRows({folio,notes,languages:[],apps:[],now:now+6*60_000});
    expect(rows).toEqual([]);
  });
  it('offers published original-language continuation without inventing a grader', () => {
    const rows = approvedSourceRows({folio:null,notes:null,languages:[japanese],apps:[],now});
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Japanese');
    expect(rows[0]?.detail).toContain('4 source-reported items due');
    expect(rows[0]?.href.startsWith('https://thiepn.dev/japanese/')).toBe(true);
    expect(rows[0]?.id).toBe('language:japanese:japanese');
    const outdated = approvedSourceRows({folio:null,notes:null,
      languages:[{...japanese,stale:true}],apps:[],now});
    expect(outdated[0]?.detail).toContain('Outdated published');
  });
  it('searches only already approved candidate metadata; tilde selects source scope', () => {
    const sources = approvedSourceRows({folio,notes,languages:[],apps:[],now});
    const results = findPalette({
      apps:[],sources,state:{} as WorkspaceState,query:'~lecture',scope:'all',
      route:'/',today:'2026-10-16',
    });
    expect(results.actualScope).toBe('sources');
    expect(results.results.map(r=>r.title)).toEqual(['<Lecture> outline']);
    expect(results.results[0]?.href).toBe('/notes/');
    expect(results.results[0]?.group).toBe('sources');
    expect(findPalette({apps:[],sources:[],state:null,query:'~lecture',scope:'all',
      route:'/',today:'2026-10-16'}).results).toEqual([]);
  });
});
