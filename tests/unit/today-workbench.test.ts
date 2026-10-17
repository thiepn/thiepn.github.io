import { describe, expect, it } from 'vitest';
import { projectTodayWorkbench, renderTodayWorkbench, projectFolioWorkbench } from '../../src/lib/workspace/today-workbench';
import type { FolioDeviceSnapshot } from '../../src/lib/workspace/folio-device';
import type { WorkspaceState } from '../../src/lib/workspace/types';

const fixture=()=>({
  preferences:{timezone:'Europe/Berlin',rail:true,density:'compact',hidden:false},
  tasks:[
    {id:'overdue',title:'Old work',notes:'',due:'2026-10-16',time:'',priority:'high',completedAt:null},
    {id:'today',title:'Current task',notes:'',due:'2026-10-17',time:'10:00',priority:'high',completedAt:null},
    {id:'soon',title:'Upcoming <private>',notes:'',due:'2026-10-19',time:'',priority:'medium',completedAt:null},
    {id:'far',title:'Later task',notes:'',due:'2026-10-24',time:'',priority:'low',completedAt:null},
    {id:'done',title:'Finished task',notes:'',due:'2026-10-19',time:'',priority:'medium',completedAt:'2026-10-16T18:00:00Z'},
    {id:'inbox',title:'No date yet',notes:'',due:'',time:'',priority:'none',completedAt:null},
  ],
  events:[
    {id:'event1',title:'Seminar',date:'2026-10-19',endDate:'2026-10-19',
      start:'2026-10-19T08:00:00Z',end:'2026-10-19T09:00:00Z',zone:'Europe/Berlin',allDay:false},
    {id:'event2',title:'Meeting',date:'2026-10-19',endDate:'2026-10-19',
      start:'2026-10-19T08:30:00Z',end:'2026-10-19T09:30:00Z',zone:'Europe/Berlin',allDay:false},
  ],
  trackers:[{id:'habit1',title:'Read <test>',kind:'count',unit:'chapters',goal:5,cadence:'weekly'}],
  logs:[{id:'log1',trackerId:'habit1',date:'2026-10-15',value:2,note:'private journal'}],
  notes:[
    {id:'note1',title:'Latest <note>',body:'SECRET SOURCE BODY',updatedAt:'2026-10-16T11:00:00Z'},
    {id:'note2',title:'Older note',body:'PRIVATE DETAILS',updatedAt:'2026-10-10T10:00:00Z'},
  ],
} as unknown as WorkspaceState);
describe('native Today execution workbench',()=>{
  it('projects exactly seven Hub-local days with real deadlines, events and overlaps',()=>{
    const state=fixture(),before=JSON.stringify(state);
    const result=projectTodayWorkbench(state,'2026-10-17');
    expect(result.days).toHaveLength(7);
    expect(result.days.map(d=>d.date)).toEqual([
      '2026-10-17','2026-10-18','2026-10-19','2026-10-20',
      '2026-10-21','2026-10-22','2026-10-23',
    ]);
    expect(result.days[0]?.taskCount).toBe(1);
    expect(result.days[2]?.taskCount).toBe(1);
    expect(result.days[2]?.eventCount).toBe(2);
    expect(result.days[2]?.overlappingEventPairs).toBe(1);
    expect(result.nextTasks.map(x=>x.id)).toEqual(['soon']);
    expect(result.upcomingCount).toBe(1);
    expect(JSON.stringify(state)).toBe(before);
  });
  it('reuses original tracker logs and note order with no extra authority',()=>{
    const result=projectTodayWorkbench(fixture(),'2026-10-17');
    expect(result.trackers[0]).toMatchObject({logged:2,goal:5,label:'This calendar week'});
    expect(result.recentNotes.map(note=>note.id)).toEqual(['note1','note2']);
    expect(result.trackerCount).toBe(1);
    expect(result.noteCount).toBe(2);
  });
  it('escapes sensitive metadata and exposes real native actions, not a second writer',()=>{
    const html=renderTodayWorkbench(fixture(),'2026-10-17');
    expect(html).toContain('data-today-workbench');
    expect(html).toContain('Upcoming &lt;private&gt;');
    expect(html).toContain('Read &lt;test&gt;');
    expect(html).toContain('Latest &lt;note&gt;');
    expect(html).not.toContain('<private>');
    expect(html).not.toContain('SECRET SOURCE BODY');
    expect(html).not.toContain('PRIVATE DETAILS');
    expect(html).toContain('data-action="unified-triage" data-id="soon"');
    expect(html).toContain('data-action="log-tracker" data-id="habit1"');
    expect(html).toContain('data-action="edit-note" data-id="note1"');
    expect(html).toContain('/home/calendar/?date=2026-10-19');
    expect(html).toContain('task clock is not a calendar block');
  });
  it('produces useful empty sections without inventing external due dates or reviews',()=>{
    const state=fixture();state.tasks=[];state.events=[];state.notes=[];state.trackers=[];state.logs=[];
    const html=renderTodayWorkbench(state,'2026-10-17');
    expect(html).toContain('No additional Hub task deadlines');
    expect(html).toContain('No Hub trackers yet');
    expect(html).toContain('No local Hub notes yet');
    expect(html).not.toContain('Connected Folio');
  });

  it('shows only fresh approved Folio tasks/blocks alongside Hub calendar and hides revoked data',()=>{
    const s=fixture();
    const now=Date.parse('2026-10-17T12:00:00Z');
    const folio:FolioDeviceSnapshot={
      schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
      generatedAt:new Date(now).toISOString(),date:'2026-10-17',
      pendingCount:2,overdueCount:0,habits:[],notes:[],
      tasks:[{id:'original-folio',title:'Private <Folio task>',priority:'high',
        plannedToday:false,deadline:'2026-10-19'}],
      events:[{id:'original-event',title:'Folio <appointment>',kind:'event',
        allDay:false,start:'2026-10-19T08:30:00Z',end:'2026-10-19T09:15:00Z'}],
    };
    const before=JSON.stringify(s),sourceBefore=JSON.stringify(folio);
    const rows=projectFolioWorkbench(s,'2026-10-17',folio,now);
    expect(rows).toHaveLength(7);
    expect(rows[2]).toMatchObject({date:'2026-10-19',taskCount:1,blockCount:1,overlaps:1});
    const html=renderTodayWorkbench(s,'2026-10-17',folio,now);
    expect(html).toContain('data-folio-workbench-day="2026-10-19"');
    expect(html).toContain('Private &lt;Folio task&gt;');
    expect(html).toContain('Folio &lt;appointment&gt;');
    expect(html).toContain('possible Hub/Folio time overlap');
    expect(html).not.toContain('data-action="edit-task" data-id="original-folio"');
    expect(html).not.toContain('<Folio task>');
    expect(html).toContain('data-action="disconnect-folio"');
    expect(renderTodayWorkbench(s,'2026-10-17',null,now)).not.toContain('Private');
    expect(renderTodayWorkbench(s,'2026-10-17',folio,now+16*60_000)).not.toContain('Private');
    expect(projectFolioWorkbench(s,'2026-10-17',folio,now+16*60_000)).toEqual([]);
    expect(JSON.stringify(s)).toBe(before);
    expect(JSON.stringify(folio)).toBe(sourceBefore);
  });
  it('offers native Hub event review only when original-owner Folio shares show an overlap',()=>{
    const state=fixture(),now=Date.parse('2026-10-17T12:00:00Z');
    const folio:FolioDeviceSnapshot={
      schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
      generatedAt:new Date(now).toISOString(),date:'2026-10-17',
      pendingCount:0,overdueCount:0,notes:[],tasks:[],habits:[],
      events:[{id:'folio-foreign-id',title:'Folio & meeting',kind:'event',
        allDay:false,start:'2026-10-19T08:30:00Z',end:'2026-10-19T09:15:00Z'}],
    };
    const html=renderTodayWorkbench(state,'2026-10-17',folio,now);
    expect(html).toContain('data-today-folio-conflicts');
    expect(html).toContain('data-action="review-event-time" data-id="event1"');
    expect(html).toContain('Folio &amp; meeting');
    expect(html).not.toContain('data-action="review-event-time" data-id="folio-foreign-id"');
    expect(renderTodayWorkbench(state,'2026-10-17',null,now)).not.toContain('data-today-folio-conflicts');
    expect(renderTodayWorkbench(state,'2026-10-17',folio,now+16*60_000)).not.toContain('data-today-folio-conflicts');
  });
});
