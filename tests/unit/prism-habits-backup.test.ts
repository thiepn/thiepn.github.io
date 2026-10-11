import { describe, expect, it } from 'vitest';
import { createHabitsV0 } from '../../src/lib/prism/habits-v0';
import { backupScopeKey, createHabitsBackup, readHabitsBackup } from '../../src/lib/prism/habits-backup';

const ownerA = { kind: 'account', owner: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } as const;
const ownerB = { kind: 'account', owner: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } as const;
const device = { kind: 'device' } as const;

describe('Habits V1 isolated local backup', () => {
  it('roundtrips manually reported progress, targets and quick-launch links', () => {
    const doc = createHabitsV0({ french: 'https://example.org/french' });
    doc.targets.fitness = 4; doc.dates.french = ['2026-10-08', '2026-10-09'];
    const backup = createHabitsBackup(doc, ownerA, new Date('2026-10-11T10:15:20.000Z'));
    const result = readHabitsBackup(backup, ownerA);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.habits).toEqual(doc);
  });
  it('rejects other account/device scopes', () => {
    const accountBackup = createHabitsBackup(createHabitsV0(), ownerA);
    expect(readHabitsBackup(accountBackup, ownerB).ok).toBe(false);
    expect(readHabitsBackup(accountBackup, device).ok).toBe(false);
    const deviceBackup = createHabitsBackup(createHabitsV0(), device);
    expect(readHabitsBackup(deviceBackup, ownerA).ok).toBe(false);
    expect(readHabitsBackup(deviceBackup, device).ok).toBe(true);
    expect(backupScopeKey({kind:'device',owner:'unexpected'})).toBeNull();
  });
  it('rejects corrupt JSON, unsupported versions, invalid days and unsafe URLs', () => {
    const base = JSON.parse(createHabitsBackup(createHabitsV0(), device));
    const bad = [
      { ...base, version: 2 },
      { ...base, exportedAt: 'invalid' },
      { ...base, extra: 'unexpected' },
      { ...base, habits: { ...base.habits, dates: { ...base.habits.dates, music: ['2026-02-30'] } } },
      { ...base, habits: { ...base.habits, links: { ...base.habits.links, french: 'javascript:alert(1)' } } },
    ];
    for (const item of bad) expect(readHabitsBackup(JSON.stringify(item), device).ok).toBe(false);
    expect(readHabitsBackup('{', device).ok).toBe(false);
    expect(readHabitsBackup('x'.repeat(500_001), device).ok).toBe(false);
  });
  it('refuses invalid current data on export', () => {
    const bad = createHabitsV0(); bad.targets.fitness = 8;
    expect(() => createHabitsBackup(bad, device)).toThrow();
  });
});
