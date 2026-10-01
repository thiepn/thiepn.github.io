import { hubIdentity } from './portal-auth';
import { preferenceKey, type HubIdentity } from '../lib/hub-auth';
import { MAX_HUB_PINS, defaultHubPreferences, parseHubPreferences, moveHubPin } from '../lib/hub-preferences';
import { defaultHomeView, homeDay, visibleHomeModules, type HomeModuleId, type HomeView } from '../lib/home-view';

const root = document.querySelector<HTMLElement>('[data-portal-home]');
if (root) {
  const apps = Array.from(root.querySelectorAll<HTMLElement>('[data-hub-slug]')).map(card => ({
    slug: card.dataset.hubSlug!, title: card.dataset.hubTitle!, href: card.querySelector<HTMLAnchorElement>('.hub-card__open')!.getAttribute('href')!,
  }));
  const available = apps.map(app => app.slug);
  const list = root.querySelector<HTMLElement>('[data-pin-list]')!;
  const empty = root.querySelector<HTMLElement>('[data-pin-empty]')!;
  const order = root.querySelector<HTMLElement>('[data-pin-order]')!;
  const dialog = root.querySelector<HTMLDialogElement>('[data-portal-customize]')!;
  const open = root.querySelector<HTMLButtonElement>('[data-customize-open]')!;
  const status = root.querySelector<HTMLElement>('[data-customize-status]')!;
  const notice = root.querySelector<HTMLElement>('[data-preference-status]')!;
  const choices = Array.from(root.querySelectorAll<HTMLInputElement>('[data-pin-choice]'));
  let identity: HubIdentity = hubIdentity;
  let activeKey: string | null = null;
  let canPersist = true;
  let initial = parseHubPreferences(null, available);
  if (identity.status === 'signed-out') activeKey = preferenceKey(null);
  if (activeKey) try { initial = parseHubPreferences(localStorage.getItem(activeKey), available); } catch { canPersist = false; }
  let preferences = initial.preferences;
  let privacyHeld = preferences.home.hidden;
  const privacy = root.querySelector<HTMLButtonElement>('[data-home-privacy]')!;
  const moduleChoices = Array.from(root.querySelectorAll<HTMLInputElement>('[data-module-choice]'));
  const focus = root.querySelector<HTMLSelectElement>('[data-home-focus]')!;
  const timezone = root.querySelector<HTMLSelectElement>('[data-home-timezone]')!;

  function updateDay() {
    const day = homeDay(new Date(), preferences.home.timezone);
    const date = root!.querySelector<HTMLElement>('[data-local-date]')!;
    date.textContent = day.label; date.dataset.day = day.key;
    root!.querySelector<HTMLElement>('[data-day-zone]')!.textContent = day.zone;
  }

  function render() {
    root!.dataset.density = preferences.density;
    privacyHeld ||= preferences.home.hidden;
    const masked = privacyHeld || preferences.home.hidden;
    root!.querySelectorAll<HTMLElement>('[data-home-personal]').forEach(panel => { panel.hidden = masked; });
    root!.querySelector<HTMLElement>('[data-home-hidden]')!.hidden = !masked;
    privacy.textContent = masked ? 'Show Home' : 'Hide Home';
    const visible = visibleHomeModules(preferences.home);
    root!.querySelectorAll<HTMLElement>('[data-home-module]').forEach(module => { module.hidden = !visible.includes(module.dataset.homeModule as HomeModuleId); });
    root!.querySelector<HTMLElement>('[data-home-modules-empty]')!.hidden = visible.length > 0;
    moduleChoices.forEach(choice => { choice.checked = preferences.home.modules.includes(choice.value as HomeModuleId); });
    root!.querySelectorAll<HTMLInputElement>('[name="home-mode"]').forEach(input => { input.checked = input.value === preferences.home.mode; });
    root!.querySelector<HTMLFieldSetElement>('[data-home-mode-controls]')!.disabled = activeKey === null;
    focus.value = preferences.home.focus; timezone.value = preferences.home.timezone;
    updateDay();
    list.replaceChildren(...preferences.pins.flatMap(slug => {
      const app = apps.find(app => app.slug === slug);
      if (!app) return [];
      const link = document.createElement('a'); link.className = 'portal-pin'; link.href = app.href; link.dataset.pinSlug = slug;
      const icon = document.createElement('span'); icon.className = 'portal-pin-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = app.title.slice(0, 2);
      const label = document.createElement('strong'); label.textContent = app.title; link.append(icon, label); return [link];
    }));
    empty.hidden = preferences.pins.length > 0;
    choices.forEach(choice => { choice.checked = preferences.pins.includes(choice.value); choice.disabled = !choice.checked && preferences.pins.length >= MAX_HUB_PINS; });
    root!.querySelectorAll<HTMLInputElement>('[name="density"]').forEach(input => { input.checked = input.value === preferences.density; });
    order.replaceChildren(...preferences.pins.map((slug, index) => {
      const row = document.createElement('li'); const label = document.createElement('span'); label.textContent = apps.find(app => app.slug === slug)!.title; row.append(label);
      for (const direction of [-1, 1] as const) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = direction === -1 ? '↑' : '↓';
        button.setAttribute('aria-label', `Move ${label.textContent} ${direction === -1 ? 'up' : 'down'}`);
        button.dataset.movePin = slug; button.dataset.direction = String(direction);
        button.disabled = direction === -1 ? index === 0 : index === preferences.pins.length - 1;
        button.addEventListener('click', () => {
          preferences.pins = moveHubPin(preferences.pins, slug, direction); save('Pin order saved.');
          const replacement = Array.from(order.querySelectorAll<HTMLButtonElement>('[data-move-pin]')).find(b => b.dataset.movePin === slug && b.dataset.direction === String(direction));
          if (replacement && !replacement.disabled) replacement.focus();
          else Array.from(order.querySelectorAll<HTMLButtonElement>('[data-move-pin]')).find(b => b.dataset.movePin === slug && !b.disabled)?.focus();
        });
        row.append(button);
      }
      return row;
    }));
    open.disabled = activeKey === null;
    notice.textContent = activeKey === null ? 'Account preferences are hidden until your Hub session is verified.' : !canPersist ? 'Browser storage is unavailable. Changes last for this visit.' : identity.status === 'signed-in' ? 'Home preferences are saved for this account in this browser. Cloud sync is not enabled.' : 'Home preferences are saved in this browser. Account sync is not enabled.';
  }

  function save(message: string) {
    if (!activeKey) return;
    try { localStorage.setItem(activeKey, JSON.stringify(preferences)); canPersist = true; } catch { canPersist = false; }
    render(); status.textContent = canPersist ? message : 'Changes last for this visit because browser storage is unavailable.';
  }
  if (initial.reset) save('Old or invalid Home preferences were reset.');
  render(); open.hidden = false;
  privacy.hidden = false;
  root.querySelector<HTMLElement>('[data-home-mode-controls]')!.hidden = false;
  const dayTimer = setInterval(() => { if (!document.hidden) updateDay(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateDay(); });
  window.addEventListener('pageshow', updateDay);
  window.addEventListener('pagehide', event => { if (!event.persisted) clearInterval(dayTimer); });
  let returnFocus: HTMLElement | null = null;
  open.addEventListener('click', () => { returnFocus = document.activeElement as HTMLElement; dialog.showModal(); root.querySelector<HTMLButtonElement>('[data-customize-close]')!.focus(); });
  root.querySelector('[data-customize-close]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => returnFocus?.focus());
  choices.forEach(choice => choice.addEventListener('change', () => {
    if (choice.checked && preferences.pins.length < MAX_HUB_PINS) preferences.pins.push(choice.value);
    else preferences.pins = preferences.pins.filter(slug => slug !== choice.value);
    save('Pins saved.');
  }));
  root.querySelectorAll<HTMLInputElement>('[name="density"]').forEach(input => input.addEventListener('change', () => { preferences.density = input.value as 'compact' | 'comfortable'; save('Spacing saved.'); }));
  root.querySelector('[data-pins-reset]')!.addEventListener('click', () => { const defaults = defaultHubPreferences(available); preferences.pins = defaults.pins; preferences.density = defaults.density; save('Default pins and spacing restored.'); });
  root.querySelector('[data-modules-reset]')!.addEventListener('click', () => { const hidden = preferences.home.hidden; preferences.home = defaultHomeView(); preferences.home.hidden = hidden; save('Default daily modules restored.'); });
  moduleChoices.forEach(choice => choice.addEventListener('change', () => {
    const id = choice.value as HomeModuleId;
    preferences.home.modules = choice.checked ? [...preferences.home.modules, id] : preferences.home.modules.filter(module => module !== id);
    save('Daily modules saved.');
  }));
  root.querySelectorAll<HTMLInputElement>('[name="home-mode"]').forEach(input => input.addEventListener('change', () => { preferences.home.mode = input.value as HomeView['mode']; save('Home view saved.'); }));
  focus.addEventListener('change', () => { preferences.home.focus = focus.value as HomeView['focus']; save('Focus choice saved.'); });
  timezone.addEventListener('change', () => { preferences.home.timezone = timezone.value as HomeView['timezone']; save('Home timezone saved.'); });
  privacy.addEventListener('click', () => {
    const masked = privacyHeld || preferences.home.hidden;
    privacyHeld = preferences.home.hidden = !masked;
    if (activeKey) save(masked ? 'Home shown.' : 'Home hidden.'); else render();
  });
  window.addEventListener('hub:identity', event => {
    identity = (event as CustomEvent<HubIdentity>).detail;
    const nextKey = identity.status === 'signed-in' ? preferenceKey(identity.id) : identity.status === 'signed-out' ? preferenceKey(null) : null;
    if (nextKey !== activeKey) {
      dialog.close(); status.textContent = ''; activeKey = nextKey; canPersist = true;
      preferences = defaultHubPreferences(available);
      if (activeKey) try { preferences = parseHubPreferences(localStorage.getItem(activeKey), available).preferences; } catch { canPersist = false; }
    }
    render();
  });
  window.addEventListener('storage', event => {
    if (!activeKey || (event.key !== activeKey && event.key !== null)) return;
    preferences = parseHubPreferences(event.key === null ? null : event.newValue, available).preferences; render();
  });
}
