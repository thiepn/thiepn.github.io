import { describe, expect, it } from 'vitest';
import { defaultHomeView, HOME_MODULES, homeDay, parseHomeView, resolveHomeActions, visibleHomeModules } from '../../src/lib/daily-home';
import { parseHubPreferences } from '../../src/lib/hub-preferences';
import catalogue from '../../src/generated/search-index.json';
import hub from '../../src/data/hub.json';
const available = hub.projects.map(p => p.slug);
describe('H4 view ownership and recovery', () => {
  it('upgrades legacy preferences without losing chosen pins or spacing', () => {
    const result = parseHubPreferences(JSON.stringify({ version: 1, pins: ['tms60', 'notes'], density: 'comfortable' }), available);
    expect(result.reset).toBe(false); expect(result.preferences).toMatchObject({ pins: ['tms60', 'notes'], density: 'comfortable', home: defaultHomeView() });
  });
  it.each([null, [], { modules: ['unknown'] }, { ...defaultHomeView(), hidden: 'false' }, { ...defaultHomeView(), timezone: 'Etc/not-real' }, { ...defaultHomeView(), extra: 'private text' }, { ...defaultHomeView(), modules: Array(9).fill('study') }])('rejects malformed view without exposing untrusted fields: %j', value => {
    expect(parseHomeView(value)).toEqual(defaultHomeView());
    const result = parseHubPreferences(JSON.stringify({ version: 1, pins: ['notes'], density: 'compact', home: value }), available);
    expect(result.preferences.pins).toEqual(['notes']); expect(result.preferences.home).toEqual(defaultHomeView());
  });
  it('keeps curated reading order, optional modules off and explicit zero modules', () => {
    expect(visibleHomeModules(defaultHomeView())).toEqual(['today', 'continue', 'capture', 'faith', 'study', 'routines']);
    expect(visibleHomeModules({ ...defaultHomeView(), modules: ['weather', 'study', 'today', 'study'] })).toEqual(['today', 'study', 'weather']);
    expect(visibleHomeModules({ ...defaultHomeView(), modules: [], mode: 'focus' })).toEqual([]);
  });
  it('Focus changes display without rewriting enabled modules, pins or owner state', () => {
    const view = { ...defaultHomeView(), mode: 'focus' as const, focus: 'faith' as const };
    expect(visibleHomeModules(view)).toEqual(['today', 'continue', 'capture', 'faith']);
    expect(view.modules).toEqual(defaultHomeView().modules);
    expect(visibleHomeModules({ ...view, modules: ['study', 'routines'] })).toEqual([]);
    expect(visibleHomeModules({ ...view, hidden: true })).toEqual([]);
  });
  it('resolves only reviewed app launchers and audited provider handoffs', () => {
    const apps = new Map(catalogue.projects.filter(p => available.includes(p.slug)).map(p => [p.slug, p.liveUrl!]));
    for (const module of HOME_MODULES) for (const action of resolveHomeActions(module, apps)) {
      expect(new URL(action.href).protocol).toBe('https:'); expect(action.href).not.toMatch(/token|accountId|resourceId|q=/);
      if (action.app) expect(action.href).toBe(apps.get(action.app));
    }
    expect(() => resolveHomeActions(HOME_MODULES.find(m => m.id === 'study')!, new Map())).toThrow(/reviewed/);
  });
});
describe('H4 day presentation without invented recurrence', () => {
  it.each(['2026-03-29T00:30:00Z', '2026-03-29T01:30:00Z', '2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z'])('uses the civil date through Berlin DST at %s', instant => {
    expect(homeDay(new Date(instant), 'Europe/Berlin', 'en-GB').key).toBe(instant.slice(0, 10));
  });
  it('rolls over at Berlin midnight and distinguishes travel zones', () => {
    expect(homeDay(new Date('2026-10-01T21:59:59Z'), 'Europe/Berlin').key).toBe('2026-10-01');
    expect(homeDay(new Date('2026-10-01T22:00:00Z'), 'Europe/Berlin').key).toBe('2026-10-02');
    const instant = new Date('2026-10-01T16:00:00Z');
    expect(homeDay(instant, 'Asia/Seoul').key).toBe('2026-10-02'); expect(homeDay(instant, 'Europe/Berlin').key).toBe('2026-10-01');
    expect(homeDay(instant, 'UTC').zone).toBe('UTC');
  });
});
