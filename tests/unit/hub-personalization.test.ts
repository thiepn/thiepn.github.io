import { describe, it, expect } from 'vitest';
import { additionalShortcutLaunches, primaryShortcutIds, partitionShortcutChoices } from '../../src/lib/launches/shortcut-directory';
import { pendingHubApps } from '../../src/lib/launches/requested-apps';
import { launches, resolveLaunch } from '../../src/lib/launches/resolver';
import { DEFAULT_HUB_PINS } from '../../src/lib/hub-preferences';
import { DEFAULT_HIDDEN_APP_IDS, PROPOSED_QUICK_SHORTCUT_IDS, personalHiddenAppIds, changeAppVisibility } from '../../src/lib/workspace/app-personalization';
import { initialState, parseState } from '../../src/lib/workspace/model';

const available = [...launches.map(app=>app.id), ...additionalShortcutLaunches.map(app=>app.id)];
const ids = [...available, ...pendingHubApps.map(app=>app.id)];

describe('Hub owner-selected app personalization', () => {
  it('keeps exactly eight ordered, launchable shortcuts without changing the public manifest', () => {
    expect(DEFAULT_HUB_PINS).toEqual(PROPOSED_QUICK_SHORTCUT_IDS);
    expect(PROPOSED_QUICK_SHORTCUT_IDS).toHaveLength(8);
    expect(new Set(PROPOSED_QUICK_SHORTCUT_IDS).size).toBe(8);
    for (const id of PROPOSED_QUICK_SHORTCUT_IDS) expect(resolveLaunch(id)?.url).toMatch(/^https:\/\//);
    expect(launches.some(app=>app.id==='clearpage')).toBe(false);
    expect(additionalShortcutLaunches.find(app=>app.id==='clearpage')?.url).toBe('https://page.thiepn.dev/');
    expect(primaryShortcutIds.slice(0,8)).toEqual([...PROPOSED_QUICK_SHORTCUT_IDS]);
  });

  it('new workspaces get the selected pins while existing preferences and layouts remain intact', () => {
    const next=initialState(available,null);
    expect(next.workspaces[0]!.widgets.find(w=>w.type==='app-shortcuts')?.config.appIds).toEqual([...PROPOSED_QUICK_SHORTCUT_IDS]);
    expect(next.preferences.hiddenAppIds).toEqual([...DEFAULT_HIDDEN_APP_IDS]);
    // Simulate an old browser backup without the new optional field.
    const old=structuredClone(next);
    delete old.preferences.hiddenAppIds;
    const shortcut=old.workspaces[0]!.widgets.find(w=>w.type==='app-shortcuts')!;
    shortcut.config.appIds=['notes','tms60'];
    const revived=parseState(JSON.stringify(old));
    expect(revived.workspaces[0]!.widgets.find(w=>w.type==='app-shortcuts')?.config.appIds).toEqual(['notes','tms60']);
    expect(revived.preferences.hiddenAppIds).toBeUndefined();
    expect(personalHiddenAppIds(revived.preferences)).toEqual([...DEFAULT_HIDDEN_APP_IDS]);
    expect(parseState(JSON.stringify({...old,preferences:{...old.preferences,hiddenAppIds:[]}})).preferences.hiddenAppIds).toEqual([]);
  });

  it('visibility is personal and reversible without modifying the app launcher', () => {
    const original={};
    expect(personalHiddenAppIds(original)).toEqual(['ligoquiz','control']);
    const shown=changeAppVisibility(original,'control',false,ids);
    expect(shown).toEqual(['ligoquiz']);
    expect(changeAppVisibility({hiddenAppIds:shown},'control',true,ids)).toEqual(['ligoquiz','control']);
    expect(changeAppVisibility({hiddenAppIds:[]},'control',false,ids)).toEqual([]);
    expect(()=>changeAppVisibility({},'imaginary',true,ids)).toThrow(/Unknown app/);
    expect(resolveLaunch('control')?.url).toBe('https://control.thiepn.dev/');
  });

  it('pending four remain unlaunchable, distinct from shortcut-only candidate Clearpage', () => {
    expect(pendingHubApps.map(app=>app.id)).toEqual(['folio','randomizer','party','convert']);
    for (const app of pendingHubApps) {
      expect(resolveLaunch(app.id)).toBeUndefined();
      expect('url' in app).toBe(false);
    }
    expect(partitionShortcutChoices(additionalShortcutLaunches, ['clearpage']).pinned[0]?.id).toBe('clearpage');
  });

  it('rejects malformed migrated hidden-app fields without discarding the source itself', () => {
    const doc=initialState(available,null);
    for(const invalid of [['control','control'],['invalid space'],[123],new Array(251).fill('control')]) {
      expect(()=>parseState(JSON.stringify({...doc,preferences:{...doc.preferences,hiddenAppIds:invalid}}))).toThrow(/Invalid hidden app preferences/);
    }
  });
});
