import { describe, expect, it } from 'vitest';
import { HUB_VISIBLE_APP_IDS, isHubVisibleApp, visibleHubApps } from '../../src/lib/workspace/visible-apps';
import { launches, resolveLaunch } from '../../src/lib/launches/resolver';
import { additionalShortcutLaunches } from '../../src/lib/launches/shortcut-directory';
describe('owner-approved Hub app presentation', () => {
  it('keeps exactly the approved fourteen in order without changing the registry', () => {
    expect(HUB_VISIBLE_APP_IDS).toEqual(["notes","canvas","tiny-tools","thiepn-library","manuscript","pdf-studio","wordstrike","the-bible-challenge","duel","tms60","gomoku","artikelwerk","micro-arcade","voidcut"]);
    expect(visibleHubApps([...launches,...additionalShortcutLaunches]).map(a=>a.id)).toEqual([...HUB_VISIBLE_APP_IDS]);
    expect(launches.length).toBe(31);
    expect(resolveLaunch('studyos')).toBeDefined();
    expect(isHubVisibleApp('studyos')).toBe(false);
    expect(isHubVisibleApp('unknown-new-app')).toBe(false);
  });
});
