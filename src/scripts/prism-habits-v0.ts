import { hubIdentity } from './portal-auth';
import { mountHabitsPortability } from './prism-habits-portability';
import type { HabitsBackupScope } from '../lib/prism/habits-backup';
import type { HubIdentity } from '../lib/hub-auth';
import {
  HABITS_V0, createHabitsV0, habitsStorageKey, localDayKey,
  parseHabitsV0, safeHabitLink, setHabitCompletion, weeklyCount,
  type HabitsV0Document, type HabitV0Id, type HabitV0Links,
} from '../lib/prism/habits-v0';

const root = document.querySelector<HTMLElement>('[data-prism-habits]');
if (root) {
  const panel = root.querySelector<HTMLElement>('[data-habits-panel]')!;
  const status = root.querySelector<HTMLElement>('[data-habits-status]')!;
  const deviceButton = root.querySelector<HTMLButtonElement>('[data-habits-device]')!;
  const todayLabel = root.querySelector<HTMLElement>('[data-habits-today]')!;
  const weekLabel = root.querySelector<HTMLElement>('[data-habits-week]')!;
  const rows = [...root.querySelectorAll<HTMLElement>('[data-habit-id]')];
  const defaultLinks: HabitV0Links = {};
  for (const row of rows) {
    const id = row.dataset.habitId as HabitV0Id;
    defaultLinks[id] = safeHabitLink(row.dataset.defaultLink ?? '') ?? '';
  }

  let storageKey: string | null = null;
  let model: HabitsV0Document | null = null;
  let deviceOverride = false;
  let activeScope: HabitsBackupScope | null = null;

  const portability = mountHabitsPortability(panel, {
    getActive: () => model && storageKey && activeScope ? { doc: model, scope: activeScope } : null,
    replaceDocument: (next) => {
      if (!model || !storageKey || !activeScope) return false;
      try {
        const json = JSON.stringify(next);
        localStorage.setItem(storageKey, json);
        if (localStorage.getItem(storageKey) !== json) throw new Error('Readback mismatch');
      } catch {
        status.textContent = 'Restore could not persist. No successful import is claimed.';
        return false;
      }
      model = next;
      render();
      status.textContent = 'Backup imported into this browser only.';
      return true;
    },
  });

  function hideProgress(message: string, allowDevice = false) {
    // Hide the old owner's check-ins before any identity change.
    storageKey = null;
    model = null;
    activeScope = null;
    portability.reset();
    panel.hidden = true;
    status.textContent = message;
    deviceButton.hidden = !allowDevice;
  }

  function save(): boolean {
    if (!storageKey || !model) return false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(model));
      status.textContent = 'Saved in this browser only · no account sync or backup.';
      return true;
    } catch {
      status.textContent = 'Changes are visible only in this tab. Browser storage did not save them.';
      return false;
    }
  }

  function render() {
    if (!model) return;
    const day = localDayKey(new Date());
    let checked = 0, achieved = 0, targetTotal = 0;
    for (const row of rows) {
      const id = row.dataset.habitId as HabitV0Id;
      const box = row.querySelector<HTMLInputElement>('[data-habit-check]')!;
      const countLabel = row.querySelector<HTMLElement>('[data-habit-count]')!;
      const progress = row.querySelector<HTMLProgressElement>('[data-habit-progress]')!;
      const open = row.querySelector<HTMLAnchorElement>('[data-habit-open]')!;
      const isDone = model.dates[id].includes(day);
      const count = weeklyCount(model.dates[id], new Date());
      const target = model.targets[id];
      checked += Number(isDone);
      achieved += Math.min(count, target);
      targetTotal += target;
      box.checked = isDone;
      box.disabled = false;
      row.dataset.completed = String(isDone);
      countLabel.textContent = count + ' / ' + target + ' this week';
      progress.max = target;
      progress.value = Math.min(count, target);
      const href = model.links[id];
      if (href) { open.href = href; open.hidden = false; }
      else { open.removeAttribute('href'); open.hidden = true; }
    }
    todayLabel.textContent = checked + ' of ' + HABITS_V0.length + ' checked today';
    weekLabel.textContent = achieved + ' of ' + targetTotal + ' target sessions';
  }

  function load(key: string, scope: string, backupScope: HabitsBackupScope) {
    hideProgress('Loading browser-local habits…');
    let raw: string | null;
    try { raw = localStorage.getItem(key); }
    catch {
      storageKey = key;
      model = createHabitsV0(defaultLinks);
      activeScope = backupScope;
      panel.hidden = false;
      render();
      status.textContent = 'Browser storage unavailable. Changes will not survive a refresh.';
      return;
    }
    const next = parseHabitsV0(raw, createHabitsV0(defaultLinks));
    if (!next) {
      hideProgress('Stored habits data is unsupported or damaged. Progress is locked to prevent overwriting.');
      return;
    }
    storageKey = key;
    model = next;
    activeScope = backupScope;
    deviceButton.hidden = true;
    panel.hidden = false;
    for (const editor of panel.querySelectorAll<HTMLElement>('[data-habit-editor]')) editor.hidden = true;
    status.textContent = scope + ' · stored in this browser only, not synced.';
    render();
  }

  function onIdentity(identity: HubIdentity) {
    if (identity.status === 'signed-in') {
      deviceOverride = false;
      const key = habitsStorageKey(identity.id);
      if (key) load(key, 'Account-separated local progress', { kind: 'account', owner: identity.id.toLowerCase() });
      else hideProgress('Invalid account identity; habits are locked.');
    } else if (identity.status === 'signed-out' || deviceOverride) {
      load(habitsStorageKey(null)!, 'Device-only progress', { kind: 'device' });
    } else {
      hideProgress(
        identity.status === 'checking'
          ? 'Verifying the Hub account before displaying local habits…'
          : 'Account verification unavailable. To avoid showing another account’s progress, use device-only mode explicitly.',
        identity.status === 'unavailable',
      );
    }
  }

  for (const row of rows) {
    const id = row.dataset.habitId as HabitV0Id;
    const box = row.querySelector<HTMLInputElement>('[data-habit-check]')!;
    const editor = row.querySelector<HTMLElement>('[data-habit-editor]')!;
    const edit = row.querySelector<HTMLButtonElement>('[data-habit-edit]')!;
    const target = row.querySelector<HTMLSelectElement>('[data-habit-target]')!;
    const url = row.querySelector<HTMLInputElement>('[data-habit-url]')!;
    const error = row.querySelector<HTMLElement>('[data-habit-error]')!;
    box.addEventListener('change', () => {
      if (!model || !storageKey) return;
      try { model = setHabitCompletion(model, id, localDayKey(new Date()), box.checked); }
      catch { status.textContent = 'Unable to record this check-in; history limit reached.'; render(); return; }
      render();
      save();
    });
    edit.addEventListener('click', () => {
      if (!model) return;
      target.value = String(model.targets[id]);
      url.value = model.links[id];
      error.hidden = true;
      editor.hidden = false;
      url.focus();
    });
    row.querySelector<HTMLButtonElement>('[data-habit-cancel]')!.addEventListener('click', () => {
      editor.hidden = true;
      edit.focus();
    });
    row.querySelector<HTMLButtonElement>('[data-habit-save]')!.addEventListener('click', () => {
      if (!model || !storageKey) return;
      const href = safeHabitLink(url.value);
      const days = Number(target.value);
      if (href === null || !Number.isInteger(days) || days < 1 || days > 7) {
        error.textContent = 'Use a weekly target from 1 to 7 and a valid HTTPS or same-site link.';
        error.hidden = false;
        return;
      }
      model = {
        ...model,
        links: { ...model.links, [id]: href },
        targets: { ...model.targets, [id]: days },
      };
      editor.hidden = true;
      render();
      save();
      edit.focus();
    });
  }

  deviceButton.addEventListener('click', () => {
    deviceOverride = true;
    load(habitsStorageKey(null)!, 'Device-only progress', { kind: 'device' });
  });
  window.addEventListener('hub:identity', (event: Event) => {
    onIdentity((event as CustomEvent<HubIdentity>).detail);
  });
  window.addEventListener('storage', event => {
    if (storageKey && activeScope && event.key === storageKey) load(storageKey, 'Updated in another tab', activeScope);
  });
  window.addEventListener('focus', render);
  window.addEventListener('pageshow', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  onIdentity(hubIdentity);
}
