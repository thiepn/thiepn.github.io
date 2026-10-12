import { describe, it, expect } from 'vitest';
import { initialState, parseState, zonedInstant, weekDays, trackerTotal, activity } from '../../src/lib/workspace/model';
import { overlaps, place } from '../../src/lib/workspace/layout';
import { namespace } from '../../src/lib/workspace/store';
import { preset } from '../../src/lib/workspace/presets';
import { clone } from '../../src/lib/workspace/types';
const apps=['notes','thiepn-library','tms60','tiny-tools','canvas'];
describe('adaptive workspace contracts',()=>{
 it('migrates pins, density, timezone and privacy without modifying legacy data',()=>{
  const raw=JSON.stringify({version:1,pins:['canvas','notes'],density:'comfortable',home:{modules:['capture'],mode:'today',focus:'study',timezone:'Europe/Berlin',hidden:true}});
  const s=initialState(apps,raw);expect(s.workspaces[0]!.widgets[0]!.config.appIds).toEqual(['canvas','notes']);expect(s.preferences).toMatchObject({density:'comfortable',timezone:'Europe/Berlin',hidden:true});expect(s.legacyBackup).toBe(raw);expect(parseState(JSON.stringify(s))).toEqual(s);
 });
 it('recovers invalid legacy preferences and preserves intentionally empty pins',()=>{expect(initialState(apps,'{broken').workspaces).toHaveLength(1);const raw=JSON.stringify({version:1,pins:[],density:'compact'});expect(initialState(apps,raw).workspaces[0]!.widgets[0]!.config.appIds).toEqual([]);});
 it('uses explicit useful defaults rather than the entire app catalogue',()=>expect(initialState(apps,null).workspaces[0]!.widgets[0]!.config.appIds).toHaveLength(4));
 it('resolves collisions deterministically without mutating inputs',()=>{const input=preset('Test',apps).widgets;const before=clone(input),id=input[1]!.id;const result=place(input,id,{x:0,y:0,w:6,h:40});expect(input).toEqual(before);expect(place(input,id,{x:0,y:0,w:6,h:40})).toEqual(result);for(const a of result)for(const b of result)if(a.id!==b.id)expect(overlaps(a.desktop,b.desktop)).toBe(false);});
 it('clamps movement and resize to registry bounds',()=>{const input=preset('Test',apps).widgets,id=input[0]!.id;const out=place(input,id,{x:99,y:-5,w:99,h:1}).find(w=>w.id===id)!;expect(out.desktop).toEqual({x:0,y:0,w:12,h:16});});
 it('all presets share the same validated document contract',()=>{for(let i=0;i<4;i++){const s=initialState(apps,null),w=preset('Layout',apps,i);s.workspaces=[w];s.active=w.id;expect(parseState(JSON.stringify(s)).active).toBe(w.id);}});
 it('rejects future documents and malformed imports instead of replacing records',()=>{const s=initialState(apps,null);expect(()=>parseState(JSON.stringify({...s,schemaVersion:2}))).toThrow('Unsupported');const invalid=clone(s);invalid.workspaces[0]!.widgets[0]!.desktop.x=100;expect(()=>parseState(JSON.stringify(invalid))).toThrow('widget');expect(()=>parseState('x'.repeat(5000001))).toThrow('limit');});
 it('retains unknown widgets and future widget configurations',()=>{const s=initialState(apps,null);s.workspaces[0]!.widgets[0]!.type='future-widget';s.workspaces[0]!.widgets[0]!.typeVersion=9;s.workspaces[0]!.widgets[0]!.config={newFormat:'keep'};expect(parseState(JSON.stringify(s))).toEqual(s);});
 it('keeps namespaces separate and rejects unvalidated owners',()=>{expect(namespace(null)).toBe('guest');expect(namespace('11111111-1111-4111-8111-111111111111')).not.toBe(namespace(null));expect(()=>namespace('../guest')).toThrow();});
 it('rejects nonexistent daylight-saving wall times and preserves valid ones',()=>{expect(()=>zonedInstant('2026-03-29','02:30','Europe/Berlin')).toThrow('does not exist');expect(zonedInstant('2026-03-29','03:30','Europe/Berlin')).toBe('2026-03-29T01:30:00.000Z');});
 it('derives Monday-first weeks and daily/weekly totals from logs',()=>{const s=initialState(apps,null);s.trackers.push({id:'reading',title:'Reading',kind:'count',unit:'sessions',goal:5,cadence:'weekly'});s.logs.push({id:'a',trackerId:'reading',date:'2026-10-12',value:2,note:''},{id:'b',trackerId:'reading',date:'2026-10-11',value:99,note:''});expect(weekDays('2026-10-14')).toEqual(['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18']);expect(trackerTotal(s,'reading','2026-10-14')).toBe(2);s.trackers[0]!.cadence='daily';expect(trackerTotal(s,'reading','2026-10-14')).toBe(0);});
 it('removing layout widgets does not remove underlying notes or records',()=>{const s=initialState(apps,null);s.notes.push({id:'note',title:'Keep',body:'Keep content',updatedAt:new Date().toISOString()});s.workspaces[0]!.widgets=[];expect(parseState(JSON.stringify(s)).notes).toHaveLength(1);});
 it('bounds activity without losing the newest actions',()=>{const s=initialState(apps,null);for(let i=0;i<501;i++)activity(s,String(i));expect(s.activity).toHaveLength(500);expect(s.activity[0]!.title).toBe('500');});
});
