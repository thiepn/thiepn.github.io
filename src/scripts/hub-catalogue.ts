const catalogues = new WeakMap<HTMLElement, () => void>();
export function setupHubCatalogue(root: HTMLElement) {
  const existing = catalogues.get(root);
  if (existing) { existing(); return; }
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-hub-category]'));
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-hub-item]'));
  if (!buttons.length || !items.length) return;
  const categories = new Set(buttons.map(button => button.dataset.hubCategory ?? 'all'));
  let active = 'all';
  const apply = (sync = true) => {
    for (const item of items) item.hidden = active !== 'all' && item.dataset.hubItemCategory !== active;
    for (const button of buttons) {
      const selected = button.dataset.hubCategory === active;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    if (sync) {
      const url = new URL(window.location.href);
      if (active === 'all') url.searchParams.delete('category');
      else url.searchParams.set('category', active);
      url.searchParams.delete('q');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  };
  const sync = () => {
    const requested = new URLSearchParams(window.location.search).get('category') ?? 'all';
    active = categories.has(requested) ? requested : 'all';
    apply(false);
  };
  for (const button of buttons) button.addEventListener('click', () => { active = button.dataset.hubCategory ?? 'all'; apply(); });
  catalogues.set(root, sync);
  sync();
}
document.querySelectorAll<HTMLElement>('[data-hub-catalogue]').forEach(setupHubCatalogue);
window.addEventListener('popstate', () => document.querySelectorAll<HTMLElement>('[data-hub-catalogue]').forEach(setupHubCatalogue));
