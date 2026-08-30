import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/catalogue-250.json';
import { searchCatalogue, scoreSearchItem, type SearchableBook, type SearchableCollection, type SearchableProject } from '../../src/lib/search-core';

const base: SearchableProject = {
  kind:'project', code:'G-003', slug:'curio', title:'Curio', subtitle:'Auction strategy game', summary:'Auction and appraisal strategy game.', aliases:['objects of questionable value'], category:'games', status:'live', tags:['auction','strategy'], collections:['Browser Games'], liveUrl:'https://example.test/', accentLight:'#111111', accentDark:'#eeeeee', updatedAt:'2026-08-18T00:00:00.000Z'
};

describe('catalogue search scoring', () => {
  it('prioritizes exact title and catalogue code', () => {
    expect(scoreSearchItem(base,'Curio')).toBe(100);
    expect(scoreSearchItem(base,'G-003')).toBe(95);
  });
  it('matches aliases, tags, and restrained typos', () => {
    expect(scoreSearchItem(base,'auction')).toBeGreaterThan(0);
    expect(scoreSearchItem(base,'questionable')).toBeGreaterThan(0);
    expect(scoreSearchItem(base,'curi')).toBeGreaterThan(0);
  });
  it('indexes collection keywords, project titles and relationship language', () => {
    const collection: SearchableCollection = { kind:'collection', code:'C-003', slug:'browser-games', title:'Browser Games', summary:'Games that run in the browser.', editorialNote:'Organized by play pattern.', projects:['wordstrike','ligo-quizabend'], projectTitles:['WORDSTRIKE','LiGo Quizabend'], keywords:['arcade','quiz'], relationshipLabels:['Social quiz play','Typing as the core mechanic'] };
    expect(scoreSearchItem(collection,'social quiz play')).toBeGreaterThan(0);
    expect(scoreSearchItem(collection,'WORDSTRIKE')).toBeGreaterThan(0);
    expect(scoreSearchItem(collection,'arcade')).toBeGreaterThan(0);
  });
  it('indexes published books by title, subtitle, summary, and subject', () => {
    const book: SearchableBook = { kind:'book', slug:'the-unfinished-mission', title:'The Unfinished Mission', subtitle:'Why Gospel Access Remains Unequal—and What Faithful Mission Requires Now', summary:'A long-form work about faithful global mission and local ownership.', subjects:['missions','theology','world-christianity'], version:'1.0.0', libraryUrl:'https://example.test/library/works/the-unfinished-mission/', lastUpdated:'2026-08-23' };
    expect(scoreSearchItem(book,'The Unfinished Mission')).toBe(100);
    expect(scoreSearchItem(book,'missions')).toBeGreaterThan(0);
    expect(scoreSearchItem(book,'gospel access')).toBeGreaterThan(0);
    expect(scoreSearchItem(book,'world christianity')).toBeGreaterThan(0);
  });
  it('keeps 250-project local search within the Phase 4 target on the test runner', () => {
    const projects = fixtures as SearchableProject[];
    const start = performance.now();
    for (let i=0;i<25;i+=1) searchCatalogue(projects,`project ${100 + (i%50)}`,20);
    const average = (performance.now()-start)/25;
    expect(average).toBeLessThan(50);
  });
});