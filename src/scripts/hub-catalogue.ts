import { DEFAULT_HIDDEN_APP_IDS } from '../lib/workspace/app-personalization';

const catalogues = new WeakMap<HTMLElement, () => void>();
let personalHidden = new Set<string>(DEFAULT_HIDDEN_APP_IDS);

export function setupHubCatalogue(root: HTMLElement) {
  const existing = catalogues.get(root);
  if (existing) { existing(); return; }
  const categoryButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-hub-category]'));
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-hub-item]'));
  const currentApps = Array.from(root.querySelectorAll<HTMLElement>('[data-hub-current-app]'));
  const pendingApps = Array.from(root.querySelectorAll<HTMLElement>('[data-hub-pending-app]'));
  const currentSection = root.querySelector<HTMLElement>('[data-hub-current-section]');
  const pendingSection = root.querySelector<HTMLElement>('[data-hub-pending-section]');
  const showHiddenToggle = root.querySelector<HTMLInputElement>('[data-show-hidden-apps]');

  if (!categoryButtons.length || !items.length) return;
  const validCategories = new Set(categoryButtons.map(button => button.dataset.hubCategory ?? 'all'));
  let activeCategory = 'all';

  const updateUrl = () => {
    const url = new URL(window.location.href);
    if (activeCategory !== 'all') url.searchParams.set('category', activeCategory);
    else url.searchParams.delete('category');
    url.searchParams.delete('q');
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const apply = ({ syncUrl = true } = {}) => {
    const showHidden = showHiddenToggle?.checked ?? false;
    const visible = (id: string | undefined, category: string | undefined) =>
      (activeCategory === 'all' || category === activeCategory) &&
      (showHidden || !personalHidden.has(id ?? ''));

    for (const item of items) item.hidden = !visible(item.dataset.hubSlug, item.dataset.hubItemCategory);
    for (const app of currentApps) app.hidden = !visible(app.dataset.hubCurrentApp, app.dataset.hubCurrentCategory);
    for (const app of pendingApps) app.hidden = !visible(app.dataset.hubPendingApp, app.dataset.hubPendingCategory);
    if (currentSection) currentSection.hidden = currentApps.every(app => app.hidden);
    if (pendingSection) pendingSection.hidden = pendingApps.every(app => app.hidden);
    for (const button of categoryButtons) {
      const active = button.dataset.hubCategory === activeCategory;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (syncUrl) updateUrl();
  };

  const syncFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get('category') ?? 'all';
    activeCategory = validCategories.has(requestedCategory) ? requestedCategory : 'all';
    apply({ syncUrl: false });
  };

  showHiddenToggle?.addEventListener('change', () => apply({ syncUrl: false }));
  for (const button of categoryButtons) {
    button.addEventListener('click', () => { activeCategory = button.dataset.hubCategory ?? 'all'; apply(); });
  }
  catalogues.set(root, syncFromUrl);
  syncFromUrl();
}

// The workspace controller owns identity-scoped persistence and broadcasts the
// resolved user preference. This public directory never reads another account.
window.addEventListener('hub:apps-visibility', event => {
  const ids = (event as CustomEvent<{hiddenIds: string[]}>).detail?.hiddenIds;
  if (!Array.isArray(ids)) return;
  personalHidden = new Set(ids);
  document.querySelectorAll<HTMLElement>('[data-hub-catalogue]').forEach(setupHubCatalogue);
});
document.querySelectorAll<HTMLElement>('[data-hub-catalogue]').forEach(setupHubCatalogue);
window.addEventListener('popstate', () =>
  document.querySelectorAll<HTMLElement>('[data-hub-catalogue]').forEach(setupHubCatalogue));
