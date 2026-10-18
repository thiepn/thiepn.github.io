import {describe,it,expect} from 'vitest';
import {projectHubKnowledge,renderHubKnowledge} from '../../src/lib/workspace/personal-index-knowledge';
import type {WorkspaceState,Note} from '../../src/lib/workspace/types';
const state=():WorkspaceState=>({schemaVersion:1,revision:0,active:'w',workspaces:[],preferences:{rail:true,density:'comfortable',timezone:'Europe/Berlin',hidden:false},tasks:[],events:[],notes:[],trackers:[],logs:[],activity:[],captureDraft:'',legacyBackup:null});
const note=(id:string,body:string):Note=>({id,title:id,body,updatedAt:'2026-10-18T12:00:00Z'});
describe('P3 native Hub Knowledge',()=>{
 it('filters original notes without changing IDs or data',()=>{
  const s=state();s.notes=[note('alpha','hello text'),note('beta','long content')];
  const original=JSON.stringify(s),p=projectHubKnowledge(s,'long','beta');
  expect(p.notes.map(n=>n.id)).toEqual(['beta']);expect(p.selected?.id).toBe('beta');expect(JSON.stringify(s)).toBe(original);
 });
 it('previews the entire long note escaped, without injecting HTML',()=>{
  const s=state();s.notes=[note('original','<img src=x onerror=alert(1)>\n'+('Prose paragraph\n'.repeat(350)))];
  const html=renderHubKnowledge(s,'original','');
  expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  expect(html).not.toContain('<img src=x');
  expect(html).toContain('Prose paragraph');expect(html).toContain('Edit original');
 });
 it('has private empty state and bounded results without adding source data',()=>{
  const s=state();expect(renderHubKnowledge(s,null,'')).toContain('No Hub notes yet');
  s.notes=Array.from({length:90},(_,i)=>note('N'+i,'test'));
  const p=projectHubKnowledge(s,'test',null);
  expect(p.total).toBe(90);expect(p.notes).toHaveLength(60);expect(p.truncated).toBe(true);
 });
});
