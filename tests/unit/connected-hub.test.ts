import {describe,it,expect} from 'vitest';
import {launches,resolveLaunch,safeCustomUrl} from '../../src/lib/launches/resolver';
import {setShortcuts,toggleShortcut} from '../../src/lib/workspace/commands';
import {initialState,parseState} from '../../src/lib/workspace/model';
import {prepareCapture,taskCounts,taskMatchesFilter,applyTaskPlan} from '../../src/lib/workspace/task-flow';
import {parseICalendar, SNAPSHOT_MAX_BYTES} from '../../src/lib/workspace/calendar-snapshot';
import {prepareTaskCalendarEvent,identicalLocalEvent} from '../../src/lib/workspace/context-handoffs';
const today='2026-10-15';
const task=()=>{const value=prepareCapture({body:'Read chapter\nBring notes',kind:'task',duePreset:'inbox',customDate:'',priority:'high',today});if(value.kind!=='task')throw Error();return value.task;};
describe('connected Hub integration contracts',()=>{
 it('keeps independent legacy destinations and all reviewed new apps without duplicates',()=>{
  expect(launches).toHaveLength(31);expect(new Set(launches.map(l=>l.url.replace(/\/$/,''))).size).toBe(31);
  for(const id of ['diet','recipe','bikes','orrery','french-3000','le-carnet-francais'])expect(resolveLaunch(id)).toBeDefined();
  for(const id of ['finance','folio','wordfall'])expect(resolveLaunch(id)).toBeUndefined();
  expect(resolveLaunch('folio/library')?.id).toBe('thiepn-library');expect(resolveLaunch('games/home')?.id).toBe('micro-arcade');
 });
 it('pins and reorders independently of geometry and rejects duplicate aliases',()=>{
  const state=initialState(['notes','canvas'],null), ws=state.workspaces[0]!,widget=ws.widgets[0]!,rect={...widget.desktop};
  toggleShortcut(ws,'bikes');expect(widget.config.appIds).toContain('bikes');
  setShortcuts(ws,widget.id,['bikes','folio/library','notes']);expect(widget.config.appIds).toEqual(['bikes','thiepn-library','notes']);expect(widget.desktop).toEqual(rect);
  expect(()=>setShortcuts(ws,widget.id,['notes','folio/notes'])).toThrow('same app');expect(parseState(JSON.stringify(state))).toEqual(state);
 });
 it('validates private custom links before saving',()=>{
  for(const url of ['javascript:alert(1)','http://example.org','https://user:pass@example.org'])expect(()=>safeCustomUrl(url)).toThrow();
  const state=initialState(['notes'],null),ws=state.workspaces[0]!,w=ws.widgets[0]!;
  setShortcuts(ws,w.id,['custom:one'],[{id:'custom:one',title:'Work',url:'https://example.org/private'}]);expect(parseState(JSON.stringify(state))).toEqual(state);
 });
 it('uses consistent Inbox/Today/Upcoming selectors and deliberately clears moved times',()=>{
  const t=task();expect(taskCounts([t],today).inbox).toBe(1);expect(taskMatchesFilter(t,'today',today)).toBe(false);
  t.time='12:00';applyTaskPlan(t,'today',today);expect(t.time).toBe('');expect(taskMatchesFilter(t,'today',today)).toBe(true);
  applyTaskPlan(t,'tomorrow',today);expect(taskMatchesFilter(t,'upcoming',today)).toBe(true);
  t.completedAt=new Date().toISOString();expect(()=>applyTaskPlan(t,'inbox',today)).toThrow();
 });
 it('requires reviewed scheduling and detects repeated identical calendar slots',()=>{
  const t=task(),proposal={taskId:t.id,title:t.title,date:today,time:'12:00',duration:30,allDay:false,confirmed:false};
  expect(()=>prepareTaskCalendarEvent(t,proposal,'Europe/Berlin')).toThrow('confirm');
  const event=prepareTaskCalendarEvent(t,{...proposal,confirmed:true},'Europe/Berlin').event;
  expect(identicalLocalEvent([event],{...event,id:'other'})).toBe(true);expect(t.due).toBe('');
 });
 it('parses calendar exports safely with exclusive all-day end dates and bounded input',()=>{
  const text='BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:one\nSUMMARY:Trip\nDTSTART;VALUE=DATE:20261015\nDTEND;VALUE=DATE:20261017\nEND:VEVENT\nEND:VCALENDAR';
  const source=parseICalendar(text,'trip.ics','one','Europe/Berlin',Date.parse(today));expect(source.events[0]).toMatchObject({title:'Trip',startDay:today,endDay:'2026-10-16',allDay:true});
  expect(()=>parseICalendar('x'.repeat(SNAPSHOT_MAX_BYTES+1),'x.ics','one','UTC')).toThrow();
 });
});

import {workspaceAttention} from '../../src/lib/workspace/attention';
import {recentLaunches,selectedShortcuts} from '../../src/lib/workspace/selectors';
it('keeps recent launches independent of pins and exposes actual recovery issues',()=>{
 const state=initialState(['notes'],null),w=state.workspaces[0]!.widgets[0]!;
 state.activity=[{id:'one',title:'Opened Bikes',at:new Date().toISOString(),kind:'launch:bikes'},{id:'two',title:'Opened Bikes',at:new Date().toISOString(),kind:'launch:bikes'}];
 expect(recentLaunches(state)).toEqual(['bikes']);w.config.shortcutSource='recent';expect(selectedShortcuts(state,w,[])).toEqual(['bikes']);expect(w.config.appIds).toEqual(['notes']);
 expect(workspaceAttention({storageReady:true,dirty:false,conflict:false,cloudConflict:false,locked:false})).toEqual([]);
 expect(workspaceAttention({storageReady:true,dirty:false,conflict:false,cloudConflict:true,locked:false})[0]?.action).toBe('cloud-review');
});

import {sourceStatus,sourceStates,clearSourceStates,safeDiagnostics} from '../../src/lib/providers/connection-state';
it('clears connection diagnostics at identity boundaries and never exports resource bodies',()=>{
 clearSourceStates();sourceStatus('notes','ready');
 expect(sourceStates()).toHaveLength(1);
 const report=safeDiagnostics();expect(Object.keys(report.sources[0]!).sort()).toEqual(['checkedAt','errorCode','expiresAt','lastSuccessAt','source','status']);
 clearSourceStates();expect(safeDiagnostics().sources).toEqual([]);
});
