import { describe, expect, it } from 'vitest';
import manifest from '../../src/generated/launch-manifest.json';
import { additionalShortcutLaunches, partitionShortcutChoices, primaryShortcutIds } from '../../src/lib/launches/shortcut-directory';
import { launches, resolveLaunch } from '../../src/lib/launches/resolver';
import { setShortcuts, shortcutIds } from '../../src/lib/workspace/commands';
import { preset } from '../../src/lib/workspace/presets';

describe('Hub shortcut directory', () => {
  it('adds reviewed independent apps without replacing the pinned Core manifest', () => {
    expect(manifest.entries).toHaveLength(31);
    const original = new Set(manifest.entries.map(entry => entry.id));
    const extensions = new Set(additionalShortcutLaunches.map(entry => entry.id));
    expect(extensions.size).toBe(additionalShortcutLaunches.length);
    expect([...extensions].every(id => !original.has(id))).toBe(true);
    expect(launches).toHaveLength(original.size + extensions.size);
    for (const entry of additionalShortcutLaunches) {
      expect(resolveLaunch(entry.id)?.url).toBe(entry.url);
      expect(entry.visibility).toBe('shortcut-only');
      const url = new URL(entry.url);
      expect(url.protocol).toBe('https:');
      expect(url.username).toBe('');
      expect(url.password).toBe('');
    }
  });

  it('makes the newer language, StudyOS and game entrypoints selectable', () => {
    for (const id of ['languages', 'chinese', 'japanese', 'studyos', 'mdd', 'selah', 'ion', 'ligoquiz', 'control']) {
      expect(resolveLaunch(id)?.id).toBe(id);
      expect(primaryShortcutIds).toContain(id);
    }
    expect(resolveLaunch('french-3000')?.url).toBe('https://french.thiepn.dev/');
    expect(resolveLaunch('folio/notes')?.id).toBe('notes');
  });

  it('puts chosen pins first, preserves their order and retains older catalogue choices', () => {
    const choices = [
      { id: 'voidcut' }, { id: 'chinese' }, { id: 'notes' },
      { id: 'japanese' }, { id: 'mdd' }, { id: 'wordstrike' },
    ];
    const split = partitionShortcutChoices(choices, ['wordstrike', 'notes']);
    expect(split.pinned.map(a => a.id)).toEqual(['wordstrike', 'notes']);
    expect(split.primary.map(a => a.id)).toEqual(['chinese', 'japanese', 'mdd']);
    expect(split.other.map(a => a.id)).toEqual(['voidcut']);
    expect([...split.pinned, ...split.primary, ...split.other]).toHaveLength(choices.length);
  });

  it('persists additions and removal without overwriting previously saved workspace state', () => {
    const ws = preset('Work', ['notes', 'tms60']);
    const widget = ws.widgets.find(item => item.type === 'app-shortcuts')!;
    setShortcuts(ws, widget.id, ['notes', 'chinese', 'ion']);
    expect(shortcutIds(widget)).toEqual(['notes', 'chinese', 'ion']);
    setShortcuts(ws, widget.id, ['ion', 'notes']);
    expect(shortcutIds(widget)).toEqual(['ion', 'notes']);
    expect(() => setShortcuts(ws, widget.id, ['ion', 'ion'])).toThrow();
    expect(shortcutIds(widget)).toEqual(['ion', 'notes']);
  });
});
