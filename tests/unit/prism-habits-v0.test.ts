import { describe, it, expect } from 'vitest';
import {
  HABITS_V0, createHabitsV0, habitsStorageKey, localDayKey, parseHabitsV0,
  safeHabitLink, setHabitCompletion, validDayKey, weeklyCount,
} from '../../src/lib/prism/habits-v0';

describe('Prism Daily Habits V0 — local-only contract', () => {
  it('uses seven original habits with configurable 1–7 weekly targets', () => {
    const state = createHabitsV0();
    expect(HABITS_V0.map(h => h.id)).toEqual(['devotion','verses','french','reading','fitness','music','prayer']);
    expect(Object.values(state.targets)).toEqual([7,6,6,5,3,3,7]);
    expect(Object.values(state.dates).every(x => x.length === 0)).toBe(true);
  });

  it('allows only HTTPS and same-origin-relative launch paths, never script/userinfo URLs', () => {
    expect(safeHabitLink('https://example.org/path')).toBe('https://example.org/path');
    expect(safeHabitLink('/apps/francais/')).toBe('/apps/francais/');
    for (const link of ['javascript:alert(1)', 'data:text/html,hi', 'http://example.org', '//evil.example', '/\\evil.example', 'https://user:pass@example.org', 'intent://native', 'https://x.test\nbad']) {
      expect(safeHabitLink(link)).toBeNull();
    }
    expect(safeHabitLink('')).toBe('');
  });

  it('uses device-local civil dates, Monday-first weeks and rejects impossible dates', () => {
    const sunday = new Date(2026, 9, 11, 12);
    expect(localDayKey(sunday)).toBe('2026-10-11');
    expect(weeklyCount(['2026-10-04','2026-10-05','2026-10-11','2026-10-12'], sunday)).toBe(2);
    expect(validDayKey('2026-02-30')).toBe(false);
    expect(validDayKey('2028-02-29')).toBe(true);
  });

  it('records one completion per calendar day, permits undo, preserves previous dates', () => {
    const day = '2026-10-11';
    const a = setHabitCompletion(createHabitsV0(), 'verses', day, true);
    const b = setHabitCompletion(a, 'verses', day, true);
    expect(b.dates.verses).toEqual([day]);
    const c = setHabitCompletion(b, 'verses', '2026-10-12', true);
    expect(c.dates.verses).toEqual([day, '2026-10-12']);
    expect(setHabitCompletion(c, 'verses', day, false).dates.verses).toEqual(['2026-10-12']);
  });

  it('round-trips local preferences and refuses corrupted/future persisted records', () => {
    const a = createHabitsV0({ verses: 'https://example.org/tms/' });
    a.targets.fitness = 2;
    a.dates.fitness = ['2026-10-10'];
    expect(parseHabitsV0(JSON.stringify(a))).toEqual(a);
    expect(parseHabitsV0(null, a)?.links.verses).toBe('https://example.org/tms/');
    for (const bad of ['{', '{"version":2}', JSON.stringify({ ...a, targets: { ...a.targets, fitness: 8 } }), JSON.stringify({ ...a, links: { ...a.links, french: 'javascript:evil()' } }), JSON.stringify({ ...a, dates: { ...a.dates, french: ['2026-02-30'] } })]) {
      expect(parseHabitsV0(bad)).toBeNull();
    }
  });

  it('partitions signed-in owners and shared device scope without cloud actions', () => {
    const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    expect(habitsStorageKey(a)).not.toBe(habitsStorageKey(b));
    expect(habitsStorageKey(null)).not.toBe(habitsStorageKey(a));
    expect(habitsStorageKey('unverified')).toBeNull();
  });
});
