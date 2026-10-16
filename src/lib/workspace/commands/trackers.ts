import {validDate} from '../model';
import type {Tracker,TrackerLog,WorkspaceState} from '../types';
type WriteMode='create'|'update';
/** Commands operate on the existing writer's detached candidate, never on storage. */
export function validateTrackerChange(state:WorkspaceState,tracker:Tracker,mode:WriteMode) {
 const index=state.trackers.findIndex(row=>row.id===tracker.id), previous=state.trackers[index];
 if(mode==='update'&&!previous)throw new Error('This tracker was removed. Your changes were not saved.');
 if(mode==='create'&&previous)throw new Error('This tracker already exists.');
 if(!tracker.id||!tracker.title.trim()||tracker.title.length>80||!tracker.unit.trim()||tracker.unit.length>40
  ||!['count','duration','checklist'].includes(tracker.kind)||!['daily','weekly'].includes(tracker.cadence)
  ||!Number.isFinite(tracker.goal)||tracker.goal<=0||tracker.goal>100000)throw new Error('Enter a valid tracker name, unit and goal.');
 if(previous&&state.logs.some(log=>log.trackerId===tracker.id)
  &&(previous.kind!==tracker.kind||previous.unit.trim().toLowerCase()!==tracker.unit.trim().toLowerCase()))
  throw new Error('This tracker has recorded history. Create a new tracker to use a different type or unit.');
}
export function saveTracker(state:WorkspaceState,tracker:Tracker,mode:WriteMode) {
 validateTrackerChange(state,tracker,mode);
 const index=state.trackers.findIndex(row=>row.id===tracker.id),previous=state.trackers[index];
 const next=structuredClone({...tracker,title:tracker.title.trim(),unit:tracker.unit.trim()});
 if(previous)state.trackers[index]=next;else state.trackers.push(next);
}
export function validateTrackerLog(state:WorkspaceState,record:TrackerLog,mode:WriteMode,today:string) {
 const tracker=state.trackers.find(row=>row.id===record.trackerId);
 if(!tracker)throw new Error('This tracker was removed. Your entry was not saved.');
 const index=state.logs.findIndex(row=>row.id===record.id),previous=state.logs[index];
 if(mode==='update'&&(!previous||previous.trackerId!==record.trackerId))throw new Error('This entry was removed or changed. Reopen the tracker to try again.');
 if(mode==='create'&&previous)throw new Error('This entry already exists.');
 if(!record.id||!validDate(record.date)||!validDate(today)||record.date>today
  ||!Number.isFinite(record.value)||record.value<0||record.value>100000||record.note.length>500)
  throw new Error('Enter a valid amount and a date no later than today.');
 if(tracker.kind==='checklist'&&record.value!==0&&record.value!==1)throw new Error('Checklist entries are 0 or 1.');
}
export function saveTrackerLog(state:WorkspaceState,record:TrackerLog,mode:WriteMode,today:string) {
 validateTrackerLog(state,record,mode,today);
 const index=state.logs.findIndex(row=>row.id===record.id);
 if(index>=0)state.logs[index]=structuredClone(record);else state.logs.push(structuredClone(record));
}
export function removeTracker(state:WorkspaceState,id:string) {
 state.trackers=state.trackers.filter(row=>row.id!==id);
 state.logs=state.logs.filter(row=>row.trackerId!==id);
}
