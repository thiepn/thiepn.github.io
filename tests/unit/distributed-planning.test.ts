import { describe, it, expect } from 'vitest';
import { initialState, parseState } from '../../src/lib/workspace/model';
import { taskSnapshot } from '../../src/lib/workspace/weekly-followthrough';
import { prepareDistributedWeek, applyDistributedWeek, planningHorizon } from '../../src/lib/workspace/distributed-planning';
import { compareApprovedFolioTime, folioWarningsForProposedEvent } from '../../src/lib/workspace/source-time-review';
import { renderSourceToday } from '../../src/lib/workspace/source-today';
import type { CalendarEvent, Task } from '../../src/lib/workspace/types';
import type { FolioDeviceSnapshot } from '../../src/lib/workspace/folio-device';

const task=(id:string,due='',priority:Task['priority']='medium',time=''):Task=>
  ({id,title:'Task '+id,notes:'Private Hub details',due,time,priority,completedAt:null});
const event=(id:string,start:string,end:string):CalendarEvent=>({
  id,title:'Hub '+id,date:'2026-10-20',endDate:'2026-10-20',
  start,end,zone:'Europe/Berlin',allDay:false
});
const folio=():FolioDeviceSnapshot=>({
  schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
  generatedAt:'2026-10-16T10:00:00.000Z',date:'2026-10-16',pendingCount:0,overdueCount:0,
  tasks:[],notes:[],habits:[],
  events:[
    {id:'f1',title:'Folio private meeting',start:'2026-10-20T08:30:00.000Z',
      end:'2026-10-20T09:30:00.000Z',kind:'event',allDay:false},
    {id:'f2',title:'Folio separate meeting',start:'2026-10-21T08:00:00.000Z',
      end:'2026-10-21T09:00:00.000Z',kind:'event',allDay:false},
  ],
});
describe('reviewed Hub planning and private source overlays',()=>{
  it('distributes only selected canonical task due dates and preserves schema v1 and other records',()=>{
    const state=initialState([],null);
    state.preferences.timezone='Europe/Berlin';
    state.tasks.push(task('a','','high','08:45'),task('b','2026-10-17','low'),
      task('c','','medium'),task('existing-1','2026-10-19'),
      task('existing-2','2026-10-19'));
    state.events.push(event('block','2026-10-20T08:00:00.000Z','2026-10-20T09:00:00.000Z'));
    const originals=state.tasks.slice(0,3).map(taskSnapshot);
    const before=JSON.stringify(state);
    const planned=prepareDistributedWeek(state,originals,'2026-10-19',3);
    expect(JSON.stringify(state)).toBe(before);
    expect(planned.load).toHaveLength(3);
    expect(planned.changes).toHaveLength(3);
    expect(new Set(planned.changes.map(item=>item.after)).size).toBeGreaterThan(1);
    expect(planned.changes.find(item=>item.id==='a')?.clearedTime).toBe('08:45');
    const committed=applyDistributedWeek(state,originals,'2026-10-19',3);
    expect(committed.changes).toEqual(planned.changes);
    expect(state.tasks.find(item=>item.id==='a')?.time).toBe('');
    expect(state.tasks.find(item=>item.id==='existing-1')?.due).toBe('2026-10-19');
    expect(state.events).toHaveLength(1);
    expect(state.tasks.every(item=>originals.some(x=>x.id===item.id) || !!item.due)).toBe(true);
    expect(parseState(JSON.stringify(state)).schemaVersion).toBe(1);
    expect(()=>applyDistributedWeek(state,originals,'2026-10-19',3)).toThrow('changed');
  });
  it('rejects stale, duplicate or completed inputs without partially mutating records',()=>{
    const state=initialState([],null);
    state.tasks.push(task('a'),task('b'));
    const snapshots=state.tasks.map(taskSnapshot);
    state.tasks[0]!.title='Changed';
    const before=JSON.stringify(state);
    expect(()=>applyDistributedWeek(state,snapshots,'2026-10-19',5)).toThrow('changed');
    expect(JSON.stringify(state)).toBe(before);
    expect(()=>prepareDistributedWeek(state,[snapshots[1]!,snapshots[1]!],'2026-10-19',3)).toThrow('twice');
    expect(()=>planningHorizon('30')).toThrow();
    expect(()=>prepareDistributedWeek(state,[snapshots[1]!],'2026-10-40',3)).toThrow('date');
    state.tasks[1]!.completedAt='2026-10-16T00:00:00Z';
    expect(()=>prepareDistributedWeek(state,[snapshots[1]!],'2026-10-19',3)).toThrow('changed');
  });
  it('does not convert deadlines to time blocks or claim free time from an incomplete Folio projection',()=>{
    const source=folio();
    const hub=[event('one','2026-10-20T08:00:00.000Z','2026-10-20T09:00:00.000Z'),
      event('two','2026-10-21T10:00:00.000Z','2026-10-21T11:00:00.000Z')];
    const collisions=compareApprovedFolioTime(hub,source);
    expect(collisions).toMatchObject([{hubEventId:'one',folioEventId:'f1',minutes:30}]);
    expect(folioWarningsForProposedEvent(hub[0]!,source,'Europe/Berlin').timed).toHaveLength(1);
    expect(compareApprovedFolioTime(hub,null)).toEqual([]);
    const allDay={...hub[0]!,allDay:true,start:'',end:''};
    expect(compareApprovedFolioTime([allDay],source)).toEqual([]);
  });
  it('escapes owner note titles, keeps native source disclosure and never exposes data without consent',()=>{
    const original=folio();
    original.events[0]={...original.events[0]!,title:'<script>untrusted</script>'};
    const inputs={folio:{status:'ready' as const,snapshot:original},
      notes:{status:'disconnected' as const,snapshot:null},
      languages:{status:'signed-out' as const,cards:[]},
      apps:[],hubEvents:[event('one','2026-10-20T08:00:00.000Z','2026-10-20T09:00:00.000Z')]};
    const html=renderSourceToday(inputs);
    expect(html).toContain('&lt;script&gt;untrusted');
    expect(html).not.toContain('<script>');
    expect(html).toContain('possible timed overlap');
    expect(html).toContain('Folio remains the owner');
    const disconnected=renderSourceToday({...inputs,folio:{status:'disconnected',snapshot:null}});
    expect(disconnected).not.toContain('untrusted');
    expect(disconnected).not.toContain('possible timed overlap');
  });
});
