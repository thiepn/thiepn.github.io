import {describe,it,expect} from 'vitest';
import {initialState,trackerTotal,dayKey} from '../../src/lib/workspace/model';
import {saveTracker,saveTrackerLog,removeTracker} from '../../src/lib/workspace/commands/trackers';
import type {Tracker,TrackerLog} from '../../src/lib/workspace/types';
const tracker:Tracker={id:'reading',title:'Reading',kind:'duration',unit:'minutes',goal:60,cadence:'daily'};
const entry:TrackerLog={id:'entry',trackerId:'reading',date:'2026-10-16',value:30,note:'Morning'};
function populated(){const state=initialState([],null);saveTracker(state,tracker,'create');saveTrackerLog(state,entry,'create','2026-10-16');return state;}
describe('tracker measurement history',()=>{
 it('allows goal and period changes without rewriting recorded measurements',()=>{
  const state=populated();saveTracker(state,{...tracker,goal:120,cadence:'weekly'},'update');
  expect(state.logs).toEqual([entry]);expect(trackerTotal(state,'reading','2026-10-16')).toBe(30);
 });
 it.each([{unit:'hours'},{kind:'count' as const}])('rejects measurement changes with history before modifying anything: %j',change=>{
  const state=populated(),before=structuredClone(state);
  expect(()=>saveTracker(state,{...tracker,...change},'update')).toThrow('recorded history');expect(state).toEqual(before);
 });
 it('lets an unused tracker change measurement and never retains caller references',()=>{
  const state=initialState([],null),input={...tracker};saveTracker(state,input,'create');input.unit='external mutation';
  expect(state.trackers[0]?.unit).toBe('minutes');saveTracker(state,{...tracker,unit:'hours'},'update');expect(state.trackers[0]?.unit).toBe('hours');
 });
 it('corrects the existing entry without counting it twice or changing another tracker',()=>{
  const state=populated();saveTracker(state,{...tracker,id:'other'},'create');saveTrackerLog(state,{...entry,value:15,note:'Corrected'},'update','2026-10-16');
  expect(state.logs).toHaveLength(1);expect(trackerTotal(state,'reading','2026-10-16')).toBe(15);
  expect(()=>saveTrackerLog(state,{...entry,trackerId:'other'},'update','2026-10-16')).toThrow('removed or changed');
 });
 it('does not resurrect a deleted tracker or log from a stale edit',()=>{
  const state=populated();removeTracker(state,'reading');expect(state.logs).toEqual([]);
  expect(()=>saveTracker(state,tracker,'update')).toThrow('removed');expect(()=>saveTrackerLog(state,entry,'update','2026-10-16')).toThrow('removed');
  saveTracker(state,tracker,'create');expect(()=>saveTrackerLog(state,entry,'update','2026-10-16')).toThrow('removed or changed');
 });
 it('rejects retried create IDs rather than duplicating or overwriting measurements',()=>{
  const state=populated();expect(()=>saveTrackerLog(state,{...entry,value:99},'create','2026-10-16')).toThrow('already exists');expect(state.logs).toEqual([entry]);
 });
 it('uses the workspace day boundary and rejects future or invalid measurements',()=>{
  const state=populated(),today=dayKey('Europe/Berlin',new Date('2026-10-15T22:30:00Z'));expect(today).toBe('2026-10-16');
  for(const change of [{date:'2026-10-17'},{date:'2026-02-30'},{value:NaN},{value:-1}])expect(()=>saveTrackerLog(state,{...entry,...change},'update',today)).toThrow('valid amount');
  expect(state.logs).toEqual([entry]);
 });
 it('enforces checklist values in the command boundary too',()=>{
  const state=initialState([],null);saveTracker(state,{...tracker,kind:'checklist',unit:'done',goal:1},'create');
  expect(()=>saveTrackerLog(state,{...entry,value:.5},'create','2026-10-16')).toThrow('0 or 1');expect(state.logs).toEqual([]);
 });
});
