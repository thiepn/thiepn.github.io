import { HUB_PREFERENCES_KEY, MAX_HUB_PINS, defaultHubPreferences, parseHubPreferences, moveHubPin } from '../lib/hub-preferences';

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
  let canPersist = true;
  let initial = parseHubPreferences(null, available);
  try { initial = parseHubPreferences(localStorage.getItem(HUB_PREFERENCES_KEY), available); } catch { canPersist = false; }
  let preferences = initial.preferences;

  function render() {
    root!.dataset.density = preferences.density;
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
    notice.textContent = canPersist ? 'Home preferences are saved in this browser. Account sync is not enabled.' : 'Browser storage is unavailable. Changes last for this visit.';
  }

  function save(message: string) {
    try { localStorage.setItem(HUB_PREFERENCES_KEY, JSON.stringify(preferences)); canPersist = true; } catch { canPersist = false; }
    render(); status.textContent = canPersist ? message : 'Changes last for this visit because browser storage is unavailable.';
  }
  if (initial.reset) save('Old or invalid Home preferences were reset.');
  render(); open.hidden = false;
  const date = root.querySelector<HTMLElement>('[data-local-date]');
  if (date) date.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
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
  root.querySelector('[data-pins-reset]')!.addEventListener('click', () => { preferences = defaultHubPreferences(available); save('Default pins and spacing restored.'); });
  window.addEventListener('storage', event => {
    if (event.key !== HUB_PREFERENCES_KEY && event.key !== null) return;
    preferences = parseHubPreferences(event.key === null ? null : event.newValue, available).preferences; render();
  });
}
