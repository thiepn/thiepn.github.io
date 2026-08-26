import { searchCatalogue, type RankedSearchResult, type SearchableCollection, type SearchableItem, type SearchableProject } from '../lib/search-core';

interface SearchPayload {
  projects: SearchableProject[];
  collections: SearchableCollection[];
  featured: string[];
}

interface SearchOpenDetail {
  query?: string;
  returnFocus?: HTMLElement | null;
}

interface SearchController {
  open(detail?: SearchOpenDetail): Promise<void>;
}

let payloadPromise: Promise<SearchPayload> | null = null;
let controllerPromise: Promise<SearchController | null> | null = null;

function getPayload(): Promise<SearchPayload> {
  payloadPromise ??= fetch('/search-index.json', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
    return await response.json() as SearchPayload;
  });
  return payloadPromise;
}

function getSearchRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-catalogue-search]');
}

async function createController(root: HTMLElement): Promise<SearchController | null> {
  const dialog = root.querySelector<HTMLDialogElement>('[data-catalogue-search-dialog]');
  const input = root.querySelector<HTMLInputElement>('[data-catalogue-search-input]');
  const results = root.querySelector<HTMLElement>('[data-catalogue-search-results]');
  const status = root.querySelector<HTMLElement>('[data-catalogue-search-status]');
  const close = root.querySelector<HTMLButtonElement>('[data-catalogue-search-close]');
  if (!dialog || !input || !results || !status || !close) return null;

  const dialogEl = dialog;
  const inputEl = input;
  const resultsEl = results;
  const statusEl = status;
  const closeEl = close;

  let payload: SearchPayload | null = null;
  let items: SearchableItem[] = [];
  let ranked: RankedSearchResult[] = [];
  let selectedIndex = -1;
  let returnFocus: HTMLElement | null = null;

  const itemUrl = (item: SearchableItem) => item.kind === 'project' ? `/project/${item.slug}/` : `/collection/${item.slug}/`;
  const selectedItem = () => ranked[selectedIndex]?.item;

  async function ensurePayload() {
    if (payload) return payload;
    statusEl.textContent = 'Loading project search…';
    resultsEl.setAttribute('aria-busy', 'true');
    try {
      payload = await getPayload();
      items = [...payload.projects, ...payload.collections];
      return payload;
    } finally {
      resultsEl.setAttribute('aria-busy', 'false');
    }
  }

  function featuredResults(currentPayload: SearchPayload): RankedSearchResult[] {
    const bySlug = new Map(currentPayload.projects.map((project) => [project.slug, project]));
    return currentPayload.featured
      .map((slug, index) => {
        const item = bySlug.get(slug);
        return item ? { item, score: 100 - index } : null;
      })
      .filter((result): result is RankedSearchResult<SearchableProject> => Boolean(result));
  }

  function syncSelection() {
    const options = Array.from(resultsEl.querySelectorAll<HTMLElement>('[data-search-result]'));
    options.forEach((option, index) => {
      const selected = index === selectedIndex;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-selected', String(selected));
      option.tabIndex = -1;
    });
    if (selectedItem()) inputEl.setAttribute('aria-activedescendant', `catalogue-result-${selectedIndex}`);
    else inputEl.removeAttribute('aria-activedescendant');
  }

  function buildResult(item: SearchableItem, index: number): HTMLDivElement {
    const option = document.createElement('div');
    option.className = 'catalogue-search__result';
    option.dataset.searchResult = String(index);
    option.id = `catalogue-result-${index}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(index === selectedIndex));
    option.tabIndex = -1;
    option.style.setProperty('--result-accent-light', item.kind === 'project' ? item.accentLight : 'var(--line-strong)');
    option.style.setProperty('--result-accent-dark', item.kind === 'project' ? item.accentDark : 'var(--line-strong)');

    const code = document.createElement('span'); code.className = 'catalogue-search__result-code'; code.textContent = item.code;
    const copy = document.createElement('span'); copy.className = 'catalogue-search__result-copy';
    const title = document.createElement('strong'); title.textContent = item.title;
    const descriptor = document.createElement('small'); descriptor.textContent = item.kind === 'project' ? item.subtitle : item.summary;
    copy.append(title, descriptor);
    const type = document.createElement('span'); type.className = 'catalogue-search__result-type'; type.textContent = item.kind === 'project' ? item.category : 'collection';
    option.append(code, copy, type);
    option.addEventListener('pointermove', () => {
      if (selectedIndex !== index) { selectedIndex = index; syncSelection(); }
    });
    option.addEventListener('click', () => { window.location.href = itemUrl(item); });
    return option;
  }

  function buildEmpty(query: string) {
    const empty = document.createElement('div');
    empty.className = 'catalogue-search__empty';
    const title = document.createElement('strong'); title.textContent = 'No matching projects.';
    const copy = document.createElement('p'); copy.textContent = query
      ? `Nothing matched “${query}”. Try a broader topic, a project code, or browse the full project directory.`
      : 'Search by title, topic, or project code.';
    const browse = document.createElement('a'); browse.href = '/projects/'; browse.textContent = 'Browse all projects →';
    empty.append(title, copy, browse);
    return empty;
  }

  function render() {
    if (!payload) return;
    const query = inputEl.value.trim();
    ranked = query ? searchCatalogue(items, query, 16) : featuredResults(payload);
    selectedIndex = ranked.length ? 0 : -1;
    if (ranked.length) resultsEl.replaceChildren(...ranked.map(({ item }, index) => buildResult(item, index)));
    else resultsEl.replaceChildren(buildEmpty(query));

    if (!query) statusEl.textContent = `${String(ranked.length).padStart(2, '0')} featured projects`;
    else if (!ranked.length) statusEl.textContent = '0 matches';
    else {
      const projectCount = ranked.filter(({ item }) => item.kind === 'project').length;
      const collectionCount = ranked.length - projectCount;
      statusEl.textContent = collectionCount
        ? `${String(ranked.length).padStart(2, '0')} matches / ${projectCount} projects / ${collectionCount} collections`
        : `${String(ranked.length).padStart(2, '0')} project matches`;
    }
    syncSelection();
  }

  function closeSearch() {
    inputEl.setAttribute('aria-expanded', 'false');
    if (!dialogEl.open) return;
    if (typeof dialogEl.close === 'function') dialogEl.close();
    else { dialogEl.removeAttribute('open'); dialogEl.dispatchEvent(new Event('close')); }
  }

  function activateSelected() {
    const item = selectedItem();
    if (!item) return;
    window.location.href = itemUrl(item);
  }

  async function open(detail: SearchOpenDetail = {}) {
    returnFocus = detail.returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((other) => { if (other !== dialogEl) other.close(); });
    if (!dialogEl.open) {
      if (typeof dialogEl.showModal === 'function') dialogEl.showModal();
      else dialogEl.setAttribute('open', '');
    }
    inputEl.setAttribute('aria-expanded', 'true');
    inputEl.value = detail.query ?? '';
    try {
      await ensurePayload();
      render();
    } catch {
      resultsEl.setAttribute('aria-busy', 'false');
      statusEl.textContent = 'Project search is unavailable.';
      resultsEl.replaceChildren(buildEmpty(inputEl.value.trim()));
    }
    requestAnimationFrame(() => inputEl.focus());
  }

  document.addEventListener('keydown', (event) => {
    if (!dialogEl.open || document.activeElement !== inputEl) return;
    if (event.key === 'ArrowDown' && ranked.length) {
      event.preventDefault();
      selectedIndex = Math.min(ranked.length - 1, selectedIndex + 1);
      syncSelection();
      resultsEl.querySelector<HTMLElement>(`[data-search-result="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'ArrowUp' && ranked.length) {
      event.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      syncSelection();
      resultsEl.querySelector<HTMLElement>(`[data-search-result="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activateSelected();
    }
  });

  inputEl.addEventListener('input', render);
  root.querySelectorAll<HTMLButtonElement>('[data-search-suggestion]').forEach((button) => button.addEventListener('click', () => {
    inputEl.value = button.dataset.searchSuggestion ?? '';
    render();
    inputEl.focus();
  }));
  closeEl.addEventListener('click', closeSearch);
  dialogEl.addEventListener('click', (event) => { if (event.target === dialogEl) closeSearch(); });
  dialogEl.addEventListener('close', () => { inputEl.setAttribute('aria-expanded', 'false'); returnFocus?.focus(); });

  return { open };
}

async function getController(): Promise<SearchController | null> {
  controllerPromise ??= (async () => {
    const root = getSearchRoot();
    return root ? await createController(root) : null;
  })();
  return controllerPromise;
}

export async function openCatalogueSearch(detail: SearchOpenDetail = {}): Promise<void> {
  const controller = await getController();
  await controller?.open(detail);
}
