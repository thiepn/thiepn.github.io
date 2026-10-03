import { describe, expect, it } from 'vitest';
import { HUB_PREFERENCES_VERSION, DEFAULT_HUB_PINS, defaultHubPreferences, parseHubPreferences, moveHubPin } from '../../src/lib/hub-preferences';
import { findHubApps } from '../../src/lib/hub-search';
import hub from '../../src/data/hub.json';
import publicSearch from '../../src/generated/search-index.json';
import tasks from '../../src/data/hub-tasks.json';
import type { SearchableProject } from '../../src/lib/search-core';
const available = hub.projects.map(p => p.slug);
const projects = hub.projects.map(app => {
  const item = publicSearch.projects.find(p => p.slug === app.slug)!;
  return { ...item, kind: 'project', aliases: [...item.aliases, ...(tasks[app.slug as keyof typeof tasks] ?? [])] } as SearchableProject;
});
describe('H1 preference recovery and pin ownership', () => {
  it('defaults only to reviewed launchers, in the frozen order', () => {
    expect(defaultHubPreferences(available).pins).toEqual(DEFAULT_HUB_PINS);
    expect(DEFAULT_HUB_PINS.every(slug => available.includes(slug))).toBe(true);
  });
  it.each(['{', 'null', '[]', '{"version":2,"pins":[],"density":"compact"}', '{"version":1,"pins":[false],"density":"compact"}', 'x'.repeat(9000)])('recovers invalid or old preferences without inventing app identities', raw => {
    expect(parseHubPreferences(raw, available)).toEqual({ preferences: defaultHubPreferences(available), reset: true });
  });
  it('preserves explicit empty pins and prunes retired or duplicate IDs', () => {
    expect(parseHubPreferences(JSON.stringify({ version: HUB_PREFERENCES_VERSION, pins: [], density: 'comfortable' }), available).preferences.pins).toEqual([]);
    expect(parseHubPreferences(JSON.stringify({ version: 1, pins: ['notes', 'retired', 'notes', 'tms60'], density: 'compact' }), available).preferences.pins).toEqual(['notes', 'tms60']);
  });
  it('reorders pins without mutating the catalogue or caller array', () => {
    const pins = ['notes', 'tms60', 'mathlab'];
    expect(moveHubPin(pins, 'tms60', -1)).toEqual(['tms60', 'notes', 'mathlab']);
    expect(moveHubPin(pins, 'notes', -1)).toEqual(pins);
    expect(pins).toEqual(['notes', 'tms60', 'mathlab']);
  });
});
describe('H1 public app search and scale', () => {
  it('returns all reviewed apps in their directory order for an empty query', () => {
    expect(findHubApps(projects, '').map(p => p.slug)).toEqual(available);
    expect(projects.some(p => hub.excluded.includes(p.slug))).toBe(false);
    expect(Object.keys(tasks).sort()).toEqual([...available].sort());
  });
  it.each([['merge PDF', 'pdf-studio'], ['French vocabulary', 'french-3000'], ['Scripture memory', 'tms60']])('maps a task to its owner app: %s', (query, slug) => {
    expect(findHubApps(projects, query)[0]?.slug).toBe(slug);
  });
  it.each([100, 250])('finds an added app among %i metadata-only fixture entries', count => {
    const fixture = Array.from({ length: count }, (_, i) => ({ ...projects[0]!, slug: `fixture-${i}`, title: `Fixture app ${i}`, aliases: [], summary: '', subtitle: '', tags: [] }));
    expect(findHubApps(fixture, '').length).toBe(count);
    expect(findHubApps(fixture, 'Fixture app 99')[0]?.slug).toBe('fixture-99');
  });
});
