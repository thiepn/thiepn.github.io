import { describe, expect, it } from 'vitest';
import type { HubPreferences } from '../../src/lib/hub-preferences';
import { migrateHubPreferencesV1 } from '../../src/lib/prism/migrate-hub-preferences';

const sample = (): HubPreferences => ({
  version: 1,
  pins: ['notes', 'mathlab', 'tms60'],
  density: 'comfortable',
  home: {
    modules: ['today', 'continue', 'capture', 'faith', 'study'],
    mode: 'focus',
    focus: 'study',
    timezone: 'Europe/Berlin',
    hidden: false,
  },
});

describe('Prism HubPreferences v1 migration', () => {
  it('preserves pin order in Apps settings and maps density', () => {
    const result = migrateHubPreferencesV1(sample());
    expect(result.document.blocks['block-apps']?.settings).toEqual({
      appOrder: ['notes', 'mathlab', 'tms60'],
    });
    expect(result.document.appearance.density).toBe('comfortable');
  });

  it('preserves unsupported Daily Home intent as explicit migration remainder', () => {
    const preferences = sample();
    const result = migrateHubPreferencesV1(preferences);
    expect(result.remainder).toEqual({
      sourceVersion: 1,
      legacyHomeView: preferences.home,
    });
  });

  it('keeps Apps available while preserving whole-Home hidden intent', () => {
    const preferences = sample();
    preferences.home.hidden = true;
    const result = migrateHubPreferencesV1(preferences);

    expect(result.document.blocks['block-apps']?.hidden).not.toBe(true);
    expect(result.document.blocks['block-continue']?.hidden).toBe(true);
    expect(result.document.blocks['block-now']?.hidden).toBe(true);
    expect(result.document.blocks['block-study']?.hidden).toBe(true);
    expect(result.document.blocks['block-recent']?.hidden).toBe(true);
  });

  it('does not mutate the legacy preference object', () => {
    const preferences = sample();
    const before = structuredClone(preferences);
    migrateHubPreferencesV1(preferences);
    expect(preferences).toEqual(before);
  });

  it('maps compact density directly', () => {
    const preferences = sample();
    preferences.density = 'compact';
    expect(migrateHubPreferencesV1(preferences).document.appearance.density).toBe('compact');
  });
});
