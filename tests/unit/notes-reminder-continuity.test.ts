import {describe,expect,it} from 'vitest';
import {
  freshNotesReminderShare,projectNotesReminders,renderNotesCalendarContinuity,
  renderNotesTodayHorizon,
} from '../../src/lib/workspace/notes-reminder-continuity';
import {renderTodayWorkbench} from '../../src/lib/workspace/today-workbench';
import {initialState} from '../../src/lib/workspace/model';
import type {NotesDeviceSummary} from '../../src/lib/workspace/notes-device';

const NOW=Date.parse('2026-10-17T12:00:00Z');
const snapshot=():NotesDeviceSummary=>({
  schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',
  generatedAt:new Date(NOW).toISOString(),activeCount:25,notes:[],
  reminders:[
    {id:'past-owned',noteId:'owner-note1',title:'Old reading reminder',dueAt:'2026-10-16T08:00:00Z'},
    {id:'tomorrow-owned',noteId:'owner-note2',title:'Study <theorem> & proofs',dueAt:'2026-10-17T22:30:00Z'},
    {id:'sunday-owned',noteId:'owner-note3',title:'University handout',dueAt:'2026-10-18T19:15:00Z'},
    {id:'future-owned',noteId:'owner-note4',title:'Later seminar',dueAt:'2026-10-25T08:30:00Z'},
  ]
});
describe('owner-approved Notes deadlines alongside native Hub planning',()=>{
  it('converts actual UTC reminder instants to Berlin local civil days without booking calendar time',()=>{
    const src=snapshot(),before=JSON.stringify(src);
    const days=['2026-10-17','2026-10-18','2026-10-19','2026-10-20',
      '2026-10-21','2026-10-22','2026-10-23'];
    const result=projectNotesReminders(src,days,'Europe/Berlin',NOW,'2026-10-17');
    expect(result.days).toHaveLength(7);
    expect(result.days[0]!.reminders).toHaveLength(0);
    expect(result.days[1]!.reminders.map(r=>r.title)).toEqual([
      'Study <theorem> & proofs','University handout',
    ]);
    expect(result.overdue.map(r=>r.title)).toEqual(['Old reading reminder']);
    expect(result.inRange).toBe(2);
    expect(result.count).toBe(4);
    expect(JSON.stringify(src)).toBe(before);
  });
  it('does not duplicate a reminder when week dates repeat and skips invalid days',()=>{
    const dates=['2026-10-18','2026-10-18','bad','2026-10-17'];
    const data=projectNotesReminders(snapshot(),dates,'Europe/Berlin',NOW);
    expect(data.days.map(x=>x.day)).toEqual(['2026-10-18','2026-10-17']);
    expect(data.inRange).toBe(2);
  });
  it('renders original Notes reminders and escapes hostile titles with no Hub source IDs or writer commands',()=>{
    const src=snapshot();
    const html=renderNotesCalendarContinuity(
      '2026-10-18','day','2026-10-17','Europe/Berlin',src,NOW);
    expect(html).toContain('Study &lt;theorem&gt; &amp; proofs');
    expect(html).not.toContain('<theorem>');
    expect(html).toContain('data-notes-reminder-day="2026-10-18"');
    expect(html).toContain('href="/notes/"');
    expect(html).toContain('data-action="clear-notes-source"');
    expect(html).not.toContain('data-id="tomorrow-owned"');
    expect(html).not.toContain('data-action="complete-task"');
    expect(html).toContain('Due times are not calendar reservations');
  });
  it('week review includes original source rows without presenting them as Hub events or tasks',()=>{
    const html=renderNotesCalendarContinuity(
      '2026-10-18','week','2026-10-17','Europe/Berlin',snapshot(),NOW);
    expect(html).toContain('data-notes-reminder-day="2026-10-12"');
    expect(html).toContain('data-notes-reminder-day="2026-10-18"');
    expect(html).toContain('University handout');
    expect(html).not.toContain('data-action="planning-task-selected"');
    expect(html).not.toContain('data-action="review-event-time"');
  });
  it('Today shows overdue and upcoming source knowledge alongside original Hub work, without copying',()=>{
    const state=initialState([],null);
    state.preferences.timezone='Europe/Berlin';
    const stateBefore=JSON.stringify(state);
    const html=renderTodayWorkbench(state,'2026-10-17',null,NOW,snapshot());
    expect(html).toContain('data-notes-reminder-horizon');
    expect(html).toContain('Old reading reminder');
    expect(html).toContain('Study &lt;theorem&gt; &amp; proofs');
    expect(html).not.toContain('Later seminar');
    expect(JSON.stringify(state)).toBe(stateBefore);
    expect(renderNotesTodayHorizon('2026-10-17','Europe/Berlin',null,NOW))
      .not.toContain('Study &lt;theorem&gt;');
  });
  it('revocation, expiry, malformed provenance and future shares never disclose private owner titles',()=>{
    const src=snapshot();
    const gone=renderNotesCalendarContinuity('2026-10-18','day','2026-10-17',
      'Europe/Berlin',null,NOW);
    expect(gone).not.toContain('theorem');
    const expired=renderNotesCalendarContinuity('2026-10-18','day','2026-10-17',
      'Europe/Berlin',src,NOW+6*60_000);
    expect(expired).toContain('expired');
    expect(expired).not.toContain('theorem');
    expect(freshNotesReminderShare(src,NOW+6*60_000)).toBeNull();
    expect(freshNotesReminderShare({...src,source:'other'} as unknown as NotesDeviceSummary,NOW)).toBeNull();
    expect(freshNotesReminderShare({...src,generatedAt:new Date(NOW+60_000).toISOString()},NOW)).toBeNull();
  });
});
