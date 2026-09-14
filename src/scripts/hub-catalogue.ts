const normalize = (value: string) => value
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .trim();

function setupHubCatalogue(root: HTMLElement) {
  const search = root.querySelector<HTMLInputElement>('[data-hub-search]');
  const form = root.querySelector<HTMLFormElement>('[data-hub-form]');
  const categoryButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-hub-category]'));
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-hub-item]'));
  const resultCount = root.querySelector<HTMLElement>('[data-hub-result-count]');
  const resultLabel = root.querySelector<HTMLElement>('[data-hub-result-label]');
  const empty = root.querySelector<HTMLElement>('[data-hub-empty]');
  const reset = root.querySelector<HTMLButtonElement>('[data-hub-reset]');

  if (!search || !categoryButtons.length || !items.length) return;

  const validCategories = new Set(categoryButtons.map((button) => button.dataset.hubCategory ?? 'all'));
  let activeCategory = 'all';

  const updateUrl = () => {
    const url = new URL(window.location.href);
    const query = search.value.trim();
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (activeCategory !== 'all') url.searchParams.set('category', activeCategory);
    else url.searchParams.delete('category');
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const apply = ({ syncUrl = true } = {}) => {
    const query = normalize(search.value);
    let visible = 0;

    for (const item of items) {
      const categoryMatch = activeCategory === 'all' || item.dataset.hubCategory === activeCategory;
      const searchMatch = !query || normalize(item.dataset.hubSearch ?? '').includes(query);
      item.hidden = !(categoryMatch && searchMatch);
      if (!item.hidden) visible += 1;
    }

    for (const button of categoryButtons) {
      const active = button.dataset.hubCategory === activeCategory;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    if (resultCount) resultCount.textContent = String(visible);
    if (resultLabel) resultLabel.textContent = visible === 1 ? 'app' : 'apps';
    if (empty) empty.hidden = visible !== 0;
    if (syncUrl) updateUrl();
  };

  const syncFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    search.value = params.get('q') ?? '';
    const requestedCategory = params.get('category') ?? 'all';
    activeCategory = validCategories.has(requestedCategory) ? requestedCategory : 'all';
    apply({ syncUrl: false });
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    apply();
  });

  search.addEventListener('input', () => apply());

  for (const button of categoryButtons) {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.hubCategory ?? 'all';
      apply();
    });
  }

  reset?.addEventListener('click', () => {
    search.value = '';
    activeCategory = 'all';
    apply();
    search.focus();
  });

  window.addEventListener('popstate', syncFromUrl);
  syncFromUrl();
}

document.querySelectorAll<HTMLElement>('[data-hub-catalogue]').forEach(setupHubCatalogue);
