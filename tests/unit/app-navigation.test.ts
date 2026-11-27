import { describe, expect, it } from 'vitest';
import manifest from '../../src/generated/launch-manifest.json';
import providers from '../../src/data/hub-providers.json';
import { HUB_VISIBLE_APP_IDS } from '../../src/lib/workspace/visible-apps';
import { ACTIONS, APPS } from '../../src/lib/app-navigation/catalogue.mjs';
import { navigationHref } from '../../src/lib/app-navigation/switcher.mjs';

describe('H25-U public navigation', () => {
  it('uses all and only the approved registry entries in owner order', () => {
    expect(APPS.map(app => app.id)).toEqual([...HUB_VISIBLE_APP_IDS]);
    for (const app of APPS) {
      const source = manifest.entries.find(entry => entry.id === app.id);
      expect(app).toEqual({id: source?.id, title: source?.title, category: source?.category, url: source?.url});
    }
  });
  it('uses approved public owner actions and rejects arbitrary destinations', () => {
    const allowed = providers.providers.flatMap(provider => Object.values(provider.actions));
    for (const action of ACTIONS) expect(allowed).toContain(action.url);
    for (const id of ['javascript:alert(1)', 'https://evil.test', '//evil.test', 'notes?token=x', 'studyOS']) expect(navigationHref(id)).toBeNull();
    expect(navigationHref('hub')).toBe('https://thiepn.dev/');
  });
});
