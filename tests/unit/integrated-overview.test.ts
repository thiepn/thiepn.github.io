import { describe, expect, it } from 'vitest';
import { integratedLocalDay } from '../../src/lib/workspace/integrated-overview';
import type { WorkspaceState } from '../../src/lib/workspace/types';

function localFixture(): WorkspaceState {
  return {
    preferences: { timezone:'Europe/Berlin' },
    tasks: [
      {id:'1',title:'Study',due:'2026-10-16',time:'09:00',notes:'',priority:'high',completedAt:null},
      {id:'2',title:'Overdue',due:'2026-10-15',time:'',notes:'',priority:'none',completedAt:null},
      {id:'3',title:'Done yesterday',due:'2026-10-15',time:'',notes:'',priority:'none',completedAt:'2026-10-15T09:00:00Z'},
      {id:'4',title:'Unscheduled',due:'',time:'',notes:'',priority:'none',completedAt:null},
    ],
    events: [
      {id:'1',title:'Lecture',date:'2026-10-16',endDate:'2026-10-16',allDay:false,start:'2026-10-15T22:30:00Z',end:'2026-10-15T23:30:00Z',zone:'Europe/Berlin'},
      {id:'2',title:'Tomorrow',date:'2026-10-17',endDate:'2026-10-17',allDay:true,start:'',end:'',zone:'Europe/Berlin'},
    ],
    trackers: [
      { id:'reading',title:'Reading',kind:'count',unit:'sessions',goal:5,cadence:'weekly' },
    ],
    logs: [{ id:'log1',trackerId:'reading',date:'2026-10-15',value:2,note:'' }],
    notes: [
      {id:'1',title:'Older',body:'Private',updatedAt:'2026-10-12T12:00:00Z'},
      {id:'2',title:'Newest',body:'Private',updatedAt:'2026-10-16T08:00:00Z'},
    ],
  } as unknown as WorkspaceState;
}
describe('native local Hub overview', () => {
  it('projects Hub records at local midnight without writing copies', () => {
    const state=localFixture();
    const result=integratedLocalDay(state,new Date('2026-10-15T23:00:00Z'));
    expect(result.date).toBe('2026-10-16');
    expect(result.tasks.map(t=>t.id)).toEqual(['2','1']);
    expect(result.remaining).toBe(2);
    expect(result.overdue).toBe(1);
    expect(result.unscheduled).toBe(1);
    expect(result.agenda.map(e=>e.title)).toEqual(['Lecture']);
    expect(result.recentNotes[0]?.title).toBe('Newest');
    expect(result.upcoming.map(e=>e.title)).toEqual(['Tomorrow']);
    expect(result.trackerProgress).toMatchObject([{id:'reading',total:2,goal:5,cadence:'weekly'}]);
    expect(state.tasks).toHaveLength(4);
    expect(state.notes[0]?.title).toBe('Older');
  });
});
