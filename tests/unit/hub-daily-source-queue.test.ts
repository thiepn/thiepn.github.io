import { describe, expect, it } from 'vitest';
import { buildSourceQueue, type SourceQueueInputs } from '../../src/lib/workspace/daily-source-queue';
import { renderSourceToday } from '../../src/lib/workspace/source-today';
import type { HubLanguageCard } from '../../src/lib/workspace/language-read';

const day='2026-10-17';
const language=(stale=false):HubLanguageCard=>({
  appId:'japanese',name:'Japanese',due:8,todayEvents:0,streakDays:2,lastStudiedAt:null,
  metrics:[],action:{label:'Review'},generatedAt:'2026-10-17T08:00:00Z',
  storedAt:'2026-10-17T08:00:00Z',stale,
});
const inputs=():SourceQueueInputs=>({
  day,timezone:'Europe/Berlin',
  folio:{status:'ready',snapshot:{
    schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
    generatedAt:'2026-10-17T08:00:00Z',date:day,pendingCount:5,overdueCount:1,
    tasks:[
      {id:'f1',title:'Folio <private> task',plannedToday:true,deadline:'2026-10-15',priority:'high'},
      {id:'f2',title:'Folio appointment preparation',plannedToday:true,priority:'low'},
    ],events:[],notes:[],habits:[],
  }},
  notes:{status:'ready',snapshot:{
    schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',
    generatedAt:'2026-10-17T08:00:00Z',activeCount:2,notes:[],
    reminders:[
      {id:'n1',noteId:'note1',title:'Notes due now',dueAt:'2026-10-17T09:00:00Z'},
      {id:'n2',noteId:'note2',title:'Notes upcoming',dueAt:'2026-10-20T09:00:00Z'},
      {id:'n3',noteId:'note3',title:'Too far away',dueAt:'2026-11-05T09:00:00Z'},
    ],
  }},
  languages:{status:'ready',cards:[language()]},
});

describe('P1 source-owned Today queue',()=>{
  it('ranks overdue, due and upcoming source work without duplicating or mutating owners',()=>{
    const input=inputs(),before=JSON.stringify(input);
    const result=buildSourceQueue(input);
    expect(result.connectedSources).toBe(3);
    expect(result.rows[0]?.title).toBe('Folio <private> task');
    expect(result.rows[0]?.kind).toBe('overdue');
    expect(result.rows.some(r=>r.title==='Notes due now'&&r.kind==='today')).toBe(true);
    expect(result.rows.some(r=>r.title==='Japanese reviews'&&r.kind==='review')).toBe(true);
    expect(result.rows.find(r=>r.title==='Notes upcoming')?.kind).toBe('upcoming');
    expect(result.rows.some(r=>r.title==='Too far away')).toBe(false);
    expect(result.rows.every(r=>!r.href.includes('f1')&&!r.href.includes('n1'))).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('does not hallucinate records from missing, stale or wrong-day sources',()=>{
    const input=inputs();
    input.folio.status='unavailable';
    input.notes.status='disconnected';
    input.languages.cards=[language(true)];
    const result=buildSourceQueue(input);
    expect(result.rows).toHaveLength(0);
    expect(result.connectedSources).toBe(1);
    expect(result.incomplete).toBe(true);
    input.folio.status='ready';
    input.folio.snapshot!.date='2026-10-16';
    expect(buildSourceQueue(input).rows).toHaveLength(0);
  });
  it('caps visible actions and exposes partial coverage rather than false zero due',()=>{
    const result=buildSourceQueue(inputs(),2);
    expect(result.rows).toHaveLength(2);
    expect(result.available).toBeGreaterThan(2);
    expect(result.incomplete).toBe(true);
    const missing=inputs();
    missing.folio={status:'disconnected',snapshot:null};
    missing.notes={status:'disconnected',snapshot:null};
    missing.languages={status:'signed-out',cards:[]};
    expect(buildSourceQueue(missing).rows).toHaveLength(0);
    expect(buildSourceQueue(missing).connectedSources).toBe(0);
  });
  it('escapes private owner titles, uses original owner links and never creates Hub writes',()=>{
    const data=inputs();
    const html=renderSourceToday({...data,apps:[]});
    expect(html).toContain('data-source-queue');
    expect(html).toContain('Folio &lt;private&gt; task');
    expect(html).not.toContain('<private>');
    expect(html).toContain('href="/folio/?view=today"');
    expect(html).toContain('href="/notes/"');
    expect(html).toContain('Partial coverage');
    expect(html).not.toContain('data-action="brief-complete-task"');
  });
});
