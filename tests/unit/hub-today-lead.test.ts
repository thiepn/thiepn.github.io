import {describe,it,expect} from 'vitest';
import {projectTodayLead} from '../../src/lib/workspace/unified-journey';
import type {WorkspaceState,Task,CalendarEvent} from '../../src/lib/workspace/types';
const task=(id:string,due:string,priority:Task['priority']='none'):Task=>({id,title:id,notes:'',due,time:'',priority,completedAt:null});
const event=(id:string,start:string):CalendarEvent=>({id,title:id,date:'2026-10-18',endDate:'2026-10-18',start,end:new Date(Date.parse(start)+3600000).toISOString(),zone:'Europe/Berlin',allDay:false});
const fixture=():WorkspaceState=>({schemaVersion:1,revision:0,active:'w',workspaces:[],
 preferences:{rail:true,density:'comfortable',timezone:'Europe/Berlin',hidden:false},
 tasks:[],events:[],notes:[],trackers:[],logs:[],activity:[],captureDraft:'',legacyBackup:null});
describe('PI-04 original-source Today lead projection',()=>{
 it('prioritizes overdue then due tasks without writing a ranking',()=>{
  const s=fixture();s.tasks=[task('inbox',''),task('overdue','2026-10-17'),task('today','2026-10-18')];
  const before=JSON.stringify(s),lead=projectTodayLead(s,'2026-10-18');
  expect(lead.suggestion?.id).toBe('overdue');expect(lead.basis).toBe('Due or overdue');expect(JSON.stringify(s)).toBe(before);
 });
 it('uses the native unscheduled task without fabricating a user-selected priority',()=>{
  const s=fixture();s.tasks=[task('later','2026-10-20','high'),task('draft','')];
  expect(projectTodayLead(s,'2026-10-18').suggestion?.id).toBe('draft');
  expect(projectTodayLead(s,'2026-10-18').basis).toBe('Unscheduled Hub task');
 });
 it('only displays actual local calendar events in start order; never task clocks as appointments',()=>{
  const s=fixture();s.tasks=[{...task('a','2026-10-18'),time:'15:30'}];
  s.events=[event('late','2026-10-18T16:00:00Z'),event('early','2026-10-18T08:00:00Z')];
  expect(projectTodayLead(s,'2026-10-18').events.map(e=>e.id)).toEqual(['early','late']);
  s.events=[];expect(projectTodayLead(s,'2026-10-18').events).toHaveLength(0);
 });
 it('has an explicit empty state with no inferred source or preference',()=>{
  const lead=projectTodayLead(fixture(),'2026-10-18');
  expect(lead.suggestion).toBeNull();expect(lead.events).toHaveLength(0);
  expect(lead.basis).toBe('No selected priority');
 });
});
