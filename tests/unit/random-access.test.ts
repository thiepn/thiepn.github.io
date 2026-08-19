import { describe, expect, it } from 'vitest';
import { pickRandomProject, randomWeight } from '../../src/lib/random-access';
import type { SearchableProject } from '../../src/lib/search-core';
const project=(slug:string,status:string='live'):SearchableProject=>({kind:'project',code:'G-001',slug,title:slug,subtitle:'Game',summary:'A sufficiently descriptive project summary.',aliases:[],category:'games',status,tags:['game'],collections:[],accentLight:'#111111',accentDark:'#eeeeee'});
describe('Random Access',()=>{
  it('excludes archived projects',()=>expect(randomWeight(project('old','archived'))).toBe(0));
  it('selects without launching and respects deterministic randomness',()=>{
    const chosen=pickRandomProject([project('a'),project('b')],()=>0);
    expect(chosen?.slug).toBe('a');
  });
});
