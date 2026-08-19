import { describe, expect, it } from 'vitest';
import { filterAndSortProjects, parseArchiveState, serializeArchiveState } from '../../src/lib/archive-state';
import type { SearchableProject } from '../../src/lib/search-core';
const projects: SearchableProject[] = [
  {kind:'project',code:'G-001',slug:'zeta',title:'Zeta',subtitle:'Game',summary:'Typing game project example.',aliases:[],category:'games',status:'live',tags:['typing'],collections:[],accentLight:'#111111',accentDark:'#eeeeee',updatedAt:'2026-08-10'},
  {kind:'project',code:'T-001',slug:'alpha',title:'Alpha',subtitle:'Tool',summary:'PDF productivity tool example.',aliases:['pdf editor'],category:'tools',status:'live',tags:['pdf'],collections:[],accentLight:'#111111',accentDark:'#eeeeee',updatedAt:'2026-08-18'},
];
describe('archive state',()=>{
  it('gives explicit URL state precedence over stored view',()=>{
    const state=parseArchiveState(new URL('https://example.test/projects/?category=games&view=grid&q=typing'),'list');
    expect(state.category).toBe('games'); expect(state.view).toBe('grid'); expect(state.query).toBe('typing');
  });
  it('serializes defaults sparsely',()=>{
    const url=serializeArchiveState({query:'pdf',category:'tools',sort:'az',view:'list'},new URL('https://example.test/projects/'));
    expect(url.searchParams.get('q')).toBe('pdf'); expect(url.searchParams.get('category')).toBe('tools'); expect(url.searchParams.get('sort')).toBe('az'); expect(url.searchParams.get('view')).toBe('list');
  });
  it('filters and sorts deterministically',()=>{
    expect(filterAndSortProjects(projects,{query:'',category:'all',sort:'az',view:'grid'},['zeta','alpha']).map(p=>p.slug)).toEqual(['alpha','zeta']);
    expect(filterAndSortProjects(projects,{query:'pdf',category:'tools',sort:'curated',view:'grid'},['zeta','alpha']).map(p=>p.slug)).toEqual(['alpha']);
  });
});
