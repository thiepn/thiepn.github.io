function setupHubCatalogue(root: HTMLElement) {
  const categoryButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-hub-category]'));
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-hub-item]'));

  if (!categoryButtons.length || !items.length) return;

  const validCategories = new Set(categoryButtons.map((button) => button.dataset.hubCategory ?? 'all'));
  let activeCategory = 'all';

  const updateUrl = () => {
    const url = new URL(window.location.href);
    if (activeCategory !== 'all') url.searchParams.set('category', activeCategory);
    else url.searchParams.delete('category');
    url.searchParams.delete('q');
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const apply = ({ syncUrl = true } = {}) => {
    for (const item of items) {
      const categoryMatch = activeCategory === 'all' || item.dataset.hubItemCategory === activeCategory;
      item.hidden = !categoryMatch;
    }

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

  for (const button of categoryButtons) {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.hubCategory ?? 'all';
      apply();
    });
  }

  window.addEventListener('popstate', syncFromUrl);
  syncFromUrl();
}

document.querySelectorAll<HTMLElement>('[data-hub-catalogue]').forEach(setupHubCatalogue);
