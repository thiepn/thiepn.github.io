import { describe, expect, it } from 'vitest';
import { filterAndSortProjects, parseArchiveState, serializeArchiveState } from '../../src/lib/archive-state';
import type { SearchableProject } from '../../src/lib/search-core';
const projects: SearchableProject[] = [
  {kind:'project',code:'G-001',slug:'zeta',title:'Zeta',subtitle:'Game',summary:'Typing game project example.',aliases:[],category:'games',status:'live',tags:['typing'],collections:[],accentLight:'#111111',accentDark:'#eeeeee',updatedAt:'2026-08-10'},
  {kind:'project',code:'T-001',slug:'alpha',title:'Alpha',subtitle:'Tool',summary:'PDF productivity tool example.',aliases:['pdf editor'],category:'tools',status:'live',tags:['pdf'],collections:[],accentLight:'#111111',accentDark:'#eeeeee',updatedAt:'2026-08-18'},
  {kind:'project',code:'V-001',slug:'atlas',title:'Atlas',subtitle:'Visualization',summary:'Interactive data visualization.',aliases:[],category:'visualizations',status:'live',tags:['analysis'],collections:[],accentLight:'#111111',accentDark:'#eeeeee',updatedAt:'2026-08-12'},
  {kind:'project',code:'X-001',slug:'lab',title:'Lab',subtitle:'Experiment',summary:'Prototype experiment.',aliases:[],category:'experiments',status:'beta',tags:[],collections:[],accentLight:'#111111',accentDark:'#eeeeee',updatedAt:'2026-08-11'},
];
describe('archive state',()=>{
  it('gives explicit URL state precedence over stored view',()=>{
    const state=parseArchiveState(new URL('https://example.test/projects/?intent=play&view=grid&q=typing'),'list');
    expect(state.intent).toBe('play'); expect(state.category).toBe('all'); expect(state.view).toBe('grid'); expect(state.query).toBe('typing');
  });
  it('serializes defaults sparsely',()=>{
    const url=serializeArchiveState({query:'pdf',category:'all',intent:'use',sort:'az',view:'list'},new URL('https://example.test/projects/'));
    expect(url.searchParams.get('q')).toBe('pdf'); expect(url.searchParams.get('category')).toBeNull(); expect(url.searchParams.get('intent')).toBe('use'); expect(url.searchParams.get('sort')).toBe('az'); expect(url.searchParams.get('view')).toBe('list');
  });
  it('filters canonical categories and visitor intents deterministically',()=>{
    expect(filterAndSortProjects(projects,{query:'',category:'all',intent:'all',sort:'az',view:'grid'},['zeta','alpha','atlas','lab']).map(p=>p.slug)).toEqual(['alpha','atlas','lab','zeta']);
    expect(filterAndSortProjects(projects,{query:'pdf',category:'tools',intent:'all',sort:'curated',view:'grid'},['zeta','alpha','atlas','lab']).map(p=>p.slug)).toEqual(['alpha']);
    expect(filterAndSortProjects(projects,{query:'',category:'all',intent:'play',sort:'curated',view:'grid'},['zeta','alpha','atlas','lab']).map(p=>p.slug)).toEqual(['zeta']);
    expect(filterAndSortProjects(projects,{query:'',category:'all',intent:'explore',sort:'curated',view:'grid'},['zeta','alpha','atlas','lab']).map(p=>p.slug)).toEqual(['atlas','lab']);
  });
  it('ignores unknown intent values',()=>{
    const state=parseArchiveState(new URL('https://example.test/projects/?intent=unknown'));
    expect(state.intent).toBe('all');
  });
});
